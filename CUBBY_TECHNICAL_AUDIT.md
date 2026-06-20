# Cubby — Technical Audit & Developer Handover Document

**Generated:** 2026-06-19  
**Repository:** chelcymaee/chelcy  
**Branch:** claude/eloquent-goodall-7h3lro  
**Working Directory:** `/cubby/`  
**App Version:** 1.0.0 (pre-launch)

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native + Expo | Expo ~56.0.12, RN 0.79.2 |
| Routing | Expo Router (file-based) | ~4.0.0 |
| Language | TypeScript | ~5.3.0 |
| Backend | Supabase (Postgres + Auth + Edge Functions) | ^2.108.2 |
| Payments | Peach Payments (REST API + webhook) | N/A |
| Local Storage | AsyncStorage | ^3.1.1 |
| Maps | react-native-maps | ^1.27.2 |
| Location | expo-location | ~18.1.5 |
| Image Picker | expo-image-picker | ~16.1.4 |
| Deep Linking | expo-linking | ~7.1.4 |
| Navigation | react-navigation/native | ^7.3.3 |
| Safe Area | react-native-safe-area-context | ^5.4.0 |

**Runtime Architecture:**  
The app operates in two modes: **Supabase mode** (live backend) and **Demo mode** (AsyncStorage fallback). The flag `isSupabaseConfigured` in `src/lib/supabase.ts` controls which path is taken. Nearly every data operation has both branches. This dual-mode design is intentional for offline/demo use, but creates maintenance complexity.

---

## 2. Environment Variables

```bash
# Required in .env / EAS Secrets
EXPO_PUBLIC_SUPABASE_URL=https://gqgxahqmndkaeyuvhliv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Edge Function Secrets (set via Supabase Dashboard → Edge Functions → Secrets)
PEACH_PAYMENTS_TOKEN=Bearer <token>
PEACH_PAYMENTS_ENTITY_ID=8a8...
PEACH_WEBHOOK_SECRET=<hmac-secret>   # Optional but strongly recommended
SUPABASE_SERVICE_ROLE_KEY=<key>      # Used by delete-user-account only (server-side)
```

---

## 3. Folder Structure

```
cubby/
├── app/                          # All screens (Expo Router file-based)
│   ├── _layout.tsx               # Root layout (AuthProvider, Stack)
│   ├── index.tsx                 # Welcome / landing screen
│   ├── onboarding.tsx            # 4-slide intro carousel
│   ├── (auth)/
│   │   ├── _layout.tsx           # Auth stack wrapper
│   │   ├── login.tsx             # Email + password sign in
│   │   └── signup.tsx            # Name, email, password, role picker
│   ├── (traveller)/
│   │   ├── _layout.tsx           # Tab bar: Search | Bookings | Account
│   │   ├── explore.tsx           # Host search & browse (main screen)
│   │   ├── host-detail.tsx       # Host profile + booking entry
│   │   ├── booking.tsx           # Time picker + price breakdown + confirm
│   │   ├── booking-confirmation.tsx  # Success + PIN code display
│   │   ├── bookings.tsx          # Upcoming & past bookings list
│   │   ├── profile.tsx           # Account settings, sign out, delete
│   │   ├── review.tsx            # Write star review + comment
│   │   ├── messages.tsx          # Inbox list (stub)
│   │   ├── chat.tsx              # Chat thread (stub)
│   │   ├── runners.tsx           # Browse bag runners (stub)
│   │   ├── payment-details.tsx   # Card storage (non-functional / PCI risk)
│   │   ├── verification.tsx      # Identity verification (stub)
│   │   ├── notifications.tsx     # Push notifications (stub)
│   │   ├── safety.tsx            # Safety info (static)
│   │   ├── support.tsx           # FAQ / contact (static)
│   │   └── language.tsx          # Language picker (stub)
│   ├── (host)/
│   │   ├── _layout.tsx           # Tab bar: Dashboard | Requests | Messages | Profile
│   │   ├── dashboard.tsx         # Earnings, stats, pending requests
│   │   ├── host-profile.tsx      # Edit host listing details
│   │   ├── requests.tsx          # Incoming booking requests
│   │   ├── bank-details.tsx      # Payout bank account setup
│   │   └── messages.tsx          # Host messaging (stub)
│   ├── (runner)/
│   │   ├── _layout.tsx           # Tab bar: Dashboard | Deliveries | Earnings
│   │   ├── dashboard.tsx         # Runner overview + availability toggle
│   │   ├── deliveries.tsx        # Delivery requests (stub data)
│   │   └── earnings.tsx          # Earnings breakdown (stub data)
│   └── (admin)/
│       ├── _layout.tsx           # Slot (no Stack overlay)
│       ├── login.tsx             # PIN keypad (PIN: 2604)
│       ├── dashboard.tsx         # Stats + navigation cards
│       ├── manage-hosts.tsx      # Host CRUD
│       ├── create-host.tsx       # Create host form
│       ├── bookings.tsx          # All bookings view
│       ├── host-payouts.tsx      # Payout management
│       └── revenue.tsx           # Revenue dashboard
├── src/
│   ├── constants/
│   │   └── colors.ts             # Brand color palette
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces (Host, Booking, Review, etc.)
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client + isSupabaseConfigured flag
│   │   ├── auth-context.tsx      # AuthProvider, useAuth hook
│   │   └── mock-data.ts          # MOCK_HOSTS (8), MOCK_RUNNERS ([]), MOCK_REVIEWS ([])
│   ├── hooks/
│   │   └── useAuth.ts            # Auth state hook
│   └── components/
│       ├── HostMap.tsx           # react-native-maps map view
│       └── HostMap.web.tsx       # Web-compatible map fallback
├── supabase/
│   ├── schema.sql                # Full database schema
│   └── functions/
│       ├── create-payment/       # Peach Payments checkout creation
│       ├── payment-webhook/      # Peach webhook handler
│       ├── complete-booking/     # Host payout trigger
│       └── delete-user-account/  # Cascade user deletion (secure)
├── web/
│   └── index.html                # Web entry with global CSS pointer-events fix
├── assets/                       # Icons, splash, images
├── app.json                      # Expo config (bundle ID, permissions)
└── package.json
```

---

## 4. Navigation Structure

```
app/index.tsx               Welcome screen
  └─ app/onboarding.tsx     Onboarding carousel
       ├─ (auth)/login.tsx
       └─ (auth)/signup.tsx
            ├─ (traveller)/ [Tab Navigator]
            │    ├── Tab: explore.tsx          🔍 Search
            │    ├── Tab: bookings.tsx         🎟️ Bookings
            │    ├── Tab: profile.tsx          👤 Account
            │    └── Hidden (no tab):
            │         ├── host-detail.tsx
            │         ├── booking.tsx
            │         ├── booking-confirmation.tsx
            │         ├── review.tsx
            │         ├── messages.tsx
            │         ├── chat.tsx
            │         ├── runners.tsx
            │         ├── payment-details.tsx
            │         ├── verification.tsx
            │         ├── notifications.tsx
            │         ├── safety.tsx
            │         ├── support.tsx
            │         └── language.tsx
            ├─ (host)/ [Tab Navigator]
            │    ├── Tab: dashboard.tsx        📊 Dashboard
            │    ├── Tab: requests.tsx         📬 Requests
            │    ├── Tab: messages.tsx         💬 Messages
            │    ├── Tab: host-profile.tsx     🏠 Profile
            │    └── Hidden: bank-details.tsx
            ├─ (runner)/ [Tab Navigator]
            │    ├── Tab: dashboard.tsx        📊 Dashboard
            │    ├── Tab: deliveries.tsx       🚗 Deliveries
            │    └── Tab: earnings.tsx         💰 Earnings
            └─ (admin)/ [Slot — no Stack overlay]
                 ├── login.tsx
                 ├── dashboard.tsx
                 ├── manage-hosts.tsx
                 ├── create-host.tsx
                 ├── bookings.tsx
                 ├── host-payouts.tsx
                 └── revenue.tsx
```

**Admin Access:** Hidden entry via "v1.0.0" text at bottom of profile.tsx → (admin)/login.tsx

---

## 5. All Screens

| Screen | Path | Role | Purpose |
|---|---|---|---|
| Welcome | `app/index.tsx` | Public | Landing with Get Started / Login CTAs |
| Onboarding | `app/onboarding.tsx` | Public | 4-slide carousel product intro |
| Login | `(auth)/login.tsx` | Public | Email + password sign in |
| Signup | `(auth)/signup.tsx` | Public | Account creation with role selection |
| Explore | `(traveller)/explore.tsx` | Traveller | Search hosts by time, location, bag count |
| Host Detail | `(traveller)/host-detail.tsx` | Traveller | Host profile, reviews, bag count, book |
| Booking | `(traveller)/booking.tsx` | Traveller | Pick times, review price, confirm |
| Booking Confirmation | `(traveller)/booking-confirmation.tsx` | Traveller | PIN code + success state |
| My Bookings | `(traveller)/bookings.tsx` | Traveller | Upcoming & past bookings + cancel |
| Profile | `(traveller)/profile.tsx` | Traveller | Edit profile, sign out, delete account |
| Review | `(traveller)/review.tsx` | Traveller | Star rating + comment for host |
| Messages | `(traveller)/messages.tsx` | Traveller | Inbox list (stub — no backend) |
| Chat | `(traveller)/chat.tsx` | Traveller | Message thread (stub) |
| Runners | `(traveller)/runners.tsx` | Traveller | Browse bag runners (stub) |
| Payment Details | `(traveller)/payment-details.tsx` | Traveller | Card storage (non-functional) |
| Verification | `(traveller)/verification.tsx` | Traveller | Identity verification (stub) |
| Notifications | `(traveller)/notifications.tsx` | Traveller | Notification settings (stub) |
| Safety | `(traveller)/safety.tsx` | Traveller | Static safety info |
| Support | `(traveller)/support.tsx` | Traveller | Static FAQ / contact |
| Language | `(traveller)/language.tsx` | Traveller | Language picker (stub) |
| Host Dashboard | `(host)/dashboard.tsx` | Host | Earnings summary + pending requests |
| Host Profile | `(host)/host-profile.tsx` | Host | Edit listing details |
| Requests | `(host)/requests.tsx` | Host | Incoming booking requests |
| Bank Details | `(host)/bank-details.tsx` | Host | Payout bank account setup |
| Host Messages | `(host)/messages.tsx` | Host | Messaging inbox (stub) |
| Runner Dashboard | `(runner)/dashboard.tsx` | Runner | Status toggle + active delivery |
| Deliveries | `(runner)/deliveries.tsx` | Runner | Delivery request list (stub data) |
| Earnings | `(runner)/earnings.tsx` | Runner | Earnings breakdown (stub data) |
| Admin Login | `(admin)/login.tsx` | Admin | PIN keypad (PIN: 2604) |
| Admin Dashboard | `(admin)/dashboard.tsx` | Admin | Stats + nav cards |
| Manage Hosts | `(admin)/manage-hosts.tsx` | Admin | List, toggle, delete hosts |
| Create Host | `(admin)/create-host.tsx` | Admin | Full host creation form |
| Admin Bookings | `(admin)/bookings.tsx` | Admin | All bookings view |
| Host Payouts | `(admin)/host-payouts.tsx` | Admin | Payout management |
| Revenue | `(admin)/revenue.tsx` | Admin | Revenue dashboard |

**Total screens: 32**

---

## 6. All User Flows

### Flow 1: Traveller Books Storage (Core Flow)
```
Welcome → Signup (role: Traveller) → Explore
→ Set date / time / bag count → Browse host cards
→ Tap host card → Host Detail
→ Tap "Select no. of bags →" → Booking screen
→ Choose drop-off & pick-up times → Review price breakdown
→ Tap "Pay R{X} & confirm"
  [Supabase mode] → create-payment Edge Function → Peach checkout URL → browser redirect
                 → Peach webhook fires → booking status: confirmed, PIN generated
  [Demo mode]    → AsyncStorage save → Booking Confirmation screen
→ View PIN code → "View my bookings" → Bookings tab
```

### Flow 2: Traveller Cancels a Booking
```
Bookings tab → Upcoming tab → Booking card
→ "Cancel booking" → Confirm/Keep inline prompt
→ "Yes, cancel" → Supabase: status='cancelled' + AsyncStorage update
→ Booking moves to Past tab
```

### Flow 3: Traveller Saves a Host
```
Host Detail → Tap ❤️/🤍 heart button
→ [Supabase] Insert/delete from saved_spots table
→ [Demo] Toggle in AsyncStorage cubby_saved_spots array
→ Heart updates to filled/empty
```

### Flow 4: Traveller Leaves a Review
```
Bookings tab → Past tab → "Leave a review" (completed bookings)
→ Review screen → Pick star rating (1-5) → Select quick tags
→ Write comment → "Submit review"
→ [AsyncStorage only — NOT synced to Supabase reviews table]
→ Success message → back to Explore
```

### Flow 5: Traveller Edits Profile
```
Profile tab → "Edit ›" chip
→ Edit modal slides up → Change name / phone
→ "Save" → [Supabase] upsert to profiles table + AsyncStorage cache
```

### Flow 6: Traveller Signs Out
```
Profile tab → "Sign out" → Confirmation prompt
→ "Sign out" → supabase.auth.signOut() + clear AsyncStorage → root "/"
```

### Flow 7: Traveller Deletes Account
```
Profile tab → "Delete account" → Confirmation prompt → "Yes, delete"
→ Calls delete-user-account Edge Function (JWT-authenticated)
→ Server cascades: saved_spots → reviews → bookings → host data → profiles → auth user
→ supabase.auth.signOut() → AsyncStorage.clear() → root "/"
```

### Flow 8: New Host Signs Up
```
Signup → Role: Host or Both → Bank Details screen (required)
→ Fill: bank, account holder, account number, branch code, account type
→ "Save bank details" → Supabase: bank_details table (upsert)
→ Host Dashboard
```

### Flow 9: Host Edits Listing
```
Host Profile tab → Edit fields (name, bio, location, type, price, hours, days)
→ "Save listing" → [AsyncStorage only — not synced to Supabase hosts table]
```

### Flow 10: Host Completes a Booking
```
Host Dashboard → Pending requests → "Complete" button on booking
→ Calls complete-booking Edge Function
→ Calculates 70/30 split → Peach payout API → host bank transfer
→ Booking: status='completed', payout_id stored
```

### Flow 11: Admin Creates a Host
```
(admin)/login.tsx → PIN: 2604 → Admin Dashboard
→ "Create Host Profile" card → create-host.tsx form
→ Fill all host fields → Validate → "Create host"
→ [Supabase] INSERT into hosts table / [Demo] AsyncStorage cubby_hosts
→ Success screen → back to Manage Hosts
```

### Flow 12: Admin Deletes a Host
```
Manage Hosts → Host card → Delete button (🗑️)
→ Inline confirm "Sure? Yes / No" → "Yes"
→ [Supabase] DELETE from hosts table / [Demo] filter out from AsyncStorage
→ Host removed from list
```

### Flow 13: Onboarding (First Launch)
```
App launch → Check cubby_onboarded in AsyncStorage
→ Not set → Onboarding carousel (4 slides)
→ "Skip" or "Get started" → sets cubby_onboarded='true' → Welcome screen
→ Already set → Welcome screen directly
```

---

## 7. All Supabase Tables

### `profiles`
```sql
id uuid PRIMARY KEY references auth.users(id)
email text NOT NULL
full_name text
phone text
avatar_url text
role text DEFAULT 'traveller'   -- traveller | host | runner | both
is_verified boolean DEFAULT false
created_at timestamptz
```
**RLS:** Users can SELECT/UPDATE/INSERT their own row only.

---

### `hosts`
```sql
id uuid PRIMARY KEY
user_id uuid references auth.users(id) UNIQUE
display_name text NOT NULL
bio text
avatar_url text
location_name text
latitude float, longitude float
business_type text DEFAULT 'home'  -- cafe|hotel|hostel|guesthouse|airbnb|tour_operator|home|other
photos text[] DEFAULT '{}'
price_per_bag_per_day integer DEFAULT 60
max_bags integer DEFAULT 4
available_from text DEFAULT '08:00'
available_until text DEFAULT '20:00'
available_days text[] DEFAULT '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}'
rating float DEFAULT 0
review_count integer DEFAULT 0
response_rate integer DEFAULT 100
is_active boolean DEFAULT true
created_at timestamptz
```
**RLS:** Public SELECT; hosts manage own row.

---

### `bookings`
```sql
id uuid PRIMARY KEY
traveller_id uuid references auth.users(id)
host_id uuid references hosts(id)
drop_off_date text, drop_off_time text
pick_up_date text, pick_up_time text
bag_count integer DEFAULT 1
total_price integer NOT NULL
status text DEFAULT 'confirmed'  -- pending|confirmed|active|completed|cancelled
pin_code text NOT NULL
checkout_id text                 -- Peach Payments checkout reference
host_payout_amount decimal(10,2)
cubby_amount decimal(10,2)
payout_status text DEFAULT 'pending'
payout_id text
created_at timestamptz
```
**RLS:** Travellers SELECT/INSERT/UPDATE own bookings; hosts SELECT bookings for their listing.

---

### `reviews`
```sql
id uuid PRIMARY KEY
booking_id uuid references bookings(id)
reviewer_id uuid references auth.users(id)
host_id uuid references hosts(id)
reviewer_name text NOT NULL
rating integer CHECK (1–5)
comment text
tags text[] DEFAULT '{}'
created_at timestamptz
```
**RLS:** Public SELECT; travellers INSERT own reviews.

---

### `bank_details`
```sql
id uuid PRIMARY KEY
user_id uuid references auth.users(id) UNIQUE
bank text, account_holder text, account_number text
branch_code text
account_type text DEFAULT 'Cheque / Current'
created_at timestamptz, updated_at timestamptz
```
**RLS:** Users manage own row only.

---

### `host_bank_details`
```sql
id uuid PRIMARY KEY
host_id uuid references hosts(id)
account_holder text, bank_name text, account_number text
account_type text DEFAULT 'Cheque'
branch_code text
created_at timestamptz, updated_at timestamptz
```
**RLS:** Admin-only (FOR ALL USING true — needs tightening).

---

### `saved_spots`
```sql
id uuid PRIMARY KEY
user_id uuid references auth.users(id)
host_id uuid references hosts(id)
created_at timestamptz
UNIQUE(user_id, host_id)
```
**RLS:** Users manage own saved spots.

---

### `partner_applications`
```sql
id uuid PRIMARY KEY
name text, email text, phone text
business_name text, location text, message text
status text DEFAULT 'pending'
created_at timestamptz
```
**RLS:** Public INSERT; public SELECT (admin should tighten this).

---

### Missing Tables (not yet in schema)
| Table | Needed For |
|---|---|
| `messages` | Host ↔ Traveller in-app chat |
| `runner_profiles` | Runner listings and availability |
| `delivery_bookings` | Runner delivery orders |
| `notifications` | Push notification log |
| `partner_applications` | ✅ Added to schema (not yet in frontend) |

---

## 8. All Supabase Edge Functions

### `create-payment`
**File:** `supabase/functions/create-payment/index.ts`  
**Trigger:** Client `supabase.functions.invoke('create-payment', {...})`  
**Input:** `{ bookingId, amount, bagCount, hostName, travellerId, travellerEmail }`  
**Logic:**
1. Validates required fields
2. Reads `PEACH_PAYMENTS_TOKEN` and `PEACH_PAYMENTS_ENTITY_ID` from env
3. POST to Peach REST API `eu-prod.oppwa.com/v1/checkouts`
4. Saves `checkoutId` to `bookings` table
5. Returns `{ checkoutId, redirectUrl }` — URL opens in browser (PaymentWidgets.js)

**Status:** Functional if Peach credentials are configured. Returns error if credentials missing.

---

### `payment-webhook`
**File:** `supabase/functions/payment-webhook/index.ts`  
**Trigger:** Peach Payments POST callback after payment attempt  
**Input:** Peach webhook payload with `id` (checkoutId), `result.code`  
**Logic:**
1. (Optional) Validates HMAC x-signature header
2. Matches checkoutId to booking record
3. Success codes (000.000.000, 000.100.110, etc.) → booking status: `confirmed`, generates 4-digit PIN
4. Failure codes → booking status: `cancelled`
5. Always returns 200 (prevents Peach retry loops)

**Status:** Functional if Peach webhook is configured to hit this URL. PIN generated here AND client-side — duplication.

---

### `complete-booking`
**File:** `supabase/functions/complete-booking/index.ts`  
**Trigger:** Host taps "Complete" button on dashboard  
**Input:** `{ bookingId }`  
**Logic:**
1. Fetches booking + total_price
2. Calculates: host 70%, Cubby 30%
3. Fetches host bank details from `host_bank_details` table
4. Calls Peach payout API (bank transfer)
5. Updates booking: `status='completed'`, `payout_id`, `host_payout_amount`, `cubby_amount`, `payout_status='paid'`

**Status:** Functional if Peach payout credentials configured and host bank details exist.

---

### `delete-user-account`
**File:** `supabase/functions/delete-user-account/index.ts`  
**Trigger:** Client `supabase.functions.invoke('delete-user-account', {})`  
**Auth:** JWT required in Authorization header (validates caller identity server-side)  
**Logic:**
1. Verifies user from JWT (anon client)
2. Switches to service role client (server-side only — key never exposed to app)
3. Cascade deletes: `saved_spots` → `reviews` → `bookings` → `host_bank_details` → `hosts` → `bank_details` → `profiles`
4. Calls `auth.admin.deleteUser(userId)`

**Status:** Fully implemented. Service role key is secure (server-side only). ✅

---

## 9. Authentication Flows

### Supabase Auth (live mode)
```
supabase.auth.signInWithPassword({ email, password })
→ On success: fetch profile role from profiles table
→ Route by role:
    traveller → /(traveller)/explore
    host      → /(host)/dashboard
    runner    → /(runner)/dashboard
    both      → /(traveller)/explore (can switch via profile)

supabase.auth.signUp({ email, password })
→ Creates auth.users entry
→ Inserts row in profiles table with role
→ Route same as above

supabase.auth.signOut()
→ Clears session from AsyncStorage
→ router.replace('/')

Session persistence: AsyncStorage (auto-refresh tokens enabled)
Auth state: Managed by AuthProvider in app/_layout.tsx via onAuthStateChange listener
```

### Local / Demo Auth (Supabase not configured)
```
Signup → save user object to AsyncStorage 'cubby_local_user'
Login  → read 'cubby_local_user', compare email + password
Route  → same logic as Supabase mode
No tokens, no refresh — session lasts until AsyncStorage is cleared
```

### Admin Auth
```
Enter PIN 2604 on (admin)/login.tsx keypad
→ Correct: set AsyncStorage 'cubby_admin_session' = 'true' → dashboard
→ Wrong: shake animation + error message
Admin session persists until AsyncStorage is cleared (no expiry)
```

---

## 10 & 11. Every Button — What It Does & Data Source

### Welcome Screen (`app/index.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Get started — it's free | → (auth)/signup | None | ✅ Functional |
| I already have an account | → (auth)/login | None | ✅ Functional |

### Onboarding (`app/onboarding.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Skip | Sets cubby_onboarded, → Welcome | AsyncStorage | ✅ Functional |
| Continue (slides 1-3) | Next slide | Local state | ✅ Functional |
| Get started (slide 4) | → (auth)/signup | AsyncStorage | ✅ Functional |
| Dot indicators | Jump to slide | Local state | ✅ Functional |

### Login (`(auth)/login.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Sign in | Validate → supabase.auth.signInWithPassword or local check | Supabase / AsyncStorage | ✅ Functional |
| Sign up link | → (auth)/signup | None | ✅ Functional |
| Back / close | router.back() or → '/' | None | ✅ Functional |

### Signup (`(auth)/signup.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Role cards (4) | Select role (Traveller/Host/Both/Runner) | Local state | ✅ Functional |
| Create account | Validate → supabase.auth.signUp or local save | Supabase / AsyncStorage | ✅ Functional |
| Back to sign in | → (auth)/login | None | ✅ Functional |

### Explore (`(traveller)/explore.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Date chip | Open date/time picker modal | Local state | ✅ Functional |
| Drop-off time | Open time picker modal | Local state | ✅ Functional |
| Pick-up time | Open time picker modal | Local state | ✅ Functional |
| − / + bag buttons | Decrease/increase bag count (1 min) | Local state | ✅ Functional |
| Search / Update search | Reload hosts with filters | Supabase / AsyncStorage / Mock | ✅ Functional |
| Map toggle | Switch between list and map view | Local state | ✅ Functional |
| Host type filter chips | Filter list by business type | Local state | ✅ Functional |
| Host card | → (traveller)/host-detail?id= | None | ✅ Functional |
| Time slot in modal | Set selected time | Local state | ✅ Functional |
| Close modal (backdrop) | Dismiss time/date modal | Local state | ✅ Functional |

### Host Detail (`(traveller)/host-detail.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| ← Back | router.back() or → explore | None | ✅ Functional |
| ❤️ / 🤍 Save/Unsave | Toggle saved_spots entry | Supabase / AsyncStorage | ✅ Functional |
| − bag count | Decrease bags (min 1) | Local state | ✅ Functional |
| + bag count | Increase bags (max: host.max_bags) | Local state | ✅ Functional |
| ✏️ Write a review | → (traveller)/review?hostId=&hostName= | None | ✅ Functional |
| Select no. of bags → | → (traveller)/booking?hostId=&bagCount= | None | ✅ Functional |

### Booking (`(traveller)/booking.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| ← Back | router.back() or → explore | None | ✅ Functional |
| Drop-off time chip | Set dropTime local state | Local state | ✅ Functional |
| Pick-up time chip | Set pickTime (only times after drop-off shown) | Local state | ✅ Functional |
| Pay R{X} & confirm | Create booking → payment flow | Supabase + Peach / AsyncStorage | ⚠️ Partial |

**Note on "Confirm booking":** In Supabase mode it creates the DB record and redirects to Peach. In demo mode it saves to AsyncStorage and navigates to confirmation. The Peach payment redirect does not return the user to the app automatically without deep link configuration.

### Booking Confirmation (`(traveller)/booking-confirmation.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| View my bookings | → (traveller)/bookings | None | ✅ Functional |
| 📤 Share Cubby with a friend | Native Share.share() dialog | None | ✅ Functional |
| Back to explore | → (traveller)/explore | None | ✅ Functional |

### My Bookings (`(traveller)/bookings.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Upcoming tab | Filter bookings: pending/confirmed/active | Local state | ✅ Functional |
| Past tab | Filter bookings: completed/cancelled | Local state | ✅ Functional |
| Find storage → (empty state) | → (traveller)/explore | None | ✅ Functional |
| ✏️ Leave a review (completed) | → (traveller)/review?hostId=&hostName= | None | ✅ Functional |
| Cancel booking | Show inline confirm | Local state | ✅ Functional |
| Yes, cancel (confirm) | Update status='cancelled' in Supabase + AsyncStorage | Supabase / AsyncStorage | ✅ Functional |
| Keep (confirm) | Dismiss confirm prompt | Local state | ✅ Functional |

### Profile (`(traveller)/profile.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Avatar / 📷 | expo-image-picker → update avatar | AsyncStorage | ✅ Functional |
| Edit › chip | Open edit profile modal | Local state | ✅ Functional |
| Save (in modal) | Save name + phone | Supabase profiles / AsyncStorage | ✅ Functional |
| Switch to Host Dashboard | → (host)/dashboard | None | ✅ Functional |
| My host listing | → (host)/host-profile | None | ✅ Functional |
| Bank details | → (host)/bank-details | None | ✅ Functional |
| Payment methods | → (traveller)/payment-details | None | ✅ Functional |
| Notifications | → (traveller)/notifications | None | ✅ Functional (stub destination) |
| Language | → (traveller)/language | None | ✅ Functional (stub destination) |
| Get verified ✅ | → (traveller)/verification | None | ✅ Functional (stub destination) |
| How it works | → (traveller)/support | None | ✅ Functional |
| FAQ | → (traveller)/support | None | ✅ Functional |
| Safety & trust | → (traveller)/safety | None | ✅ Functional |
| Contact support | → (traveller)/support | None | ✅ Functional |
| Sign out | Show confirm prompt | Local state | ✅ Functional |
| Sign out (confirm) | supabase.auth.signOut() + clear AsyncStorage → '/' | Supabase / AsyncStorage | ✅ Functional |
| Cancel (sign out) | Dismiss prompt | Local state | ✅ Functional |
| Delete account | Show confirm prompt | Local state | ✅ Functional |
| Yes, delete (confirm) | Call delete-user-account Edge Function → sign out → '/' | Supabase Edge Function | ✅ Functional |
| Cancel (delete) | Dismiss prompt | Local state | ✅ Functional |
| v1.0.0 (hidden) | → (admin)/login | None | ✅ Functional |

### Review (`(traveller)/review.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Star rating (1-5) | Set rating | Local state | ✅ Functional |
| Tag chips | Toggle tag selection | Local state | ✅ Functional |
| Submit review | Validate → save to AsyncStorage | AsyncStorage ONLY | ⚠️ Partial |

### Host Dashboard (`(host)/dashboard.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Complete (per booking) | Call complete-booking Edge Function | Supabase Edge Function | ⚠️ Partial |

**Note:** Dashboard stats (earnings, booking count, rating) are hardcoded — not fetched from Supabase.

### Host Profile (`(host)/host-profile.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Business type chips | Select type | Local state | ✅ Functional |
| Day toggles (7) | Toggle available days | Local state | ✅ Functional |
| − / + max bags | Adjust count | Local state | ✅ Functional |
| Active toggle | Toggle is_active | Local state | ✅ Functional |
| Save listing | Save all fields | AsyncStorage ONLY | ⚠️ Partial |

**Critical:** Not synced to Supabase `hosts` table. Changes are local-only.

### Bank Details (`(host)/bank-details.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Bank selector chips | Select bank (auto-fills branch code) | Local state | ✅ Functional |
| Account type (Cheque/Savings) | Select type | Local state | ✅ Functional |
| Save bank details | Upsert to bank_details table | Supabase / AsyncStorage | ✅ Functional |

### Host Requests (`(host)/requests.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| ✓ Accept | Set request status = 'accepted' | Local state ONLY | ❌ Broken |
| ✕ Decline | Set request status = 'declined' | Local state ONLY | ❌ Broken |

**Note:** Data is hardcoded mock. No Supabase query. Changes do not persist.

### Host Messages (`(host)/messages.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| (None — stub screen) | — | — | ❌ Not implemented |

### Runner Dashboard (`(runner)/dashboard.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Available / Offline toggle | Flip isAvailable state | Local state ONLY | ❌ Not persisted |
| Accept delivery | Local state update | Mock data | ❌ Broken |
| Decline delivery | Local state update | Mock data | ❌ Broken |

### Runner Deliveries (`(runner)/deliveries.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Accept / Decline per delivery | Local state update | Hardcoded mock | ❌ Broken |

### Admin Login (`(admin)/login.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Number keys (0-9) | Append digit to PIN | Local state | ✅ Functional |
| Backspace | Remove last digit | Local state | ✅ Functional |
| Submit (auto on 4th digit) | Compare to hardcoded '2604' | AsyncStorage | ✅ Functional |

### Admin Dashboard (`(admin)/dashboard.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Manage Hosts | → (admin)/manage-hosts | None | ✅ Functional |
| Create Host Profile | → (admin)/create-host | None | ✅ Functional |
| Host Bank Details | → (admin)/host-payouts | None | ✅ Functional |
| View Bookings | → (admin)/bookings | None | ✅ Functional |
| Revenue Dashboard | → (admin)/revenue | None | ✅ Functional |
| Sign Out | Inline confirm → clear session → '/' | AsyncStorage | ✅ Functional |

### Admin Manage Hosts (`(admin)/manage-hosts.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Toggle active | Flip is_active | Supabase / AsyncStorage | ✅ Functional |
| 🗑️ Delete | Show inline "Sure? Yes/No" | Local state | ✅ Functional |
| Yes (confirm delete) | DELETE from hosts table | Supabase / AsyncStorage | ✅ Functional |
| No (cancel delete) | Dismiss confirm | Local state | ✅ Functional |
| + FAB | → (admin)/create-host | None | ✅ Functional |

### Admin Create Host (`(admin)/create-host.tsx`)
| Button | Action | Data | Status |
|---|---|---|---|
| Business type chips | Select type | Local state | ✅ Functional |
| Day toggle chips | Toggle available days | Local state | ✅ Functional |
| Create host | Validate → INSERT hosts | Supabase / AsyncStorage | ✅ Functional |
| Back | → (admin)/manage-hosts | None | ✅ Functional |

---

## 12–15. Button Functional Status Summary

### ✅ Fully Functional
- All auth flows (login, signup, sign out, delete account)
- All onboarding navigation
- Host search & filter & map toggle
- Host save/unsave (Supabase + fallback)
- Booking creation (demo mode fully works; Supabase mode works up to payment redirect)
- Booking cancellation (Supabase + AsyncStorage)
- Profile edit + save (Supabase + AsyncStorage)
- Bank details save (Supabase + AsyncStorage)
- Admin PIN login, create host, manage hosts, delete host, navigate between screens
- All static navigation (support, safety, FAQ)

### ⚠️ Partially Functional
| Button | What Works | What's Missing |
|---|---|---|
| "Pay & confirm" (Booking) | Creates DB record + redirects to Peach | Deep link back to app after payment; demo mode is full |
| "Complete" (Host Dashboard) | Edge Function exists and works | Dashboard shows hardcoded data, not real bookings |
| "Submit review" (Review) | Saves to AsyncStorage | Not written to Supabase reviews table |
| "Save listing" (Host Profile) | Saves locally | Not synced to Supabase hosts table |
| Avatar picker (Profile) | Picks image and stores URI | Avatar URL not uploaded to Supabase Storage |

### 🎭 Simulated / Demo Only
| Feature | Simulation |
|---|---|
| Payment confirmation | In demo mode, skips Peach entirely; navigates straight to confirmation |
| Host earnings | Hardcoded R1,240 in host dashboard |
| Booking requests (Host) | Hardcoded 3 sample requests |
| Runner deliveries | Hardcoded 3 sample deliveries |
| Runner earnings | Hardcoded weekly/monthly breakdown |
| Admin revenue stats | Calculated from AsyncStorage hosts count only |

### ❌ Broken / Not Implemented
| Button / Feature | Reason |
|---|---|
| Host Accept/Decline request | No Supabase write; local state only; no DB query for real bookings |
| Runner availability toggle | Not persisted anywhere |
| Runner Accept/Decline delivery | Local state only; no delivery booking table |
| Messaging (all roles) | No messages table; chat screen is a stub |
| Notifications | Stub screen; no push notification backend |
| Language picker | Stub screen |
| Verification | Stub screen |
| Payment methods / card storage | AsyncStorage only; violates PCI; not used in actual payments |
| Partner application | Form not built in frontend (table exists in schema) |
| Runners tab (traveller) | UI exists but booking flow is incomplete |

---

## 16. Missing Backend Functionality

1. **Messaging system** — No `messages` table, no realtime subscription, no Supabase channel. Both host and traveller message screens are empty stubs.

2. **Runner backend** — No `runner_profiles`, `delivery_bookings` tables. Runner availability, delivery requests, and earnings all use hardcoded data with no persistence.

3. **Push notifications** — No notification table, no Expo Push Token registration, no server-side trigger for booking confirmations or host alerts.

4. **Review aggregation** — When a review is submitted, the `hosts.rating` and `hosts.review_count` fields are never updated. No trigger or Edge Function to recalculate.

5. **Host request management** — The host `requests.tsx` screen never queries `bookings` where `host_id = current_user_host_id`. No accept/decline writes back to Supabase.

6. **Host listing sync** — Changes to `host-profile.tsx` are saved to AsyncStorage only. The `hosts` table record is never updated when a host edits their own listing.

7. **Avatar upload** — Profile image picker stores a local URI. No upload to Supabase Storage; avatar disappears on reinstall.

8. **Admin stats** — Dashboard stats (total hosts, bookings, revenue, pending approvals) are calculated from AsyncStorage, not from the Supabase database.

9. **Partner applications** — `partner_applications` table exists in schema but there is no frontend form to submit one. Table RLS is also too permissive (public SELECT).

10. **Payment deep link return** — After Peach redirects the user to their browser for payment, there is no deep link or redirect URL configured to return the user to the app.

---

## 17. Missing Database Functionality

1. **`messages` table** — Required for in-app host ↔ traveller chat.

2. **`runner_profiles` table** — Runner listings: vehicle, area, price, availability.

3. **`delivery_bookings` table** — Runner delivery orders: traveller, pickup/dropoff address, runner, status, price.

4. **`push_tokens` table** — Store Expo push tokens per user for targeted notifications.

5. **Review trigger** — A Postgres function/trigger to recalculate `hosts.rating` and `hosts.review_count` when a new review is inserted.

6. **Booking update policy (hosts)** — Hosts cannot currently update booking status (e.g., mark active when bags arrive). Only travellers can update (cancel). Need host update policy.

7. **`partner_applications` RLS tightening** — Current policy allows public SELECT on all applications. Should be admin-only SELECT.

8. **`host_bank_details` RLS** — Currently `FOR ALL USING (true)` — effectively no row-level security. Must be scoped to host owner.

---

## 18. Missing Payment Functionality

1. **Deep link return after Peach redirect** — When Peach redirects to their payment widget, the user is taken to a browser. There is no `redirectSuccessUrl` or `redirectFailureUrl` pointing back to the app via deep link (`cubby://`). Users have no automatic path back to the confirmation screen.

2. **Webhook URL not auto-configured** — The Peach webhook must be manually set in the Peach dashboard to point to `https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/payment-webhook`. No documentation of this step exists in the repo.

3. **HMAC signature verification** — The `payment-webhook` function has the HMAC check written but it's commented-optional. Without it, any actor can POST fake payment success events to confirm fraudulent bookings.

4. **Partial payment / refund flow** — There is no refund Edge Function. If a traveller cancels a booking that was already paid (Supabase mode), the payment is not reversed via Peach.

5. **Runner payments** — No payment flow exists for runner delivery bookings. No checkout, no payout.

6. **Duplicate PIN generation** — PIN is generated client-side in `booking.tsx` (line 99: `Math.random()`) AND regenerated in `payment-webhook`. The webhook version overwrites the client version. This is a logic inconsistency and uses non-cryptographic randomness.

7. **Platform fee collection** — The 10% platform fee is calculated client-side and added to `total_price`, but Cubby's share is only separated at payout time via `complete-booking`. If `complete-booking` is never called, Cubby never separates its revenue.

8. **No sandbox vs. production toggle** — Peach Payments has test and production environments. There is no `PEACH_ENV` flag in the codebase to switch between them safely.

---

## 19. Known Bugs

### Critical
| # | Bug | File | Impact |
|---|---|---|---|
| C1 | Booking date hardcoded to today — no future date selection | `booking.tsx:114` | Travellers cannot book in advance |
| C2 | HMAC webhook verification is optional — fake payment events accepted | `payment-webhook/index.ts` | Revenue fraud risk |
| C3 | Admin PIN hardcoded as `'2604'` in source code | `(admin)/login.tsx` | Security exposure |
| C4 | `host_bank_details` RLS is `USING (true)` — any authenticated user can read all bank details | `schema.sql` | PCI / data breach risk |
| C5 | No deep link back from Peach payment — users stranded in browser | `booking.tsx` | Core flow broken on mobile |

### Major
| # | Bug | File | Impact |
|---|---|---|---|
| M1 | Host profile edits never sync to Supabase `hosts` table | `host-profile.tsx` | Host listing data always stale |
| M2 | Reviews submitted to AsyncStorage only — never appear in DB or affect host rating | `review.tsx` | Review system non-functional in production |
| M3 | Host request Accept/Decline buttons are local state only — no Supabase write | `requests.tsx` | Host cannot manage bookings |
| M4 | Host dashboard shows hardcoded earnings, not real booking aggregates | `dashboard.tsx` | Misleading data |
| M5 | Runner availability toggle not persisted | `(runner)/dashboard.tsx` | Runner appears available even after going offline |
| M6 | Avatar images stored as local URI — lost on reinstall | `profile.tsx` | Poor UX |
| M7 | `partner_applications` SELECT is public — anyone can read all applications | `schema.sql` | Privacy issue |

### Moderate
| # | Bug | File | Impact |
|---|---|---|---|
| MO1 | Payment card stored plaintext in AsyncStorage | `payment-details.tsx` | PCI DSS violation (though not used in real payment flow) |
| MO2 | Admin session never expires — persists in AsyncStorage indefinitely | `(admin)/login.tsx` | Security |
| MO3 | No rate limiting on admin PIN entry | `(admin)/login.tsx` | Brute-force possible |
| MO4 | `hosts.rating` and `hosts.review_count` never updated when review submitted | `schema.sql` | Rating always shows initial value |
| MO5 | Duplicate `useAuth` implementations (auth-context.tsx and hooks/useAuth.ts) | Multiple | Code maintainability |
| MO6 | `pick_up_date` is always same as `drop_off_date` — multi-day storage not supported | `booking.tsx:116` | Feature gap |
| MO7 | PIN uses `Math.random()` — not cryptographically secure | `booking.tsx:99` | Security |

---

## 20. Priority Fixes Before Launch

Listed in order of severity and impact.

### P0 — Must Fix (Blockers)

**1. Payment deep link return**  
Configure `expo-linking` deep link scheme (`cubby://`) and set `redirectSuccessUrl` / `redirectFailureUrl` in the Peach checkout API call. Without this, the entire paid booking flow is broken on mobile.

**2. Enable HMAC webhook signature verification**  
Uncomment and enforce the `x-signature` check in `payment-webhook`. Set `PEACH_WEBHOOK_SECRET` in Supabase secrets. Without this, the payment confirmation is open to forgery.

**3. Fix `host_bank_details` RLS**  
Change `FOR ALL USING (true)` to `FOR ALL USING (host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid()))`. Bank account numbers must never be readable by other users.

**4. Future date booking (calendar picker)**  
Replace the hardcoded today-only date with a date picker. Travellers plan ahead. This is a fundamental UX requirement.

**5. Remove admin PIN from source code**  
Move `'2604'` to an environment variable (`ADMIN_PIN` read server-side, or at minimum `EXPO_PUBLIC_ADMIN_PIN` with a warning). Rotate the PIN after launch.

---

### P1 — High Priority (Launch Quality)

**6. Sync host profile edits to Supabase**  
In `host-profile.tsx`, replace the AsyncStorage-only save with a Supabase `UPDATE hosts SET ... WHERE user_id = auth.uid()` call. The current state means hosts editing their listing have no effect on what travellers see.

**7. Write reviews to Supabase**  
In `review.tsx`, after saving to AsyncStorage, also `INSERT INTO reviews (...)`. Add a Postgres trigger to recalculate `hosts.rating` and `hosts.review_count` on INSERT.

**8. Host request management via Supabase**  
In `requests.tsx`, replace hardcoded `INITIAL_REQUESTS` with a Supabase query for `bookings WHERE host_id = (SELECT id FROM hosts WHERE user_id = auth.uid())`. Wire Accept/Decline to `UPDATE bookings SET status = ...`.

**9. Host booking policy for updates**  
Add `CREATE POLICY "Hosts can update bookings for their listing" ON bookings FOR UPDATE USING (host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid()))` to enable hosts to mark bookings active/completed.

**10. Tighten `partner_applications` RLS**  
Change SELECT policy to `USING (false)` to block public reads. Add admin-only policy if needed, or remove SELECT policy entirely and expose only via Edge Function.

---

### P2 — Important (Post-Launch)

**11. Refund flow**  
Create a `cancel-booking` Edge Function that calls Peach refund API when a confirmed (paid) booking is cancelled. Currently cancellation has no financial effect.

**12. Upload avatar to Supabase Storage**  
In `profile.tsx`, after image is picked, upload to `supabase.storage.from('avatars').upload(...)` and store the public URL in `profiles.avatar_url`. Remove the local URI approach.

**13. Persistent runner availability**  
Add `is_available` column to a `runner_profiles` table and write the toggle state to Supabase.

**14. Replace Math.random() PIN with crypto**  
Use `crypto.getRandomValues()` (available in React Native via polyfill) or generate PIN exclusively server-side in the webhook. Remove the client-side PIN generation entirely.

**15. Admin session expiry**  
Store admin session timestamp in AsyncStorage and check age on dashboard load. Expire after 8 hours.

---

### P3 — Future Features

| Feature | Effort | Notes |
|---|---|---|
| In-app messaging | High | Requires messages table + Supabase Realtime |
| Runner flow | High | New tables, new payment path, new screens |
| Push notifications | Medium | Expo Push Tokens + notification triggers in Edge Functions |
| Identity verification | Medium | Third-party KYC API (e.g., Smile ID for SA) |
| Multi-day bookings | Low | Calendar picker + pick_up_date ≠ drop_off_date logic |
| Partner application form | Low | Frontend form → partner_applications table |
| Host dashboard real data | Low | Supabase aggregate query replacing hardcoded values |
| Supabase Storage for photos | Medium | Host listing photos + avatar uploads |
| Peach sandbox/production toggle | Low | `PEACH_ENV` flag in Edge Functions |

---

## Appendix A — Brand Colors

```
primary:     #FF5C5C  (coral red — CTAs, active states, pins)
accent:      #FFD93D  (yellow — secondary actions)
success:     #6BCB77  (green — open badges, success states)
background:  #FAFAFA  (off-white)
white:       #FFFFFF
border:      #F0EAEA  (light pink-gray)
textPrimary: #1A1A1A
textSecondary: #6B7280
textLight:   #9CA3AF
error:       #EF4444
star:        #FFD93D
```

## Appendix B — Mock Hosts (8 pre-seeded, Cape Town)

| ID | Name | Area | Type | Price/bag |
|---|---|---|---|---|
| host-1 | Sea Point Café & Co | Sea Point | Café | R35 |
| host-2 | V&A Waterfront Hotel | V&A Waterfront | Hotel | R60 |
| host-3 | Gardens Guesthouse | Gardens | Guesthouse | R30 |
| host-4 | Green Point Hostel | Green Point | Hostel | R20 |
| host-5 | De Waterkant Airbnb | De Waterkant | Airbnb | R25 |
| host-6 | Camps Bay Tours | Camps Bay | Tour Operator | R40 |
| host-7 | Clifton Guesthouse | Clifton | Guesthouse | R45 |
| host-8 | Bo-Kaap Coffee House | Bo-Kaap | Café | R28 |

## Appendix C — Supabase Project

```
Project URL:    https://gqgxahqmndkaeyuvhliv.supabase.co
Region:         (verify in Supabase dashboard)
Edge Functions: create-payment, payment-webhook, complete-booking, delete-user-account
Peach webhook:  POST https://gqgxahqmndkaeyuvhliv.supabase.co/functions/v1/payment-webhook
```

## Appendix D — Revenue Model

```
Traveller pays:  host_price × bag_count × 1.10 (10% platform fee added)
Host receives:   70% of total_price (via complete-booking payout)
Cubby keeps:     30% of total_price
Payout trigger:  Manual — host taps "Complete" button in host dashboard
```

---

*End of Technical Audit — Cubby v1.0.0 pre-launch*
