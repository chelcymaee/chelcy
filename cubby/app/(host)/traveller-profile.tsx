import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface TravellerProfile {
  displayName: string;
  email: string;
  memberSince: string;
  isVerified: boolean;
  totalBookings: number;
  bookingsWithMe: number;
}

export default function TravellerProfile() {
  const { travellerId, travellerName, fromChat } = useLocalSearchParams<{
    travellerId: string;
    travellerName: string;
    fromChat?: string;
  }>();

  const [profile, setProfile] = useState<TravellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!isSupabaseConfigured || !travellerId) { setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Load traveller profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, email, created_at, is_verified')
        .eq('id', travellerId)
        .single();

      // Total bookings this traveller has made
      const { count: totalCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('traveller_id', travellerId)
        .in('status', ['confirmed', 'active', 'completed']);

      // Bookings with this specific host
      let bookingsWithMe = 0;
      if (user) {
        const { data: hostRow } = await supabase
          .from('hosts')
          .select('id')
          .eq('assigned_user_id', user.id)
          .single();

        if (hostRow) {
          const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('traveller_id', travellerId)
            .eq('host_id', hostRow.id)
            .in('status', ['confirmed', 'active', 'completed']);
          bookingsWithMe = count ?? 0;
        }
      }

      setProfile({
        displayName: prof?.display_name ?? travellerName ?? 'Traveller',
        email: prof?.email ?? '',
        memberSince: prof?.created_at
          ? new Date(prof.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
          : 'Unknown',
        isVerified: prof?.is_verified ?? false,
        totalBookings: totalCount ?? 0,
        bookingsWithMe,
      });
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (fromChat === 'true') {
      router.replace('/(host)/messages');
    } else {
      router.replace('/(host)/requests');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} // @ts-ignore
          onClick={goBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Traveller Profile</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load profile.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar + name */}
          <View style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🎒</Text>
            </View>
            <Text style={styles.name}>{profile.displayName}</Text>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified traveller</Text>
              </View>
            )}
            <Text style={styles.memberSince}>Member since {profile.memberSince}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.totalBookings}</Text>
              <Text style={styles.statLabel}>Total bookings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{profile.bookingsWithMe}</Text>
              <Text style={styles.statLabel}>Bookings with you</Text>
            </View>
          </View>

          {/* Contact info */}
          {!!profile.email && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📧</Text>
                  <Text style={styles.infoValue}>{profile.email}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Trust indicators */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trust & Safety</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>{profile.isVerified ? '✅' : '⏳'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Identity verification</Text>
                  <Text style={[styles.infoValue, { color: profile.isVerified ? '#059669' : Colors.textSecondary }]}>
                    {profile.isVerified ? 'Verified' : 'Not yet verified'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Member since</Text>
                  <Text style={styles.infoValue}>{profile.memberSince}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: Colors.textSecondary },
  content: { padding: 20, gap: 16 },
  heroCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarEmoji: { fontSize: 36 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  verifiedBadge: { backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  verifiedText: { fontSize: 13, fontWeight: '700', color: '#059669' },
  memberSince: { fontSize: 13, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4 },
  statNumber: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 2 },
  infoCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  infoDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 54 },
});
