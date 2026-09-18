import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';

// Apple Guideline 5.1.1(v): browsing itself (Explore, host-detail) must
// stay open to a guest with no session — but booking, messaging, and
// reporting/blocking are genuinely account-based, which the guideline's
// own carve-out allows gating behind sign-in. This is the one shared
// prompt every such gate uses, so a guest always sees the same choice
// instead of a silent no-op or a confusing backend error.
//
// react-native-web's Alert.alert is a documented no-op (see its source:
// `static alert() {}`) — on web this call produced no dialog at all,
// making every gated action (e.g. the "Select no. of bags" button on
// host-detail) appear completely unresponsive to a guest. Native iOS/
// Android are unaffected — Alert.alert there is the real native module —
// so this branches on Platform.OS rather than touching the native path.
export function promptGuestSignIn(message = 'Create an account or sign in to continue.') {
  if (Platform.OS === 'web') {
    // Smallest reliable web primitive: window.confirm's two buttons map
    // directly onto "continue" vs "cancel". The login screen itself
    // already links to signup, so routing here to /(auth)/login (rather
    // than needing a third button) still gets a guest to either sign-in
    // or account creation in one extra tap.
    const shouldContinue = typeof window !== 'undefined'
      && window.confirm(`Sign in to continue\n\n${message}`);
    if (shouldContinue) router.push('/(auth)/login');
    return;
  }

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
