import { supabase, isSupabaseConfigured } from './supabase';

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

async function dispatchPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId, title, body, data }),
  });
}
