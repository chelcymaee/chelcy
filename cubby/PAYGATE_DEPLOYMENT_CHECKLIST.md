# Cubby — PayGate Deployment Checklist

**Created:** 2026-07-31
**Purpose:** Operational, execution-focused checklist for actually deploying the PayGate integration to the current production Supabase project and mobile app build, once real PayGate merchant credentials are issued. This is deployment prep, not code — nothing in this file changes application behavior.
**Companion document:** `PAYMENT_VERIFICATION_RUNBOOK.md` — that's the reference for *verifying/troubleshooting* the system once it's live; this file is for the one-time (and repeatable) act of *getting it deployed* in the first place. Where the two overlap (secrets, deploy commands), the facts are the same; this file adds the exact literal URLs/commands for this specific project and app configuration, plus the mobile app / EAS build side the runbook doesn't cover.
**Current production Supabase project:** `https://gqgxahqmndkaeyuvhliv.supabase.co` (the hardcoded default in `src/lib/supabase.ts` — there is no separate staging/sandbox Supabase project in this codebase; PayGate sandbox vs. live is controlled entirely by which `PAYGATE_ID`/`PAYGATE_ENCRYPTION_KEY` pair is configured, not by any Supabase-side environment split).

---

## 1. Supabase Edge Functions that must be deployed

**The five paygate-* functions (code changes from this engagement):**

| Function | Contains changes from | Deploy command |
|---|---|---|
| `paygate-initiate` | PR #65 (original) | `npx supabase functions deploy paygate-initiate --no-verify-jwt` |
| `paygate-redirect` | PR #66 (original) | `npx supabase functions deploy paygate-redirect --no-verify-jwt` |
| `paygate-notify` | PR #67 (original), **PR #72 (host notification, 2026-07-31)** | `npx supabase functions deploy paygate-notify --no-verify-jwt` |
| `paygate-return` | PR #68 (original) | `npx supabase functions deploy paygate-return --no-verify-jwt` |
| `paygate-query` | PR #69 (original), **PR #72 (host notification, 2026-07-31)** | `npx supabase functions deploy paygate-query --no-verify-jwt` |

**Deploy all five in one pass** (safest — `_shared/paygate.ts` and `_shared/awaiting-host-notifications.ts` are bundled per-function, not deployed independently, so any function that imports either must be redeployed together to guarantee they're all running the same shared-module version):
```bash
cd cubby
npx supabase login
npx supabase link --project-ref gqgxahqmndkaeyuvhliv
npx supabase functions deploy paygate-initiate --no-verify-jwt
npx supabase functions deploy paygate-redirect --no-verify-jwt
npx supabase functions deploy paygate-notify --no-verify-jwt
npx supabase functions deploy paygate-return --no-verify-jwt
npx supabase functions deploy paygate-query --no-verify-jwt
```

**Two indirect dependencies, load-bearing as of PR #72 but not new deploys** — `paygate-notify`/`paygate-query` now call `sendAwaitingHostNotifications`, which itself calls these two functions over HTTP:

| Function | Why it matters now | Action needed |
|---|---|---|
| `send-push` | Sends the host's/traveller's in-app push notification | Confirm it's currently deployed and working (`npx supabase functions list`) — it predates this engagement's PayGate work and isn't part of this deploy, but a stale/broken deployment here would silently defeat PR #72's entire purpose. Fire-and-forget, so its failure won't block payment confirmation, but it also won't be obvious anything's wrong unless checked. |
| `send-email` | Sends the host's "new booking request" email | Same as above. Requires `RESEND_API_KEY` (Section 2) to actually deliver, not just be deployed. |

**Not part of this deploy, confirm unchanged:** `_shared/admin-session.ts` and every admin-* function — untouched by this engagement's PayGate work, no action needed.

---

## 2. Supabase secrets that must exist before testing

Set via `npx supabase secrets set <NAME>=<value>` or **Supabase Dashboard → Settings → Edge Functions → Secrets**. Split below into what should already exist vs. what's genuinely blocked on external input, so it's unambiguous which items this checklist is actually waiting on.

### 2.1 Already-existing project secrets (should already be set — confirm, don't assume)

| Secret | Required for |
|---|---|
| `SUPABASE_URL` | Every paygate-* function — auto-injected by the platform, do not set manually. |
| `SUPABASE_SERVICE_ROLE_KEY` | `paygate-initiate`, `paygate-notify`, `paygate-return`, `paygate-query` — used by every other server-role Edge Function in this project already. |
| `ADMIN_SECRET` | `paygate-query`'s `x-admin-secret` auth path; indirectly `send-push`/`send-email` via `sendAwaitingHostNotifications`. Used by `booking-expiry-sweep`, `complete-booking`, admin-* already. **Must be the same value** every server-to-server caller already shares — do not create a second, payment-specific secret with this name. |
| `RESEND_API_KEY` | `send-email`, now indirectly triggered by every PayGate confirmation (PR #72). Should already exist if host/traveller emails work today for PayFast/Peach bookings — confirm, don't assume, since this is a new, real dependency for PayGate specifically now. |

### 2.2 PayGate credentials still pending (from Fawwaz)

| Secret | Required for | Status |
|---|---|---|
| `PAYGATE_ID` | Every paygate-* function | **Not yet available — blocked on the merchant account from Fawwaz.** PayGate's public test value `10011072130` can be used for an initial sandbox run only if a real test account isn't issued yet; this is a publicly documented test ID, not a real credential. |
| `PAYGATE_ENCRYPTION_KEY` | Every paygate-* function | **Not yet available — blocked on the same merchant account from Fawwaz.** Paired with whichever `PAYGATE_ID` above is set; the two must come from the same account/environment (test or live), never mixed. |

**Verify (names only, never print values):**
```bash
npx supabase secrets list
```
Confirm every name in both tables above is present before testing. Section 2.2 is the actual blocker on the "wait for merchant credentials" step — everything in Section 2.1 should already be satisfied by existing infrastructure and needs only confirming, not waiting on anyone.

---

## 3. PayGate merchant dashboard settings to configure

Once credentials are issued, confirm in the PayGate developer portal (exact menu paths not re-walked this session — confirm live):

- [ ] `PAYGATE_ID` assigned to the Cubby / PayGate Plus Hospitality merchant account matches what's about to be set in Supabase secrets (Section 2).
- [ ] The account's `PAYGATE_ENCRYPTION_KEY` is copied exactly as issued — no manual retyping (copy/paste from the portal directly into `npx supabase secrets set`).
- [ ] ZAR is an enabled settlement/transaction currency (`initiate.trans` hardcodes `CURRENCY: 'ZAR'`).
- [ ] Account status is active, not pending/under review.
- [ ] **Nothing to configure for `NOTIFY_URL`/`RETURN_URL`/redirect** — PayWeb3 takes these as per-request fields (Section 4 below), not dashboard settings. If the dashboard exposes fields with these names, do not fill them in as a substitute for the actual per-request values this codebase sends — leave dashboard-level URL fields (if any exist) at their default/unset state, or explicitly confirm with PayGate support that per-request `NOTIFY_URL`/`RETURN_URL` values are honored and take precedence.
- [ ] Confirm whether IP allowlisting, 3-D Secure enforcement, or fraud rules are active on the account — any of these could reject a legitimate sandbox test in a way that looks like a code bug.
- [ ] Confirm whether a separate **live** `PAYGATE_ID`/key pair exists (distinct from the test `10011072130` credentials) and which one is intended for the first sandbox run — do not accidentally run the "sandbox test" against live credentials, or vice versa for what's meant to be a real transaction later.

---

## 4. URLs to verify

PayWeb3 has **no dashboard-configured NOTIFY_URL/RETURN_URL and no CANCEL_URL at all** (confirmed against official docs earlier in this engagement — cancellation arrives as a non-approved `TRANSACTION_STATUS` on the same return leg). Every URL PayGate is told about is built dynamically, per-request, from `SUPABASE_URL` inside `paygate-initiate`. For the current production project, that resolves to these exact literal values:

| Purpose | Literal URL for this project | Built by |
|---|---|---|
| Notify (server-to-server webhook) | `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/paygate-notify` | `paygate-initiate/index.ts` line ~124, fixed for every request |
| Return (browser redirect back) | `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/paygate-return?bookingId=<booking's own UUID>` | `paygate-initiate/index.ts` line ~119, `bookingId` varies per request |
| Redirect bridge (internal — never sent to PayGate, the app navigates here itself) | `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/paygate-redirect?payRequestId=...&checksum=...` | Client-side, `app/(traveller)/booking.tsx`, from `paygate-initiate`'s response |
| PayGate's own hosted initiate endpoint | `https://secure.paygate.co.za/payweb3/initiate.trans` | Fixed constant, `_shared/paygate.ts` |
| PayGate's own hosted checkout endpoint | `https://secure.paygate.co.za/payweb3/process.trans` | Fixed constant, `_shared/paygate.ts` |
| PayGate's own hosted query endpoint | `https://secure.paygate.co.za/payweb3/query.trans` | Fixed constant, `_shared/paygate.ts` |
| Deep link back into the app | `cubby://payment-result?status=<success\|pending\|failed>&bookingId=<uuid>` | `paygate-return/index.ts`, rendered into the return page |

**Verify:**
- [ ] Confirm `SUPABASE_URL` as auto-injected into deployed functions actually resolves to `gqgxahqmndkaeyuvhliv.supabase.co` — if this project is ever relinked or a different Supabase project is used for this deploy, every URL above changes and this table needs regenerating (it is not something to assume stays constant).
- [ ] Confirm the app's own `EXPO_PUBLIC_SUPABASE_URL` (Section 5) points at the **same** project — a mismatch here would mean the app is calling a different project's `paygate-initiate` than the one whose `NOTIFY_URL`/`RETURN_URL` PayGate is actually told about, which would silently break the whole flow in a confusing way (initiate would appear to succeed against one project while notify/return never reaches it).
- [ ] Confirm `cubby://` is registered as this app build's URL scheme (`app.json` → `"scheme": "cubby"` — already correct in the repo, just confirm the *built* app actually has it, since this is a native-level registration that only takes effect after a real rebuild, not an OTA update).
- [ ] There is no `CANCEL_URL` to verify — do not spend time looking for one in the PayGate dashboard or docs; a cancelled checkout returns via the same Return URL above with a non-approved `TRANSACTION_STATUS`.

---

## 5. Mobile app environment variables required

From `src/lib/supabase.ts` and `app/_layout.tsx`. `EXPO_PUBLIC_*` variables are baked into the app bundle at **build time** — changing one requires a new build, not just a redeploy of Supabase functions.

| Variable | Required for payments | Current behavior if unset |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | **Yes** — every Supabase call the app makes, including `paygate-initiate` | Falls back to the hardcoded default `https://gqgxahqmndkaeyuvhliv.supabase.co` (same project as above) — confirm this is intentional for the build being tested, not accidentally pointing elsewhere. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** — required for any Supabase client call to authenticate as the anon role | Falls back to a hardcoded default matching the same project. Same caveat as above. |
| `EXPO_PUBLIC_SENTRY_DSN` | No — unrelated to payments | Sentry simply doesn't initialize; not a payment blocker, but worth having set anyway so any real-money-path exception is actually captured during sandbox testing. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | No — unrelated to payments | Only affects the map/host-discovery screens, not the booking/payment flow itself. |

**Verify:**
- [ ] The build being used for the sandbox test was built with `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` pointing at the same project as Section 2's secrets and Section 1's deployed functions. If relying on the hardcoded defaults (no `.env` override), this is automatically satisfied — confirm no `.env` file overrides it to a different project for this build.
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set for this build, so a real exception during the actual sandbox payment is captured, not silently lost.

---

## 6. App build / distribution

**No OTA update mechanism is configured in this project** (`expo-updates` is not installed, no `runtimeVersion`/`updates` block in `app.json`) — PR #71's `booking.tsx`/`app/_layout.tsx`/`payment-success.tsx` changes require a **real rebuild**, not a JS-only push, to reach a test device. Confirm this hasn't changed before assuming a rebuild isn't needed.

**`eas.json`'s `preview` profile builds iOS as a simulator (`"ios": {"simulator": true}`)** — a simulator build cannot be installed on, or meaningfully test, a physical device's real deep-link/`WebBrowser.openAuthSessionAsync` return behavior. Confirmed against Expo's own EAS Build documentation: `ios.simulator: true` is specifically what you set to *get* a simulator build, meaning a profile that omits it (like `development` below) produces a real, physical-device-installable build by default. **`development` is the profile that produces a physical-device build** (`developmentClient: true`, `distribution: internal`, no simulator flag) — this file deliberately does not change `eas.json` itself (out of scope, operational checklist only per this deliverable's instructions), just flags the distinction so the wrong profile isn't used by accident.

```bash
cd cubby
npx eas login
# Android: preview profile produces a real installable APK, fine as-is.
npx eas build --profile preview --platform android
# iOS: use development (real device, dev client) for actual device testing —
# preview's iOS build is simulator-only, per eas.json above.
npx eas build --profile development --platform ios
```

- [ ] The build actually installed on the test device is from **after** PR #71 merged (2026-07-31) — an older installed build will still be running the `payfast-create` code path regardless of what's deployed server-side.
- [ ] iOS: built and installed via the `development` profile (or a future dedicated device-preview profile, if `eas.json` is later updated) — not the current `preview` profile, which targets the simulator.
- [ ] For the web build (`npx expo start --web` / a hosted web build, if used for testing): confirm this is only used for the parts of the flow reachable on web (`Platform.OS === 'web'` uses `window.location.href` directly, not `WebBrowser`) — the native code path in `booking.tsx` genuinely cannot be exercised from a web build, this is a real platform difference, not a build-configuration issue to try to work around.

---

## 7. Pre-flight checklist — confirm before attempting the first sandbox payment

Work through in order; each section above is the source for the corresponding item.

- [ ] **Section 1**: all five `paygate-*` functions deployed with `--no-verify-jwt`, confirmed via `npx supabase functions list` showing a recent "Updated" timestamp for each.
- [ ] **Section 1**: `send-push` and `send-email` confirmed still deployed and functioning (not part of this deploy, but newly load-bearing).
- [ ] **Section 2.1**: `npx supabase secrets list` shows `SUPABASE_URL` (auto), `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `RESEND_API_KEY` all present.
- [ ] **Section 2.2**: `PAYGATE_ID` and `PAYGATE_ENCRYPTION_KEY` set — from Fawwaz's issued merchant credentials, or the public test pair if running an initial sandbox check before those arrive.
- [ ] **Section 3**: PayGate dashboard settings confirmed, current `PAYGATE_ENCRYPTION_KEY` copied exactly into Supabase secrets (a stale/rotated key is the single most common way a previously-working checksum starts failing).
- [ ] **Section 4**: `SUPABASE_URL` (server) and `EXPO_PUBLIC_SUPABASE_URL` (app) confirmed pointing at the same project.
- [ ] **Section 5**: app build's env vars confirmed correct for this project.
- [ ] **Section 6**: test device is running a build from after PR #71 (2026-07-31), not an older cached build.
- [ ] A real test booking exists in `pending_payment` status with a traveller who has a real `profiles.email` set (`paygate-initiate` rejects otherwise) — see `PAYMENT_VERIFICATION_RUNBOOK.md` Section 5 for the exact query.
- [ ] Everyone involved in the test knows **`NOTIFY_FIELD_ORDER`'s exact field order is still unconfirmed** against a real payload — this first sandbox run's notify callback is itself the confirmation step (see `PAYMENT_VERIFICATION_RUNBOOK.md` Section 9); be ready to inspect the raw notify payload/checksum if anything about it looks wrong, not just treat a failure as "the code is broken."
- [ ] A rollback/pause plan exists if the sandbox run reveals a real problem: since these are Edge Functions (not the app itself), reverting `PAYGATE_ID`/`PAYGATE_ENCRYPTION_KEY` to blank (or simply not setting them) makes every paygate-* function return `503 PAYGATE_NOT_CONFIGURED` immediately, which is a safe, fast way to halt the integration without a redeploy if something is actively wrong mid-test. **Grep-confirmed scope of this rollback**: `PAYGATE_ID`/`PAYGATE_ENCRYPTION_KEY` are read only by `_shared/paygate.ts` and the five paygate-* functions that import it — nothing else in `supabase/functions/` references either name. PayFast (`PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, etc.) and Peach (`PEACH_PAYMENTS_TOKEN`, `PEACH_PAYMENTS_ENTITY_ID`, etc.) use entirely distinct, non-overlapping secret names, so this rollback cannot affect either of those providers or any other part of the app.

**Only once every box above is checked**: proceed to `PAYMENT_VERIFICATION_RUNBOOK.md` Section 4 (Sandbox Payment Checklist) and run the first full sandbox payment.
