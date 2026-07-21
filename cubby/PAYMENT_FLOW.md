# Cubby — Payment Flow

> Describes the payment flow as it exists in the codebase today — PayFast
> (active) and Peach Payments (legacy, hardened but not removed). Not a
> history of how it got here — see `PROJECT_MASTER_PLAN.md` for the
> phase-by-phase build log. Companion document: `BOOKING_LIFECYCLE.md` (the
> full booking state machine this payment flow feeds into).

---

## The one rule

**Every payment success, from every provider, transitions a booking through
exactly one place: the `confirm_booking_payment` Postgres RPC.** No Edge
Function writes `bookings.status` on a successful payment directly. This is
true for the active provider (PayFast) and both legacy Peach paths — they
were hardened to match specifically so a payment-time bug (or a lifecycle
change) only ever needs to be fixed in one place.

A successful payment does **not** produce `status = 'confirmed'`. It
produces `status = 'awaiting_host_confirmation'` and starts a 30-minute
host-response clock. `confirmed` only happens when the host actually
accepts — see `BOOKING_LIFECYCLE.md`.

---

## PayFast flow (active)

```mermaid
sequenceDiagram
    participant App as Client (booking.tsx)
    participant Create as payfast-create
    participant Page as payfast-page
    participant PF as PayFast (hosted checkout)
    participant ITN as payfast-itn
    participant RPC as confirm_booking_payment
    participant Return as payfast-return

    App->>App: INSERT bookings (status='pending_payment')
    App->>Create: invoke, {bookingId, amount, ...}
    Create->>Create: verify caller owns booking
    Create-->>App: {redirectUrl: payfast-page?bookingId=...}
    App->>Page: navigate / open in-app browser
    Page->>Page: build + sign PayFast form
    Page-->>PF: auto-submit form
    PF->>PF: user completes payment
    par server-to-server, no user involved
        PF->>ITN: POST ITN (payment_status=COMPLETE, ...)
        ITN->>ITN: validate signature, IP, merchant_id, amount
        ITN->>RPC: confirm_booking_payment(id, pf_payment_id)
        RPC-->>ITN: {ok, booking} or structured rejection
        ITN->>ITN: send notifications (only if ok)
    and browser redirect, user-visible
        PF->>Return: GET return_url?bookingId=...
        Return->>Return: read booking.status from DB
        Return-->>App: deep-link cubby://payment-result?status=...
    end
```

**`payfast-create`** — called by the client right after it inserts the
booking row itself (client-side insert, `status: 'pending_payment'`). Verifies
the caller's JWT actually owns the booking, re-marks
`payment_provider: 'payfast'` / `status: 'pending_payment'` (belt-and-braces,
the insert already set these), and returns a redirect URL to `payfast-page`.
No PayFast credentials ever reach the client.

**`payfast-page`** — fetches the booking, builds a signed PayFast form
server-side, and returns HTML that auto-submits to PayFast's hosted
checkout. The merchant key is included in the signature computation but
stripped from the actual form fields sent to PayFast. Also handles the
"already paid" shortcut: if the booking's status is anything past
`pending_payment`/`pending` (i.e. a repeat hit on a booking that already
resolved), it redirects straight to the success deep link instead of
re-showing a payment form — except `cancelled`, which still shows the
payment-not-possible error.

**`payfast-itn`** (Instant Transaction Notification) — the *authoritative*
signal. PayFast POSTs here server-to-server whenever a payment's status
changes; this is not something the user's browser is involved in, and it can
be retried by PayFast if the endpoint doesn't return 200 promptly. Validation
order:
1. Reconstruct the signature from the posted fields and compare
2. Check the source IP is a known PayFast IP (skipped in sandbox)
3. Check `merchant_id` matches configuration
4. Check `amount_gross` matches the booking's `total_price` (to the cent)
5. Optional round-trip to PayFast's own `/eng/query/validate` endpoint
6. Only then, on `payment_status === 'COMPLETE'`, call `confirm_booking_payment`

Always returns `200` regardless of outcome — PayFast retries on anything
else, and a validation failure should be logged, not surfaced as a retry
trigger.

**`payfast-return`** — where the user's browser lands after PayFast. Not
authoritative (the ITN might not have landed yet when this fires — the two
happen in parallel, and the return redirect is typically faster). Reads the
booking's current `status` and classifies it: `pending_payment`/no row yet
→ "pending", `cancelled` → "failed", anything else (`awaiting_host_confirmation`
and beyond) → "success". Then deep-links back into the native app (or does a
JS redirect on web) with that status.

**`payfast-cancel`** — PayFast's `cancel_url`, hit when the user backs out of
checkout. Directly writes `status: 'cancelled'`, scoped to
`status IN ('pending', 'pending_payment')`. This is a legitimate direct write
(not a violation of the "only the RPC transitions past payment" rule) because
it only ever touches a booking that hasn't been paid for yet.

---

## `confirm_booking_payment` — the shared RPC

```sql
confirm_booking_payment(
  p_booking_id UUID,
  p_payment_reference TEXT,
  p_payment_provider TEXT DEFAULT 'payfast'
) RETURNS JSONB
```

- **`SECURITY DEFINER`**, `EXECUTE` restricted to `service_role` only (see
  the `REVOKE`/`GRANT` block right after it in `schema.sql`). There is no
  `auth.uid()` involved — the caller is a payment provider's server via an
  Edge Function, never a logged-in Cubby user, so ownership checks don't
  apply the way they do for the Phase 4 booking-response functions.
- **Guard:** `status = 'pending_payment'` only. Deliberately not widened to
  also match legacy `pending` — verified by grepping the entire codebase
  that the only booking-creation path
  (`app/(traveller)/booking.tsx`) has only ever been observed to produce
  `pending_payment`.
- **On success**, in one statement: `status → 'awaiting_host_confirmation'`,
  `payment_provider`, `payment_reference`, `paid_at = now()`,
  `host_response_deadline = now() + interval '30 minutes'`.
- **`paid_at` uses the database's own clock**, not a provider-supplied
  timestamp — PayFast's ITN payload has no timestamp field (confirmed
  against PayFast's documented parameter list and their own reference WHMCS
  integration, which itself uses the receiving server's clock), and Peach's
  webhook payloads don't carry one either.
- **`p_payment_provider`** is constrained by a `CHECK` constraint on the
  column itself — `bookings_payment_provider_check`, allowing `NULL`,
  `'payfast'`, or `'peach'` — not just an in-function check, so it also
  protects any future direct write that bypasses the RPC entirely. The
  default (`'payfast'`) keeps `payfast-itn`'s two-argument call unaffected;
  the two legacy Peach paths pass `'peach'` explicitly.

### Structured outcomes

Every call returns `{ok: boolean, reason?: string, ...}` — never a bare
success/failure or a raw exception:

| `ok` | `reason` | Meaning |
|---|---|---|
| `true` | — | Fresh transition, `booking` (full row) included |
| `false` | `not_found` | No booking with that id |
| `false` | `already_resolved` | Booking exists but wasn't `pending_payment` — a duplicate or stale call, or genuinely a different provider's call losing a race (see below) |
| `false` | `reference_reused` | `p_payment_reference` already belongs to a different booking — caught via the `UNIQUE (payment_reference)` constraint, logged loudly as a possible data anomaly or replay, neither booking touched |
| `false` | `invalid_provider` | `p_payment_provider` failed the allowlist check — caught via `WHEN check_violation`, should only ever happen from a caller bug since the values are hardcoded per Edge Function, not user input |

## Idempotency

The entire idempotency guarantee is the guarded `UPDATE`:

```sql
UPDATE bookings b
SET status = 'awaiting_host_confirmation', ...
WHERE b.id = p_booking_id
  AND b.status = 'pending_payment'
RETURNING * INTO v_booking;
```

A second call — whether it's PayFast retrying the same ITN, or the two
independent Peach paths (`payment-webhook` and `payment-result`) both firing
for the same booking — simply finds the row no longer matches
`status = 'pending_payment'` and falls through to `already_resolved`. No
second transition, no reset `paid_at`, no reset `host_response_deadline`, no
resent notification (see below). This was verified against real Postgres,
including two callers racing the *same* booking with different simulated
providers: whichever wins keeps its label, reference, and deadline — the
loser's arguments are discarded entirely, not partially merged in.

`payment_reference` collisions across *different* bookings are a separate
mechanism — the `UNIQUE` constraint plus the `unique_violation` exception
handler — since the guarded `UPDATE`'s `WHERE` clause alone wouldn't catch
that case (it only matches on `id`).

## Notification ordering

Notifications are always a **separate, best-effort step after** the RPC call
returns — never inside the same SQL transaction, and never able to roll back
a successful transition:

```ts
const { data: rpcResult, error } = await supabase.rpc('confirm_booking_payment', {...});
if (rpcResult?.ok) {
  sendAwaitingHostNotifications(supabase, rpcResult.booking).catch(e => console.error(...));
}
// already_resolved / reference_reused / invalid_provider → no notification
```

The notification logic itself lives in one place —
`supabase/functions/_shared/awaiting-host-notifications.ts` — imported by
`payfast-itn`, `payment-webhook`, and `payment-result` rather than
reimplemented per file. It sends, in order: an in-app + push notification to
the traveller ("payment received, waiting on host"), an in-app + push
notification to the host ("new booking request"), and an email to the host
with the booking details. **It deliberately never sends a PIN.** The booking
is `awaiting_host_confirmation`, not `confirmed` — the host hasn't accepted
yet, so revealing the PIN here would let a traveller use it before the host
ever agreed to the booking.

Because `payment-webhook` and `payment-result` are two independent paths
that can both fire for the same legacy Peach booking in either order, both
of them call the shared notification function on `ok === true` — not just
one of them. Whichever call's RPC invocation actually performs the
transition is the one that notifies; the other resolves to `already_resolved`
and stays silent. This means nothing is ever double-sent (only one call can
ever see `ok === true`), and nothing is silently dropped if one of the two
paths can't be relied on (e.g. the server-to-server webhook never arrives).

## Legacy Peach Payments paths

Peach predates the PayFast migration. Three of its Edge Functions still
exist and still work, but their live external registration with Peach
cannot be verified from this development environment — they're kept working
and hardened defensively rather than deleted:

- **`payment-webhook`** — Peach's server-to-server webhook, analogous to
  `payfast-itn`. On success, calls `confirm_booking_payment(id, checkoutId,
  'peach')`. Used to write `status: 'confirmed'` directly and send a
  PIN-bearing `booking_confirmed` email at payment time — both removed;
  see "PIN safety" below.
- **`payment-result`** — Peach's browser-redirect handler (the return-URL
  equivalent of `payfast-return`, but this one used to *also* perform the
  transition itself, not just read status). Verifies the payment by calling
  Peach's own verification API (`resourcePath` from the redirect query
  params, against `eu-prod.oppwa.com`), then calls the same RPC.
  Never sent a PIN-bearing email itself, but shares the notification call
  now for the racing-paths reason described above.
- **`create-payment`** / **`payment-page`** — Peach's booking-creation and
  hosted-checkout-page equivalents of `payfast-create`/`payfast-page`.
  Verified via repo-wide grep: nothing in `app/` calls `create-payment`
  anymore. These exist but have no live caller.

The guard on `confirm_booking_payment` (`status = 'pending_payment'`) was
deliberately **not** widened to accept legacy `pending` when these paths were
hardened — there is no verified evidence any live flow still creates
`pending` bookings, only `pending_payment`.

## PIN safety

The PIN is generated client-side at booking creation, long before any
payment happens — see `BOOKING_LIFECYCLE.md` for the full explanation.
From the payment side specifically: a repo-wide search (every place that
sets a booking to `confirmed`, sends the `booking_confirmed` notification
type, or reads/sends `pin_code`) turned up no remaining payment-time or
pre-acceptance PIN exposure after the Phase 5 hardening round. The one
`booking_confirmed` email template that used to fire at payment time
(`payment-webhook`) is now unreferenced entirely — no code path currently
sends it. A real PIN-bearing confirmation email at *accept* time (once the
host has actually said yes) is a tracked follow-up, not yet built — see
`BOOKING_LIFECYCLE.md`'s notification table.

## Refund queue behaviour

Payment success only ever produces `awaiting_host_confirmation`; refunds
enter the picture on the other side of that gate — when a host declines, a
traveller cancels, or the response window expires (see
`BOOKING_LIFECYCLE.md`'s transition table). All three set
`refund_status = 'pending_manual'` in the same statement as the status
transition, so a refund obligation can never be recorded out of sync with
the transition that created it.

Refunds themselves are **fully manual** through Private Beta — there is no
payment-provider refund API call anywhere in this codebase. The intended
close-out path is the `mark_refunded(booking_id, refund_reference)` RPC,
which checks `profiles.is_admin` internally and moves
`refund_status: 'pending_manual' → 'refunded'`. As of today, **nothing in
the app calls it** — there is no admin refund-queue screen yet. Finding
`pending_manual` rows currently means querying the database directly:

```sql
SELECT id, traveller_id, host_id, total_price, refund_status, refund_requested_at
FROM bookings
WHERE refund_status = 'pending_manual'
ORDER BY refund_requested_at;
```

Building the admin screen for this (list + call `mark_refunded`) is tracked
as follow-up work in `PROJECT_MASTER_PLAN.md`, not part of this document.

## Post-payment payout (separate from refunds)

Not part of the payment-confirmation flow above, but adjacent: when a host
marks a booking's pickup complete (`complete-booking` Edge Function,
`status → 'completed'`), it computes a 70/30 host/Cubby split
(`host_payout_amount`, `cubby_amount`) and sets `payout_status:
'pending_manual'` — a separate manual-payout queue from the refund one,
since PayFast settles to Cubby's own merchant account and host payouts are
a manual EFT Cubby sends afterward. Also has no admin UI yet.
