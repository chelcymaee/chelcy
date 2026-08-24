import { Alert } from 'react-native';
import { router } from 'expo-router';

// Apple Guideline 5.1.1(v): browsing itself (Explore, host-detail) must
// stay open to a guest with no session — but booking, messaging, and
// reporting/blocking are genuinely account-based, which the guideline's
// own carve-out allows gating behind sign-in. This is the one shared
// prompt every such gate uses, so a guest always sees the same choice
// instead of a silent no-op or a confusing backend error.
export function promptGuestSignIn(message = 'Create an account or sign in to continue.') {
  Alert.alert(
    'Sign in to continue',
    message,
    [
      { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
      { text: 'Create account', onPress: () => router.push('/(auth)/signup') },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}
