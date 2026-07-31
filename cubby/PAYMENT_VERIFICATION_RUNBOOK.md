# Cubby — Payment Verification Runbook (PayGate PayWeb3)

**Created:** 2026-07-31
**Covers:** `paygate-initiate`, `paygate-redirect`, `paygate-notify`, `paygate-return`, `paygate-query`, `_shared/paygate.ts`, `confirm_booking_payment` and the booking lifecycle it feeds into.
**Purpose:** The single reference for verifying or troubleshooting the payment system — every time, not just before first launch. Use it for the initial sandbox verification, for any future re-verification after a change to a paygate-* function, and for live incident troubleshooting once real payments are enabled.
**Not covered:** the deprecated Peach functions (`create-payment`, `payment-page`, `payment-result`, `payment-webhook`) and the legacy PayFast functions (`payfast-*`) — kept for reference only, no longer part of the live payment path. `PROJECT_MASTER_PLAN.md` remains the source of truth for their status.

---

## 0. Two gaps discovered while compiling this runbook — read first

Writing this runbook required tracing the full payment chain end-to-end, including the parts outside the five paygate-* functions themselves. Two real gaps surfaced that don't belong buried in a checklist — they change what "ready for sandbox testing" actually means today:

1. **The traveller app does not call any paygate-* function yet.** `app/(traveller)/booking.tsx` still calls `payfast-create` (grep-verified, 2026-07-31). None of `paygate-initiate`, `paygate-redirect`, etc. are referenced anywhere under `app/`. This means a sandbox payment cannot currently be triggered by tapping through the app — it has to be driven manually (see Section 4). Wiring `booking.tsx` to the PayGate functions is unscoped, unbuilt work, not a bug in the five functions themselves.
2. **Host and traveller are never notified when a PayGate payment confirms a booking.** `_shared/awaiting-host-notifications.ts` — the one shared function that sends the "payment received, waiting on host" / "new booking request" in-app, push, and email notifications after a fresh `confirm_booking_payment` success — is called by `payfast-itn`, `payment-webhook`, and `payment-result`. It is **not called by `paygate-notify` or `paygate-query`** (grep-verified, 2026-07-31). Concretely: a traveller pays via PayGate, `paygate-notify` correctly verifies and confirms the booking, `host_response_deadline` is correctly set — but the host receives no notification that a request exists at all, and could let it silently expire without ever knowing. This is a real, launch-blocking gap for PayGate specifically, not a documentation error.

Both are listed again in their relevant sections below and in the Go/No-Go checklist (Section 9). Neither has been fixed as part of writing this runbook — flagging discovered gaps and letting the scope of any fix be decided explicitly has been the working pattern for this payment integration throughout, and these are both real code changes, not documentation.

---

## 1. Supabase secrets

Set via `npx supabase secrets set <NAME>=<value>` (from `cubby/`) or **Supabase Dashboard → Settings → Edge Functions → Secrets**. Never commit any of these, never log their values, never echo them back in an API response.

| Secret | Used by | Notes |
|---|---|---|
| `PAYGATE_ID` | `_shared/paygate.ts` (imported by every paygate-* function) | PayGate's official test `PAYGATE_ID` is `10011072130` — usable directly for sandbox verification with no separate application. There is **no `PAYGATE_SANDBOX` flag** in this codebase, deliberately: PayGate has one host (`secure.paygate.co.za`) for both test and live; which mode you're in is entirely a function of which `PAYGATE_ID`/`PAYGATE_ENCRYPTION_KEY` pair is configured here. |
| `PAYGATE_ENCRYPTION_KEY` | same | The paired encryption key for whichever `PAYGATE_ID` is set above. A mismatched pair doesn't error visibly — it just makes every checksum verification fail (see Section 8, "Checksum invalid"). |
| `SUPABASE_URL` | every paygate-* function | Auto-injected by the Supabase platform — do not set manually (confirmed in `supabase/PAYMENT_SETUP.md`'s existing guidance for the same variable). |
| `SUPABASE_SERVICE_ROLE_KEY` | `paygate-initiate`, `paygate-notify`, `paygate-return`, `paygate-query` | Required for every DB read/write and every `confirm_booking_payment` RPC call. `paygate-redirect` is the one exception — it has no Supabase client at all by design. |
| `ADMIN_SECRET` | `paygate-query` (the `x-admin-secret` server-to-server auth path), and indirectly `_shared/awaiting-host-notifications.ts` / `send-push` / `send-email` once the notification gap above is fixed | Same secret already used by `booking-expiry-sweep`, `complete-booking`, and the admin-* functions — **do not set a different value for payment functions**; it must be the one value every server-to-server caller in this codebase already shares. |
| `RESEND_API_KEY` | `send-email` (indirect dependency — needed for the host/traveller notification emails a successful payment should eventually trigger) | Not read by any paygate-* function directly, but required for the notification pipeline in Section 0/Item 2 to actually deliver email once wired up. |

**Verify secrets are set (without ever printing values):**
```bash
npx supabase secrets list
```
Confirm every name above appears in the list. This command shows names only, never values — that's the correct way to check, never `echo $SECRET` or log a value inside a function to "check" it's set.

---

## 2. PayGate dashboard configuration

These are the merchant-portal-side items to confirm before testing. Exact menu paths were not re-walked in this session — confirm live against the current PayGate developer portal, but the facts below were independently reviewed against PayGate's official PayWeb3 documentation earlier in this engagement and are the basis for everything the code does:

- [ ] The `PAYGATE_ID` configured in Supabase secrets (Section 1) is the one actually assigned to the intended merchant account (test account `10011072130`, or once issued, the live PayGate Plus Hospitality account).
- [ ] The `PAYGATE_ENCRYPTION_KEY` configured in Supabase secrets is the **current** key for that exact `PAYGATE_ID` — PayGate allows regenerating this key from the dashboard, which would silently break every checksum in this integration until Supabase secrets are updated to match. If checksums start failing that previously worked, a key rotation on PayGate's side is the first thing to check.
- [ ] ZAR is an enabled/supported currency for the account (every `initiate.trans` call in this codebase hardcodes `CURRENCY: 'ZAR'` — see `paygate-initiate/index.ts`).
- [ ] There is **no `NOTIFY_URL` or `RETURN_URL` to configure in the dashboard** for PayWeb3 — both are sent as fields on every individual `initiate.trans` request (built dynamically in `paygate-initiate/index.ts` from `SUPABASE_URL`), not a fixed dashboard setting. If the dashboard has fields for these, they are not what this integration relies on — do not treat setting them there as a substitute for anything in Section 1.
- [ ] Confirm whether the account has any IP allowlisting, 3-D Secure enforcement, or fraud-rule settings that could reject a legitimate sandbox test — if a sandbox `initiate.trans` or `query.trans` call is unexpectedly rejected, check this before assuming the code is wrong.
- [ ] Account status is active and not in a restricted/under-review state (PayGate merchant accounts, like most payment processors, can require a registered business entity — see `PRIVATE_BETA_LAUNCH_PLAYBOOK.md` Section 7, Risk #4, which flagged this exact risk for the previous PayFast account).

---

## 3. Edge Function deployment checklist

There is no `supabase/config.toml` declaring per-function JWT settings in this repo (confirmed 2026-07-31) — the `--no-verify-jwt` flag must be passed manually on every deploy for the functions that need it. Getting this wrong is silent and easy to miss: a function deployed *without* `--no-verify-jwt` when it needs it will reject every legitimate call with a platform-level 401 **before its own code ever runs** — that 401 will not appear in the function's own logs at all, which makes it a confusing failure to debug blind.

| Function | Deploy command | Why |
|---|---|---|
| `paygate-initiate` | `npx supabase functions deploy paygate-initiate --no-verify-jwt` | Performs its own manual `auth.getUser(token)` check (see code comment, line ~67) — same pattern as `payfast-create`. |
| `paygate-redirect` | `npx supabase functions deploy paygate-redirect --no-verify-jwt` | Public, unauthenticated by design — opened directly by `WebBrowser`/`window.location`, which cannot attach an `Authorization` header at all. |
| `paygate-notify` | `npx supabase functions deploy paygate-notify --no-verify-jwt` | PayGate's server calls this directly; it has no Supabase JWT to present. The checksum is the authentication. |
| `paygate-return` | `npx supabase functions deploy paygate-return --no-verify-jwt` | Public, unauthenticated by design — the traveller's browser is redirected here by PayGate, which cannot attach a JWT either. |
| `paygate-query` | `npx supabase functions deploy paygate-query --no-verify-jwt` | Accepts **either** a JWT (verified manually inside the function) **or** the `x-admin-secret` header for a server-to-server caller with no JWT at all — the platform's default JWT gate would block that second path entirely. |

`_shared/paygate.ts` is not deployed on its own — it's bundled into whichever function imports it. After changing it, **redeploy every function that imports it** (all five), not just the one you were working on.

**Post-deploy checklist, every function:**
- [ ] Deployed with `--no-verify-jwt` (all five, per the table above).
- [ ] `npx supabase functions list` shows the function with a recent "Updated" timestamp matching your deploy.
- [ ] No deploy-time TypeScript/bundling errors in the CLI output (distinct from the expected `tsc --noEmit` Deno-import noise this repo's root tsconfig produces locally — that noise is expected and does not indicate a real problem; a deploy-time failure from the Supabase CLI itself is a different, real signal).

---

## 4. Sandbox payment checklist

**Because of Gap #1 in Section 0, this cannot currently be done by tapping through the app.** Until `booking.tsx` calls `paygate-initiate` instead of `payfast-create`, drive it manually:

### 4.1 Prerequisites
- [ ] A real test booking exists with `status = 'pending_payment'` and a real traveller `profiles.email` set (see Section 5 for the query). `paygate-initiate` will reject with `400 Traveller email not found` otherwise.
- [ ] Sandbox `PAYGATE_ID`/`PAYGATE_ENCRYPTION_KEY` configured per Section 1.
- [ ] A valid Supabase JWT for that booking's `traveller_id` (grab it from a real signed-in app session, or via `supabase.auth.signInWithPassword` in a throwaway script).

### 4.2 Step-by-step

**Step 1 — initiate:**
```bash
curl -X POST "$SUPABASE_URL/functions/v1/paygate-initiate" \
  -H "Authorization: Bearer $TRAVELLER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\": \"$BOOKING_ID\"}"
```
Expect `200 {"ok":true,"payRequestId":"...","checksum":"..."}`. Record both values.

**Step 2 — redirect (open in an actual browser, not curl):**
```
$SUPABASE_URL/functions/v1/paygate-redirect?payRequestId=<PAY_REQUEST_ID>&checksum=<CHECKSUM>
```
Expect the "Redirecting to PayGate…" page to auto-submit within ~1 second and land on PayGate's actual hosted payment page. If it doesn't auto-submit, check the browser console for a CSP violation before assuming the form itself is broken.

**Step 3 — pay:** Use PayGate's own currently-documented sandbox test card numbers and OTP from their official Testing page — do not rely on any card numbers written into this runbook, since PayGate can change them, and a stale number here would silently fail in a way that looks like a code bug.

**Step 4 — notify (should fire automatically):** PayGate calls `paygate-notify` server-to-server within moments of a completed sandbox payment. Verify via Section 5's query and Section 7's expected logs — do not assume it fired just because the browser reached the return page.

**Step 5 — return (automatic, browser redirect):** Confirm the return page shows the correct status and that the `cubby://payment-result?...` deep link (visible in the page source, or via a real device/simulator with the Cubby scheme registered) carries the right `bookingId` and `status`.

**Step 6 — query (manual fallback test, not automatic):** Deliberately exercise the reconciliation path at least once, since nothing else calls it in normal operation. Either wait for notify above, then call query anyway to confirm the idempotent no-op path, or — for a real reconciliation test — pick a booking where notify is known not to have fired yet and confirm query alone can resolve it:
```bash
curl -X POST "$SUPABASE_URL/functions/v1/paygate-query" \
  -H "Authorization: Bearer $TRAVELLER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\": \"$BOOKING_ID\"}"
```
Expect `200 {"ok":true,"confirmed":true}` on first genuine reconciliation, or `200 {"ok":true,"alreadyResolved":true,...}`/`{"confirmed":false,"alreadyResolved":true,...}` if notify already resolved it.

### 4.3 Checklist
- [ ] Step 1 returns a valid `payRequestId` + `checksum`.
- [ ] Step 2's redirect page auto-submits with no CSP violation.
- [ ] The PayGate-hosted page loads and accepts the official sandbox test card.
- [ ] `paygate-notify` fires and confirms the booking (Section 5/7).
- [ ] The return page (Step 5) shows the correct real status, not the generic "pending" fallback.
- [ ] `paygate-query` (Step 6) is exercised at least once and behaves as expected, including on an already-resolved booking.
- [ ] **`NOTIFY_FIELD_ORDER` is confirmed against this real notify payload's actual `CHECKSUM`** (see Section 9 — this is the one remaining blocking item before real payments, and it is only confirmable with a real sandbox payload, never in this local environment).

---

## 5. Database verification queries

Run these in the Supabase SQL Editor (service-role context, bypasses RLS — appropriate for verification). Replace `<BOOKING_ID>`.

**Find a payable test booking (for Section 4.1):**
```sql
select id, traveller_id, status, total_price, payment_provider, paygate_pay_request_id
from bookings
where status in ('pending_payment', 'pending')
order by created_at desc
limit 10;
```

**Confirm traveller has an email set (required by `paygate-initiate`):**
```sql
select p.id, p.email
from profiles p
join bookings b on b.traveller_id = p.id
where b.id = '<BOOKING_ID>';
```

**Full payment-relevant state for one booking, after a test run:**
```sql
select
  id, status, payment_provider, paygate_pay_request_id,
  payment_reference, total_price, paid_at,
  host_response_deadline, declined_at, expired_at,
  refund_status, refund_requested_at
from bookings
where id = '<BOOKING_ID>';
```
Expected after a successful sandbox payment: `status = 'awaiting_host_confirmation'`, `payment_provider = 'paygate'`, `payment_reference` set (PayGate's `TRANSACTION_ID`, or `PAY_REQUEST_ID` as fallback), `paid_at` set to roughly the time of payment, `host_response_deadline` set to roughly `paid_at + 30 minutes`.

**Duplicate `payment_reference` check (should always return zero rows — enforced by the `bookings_payment_reference_unique` constraint, this is a sanity check, not something that should ever legitimately fire):**
```sql
select payment_reference, count(*)
from bookings
where payment_reference is not null
group by payment_reference
having count(*) > 1;
```

**Bookings with a `paygate_pay_request_id` but no resolved status (candidates for `paygate-query` reconciliation):**
```sql
select id, status, paygate_pay_request_id, created_at
from bookings
where payment_provider = 'paygate'
  and paygate_pay_request_id is not null
  and status in ('pending_payment', 'pending')
order by created_at asc;
```

**Confirm `payment_provider` allowlist is actually enforced (should error, proving the CHECK constraint is live — do not run this against a real booking you care about):**
```sql
-- Expect: ERROR - new row for relation "bookings" violates check constraint "bookings_payment_provider_check"
update bookings set payment_provider = 'not_a_real_provider' where id = '<BOOKING_ID>';
```

---

## 6. Expected booking state transitions

The authoritative transitions, each backed by exactly one guarded Postgres RPC (never a raw `.update()` from an Edge Function) — see `supabase/schema.sql`.

```
pending_payment
   │  confirm_booking_payment(booking_id, payment_reference, 'paygate')
   │  called by: paygate-notify (primary) or paygate-query (reconciliation fallback)
   │  guard: status = 'pending_payment'
   ▼
awaiting_host_confirmation           (paid_at, host_response_deadline = now()+30min set here)
   │
   ├─ accept_booking(booking_id)                    ──▶ confirmed
   │  guard: status='awaiting_host_confirmation' AND host_response_deadline > now()
   │
   ├─ decline_booking(booking_id)                    ──▶ declined
   │  guard: same as above; also sets refund_status='pending_manual'
   │
   ├─ cancel_awaiting_booking(booking_id)  (traveller-initiated)  ──▶ cancelled
   │  guard: status='awaiting_host_confirmation', traveller_id = auth.uid()
   │
   └─ expire_overdue_booking() / check_booking_expiry(booking_id)  ──▶ expired
      guard: status='awaiting_host_confirmation' AND host_response_deadline <= now()
      (runs via the booking-expiry-sweep cron, or opportunistically when a client
       opens/refreshes a booking that looks overdue)

confirmed
   │  complete-booking Edge Function (host taps "mark complete" — direct .update(),
   │  not a guarded RPC; only excludes an already-'completed' booking)
   ▼
completed   (completed_at, host_payout_amount, cubby_amount, payout_status='pending_manual' set here)
```

**Never expected for a PayGate booking:** a transition straight from `pending_payment` to `confirmed` or `completed` — `awaiting_host_confirmation` is never skipped. If you ever see this in real data, it means a booking's status was written outside `confirm_booking_payment`/`accept_booking` — a direct `.update()` bypassing the guarded RPCs — and is worth investigating as a genuine anomaly, not routine variation.

**Idempotency:** every transition above is guarded by its own `WHERE status = '<expected prior state>'` clause inside a `SECURITY DEFINER` function — a duplicate/retried call (PayGate retrying `paygate-notify`, a race between `paygate-notify` and `paygate-query`, a double-tap on Accept) always resolves to `{ok:false, reason:'already_resolved', status:<current status>}` rather than a second transition or a corrupted state.

**Gap #2 from Section 0 applies here:** the transition into `awaiting_host_confirmation` via a PayGate payment does **not** currently trigger the host/traveller notifications that the same transition via PayFast/Peach does. The DB state above is correct regardless — this only affects whether anyone finds out about it without checking manually.

---

## 7. Expected logs from each Edge Function

All log lines are prefixed `[<function-name>]` and are safe to grep for. **None of them ever include `PAYGATE_ENCRYPTION_KEY`, a full raw request/response payload, or the full parsed PayGate response object** — only `bookingId`/`payRequestId` plus narrow status/reason/code fields. If you ever see a full payload or a key value in a log during troubleshooting, that itself is a regression worth fixing immediately, not just working around.

### `paygate-initiate`
| Log line (prefix omitted) | Meaning |
|---|---|
| `Timed out calling initiate.trans:` / `Network error calling initiate.trans:` | PayGate unreachable or slow — booking untouched. |
| `initiate.trans returned non-OK status:` | PayGate rejected the HTTP request itself. |
| `PayGate returned an error:` | PayGate's own `ERROR` field was populated. |
| `Malformed initiate response (missing fields):` | Response had no `PAY_REQUEST_ID`/`CHECKSUM`. |
| `Response checksum mismatch:` | Fail-closed — `PAY_REQUEST_ID` never stored. |
| `REFERENCE mismatch despite valid checksum:` | Should be unreachable; belt-and-braces. |
| `DB update error:` | Booking not updated with `PAY_REQUEST_ID` — payment attempt exists on PayGate's side but isn't recorded locally; needs manual reconciliation. |
| `Unexpected error:` | Unhandled exception. |
| *(no log line at all)* | The success path (`200 {"ok":true,...}`) — expected, not an error. |

### `paygate-redirect`
No logging at all, by design (no Supabase client, no I/O beyond returning HTML). Verify this function by inspecting the returned HTML/response headers directly, not logs.

### `paygate-notify`
| Log line | Meaning | Response |
|---|---|---|
| `Missing required field(s), no booking updated:` | Malformed payload | `400 MISSING_FIELDS` |
| `PayGate credentials not configured — cannot verify notify payload` | Secrets missing | `500 NOT_CONFIGURED` |
| `Payload PAYGATE_ID does not match configured PAYGATE_ID:` | Non-blocking anomaly, logged only | (continues) |
| `Checksum verification failed, no booking updated. REFERENCE:` | Fail-closed | `400 CHECKSUM_INVALID` |
| `Non-success TRANSACTION_STATUS, no action taken:` | Verified decline/pending — expected, not an error | `200 OK` |
| `Booking not found for verified REFERENCE:` | REFERENCE didn't resolve to a real booking | `500 BOOKING_NOT_FOUND` |
| `SECURITY: amount mismatch, booking NOT confirmed:` | **Investigate immediately** — a checksum-valid payload whose amount doesn't match the booking | `500 AMOUNT_MISMATCH` |
| `confirm_booking_payment RPC error, NOT acknowledged:` | DB/RPC failure on a genuinely valid payment | `500 RPC_ERROR` |
| `Booking confirmed, now awaiting host confirmation:` | **The expected success line** | `200 OK` |
| `Duplicate/stale notify, already resolved:` | Expected on a PayGate retry or a race with `paygate-query` | `200 OK` |
| `confirm_booking_payment did not confirm, NOT acknowledged:` | Unexpected RPC outcome (e.g. `reference_reused`) — investigate | `500 CONFIRM_FAILED` |
| `Unexpected error, NOT acknowledged:` | Unhandled exception | `500 INTERNAL_ERROR` |

### `paygate-return`
| Log line | Meaning |
|---|---|
| `Missing PayGate return params — nothing disclosed` | Malformed/incomplete return URL |
| `Not configured — nothing disclosed` | Secrets missing |
| `Booking lookup error for PAY_REQUEST_ID — nothing disclosed:` | DB error on lookup |
| `No booking found for PAY_REQUEST_ID — nothing disclosed:` | No stored `paygate_pay_request_id` matched — expected for the known "older overwritten attempt" cosmetic limitation (Section 8) |
| `SECURITY: multiple bookings matched one PAY_REQUEST_ID — nothing disclosed:` | **Should never happen** — investigate immediately if seen |
| `Checksum verification failed for a matched PAY_REQUEST_ID — nothing disclosed` | Fail-closed |
| *(no log line)* | The success path — booking found, checksum verified, real status disclosed. |

### `paygate-query`
| Log line | Meaning | Response |
|---|---|---|
| `Timed out calling query.trans:` / `Network error calling query.trans:` | PayGate unreachable | `502 PAYGATE_TIMEOUT`/`PAYGATE_UNREACHABLE` |
| `query.trans returned non-OK status:` | PayGate rejected the HTTP request | `502 PAYGATE_REJECTED` |
| `PayGate returned an error:` | PayGate's `ERROR` field populated | `502 PAYGATE_ERROR` |
| `Malformed query response, no booking updated:` | Missing `TRANSACTION_STATUS`/`AMOUNT`/`CHECKSUM` | `502 PAYGATE_MALFORMED_RESPONSE` |
| `Response checksum verification failed, nothing confirmed:` | Fail-closed | `502 CHECKSUM_INVALID` |
| `Merchant ID mismatch despite valid checksum, nothing confirmed:` | Should be unreachable; belt-and-braces | `502 MERCHANT_ID_MISMATCH` |
| `REFERENCE mismatch despite valid checksum, nothing confirmed:` | Should be unreachable; belt-and-braces | `502 REFERENCE_MISMATCH` |
| `SECURITY: amount mismatch, booking NOT confirmed:` | **Investigate immediately** | `502 AMOUNT_MISMATCH` |
| `Non-success TRANSACTION_STATUS, no action taken:` | Verified decline/pending — expected | `200 {"confirmed":false,...}` |
| `confirm_booking_payment RPC error:` | DB/RPC failure | `500 RPC_ERROR` |
| `Booking confirmed via reconciliation:` | **The expected reconciliation-success line** | `200 {"confirmed":true}` |
| `Already resolved by the time reconciliation ran:` | Race with `paygate-notify` or a prior query call — expected | `200 {"alreadyResolved":true,...}` |
| `confirm_booking_payment did not confirm:` | Unexpected RPC outcome | `500 CONFIRM_FAILED` |
| `Unexpected error:` | Unhandled exception | `500 Internal server error` |

---

## 8. Failure scenarios and expected behaviour

| Scenario | Expected behaviour | Where to check |
|---|---|---|
| PayGate unreachable / times out during `initiate.trans` | `paygate-initiate` returns `502 PAYGATE_TIMEOUT`/`PAYGATE_UNREACHABLE` (15s timeout). Booking stays `pending_payment`, nothing stored. Safe to retry. | Section 7, `paygate-initiate` |
| PayGate unreachable / times out during `query.trans` | Same pattern, `paygate-query`, `502`. Booking untouched. | Section 7, `paygate-query` |
| `paygate-notify` never arrives at all | Booking sits in `pending_payment` indefinitely (not `awaiting_host_confirmation` — there's no partial state). Use `paygate-query` to reconcile once triggered (manually, until Gap #1's app-integration is built and until any scheduled sweep is built). | Section 5's reconciliation-candidates query |
| Forged/tampered `paygate-notify` payload (wrong checksum) | Rejected, `400 CHECKSUM_INVALID`, non-`OK` response so PayGate's own retry can recover a *genuinely* transient delivery — but a deliberately forged payload will just keep failing, correctly. Booking never touched. | Section 7 |
| `paygate-notify` payload with a valid checksum but wrong `AMOUNT` | Rejected as `500 AMOUNT_MISMATCH`, logged as `SECURITY:`. Booking never marked paid. This is the scenario the amount-verification check exists specifically to catch — a valid checksum alone is not sufficient. | Section 7 |
| Duplicate `paygate-notify` delivery (PayGate's own retry, or a genuine duplicate) | Second call hits `confirm_booking_payment`'s guard, returns `already_resolved`, acknowledged with `OK` (nothing left to retry). No second transition, `paid_at`/`host_response_deadline` unchanged. | Section 5, Section 6 |
| `paygate-notify` and `paygate-query` race (both resolve the same booking near-simultaneously) | Whichever's `confirm_booking_payment` call wins the guarded `UPDATE` succeeds; the other gets `already_resolved` and reports it as a safe no-op, never a second confirmation or a `payment_reference` overwrite. | Section 5 (duplicate-reference query), Section 6 |
| Traveller's browser never returns to `paygate-return` (closed tab, killed app) | No effect on payment state — `paygate-return` is explicitly non-authoritative and never calls `confirm_booking_payment`. If `paygate-notify` already fired, the booking is correctly `awaiting_host_confirmation` regardless of whether the return page was ever seen. | Section 6 |
| `paygate-return` hit with a `bookingId` a traveller doesn't own, or a guessed/random UUID | Falls through to the one generic non-disclosing "pending" response — the URL's `bookingId` is never used for lookup or disclosure (this was a real IDOR, found and fixed in PR #68 review; see `PROJECT_MASTER_PLAN.md`). | Section 7 |
| Return callback for an *older, retry-overwritten* `paygate_pay_request_id` | `paygate-return` shows the generic "pending" page (no match on the current, overwritten column value) even if `paygate-notify` already confirmed the booking moments earlier via `REFERENCE`. **Cosmetic only** — the booking's real state is already correct; the traveller just needs to check the app instead of trusting this specific page. | Section 6, known limitation |
| `paygate-query` called for a booking with no `paygate_pay_request_id` (e.g. never went through `paygate-initiate`, or used a different provider) | `400 NO_PAY_REQUEST_ID`. No PayGate call made. | Section 7 |
| `paygate-query` called for an already-resolved booking | `200 {"ok":true,"alreadyResolved":true,"status":...}` immediately — no PayGate call at all, cheapest possible no-op. | Section 6, Section 7 |
| `paygate-query` called by someone who doesn't own the booking, without `x-admin-secret` | `403 Not authorized for this booking`. No PayGate call. | Section 7 |
| Older, retry-superseded `paygate_pay_request_id` attempt somehow still gets approved by PayGate | **Not reconcilable by any current path** — not `paygate-notify` (unaffected, actually — see Section 6), not `paygate-return` (cosmetic gap only), not `paygate-query` (genuinely can't reach it, only the latest `paygate_pay_request_id` is queryable). Accepted Private Beta limitation; see `PROJECT_MASTER_PLAN.md`. | `PROJECT_MASTER_PLAN.md`, "paygate-query design decisions" |
| `PAYGATE_ID`/`PAYGATE_ENCRYPTION_KEY` misconfigured or mismatched pair | Every checksum verification fails from that point on — looks identical to a forged-payload attack in the logs. Check Section 2's dashboard items (especially key rotation) before assuming malicious activity. | Section 2, Section 7 |
| A booking is confirmed via PayGate but the host is never notified | **This is Gap #2 (Section 0) — currently expected, not a bug you're troubleshooting.** Booking state (Section 5/6) will show the correct `awaiting_host_confirmation` status regardless; the host simply won't know unless they happen to check the app, until this gap is fixed. | Section 0 |

---

## 9. Go/No-Go launch checklist

**Blocking — must be true before enabling real (non-test) payments:**

- [ ] **`NOTIFY_FIELD_ORDER` confirmed against a real sandbox notify payload's actual `CHECKSUM`** — the one item marked `⚠️ BLOCKING PRE-LAUNCH ITEM` in `_shared/paygate.ts`. This also governs `paygate-query`'s response checksum (documented as inheriting the same caveat), so confirming it once during Section 4's sandbox run settles both.
- [ ] A complete sandbox payment has been run through the **full chain** (Section 4) with every checklist item in 4.3 passing.
- [ ] All five paygate-* functions deployed with `--no-verify-jwt` (Section 3), confirmed via `npx supabase functions list`.
- [ ] All secrets in Section 1 confirmed set via `npx supabase secrets list` (names only — never verify by printing a value).
- [ ] PayGate dashboard items in Section 2 confirmed, especially that the configured `PAYGATE_ENCRYPTION_KEY` is current (not rotated since it was last set in Supabase).
- [ ] Section 5's duplicate-`payment_reference` query returns zero rows on the real database.
- [ ] **Gap #1 (Section 0) resolved or explicitly accepted**: either `booking.tsx` calls `paygate-initiate`/`paygate-redirect` instead of `payfast-create`, or the founder explicitly accepts launching without app-level integration (unlikely to make sense — real travellers can't pay via a function that's never called).
- [ ] **Gap #2 (Section 0) resolved or explicitly accepted**: either `paygate-notify`/`paygate-query` call `sendAwaitingHostNotifications` on a fresh confirm, or the founder explicitly accepts that hosts won't be notified of new PayGate-paid bookings until this is fixed (high operational risk given `host_response_deadline` still silently expires them either way — see `PRIVATE_BETA_LAUNCH_PLAYBOOK.md` Section 7, Risk #2, "Founder-as-single-point-of-failure").
- [ ] `RETURN_FIELD_ORDER` and `NOTIFY_FIELD_ORDER`'s exact field *order* (not just field list) have both been byte-for-byte confirmed against real PayGate responses at least once — `INITIATE_FIELD_ORDER`/`RESPONSE_FIELD_ORDER` already were, against PayGate's own worked examples in their docs.

**Non-blocking but recommended before real payments:**

- [ ] A basic manual/scheduled reconciliation habit exists (run `paygate-query` against Section 5's "reconciliation candidates" query periodically) until an automated sweep is built — nothing currently calls `paygate-query` on its own.
- [ ] Deprecated Peach functions removed rather than left live, per `PRIVATE_BETA_LAUNCH_PLAYBOOK.md` Section 6 ("Remove entirely").
- [ ] The manual refund process (`PRIVATE_BETA_LAUNCH_PLAYBOOK.md` Section 4) is written down specifically for PayGate refunds — the existing documented process there still references PayFast's flow.

**Sign-off:** record the date, the real (not test) `PAYGATE_ID` used for the first live transaction, and confirmation that every blocking item above was checked on that date — not assumed carried-over from an earlier sandbox run, since a dashboard-side key rotation or an app deploy could silently invalidate an earlier pass.
