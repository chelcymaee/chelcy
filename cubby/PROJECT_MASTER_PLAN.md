# CUBBY — PROJECT MASTER PLAN
> Single source of truth for all development, product decisions, and launch planning.
> Last updated: 2026-07-03

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
| Card transitions, favourite animation | 🔲 Pending | |

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
- [x] `notify-new-message` — Expo push notification delivery (needs DB webhook wired)

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
- [ ] Terms of Service acceptance screen at signup (no legal agreement captured)
- [ ] Password reset / forgot password flow (Supabase supports it, UI missing)
- [ ] Email confirmation re-enabled in Supabase (disabled for dev, must re-enable before launch)
- [ ] Admin PIN default must error if env var not set (currently defaults to '1234')
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
- [ ] R2,000 bag coverage claims process (currently a marketing claim with no mechanism)
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

**Duplicate bank details tables**
`bank_details` (keyed by `user_id`) and `host_bank_details` (keyed by `host_id`) both exist. The admin payouts screen uses `host_bank_details`. The `complete-booking` payout API call has been removed (Peach → PayFast migration). Host payouts are now manual EFTs from Cubby's PayFast settlement; bank details are read-only in the admin payout dashboard. This partially resolves the original bug but the duplicate table structure remains technical debt.

**Admin PIN defaults to '1234'**
`EXPO_PUBLIC_ADMIN_PIN` falls back to `'1234'` in code. Any deployment that doesn't set this env var exposes the admin panel with a trivially guessable PIN. Must throw at startup instead of defaulting.

**Email confirmation disabled**
Supabase email confirmation was turned off during development. Users can sign up with any email address. This must be re-enabled before any real users are onboarded.

~~**4 navigation dead ends** — RESOLVED~~
All 4 screens (`safety.tsx`, `language.tsx`, `payment-success.tsx`, `payment-failed.tsx`) are fully implemented and registered in `_layout.tsx` with `href: null`.

### High Priority

**No error boundaries**
Zero React error boundaries in the app. A JS error anywhere propagates to a blank screen. Users have no recovery path.

**`notify-new-message` Edge Function not wired**
The function is deployed but no Supabase Database Webhook connects to it. Device push notifications are never sent.

**`complete-booking` uses wrong bank details table**
As noted above — this will silently fail for any host whose bank details are stored via the admin UI.

**Cape Town hardcoded throughout**
Location strings, search suggestions, and onboarding reference Cape Town explicitly. Multi-city expansion requires code changes.

**Mock data in production fallback paths**
`MOCK_REVIEWS` in `host-detail.tsx` shows fake reviews if Supabase returns an empty array (not just on error). Real hosts with no reviews will display fictional testimonials.

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
- [ ] Wire `notify-new-message` DB Webhook (Database → Webhooks → New → messages table, INSERT event → function URL)
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
- [ ] Terms of Service document written and hosted
- [ ] Privacy Policy document written and hosted
- [ ] ToS acceptance screen built into signup flow
- [ ] R2,000 coverage: either build a claims process or remove the claim from all screens

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
- [ ] Fix admin PIN default (error if not set)
- [ ] Fix payout bug (complete-booking → host_bank_details, not bank_details)
- [ ] Wire notify-new-message DB webhook
- [ ] Add booking event notifications (confirmed, declined, cancelled)
- [ ] Admin: Partner application review screen
- [ ] Admin: Support messages viewer
- [ ] Real phone/WhatsApp on support screen
- [ ] Remove or replace Bag Runners mock screen
- [ ] Replace MOCK_REVIEWS fallback with empty state

### 🧪 Private Beta (invite-only — 50–200 users)
- [ ] Re-enable Supabase email confirmation
- [ ] Terms of Service acceptance at signup
- [ ] Password reset / forgot password flow
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
| 5 | Booking Notifications | 🔴 Not started |
| 6 | Message Notifications | 🟡 Partial (DB trigger exists, push not delivered) |
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
| 1 | Privacy Policy | 🔴 Not started |
| 2 | Terms & Conditions | 🔴 Not started |
| 3 | Password Reset | 🔴 Not started |
| 4 | Security Review | 🔴 Not started |
| 5 | Production Testing | 🔴 Not started |
| 6 | Beta Testing | 🔴 Not started |
| 7 | App Store Submission | 🔴 Not started |
| 8 | Google Play Submission | 🔴 Not started |

### PHASE 9 — GROWTH
*Future: Referral Programme, Promo Codes, Business Accounts, Airport/Hotel/Travel Agent Partnerships, Loyalty Programme, Insurance Options.*

---

## NEXT RECOMMENDED TASK

> **Phase 1, Item 6 — Admin Notifications**
> Verification workflow is now complete end-to-end. Next: admin should be alerted in real-time when new support messages, partner applications, or verifications arrive — without manually refreshing the dashboard.
>
> Implementation order:
> 1. Real-time dashboard auto-refresh + Needs Attention live updates
> 2. Notification bell with unread badge in admin
> 3. Browser push notifications
> 4. Email alerts for critical operational events (Phase 3)

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
2. ✅ `partner-applications.tsx` — tabbed view (pending/approved/rejected), expand to review, approve/reject
3. ✅ `support-messages.tsx` — tabbed view (open/resolved), expand to read, mark resolved/reopen
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
| `complete-booking` queries `bank_details` (user_id) but admin saves to `host_bank_details` (host_id) — payouts will fail | 🔴 Critical | `supabase/functions/complete-booking/index.ts` |
| Admin PIN defaults to '1234' if env var not set | 🔴 Critical | `app/(admin)/login.tsx` |
| `notify-new-message` Edge Function exists but DB webhook not wired | 🟡 High | Supabase Dashboard |
| ~~4 navigation dead ends crash or blank on tap~~ | ✅ Fixed | All 4 screens implemented |
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
