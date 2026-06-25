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
