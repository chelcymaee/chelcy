import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 24 : 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function HostLayout() {
  const [checking, setChecking] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    checkHostAccess();
  }, []);

  async function checkHostAccess() {
    if (!isSupabaseConfigured) {
      // Demo mode: allow access
      setApproved(true);
      setChecking(false);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(traveller)/profile');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_host_approved')
        .eq('id', user.id)
        .single();

      if (profile?.is_host_approved) {
        setApproved(true);
      } else {
        router.replace('/(traveller)/profile');
      }
    } catch {
      router.replace('/(traveller)/profile');
    } finally {
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!approved) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <Icon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests', tabBarIcon: ({ focused }) => <Icon emoji="📬" focused={focused} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ focused }) => <Icon emoji="💬" focused={focused} /> }} />
      <Tabs.Screen name="host-profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="bank-details" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="traveller-profile" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="review-traveller" options={{ href: null }} />
      <Tabs.Screen name="review-detail" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
    </Tabs>
  );
}
