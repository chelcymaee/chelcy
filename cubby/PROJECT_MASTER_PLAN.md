# CUBBY — PROJECT MASTER PLAN
> Single source of truth for all development, product decisions, and launch planning.
> Last updated: 2026-07-07

---

## DEVELOPMENT PHILOSOPHY

Every feature built must achieve at least one of:
- ✅ Improve trust
- ✅ Improve operations
- ✅ Improve scalability
- ✅ Improve user experience
- ✅ Improve revenue
- ✅ Improve launch readiness

If it does not, question whether it should exist.

---

## OVERALL COMPLETION

| Area | Completion | Notes |
|---|---|---|
| Core Platform | 82% | Auth, profiles, navigation solid. All screens implemented. |
| Marketplace | 80% | Booking + payment loop works. Discovery: integrated map + bottom sheet. |
| Operations | 35% | Admin screens exist but are disconnected. No operational workflow. |
| Trust & Safety | 20% | Verification is UI-only. No ToS. No claims process. |
| Communications | 60% | In-app messaging done. Transactional email V1 done (Resend). Push = partial. |
| Launch Readiness | 45% | Cannot yet be put in front of real users safely. |
| **Overall** | **~62%** | Solid MVP foundation. 6–8 focused weeks to beta. |

---

## 🚀 LAUNCH POLISH SPRINT

> Goal: make Cubby feel like a real product someone would happily download from the App Store.
> Strategy: reduce friction, improve perceived quality. No new features.

### Priority 1 — First-Time User Experience

| Item | Status | Notes |
|---|---|---|
| Location permission onboarding card | ✅ Done | Beautiful card before system dialog. "Enable Location" / "Not Now". Stored in AsyncStorage, shows once. |
| Integrated search + map screen | ✅ Done | Removed form-first flow. Map fills background, draggable bottom sheet for host list (peek/half/full). |
| Improved location modal | ✅ Done | Airport, cruise terminal, station, waterfront shortcuts. Recent searches saved to AsyncStorage. |
| Compact filter chips on map | ✅ Done | Date, drop-off time, pick-up time, bags accessible as chips floating above map. |
| Map marker selection state | ✅ Done | Selected pin enlarges and turns dark on native. Web already had CSS transitions. |

### Priority 2 — Search Experience

| Item | Status | Notes |
|---|---|---|
| Recent searches | ✅ Done | Last 4 locations saved in AsyncStorage, shown in location modal. |
| Popular destinations | ✅ Done | Cape Town Airport, Cruise Terminal, Station, V&A Waterfront, Camps Bay. |
| Airport / terminal shortcuts | ✅ Done | Included in landmarks section of location modal. |

### Priority 3 — Loading Experience

| Item | Status | Notes |
|---|---|---|
| Skeleton loaders | ✅ Done | Explore (bottom sheet), Bookings, Messages, Host Detail, Host Dashboard. Reusable `Skeleton.tsx` component with shimmer animation. |

### Priority 4 — Empty States

| Item | Status | Notes |
|---|---|---|
| Contextual empty state copy | ✅ Done (partial) | Filter-aware empty states already exist. No-results copy improved. |

### Priority 5 — Animations

| Item | Status | Notes |
|---|---|---|
| Bottom sheet drag animation | ✅ Done | Spring-based snap to peek/half/full positions. |
| Map marker selection | ✅ Done | Enlarges on select, dark background. |
| Favourite/heart button | ✅ Done | Spring scale bounce on tap (`host-detail.tsx`). |
| Notification bell shake | ✅ Done | Shake on new notification count increase (`NotificationBell.tsx`). |
| Booking confirmation entrance | ✅ Done | Fade + slide-up + icon scale-in on mount (`booking-confirmation.tsx`). |
| Review submitted entrance | ✅ Done | Fade + slide-up + emoji scale-in on success (`review.tsx`). |
| Message sent entrance | ✅ Done | Fade + slide-up + emoji scale-in on success (`support.tsx`). |
| Profile toast fade | ✅ Done | Fade-in/slide-down on appear, fade-out on dismiss (`profile.tsx`). |

### Priority 6 — Social Presence

| Item | Status | Notes |
|---|---|---|
| Follow Cubby section in profile | 🔲 Pending | Instagram, TikTok, website, support. |

### Priority 8 — Review Ecosystem ✅ Complete

| Item | Status | Notes |
|---|---|---|
| `traveller_reviews` table + RLS in schema.sql | ✅ Done | reviewer_id (auth.uid), host_id, traveller_id, 3 category ratings; INSERT policy |
| `recalculate_traveller_rating` trigger | ✅ Done | Auto-updates profiles.traveller_rating + traveller_review_count on insert/delete |
| Shared `src/lib/review-service.ts` | ✅ Done | `submitHostReview` + `submitTravellerReview`; both capture insert id for deep-link |
| Review submission fixed (23502 bug) | ✅ Done | Missing reviewer_id in insert; missing bookingId from route params (guard added) |
| `src/components/Stars.tsx` | ✅ Done | Shared star rating component reused across all review screens |
| `app/(traveller)/review-detail.tsx` | ✅ Done | Traveller views review received from host; security-checked |
| `app/(host)/review-detail.tsx` | ✅ Done | Host views review received from traveller; security-checked |
| `app/(traveller)/reviews.tsx` — Reviews Centre | ✅ Done | 3 tabs: About Me / I Wrote / Pending; summary card with category averages |
| `app/(host)/reviews.tsx` — Reviews Centre | ✅ Done | Same structure for host perspective |
| Profile rating snippet (traveller) | ✅ Done | ⭐ rating + count below name; "New member" if no reviews |
| Reviews entry in traveller profile menu | ✅ Done | General → ⭐ My Reviews |
| Reviews pill on host dashboard | ✅ Done | Tappable — navigates to host Reviews Centre |
| Notification deep-linking | ✅ Done | review_received → review-detail; review_request → review form with full params |

### Priority 7 — Design System Polish ✅ Done (Critical + Medium)

#### Medium Priority — completed

| Item | Status | Notes |
|---|---|---|
| `Banner` component — `src/components/Banner.tsx` | ✅ Done | Shared error/warning/success/info banner; semantic colors + borderRadius token |
| `Btn` adoption — auth + payment + confirmation + support + safety + partner-apply + host-profile | ✅ Done | 8 screens; standardised primary/secondary/destructive/ghost CTAs |
| `Banner` usage — login, signup, partner-apply error states | ✅ Done | Replaced inline `View+Text` error divs with `<Banner variant="error" />` |
| Semantic color tokens — bookings.tsx | ✅ Done | warningBg/warningText for pendingCard; successBg/successText for reviewedBadge; Colors.error for cancelBtn + cancel confirm |
| Semantic color tokens — requests.tsx | ✅ Done | successBg/successText for pinRow + reviewedBadge; Colors.error for declineConfirmBtn; `CardShadow` + `Radius.lg` for card |
| Semantic color tokens — verification.tsx STATUS_CONFIG | ✅ Done | Dynamic bg/color values → Colors.warningBg/successBg/errorBg |
| Semantic color tokens — host-profile, dashboard | ✅ Done | toast/errorBanner/nudgeCards → Colors tokens |
| Semantic color tokens — safety.tsx | ✅ Done | emergencyCard → Colors.errorBg |
| Intentionally left unchanged | — | `explore.tsx` (complex interactions), `profile.tsx` (modal confirm inline safe), `booking.tsx`/`host-detail.tsx` (already updated in Critical pass) |

#### Critical Priority — completed

| Item | Status | Notes |
|---|---|---|
| Full UI audit (typography, spacing, buttons, colours, cards, forms, shadows) | ✅ Done | 11 categories audited; grouped Critical / Medium / Minor |
| Design tokens — `src/constants/theme.ts` | ✅ Done | Radius (xs=8, sm=10, md=14, lg=18, xl=22), Spacing, CardShadow, ElevatedShadow |
| Semantic color tokens — `src/constants/colors.ts` | ✅ Done | Added error, errorBg, warningBg, warningText, infoBg, infoText, successBg, successText, trustBg. Fixed `error` from #FF5C5C to #DC2626 |
| Reusable `Btn` component — `src/components/Btn.tsx` | ✅ Done | primary / secondary / destructive / ghost; borderRadius 14, paddingVertical 15, fontSize 16 everywhere |
| Yellow payment CTA fix — `booking.tsx` | ✅ Done | `confirmBtn` was `Colors.accent` (#FFD93D yellow) → now `Colors.primary` (#FF5C5C red) |
| Hardcoded hex removal — `host-detail.tsx` | ✅ Done | All 20+ hardcoded colours replaced with Colors.* tokens |
| Padding / heading outlier — `verification.tsx` | ✅ Done | padding 24→20, heading 28→26 |
| sectionTitle standardised to fontSize 17, fontWeight '700' | ✅ Done | booking.tsx (was 15), host-detail.tsx (was 20), verification.tsx (was 20) |
| noSlotsBox, errorBanner, trustNote use semantic tokens | ✅ Done | booking.tsx inline colours replaced with Colors.warningBg, Colors.errorBg, Colors.trustBg |

---

## 🛡️ LEGAL & TRUST SPRINT — Sprint 1 ✅ Done & Approved

> Goal: close the legal/trust gaps blocking real users, without adding new features.
> Status: approved by founder. Merged into `main` via PR #38 (2026-07-07).

| Item | Status | Notes |
|---|---|---|
| Support contact details | ✅ Done | `support.tsx` phone + WhatsApp placeholders (`+27000000000`) replaced with real number `+27 77 460 9484` |
| Safety wording | ✅ Done | `safety@cubby.app` → `safety@mycubby.co.za` (domain consistency); R2,000 coverage claim removed platform-wide |
| R2,000 bag coverage claim removed | ✅ Done | Was a marketing claim with no claims mechanism (flagged as launch blocker). Removed from `onboarding.tsx`, `booking-confirmation.tsx`, `host-detail.tsx`, `support.tsx` FAQ. Replaced with accurate trust copy ("ID-verified hosts" / "booked securely through Cubby"). No claims process was built — if coverage is reintroduced later it needs a real mechanism first. |
| Terms of Service | ✅ Done | New `app/(traveller)/terms.tsx` — 14 sections covering platform role, bookings/payments, cancellations, verification, luggage coverage disclaimer, liability, governing law (South Africa). Uses "Cubby" as a trading name with `[COMPANY NAME]` placeholder (company not yet registered). **Not lawyer-reviewed** — review before public launch. |
| Privacy Policy | ✅ Done | New `app/(traveller)/privacy.tsx` — POPIA-oriented: data collected, third parties (Supabase, PayFast, Resend), retention, user rights, security, contact. **Not lawyer-reviewed** — review before public launch. |
| Screens wired up | ✅ Done | Registered in `(traveller)/_layout.tsx` (`href: null`, non-tab); linked from Profile → Information section; signup footer text ("Terms of Service" / "Privacy Policy") is now tappable and navigates to the new screens. No mandatory acceptance checkbox/gate added — that would be a new consent-flow feature, deferred. |

**Not done in Sprint 1 (explicitly deferred per instruction):** Forgot Password, Email verification re-enable, Admin PIN fix — these were Sprint 2 (below).

---

## 🔧 DEPENDENCY REPAIR — SDK 56 Alignment ✅ Done

> Discovered while trying to run the app locally to review Sprint 1's screens. Not a feature change — `package.json` had been self-inconsistent since the very first commit that ever created it on this branch's lineage (`cbfcdba`, 24 Jun 2026): `expo` was pinned to SDK 56 but `react` (18.3.1), `react-native` (0.79.2), `expo-router` (~4.0.22), and several `expo-*` packages were left on old, unrelated versions — a self-inconsistent file from day one, not an interrupted upgrade. `origin/main`'s original scaffold (`8daacf2`) had the correct, internally-consistent SDK 56 set (React 19.2.3, React Native 0.85.3, expo-router ^56.2.11) the whole time; this branch's lineage never had it.

**Fix:** realigned `package.json` to match `origin/main`'s versions for every shared package, bumped the branch-only `expo-*` additions (`expo-font`, `expo-splash-screen`, `expo-notifications`) to their SDK-56-compatible releases, removed the redundant top-level `@expo/router-server` pin (not imported anywhere in app code, not present on `main`, and the direct cause of the peer-dependency conflict), and added `react-dom` + `react-native-web` (previously absent entirely, blocking web support). Renamed two now-invalid `StyleSheet.absoluteFillObject` references to `StyleSheet.absoluteFill` (RN API rename between versions) — the only code change, purely mechanical.

**Verified:** `npm install` completes clean (no `ERESOLVE`), `tsc --noEmit` shows zero SDK-related errors (pre-existing unrelated app-level type issues left untouched, out of scope), and `expo start --web` now renders the real app — onboarding, signup, terms, privacy, safety, support all confirmed loading with zero console errors, replacing the previous blank white screen crash (`Cannot read properties of undefined (reading 'S')` — a React 18/19 version mismatch).

---

## 🔐 ACCOUNT ACCESS & SECURITY SPRINT — Sprint 2 ✅ Done & Approved

> Goal: close the remaining private-beta-blocking auth/security gaps. No new features.
> Status: approved by founder, verified working (password reset + admin PIN tested manually). Merged into `main` via PR #38 (2026-07-07).

| Item | Status | Notes |
|---|---|---|
| Forgot Password flow | ✅ Done | New `app/(auth)/forgot-password.tsx` (email → `supabase.auth.resetPasswordForEmail`) and `app/(auth)/reset-password.tsx` (new password form). "Forgot password?" link added to `login.tsx`. Reuses the existing deep-link pattern in `app/_layout.tsx` (previously only handled PayFast returns) to catch `cubby://reset-password`, exchange the recovery code for a session, then route into the reset screen. `reset-password.tsx` shows a "Link expired" state with a "Request new link" button if opened without a valid recovery session (direct visit, expired/reused link). |
| PKCE flow enabled | ✅ Done | `src/lib/supabase.ts` — added `flowType: 'pkce'` so the recovery link arrives as a plain `?code=` query param (parseable via the existing `Linking.parse` pattern) instead of a URL fragment, which custom-scheme deep links can't reliably carry. |
| Email verification flow | ✅ Done (mostly a config step) | Audited `signup.tsx` / `login.tsx` — the code already correctly branches on whether a session comes back from `signUp` (confirmation on vs off) and shows a "check your email" message. Added a friendlier message for Supabase's "Email not confirmed" login error. **The actual re-enable is a Supabase Dashboard toggle** (Auth → Providers → Email → Confirm email) — see Manual Tasks below. |
| Admin PIN insecure fallback | ✅ Done | `app/(admin)/login.tsx` — removed `?? '1234'`. Missing `EXPO_PUBLIC_ADMIN_PIN` now hits the already-existing "Admin PIN not configured" block instead of silently granting access. Verified: entering `1234` with no env var set now correctly blocks with that message. |
| ADMIN_SECRET fallback (found during audit, not originally scoped) | ✅ Done | Audit surfaced the identical hardcoded-fallback pattern (`'cubby-admin-secret-2025'`) in 13 more places: `host-payouts.tsx`, `users.tsx`, `manage-hosts.tsx`, `verifications.tsx` (hardcoded, no env var at all), `src/lib/review-service.ts` (same), and 6 edge functions (`send-review-reminders`, `send-email`, `send-push`, `payment-webhook`, `complete-booking`, `payfast-itn`). Founder approved including this in Sprint 2. Client-side + outgoing edge-function usages now default to `''` (fails closed at the receiving end). Incoming-request-verifying edge functions (`send-review-reminders`, `send-email`, `send-push`) now use the same `!ADMIN_SECRET || provided !== ADMIN_SECRET` guard already used correctly in `admin-bank-details`/`admin-hosts`/`admin-users` — closes a real bug where an attacker sending an empty `x-admin-secret` header could have matched an unset (empty) expected secret. |

**Verified:** `tsc --noEmit` — zero new errors. Playwright headless checks confirm `login.tsx` (shows Forgot password link), `forgot-password.tsx`, `reset-password.tsx` (correct "Link expired" state with no session), and `admin/login.tsx` (blocks `1234` with no PIN configured) all render with zero console errors.

**Manual step still required (not code):** re-enable "Confirm email" in Supabase Dashboard → Auth → Providers → Email.

---

## 🚧 PRIVATE BETA BLOCKERS SPRINT — Sprint 3 ✅ Done (awaiting review)

> Goal: remove the remaining critical Private Beta blockers. No new features, no Bag Runners work.
> Status: implemented, founder-verified live. Merged into `main` via PR #38 (2026-07-07).

| Item | Status | Notes |
|---|---|---|
| Payout bug | ✅ Fixed | Audit found the actual bug was different from what was documented: `complete-booking` never queries bank details at all (that code path was removed in the Peach→PayFast migration) — the real, live bug was `app/(host)/bank-details.tsx` writing to the orphaned `bank_details` table (`user_id`-keyed) while the admin payout dashboard exclusively reads `host_bank_details` (`host_id`-keyed). A host filling in their own bank details had zero chance of actually being paid. Fixed the screen to resolve `host_id` via `hosts.assigned_user_id`/`.user_id` (matching every other host-facing screen) and read/write `host_bank_details` directly, using the exact field names the admin dashboard already expects (verified by cross-checking `host-payouts.tsx`). Also fixed the `host_bank_details` RLS policy in `schema.sql`, which only matched `user_id` — admin-assigned hosts (`assigned_user_id`) would have been blocked by RLS even after the table fix. **SQL migration required on the live database** — see `schema.sql` "Fix 3" block / Manual Tasks. |
| Booking notifications | ✅ Done | Audited first: "confirmed" and "declined" were already correctly wired (`app/(host)/requests.tsx`), contrary to some stale docs suggesting otherwise. "Cancelled by traveller" was genuinely missing — added to `app/(traveller)/bookings.tsx`, notifying the host (resolved via `assigned_user_id`/`user_id`) using the existing `booking_cancelled` type and `sendNotification` helper, same pattern as the other two. |
| New message notifications | ✅ Confirmed working | Audited `notify-new-message` edge function — fully correct (resolves recipient via `assigned_user_id`, inserts the in-app row itself, sends the Expo push). Assumed the Database Webhook needed wiring per stale master plan notes — checked Supabase Dashboard → Integrations → Database Webhooks and found it was **already fully configured** (table `messages`, event `Insert`, type Supabase Edge Functions, pointed at `notify-new-message`, auth header auto-populated). Founder tested live: sent a message between a traveller and host account, confirmed an edge function log entry and a delivered notification. No code or config change was needed — another case of the docs being stale, not the app. |
| MOCK_REVIEWS removed | ✅ Done | `app/(traveller)/host-detail.tsx` — removed the `MOCK_REVIEWS` import/merge entirely. Hosts with zero reviews now show an honest "No reviews yet — Be the first to leave a review after your stay." empty state instead of fabricated testimonials. |
| Admin Partner Applications / Support Messages — **confirmed broken, now fixed** | ✅ Fixed | Founder ran live SQL diagnostics in the Supabase SQL Editor (`SET ROLE anon` + count queries, then `pg_policies`) and confirmed: `partner_applications` has an `INSERT`-only policy (no `SELECT`/`UPDATE` at all); `support_messages` has a `SELECT` policy that only lets a user read their *own* row via `auth.uid() = user_id` — useless for the PIN-based admin panel, which has no Supabase Auth session and hits the table as `anon`. Both admin screens were confirmed genuinely broken (RLS silently returned 0 rows even with 6 real support messages present). Fix: built two new service-role edge functions, `admin-partner-applications` and `admin-support-messages`, mirroring the existing `admin-bank-details`/`admin-hosts`/`admin-users` pattern exactly — `ADMIN_SECRET`-gated, service-role key used only inside the function, never exposed to the client. Updated `partner-applications.tsx` and `support-messages.tsx` to call these functions instead of querying the tables directly. **No RLS policy was weakened** — public anon/authenticated access to these tables is unchanged; admin access is now routed through the same secure pattern used everywhere else in the admin panel. Requires deploying both new functions and setting `ADMIN_SECRET` (already required from Sprint 2) — see Manual Tasks. |

**Verified:** `tsc --noEmit` — zero new errors. Playwright headless checks confirm `bookings.tsx`, `bank-details.tsx`, `partner-applications.tsx`, and `support-messages.tsx` all render with zero console errors — the two admin screens correctly show their empty state rather than crashing when the new (undeployed-from-this-sandbox) edge functions are unreachable. Full live behavior needs testing after deployment — see Manual Testing Steps.

**Sprint 3 is now fully complete** — all five items done, including the one that started as an open audit question.

---

## 🧹 PRIVATE BETA POLISH — Sprint 4 ✅ Done

> Goal: audit and fix genuine production-readiness issues (loading states, dead buttons, mock data, error handling) without redesigning or adding features. PR #38 merged first; this work is on `claude/private-beta-polish`.

| Item | Status | Notes |
|---|---|---|
| Global error boundary | ✅ Done | New `src/components/ErrorBoundary.tsx` (class component, `getDerivedStateFromError`/`componentDidCatch`) wraps the entire app in `app/_layout.tsx`, outside `AuthProvider`, so a crash anywhere shows a "Something went wrong" screen with **Try again** (resets and re-renders) and **Back to home** buttons instead of a blank/frozen app. New `src/lib/error-logging.ts` adds a global handler for errors React's render boundary can't catch (async code, event handlers, unhandled promise rejections) — logs them with a `[GlobalError]` tag without changing crash behavior. **Verified live**: forced a real render crash on the Explore screen, confirmed the boundary caught it with zero blank screen and zero leaked console error, confirmed "Try again" correctly re-renders. |
| Fake Cubby Runners removed | ✅ Done | Found this was two separate bugs, not one: (1) `app/(traveller)/runners.tsx` had 4 fully fabricated profiles (names, ratings, availability) with a "Book" button that only revealed via alert it wasn't real — replaced with an honest "Bag Runners is coming soon" empty state, all fake data and dead code removed. (2) `app/(traveller)/explore.tsx`'s "🚗 Cubby Runners near you" section mapped over a *different*, always-empty `MOCK_RUNNERS` array from `src/lib/mock-data.ts` — not fake profiles, but a dead section header+subtitle promising a feature with zero content beneath it, forever, on the main Explore screen. Removed that section and its now-unused `RunnerCard` component/styles entirely. |
| Email confirmation flow — verified, one real bug found and fixed | ✅ Code verified + fixed | Re-confirmed `signup.tsx`/`login.tsx` correctly branch on both confirmed/unconfirmed states (from Sprint 2). Found a genuine bug while re-checking: the "check your email" message used a bare `alert(...)` call with no `Alert` import — `alert` is a browser-only global and does not exist in the React Native runtime, so this would throw `ReferenceError: Can't find variable: alert` on native iOS/Android the moment a user signs up with email confirmation enabled (now caught by the new error boundary instead of a blank screen, but still broke the intended flow). Fixed by using React Native's `Alert.alert(...)` instead. **Exact Supabase Dashboard steps to actually enable this** (still not done — code is ready, feature is not live): Dashboard → Authentication → Sign In / Providers → Email → toggle **"Confirm email"** on. No other configuration needed; the app already handles both states. |
| Orphaned `bank_details` table — audited, not deleted | ✅ Audited | Searched the entire codebase (app, src, edge functions, `schema.sql`) for every reference. Confirmed: **zero screens read or write it** (the only screen that ever did, `bank-details.tsx`, was already fixed in Sprint 3 to use `host_bank_details`); the only remaining reference is a cleanup line in `supabase/functions/delete-user-account/index.ts` that deletes a user's row from it on account deletion; no other table has a foreign key into it. **Recommendation: safe to drop**, but two things first — (1) run `SELECT count(*) FROM bank_details;` to check for real historical data that would need migrating into `host_bank_details` before dropping, since Sprint 3's fix means anything already in this table is currently invisible to admin and would be permanently lost otherwise; (2) if dropped, remove the now-dead cleanup line in `delete-user-account/index.ts` at the same time, or it will start erroring on every account deletion. **Not deleted automatically per instruction** — this needs a founder decision. |
| First-time host onboarding checklist | ✅ Done — **Option B: Admin-gated host onboarding** | Discovered an architectural contradiction while building this (see Decisions & Context Log): the self-serve `host-profile.tsx` save was `.update(...)`-only (never `.insert()`), so a self-registered host with no `hosts` row would "successfully" save nothing, and `dashboard.tsx` showed a real `DEMO_STATS`/`DEMO_BOOKINGS` demo-data leak (fake R1,240 earnings + fake "Sarah T."/"James M." bookings) rendered *simultaneously* with a "Host profile not found" error banner. Founder chose **Option B — keep the admin-gated model** (matches the existing `assigned_user_id` design intent already documented below) rather than building self-serve creation. Implemented: (1) new shared `src/components/HostOnboardingChecklist.tsx` — a lightweight 5-step status card (Apply → Await approval → Complete verification → Add bank details → Listing goes live), no fake data, step 2 highlighted until `profiles.is_host_approved` is true; (2) `app/(host)/dashboard.tsx` — when no `hosts` row is assigned to the user, it now shows this checklist **instead of** `DEMO_STATS`/`DEMO_BOOKINGS` (previously both rendered at once — that leak is fixed); (3) `app/(host)/host-profile.tsx` — when no `hosts` row exists, shows the same checklist instead of an edit form that could never actually save (fixes the silent-no-op bug without needing to add an insert path, since self-serve creation is intentionally not supported under Option B); (4) `app/(traveller)/profile.tsx` — **found and fixed the actual entry-point gap**: `app/(host)/_layout.tsx` already redirects any signed-in host/both-role user with `is_host_approved = false` straight to `/(traveller)/profile` (it always has — self-serve users could never actually reach the host tabs), but that landing screen showed a generic "Become a Cubby Host" CTA identical to what a plain traveller sees, with no acknowledgement they'd already signed up wanting to host. Profile now reads the user's own `role` and shows the same `HostOnboardingChecklist` (not-yet-approved state) instead of the CTA whenever `role` is `host`/`both` and `is_host_approved` is false; (5) `app/(auth)/signup.tsx` — host/both signups now route to `/(traveller)/profile` (where they immediately see the pending checklist) instead of `/(host)/bank-details`, which used to send a brand-new, unapproved signup straight into a bank-details form for a listing that doesn't exist yet. Once an admin actually approves the user (`users.tsx`) and assigns a `hosts` row to them (`create-host.tsx`/`manage-hosts.tsx`), `assigned_user_id` resolves normally and the dashboard/host-profile/checklist screens all revert to their existing, unmodified behavior — no changes were needed there since that path already worked correctly. |

**Verified:** `tsc --noEmit` — zero new errors from any Sprint 4 change (same pre-existing unrelated errors as before, none in any file touched this sprint). Playwright headless test confirms the error boundary and both Runners fixes work live. The new `HostOnboardingChecklist` was first visually verified in this sandbox (forced local component state, since this sandbox cannot reach the real Supabase project). **Founder then verified the full live, Supabase-backed path end-to-end on 2026-07-07**, running the exact 4-step checklist below against the real project: fresh signup (`chelcymae1+testhost@gmail.com`, role Host) landed cleanly on the "Host application pending" checklist with zero fake data; admin-approved via Users → "Host access approved" flipped the same screen to "You're approved!" with step 3 highlighted; the account correctly passed the `(host)/_layout.tsx` `is_host_approved` gate into the real host tabs while still showing the pending checklist (not `DEMO_STATS`) since no `hosts` row existed yet; after admin-assigning a listing, the dashboard/profile reverted to normal real (zero-state) behavior. All steps passed as designed. This sprint is confirmed fully working, not just implemented.

**Sprint 4 is now fully complete** — all five priorities done.

#### Testing steps for the Option B host onboarding change

No new Supabase config or SQL is required — this reuses the existing `profiles.is_host_approved` column and the existing admin approve/assign screens. To verify live:

1. **Fresh unapproved host signup shows the pending checklist, not a broken dashboard:**
   - Sign up a brand-new account, choosing role "Host" or "Both".
   - Expect: lands on the Account/Profile screen, and instead of the red "Become a Cubby Host" banner, sees a white card titled **"Host application pending"** with a 5-step checklist (Apply ✓ → Await approval [highlighted] → Complete verification → Add bank details → Listing goes live). No fake earnings or bookings anywhere.
   - Confirm in Supabase: `select role, is_host_approved from profiles where email = '<test email>';` → `role` is `host`/`both`, `is_host_approved` is `false`.
2. **Admin approves the user (but hasn't assigned a listing yet):**
   - In the admin panel → Users, find the test account, tap "Host access approved" (sets `is_host_approved = true`).
   - Reload the traveller Profile screen for that user: checklist should now say **"You're approved!"** with step 2 (Await approval) checked and step 3 (Complete verification) highlighted as current.
   - The user still cannot reach `/(host)/dashboard` navigation items from this screen because no `hosts` row exists yet — this is expected; `(host)/_layout.tsx`'s own gate only checks `is_host_approved`, so if they *do* navigate directly to a host tab URL, `dashboard.tsx`/`host-profile.tsx` will now show the same pending checklist (not fake stats, not a silently-broken save) since there's still no `hosts` row assigned.
3. **Admin creates and assigns a host listing:**
   - In admin → Create Host, create a listing and assign it to the test user's account (`assigned_user_id`), or use Manage Hosts to assign an existing listing.
   - Reload the app as that user: Profile screen now shows the normal "Hosting" section (Switch to Host Dashboard / My host listing / Bank details) instead of the checklist. Dashboard shows real (zero-state, not fake) stats. Host Profile screen shows the real edit form and actually saves.
4. **Regression check:** an existing, already-working host (has an assigned `hosts` row) should see zero behavior change on Dashboard or Host Profile — confirm their real stats and listing still load normally.

This was implemented and type-checked (`tsc --noEmit`) in this sandbox, and the new `HostOnboardingChecklist` component was visually verified with forced local state (screenshotted, both copy variants), but the real Supabase-backed data path (steps 1–3 above) could not be exercised end-to-end here because this sandbox cannot reach the live Supabase project — please run through the 4 steps above for final sign-off.

---

## ✅ COMPLETED FEATURES

### Traveller
- [x] Welcome / splash screen with animated pin-drop logo
- [x] 4-slide onboarding carousel (async storage completion flag)
- [x] Email + password signup with role selection (traveller / host / both / runner)
- [x] Email + password login with role-based redirect
- [x] Supabase profile auto-creation on signup (DB trigger)
- [x] Search screen: location, date, drop-off/pick-up time slots, bag count
- [x] Day-of-week, time window, and location keyword filter logic
- [x] Host detail view: photos, hours, rating, reviews, business type, bag selector
- [x] Save / unsave host (heart button → `saved_spots` table)
- [x] Booking creation with price breakdown (subtotal + 10% platform fee)
- [x] Peach Payments hosted checkout integration (full flow)
- [x] Deep link return from payment (`cubby://payment-result`)
- [x] Booking confirmation screen with PIN code display
- [x] Bookings screen: upcoming / past tabs, status badges, PIN display
- [x] Cancel booking with confirmation modal
- [x] Message host button from confirmed bookings
- [x] Leave review button from completed bookings
- [x] Review system: 5-star, 6 quick tags, free-text comment, duplicate prevention
- [x] Auto-recalculate host rating/review_count on review insert (DB trigger)
- [x] Traveller → host messaging (conversations + messages tables, real-time)
- [x] Conversation list with unread counts and last message preview
- [x] Notification Centre: grouped feed (Today/Yesterday/Earlier), 18 types, mark as read
- [x] Notification bell with live unread badge (all main screens)
- [x] Notification Preferences screen (12 toggles, saved to DB)
- [x] Profile screen: avatar upload to Supabase Storage, edit name/phone
- [x] Partner application form (→ `partner_applications` table)
- [x] Support screen: FAQ accordion, support form (→ `support_messages` table)
- [x] Payment details screen (security info, no card storage)
- [x] Verification screen UI (2-step: upload ID + selfie)
- [x] Bag runners screen (UI only — mock data, see technical debt)
- [x] Delete account (calls `delete-user-account` edge function, cascading)
- [x] Sign out with confirmation

### Host
- [x] Host dashboard: today's bookings, monthly earnings, 7-day chart, stats
- [x] Host listing management: name, bio, pricing, hours, days, photos, active toggle
- [x] Photo upload to Supabase Storage (`host-photos/` bucket)
- [x] Host booking requests: pending/confirmed/active/completed/cancelled views
- [x] Accept / decline / complete booking actions
- [x] View traveller profile from booking (secure — verifies host owns booking)
- [x] Host → traveller messaging (same conversations/messages tables)
- [x] Host messages list with unread counts
- [x] Host notification centre (same feed, host-specific deep links)
- [x] Bank details management (→ `host_bank_details` table)
- [x] Switch to traveller view button
- [x] `assigned_user_id` pattern (admin assigns hosts to user accounts)

### Admin
- [x] PIN-based admin login (4-digit, rate limited, 8h session TTL)
- [x] Admin session management with lockout (5 attempts → 15-min lockout)
- [x] Admin dashboard: stats cards (hosts, active bookings, revenue, pending)
- [x] Admin dashboard: navigation cards to all sub-sections
- [x] Manage hosts: list, active toggle, assign user by email, delete
- [x] Create host: full form (name, bio, location, type, pricing, hours, days)
- [x] Host payouts: view bank details, edit, add via `admin-bank-details` edge function
- [x] All bookings: list with tabs (all / active / completed)
- [x] Revenue screen: total + 70/30 split breakdown per completed booking

### Backend
- [x] Supabase PostgreSQL schema (all tables defined)
- [x] RLS policies on all tables
- [x] `recalculate_host_rating` trigger on reviews insert/delete
- [x] `notify_new_message` DB trigger (auto-creates notification row on message insert)
- [x] `notifications` table with 18 supported types
- [x] `push_tokens` table
- [x] `notification_preferences` table
- [x] `conversations` and `messages` tables with real-time subscriptions

### Edge Functions
- [x] `create-payment` — Peach Payments checkout session creation
- [x] `payment-page` — hosted HTML payment form
- [x] `payment-result` — payment confirmation + deep link redirect
- [x] `payment-webhook` — server-side webhook handler (HMAC validation)
- [x] `complete-booking` — 70/30 payout via Peach Payments API
- [x] `admin-bank-details` — admin-only bank details CRUD (x-admin-secret auth)
- [x] `delete-user-account` — full cascading account deletion (GDPR)
- [x] `notify-new-message` — Expo push notification delivery, DB webhook wired and confirmed working live (Sprint 3)

### Infrastructure
- [x] Expo SDK 56, React Native 0.79.2, TypeScript
- [x] Expo Router (file-based routing)
- [x] Supabase client with AsyncStorage session persistence
- [x] `isSupabaseConfigured` flag for demo/offline fallback
- [x] `AuthProvider` context with auth state subscription
- [x] `NotificationBell` reusable component
- [x] `DatePickerModal` component
- [x] `HostMap.tsx` / `HostMap.web.tsx` (platform-specific)
- [x] Color constants design system (`Colors.ts`)
- [x] TypeScript interfaces (`types/index.ts`)
- [x] Mock data for demo mode (`mock-data.ts`)
- [x] Supabase Storage: `avatars` bucket, `host-photos` bucket

### Payments (PayFast — Phase 5)
- [x] Provider-agnostic booking columns: `payment_provider`, `payment_reference`, `paid_at`, `failure_reason`
- [x] `pending_payment` booking status — booking exists but payment not yet received
- [x] `payfast-create` edge function — validates booking, marks provider, returns checkout URL
- [x] `payfast-page` edge function — GET endpoint, generates signed PayFast form, auto-submits (no secrets exposed to client)
- [x] `payfast-itn` edge function — ITN webhook handler with: signature validation, amount validation, merchant ID check, production IP validation, server-side validation, idempotent DB update
- [x] `payfast-return` edge function — return URL handler, checks DB status, deep-links back to app
- [x] `payfast-cancel` edge function — cancel URL handler, marks booking cancelled, deep-links back
- [x] 70/30 split calculation (host/Cubby) recorded on completion
- [x] `payout_status: 'pending_manual'` — host payout tracked for manual EFT from Cubby's PayFast settlement
- [x] PayFast sandbox supported (PAYFAST_SANDBOX=true is the default for safety)
- [x] Graceful fallback when PayFast env vars not configured
- [x] `payment-details.tsx` updated: Peach → PayFast branding
- [x] All 5 functions deployed to Supabase with `--no-verify-jwt` on public endpoints
- [x] Sandbox credentials set in Supabase Secrets (`PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_SANDBOX=true`)
- [x] `payfast-page` confirmed generating correct signed form (manually verified)

**Status: CODE LAYER COMPLETE — blocked on external setup**
- [ ] ⏸ PayFast merchant account setup — **BLOCKED: account not yet created**
- [ ] ⏸ Sandbox end-to-end payment test — **PENDING: requires merchant account**
- [ ] ⏸ Live payment test — **PENDING: requires merchant account + production credentials**
- [ ] ⏸ SQL migration (`payment_provider`, `payment_reference`, `paid_at`, `failure_reason` columns) — run when ready to test

> Do not continue payment work until PayFast account setup is confirmed.

### Payments (Peach — deprecated)
- [~] `create-payment`, `payment-page`, `payment-result`, `payment-webhook` — kept for reference, no longer called by the app
- [~] `complete-booking` — Peach payout API removed; booking now marked `payout_status: 'pending_manual'`

---

## 🟡 IN PROGRESS / PARTIALLY COMPLETE

### Operations Centre (Phase 1 — CURRENT PRIORITY)
Admin dashboard redesign into a unified operations hub. Currently the admin screens exist but are disconnected — no consistent navigation, no operational workflow for running the business day-to-day.
- Current screens: login, dashboard, manage-hosts, create-host, host-payouts, all-bookings, revenue
- Missing screens: partner application review, support message viewer, verification review, activity feed, traveller management
- See Phase 1 spec below.

### Push Notifications ✅ Phase 3 Item 2 Done
- `notify-new-message` Edge Function built + now inserts in-app notification row
- `send-push` Edge Function built (generic, called from all flows)
- `notification-service.ts` client lib: checks prefs → inserts in-app → fires push
- Booking confirmed/declined notifications wired in host/requests.tsx
- Payment confirmed notification wired in payment-webhook
- Verification approve/reject push wired in admin/verifications.tsx
- Reminder notifications (drop-off/pick-up) still TODO (requires scheduled job)

### Verification System
- Full UI flow exists (intro → upload ID → selfie → success screen)
- Backend: no `verifications` table, no submission to Supabase, photos go nowhere
- No admin review queue
- `is_verified` flag on profiles is never set via product flow (only manual SQL)

### Search & Discovery
- Core filtering works (date, time, bags, day-of-week)
- Results returned in DB insertion order (no ranking)
- GPS detection fills the field but coordinate matching does not work (keyword-only)
- Map view: native only, web map broken (no Google Maps API key configured)

### Support System
- Form captures messages to `support_messages` table
- No email delivery — nobody is alerted when a support message arrives
- Phone number is placeholder (`+27000000000`)
- WhatsApp number is generic placeholder
- No admin screen to view / respond to / close support messages

### Partner Application Flow
- Traveller can submit application → saved to `partner_applications` table
- No admin screen to review, approve, or reject applications
- No email notification to applicant on approval/rejection
- Approval currently requires manual SQL: `UPDATE profiles SET is_host_approved = true`

### Cancellation
- Cancel button exists, sets status to `cancelled`
- No cancellation policy enforcement (time window, partial refund)
- No notification to host when traveller cancels
- No notification to traveller when host declines

### Host Onboarding
- After approval, host can access dashboard
- No guided setup flow ("Add listing → Add bank details → Go live")
- Host lands on empty dashboard with no next-step instructions

### Maps ✅ Phase 4 Item 1 Done
- Native: upgraded `HostMap.tsx` — custom price-bubble pins, real user location dot, PROVIDER_GOOGLE on Android, distance + walk time in callout
- Web: `HostMap.web.tsx` upgraded to Google Maps JavaScript API — real markers, InfoWindow with distance, user location blue dot
- `src/lib/location.ts` — reusable haversine, formatDistance, walkMinutes, getUserLocation
- Android Maps API key placeholder in `app.json` (user must replace with real key)
- Map toggle now visible on web too
- "CLOSEST" badge now based on real calculated distance
- "X m away" / "X min walk" labels on host cards when location is available
- No map on host detail page yet (future)

---

## 🔴 NOT STARTED

### Critical (blockers for any real users)
- [x] Terms of Service document written + `terms.tsx` screen (linked from signup + profile) — see Sprint 1 below. Affirmative acceptance checkbox/gate at signup still not built.
- [x] Privacy Policy document written + `privacy.tsx` screen (linked from signup + profile) — see Sprint 1 below.
- [x] Password reset / forgot password flow — `forgot-password.tsx` + `reset-password.tsx` screens, PKCE deep-link recovery. See Sprint 2 below.
- [ ] Email confirmation re-enabled in Supabase (disabled for dev, must re-enable before launch) — app code already handles both states correctly; **remaining step is a manual Supabase Dashboard toggle**, see Sprint 2 below.
- [x] Admin PIN default must error if env var not set — fixed, see Sprint 2 below. Same fix also applied to the broader `ADMIN_SECRET` fallback (13 locations, see Sprint 2).
- [x] Verification backend (`verifications` table SQL provided, admin review queue built, `is_verified` updated on approve/reject)
- [x] Dead-end screens: `safety.tsx`, `language.tsx`, `payment-success.tsx`, `payment-failed.tsx` — all fully implemented

### Booking Events — Notifications
- [x] Notification when booking is confirmed (in-app + push via host/requests.tsx)
- [x] Notification when booking is declined (in-app + push via host/requests.tsx)
- [x] Notification when payment succeeds (in-app + push via payment-webhook)
- [ ] Notification when booking is cancelled by traveller (not yet wired)
- [ ] Drop-off reminder (1 hour before — requires scheduled Edge Function)
- [ ] Pick-up reminder (1 hour before — requires scheduled Edge Function)

### Email Notifications (zero currently)
- [ ] Booking confirmation email (traveller + host)
- [ ] Booking declined email
- [ ] Password reset email (Supabase handles if SMTP configured)
- [ ] Support message acknowledgement email
- [ ] Partner application received / approved / rejected email
- [ ] Verification approved / rejected email

### Admin Operations Centre (Phase 1)
- [x] Redesigned dashboard as unified operations hub (Needs Attention + Snapshot + sections + Activity Feed)
- [x] Partner application review screen (approve / reject)
- [x] Support messages viewer (view / resolve / reopen)
- [x] Verification review queue (view ID + selfie, approve/reject)
- [x] Recent activity feed (merged timeline on dashboard)
- [ ] Email notification to applicant on approval/rejection (Phase 3)
- [ ] Traveller management screen (view travellers, bookings, flag/ban)
- [ ] System health indicators
- [ ] Consistent admin navigation sidebar (future role-based design)

### Trust & Safety
- [x] R2,000 bag coverage claim — removed platform-wide (Sprint 1). Was a marketing claim with no claims mechanism; stripped from onboarding, booking-confirmation, host-detail, and support FAQ rather than building a claims process. Can be reintroduced later alongside a real coverage/claims process.
- [ ] Dispute / chargeback handling screen
- [ ] Host / traveller reporting system ("Report a problem with this booking")
- [ ] Content moderation for reviews

### Host Features
- [ ] Payout history screen (host can see what was paid and when)
- [ ] Listing analytics (views, bookings, conversion rate)
- [ ] Availability calendar (visual calendar showing bookings)
- [ ] Response rate tracking (update when accepting/declining, display to travellers)
- [ ] Host performance notifications (low rating, inactive listing, etc.)

### Traveller Features
- [ ] Search ranking (by rating, reviews, distance, response rate)
- [ ] Real GPS radius search (PostGIS or `earth_distance` — currently keyword matching)
- [ ] Search history / saved searches
- [ ] Booking modification (change time without cancelling)
- [ ] Receipt / invoice download
- [ ] Booking reminders (before drop-off, before pick-up)

### Marketplace Health
- [ ] Host response rate calculated from actual accept/decline actions
- [ ] Read receipts in messaging (column exists, never set)
- [ ] Instant book vs. request-to-book toggle per host

### Runners System
- [ ] Runners table in Supabase (currently 4 hardcoded mock runners)
- [ ] Runner booking flow (currently nothing happens when "Book" is tapped)
- [ ] Runner availability, delivery radius, capacity system
- [ ] Runner dashboard

### Analytics & Observability
- [ ] Event tracking (Mixpanel, PostHog, or Supabase analytics)
- [ ] Funnel analysis (search → host detail → booking → payment)
- [ ] Error logging (Sentry or similar)

### Infrastructure
- [ ] CI/CD pipeline
- [ ] Automated tests (unit, integration, E2E — currently 0%)
- [ ] Staging environment separate from production
- [ ] Environment variable management (.env.local, not hardcoded)

---

## ⚠️ TECHNICAL DEBT

### Critical (fix before beta)

~~**Duplicate bank details tables — payout bug**~~ — RESOLVED (Sprint 3)
The real bug was narrower than previously described: `complete-booking` never actually queried bank details at all (that code path was removed in the Peach→PayFast migration). The actual live bug was `app/(host)/bank-details.tsx` — the host self-service screen — writing to the orphaned `bank_details` table (keyed by `user_id`), while the admin payout dashboard reads exclusively from `host_bank_details` (keyed by `host_id`). A host filling in their own bank details believed they were on file for payout, but admin could never see them. Fixed: `bank-details.tsx` now resolves the host's `host_id` (via `hosts.assigned_user_id` or `.user_id`, matching every other host-facing screen) and reads/writes `host_bank_details` directly, matching the exact field names (`bank_name`, `account_holder`, `account_number`, `account_type`, `branch_code`) the admin dashboard already expects. Also fixed the `host_bank_details` RLS policy, which only matched `hosts.user_id` — every other host screen resolves ownership via `assigned_user_id` too, so admin-assigned hosts would have been silently blocked by RLS from saving their own bank details even with the table fixed. SQL migration required for existing databases — see Sprint 3 section and Manual Tasks below. The orphaned `bank_details` table itself was left in place (not dropped) — out of scope, no longer written to by any active screen.

~~**Admin PIN defaults to '1234'**~~ — RESOLVED (Sprint 2)
`EXPO_PUBLIC_ADMIN_PIN` no longer falls back to `'1234'`. Missing env var now blocks access with an explicit "Admin PIN not configured" message instead of granting entry.

~~**ADMIN_SECRET hardcoded fallback**~~ — RESOLVED (Sprint 2)
The same insecure-fallback pattern (`'cubby-admin-secret-2025'`) existed in 13 places beyond the PIN — `host-payouts.tsx`, `users.tsx`, `manage-hosts.tsx`, `verifications.tsx`, `review-service.ts`, and 6 Supabase edge functions (two of which had it hardcoded with no env var at all). All now fail closed if `ADMIN_SECRET` / `EXPO_PUBLIC_ADMIN_SECRET` isn't set.

**Email confirmation disabled**
Supabase email confirmation was turned off during development. Users can sign up with any email address. This must be re-enabled before any real users are onboarded. App code (`signup.tsx`, `login.tsx`) already handles both the confirmed and unconfirmed states correctly — this is now purely a manual Supabase Dashboard toggle away from being live.

~~**4 navigation dead ends** — RESOLVED~~
All 4 screens (`safety.tsx`, `language.tsx`, `payment-success.tsx`, `payment-failed.tsx`) are fully implemented and registered in `_layout.tsx` with `href: null`.

### High Priority

**No error boundaries**
Zero React error boundaries in the app. A JS error anywhere propagates to a blank screen. Users have no recovery path.

~~**`notify-new-message` Edge Function not wired**~~ — RESOLVED (was already wired)
Turned out the Database Webhook was already fully configured in Supabase (checked during Sprint 3 follow-up) — table `messages`, event `Insert`, pointed at the function. Founder confirmed live: sent a test message, saw the edge function log entry, recipient got notified. The "not wired" claim was stale documentation, not a real gap.

**Cape Town hardcoded throughout**
Location strings, search suggestions, and onboarding reference Cape Town explicitly. Multi-city expansion requires code changes.

~~**Mock data in production fallback paths**~~ — RESOLVED (Sprint 3)
`MOCK_REVIEWS` removed entirely from `host-detail.tsx`. Hosts with no reviews now show an honest "No reviews yet" empty state instead of fabricated testimonials.

**Bag runners screen shows fake data**
4 hardcoded runners with a non-functional "Book" button. Should be replaced with a "Coming soon" notice immediately.

### Medium Priority

**No pagination**
Bookings, messages, notifications, conversations all use `.limit(50/100)`. No cursor-based pagination or infinite scroll. Will degrade as data grows.

**No pull-to-refresh**
All data screens refresh only on focus. No manual refresh gesture.

**No loading skeletons**
Centered spinner on every loading state. Airbnb/Uber-grade UX uses content skeletons.

**Platform fee and payout split are hardcoded**
10% platform fee (booking.tsx), 70/30 split (complete-booking + revenue.tsx). Any business model change requires a code deployment.

**Response rate always 100%**
`response_rate` column exists on `hosts` but is set to 100 on creation and never updated. Displayed on host detail page as false information.

**Read receipts never set**
`read_at` on `messages` is never updated. The column exists, the logic does not.

**Admin sessions stored in LocalStorage only**
Admin session tokens are not server-validated. A session can be replayed indefinitely after the TTL if storage is not cleared.

**Supabase credentials in source**
Anon key is embedded in `supabase.ts`. While anon keys are designed to be public, it should still be in environment variables, not committed to source control.

**No image optimisation**
Host photos are uploaded and served at original size. No compression, no responsive sizes, no lazy loading.

---

## MANUAL TASKS REMAINING

### Supabase Dashboard
- [ ] Re-enable email confirmation (Auth → Providers → Email → Enable confirmation)
- [x] Confirm Auth → URL Configuration allows `cubby://reset-password` as a redirect URL — confirmed working, founder tested the full password reset flow live
- [x] Wire `notify-new-message` DB Webhook — was already configured; founder confirmed live test (message sent → log entry → notification delivered)
- [x] Run the Sprint 3 `host_bank_details` RLS migration (see schema.sql "Fix 3" block) — applied and verified via `pg_policy` query showing both `user_id` and `assigned_user_id` in the policy expression
- [x] Partner Applications / Support Messages admin screens — confirmed genuinely broken via live SQL diagnostics (not stale docs this time), fixed with new edge functions. **Still needed:** deploy `admin-partner-applications` and `admin-support-messages` (see deploy commands below) and confirm `ADMIN_SECRET` is set on both — same secret already required for `admin-bank-details`/`admin-hosts`/`admin-users` since Sprint 2.

### Deploy the two new Sprint 3 edge functions
```bash
cd cubby
supabase functions deploy admin-partner-applications
supabase functions deploy admin-support-messages
```
Both require the `ADMIN_SECRET` secret (same one used by the existing admin functions) — confirm it's set:
```bash
supabase secrets list
```
If not set:
```bash
supabase secrets set ADMIN_SECRET=your-real-secret-here
```
- [ ] Confirm `notifications`, `push_tokens`, `notification_preferences` tables exist (run SQL if not)
- [ ] Confirm `notification_preferences` RLS policy exists
- [ ] Run SQL: add `related_booking_id`, `related_message_id` columns to `notifications`
- [ ] Set `ADMIN_SECRET` env var on all edge functions (Supabase → Functions → Secrets)
- [ ] Set PayFast secrets on edge functions: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE` (optional), `PAYFAST_SANDBOX` (set to `false` for production)
- [ ] Confirm `host-photos` and `avatars` storage buckets exist with correct public policies
- [ ] Create private `verifications` storage bucket (Storage → New bucket → name: verifications, public: OFF)
- [ ] Add storage policies to `verifications` bucket (INSERT/SELECT/UPDATE: `auth.uid() = (storage.foldername(name))[1]::uuid`)
- [ ] Run `verifications` table SQL (see schema.sql bottom section)
- [ ] Confirm `payment-webhook` is registered with Peach Payments as webhook endpoint

### App Configuration
- [ ] Set `EXPO_PUBLIC_ADMIN_PIN` to a real PIN (not '1234') in deployment environment
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] Obtain and configure Google Maps API key → add to `app.json` as `EXPO_PUBLIC_GOOGLE_MAPS_KEY`
- [ ] Add real WhatsApp number to `support.tsx` (replace placeholder)
- [ ] Add real phone number to `support.tsx` (replace `+27000000000`)

### Apple Developer (before iOS build)
- [ ] Apple Developer account enrolled
- [ ] Bundle ID `com.cubby.app` registered
- [ ] Push notification certificate configured (APNs)
- [ ] App Store Connect listing created

### Google Play (before Android build)
- [ ] Google Play Developer account enrolled
- [ ] App signing key generated
- [ ] FCM (Firebase Cloud Messaging) configured for push notifications
- [ ] Play Store listing created

### Legal / Compliance
- [x] Terms of Service document written and hosted in-app (`app/(traveller)/terms.tsx`) — Sprint 1. **Not yet reviewed by a lawyer** — uses "Cubby" as a trading name with a `[COMPANY NAME]` placeholder since the company isn't registered yet. Review before public launch.
- [x] Privacy Policy document written and hosted in-app (`app/(traveller)/privacy.tsx`) — Sprint 1. Same lawyer-review caveat applies.
- [ ] ToS acceptance screen built into signup flow — signup footer text now links to both documents (Sprint 1), but there is no mandatory checkbox/consent gate yet. Decide if that's needed before Private Beta.
- [x] R2,000 coverage: claim removed from all screens (Sprint 1) — no claims process built.

---

## PAYFAST SETUP

### Required Supabase Secrets (edge function environment variables)

| Secret | Value | Notes |
|--------|-------|-------|
| `PAYFAST_MERCHANT_ID` | Your PayFast merchant ID | Sandbox: `10000100` |
| `PAYFAST_MERCHANT_KEY` | Your PayFast merchant key | Sandbox: `46f0cd694581a` |
| `PAYFAST_PASSPHRASE` | Your PayFast security passphrase | Optional but recommended |
| `PAYFAST_SANDBOX` | `true` or `false` | Defaults to `true` — set `false` for production |

Set via Supabase Dashboard → Edge Functions → Secrets, or:
```bash
supabase secrets set PAYFAST_MERCHANT_ID=10000100
supabase secrets set PAYFAST_MERCHANT_KEY=46f0cd694581a
supabase secrets set PAYFAST_PASSPHRASE=your_passphrase
supabase secrets set PAYFAST_SANDBOX=true
```

### Required SQL

Run once in Supabase SQL Editor:
```sql
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'payfast',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;
```

### Deploy Commands

```bash
cd cubby
supabase functions deploy payfast-create
supabase functions deploy payfast-page
supabase functions deploy payfast-itn
supabase functions deploy payfast-return
supabase functions deploy payfast-cancel
supabase functions deploy complete-booking
```

### PayFast Dashboard Setup

1. Log in at https://sandbox.payfast.co.za (sandbox) or https://my.payfast.co.za (production)
2. Go to Settings → Integration Settings
3. Set **Notify URL** (ITN): `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/payfast-itn`
4. Set **Return URL**: `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/payfast-return` (optional — overridden per-payment)
5. Set **Cancel URL**: `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/payfast-cancel` (optional — overridden per-payment)
6. Set a **Passphrase** (use same value as `PAYFAST_PASSPHRASE` secret)

### Sandbox Testing Steps

1. Set Supabase secrets with sandbox credentials (see above)
2. Deploy all 5 PayFast edge functions
3. Run the SQL migration
4. Start the app: `npx expo start --web`
5. Sign in as a traveller, find a host, tap a listing
6. Proceed to booking → tap "Pay R{amount} & confirm"
7. You should be redirected to `sandbox.payfast.co.za`
8. Use PayFast sandbox test cards:
   - Visa: `4000000000000002` (any expiry, any CVV)
   - No OTP required in sandbox
9. After payment:
   - PayFast sends ITN to `payfast-itn` (may take a few seconds)
   - You're redirected to `payfast-return` → deep-linked back to app
   - Booking status should be `confirmed` in Supabase
10. Verify in Supabase Dashboard → Table Editor → bookings:
    - `status = 'confirmed'`
    - `payment_provider = 'payfast'`
    - `payment_reference` = PayFast pf_payment_id
    - `paid_at` is set
11. Test cancellation: tap Cancel on PayFast checkout → booking should be `cancelled` in DB

### Payment will NOT be marked complete until

- [ ] PayFast sandbox end-to-end test passes (step 9-11 above)
- [ ] ITN is confirmed received and processed (check Supabase edge function logs)

---

## LAUNCH CHECKLISTS

### 🔒 Private Alpha (internal only — founder + 5 test users)
- [x] Fix 4 navigation dead ends (safety, language, payment-success, payment-failed) — already implemented
- [x] Fix admin PIN default (error if not set) — Sprint 2, also extended to the wider ADMIN_SECRET fallback
- [x] Fix payout bug (host self-service bank-details screen was writing to the wrong table — Sprint 3)
- [x] Wire notify-new-message DB webhook — was already wired, founder confirmed live end-to-end
- [x] Add booking event notifications (confirmed + declined were already correct; cancelled-by-traveller wired in Sprint 3)
- [x] Admin: Partner application review screen — exists, correctly linked, structurally sound (Sprint 3 audit); live RLS data-loading not verified, see Manual Tasks
- [x] Admin: Support messages viewer — same as above
- [x] Real phone/WhatsApp on support screen — +27 77 460 9484 (Sprint 1)
- [ ] Remove or replace Bag Runners mock screen — explicitly deferred, not in scope yet
- [x] Replace MOCK_REVIEWS fallback with empty state — Sprint 3

### 🧪 Private Beta (invite-only — 50–200 users)
- [ ] Re-enable Supabase email confirmation — app code ready (Sprint 2); remaining step is the Supabase Dashboard toggle
- [~] Terms of Service acceptance at signup — docs written + linked from signup footer (Sprint 1); mandatory checkbox/consent gate still not built
- [x] Password reset / forgot password flow — Sprint 2
- [ ] Email integration (Resend/SendGrid) — booking confirmation email minimum
- [ ] Verification backend (submit photos → review queue → approve/reject)
- [ ] Error boundaries on all screens
- [ ] Pull-to-refresh on bookings, messages, notifications
- [ ] Loading skeletons on data screens
- [ ] Operations Centre (Phase 1) complete
- [ ] Host payout history screen
- [ ] Cancellation policy enforcement
- [ ] Google Maps API key configured (native map functional)

### 🚀 Public Beta (open registration)
- [ ] All Private Beta items complete
- [ ] Full email notification system (all booking events)
- [ ] Real GPS radius search (PostGIS)
- [ ] Search ranking (rating, response rate, reviews)
- [ ] Host response rate tracking
- [ ] Read receipts in messaging
- [ ] Booking modification flow
- [ ] Host analytics dashboard
- [ ] R2,000 coverage claims process (or remove the claim)
- [ ] Dispute / problem reporting flow
- [ ] Analytics event tracking
- [ ] Error logging (Sentry)
- [ ] Performance: pagination, image optimisation
- [ ] Apple App Store submission
- [ ] Google Play Store submission

### 🏁 Production Launch
- [ ] All Public Beta items complete
- [ ] Penetration testing / security audit
- [ ] Load testing (100+ concurrent users)
- [ ] Automated test suite (E2E for booking + payment flow minimum)
- [ ] Staging environment matching production
- [ ] Incident response runbook
- [ ] Support SLA defined
- [ ] Legal: ToS, Privacy Policy, Coverage Policy finalised
- [ ] GDPR compliance review
- [ ] Apple App Store approved
- [ ] Google Play Store approved

---

## OFFICIAL DEVELOPMENT ROADMAP

> This is the canonical priority order. Always follow this sequence unless explicitly told otherwise.
> After every completed feature: update this file, mark tasks complete, update percentages, recommend next task.

### PHASE 1 — OPERATIONS CENTRE
*Goal: Build the tools required to run Cubby as a real business.*

| # | Task | Status |
|---|---|---|
| 1 | Admin Operations Centre Dashboard | ✅ Done |
| 2 | Pending Verification Management | ✅ Done (full workflow: submit → queue → approve/reject → badge → notification) |
| 3 | Partner Application Management | ✅ Done |
| 4 | Support Inbox | ✅ Done |
| 5 | Admin Activity Feed | ✅ Done |
| 6 | Admin Notifications | ✅ Done (30s polling, toast stack, pulse effects on Needs Attention cards) |
| 7 | User Management | ✅ Done (admin-users Edge Function, users.tsx screen, search/filter/detail/actions) |
| 8 | Host Management Improvements | ✅ Done (admin-hosts Edge Function, full detail sheet, edit form, owner assign/remove, bookings summary, stats, safe delete) |

### PHASE 2 — TRUST & SAFETY
*Goal: Make travellers comfortable leaving their belongings with strangers.*

| # | Task | Status |
|---|---|---|
| 1 | Traveller Profile Visibility for Hosts | ✅ Done |
| 2 | Verification Approval System | ✅ Done |
| 3 | Trust & Safety (merged Verification Badges + Trust Badges) | ✅ Done |
| 4 | Response Rate | ✅ Done |
| 5 | Response Time | ✅ Done |
| 6 | Host Ranking | ✅ Done |
| 7 | Search Ranking Improvements | ✅ Done |

### PHASE 3 — COMMUNICATION
*Goal: Keep hosts and travellers informed.*

| # | Task | Status |
|---|---|---|
| 1 | Complete Messaging | ✅ Done |
| 2 | Notification Centre (Bell) | ✅ Done |
| 3 | Notification Preferences | ✅ Done |
| 4 | Push Notifications | 🟡 Partial (Edge Fn built, webhook not wired) |
| 5 | Booking Notifications | ✅ Done (confirmed, declined, cancelled all wired — Sprint 3) |
| 6 | Message Notifications | 🟡 Partial (edge function is fully correct — Sprint 3 audit; DB Webhook to trigger it still not wired, Dashboard step) |
| 7 | Reminder Notifications | 🔴 Not started |
| 8 | Email Notifications (Transactional V1) | ✅ Done |

### PHASE 4 — MARKETPLACE POLISH
*Goal: Create the best booking experience possible.*

| # | Task | Status |
|---|---|---|
| 1 | Google Maps Integration | 🟡 Partial (native only, no API key) |
| 2 | Better Search | 🟡 Partial (keyword only, no GPS radius) |
| 3 | Accurate Distance Calculations | 🔴 Not started |
| 4 | Host Analytics | 🔴 Not started |
| 5 | Booking Analytics | 🔴 Not started |
| 6 | Review Improvements | 🔴 Not started |
| 7 | Favourite Hosts | ✅ Done (saved_spots) |
| 8 | Saved Searches | 🔴 Future |

### PHASE 5 — PAYMENTS
*Goal: Make payments reliable and fully automated.*

| # | Task | Status |
|---|---|---|
| 1 | Peach Payments Production | 🟡 Partial (integrated, not production keys) |
| 2 | Payment Confirmation Flow | ✅ Done |
| 3 | Payment Failure Handling | ✅ Done (`payment-failed.tsx` fully implemented) |
| 4 | Refund Flow | 🔴 Not started |
| 5 | Host Payout Flow | 🟡 Partial (edge fn built, wrong table bug) |
| 6 | Payout History | 🔴 Not started |
| 7 | Finance Dashboard | 🔴 Not started |

### PHASE 6 — HOST EXPERIENCE
*Goal: Create the best possible experience for hosts.*

| # | Task | Status |
|---|---|---|
| 1 | Host Dashboard Improvements | 🟡 Partial |
| 2 | Better Earnings Dashboard | 🟡 Partial |
| 3 | Availability Improvements | 🔴 Not started |
| 4 | Host Performance Insights | 🔴 Not started |
| 5 | Host Tips | 🔴 Not started |
| 6 | Top Host Programme | 🔴 Future |

### PHASE 7 — USER EXPERIENCE
*Goal: Polish Cubby.*

| # | Task | Status |
|---|---|---|
| 1 | Better Animations | 🔴 Not started |
| 2 | Better Loading States | 🟡 Partial (spinners only) |
| 3 | Better Error Handling | 🔴 No error boundaries |
| 4 | Skeleton Loaders | 🔴 Not started |
| 5 | Empty States | 🟡 Partial |
| 6 | Success Screens | 🟡 Partial |
| 7 | Consistent Navigation | 🟡 Partial |
| 8 | Accessibility Improvements | 🔴 Not started |

### PHASE 8 — LEGAL & LAUNCH
*Goal: Prepare Cubby for public launch.*

| # | Task | Status |
|---|---|---|
| 1 | Privacy Policy | ✅ Done (drafted + hosted in-app; needs lawyer review before public launch) |
| 2 | Terms & Conditions | ✅ Done (drafted + hosted in-app; needs lawyer review before public launch) |
| 3 | Password Reset | ✅ Done (Sprint 2) |
| 4 | Security Review | 🔴 Not started |
| 5 | Production Testing | 🔴 Not started |
| 6 | Beta Testing | 🔴 Not started |
| 7 | App Store Submission | 🔴 Not started |
| 8 | Google Play Submission | 🔴 Not started |

### PHASE 9 — GROWTH
*Future: Referral Programme, Promo Codes, Business Accounts, Airport/Hotel/Travel Agent Partnerships, Loyalty Programme, Insurance Options.*

---

## NEXT RECOMMENDED TASK

> **PR #38 merged into `main`** (merge commit `afc1ccf`, 2026-07-07) — Sprint 1 (Legal & Trust), the SDK 56 dependency fix, Sprint 2 (Account Access & Security), and Sprint 3 (payout bug, notifications, MOCK_REVIEWS, admin Partner Applications/Support Messages fix) are all now on `main`.
>
> **Sprint 4 (Private Beta Polish) is now done** on branch `claude/private-beta-polish`: global error boundary, fake Cubby Runners removed, email confirmation flow verified + one real native crash fixed, admin-gated host onboarding checklist (Option B) implemented + the dashboard demo-data leak fixed, and the orphaned `bank_details` table audited (recommend-only, not dropped). Per founder instruction, **Sprint 5 has not been started** — stopping here for review/approval.
>
> Founder manually verified live: `notify-new-message` webhook, the `host_bank_details` RLS migration, the password reset flow, the two new admin edge functions (`admin-partner-applications`, `admin-support-messages`), and (2026-07-07) the full Sprint 4 host onboarding flow end-to-end — all deployed and working.
>
> Remaining known manual items before Private Beta:
> 1. Re-enable Supabase email confirmation (Dashboard toggle) — still pending
> 2. Decide whether to drop the orphaned `bank_details` table (see Sprint 4 audit note) — recommend dropping after confirming it holds no live data
> 3. Everything else in the Private Beta / Public Beta checklists below

---

## PHASE 1 — OPERATIONS CENTRE (SPEC)

### Current Admin State
All screens exist but are architecturally disconnected. There is no consistent navigation, no back button pattern, no way to move between admin sections without going through the dashboard. Each screen is a standalone page. The dashboard itself is a grid of nav cards that link to these disconnected screens.

**What currently exists and works:**
- `login.tsx` — PIN login with security ✅
- `dashboard.tsx` — Stats + nav cards (functional but shallow)
- `manage-hosts.tsx` — List, toggle, assign, delete hosts ✅
- `create-host.tsx` — Full host creation form ✅
- `host-payouts.tsx` — Bank details via edge function ✅
- `all-bookings.tsx` — Booking list with status tabs ✅
- `revenue.tsx` — Revenue with 70/30 split ✅

**What is missing entirely:**
- Partner application review (approve/reject)
- Support message viewer
- Verification review queue
- Traveller management
- Activity feed
- System health
- Consistent navigation between screens

### Proposed Operations Centre Architecture

The dashboard becomes a hub with live metric cards and section navigation. Each section card shows a live count (pending items, active bookings, etc.) and links to its management screen.

```
MARKETPLACE
├── Hosts          [N total, N active, N inactive]
├── Travellers     [N total, N this month]
├── Active Bookings [N active, N pending]
├── All Bookings   [link to all-bookings screen]
└── Revenue        [R total this month]

APPROVALS
├── Host Applications  [N pending] ← new screen needed
├── Verifications     [N pending] ← new screen needed
└── Partner Applications [N pending] ← new screen needed

SUPPORT
├── Support Messages   [N open] ← new screen needed
├── Reported Problems  [future]
└── Claims             [future]

OPERATIONS
├── Recent Activity    [feed]
├── System Health      [supabase status, edge fn status]
└── Notifications      [future]
```

### Design Principles for Operations Centre
1. Each metric card shows a live count pulled from Supabase
2. Red badge on card if there are pending items needing attention
3. Consistent header bar across all admin screens (screen title + back to dashboard)
4. Architecture supports future role-based access without redesign
5. No code that assumes single admin — use `admin_role` concept even if only 'super_admin' for now

### Approved Modifications (2026-06-26)
1. **Include Verification in Phase 1** — `verifications.tsx` admin review queue built. Shows setup notice if table doesn't exist yet.
2. **Recent Activity Feed** — Merged timeline of bookings, applications, support messages on the dashboard. Heartbeat of the business at a glance.
3. **🚨 Needs Attention section** — First thing admin sees. Red-bordered cards for pending items requiring action. Only shown when items exist.

### Long-Term Vision
The dashboard should be readable in 5 seconds. A Cubby operator should be able to open the admin panel and immediately know: what needs action, what happened today, and the health of the marketplace — without clicking into any sub-screen.

### What Was Built (Phase 1 — ✅ Implemented)
1. ✅ Redesigned `dashboard.tsx` — Needs Attention + Today's Snapshot + Marketplace + Approvals + Support + Recent Activity Feed
2. ✅ `partner-applications.tsx` — tabbed view (pending/approved/rejected), expand to review, approve/reject. UI unchanged; Sprint 3 fixed the data layer to call `admin-partner-applications` (was RLS-blocked before).
3. ✅ `support-messages.tsx` — tabbed view (open/resolved), expand to read, mark resolved/reopen. UI unchanged; Sprint 3 fixed the data layer to call `admin-support-messages` (was RLS-blocked before).
4. ✅ `verifications.tsx` — tabbed view with photo display for ID + selfie, approve/reject (graceful empty state if table not yet created)
5. ✅ `all-bookings.tsx` — migrated from AsyncStorage to real Supabase queries
6. ✅ `revenue.tsx` — migrated from AsyncStorage to real Supabase queries

### SQL Required for Verifications (run manually in Supabase)
```sql
CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_photo_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own verification" ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own verification" ON verifications FOR SELECT USING (auth.uid() = user_id);
```

Also create a private `verifications` storage bucket in Supabase Dashboard → Storage → New bucket (NOT public — sensitive ID documents).

### Screens to Keep (as-is for now)
- `login.tsx` — leave untouched
- `manage-hosts.tsx` — functional as-is
- `create-host.tsx` — functional as-is
- `host-payouts.tsx` — functional as-is

---

---

## KNOWN BUGS (ACTIVE)

| Bug | Severity | Location |
|---|---|---|
| ~~Host self-service bank-details screen wrote to the wrong table, invisible to admin payouts~~ | ✅ Fixed (Sprint 3) | `app/(host)/bank-details.tsx` |
| ~~Admin PIN defaults to '1234' if env var not set~~ | ✅ Fixed (Sprint 2) | `app/(admin)/login.tsx` |
| ~~ADMIN_SECRET hardcoded fallback in 13 locations~~ | ✅ Fixed (Sprint 2) | `app/(admin)/*.tsx`, `src/lib/review-service.ts`, 6 edge functions |
| ~~`notify-new-message` Edge Function exists but DB webhook not wired~~ | ✅ Confirmed working (was already wired) | Supabase Dashboard |
| ~~4 navigation dead ends crash or blank on tap~~ | ✅ Fixed | All 4 screens implemented |
| ~~Host dashboard showed fake `DEMO_STATS`/`DEMO_BOOKINGS` alongside "Host profile not found" error, and `host-profile.tsx` silently no-op'd saves, for any host with no assigned `hosts` row~~ | ✅ Fixed (Sprint 4, Option B) | `app/(host)/dashboard.tsx`, `app/(host)/host-profile.tsx`, `app/(traveller)/profile.tsx`, `app/(auth)/signup.tsx` |
| `MOCK_REVIEWS` shown as real reviews on empty host profiles | 🟡 High | `app/(traveller)/host-detail.tsx` |
| Verification signed URLs expire after 7 days — admin needs edge fn to refresh for long-pending reviews | 🟠 Medium | `app/(admin)/verifications.tsx` |
| Response rate always shows 100% (never updated) | 🟠 Medium | `supabase/schema.sql` |
| Read receipts on messages never set | 🟠 Medium | `app/(traveller)/chat.tsx`, `app/(host)/chat.tsx` |
| Bag count `−/+` buttons not functional in booking screen | 🟠 Medium | `app/(traveller)/booking.tsx` |
| Email confirmation disabled (dev mode left on) | 🔴 Critical | Supabase Dashboard → Auth |

---

## DECISIONS & CONTEXT LOG

| Date | Decision | Reason |
|---|---|---|
| 2026 | `assigned_user_id` pattern on hosts | Admin creates host profiles, then assigns to user account. Allows quality control before self-serve. |
| 2026 | Peach Payments (not Stripe) | South African payment provider, supports ZAR, familiar to local users |
| 2026 | 70/30 payout split | Host receives 70%, Cubby takes 30%. Hardcoded — should become admin configurable. |
| 2026 | 10% platform fee on bookings | Added to subtotal at checkout. Hardcoded — should become admin configurable. |
| 2026 | PIN-based admin login (not Supabase Auth) | Simpler for solo operator. Needs upgrade before multi-staff. |
| 2026 | No card storage | PCI compliance — Peach handles all card data |
| 2026 | R2,000 bag coverage claim | Marketing trust signal. No claims mechanism exists. Must be resolved before launch. |
| 2026 | Cape Town first | Initial geographic focus. Hardcoded throughout. Will need refactoring for expansion. |
| 2026-07 | Host onboarding: Option B — admin-gated, no self-serve listing creation | Sprint 4 found `host-profile.tsx` could never actually create a `hosts` row (UPDATE-only) and `dashboard.tsx` leaked `DEMO_STATS` for any host with no row. Rather than build self-serve creation (which would have contradicted the original `assigned_user_id` "admin creates, then assigns" design above), founder chose to keep the admin-gated model and instead fix the broken/misleading UI: unapproved host/both signups now see an honest "Host application pending" checklist (`HostOnboardingChecklist`) wherever they'd otherwise have hit a broken or fake-data screen. Admin still approves via `users.tsx` (`is_host_approved`) and assigns listings via `create-host.tsx`/`manage-hosts.tsx` — unchanged. |
