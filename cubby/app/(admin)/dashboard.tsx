import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { checkAdminSession, clearAdminSession } from '../../src/lib/admin-auth';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface ActivityItem {
  id: string;
  type: 'booking' | 'application' | 'support' | 'verification' | 'host';
  title: string;
  subtitle: string;
  time: string;
  icon: string;
}

interface Stats {
  totalHosts: number;
  activeHosts: number;
  activeBookings: number;
  revenueMonth: number;
  revenueTotal: number;
  pendingHostApprovals: number;
  pendingPartnerApplications: number;
  openSupportMessages: number;
  pendingVerifications: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalHosts: 0, activeHosts: 0, activeBookings: 0,
    revenueMonth: 0, revenueTotal: 0,
    pendingHostApprovals: 0, pendingPartnerApplications: 0,
    openSupportMessages: 0, pendingVerifications: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  async function checkAuth() {
    const valid = await checkAdminSession();
    if (!valid) router.replace('/(admin)/login');
  }

  async function loadData() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: totalHosts },
        { count: activeHosts },
        { count: pendingHostApprovals },
        { count: pendingPartnerApps },
        { count: openSupport },
        { data: bookings },
        { data: recentBookings },
        { data: recentApplications },
        { data: recentSupport },
      ] = await Promise.all([
        supabase.from('hosts').select('*', { count: 'exact', head: true }),
        supabase.from('hosts').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('hosts').select('*', { count: 'exact', head: true }).eq('is_active', false),
        supabase.from('partner_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_messages').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
        supabase.from('bookings').select('status, total_price, created_at'),
        supabase.from('bookings').select('id, status, total_price, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('partner_applications').select('id, business_name, created_at, status').order('created_at', { ascending: false }).limit(5),
        supabase.from('support_messages').select('id, subject, created_at, status, user_email').order('created_at', { ascending: false }).limit(5),
      ]);

      const allBookings = bookings ?? [];
      const activeBookings = allBookings.filter((b: any) => ['confirmed', 'active'].includes(b.status)).length;
      const revenueTotal = allBookings
        .filter((b: any) => ['confirmed', 'completed'].includes(b.status))
        .reduce((sum: number, b: any) => sum + (b.total_price ?? 0), 0);
      const revenueMonth = allBookings
        .filter((b: any) => ['confirmed', 'completed'].includes(b.status) && b.created_at >= firstOfMonth)
        .reduce((sum: number, b: any) => sum + (b.total_price ?? 0), 0);

      setStats({
        totalHosts: totalHosts ?? 0,
        activeHosts: activeHosts ?? 0,
        activeBookings,
        revenueMonth,
        revenueTotal,
        pendingHostApprovals: pendingHostApprovals ?? 0,
        pendingPartnerApplications: pendingPartnerApps ?? 0,
        openSupportMessages: openSupport ?? 0,
        pendingVerifications: 0,
      });

      // Build merged activity feed
      const items: ActivityItem[] = [];

      for (const b of recentBookings ?? []) {
        const statusIcon: Record<string, string> = { pending: '⏳', confirmed: '✅', active: '📦', completed: '🏁', cancelled: '❌' };
        items.push({
          id: `b-${b.id}`,
          type: 'booking',
          icon: statusIcon[b.status] ?? '📋',
          title: `Booking ${b.status}`,
          subtitle: b.total_price ? `R${Number(b.total_price).toFixed(0)}` : 'No charge',
          time: new Date(b.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        });
      }

      for (const a of recentApplications ?? []) {
        items.push({
          id: `a-${a.id}`,
          type: 'application',
          icon: '🤝',
          title: `Partner application — ${a.business_name ?? 'Unknown'}`,
          subtitle: a.status === 'pending' ? 'Awaiting review' : a.status,
          time: new Date(a.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        });
      }

      for (const s of recentSupport ?? []) {
        items.push({
          id: `s-${s.id}`,
          type: 'support',
          icon: '💬',
          title: s.subject ?? 'Support message',
          subtitle: s.status === 'open' ? 'Open — needs response' : 'Resolved',
          time: new Date(s.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        });
      }

      items.sort((a, b) => b.time.localeCompare(a.time));
      setActivity(items.slice(0, 15));
    } catch (e) {
      console.error('[admin dashboard] loadData error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await clearAdminSession();
    router.replace('/(traveller)/explore');
  }

  const needsAttention = [
    stats.pendingPartnerApplications > 0 && {
      label: `${stats.pendingPartnerApplications} partner application${stats.pendingPartnerApplications > 1 ? 's' : ''} awaiting review`,
      route: '/(admin)/partner-applications',
      color: '#F59E0B',
    },
    stats.openSupportMessages > 0 && {
      label: `${stats.openSupportMessages} open support message${stats.openSupportMessages > 1 ? 's' : ''}`,
      route: '/(admin)/support-messages',
      color: '#EF4444',
    },
    stats.pendingVerifications > 0 && {
      label: `${stats.pendingVerifications} verification${stats.pendingVerifications > 1 ? 's' : ''} to review`,
      route: '/(admin)/verifications',
      color: '#8B5CF6',
    },
    stats.pendingHostApprovals > 0 && {
      label: `${stats.pendingHostApprovals} inactive host${stats.pendingHostApprovals > 1 ? 's' : ''} (may need setup)`,
      route: '/(admin)/manage-hosts',
      color: '#3B82F6',
    },
  ].filter(Boolean) as { label: string; route: string; color: string }[];

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowY: 'auto', maxWidth: 480, margin: '0 auto' },
    header: { padding: '20px 20px 8px', borderBottom: '1px solid #F0EAEA' },
    logo: { fontSize: 11, fontWeight: 800, color: '#2D6A4F', letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' },
    headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 26, fontWeight: 900, color: '#1a1a1a', margin: 0 },
    exitBtn: { background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer' },
    sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, padding: '20px 20px 8px', margin: 0 },

    // Needs Attention
    attentionCard: (color: string) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', border: `1.5px solid ${color}20`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }),
    attentionLabel: (color: string) => ({ fontSize: 14, fontWeight: 600, color: '#1a1a1a', flex: 1 }),
    attentionArrow: { fontSize: 16, color: '#9CA3AF' },

    // Snapshot grid
    snapshotGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 12px' },
    snapshotCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, border: '1px solid #F0EAEA', textAlign: 'center' as any },
    snapshotVal: { fontSize: 20, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    snapshotLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 1.3 },

    // Section cards
    sectionCard: { margin: '0 12px', backgroundColor: '#fff', borderRadius: 14, border: '1px solid #F0EAEA', overflow: 'hidden', marginBottom: 0 },
    sectionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #F8F8F8', cursor: 'pointer' },
    sectionRowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' },
    sectionRowLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    sectionRowIcon: { fontSize: 20, width: 32 },
    sectionRowLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
    sectionRowBadge: (color: string) => ({ backgroundColor: color + '20', color: color, borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700 }),

    // Activity feed
    activityWrap: { padding: '0 12px', marginBottom: 40 },
    activityItem: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #F5F5F5' },
    activityIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
    activityTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '0 0 2px' },
    activitySub: { fontSize: 12, color: '#6B7280', margin: 0 },
    activityTime: { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto', flexShrink: 0 },

    // Sign out confirm
    confirmBox: { margin: '16px 12px', backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 },
    confirmYes: { backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
    confirmNo: { backgroundColor: '#fff', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <p style={s.logo}>Cubby Operations</p>
        <div style={s.headerRow}>
          <h1 style={s.headerTitle}>Dashboard</h1>
          <button style={s.exitBtn} onClick={() => setConfirmSignOut(true)}>Exit Admin</button>
        </div>
      </div>

      {/* ---- Needs Attention ---- */}
      {needsAttention.length > 0 && (
        <>
          <p style={{ ...s.sectionLabel, color: '#EF4444' }}>🚨 Needs Attention</p>
          <div style={{ padding: '0 12px' }}>
            {needsAttention.map(item => (
              <div key={item.route} style={s.attentionCard(item.color)} onClick={() => router.push(item.route as any)}>
                <span style={s.attentionLabel(item.color)}>{item.label}</span>
                <span style={s.attentionArrow}>›</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- Today's Snapshot ---- */}
      <p style={s.sectionLabel}>Today's Snapshot</p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>Loading…</div>
      ) : (
        <div style={s.snapshotGrid}>
          <div style={s.snapshotCard}>
            <p style={s.snapshotVal}>R{stats.revenueMonth.toFixed(0)}</p>
            <p style={s.snapshotLabel}>Revenue this month</p>
          </div>
          <div style={s.snapshotCard}>
            <p style={s.snapshotVal}>{stats.activeBookings}</p>
            <p style={s.snapshotLabel}>Active bookings</p>
          </div>
          <div style={s.snapshotCard}>
            <p style={s.snapshotVal}>{stats.activeHosts}</p>
            <p style={s.snapshotLabel}>Active hosts</p>
          </div>
        </div>
      )}

      {/* ---- Marketplace ---- */}
      <p style={s.sectionLabel}>Marketplace</p>
      <div style={s.sectionCard}>
        <div style={s.sectionRow} onClick={() => router.push('/(admin)/manage-hosts' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>🏠</span>
            <div>
              <div style={s.sectionRowLabel}>Manage Hosts</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{stats.totalHosts} total · {stats.activeHosts} active</div>
            </div>
          </div>
          <span style={s.attentionArrow}>›</span>
        </div>
        <div style={s.sectionRow} onClick={() => router.push('/(admin)/all-bookings' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>📋</span>
            <div>
              <div style={s.sectionRowLabel}>All Bookings</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{stats.activeBookings} active</div>
            </div>
          </div>
          <span style={s.attentionArrow}>›</span>
        </div>
        <div style={s.sectionRowLast} onClick={() => router.push('/(admin)/revenue' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>📊</span>
            <div>
              <div style={s.sectionRowLabel}>Revenue</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>R{stats.revenueTotal.toFixed(0)} total</div>
            </div>
          </div>
          <span style={s.attentionArrow}>›</span>
        </div>
      </div>

      {/* ---- Approvals ---- */}
      <p style={s.sectionLabel}>Approvals</p>
      <div style={s.sectionCard}>
        <div style={s.sectionRow} onClick={() => router.push('/(admin)/partner-applications' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>🤝</span>
            <span style={s.sectionRowLabel}>Partner Applications</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.pendingPartnerApplications > 0 && (
              <span style={s.sectionRowBadge('#F59E0B')}>{stats.pendingPartnerApplications} pending</span>
            )}
            <span style={s.attentionArrow}>›</span>
          </div>
        </div>
        <div style={s.sectionRow} onClick={() => router.push('/(admin)/verifications' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>🪪</span>
            <span style={s.sectionRowLabel}>Verifications</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.pendingVerifications > 0 && (
              <span style={s.sectionRowBadge('#8B5CF6')}>{stats.pendingVerifications} pending</span>
            )}
            <span style={s.attentionArrow}>›</span>
          </div>
        </div>
        <div style={s.sectionRow} onClick={() => router.push('/(admin)/create-host' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>➕</span>
            <span style={s.sectionRowLabel}>Create Host Profile</span>
          </div>
          <span style={s.attentionArrow}>›</span>
        </div>
        <div style={s.sectionRowLast} onClick={() => router.push('/(admin)/host-payouts' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>🏦</span>
            <span style={s.sectionRowLabel}>Host Bank Details</span>
          </div>
          <span style={s.attentionArrow}>›</span>
        </div>
      </div>

      {/* ---- Support ---- */}
      <p style={s.sectionLabel}>Support</p>
      <div style={s.sectionCard}>
        <div style={s.sectionRowLast} onClick={() => router.push('/(admin)/support-messages' as any)}>
          <div style={s.sectionRowLeft}>
            <span style={s.sectionRowIcon}>💬</span>
            <span style={s.sectionRowLabel}>Support Messages</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.openSupportMessages > 0 && (
              <span style={s.sectionRowBadge('#EF4444')}>{stats.openSupportMessages} open</span>
            )}
            <span style={s.attentionArrow}>›</span>
          </div>
        </div>
      </div>

      {/* ---- Recent Activity ---- */}
      <p style={s.sectionLabel}>Recent Activity</p>
      <div style={s.activityWrap}>
        {activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 14 }}>No recent activity</div>
        ) : (
          activity.map(item => (
            <div key={item.id} style={s.activityItem}>
              <div style={s.activityIconWrap}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={s.activityTitle}>{item.title}</p>
                <p style={s.activitySub}>{item.subtitle}</p>
              </div>
              <span style={s.activityTime}>{item.time}</span>
            </div>
          ))
        )}
      </div>

      {/* ---- Sign Out ---- */}
      {confirmSignOut ? (
        <div style={s.confirmBox}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>Exit admin and return to app?</span>
          <button style={s.confirmYes} onClick={handleSignOut}>Yes, exit</button>
          <button style={s.confirmNo} onClick={() => setConfirmSignOut(false)}>Stay</button>
        </div>
      ) : null}

      <div style={{ height: 40 }} />
    </div>
  );
}
