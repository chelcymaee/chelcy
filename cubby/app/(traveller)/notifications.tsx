import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

interface NotifSetting {
  id: string;
  title: string;
  desc: string;
  enabled: boolean;
}

export default function Notifications() {
  const [settings, setSettings] = useState<NotifSetting[]>([
    { id: 'bookings', title: 'Booking updates', desc: 'Confirmations, reminders and changes', enabled: true },
    { id: 'messages', title: 'New messages', desc: 'When a host replies to you', enabled: true },
    { id: 'promotions', title: 'Deals & promotions', desc: 'Special offers and discounts', enabled: false },
    { id: 'reminders', title: 'Pick-up reminders', desc: 'Reminder 1 hour before pick-up', enabled: true },
    { id: 'reviews', title: 'Review requests', desc: 'After a completed booking', enabled: true },
    { id: 'news', title: 'Cubby news', desc: 'New features and announcements', enabled: false },
  ]);

  useEffect(() => {
    AsyncStorage.getItem('cubby_notifications').then(raw => {
      if (!raw) return;
      try {
        const saved: Record<string, boolean> = JSON.parse(raw);
        setSettings(prev => prev.map(s => saved[s.id] !== undefined ? { ...s, enabled: saved[s.id] } : s));
      } catch {}
    });
  }, []);

  function toggle(id: string) {
    setSettings(prev => {
      const next = prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
      const map: Record<string, boolean> = {};
      next.forEach(s => { map[s.id] = s.enabled; });
      AsyncStorage.setItem('cubby_notifications', JSON.stringify(map));
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Notifications</Text>
        </View>

        <View style={styles.list}>
          {settings.map((s, idx) => (
            <View key={s.id} style={[styles.item, idx === settings.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.title}</Text>
                <Text style={styles.itemDesc}>{s.desc}</Text>
              </View>
              <Switch
                value={s.enabled}
                onValueChange={() => toggle(s.id)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  list: {
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border, marginTop: 8, overflow: 'hidden',
  },
  item: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  itemDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
