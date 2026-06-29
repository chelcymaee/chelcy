# CUBBY — PROJECT MASTER PLAN
> Single source of truth for all development, product decisions, and launch planning.
> Last updated: 2026-06-29

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
| Core Platform | 78% | Auth, profiles, navigation solid. Dead-end screens remain. |
| Marketplace | 72% | Booking + payment loop works. Search, discovery weak. |
| Operations | 35% | Admin screens exist but are disconnected. No operational workflow. |
| Trust & Safety | 20% | Verification is UI-only. No ToS. No claims process. |
| Communications | 60% | In-app messaging done. Transactional email V1 done (Resend). Push = partial. |
| Launch Readiness | 45% | Cannot yet be put in front of real users safely. |
| **Overall** | **~62%** | Solid MVP foundation. 6–8 focused weeks to beta. |

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

### Payments
- [x] Full Peach Payments integration (hosted checkout)
- [x] Payment webhook handling with HMAC signature verification
- [x] Booking status update on payment success/failure
- [x] Host payout via Peach Payments payout API
- [x] 70/30 split calculation (host/Cubby)
- [x] `payout_status`, `payout_id`, `host_payout_amount`, `cubby_amount` on bookings

---

## 🟡 IN PROGRESS / PARTIALLY COMPLETE

### Operations Centre (Phase 1 — CURRENT PRIORITY)
Admin dashboard redesign into a unified operations hub. Currently the admin screens exist but are disconnected — no consistent navigation, no operational workflow for running the business day-to-day.
- Current screens: login, dashboard, manage-hosts, create-host, host-payouts, all-bookings, revenue
- Missing screens: partner application review, support message viewer, verification review, activity feed, traveller management
- See Phase 1 spec below.

### Push Notifications (backend wiring incomplete)
- `notify-new-message` Edge Function is built
- DB webhook in Supabase **not yet connected** — the function exists but is never triggered
- Booking event notifications (confirmed/declined/cancelled) not built
- Phase 2 of notification system not started

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

### Maps
- Native: `react-native-maps` integration partially working
- Web: `HostMap.web.tsx` stub — no functional map on web
- No Google Maps API key in `app.json`
- No map on host detail page

---

## 🔴 NOT STARTED

### Critical (blockers for any real users)
- [ ] Terms of Service acceptance screen at signup (no legal agreement captured)
- [ ] Password reset / forgot password flow (Supabase supports it, UI missing)
- [ ] Email confirmation re-enabled in Supabase (disabled for dev, must re-enable before launch)
- [ ] Admin PIN default must error if env var not set (currently defaults to '1234')
- [x] Verification backend (`verifications` table SQL provided, admin review queue built, `is_verified` updated on approve/reject)
- [ ] Dead-end screens: `safety.tsx`, `language.tsx`, `payment-success.tsx`, `payment-failed.tsx`

### Booking Events — Notifications
- [ ] Notification when booking is confirmed (most important notification in the product)
- [ ] Notification when booking is declined
- [ ] Notification when booking is cancelled (by traveller or host)
- [ ] Notification when payment succeeds / fails
- [ ] Drop-off reminder (1 hour before)
- [ ] Pick-up reminder (1 hour before)

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
`bank_details` (keyed by `user_id`) and `host_bank_details` (keyed by `host_id`) both exist. The `complete-booking` edge function uses `bank_details` (old pattern). The admin payouts screen uses `host_bank_details` (new pattern). A host who sets up bank details via the admin panel will have their payout fail silently because `complete-booking` looks in the wrong table. This is an active payout bug.

**Admin PIN defaults to '1234'**
`EXPO_PUBLIC_ADMIN_PIN` falls back to `'1234'` in code. Any deployment that doesn't set this env var exposes the admin panel with a trivially guessable PIN. Must throw at startup instead of defaulting.

**Email confirmation disabled**
Supabase email confirmation was turned off during development. Users can sign up with any email address. This must be re-enabled before any real users are onboarded.

**4 navigation dead ends**
`safety.tsx`, `language.tsx`, `payment-success.tsx`, `payment-failed.tsx` are referenced in `_layout.tsx` and navigation code but do not exist as files. Tapping these links causes a crash or blank screen.

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
- [ ] Set `PEACH_PAYMENTS_TOKEN`, `PEACH_PAYMENTS_ENTITY_ID`, `PEACH_WEBHOOK_SECRET` on edge functions
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

## LAUNCH CHECKLISTS

### 🔒 Private Alpha (internal only — founder + 5 test users)
- [ ] Fix 4 navigation dead ends (safety, language, payment-success, payment-failed)
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
| 3 | Payment Failure Handling | 🔴 Dead-end screen missing |
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
| 4 navigation dead ends crash or blank on tap | 🟡 High | `app/(traveller)/_layout.tsx` |
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
