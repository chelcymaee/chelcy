import { useEffect, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { checkAdminSession } from '../../src/lib/admin-auth';
import { Colors } from '../../src/constants/colors';

// Gates every screen in the (admin) group behind a valid PIN session.
// Without this, only dashboard.tsx checked auth — every other admin
// screen (users, manage-hosts, revenue, etc.) was reachable by typing
// its URL directly, bypassing the PIN entirely.
export default function AdminLayout() {
  const pathname = usePathname();
  const isLoginScreen = pathname === '/login';
  const [checking, setChecking] = useState(!isLoginScreen);
  const [authorized, setAuthorized] = useState(isLoginScreen);

  useEffect(() => {
    if (isLoginScreen) return;
    let cancelled = false;
    checkAdminSession().then(valid => {
      if (cancelled) return;
      if (!valid) {
        router.replace('/(admin)/login');
      } else {
        setAuthorized(true);
      }
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [isLoginScreen]);

  if (isLoginScreen) return <Slot />;

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!authorized) return null;

  // Every (admin) screen is a plain HTML/div-based web page, not a
  // React Native component with its own ScrollView — it relies on the
  // page itself scrolling for content taller than the viewport.
  // Expo Router's <Stack> (app/_layout.tsx) wraps every screen,
  // admin included, in a container React Navigation pins to exactly
  // the viewport height, which clips rather than scrolls. Overriding
  // that here, scoped to just the admin route group, fixes scrolling
  // for every admin page in one place — the root layout and the
  // traveller/host layouts (some of which rely on that exact
  // viewport-height container, e.g. FAT-011's explore.tsx bottom
  // sheet) are untouched.
  if (Platform.OS === 'web') {
    return (
      <div style={{ height: '100vh', overflowY: 'auto' }}>
        <Slot />
      </div>
    );
  }

  return <Slot />;
}
