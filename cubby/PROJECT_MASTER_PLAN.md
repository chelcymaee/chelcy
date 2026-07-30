# CUBBY — PROJECT MASTER PLAN
> Single source of truth for all development, product decisions, and launch planning.
> Last updated: 2026-07-07
>
> **See also: [`PRIVATE_BETA_LAUNCH_PLAYBOOK.md`](./PRIVATE_BETA_LAUNCH_PLAYBOOK.md)** — the operational counterpart to this file. This document tracks engineering/infrastructure status; the playbook covers host acquisition, beta recruitment, founder operations, and launch risk — added 2026-07-16 once engineering readiness pulled ahead of go-to-market readiness.

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

## 🔎 FINAL QA — Sprint 5 ✅ Merged into `main` (PR #40, commit `abf2fa3`) — deploy + live RLS verification still pending

> Goal: audit Cubby as a first private beta tester across all three roles (traveller, host, admin) — no redesigns, no new features, fix only genuine bugs. Full audit findings (Critical/Medium/Low) were reported first; founder approved fixing **Critical only** in this pass. Medium/Low items and the route-collision investigation are intentionally deferred.

### Critical fixes — done

| Item | Status | Notes |
|---|---|---|
| Admin PIN could be bypassed entirely | ✅ Fixed | Audit found only `app/(admin)/dashboard.tsx` checked for a valid PIN session — all 11 other admin screens (`users.tsx`, `manage-hosts.tsx`, `verifications.tsx`, `host-payouts.tsx`, `partner-applications.tsx`, `support-messages.tsx`, `all-bookings.tsx`, `create-host.tsx`, `revenue.tsx`, `reviews.tsx`) were reachable by typing their URL directly, with zero redirect to `/login`. Confirmed live twice — once earlier this session (navigated straight to `/users`, worked without ever touching the PIN pad) and once in the audit itself (fresh, never-logged-in browser reached `/manage-hosts` directly). **Fix:** moved the session check from `dashboard.tsx` alone up to `app/(admin)/_layout.tsx`, so it now gates every screen in the group before rendering — checks `checkAdminSession()` on mount, shows a spinner while checking, redirects to `/(admin)/login` if invalid, skips the check only for `login.tsx` itself (to avoid a redirect loop). **Verified live:** every admin URL tested with no session now redirects to `/login`; logging in with the correct PIN still reaches every screen normally. |
| 4 admin screens had zero protection — not even `ADMIN_SECRET` | ✅ Fixed | `all-bookings.tsx`, `revenue.tsx`, `reviews.tsx`, and `create-host.tsx` queried Supabase directly from the client with no PIN check and no secret gating — relying entirely on RLS, which this sandbox cannot verify (same blind spot that hid the real Sprint 3 RLS bug). `create-host.tsx` performed a direct `.insert()` into `hosts`; `reviews.tsx` performed direct `.delete()`/`.update()`. **Fix:** moved all four onto the same `ADMIN_SECRET`-gated edge function pattern already used by the other 6 admin screens — (1) added a `create` action to the existing `admin-hosts` edge function (mirrors its existing `assign`-by-email lookup, so `create-host.tsx` no longer touches `hosts`/`profiles` directly); (2) added a new `admin-bookings` edge function (GET, returns bookings + host display name) shared by both `all-bookings.tsx` and `revenue.tsx` — `revenue.tsx` filters to `status=completed` client-side, same as before; (3) added a new `admin-reviews` edge function (GET/DELETE/PATCH) for `reviews.tsx`'s list/remove/clear-report actions. **Verified live:** all four screens render correctly post-login with zero console errors (only a network-blocked "Failed to fetch" from this sandbox's own proxy, expected). |
| "Bag Runner" signup led to a fully fake, hardcoded earnings dashboard | ✅ Fixed | Selecting "Bag Runner" at signup — a normal, visible role option — landed on `app/(runner)/dashboard.tsx`, which showed **R240 earnings, 3 deliveries, a 4.9 rating, and an active "Sarah T." delivery worth R120** — all hardcoded constants, zero Supabase connection. Directly contradicted the Sprint 4 decision to make the traveller-facing Bag Runners feature an honest "coming soon" empty state. `deliveries.tsx` (fake pending delivery requests) and `earnings.tsx` (fake weekly/monthly earnings breakdown) were the same pattern. **Fix:** removed "Bag Runner" from the signup role picker entirely (traveller/host/both remain); replaced all three runner screens' hardcoded fake data with the same honest "🚗 Bag Runners is coming soon" empty state already used on the traveller side, so even a pre-existing runner-role account or a direct URL hit sees no fake data. **Verified live:** signup no longer offers "Bag Runner"; navigating directly to `/(runner)/dashboard` now shows the honest coming-soon message instead of fake figures. |

**Verified:** `npx tsc --noEmit` — zero new errors from any Sprint 5 change. Full live Playwright verification in this sandbox (temporary local test env, git-ignored, removed after testing): every admin URL blocked pre-login and redirects to `/login`; PIN login still reaches every admin screen; all four refactored screens (create-host, reviews, all-bookings, revenue) render correctly post-login; Bag Runner is gone from signup and the runner dashboard shows the honest empty state; traveller and host flows (explore, host dashboard) load unaffected.

### Manual checks still needed (live Supabase, cannot be done from this sandbox)

1. **RLS verification on `hosts` and `reviews` tables** — same methodology as the Sprint 3 Partner Applications discovery: run `SET ROLE anon;` (or `authenticated`) against `INSERT` on `hosts` and `DELETE`/`UPDATE` on `reviews` in the Supabase SQL Editor. The audit couldn't confirm whether these were ever actually exploitable live (schema.sql only holds supplementary migration snippets, not the full policy set) — now that all four screens go through `ADMIN_SECRET`-gated edge functions instead, client-side RLS gaps on these two tables no longer matter for admin access, but it's still worth confirming regular (non-admin) users can't write to `hosts` or delete/clear-report on `reviews` some other way.
2. **Deploy the two new edge functions and confirm `ADMIN_SECRET` is set** (same secret already used by the other 6 admin functions):
   ```bash
   cd cubby
   supabase functions deploy admin-bookings
   supabase functions deploy admin-reviews
   supabase functions deploy admin-hosts   # redeploy — gained the new 'create' action
   ```
3. **Live end-to-end admin test** (see Testing Steps below) — the sandbox exercised all of this against a placeholder/offline environment; a pass against the real Supabase project + real admin PIN is the final sign-off.

### Testing steps

1. **Visit every admin URL without a PIN session** (`/manage-hosts`, `/users`, `/all-bookings`, `/revenue`, `/reviews`, `/create-host`, `/verifications`, `/host-payouts`, `/partner-applications`, `/support-messages`, `/dashboard`) → every one should redirect straight to `/(admin)/login`, none should render any admin content or data.
2. **Log in with the correct PIN** → should land on the Dashboard; then navigate to each screen from step 1 again → all should now work normally, showing real data.
3. **Sign up a fresh account** → confirm "Bag Runner" is not offered as a role option (only Traveller / Host / Both). If you have an existing test account with `role = 'runner'` from earlier testing, sign into it and confirm the Dashboard/Deliveries/Earnings tabs all show "Bag Runners is coming soon" instead of any numbers.
4. **Traveller and host flows regression check** — sign in as a traveller (Explore, Bookings, Profile) and as an existing approved host (Dashboard, Host Profile) and confirm nothing changed; both should look and behave exactly as before this sprint.

### Post-audit bug: host photo upload failing (found live during beta QA)

| Item | Status | Notes |
|---|---|---|
| Host photo upload failed with `Upload failed: invalid input syntax for type uuid: "host-photos"` | ✅ Fixed | Root cause: `app/(host)/host-profile.tsx`'s `handlePhotoSelect` built the storage object path as `` `host-photos/${user.id}/${Date.now()}.${ext}` `` — redundantly repeating the bucket name (already selected via `.storage.from('host-photos')`) as the first folder segment of the path. This app's storage buckets all follow the same RLS convention (documented in `schema.sql` for `avatars`/`verifications`): `auth.uid() = (storage.foldername(name))[1]::uuid` — position 1 must be the user's id. With the redundant prefix, position 1 became the literal string `"host-photos"` instead, so the policy's `::uuid` cast failed with exactly the reported error. Confirmed `avatars` (`profile.tsx`) and `verifications` (`verification.tsx`) already use the correct `${user.id}/...` convention with no prefix — this was an isolated bug in `host-photos` only, not a systemic pattern. **Fix:** removed the redundant `host-photos/` prefix so the path is `${user.id}/${Date.now()}.${ext}`, matching the other two buckets. One-line change. Temporary diagnostic logging (bucket, host id, path, DB payload) was added to confirm the trace, then removed once the fix was applied — this sandbox cannot reach the live Supabase project to reproduce the RLS error itself, so **please test a real photo upload live to confirm** before considering this closed. |
| Uploaded host photos never appeared on Explore cards or Host Detail — still showed the emoji placeholder | ✅ Fixed | Two-part bug, both confirmed by reading the actual render code (not assumed). The `hosts.photos` column and the write path were always correct — `host-profile.tsx` writes to `hosts.photos` (a `string[]`), and `explore.tsx`'s query (`select('*')`) already fetched it. **Part 1 — `explore.tsx`:** `photos` was correctly present on the normalized `Host` object, but the `ResultCard` component's image box (`S.resultEmojiBox`) only ever rendered `<Text>{typeEmoji[...]}</Text>` — no code path checked `host.photos` at all, so a card could never show a real photo no matter what was in the database. **Part 2 — `host-detail.tsx`:** worse — its own local `normalizeHost` function (separate from `explore.tsx`'s, this screen doesn't share a component) never even included `photos` in the object it returned, so `host.photos` was `undefined` here regardless of what the `select('*')` query fetched; the header `iconBox` was also hardcoded to a static 🧳 emoji with no conditional logic. **Fix:** added `photos: raw.photos ?? []` to `host-detail.tsx`'s `normalizeHost`; both screens now conditionally render `<Image source={{ uri: host.photos[0] }} />` when a photo exists, with an `onError` handler that falls back to the original emoji if the image URL fails to load (e.g. bucket public-access misconfiguration) — the emoji-only fallback for hosts with zero photos is unchanged. No shared `HostCard` component exists (checked) — these were the only two display surfaces. **Verified live** in this sandbox with a data-URI test image (bypasses the network block entirely): a host with a photo renders exactly one `<img>` on both Explore and Host Detail; a host with no photos renders zero `<img>` tags and still shows its emoji. Bucket public/signed-URL configuration itself couldn't be verified from this sandbox (no network to the real project) — if a real uploaded photo still doesn't display after this fix, check that the `host-photos` bucket is set to public in the Supabase Dashboard, same as `avatars`. |

### Launch-readiness audit + critical fixes (comprehensive pass, priority-ordered)

Full 10-category audit (Security → Payments → Booking reliability → Notifications → Auth → Host onboarding → Traveller onboarding → Navigation → Loading/error states → Trust/UX). Founder directed a priority-ordered pass: confirm each issue is genuine before fixing, implement Security fixes directly, hand off anything requiring live DB access as ready-to-run SQL rather than assuming it's broken, and defer speculative payment UX until PayFast is actually configured. Founder reviewed the results and made three adjustments (see rows below): kept both authorization fixes, reverted the booking capacity check as the wrong model for a time-based booking system, and asked that the RLS findings be treated as open verification questions rather than confirmed vulnerabilities until actually tested live.

| Item | Status | Notes |
|---|---|---|
| `complete-booking` edge function had zero caller authorization | ✅ Fixed | Confirmed genuine: the function took only `{ bookingId }`, ran on the service-role key (bypasses RLS), and never checked who was calling — unlike the accept/decline path in `dashboard.tsx`, which is protected by a real RLS policy. Any signed-in user who knew a `bookingId` could mark someone else's booking "completed," queuing a real payout (`payout_status: 'pending_manual'`) and firing confirmation emails/review prompts for a stay that never happened. **Fix:** added a JWT verification step (`supabase.auth.getUser(token)` from the `Authorization` header, which `supabase.functions.invoke()` already sends automatically — no client change needed) plus an ownership check against `hosts.assigned_user_id`/`user_id`, returning 401/403 before any mutation happens. |
| `payfast-create` edge function also had zero caller authorization | ✅ Fixed | Same class of gap: anyone who knew a `bookingId` could flip its `payment_provider`/`status` via this endpoint, regardless of its current state. (The actual charged *amount* was already safe — `payfast-page` always computes it fresh from `booking.total_price`, never trusts client input — so this was a status-manipulation risk, not a direct financial one.) **Fix:** same pattern as above — JWT verification + `booking.traveller_id` ownership check. |
| No booking capacity/overlap enforcement | ⏸️ Reverted at founder's direction | Implemented, then reverted. A same-day bag-count check was added and confirmed working, but Cubby's bookings are time-based (drop-off/pick-up windows within a day), so a same-day-only check would produce false rejections — blocking two bookings that don't actually overlap in time just because they share a date. Founder's call: launch without capacity enforcement rather than ship incorrect enforcement. Proper fix is real time-interval overlap logic, to be built later if beta feedback justifies it — not attempted this pass. |
| `messages`/`conversations` RLS: enabled but zero policies committed anywhere in the repo | ⚠️ Open verification question — SQL ready, not yet run | `schema.sql` shows `ALTER TABLE messages/conversations ENABLE ROW LEVEL SECURITY` with no `CREATE POLICY` anywhere in the repo, and `chat.tsx` derives conversation participants from a client-supplied `bookingId` with no ownership check of its own. **This does not mean the live database is insecure** — policies may well have been added directly in the Supabase Dashboard outside version control, the same way other tables in this project were. Per founder direction, treating this as an open question, not a confirmed vulnerability, until tested. **Added:** a candidate "Fix 4" block in `schema.sql` with explicit participant-only policies, kept ready but **not applied** — do not run it until `supabase/RLS_VERIFICATION.sql` confirms it's actually needed. |
| `hosts` table: `FOR ALL` policy implicitly allowed self-service INSERT | ✅ Fixed — confirmed live via `RLS_VERIFICATION.sql` block #3 (2026-07-07) | Not a "policy missing" gap like the row below — `hosts` *is* defined in `schema.sql` with `"Hosts can manage own listing" FOR ALL USING (auth.uid() = user_id)`. The bug: Postgres applies a `FOR ALL` policy's `USING` clause as the implicit `WITH CHECK` too, so on INSERT it only verified the *new* row's `user_id` equalled `auth.uid()` — any signed-in traveller could satisfy that by inserting a row naming themselves as owner, creating a live, publicly-visible host listing with zero admin approval. **Confirmed live**: ran block #3 with a real (non-host) traveller account substituted in for both the session and the row's `user_id` — the INSERT returned "Success" with no policy error, then was rolled back. **Fix:** "Fix 5" block appended to `schema.sql` — dropped the `FOR ALL` policy, replaced with scoped `UPDATE`/`DELETE`-only policies (same `auth.uid() = user_id` condition), added no `INSERT` policy at all (default-deny). Verified via grep that no client-side code anywhere in `app/`/`src/` calls `.from('hosts').insert(...)` or `.delete(...)` — both only happen server-side in the service-role `admin-hosts` edge function, which bypasses RLS entirely and is unaffected. Self-service editing (`host-profile.tsx` photo uploads, `dashboard.tsx` `is_active` toggle) is also unaffected: `admin-hosts` always sets `user_id` and `assigned_user_id` together, so the new UPDATE policy still matches every existing host's own account. **Applied to the live database 2026-07-07** — but re-running block #3 after applying Fix 5 alone still returned "Success" (INSERT still went through). Investigated further, see next row. |
| `hosts` table: second, much broader policy `"Admin can manage all hosts"` (`FOR ALL`, `roles: {public}`, `USING (true)`, `WITH CHECK (true)`) was independently granting the same access | ✅ Fixed — confirmed live via `pg_policies` + `RLS_VERIFICATION.sql` block #3 (2026-07-07) | Root cause of Fix 5 "not working": this policy was never in `schema.sql` at all — added directly in the Supabase Dashboard, discovered only by querying `pg_policies` live against production after Fix 5 alone didn't close block #3. Despite its name, it checked nothing about the caller — `true`/`true` grants every command to every role, including plain signed-in travellers — and Postgres OR-combines multiple permissive policies, so it alone kept the INSERT open regardless of Fix 5. There is **no admin identity at the database level in this project at all**: admin access is a client-side PIN (`checkAdminSession()`, AsyncStorage) with no corresponding `auth.uid()`/claim, so no RLS policy can actually distinguish the founder's account from any other signed-in user — this policy could never have been a real admin check, just an open door with a reassuring name. **Fix:** before dropping it, audited every direct client-side write to `hosts` to confirm nothing legitimately depended on it — found exactly one: `app/(admin)/verifications.tsx` synced `owner_is_verified` via a direct `supabase.from('hosts').update(...)` using the admin's own session (not the service-role edge function). Migrated that one call onto the same `admin-hosts` edge function pattern already used everywhere else (added `owner_is_verified` to `admin-hosts`'s `ALLOWED_HOST_FIELDS` allowlist, `verifications.tsx` now looks up the host id via the public SELECT policy and calls `admin-hosts` PATCH with `x-admin-secret`). "Fix 6" block appended to `schema.sql` drops the policy. `npx tsc --noEmit` before/after diffed clean — zero new errors. **Applied to the live database 2026-07-08** — block #3 re-run and confirmed closed: `ERROR: 42501: new row violates row-level security policy for table "hosts"`. **Still pending:** redeploy `admin-hosts` (gained `owner_is_verified` in its allowlist) and manually verify the migrated `verifications.tsx` approve/reject flow still updates the host's verified badge — this sandbox can't reach production to test either. |
| Related, separately observed, **not yet fixed**: `verifications.tsx`'s `supabase.from('profiles').update({ is_verified }).eq('id', userId)` call (the line just above the one fixed above) has the same shape of problem — the admin's own session updating another user's `profiles` row, which `schema.sql`'s `"Users can update own profile" USING (auth.uid() = id)` policy would normally block. Not confirmed via live testing (out of scope of the block #3 fix just done), flagged for a follow-up check — same live-RLS-verification method, just against `profiles` instead of `hosts`. | 🟡 Flagged, not fixed | `app/(admin)/verifications.tsx` line ~87 |
| `reviews` table: cross-user DELETE by a non-owner | ✅ Safe — confirmed via `RLS_VERIFICATION.sql` block #4 (2026-07-08) | A random non-host traveller account's `DELETE` against a real review either errors or silently affects 0 rows — re-`SELECT`ing the same review afterward still showed `count = 1`. No fix needed. |
| `bookings` table: third fake-admin policy, same shape as the `hosts` bug, granting platform-wide read access | ✅ Fixed — confirmed live via `pg_policies` + `RLS_VERIFICATION.sql` block #5 (2026-07-08) | Block #5 showed a non-host traveller account with exactly 1 real booking of its own could see **8** — every booking on the platform (dates, prices, everyone's trip details). `bookings` *is* correctly defined in `schema.sql` (`"Travellers can view own bookings"` scoped to `auth.uid() = traveller_id`, `"Hosts can view bookings for their listing"` scoped to the host's own `hosts.user_id`) — neither explains the leak. `pg_policies` queried live turned up a third, undocumented policy: `"Admin can view all bookings"` (`FOR ALL`, `roles: {public}`, `USING (true)`) — same pattern as the `hosts` bug (Fix 6): a name implying an admin check, enforcing none, and no admin identity exists at the database level in this project to check against regardless (admin auth is a client-side PIN only). **Fix:** audited every direct client-side read of `bookings` before dropping the policy — found one dependent, `app/(admin)/dashboard.tsx`'s stats/recent-activity widgets, which read `bookings` directly via the admin's own session (the two other admin bookings screens, `all-bookings.tsx`/`revenue.tsx`, were already migrated onto the service-role `admin-bookings` edge function in the original Sprint 5 pass — `dashboard.tsx` was simply missed at the time). Migrated it onto the same `admin-bookings` edge function. The one other direct read (`src/lib/review-service.ts`, fetching `host_id` for a reciprocal review prompt) is called by the host who owns that booking — already covered by the legitimate `"Hosts can view bookings for their listing"` policy, unaffected either way. "Fix 7" in `schema.sql` drops the policy. `npx tsc --noEmit` before/after diffed clean — zero new errors. **Applied to the live database 2026-07-08** — block #5 re-run and confirmed closed: count dropped from `8` (every booking on the platform) to `1` (this account's own booking only). **Still pending:** `dashboard.tsx`'s bundled JS needs a fresh build/deploy to pick up the client-side migration to `admin-bookings` (`admin-bookings` itself is unchanged, no redeploy needed for that function). |
| Payment code review (no live PayFast configured yet — code review only, no speculative fixes) | ✅ Reviewed | PayFast is not yet connected; per founder instruction, did not implement or spend time on anything requiring live payment testing. The `payfast-itn` webhook handler itself is solid: signature validation, amount validation (rejects mismatches), merchant ID check, production IP allow-list, and idempotent status updates (`.in('status', ['pending','pending_payment'])` guards against double-processing). One real architectural bug found and **intentionally not fixed yet** (see Payment QA Checklist below) since it needs live payment testing to verify a fix: `payfast-return` sends `status=pending` when the ITN hasn't landed yet (normal — webhook delivery isn't instant), but the app's deep-link handler treats anything other than the literal string `'success'` as failure, showing `payment-failed.tsx`'s **"Your payment could not be processed. No charge was made. Please try again."** — an unverified, potentially false statement with a "try again" CTA that could cause a real double-charge once real money is flowing. Flagged, not touched. |

#### Payment QA Checklist — revisit once PayFast is actually configured and live payment testing is possible

- [ ] **Highest priority once live:** fix the pending→failed misclassification in `app/_layout.tsx`'s deep-link handler + build a real "payment pending, confirming…" state instead of collapsing into the false "no charge was made" message.
- [ ] Confirm the ITN webhook URL is reachable from PayFast's servers in production (not just sandbox).
- [ ] Test what actually happens if the ITN never arrives (network blip, PayFast retry exhaustion) — currently no reconciliation job; a booking would sit in `pending_payment` forever with nothing to notice.
- [ ] Confirm `PAYFAST_SANDBOX` is correctly set to `false` before accepting real money, and that the IP allow-list check in `payfast-itn` is current (PayFast's published server IPs can change).
- [ ] Decide whether to delete the unused Peach Payments code (`create-payment`, `payment-webhook`, `payment-page`, `payment-result`) or leave it — explicitly deferred this pass per founder instruction, not a beta blocker either way.

### Deferred — not started this pass (per founder instruction: critical only / explicitly out of scope this round)

- Medium: route collisions on 7 shared filenames (`chat.tsx`, `dashboard.tsx`, `messages.tsx`, `notifications.tsx`, `reviews.tsx`, `review-detail.tsx`, `login.tsx` — each exists in 2-3 route groups and all resolve to the same bare URL on a hard refresh or bare deep link)
- Medium: `host-detail.tsx` shows a permanent loading skeleton (never an error) for a bad/deleted host ID
- Medium: push notification taps don't deep-link anywhere (no `addNotificationResponseReceivedListener` in the codebase)
- Medium: the default Expo Router 404 page is unstyled (black background) and inconsistent with the rest of the app
- Low: demo/offline mode host dashboard still shows old fake `DEMO_STATS` (never reachable by real beta users)
- Low: host chat with no booking context renders as if it's a valid empty conversation
- Low: minor Google Maps SDK console warning (loaded without `loading=async`)

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

### Payments (PayFast — Phase 5) — superseded, see PayGate section below
> The actual merchant account being pursued is **PayGate** (PayGate Plus Hospitality), not PayFast — confirmed 2026-07. This PayFast section is kept as-is for the architectural reference it already served (the paygate-* functions mirror this design, adapted for PayWeb3's different API), but no further PayFast work is planned unless the business decision changes again.

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

### Payments (PayGate — Phase 5, in progress)
Built against PayGate's official PayWeb3 documentation and test credentials, reviewed page-by-page directly from the live developer portal (Security & Checksum, Initiate Request, Redirect to PayWeb, Notify URL Response, Return to Merchant, Query Transaction Status, Testing) rather than only archived third-party sample code.

- [x] `bookings_payment_provider_check` allowlist extended to accept `'paygate'` (PR #63)
- [x] `paygate_pay_request_id` column added — required for `query.trans` reconciliation and for validating `paygate-return`'s checksum (PayGate's return redirect doesn't include `REFERENCE`, only `PAY_REQUEST_ID` + `TRANSACTION_STATUS`) (PR #63)
- [x] Phase 4/5 booking-lifecycle RPCs (`accept_booking`, `decline_booking`, `confirm_booking_payment`, etc.) found missing from production despite being merged in PR #56-#58 — synced via `supabase/PHASE4_5_PRODUCTION_SYNC.sql`, verified live (PR #64)
- [x] `_shared/paygate.ts` — checksum build/verify + official field-order constants, shared across every paygate-* function
- [x] `paygate-initiate` edge function — authenticates caller, validates booking, calls `initiate.trans`, verifies PayGate's response checksum, stores `PAY_REQUEST_ID` + `payment_provider='paygate'`. Never touches `booking.status`. Checksum algorithm verified against PayGate's own official worked examples (byte-for-byte match); eligibility/ownership/update logic verified against real local Postgres (PR #65)
- [x] `paygate-redirect` edge function — thin auto-submit page to `process.trans`, no Supabase client/booking access at all. Verified in a real headless browser (Playwright) that the form genuinely auto-submits with zero interaction and posts exactly the 2 required fields; `Cache-Control: no-store` and hardening headers (CSP, `Referrer-Policy`, `X-Frame-Options`, `X-Content-Type-Options`) added and confirmed not to break the auto-submit (PR #66)
- [x] `paygate-notify` edge function — webhook handler, first function to call `confirm_booking_payment`. See "paygate-notify design decisions" below for the full acknowledgement policy, amount verification, and REFERENCE-authority rationale (PR #67)
- [x] `paygate-return` edge function — browser return handler, read-only/non-authoritative. See "paygate-return design decisions" below for the IDOR found and fixed during review. `query.trans` reconciliation was kept as a separate follow-up, built as `paygate-query` below (PR #68)
- [x] `paygate-query` edge function — `query.trans` reconciliation fallback for when neither notify nor return arrive. See "paygate-query design decisions" below (PR #69, draft)
- [ ] No separate cancel function planned — PayWeb3 has no `CANCEL_URL`; cancellation arrives as `TRANSACTION_STATUS` on the same return leg

#### `paygate-notify` design decisions (PR #67)

**Acknowledgement policy — "OK" means receipt, not success.** PayGate's own docs: the plain-text `OK` response is required "to acknowledge receipt," and PayGate retries up to 2 more times at 30-minute intervals if it isn't returned. `OK` is returned **only** for the three outcomes where a retry would be genuinely pointless:
| Outcome | Response |
|---|---|
| Verified, approved (`TRANSACTION_STATUS=1`), `confirm_booking_payment` succeeds | `OK` |
| Verified, non-approved status (anything but `1`) — nothing to do | `OK` |
| Verified, duplicate — `confirm_booking_payment` returns `already_resolved` | `OK` |
| Missing required fields / malformed payload | 400, non-`OK` body |
| Invalid checksum | 400, non-`OK` body |
| PayGate credentials not configured | 500, non-`OK` body |
| Booking not found for a checksum-verified `REFERENCE` | 500, non-`OK` body |
| **Amount mismatch** (see below) | 500, non-`OK` body |
| `confirm_booking_payment` RPC/DB error | 500, non-`OK` body |
| Any other unexpected `confirm_booking_payment` result (`reference_reused`, `not_found`, etc.) | 500, non-`OK` body |
| Unhandled exception | 500, non-`OK` body |

Everything in the second half of that table was originally (incorrectly) returning `OK` too, copying `payfast-itn`'s "always 200" precedent without checking whether its reasoning applied — it doesn't, for a transient failure on our own side. The RPC/DB-error case was the most serious: a real, checksum-valid, approved payment that failed to record due to a transient failure was being told `OK`, permanently losing it with no way for PayGate to ever retry. Fixed before merge, verified against real local Postgres.

**Amount verification is a mandatory security check, not optional hardening.** Before calling `confirm_booking_payment`, the function fetches the booking's own `total_price` and compares it (in cents) against the notified `AMOUNT`. A valid checksum only proves the payload genuinely came from PayGate unmodified — it says nothing about whether the amount PayGate is reporting matches what this specific booking actually costs. A mismatch is logged as a security-relevant anomaly, the RPC is never called, and the booking is left completely untouched. This is the same check `payfast-itn` already has for PayFast; `paygate-notify` was missing it entirely until this review caught it.

**`REFERENCE` is the sole authoritative booking lookup key for notify (and will be for `return`).** Once the checksum verifies (using our own known `PAYGATE_ID`, never the payload's claim of it), `REFERENCE` — always `booking.id` — is trusted and used to look up the booking. `PAY_REQUEST_ID` is intentionally **not** used to gate acceptance: we deliberately allow an older, otherwise-superseded `paygate-initiate` attempt to still complete successfully (see the known limitation below — repeated initiation is accepted, and only the latest `PAY_REQUEST_ID` is retained). Requiring the notify's `PAY_REQUEST_ID` to match our stored value would incorrectly reject a legitimate late-arriving payment from an earlier attempt. `PAY_REQUEST_ID` remains useful for the future `query.trans` reconciliation fallback, just not as a notify-acceptance gate.

**`NOTIFY_FIELD_ORDER` remains a blocking sandbox validation before live rollout.** Unlike the initiate/response/redirect checksum formulas (all confirmed byte-for-byte against official worked examples), PayGate's docs never gave a worked example for the notify checksum — only "MD5 hash calculated from all fields + key." The field order currently used (`_shared/paygate.ts`) is the Notify URL Response page's own table row order, a documented working assumption, not an independently confirmed fact. Marked `⚠️ BLOCKING PRE-LAUNCH ITEM` in code — must be confirmed against a real sandbox notify payload before any real (non-test) payment is accepted.

**Known limitation, accepted for Private Beta (2026-07-30, updated after `paygate-return`'s identity-binding fix below):** `paygate-initiate` has no protection against a booking being re-initiated while an earlier attempt is still outstanding. Concretely:
- Repeated initiation can create multiple live PayGate transaction attempts for the same booking.
- Only the most recent `paygate_pay_request_id` is retained — each retry overwrites it.
- **`paygate-notify` is unaffected**: an older, abandoned attempt that somehow still gets completed still resolves correctly, because notify looks the booking up by the checksum-verified `REFERENCE` (always `booking.id`), never by the stored `paygate_pay_request_id`. The booking gets confirmed via `confirm_booking_payment` either way.
- **`paygate-return` is affected, but only cosmetically, not for data integrity**: since `paygate-return` now looks the booking up by `paygate_pay_request_id` (see below), a return callback for an *older, overwritten* attempt won't find a match and will show the generic "processing" page — even though notify may have already confirmed the booking server-side moments earlier. The traveller's booking is still correctly confirmed; they'd just see a "check the app" message on the return page itself rather than "success", until they reopen the app.
- **`paygate-query`'s reconciliation fallback (built in PR #69) is affected in the genuinely-consequential way**: it can only query the *most recently stored* `paygate_pay_request_id`, so an older, retry-superseded attempt that somehow still gets approved by PayGate is not reconcilable via this path — unlike `paygate-return`'s cosmetic-only gap, a payment stuck in exactly this state (missed by notify, missed by return, and unreachable by query) would remain genuinely unconfirmed. See "paygate-query design decisions" below for the full reasoning.

#### `paygate-return` design decisions (PR #68)

**Identity binding — the URL's `bookingId` is never trusted or used to look up or disclose anything.** An earlier version of this function did use it, which was a genuine IDOR (found and fixed in review, before merge): anyone who knew or guessed a booking UUID could read its payment status with zero authentication. The fix inverts the trust model:
1. The booking is looked up by `paygate_pay_request_id` (from PayGate's own return callback), filtered to `payment_provider = 'paygate'` — never by the URL's `bookingId`.
2. The checksum is verified using `REFERENCE` = that resolved row's own `id` — never the URL's `bookingId`.
3. Only if both the lookup and the checksum succeed is that booking's real status ever disclosed, using its own DB-verified `id` for the deep link.
4. Every failure path (missing params, no match, more than one match, invalid checksum) converges on one identical, non-disclosing generic response.

**Why the `payment_provider` filter matters**: `paygate_pay_request_id` is only ever written by `paygate-initiate`, which always sets both fields together — today, a non-`paygate` row can never actually hold a value here. That's an invariant enforced by convention across files, not by a DB constraint, so the filter is applied explicitly rather than assumed. Verified against real Postgres with a same-value row belonging to a different provider: without the filter, both rows match; with it, only the genuine `paygate` row resolves.

**Why the lookup fails closed on ambiguity instead of using `.single()`/`.maybeSingle()`**: `paygate_pay_request_id` deliberately has no `UNIQUE` constraint (retries are meant to overwrite it — see above), so more than one row could in principle share a value. Rather than relying on exactly how the Supabase client/PostgREST happen to handle a multi-row result internally — behavior this environment has no way to execute and observe directly (no local PostgREST) — the lookup uses a plain array-returning query with an explicit length check: 0 matches → generic response, 1 match → proceed, more than 1 → logged as a security event and treated the same as no match. Verified against real Postgres with two genuine `paygate` bookings deliberately sharing one `paygate_pay_request_id`.

**A second bug found while re-verifying the IDOR fix, not by inspection**: the first patch reused one `escapeHtml()`-escaped string in both the `<a href>` HTML attribute and the `<script>` JS string literal. `escapeHtml` turns `&` into the literal text `&amp;`, which is correct for HTML but not valid inside a JS string — that would have silently corrupted the actual `cubby://` URL assigned to `window.location.href`. Fixed with a separate `escapeJsString`; confirmed via a real headless-browser test that both contexts resolve to the identical, correct, uncorrupted URL.

`query.trans` reconciliation was kept explicitly apart from `paygate-return` so the browser return path never becomes authoritative for confirming a payment — built separately as `paygate-query`, see below.
- No `UNIQUE` constraint on `paygate_pay_request_id` (unlike `payment_reference`) — deliberate, since retries are meant to overwrite it and the value is PayGate-generated, not forgeable by us. A `UNIQUE` constraint would be reasonable defense-in-depth consistency later, not a currently-exploitable gap.

#### `paygate-query` design decisions (PR #69)

**Purpose and scope.** `query.trans` reconciliation is the fallback for when *both* notify and return fail to resolve a booking — the notify webhook was dropped/never delivered, and the traveller never returned to (or closed) the browser. `POST /functions/v1/paygate-query { bookingId }` asks PayGate directly, applies the same "never trust echoed identity fields" checksum-verification principle as every other paygate-* function, and — only if the response is genuinely verified, matched, and approved — confirms the booking via `confirm_booking_payment`. It does not touch `paygate-return`, `paygate-notify`, redirect logic, refunds, or any other lifecycle transition.

**Auth — two independent, non-bypassable paths.** Either the caller presents the `x-admin-secret` header matching the `ADMIN_SECRET` secret (the same server-to-server pattern `booking-expiry-sweep` already uses for a caller with no end-user JWT — e.g. a future scheduled sweep), or a Supabase JWT whose `user.id` matches the booking's own `traveller_id`. An admin-secret match short-circuits the JWT check entirely; anything else falls through to the JWT path and its explicit ownership check. No new auth mechanism was invented — this reuses the one already-reviewed pattern in the codebase for "authorized server-side process."

**Request built entirely from server-controlled values.** `PAYGATE_ID` (env), `PAY_REQUEST_ID` (the booking's own stored `paygate_pay_request_id` — never accepted from the client), `REFERENCE` (`booking.id`). The client only ever supplies `bookingId`, which is resolved server-side and ownership-checked before anything else happens; PayGate's own `PAY_REQUEST_ID` is never client-suppliable. Uses `RESPONSE_FIELD_ORDER` for this request's checksum — the same formula the initiate response and the redirect checksum use, and per PayGate's own Query Transaction Status page, the confirmed formula for this exact request too (see `_shared/paygate.ts`).

**Response verification mirrors `paygate-notify` almost exactly**, reusing `NOTIFY_FIELD_ORDER` per the docs' explicit statement that the query response's field structure is identical to the Notify URL Response's (same not-yet-worked-example-confirmed, blocking-pre-launch caveat as `NOTIFY_FIELD_ORDER` itself). Checksum verification substitutes OUR OWN `PAYGATE_ID`, OUR OWN stored `PAY_REQUEST_ID`, and OUR OWN `REFERENCE` (`booking.id`) — never the response's own echo of them. On top of that, three explicit, structurally-redundant-but-kept comparisons — merchant ID (`PAYGATE_ID`), `REFERENCE`, and amount (booking's own `total_price` in cents vs. the response's `AMOUNT`) — must each match before anything is confirmed; unlike `paygate-notify`, where a `PAYGATE_ID` mismatch is only a non-blocking warning, here it explicitly blocks confirmation, matching the founder's requirement that mismatched REFERENCE, amount, *or merchant ID* each independently prevent confirmation for this function.

**Eligibility gate avoids unnecessary PayGate calls and makes duplicate reconciliation a safe, cheap no-op.** Before ever calling PayGate: reject if `payment_provider !== 'paygate'` or `paygate_pay_request_id` is empty (nothing to reconcile); short-circuit with `{ ok: true, alreadyResolved: true }` if `booking.status` is no longer `pending_payment`/`pending` (already resolved by notify, a previous query call, or an unrelated transition — e.g. expiry). `confirm_booking_payment`'s own guarded `UPDATE` provides a second, independent layer of the same idempotency if a race slips past the first check.

**Only `TRANSACTION_STATUS === '1'`, after every verification above passes, triggers `confirm_booking_payment`.** Declined, pending, unprocessed, malformed, checksum-invalid, and mismatched-field responses are all logged and returned as structured non-confirmations — none of them call the RPC.

**Known limitation — resolved for the confirmed case, unchanged for the "then what" case.** As documented above, this can only reconcile the booking's *most recently stored* `paygate_pay_request_id`: an older, retry-superseded initiate attempt is not reconcilable via this path, for the same reason `paygate-return`'s lookup has the same limitation — both key off this one, deliberately non-`UNIQUE` column. Unlike `paygate-return`'s limitation (which is purely cosmetic — the booking is already correctly confirmed server-side, only the return *page* shows the wrong status), an older attempt that somehow still gets approved by PayGate but is unreachable via `paygate-notify`, `paygate-return`, *and* this reconciliation path would remain genuinely unconfirmed. This is accepted as a Private Beta limitation consistent with the founder's earlier decision not to add a `UNIQUE` constraint on `paygate_pay_request_id` yet.

**Local verification performed:** checksum/field-order logic (request-checksum construction, response-checksum verification with substitution, and 6 explicit tamper/forgery scenarios — stale-checksum amount tampering, forged `TRANSACTION_STATUS` flip, cross-booking `REFERENCE` substitution, spoofed merchant ID, missing checksum, wrong encryption key) verified via a standalone Node.js script, all passing; eligibility/idempotency logic (no stored `paygate_pay_request_id`, first-time RPC confirmation, duplicate reconciliation as a safe no-op, an already-terminal booking status left untouched, `payment_reference` collision caught as `reference_reused`) verified against real local Postgres using the actual `confirm_booking_payment` definition copied verbatim from `schema.sql`, all 5 scenarios passing as expected; `tsc --noEmit` delta confirmed as the same Deno/URL-import noise category as every other new paygate-* file, no new error class; logging reviewed line-by-line — no `PAYGATE_ENCRYPTION_KEY`, no full raw PayGate response/payload, only `bookingId` plus narrow status/reason fields.

**Still requires live PayGate sandbox verification before enabling real payments**, same as every other paygate-* function: a real `query.trans` round-trip against PayGate's actual sandbox, and specifically confirmation that `NOTIFY_FIELD_ORDER` (inherited here for the response checksum) is the correct field order — this remains the one shared `⚠️ BLOCKING PRE-LAUNCH ITEM` across `paygate-notify` and `paygate-query` alike.

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
> **PR #39 merged into `main`** (merge commit `4a4ba3f`, 2026-07-07) — Sprint 4 (Private Beta Polish) is now on `main`: global error boundary, fake Cubby Runners removed, email confirmation flow verified + one real native crash fixed, admin-gated host onboarding checklist (Option B) implemented + the dashboard demo-data leak fixed, and the orphaned `bank_details` table audited (recommend-only, not dropped). Founder approved Sprint 4 and live-verified the full host onboarding flow end-to-end against the real Supabase project before merging.
>
> **PR #40 merged into `main`** (merge commit `abf2fa3`, 2026-07-07) — Sprint 5 (Final QA) is now on `main`: the admin PIN bypass fix, 4 admin screens moved onto `ADMIN_SECRET`-gated edge functions (`admin-bookings`, `admin-reviews` new; `admin-hosts` gained a `create` action), the fake Bag Runner beta flow replaced with an honest coming-soon state, the host photo upload + display pipeline fixes, and the launch-readiness audit's approved fixes: server-side ownership authorization added to `complete-booking` and `payfast-create`. Per founder direction, the same-day capacity check was implemented then fully reverted (bookings are time-based; false rejections were judged worse than no enforcement — proper overlap-based capacity is deferred to a later sprint if beta feedback justifies it), and the messaging/database RLS findings were reframed from "confirmed vulnerabilities" to open verification questions with a ready-to-run diagnostic script (`supabase/RLS_VERIFICATION.sql`), since this sandbox has no network access to the live database.
>
> **PR #41 merged into `main`** (merge commit `7aa5278`, 2026-07-08) — the two RLS fixes below (Fix 6 `hosts`, Fix 7 `bookings`) plus their client-code migrations (`verifications.tsx`, `dashboard.tsx`) and the `admin-hosts` field-allowlist change are now on `main`. **Important sequencing note:** the RLS policy drops were applied directly to the live database *during* the review, before this PR merged — meaning the code that stops depending on those policies was, for a window, live-in-database but not live-in-app. Until `admin-hosts` is redeployed and the client is rebuilt (next two manual steps), `verifications.tsx`'s badge sync and `dashboard.tsx`'s stats/activity feed should be assumed non-functional in production, not just "not yet improved." This is a known, expected, temporary state — not a new bug — but it's the reason deploy + rebuild is the single active priority right now, ahead of any of the other items below.
>
> Founder manually verified live: `notify-new-message` webhook, the `host_bank_details` RLS migration, the password reset flow, the two Sprint 3 admin edge functions (`admin-partner-applications`, `admin-support-messages`), the full Sprint 4 host onboarding flow, and the Sprint 5 admin-layout/photo-pipeline fixes end-to-end — all deployed and working.
>
> **Live RLS verification is COMPLETE (2026-07-07 → 2026-07-08), all 5 blocks of `RLS_VERIFICATION.sql` run directly against production:**
> - Block #1 (anonymous read, messages/conversations) — **safe**, 0 rows.
> - Block #2 (messaging cross-user access) — **safe**, 0 rows visible to a non-participant.
> - Block #3 (fake host creation) — **unsafe, found and fixed**. Took two fixes: "Fix 5" (the `"Hosts can manage own listing"` `FOR ALL` policy implicitly allowing self-service INSERT) wasn't sufficient alone — a second, undocumented policy (`"Admin can manage all hosts"`, added directly in the Dashboard, `USING (true)` for every role) was independently granting the same access, found via a live `pg_policies` query. "Fix 6" dropped it after migrating its one dependent (`verifications.tsx`'s verified-badge sync) onto the service-role `admin-hosts` edge function. Both applied live, re-tested, confirmed closed.
> - Block #4 (cross-user review deletion) — **safe**, no fix needed.
> - Block #5 (cross-user booking visibility) — **unsafe, found and fixed**. Same pattern as block #3: a third undocumented policy, `"Admin can view all bookings"`, let a traveller with 1 real booking see all 8 on the platform. "Fix 7" dropped it after migrating its one dependent (`dashboard.tsx`'s stats/recent-activity widgets) onto the existing service-role `admin-bookings` edge function. Applied live, re-tested (`8` → `1`), confirmed closed.
>
> Pattern worth remembering for future RLS work on this project: `schema.sql` is not authoritative on its own — three policies (`hosts`, `bookings` ×1 each found so far) were added directly in the Supabase Dashboard outside version control, all with reassuring "Admin can ..." names that actually enforced nothing (`USING (true)`), because **this project has no admin identity at the database level at all** — admin access is purely a client-side PIN with no corresponding `auth.uid()`/claim. Always cross-check `pg_policies` live against a table before trusting `schema.sql` alone.
>
> **Regression found during manual QA (2026-07-08): travellers could no longer cancel bookings.** Direct, unintended side effect of Fix 7 — `"Admin can view all bookings"` was `FOR ALL`, not just `SELECT`, and turned out to be the *only* thing granting traveller cancel-UPDATE access in production, because the correctly-scoped `"Travellers can update own bookings"` policy in `schema.sql` had never actually been applied live. Dropping the leak took cancellation down with it; the client's `cancelBooking()` never checked the update's error, so it failed silently — booking just stayed in "confirmed" instead of moving to Past. **Fix:** "Fix 8" in `schema.sql` applies the missing policy (scoped, not broad — doesn't reopen the Fix 7 leak). Not yet applied live. Lesson for future RLS work here: when dropping a `FOR ALL` policy, audit all four commands it covers, not just the one the investigation was originally about.
>
> **Production consistency check — CLOSED (2026-07-08).** All four items resolved and founder-verified live: `admin-hosts` redeployed with `owner_is_verified`; "Fix 8" applied (traveller booking cancellation confirmed working again); client app rebuilt/redeployed with merged `verifications.tsx`/`dashboard.tsx`; full manual verification pass (admin verification badge sync, admin dashboard stats, host creation/assignment, booking visibility, traveller cancellation) all confirmed clean.
>
> **EAS build pipeline — VERIFIED AND COMPLETE (2026-07-12).** `eas.json` created with development/preview/production profiles, Expo account + project linked (`extra.eas.projectId` in `app.json`), preview profile builds for iOS Simulator (no Apple Developer account needed). A real build was run end-to-end and confirmed "Finished" on the Expo dashboard. Merged via PR #43 and PR #44. **No further work planned unless a genuine bug appears.**
>
> **Sentry crash reporting — VERIFIED AND COMPLETE (2026-07-12).** `@sentry/react-native` wired into `app/_layout.tsx` (`Sentry.init` + `Sentry.wrap` around the root component), `src/lib/error-logging.ts` (web `error`/`unhandledrejection` listeners + native `ErrorUtils` handler), and `src/components/ErrorBoundary.tsx` (`componentDidCatch`) — all alongside the existing `console.error` calls, not replacing them. DSN supplied via `EXPO_PUBLIC_SENTRY_DSN` in the founder's local `.env` (documented in `.env.example`). A live test error was triggered and confirmed received in the Sentry dashboard. Merged via PR #43. **No further work planned unless a genuine bug appears.**
>
> **Auth configuration — VERIFIED AND COMPLETE (2026-07-13).** Supabase email confirmation turned ON (Authentication → Providers → Email). Redirect URL allow-list populated with `cubby://reset-password` and `cubby://payment-result` (Authentication → URL Configuration), plus the local web dev-server origin used for browser testing. Full live password-reset round trip founder-verified: reset email arrived, the link opened Cubby's reset-password screen correctly, and the new password was successfully set and used to log in. **No further work planned unless a genuine bug appears.**
>
> **App identity review — COMPLETE (2026-07-13).** Founder reviewed and approved app name (`Cubby`), slug (`cubby`), iOS bundle identifier (`com.cubby.app`), version (`1.0.0`), EAS-managed build numbers, app icon, splash screen, and deep-link scheme (`cubby://`) unchanged. Two gaps found and closed:
> 1. **Android package identifier** was completely unset in `app.json` — added `"android.package": "com.cubby.app"` to match iOS.
> 2. **`extra.eas.projectId`** existed only in the founder's local, uncommitted `app.json` — never in the repo. Confirmed via `npx eas-cli@latest init --non-interactive` on the founder's machine (`Project already linked (ID: 3982a56f-c3a1-4f7e-9f9c-8ce56aacbfb7)`) and committed to `app.json` so the EAS↔Expo-account link is now version-controlled and consistent across any machine.
>
> **Android app identity — COMPLETE (2026-07-14).** `android.package` set to `com.cubby.app`. `ITSAppUsesNonExemptEncryption: false` added to iOS. Android permissions explicitly limited to `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` only — no unused/hypothetical permissions requested (an initial `RECORD_AUDIO` addition was caught and removed since Cubby has no audio feature). Merged via PR #46 and PR #47, each independently sanity-checked (bundle re-verified clean, diff scope confirmed, TypeScript error count confirmed unchanged vs. `main` before merging).
>
> **Android Google Maps — CONFIGURATION COMPLETE, FINAL DEVICE VERIFICATION PENDING (2026-07-15):**
> - ✅ Build pipeline verified — `npx eas-cli@latest build --profile preview --platform android` run end-to-end, "Build finished" confirmed.
> - ✅ Google Maps API key configured — real key committed to `app.json` (PR #48), placeholder removed.
> - ✅ API restrictions verified — key restricted in Google Cloud to Maps SDK for Android only.
> - ✅ EAS Android build successful — confirmed via terminal output and Expo dashboard.
> - ✅ APK generated successfully — downloaded and confirmed installable (Appetize.io accepted and ran it up to the point of a connection drop).
> - ✅ Android signing credentials verified — EAS-managed production keystore generated, SHA-1 fingerprint (`CD:1A:38:2C:91:13:82:8B:BA:6F:F1:B1:A1:59:B1:D9:B5:D4:00:83`) retrieved via `eas credentials` and used to complete the key's Application restriction (`com.cubby.app` + this exact certificate).
> - ⏳ On-device visual map rendering still pending — no physical Android device was available to test, and Appetize.io's free-tier browser emulator failed to maintain a connection on two attempts (unrelated infrastructure issue, not an app problem). **This is configuration-complete, not verification-failed or verification-incomplete-due-to-app-issues** — every piece that can be checked without a real device has been checked and is correct. The one remaining step is a five-minute visual confirmation on any real Android phone (or a properly configured Android Studio emulator with a Google Play system image) whenever one becomes available: install the APK, open the Explore screen, confirm map tiles and host pins render.
> - **Not a Private Beta launch blocker** — the configuration work is done correctly and is not expected to need any further changes; this is purely an outstanding visual confirmation step.
>
> **Apple Developer Program — ENROLLMENT SUBMITTED, AWAITING APPROVAL (2026-07-15):**
> - ✅ Founder enrolled as an individual developer — application submitted.
> - ⏳ Awaiting Apple's approval — external dependency, timeline outside our control.
> - 🚫 **Not an active blocker requiring work from us while pending.** Nothing to do here until the approval email arrives. Do not attempt to accelerate or work around this.
> - **When approval arrives, next up:** App Store Connect setup → TestFlight configuration → iOS production builds → internal beta distribution.
>
> **Google Play Developer account — COMPLETE (2026-07-16).** Account created and active. No longer a launch blocker — Android distribution/submission path is now unblocked, both via direct APK sideload (already proven working) and, once needed, the Play Console internal testing track / public listing.
>
> **External platform status summary:**
> - ✅ Google Play Developer account — created and active
> - ⏳ Apple Developer Program — enrollment submitted, awaiting Apple's approval (external, non-blocking, no action needed from us)
> - ⏳ PayFast merchant account — not yet created (external, non-blocking, no action needed from us until submitted)
>
> **Booking lifecycle redesign — IN PROGRESS, Phase 1 of 7 (2026-07-20).** A full audit found the live PayFast flow bypasses host acceptance entirely (payment settles immediately, booking jumps straight to `confirmed`, no host approval gate exists), and that cancellations/declines have no refund tracking or honest user messaging. Also found and closed: `schema.sql` had drifted from the live database (5 payment/completion columns existed live but were undocumented) — verified directly against production, not assumed. Redesigned as a 7-phase, PR-sized rollout (see `PROJECT_MASTER_PLAN.md` history / session record for full design): new `awaiting_host_confirmation` → `confirmed`/`declined`/`expired` states, manual-refund tracking, all financially-meaningful transitions (accept/decline/cancel/expire/mark-refunded) moved to authenticated, idempotent server-side functions rather than direct client writes. Along the way, found the existing admin authentication pattern (`EXPO_PUBLIC_ADMIN_SECRET`, bundled into the client) is a real, pre-existing security exposure — not fixed project-wide in this work, but the new `admin-mark-refunded` function will use a proper server-verified `profiles.is_admin` check instead of extending that pattern.
> - ✅ **Phase 1 complete:** schema migration (7 new lifecycle columns + `refund_status` check constraint + `profiles.is_admin`, all additive/nullable), `schema.sql` synced with live database, defensive frontend fixes in `bookings.tsx` and `requests.tsx` so bookings in the new states won't disappear from either traveller or host booking lists.
> - ✅ **Phase 2 complete:** dormant `awaiting_host_confirmation` card, display-only countdown, and stubbed Accept/Decline on the host Requests screen — no writes, no edge function calls.
> - ✅ **Phase 3 complete:** dormant `awaiting_host_confirmation` card, countdown, PIN withholding, and stubbed Cancel on the traveller Bookings screen — same discipline as Phase 2.
> - ✅ **Phase 4 complete (implementation; live deployment/verification is a founder manual step — see PR):** six Postgres `SECURITY DEFINER` functions are now the sole way a booking can move out of `awaiting_host_confirmation` — `accept_booking`, `decline_booking`, `cancel_awaiting_booking`, `expire_overdue_booking` (the one shared expiry implementation), `check_booking_expiry` (its ownership-checked client wrapper), and `mark_refunded`. Accept/decline both guard on `host_response_deadline > now()` in addition to status, making the deadline authoritative rather than dependent on sweep timing. `expire_overdue_booking`'s `EXECUTE` is restricted to `service_role` — a normal client can only reach it through `check_booking_expiry`'s ownership check. A new `booking-expiry-sweep` Edge Function orchestrates the scheduled batch sweep (calls the RPC, sends best-effort notifications per row) but contains no transition logic of its own. All of this was tested against a real local Postgres instance before being proposed as a migration — including two separate genuinely-concurrent races (decline vs. cancel, and cancel vs. expire) on the same row, both confirming Postgres's own row-locking serializes the write correctly with no custom locking code, and that only one of the three ever sets `refund_status = 'pending_manual'` for a given booking. (Decline vs. expire wasn't separately race-tested — their deadline guards, `> now()` vs. `<= now()`, are mutually exclusive by construction, so there's no instant at which both could plausibly be eligible for the same row; correctness there rests on the same row-lock mechanism already proven twice, not on a third empirical test.) **Still dormant**: the Phase 2/3 UI buttons are not wired to these functions yet, and `payfast-itn` still produces `confirmed` directly (Phase 5).
> - ✅ **Phase 5 complete (implementation; live deployment/verification is a founder manual step — see PR):** `payfast-itn` no longer transitions a successful payment straight to `confirmed` — it calls the new `confirm_booking_payment` RPC, which transitions `pending_payment → awaiting_host_confirmation` and sets `host_response_deadline = now() + 30 minutes` (Private Beta value, defined in exactly one place) atomically with the payment fields. `paid_at` uses the database clock rather than a PayFast-supplied timestamp — confirmed against PayFast's own documented ITN parameters and their reference WHMCS integration that no such field exists in the payload. A new `payment_reference` uniqueness constraint catches a reference already attached to a different booking as an explicit `reference_reused` outcome. The Phase 2/3 dormant UI is now wired: host Accept/Decline call `accept_booking`/`decline_booking`, traveller Cancel calls `cancel_awaiting_booking`, and both screens defensively call `check_booking_expiry` when a local countdown reaches "ended" — every call branches on the full set of structured outcomes and refetches from the database afterward rather than assuming success. Traveller-facing decline/expiry copy now says the refund is "queued for processing" rather than "you'll be refunded," matching that refunds stay manual through Private Beta. Verified locally against real Postgres (payment confirmation success/duplicate/stale/not-found/reference-collision, the 30-minute interval, and the restricted-grant security check) — no live Supabase credentials in this environment, so the UI wiring itself is verified by type-checking, a clean bundle, and browser screenshots, not a live end-to-end RPC call.
> - ✅ **Phase 5b — legacy Peach payment paths hardened (2026-07-21, same PR #58, still pre-merge):** founder review of Phase 5 asked for a repo-wide check for any other payment-time or pre-acceptance PIN exposure. Found three more direct-write, diverging payment-success paths beyond the already-fixed `payfast-itn`: `payment-webhook` (legacy Peach server-to-server webhook — wrote `status: 'confirmed'` directly and sent a `booking_confirmed` email including `pin_code`, the same premature-PIN pattern already removed from `payfast-itn`), `payment-result` (legacy Peach browser-redirect handler — wrote `status: 'confirmed'` directly, no PIN/email of its own), and two regressions Phase 5 itself introduced in the *active* PayFast flow: `payfast-return` and `payfast-page` both still checked `status === 'confirmed'` to detect a successful payment, which can now never be true immediately after payment (a successful ITN produces `awaiting_host_confirmation`), so a real successful payment would show "Processing…" indefinitely on the return page and incorrectly fail the "already paid" shortcut on the payment-form page. All four fixed:
>    - `payment-webhook` and `payment-result` now both call the same `confirm_booking_payment` RPC `payfast-itn` uses, instead of writing to `bookings` directly — per the founder's explicit direction not to just narrow the guard or drop the email, but to have every payment webhook share one authoritative transition. The RPC gained a third parameter, `p_payment_provider TEXT DEFAULT 'payfast'` (default preserves `payfast-itn`'s existing 2-arg call unchanged), so a Peach payment is correctly labelled `payment_provider = 'peach'` rather than being mislabeled `'payfast'` by a shared default. The `pending_payment`-only guard was **not** widened to also accept legacy `pending`: verified via grep that the only live booking-creation path (`app/(traveller)/booking.tsx`) has only ever been observed to create `pending_payment` bookings, and nothing in the app invokes `create-payment` (the Peach-side booking creator) anymore.
>    - The `booking_confirmed` email (with `pinCode: booking.pin_code`) that `payment-webhook` used to send at payment time is gone, same reasoning as the `payfast-itn` fix: the host hasn't accepted yet, so revealing the PIN here would let a traveller use it before the host ever agreed to the booking.
>    - Notification logic was extracted from `payfast-itn` into a new shared module, `supabase/functions/_shared/awaiting-host-notifications.ts`, so `payment-webhook` and `payment-result` reuse the exact same "payment received, waiting on host" notifications rather than each growing their own copy that could drift. `payment-result` sends them too (not just `payment-webhook`): the two legacy Peach paths can race for the same booking in either order (the webhook is server-to-server and generally reliable, the redirect handler is a browser hit that may never arrive), so whichever one's RPC call actually performs the transition is responsible for notifying — the other resolves to `already_resolved` and stays silent, so nothing is ever double-sent, but also nothing is silently dropped if the webhook alone can't be relied on.
>    - Comprehensive repo-wide re-search for every place that sets a booking to `confirmed`, sends `booking_confirmed`, or reads/sends `pin_code`, after the fix: the only remaining `status: 'confirmed'` write outside these payment paths is the pre-existing legacy `updateStatus()` function in `app/(host)/requests.tsx` (a direct host-side accept/decline path for the old `pending` status, predating Phase 2's RPC wiring) — it's a host explicitly accepting, not a payment-time or pre-acceptance transition, and its notification body doesn't include the PIN value itself, only "check your bookings for the PIN." No remaining call site anywhere sends the `booking_confirmed` email (the `tmpl_booking_confirmed` template in `send-email/index.ts` is now unreferenced, tracked as dead code until item #5 below builds a real accept-time trigger for it). `send-email`'s Database Webhook handler only reacts to `status → 'cancelled'`, never `'confirmed'`, so there's no automatic email path either.
>    - Both legacy files are documented in-line as defensive hardening of endpoints whose live external registration with Peach cannot be verified from this development environment — kept working rather than deleted, but no longer able to diverge from the shared lifecycle.
>    - Re-verified locally against real Postgres: the original Phase 5a `confirm_booking_payment` suite (success/duplicate/stale/not-found/reference-collision/30-minute-interval/restricted-grant) re-run unchanged against the new 3-arg signature (2-arg calls still resolve via the default), plus new tests for the 3-arg `p_payment_provider` path — default-vs-explicit labelling, and two Peach-style callers racing the same booking (second call correctly gets `already_resolved` with the original label, reference, and deadline all untouched, never relabelled or reset by the second/stale call).
>    - **Outstanding, not yet done by Claude — founder action required:** the `payment_reference` uniqueness constraint's pre-flight diagnostic query (see the comment above `ALTER TABLE bookings ADD CONSTRAINT bookings_payment_reference_unique` in `supabase/schema.sql`) has **not been run against live data**. There are no live Supabase credentials in this development environment, so this cannot be checked here. Please run it against production before this migration is applied, and report back whether it returns any rows (a duplicate `payment_reference` would make the `ALTER TABLE` fail).
> - ✅ **Phase 5g — payment_provider allowlist (2026-07-21, same PR #58, still pre-merge):** founder asked that `p_payment_provider` not trust an arbitrary string from whichever Edge Function calls `confirm_booking_payment`. Added `bookings_payment_provider_check` — a `CHECK (payment_provider IS NULL OR payment_provider IN ('payfast', 'peach'))` constraint on the column itself, not just an in-function `IF` — so the enforcement point is the same regardless of which caller (or future direct write bypassing the RPC entirely) tries to set it, the same defense-in-depth shape as the guarded UPDATE + restricted GRANT already used everywhere else. The two allowed values are the complete set actually ever written anywhere in the codebase, confirmed by grep across `supabase/functions` and `app/` (not assumed). `confirm_booking_payment`'s `EXCEPTION` block gained a `WHEN check_violation` branch returning a structured `{ok: false, reason: 'invalid_provider'}`, matching the existing `unique_violation → reference_reused` pattern, so a bad value comes back as a clean outcome rather than an unhandled Postgres error reaching the Edge Function. Verified locally against real Postgres: valid values (default `'payfast'` and explicit `'peach'`) still transition correctly; an unrecognised value (`'stripe'`) is rejected with no transition and no partial write, and the same booking can be retried successfully afterward with a valid value; a direct `UPDATE bookings SET payment_provider = 'bogus'` (bypassing the RPC entirely) is also rejected, confirming the constraint protects at the column level, not just through this one function; `NULL` remains allowed for pre-payment rows. The original Phase 5a suite was re-run once more against this final version of `schema.sql` and still passes unchanged.
> - ✅ **Admin authentication hardening (2026-07-21, PR pending — see `claude/admin-server-side-auth` branch, not yet merged):** grew out of the Private Beta readiness audit. Founder's call after seeing exactly what the client-side admin PIN protected (every host's real bank account number/branch code, all user PII, the ability to approve/reject identity verification and delete reviews platform-wide): retire it entirely rather than accept the risk short-term. `EXPO_PUBLIC_ADMIN_PIN` and `EXPO_PUBLIC_ADMIN_SECRET` — both bundled into the shipped app/web JS by the `EXPO_PUBLIC_` prefix, extractable by anyone who inspected the bundle — no longer exist anywhere on the client. Full design:
>   - New Edge Function `verify-admin-pin`: `POST {pin}` checks the submitted PIN against a server-only `ADMIN_PIN` secret via constant-time comparison of SHA-256 digests (never a raw string `===`, which is neither constant-time nor length-safe), rate-limited at 5 failures/15 minutes server-side (unbypassable by clearing local storage, unlike the old client-only lockout), and on success issues a random 32-byte opaque session token — only its SHA-256 hash is ever stored, in a new `admin_sessions` table. `DELETE` on the same function revokes a session (hard delete, so a revoked token and a never-issued one are indistinguishable — no separate "revoked" flag to leak state through).
>   - Rate limiting keys on the client IP extracted from `cf-connecting-ip` first, then the *last* hop of `x-forwarded-for` (the entry closest to Supabase's own edge, harder to spoof than the first entry a client supplies directly) — falls back to one shared `'unknown'` bucket rather than skipping rate limiting entirely if neither header is present. Documented in `_shared/admin-session.ts` as best-effort: this assumes Supabase's production edge network is what's actually setting these headers, which hasn't been independently confirmed from this environment. The 5-attempt cap itself is what actually bounds the damage even if attribution turns out to be imperfect.
>   - Session validation logic lives in exactly one place — `supabase/functions/_shared/admin-session.ts`'s `requireAdminSession` — imported by all 7 `admin-*` Edge Functions (`admin-hosts`, `admin-bookings`, `admin-bank-details`, `admin-reviews`, `admin-users`, `admin-partner-applications`, `admin-support-messages`) rather than seven near-copies that could drift. Missing header, malformed header, unknown token, and an expired-but-still-present row all return the identical `{ok: false}` → generic 401, so nothing about the response can be used to probe whether a given token used to be valid.
>   - Session lifetime locked at 60 minutes for Private Beta (`SESSION_TTL_MS`, the one place it's defined). The client (`src/lib/admin-auth.ts`) stores the token and the expiry the server reported, but `checkAdminSession()` — the gate `app/(admin)/_layout.tsx` uses — is explicitly documented as a fast local UX check only, not the security boundary: a tampered local expiry can make the UI wait longer before hitting a call the server rejects anyway, never grant an extra action. Every real admin action still validates server-side via `adminFetch()`, the one function now responsible for attaching `Authorization: Bearer <token>` to every `admin-*` call — no screen builds that header by hand anymore.
>   - Two discovered, necessary adjacent fixes, both flagged rather than silently folded in: (1) `verifications.tsx` called `send-push` directly from the client using `EXPO_PUBLIC_ADMIN_SECRET` — `send-push` now also accepts a valid admin session token as one of its auth methods (alongside its existing server-to-server `x-admin-secret` path, unchanged, and the Supabase-JWT path already used elsewhere). (2) `src/lib/review-service.ts` — unrelated to the admin panel, called by any traveller/host submitting a review — also sent `EXPO_PUBLIC_ADMIN_SECRET` to `send-email` directly; `send-email`'s direct-call path now also accepts the caller's own Supabase JWT (always available there, since submitting a review requires being signed in), rather than a server secret it was never appropriate for a client to hold.
>   - **Deployment requirement, not yet done — blocks this from working live:** `Authorization: Bearer <token>` now carries an opaque session token, not a Supabase-signed JWT. All 7 `admin-*` functions plus `verify-admin-pin` must be (re)deployed with `--no-verify-jwt`, or Supabase's own gateway will reject the token before the function code (and its real check) ever runs. `admin-users.tsx` and `manage-hosts.tsx`/`verifications.tsx` previously sent the anon key as a second `Authorization: Bearer` value specifically to satisfy gateway JWT verification — that workaround is now removed, since the header has a new job.
>   - Verified locally: default-deny RLS on both new tables confirmed against a real Postgres instance (`authenticated` role denied read/write on both; `service_role`, which is what every Edge Function runs as, unaffected); the exact rate-limit `COUNT` query logic confirmed to lock at the 5th failure and not before, bucket per-IP correctly, ignore attempts outside the 15-minute window, and not count successes toward the failure tally; session lookup confirmed to distinguish valid/expired/never-issued exactly as `requireAdminSession` expects; revocation and opportunistic cleanup both confirmed to remove the right rows and nothing else. The SHA-256 + constant-time-compare logic itself was sanity-checked in Node (same underlying Web Crypto API Deno uses) against all 10,000 possible 4-digit PINs with zero hash collisions. `tsc --noEmit` diffed clean against the pre-change baseline — zero new error categories anywhere, and genuinely zero errors (not just the usual Deno-noise class) across every touched client file. Repo-wide grep after implementation confirms zero remaining `EXPO_PUBLIC_ADMIN_PIN`, `EXPO_PUBLIC_ADMIN_SECRET`, or client-side `x-admin-secret` references — the `x-admin-secret` references that do remain in `supabase/functions/` are all legitimate server-to-server usage (`ADMIN_SECRET` read from `Deno.env`, e.g. `booking-expiry-sweep`, `complete-booking`, `_shared/awaiting-host-notifications.ts`), unrelated to and unaffected by this change.
>   - **Cannot be verified from this environment — live test required before merge:** full login (correct PIN), lockout (5 wrong attempts → 429, 6th still blocked, unlocks after the window), an authenticated admin action actually succeeding end-to-end, session expiry after 60 minutes, and logout actually revoking the session (a reused token after logout must be rejected). None of this touches money or an existing user-facing flow, but it's the one thing standing between "should work" and "does work" for the mechanism gating host bank details.
>   - This also resolves the long-standing Technical Debt entries "Admin sessions stored in LocalStorage only" and "Supabase credentials in source" (the `ADMIN_SECRET` half of it) elsewhere in this document — those sections haven't been individually edited to reflect that, flagged here so a future reconciliation pass catches it.
> - ⏳ **Phases 6-7 not started.**
>
> **Next launch blocker after the booking lifecycle work: awaiting founder direction.** Remaining candidates for parallel work: ToS acceptance gate at signup, push notification production credentials, the still-open `profiles` RLS question, Sprint 5 minor bugs (route collisions, `host-detail.tsx` dead end, bag count buttons), admin edge function deployment confirmation, notification DB schema confirmation, email notification system, and the pre-existing admin-auth exposure noted above. Do not begin any of these until the founder explicitly names the next priority.
>
> Remaining known manual items before Private Beta:
> 1. Decide whether to drop the orphaned `bank_details` table (see Sprint 4 audit note) — recommend dropping after confirming it holds no live data
> 2. Once PayFast is actually configured: run a dedicated payment QA sprint (see Payment QA Checklist in Final QA section) — explicitly deferred until real transactions are possible
> 3. Follow up on the flagged-but-unverified `profiles` RLS question in `verifications.tsx` (see Final QA section row above) — same live-`pg_policies` method as blocks #3/#5
> 4. **Align the `bookings` RLS policy with `assigned_user_id`** (found during Phase 4 review, 2026-07-20): `"Hosts can update bookings for their listing"` in `schema.sql` only checks `hosts.user_id`, matching the same class of gap already found and fixed on `host_bank_details` (Sprint 3) and `hosts` itself — an admin-assigned host (`assigned_user_id`, no `user_id`) is silently blocked from any RLS-only update to a booking they own. Not a Phase 4 blocker: all six new `SECURITY DEFINER` functions perform their own ownership check internally (verified working for both `user_id` and `assigned_user_id` hosts) and don't depend on this policy at all. But any *future* direct-write code path that relies on this RLS policy alone — rather than going through the trusted functions — would inherit the gap. Fix by the same pattern as Sprint 3's `host_bank_details` fix: `DROP POLICY` + recreate with `host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid() OR assigned_user_id = auth.uid())`.
> 5. **Send a real "booking confirmed" email (with PIN) at accept time** (found during Phase 5 implementation, 2026-07-20): `payfast-itn` used to send this email itself at payment time, but now that payment only moves a booking to `awaiting_host_confirmation`, sending it then would reveal the drop-off PIN before the host has actually accepted — removed for that reason, not by oversight (see `payfast-itn/index.ts`'s `sendAwaitingHostNotifications`). The traveller still gets an in-app + push notification when the host accepts (`travellerAccepted` copy), so they're not left with no signal, but the email parity gap is real: sending a proper confirmation email at accept time needs its own small server-side trigger, since the client can't call `send-email` directly (no secret embedded in the app) — the same shape of problem the Phase 4 expiry sweep solved for notifications. Deliberately left out of Phase 5 to keep that diff scoped to the payment transition itself.
> 6. Everything else in the Private Beta / Public Beta checklists below
>
> **Edge function deploy commands** (run from `cubby/`, requires Supabase CLI logged in and linked to the project):
> ```
> supabase functions deploy admin-bookings
> supabase functions deploy admin-reviews
> supabase functions deploy admin-hosts
> supabase functions deploy complete-booking
> supabase functions deploy payfast-create
> ```

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
| ~~Admin PIN only gated `dashboard.tsx` — every other admin screen was reachable by direct URL with zero session check~~ | ✅ Fixed (Sprint 5) | `app/(admin)/_layout.tsx` |
| ~~4 admin screens (all-bookings, revenue, reviews, create-host) had no `ADMIN_SECRET` gating at all, querying/writing Supabase directly from the client~~ | ✅ Fixed (Sprint 5) | `app/(admin)/all-bookings.tsx`, `revenue.tsx`, `reviews.tsx`, `create-host.tsx`, new `admin-bookings`/`admin-reviews` edge functions, `admin-hosts` `create` action |
| ~~"Bag Runner" signup role led to a fully fake, hardcoded earnings/deliveries dashboard~~ | ✅ Fixed (Sprint 5) | `app/(auth)/signup.tsx`, `app/(runner)/dashboard.tsx`, `deliveries.tsx`, `earnings.tsx` |
| ~~Traveller booking cancellation silently stopped working — regression from Fix 7 dropping the `FOR ALL` policy that was accidentally the only thing granting cancel-UPDATE access~~ | ✅ Fixed & founder-verified live 2026-07-08 — cancelled booking correctly moves to Past | `app/(traveller)/bookings.tsx`, `supabase/schema.sql` |
| `cancelBooking()` in `bookings.tsx` never checks the update call's error — any future RLS/permission failure on cancellation will fail silently again the same way | 🟡 Low, related but not fixed (out of scope of the Fix 8 regression fix — flagged for a future small hardening pass) | `app/(traveller)/bookings.tsx` line ~80 |
| Route collisions: `chat.tsx`, `dashboard.tsx`, `messages.tsx`, `notifications.tsx`, `reviews.tsx`, `review-detail.tsx`, `login.tsx` each exist in 2-3 route groups and resolve to the wrong role's screen on a bare URL/refresh | 🟡 Medium (found Sprint 5, not yet fixed) | 7 filenames across `app/(traveller)`, `app/(host)`, `app/(admin)` |
| `host-detail.tsx` shows a permanent loading skeleton (never an error) for a bad/deleted host ID | 🟠 Medium (found Sprint 5, not yet fixed) | `app/(traveller)/host-detail.tsx` |
| Push notification taps don't deep-link anywhere — no response listener exists | 🟠 Medium (found Sprint 5, not yet fixed) | `src/lib/notifications.ts` |
| Default Expo Router 404 page is unstyled (black background), inconsistent with the rest of the app | 🟢 Low (found Sprint 5, not yet fixed) | Expo Router default (no `+not-found.tsx` override) |
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
