import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../src/constants/colors';
import { AuthProvider } from '../src/lib/auth-context';
import { setupNotificationHandler, registerPushToken } from '../src/lib/notifications';
import { supabase } from '../src/lib/supabase';

// Handle cubby://payment-result and cubby://reset-password deep links
function usePaymentDeepLink() {
  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      if (parsed.path === 'payment-result') {
        const status = parsed.queryParams?.status as string | undefined;
        if (status === 'success') {
          router.replace('/(traveller)/payment-success');
        } else {
          router.replace('/(traveller)/payment-failed');
        }
      } else if (parsed.path === 'reset-password') {
        const code = parsed.queryParams?.code as string | undefined;
        if (code) {
          supabase.auth.exchangeCodeForSession(code).finally(() => {
            router.replace('/(auth)/reset-password');
          });
        } else {
          router.replace('/(auth)/reset-password');
        }
      }
    }

    // Purge any legacy card data stored before the security sprint
    AsyncStorage.removeItem('cubby_payment_details');

    // Handle deep link if the app was opened from a cold start
    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url });
    });

    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  usePaymentDeepLink();

  useEffect(() => {
    setupNotificationHandler();
    registerPushToken();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(traveller)" />
        <Stack.Screen name="(host)" />
      </Stack>
    </AuthProvider>
  );
}
