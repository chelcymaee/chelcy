import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Switch, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface Prefs {
  booking_updates: boolean;
  messages: boolean;
  booking_reminders: boolean;
  verification_updates: boolean;
  product_updates: boolean;
  promotions: boolean;
  host_booking_requests: boolean;
  host_messages: boolean;
  host_booking_reminders: boolean;
  host_verification_updates: boolean;
  host_performance_tips: boolean;
  host_product_updates: boolean;
}

const DEFAULTS: Prefs = {
  booking_updates: true,
  messages: true,
  booking_reminders: true,
  verification_updates: true,
  product_updates: false,
  promotions: false,
  host_booking_requests: true,
  host_messages: true,
  host_booking_reminders: true,
  host_verification_updates: true,
  host_performance_tips: true,
  host_product_updates: false,
};

const TRAVELLER_PREFS: { key: keyof Prefs; title: string; desc: string }[] = [
  { key: 'booking_updates',      title: 'Booking updates',       desc: 'Confirmations, declines and cancellations' },
  { key: 'messages',             title: 'Messages',              desc: 'When a host sends you a message' },
  { key: 'booking_reminders',    title: 'Booking reminders',     desc: 'Drop-off and pick-up reminders' },
  { key: 'verification_updates', title: 'Verification updates',  desc: 'Status of your ID verification' },
  { key: 'product_updates',      title: 'Product updates',       desc: 'New features and announcements' },
  { key: 'promotions',           title: 'Promotions & offers',   desc: 'Discounts and special deals' },
];

const HOST_PREFS: { key: keyof Prefs; title: string; desc: string }[] = [
  { key: 'host_booking_requests',    title: 'Booking requests',      desc: 'New bookings waiting for action' },
  { key: 'host_messages',            title: 'Messages',              desc: 'When a traveller messages you' },
  { key: 'host_booking_reminders',   title: 'Booking reminders',     desc: 'Upcoming drop-offs and pick-ups' },
  { key: 'host_verification_updates',title: 'Verification updates',  desc: 'Status of your host verification' },
  { key: 'host_performance_tips',    title: 'Performance tips',      desc: 'Tips to improve your listing' },
  { key: 'host_product_updates',     title: 'Product updates',       desc: 'New features for hosts' },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [isHostApproved, setIsHostApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [prefRes, profRes] = await Promise.all([
      supabase.from('notification_preferences').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('is_host_approved').eq('id', user.id).single(),
    ]);

    if (prefRes.data) {
      setPrefs({ ...DEFAULTS, ...prefRes.data });
    }
    setIsHostApproved(profRes.data?.is_host_approved ?? false);
    setLoading(false);
  }

  async function toggle(key: keyof Prefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (!isSupabaseConfigured || !userId) return;
    await supabase.from('notification_preferences').upsert(
      { user_id: userId, ...updated },
      { onConflict: 'user_id' },
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(traveller)/profile')}
            // @ts-ignore
            onClick={() => router.replace('/(traveller)/profile')}
          >
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Notification Preferences</Text>
          <Text style={styles.subtitle}>Choose what you want to be notified about.</Text>
        </View>

        {/* Traveller section */}
        <Text style={styles.sectionLabel}>As a traveller</Text>
        <View style={styles.card}>
          {TRAVELLER_PREFS.map((p, idx) => (
            <View
              key={p.key}
              style={[styles.row, idx < TRAVELLER_PREFS.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{p.title}</Text>
                <Text style={styles.rowDesc}>{p.desc}</Text>
              </View>
              <Switch
                value={prefs[p.key]}
                onValueChange={() => toggle(p.key)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>

        {/* Host section — only shown to approved hosts */}
        {isHostApproved && (
          <>
            <Text style={styles.sectionLabel}>As a host</Text>
            <View style={styles.card}>
              {HOST_PREFS.map((p, idx) => (
                <View
                  key={p.key}
                  style={[styles.row, idx < HOST_PREFS.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{p.title}</Text>
                    <Text style={styles.rowDesc}>{p.desc}</Text>
                  </View>
                  <Switch
                    value={prefs[p.key]}
                    onValueChange={() => toggle(p.key)}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginTop: 24, marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 20, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
