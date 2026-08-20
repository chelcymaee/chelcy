import { Platform } from 'react-native';
import { supabase } from './supabase';

// Call once at app startup to configure how foreground notifications display
export function setupNotificationHandler() {
  if (Platform.OS === 'web') return;
  try {
    // Dynamic require so web bundle doesn't break on missing native module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

// Register for push notifications and persist the token so the Edge Function
// can look it up when delivering a push. Skips silently on web and on
// simulators that don't have a real push token.
export async function registerPushToken() {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (!tokenData?.data) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token: tokenData.data, platform: Platform.OS },
      { onConflict: 'user_id,token' },
    );
  } catch (e) {
    // Silently skip — push tokens aren't critical for in-app notifications
    console.log('Push token registration skipped:', e);
  }
}

// Remove this device's push-token association for a user, so the same
// physical device can't keep receiving pushes meant for them after a
// different account signs in on it. Only deletes the row for *this*
// device's token, not the outgoing user's other devices.
//
// Must be called *before* supabase.auth.signOut() — push_tokens' RLS policy
// requires auth.uid() = user_id, so once the session is actually
// invalidated this DELETE would run as an unauthenticated caller and
// silently match zero rows (no error, no exception, nothing to catch).
// signOutAndCleanupPushToken() below is the one place that gets this
// ordering right; call sites should use it rather than calling this
// directly around their own signOut().
export async function unregisterPushToken(userId: string) {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (!tokenData?.data) return;

    await supabase.from('push_tokens').delete()
      .eq('user_id', userId)
      .eq('token', tokenData.data);
  } catch (e) {
    // Silently skip — matches registerPushToken's own failure handling;
    // a failed cleanup must never block sign-out.
    console.log('Push token cleanup skipped:', e);
  }
}

// Shared sign-out wrapper: cleans up this device's push-token row for the
// current user *while still authenticated* (see unregisterPushToken's
// comment for why the ordering matters), then actually signs out. Cleanup
// failure never blocks sign-out — the real supabase.auth.signOut() call
// always runs, whether or not cleanup succeeded.
export async function signOutAndCleanupPushToken() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await unregisterPushToken(user.id);
  } catch (e) {
    console.log('Push token cleanup skipped:', e);
  }
  await supabase.auth.signOut();
}
