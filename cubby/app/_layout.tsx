import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { Colors } from '../src/constants/colors';
import { AuthProvider } from '../src/lib/auth-context';
import { setupNotificationHandler, registerPushToken } from '../src/lib/notifications';
import { supabase } from '../src/lib/supabase';
import { setupGlobalErrorLogging } from '../src/lib/error-logging';
import ErrorBoundary from '../src/components/ErrorBoundary';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0 });
}

setupGlobalErrorLogging();

// Handle cubby://payment-result, cubby://reset-password and
// cubby://confirm-email deep links
function usePaymentDeepLink() {
  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      if (parsed.path === 'payment-result') {
        // `status` here is only a hint for which screen shell to show
        // immediately — it is PayGate's/paygate-return's claim, not a
        // verified fact, and this handler exists specifically for the case
        // where the app was backgrounded or cold-started during checkout,
        // i.e. exactly when there's no other in-memory verification
        // already in flight. Neither destination screen is allowed to
        // treat this status as proof of payment on its own; payment-success
        // re-fetches the booking's real status from Supabase using
        // bookingId before ever showing "confirmed" (see PaymentSuccess).
        const status = parsed.queryParams?.status as string | undefined;
        const bookingId = (parsed.queryParams?.bookingId as string | undefined) ?? '';
        if (status === 'success') {
          router.replace({ pathname: '/(traveller)/payment-success', params: { bookingId } });
        } else {
          router.replace({ pathname: '/(traveller)/payment-failed', params: { bookingId } });
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
      } else if (parsed.path === 'confirm-email') {
        // Unlike reset-password (which always shows the same OTP-entry
        // screen regardless of what this exchange does), confirm-email has
        // no independent verification step — its screen's "verified" state
        // is the only signal the user gets. So the result it's told to show
        // must come from the actual outcome of exchangeCodeForSession, never
        // from the raw deep-link URL/query params alone — a forged or
        // replayed cubby://confirm-email link must not be able to make it
        // claim success. `code` itself is never logged.
        const code = parsed.queryParams?.code as string | undefined;
        if (!code) {
          router.replace({ pathname: '/(auth)/confirm-email', params: { result: 'invalid' } });
          return;
        }
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
          if (!error) {
            router.replace({ pathname: '/(auth)/confirm-email', params: { result: 'verified' } });
            return;
          }
          // Exchange failed — most commonly because this code was already
          // used (link tapped twice, or already handled once this app
          // session). If the user already has a live session at this point,
          // they're genuinely confirmed and signed in; don't show them a
          // scary error for that.
          supabase.auth.getSession().then(({ data: { session } }) => {
            router.replace({
              pathname: '/(auth)/confirm-email',
              params: { result: session ? 'already' : 'invalid' },
            });
          });
        }).catch(() => {
          router.replace({ pathname: '/(auth)/confirm-email', params: { result: 'invalid' } });
        });
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

function RootLayout() {
  usePaymentDeepLink();

  useEffect(() => {
    setupNotificationHandler();
    registerPushToken();
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
