# Cubby — To Do

## 🔴 Peach Payments Setup (blocked on merchant account)

Code is fully implemented and committed on `claude/eloquent-goodall-7h3lro`. When your Peach merchant account is ready:

1. **Supabase secrets** — add these in the Supabase dashboard under Project Settings → Edge Functions:
   - `PEACH_PAYMENTS_TOKEN` — your Peach bearer token
   - `PEACH_PAYMENTS_ENTITY_ID` — your Peach entity ID

2. **Deploy edge functions:**
   ```
   supabase functions deploy payment-page
   supabase functions deploy payment-result
   supabase functions deploy create-payment
   ```

3. **Peach dashboard** — whitelist `gqgxahqmndkaeyuvhliv.supabase.co` as an allowed `shopperResultUrl` domain

4. **Peach endpoint** — if using Peach SA (not EU), update the base URL in these two files:
   - `cubby/supabase/functions/create-payment/index.ts` → line with `eu-prod.oppwa.com`
   - `cubby/supabase/functions/payment-result/index.ts` → line with `eu-prod.oppwa.com`
   - Test: `https://testsecure.peachpayments.com`
   - Prod: `https://secure.peachpayments.com`

5. **Test** with a Peach test card through the full booking flow

**Files touched:** `create-payment/index.ts`, `payment-page/index.ts` (new), `payment-result/index.ts` (new), `booking.tsx`, `payment-success.tsx` (new), `payment-failed.tsx` (new), `_layout.tsx`

---

## 🟡 Other known gaps

- [ ] PIN generated both client-side (`booking.tsx`) and server-side (`payment-webhook`) — deduplicate
- [ ] Host dashboard earnings are hardcoded (R1,240, 14 bookings, 4.9 rating) — wire to real data
- [ ] Avatar upload to Supabase Storage not implemented
- [ ] Payment deep link return on web (PWA) needs separate handling (current fix is native-only)
- [ ] Admin should use proper Supabase auth with a dedicated admin role (current PIN approach is web-only and basic)

## ✅ Completed

- [x] `host_bank_details` RLS fixed — host-scoped only; admin reads via service-role Edge Function
- [x] `partner_applications` public SELECT removed
- [x] Admin PIN moved to `EXPO_PUBLIC_ADMIN_PIN` env var; 5-attempt lockout (15 min); 8-hour session expiry
- [x] `payment-details.tsx` card form removed; replaced with Peach Payments placeholder
- [x] `cubby_payment_details` AsyncStorage key purged on app start
