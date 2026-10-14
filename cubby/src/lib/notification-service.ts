import { supabase, isSupabaseConfigured } from './supabase';
import { triggerNotificationRpc, assertPushDeliverySucceeded } from './notification-rpc';

export type NotificationType =
  | 'new_message'
  | 'booking_submitted'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_successful'
  | 'payment_failed'
  | 'drop_off_reminder'
  | 'pick_up_reminder'
  | 'booking_starting_soon'
  | 'booking_ending_soon'
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_rejected'
  | 'partner_received'
  | 'partner_approved'
  | 'partner_rejected'
  | 'review_request'
  | 'review_received'
  | 'review_reminder'
  | 'milestone_reached';

// Maps notification type → preference column key
const PREF_KEY: Record<NotificationType, string> = {
  new_message: 'messages',
  booking_submitted: 'booking_updates',
  booking_confirmed: 'booking_updates',
  booking_declined: 'booking_updates',
  booking_cancelled: 'booking_updates',
  booking_completed: 'booking_updates',
  payment_successful: 'booking_updates',
  payment_failed: 'booking_updates',
  drop_off_reminder: 'booking_reminders',
  pick_up_reminder: 'booking_reminders',
  booking_starting_soon: 'booking_reminders',
  booking_ending_soon: 'booking_reminders',
  verification_submitted: 'verification_updates',
  verification_approved: 'verification_updates',
  verification_rejected: 'verification_updates',
  partner_received: 'product_updates',
  partner_approved: 'product_updates',
  partner_rejected: 'product_updates',
  review_request: 'booking_updates',
  review_received: 'new_reviews',
  review_reminder: 'review_reminders',
  milestone_reached: 'milestones',
};

export interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  relatedBookingId?: string;
  relatedMessageId?: string;
  skipPreferenceCheck?: boolean;
}

const SUPABASE_URL = 'https://gqgxahqmndkaeyuvhliv.supabase.co';

export async function sendNotification(opts: SendNotificationOptions): Promise<void> {
  if (!isSupabaseConfigured) return;

  const {
    userId, type, title, body, data,
    relatedBookingId, relatedMessageId, skipPreferenceCheck,
  } = opts;

  // Check user's notification preference (non-fatal — defaults to allowed)
  if (!skipPreferenceCheck) {
    const prefKey = PREF_KEY[type];
    if (prefKey) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select(prefKey)
        .eq('user_id', userId)
        .single();
      if (prefs && (prefs as Record<string, boolean>)[prefKey] === false) return;
    }
  }

  // Insert in-app notification row
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data: data ?? null,
    read_at: null,
    related_booking_id: relatedBookingId ?? null,
    related_message_id: relatedMessageId ?? null,
  });

  // Fire-and-forget push delivery
  dispatchPush(userId, title, body, { type, ...data }).catch(() => {});
}

export async function dispatchPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId, title, body, data }),
  });

  // send-push can resolve normally with a non-OK status (unauthorized,
  // delivery failed and intentionally not claimed — see
  // supabase/functions/send-push/index.ts) — that must not be silently
  // treated as a successful push. Throwing here lets every caller's
  // existing `.catch()` log it instead of swallowing it as success.
  const bodyText = res.ok ? '' : await res.text().catch(() => '');
  assertPushDeliverySucceeded(res.ok, res.status, bodyText);
}

// ─── Stage 2 Phase 2 — secure notification RPCs ─────────────────────────────
//
// Replaces the direct notifications-table insert + manual preference check
// + manual dedup in sendNotification() above, for the booking and review
// flows that now have a server-side RPC doing all of that atomically and
// with event-specific authorization. See src/lib/notification-rpc.ts for
// the (Node-testable, React-Native-free) trigger/push-dispatch logic this
// wires up to the real Supabase client.
//
// Calls the _v2 RPCs (supabase/PHASE2_NOTIFICATION_RPCS_V2.sql) — additive,
// separately-named functions that return the row(s) they actually wrote,
// so push dispatch gets exact content rather than reconstructing it here.
// The original void-returning create_booking_notification/
// create_review_notification remain live and untouched for any other
// caller. REQUIRES PHASE2_NOTIFICATION_RPCS_V2.sql to be applied before
// this client code is deployed — until then, calling a _v2 function that
// doesn't exist yet fails the whole RPC call (logged, not thrown further;
// see notification-rpc.ts), which also means the in-app notification row
// itself would not be written, not just push. Do not deploy this code
// ahead of that migration.
//
// Both never throw — see notification-rpc.ts's header. Call sites should
// call these AFTER their own booking/review action has already succeeded,
// and never let a failure here affect that action's own success/failure.

export async function triggerBookingNotification(
  bookingId: string,
  event: 'booking_confirmed' | 'booking_declined' | 'booking_confirmed_legacy' | 'booking_declined_legacy' | 'booking_cancelled',
): Promise<void> {
  if (!isSupabaseConfigured) return;
  return triggerNotificationRpc(
    'create_booking_notification_v2',
    { p_booking_id: bookingId, p_event: event },
    { callRpc: (fn, args) => supabase.rpc(fn, args), dispatchPush },
  );
}

export async function triggerReviewNotification(
  bookingId: string,
  reviewedParty: 'host' | 'traveller',
): Promise<void> {
  if (!isSupabaseConfigured) return;
  return triggerNotificationRpc(
    'create_review_notification_v2',
    { p_booking_id: bookingId, p_reviewed_party: reviewedParty },
    { callRpc: (fn, args) => supabase.rpc(fn, args), dispatchPush },
  );
}
