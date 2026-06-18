# Cubby Payment Setup Guide

## Step 1: Apply for Peach Payments merchant account

Go to [peachpayments.com](https://peachpayments.com) and apply for a merchant account. You will receive:
- A **Bearer token** (API key)
- An **Entity ID**
- A **Webhook secret** (set this in the Peach dashboard when adding your webhook URL)

## Step 2: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. From **Settings > API**, note your:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **Anon public key**
   - **Service role key** (keep this secret — never expose to clients)

## Step 3: Add Supabase credentials to your .env

Copy `.env.example` to `.env` and fill in the two public values:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 4: Add Peach secrets to Supabase Edge Function secrets

In the Supabase dashboard go to **Settings > Edge Functions > Secrets** and add:

| Secret name | Value |
|---|---|
| `PEACH_PAYMENTS_TOKEN` | Your Peach Bearer token |
| `PEACH_PAYMENTS_ENTITY_ID` | Your Peach Entity ID |
| `PEACH_WEBHOOK_SECRET` | Your Peach webhook secret |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Settings > API |

> `SUPABASE_URL` is automatically injected by Supabase — you do not need to add it manually.

## Step 5: Deploy the edge functions

Make sure you have the Supabase CLI installed (`npm install -g supabase`), then from the `cubby/` directory:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref

npx supabase functions deploy create-payment
npx supabase functions deploy complete-booking
npx supabase functions deploy payment-webhook
```

## Step 6: Register the webhook URL with Peach Payments

In your Peach Payments merchant dashboard, add a webhook pointing to:

```
https://your-project.supabase.co/functions/v1/payment-webhook
```

Set the trigger to **payment status changes** (success and failure).

## Step 7: Run the database schema

1. Open the Supabase **SQL Editor**.
2. Paste the contents of `cubby/supabase/schema.sql` and run it.

This creates the `profiles`, `hosts`, `bookings`, `reviews`, `bank_details`, and `host_bank_details` tables, and adds the payment columns (`checkout_id`, `host_payout_amount`, `cubby_amount`, `payout_status`, `payout_id`) to `bookings`.

## Revenue split

Every completed booking automatically splits as:
- **70%** → host bank account via Peach Payments payout (CT)
- **30%** → Cubby (stays in your Peach merchant account)

Payouts are initiated the moment a host taps "Mark complete" in the dashboard. Peach Payments typically settles bank transfers within 1-2 business days.
