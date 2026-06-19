import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAdminSession, clearAdminSession } from '../../src/lib/admin-auth';

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
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  async function checkAuth() {
    const valid = await checkAdminSession();
    if (!valid) router.replace('/(admin)/login');
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
    await clearAdminSession();
    router.replace('/(admin)/login');
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

  const s: any = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#FAF9F6',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      overflowY: 'auto',
    },
    header: { padding: '16px 20px 8px' },
    logo: { fontSize: 13, fontWeight: 800, color: '#2D6A4F', letterSpacing: 1, textTransform: 'uppercase', margin: 0 },
    headerTitle: { fontSize: 26, fontWeight: 800, color: '#1a1a1a', margin: '2px 0 0' },
    sectionLabel: {
      fontSize: 13, fontWeight: 700, color: '#6B7280',
      textTransform: 'uppercase', letterSpacing: 0.5,
      padding: '24px 20px 10px', margin: 0,
    },
    statsGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 12, padding: '0 12px',
    },
    statCard: {
      backgroundColor: '#fff', borderRadius: 16, padding: 16,
      border: '1px solid #F0EAEA', display: 'flex',
      flexDirection: 'column', alignItems: 'center',
    },
    statIcon: { fontSize: 28, marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
    navGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 12, padding: '0 12px',
    },
    navCard: {
      backgroundColor: '#fff', border: '1px solid #F0EAEA',
      borderRadius: 16, padding: 20, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    navCardIcon: { fontSize: 32, marginBottom: 10 },
    navCardLabel: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', textAlign: 'center' },
    signOutBtn: {
      margin: '32px 20px 20px',
      backgroundColor: '#fff', borderRadius: 14,
      padding: '16px', border: '1px solid #F0EAEA',
      cursor: 'pointer', width: 'calc(100% - 40px)',
      fontSize: 16, fontWeight: 700, color: '#DC2626',
    },
    confirmBox: {
      margin: '32px 20px 20px',
      backgroundColor: '#FEF2F2', borderRadius: 14,
      padding: '16px', border: '1px solid #FECACA',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    confirmText: { fontSize: 14, fontWeight: 600, color: '#DC2626' },
    confirmYes: {
      backgroundColor: '#DC2626', color: 'white', border: 'none',
      borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
    },
    confirmNo: {
      backgroundColor: '#fff', color: '#6B7280', border: '1px solid #D1D5DB',
      borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
    },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <p style={s.logo}>Cubby</p>
        <h1 style={s.headerTitle}>Admin Dashboard</h1>
      </div>

      <p style={s.sectionLabel}>Overview</p>
      <div style={s.statsGrid}>
        {STATS.map(stat => (
          <div key={stat.label} style={s.statCard}>
            <span style={s.statIcon}>{stat.icon}</span>
            <p style={s.statValue}>{stat.value}</p>
            <p style={s.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      <p style={s.sectionLabel}>Quick Actions</p>
      <div style={s.navGrid}>
        {NAV_CARDS.map(card => (
          <button
            key={card.label}
            onClick={() => router.replace(card.route as any)}
            style={s.navCard}
          >
            <span style={s.navCardIcon}>{card.icon}</span>
            <span style={s.navCardLabel}>{card.label}</span>
          </button>
        ))}
      </div>

      {confirmSignOut ? (
        <div style={s.confirmBox}>
          <span style={s.confirmText}>Sure you want to sign out?</span>
          <button style={s.confirmYes} onClick={handleSignOut}>Yes</button>
          <button style={s.confirmNo} onClick={() => setConfirmSignOut(false)}>No</button>
        </div>
      ) : (
        <button style={s.signOutBtn} onClick={() => setConfirmSignOut(true)}>
          Sign Out
        </button>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}
