import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface Host {
  id: string;
  displayName: string;
  locationName: string;
  businessType: string;
  pricePerBag: number;
  active: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  café: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📍',
};

function Btn({ onClick, style, children }: { onClick: () => void; style?: any; children: any }) {
  return React.createElement('button', {
    onClick,
    style: { border: 'none', cursor: 'pointer', fontFamily: 'inherit', ...style },
  }, children);
}

export default function ManageHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);

  useFocusEffect(
    useCallback(() => { loadHosts(); }, [])
  );

  async function loadHosts() {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('hosts').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          setHosts(data.map((row: any) => ({
            id: row.id,
            displayName: row.display_name,
            locationName: row.location_name,
            businessType: row.business_type,
            pricePerBag: row.price_per_bag,
            active: row.active ?? row.is_active ?? false,
          })));
        }
      } else {
        const raw = await AsyncStorage.getItem('cubby_hosts');
        setHosts(raw ? JSON.parse(raw) : []);
      }
    } catch {}
  }

  async function toggleActive(host: Host) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('hosts').update({ active: !host.active }).eq('id', host.id);
      if (!error) setHosts(prev => prev.map(h => h.id === host.id ? { ...h, active: !h.active } : h));
    } else {
      const updated = hosts.map(h => h.id === host.id ? { ...h, active: !h.active } : h);
      await AsyncStorage.setItem('cubby_hosts', JSON.stringify(updated));
      setHosts(updated);
    }
  }

  async function deleteHost(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('hosts').delete().eq('id', id);
      if (!error) setHosts(prev => prev.filter(h => h.id !== id));
    } else {
      const updated = hosts.filter(h => h.id !== id);
      await AsyncStorage.setItem('cubby_hosts', JSON.stringify(updated));
      setHosts(updated);
    }
  }

  function confirmDelete(id: string, name: string) {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) deleteHost(id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, overflowY: 'auto' } as any}>
        <View style={styles.header}>
          <Btn onClick={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} style={{ background: 'none', padding: '0 0 8px 0' }}>
            <Text style={styles.backLink}>← Back</Text>
          </Btn>
          <Text style={styles.title}>Manage Hosts</Text>
        </View>

        {hosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏠</Text>
            <Text style={styles.emptyText}>No hosts yet.</Text>
            <Text style={styles.emptySubText}>Create your first host profile.</Text>
            <Btn onClick={() => router.push('/(admin)/create-host')} style={{ backgroundColor: '#2D6A4F', color: 'white', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700 }}>
              Create Host Profile
            </Btn>
          </View>
        ) : (
          <View style={styles.list}>
            {hosts.map(host => (
              <View key={host.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.typeEmoji}>{TYPE_EMOJI[host.businessType] || '📍'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hostName}>{host.displayName}</Text>
                    <Text style={styles.hostLocation}>{host.locationName}</Text>
                  </View>
                  <View style={[styles.badge, host.active ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, host.active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                      {host.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.price}>R{host.pricePerBag}/bag/day</Text>
                  <View style={styles.actions}>
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>Active</Text>
                      <Switch
                        value={host.active}
                        onValueChange={() => toggleActive(host)}
                        trackColor={{ false: '#D1D5DB', true: Colors.primary }}
                        thumbColor={Colors.white}
                      />
                    </View>
                    <Btn
                      onClick={() => confirmDelete(host.id, host.displayName)}
                      style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#DC2626', fontWeight: 600 }}
                    >
                      🗑️ Delete
                    </Btn>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </View>

      <Btn
        onClick={() => router.push('/(admin)/create-host')}
        style={{ position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2D6A4F', fontSize: 28, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
      >
        +
      </Btn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backLink: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  list: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: '#F0EAEA' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  typeEmoji: { fontSize: 28 },
  hostName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  hostLocation: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#16A34A' },
  badgeTextInactive: { color: Colors.textSecondary },
  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: '#F0EAEA',
  },
  price: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel: { fontSize: 13, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySubText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, textAlign: 'center' },
});
