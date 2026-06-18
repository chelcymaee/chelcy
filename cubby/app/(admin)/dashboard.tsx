import {
  View, Text, StyleSheet, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

interface Host {
  id: string;
  active: boolean;
}

interface Booking {
  id: string;
  status: string;
  totalPrice: number;
}

export default function AdminDashboard() {
  const [totalHosts, setTotalHosts] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  async function checkAuth() {
    const session = await AsyncStorage.getItem('cubby_admin_session');
    if (!session) {
      router.replace('/(admin)/login');
    }
  }

  async function loadStats() {
    try {
      const hostsRaw = await AsyncStorage.getItem('cubby_hosts');
      const bookingsRaw = await AsyncStorage.getItem('cubby_bookings');
      const hosts: Host[] = hostsRaw ? JSON.parse(hostsRaw) : [];
      const bookings: Booking[] = bookingsRaw ? JSON.parse(bookingsRaw) : [];

      setTotalHosts(hosts.length);
      setActiveBookings(bookings.filter(b => b.status === 'active').length);
      setPendingApprovals(hosts.filter(h => !h.active).length);

      const completed = bookings.filter(b => b.status === 'completed');
      const total = completed.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      setRevenueMonth(total);
    } catch {}
  }

  async function handleSignOut() {
    if (window.confirm('Are you sure you want to sign out?')) {
      await AsyncStorage.removeItem('cubby_admin_session');
      router.replace('/(admin)/login');
    }
  }

  const STATS = [
    { label: 'Total Hosts', value: String(totalHosts), icon: '🏠' },
    { label: 'Active Bookings', value: String(activeBookings), icon: '📦' },
    { label: 'Revenue (R)', value: `R${revenueMonth.toFixed(0)}`, icon: '💰' },
    { label: 'Pending Approvals', value: String(pendingApprovals), icon: '⏳' },
  ];

  const NAV_CARDS = [
    { label: 'Manage Hosts', icon: '👥', route: '/(admin)/manage-hosts' },
    { label: 'Create Host Profile', icon: '➕', route: '/(admin)/create-host' },
    { label: 'Host Bank Details', icon: '🏦', route: '/(admin)/host-payouts' },
    { label: 'View Bookings', icon: '📋', route: '/(admin)/bookings' },
    { label: 'Revenue', icon: '📊', route: '/(admin)/revenue' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, overflowY: 'auto' } as any}>
        <View style={styles.header}>
          <Text style={styles.logo}>Cubby</Text>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>

        <Text style={styles.sectionLabel}>Overview</Text>
        <View style={styles.statsGrid}>
          {STATS.map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.navGrid}>
          {NAV_CARDS.map(card => (
            // @ts-ignore
            <button
              key={card.label}
              onClick={() => router.replace(card.route as any)}
              style={{ background: 'none', border: '1px solid #F0EAEA', borderRadius: 16, padding: 20, flex: 1, minWidth: '44%', cursor: 'pointer', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <Text style={styles.navCardIcon}>{card.icon}</Text>
              <Text style={styles.navCardLabel}>{card.label}</Text>
            </button>
          ))}
        </View>

        {/* @ts-ignore */}
        <button
          onClick={handleSignOut}
          style={{ margin: 20, marginTop: 32, backgroundColor: '#FFFFFF', borderRadius: 14, paddingTop: 16, paddingBottom: 16, border: '1px solid #F0EAEA', cursor: 'pointer', width: 'calc(100% - 40px)' }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </button>

        <View style={{ height: 40 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '44%',
    borderWidth: 1,
    borderColor: '#F0EAEA',
  },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  navCardIcon: { fontSize: 32, marginBottom: 10 },
  navCardLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.error, textAlign: 'center' },
});
