import { useEffect, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
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

  return <Slot />;
}
