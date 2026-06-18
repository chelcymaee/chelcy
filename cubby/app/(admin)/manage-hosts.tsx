import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';

interface Host {
  id: string;
  displayName: string;
  locationName: string;
  businessType: string;
  pricePerBag: number;
  active: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  café: '☕',
  hotel: '🏨',
  hostel: '🛏️',
  guesthouse: '🏡',
  airbnb: '🔑',
  tour_operator: '🗺️',
  home: '🏠',
  other: '📍',
};

export default function ManageHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHosts();
    }, [])
  );

  async function loadHosts() {
    try {
      const raw = await AsyncStorage.getItem('cubby_hosts');
      setHosts(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function saveHosts(updated: Host[]) {
    await AsyncStorage.setItem('cubby_hosts', JSON.stringify(updated));
    setHosts(updated);
  }

  async function toggleActive(id: string) {
    const updated = hosts.map(h => h.id === id ? { ...h, active: !h.active } : h);
    await saveHosts(updated);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete Host', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = hosts.filter(h => h.id !== id);
          await saveHosts(updated);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Hosts</Text>
        </View>

        {hosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏠</Text>
            <Text style={styles.emptyText}>No hosts yet.</Text>
            <Text style={styles.emptySubText}>Create your first host profile.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(admin)/create-host')}>
              <Text style={styles.emptyBtnText}>Create Host Profile</Text>
            </TouchableOpacity>
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
                        onValueChange={() => toggleActive(host.id)}
                        trackColor={{ false: '#D1D5DB', true: Colors.primary }}
                        thumbColor={Colors.white}
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => confirmDelete(host.id, host.displayName)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(admin)/create-host')} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backLink: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  list: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  typeEmoji: { fontSize: 28 },
  hostName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  hostLocation: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#16A34A' },
  badgeTextInactive: { color: Colors.textSecondary },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0EAEA',
  },
  price: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel: { fontSize: 13, color: Colors.textSecondary },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySubText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 28, color: Colors.white, fontWeight: '400', lineHeight: 32 },
});
