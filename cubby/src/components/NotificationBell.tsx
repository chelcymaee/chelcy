import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../constants/colors';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Props {
  variant?: 'traveller' | 'host';
}

export default function NotificationBell({ variant = 'traveller' }: Props) {
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      setUnread(count ?? 0);
    } catch {}
  }

  const target = variant === 'host' ? '/(host)/notifications' : '/(traveller)/notifications';

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push(target as any)}
      // @ts-ignore
      onClick={() => router.push(target as any)}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { position: 'relative', padding: 6 },
  icon: { fontSize: 22 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800', lineHeight: 13 },
});
