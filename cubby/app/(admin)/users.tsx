import { useState, useCallback, useRef } from 'react';
import { useFocusEffect, router } from 'expo-router';

const ADMIN_SECRET = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? 'cubby-admin-secret-2025';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gqgxahqmndkaeyuvhliv.supabase.co';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ3hhaHFtbmRrYWV5dXZobGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzczNjIsImV4cCI6MjA5NzM1MzM2Mn0.EVuPdC3L_eFrCAGKVCDYPpuuSUiNXOvAkBf-Uc5NqyM';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  isVerified: boolean;
  isHostApproved: boolean;
  createdAt: string;
  bookingCount: number;
  reviewCount: number;
  assignedHost: { id: string; display_name: string } | null;
  verification: { status: string; submitted_at: string } | null;
}

type RoleFilter = '' | 'traveller' | 'host' | 'runner' | 'both';
type VerifiedFilter = '' | 'true' | 'false';
type HostApprovedFilter = '' | 'true' | 'false';

// ─── API helper ───────────────────────────────────────────────────────────────

async function callAdminUsers(
  method: 'GET' | 'PATCH',
  params?: Record<string, string>,
  body?: unknown,
): Promise<{ data?: User[]; success?: boolean; error?: string }> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/admin-users`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== '') url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'x-admin-secret': ADMIN_SECRET,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('');
  const [hostApprovedFilter, setHostApprovedFilter] = useState<HostApprovedFilter>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => { loadUsers(); }, []));

  async function loadUsers(overrideSearch?: string) {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await callAdminUsers('GET', {
        search: overrideSearch ?? search,
        role: roleFilter,
        verified: verifiedFilter,
        host_approved: hostApprovedFilter,
      });
      if (result.error) { setErrorMsg(result.error); setUsers([]); }
      else setUsers(result.data ?? []);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function onSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadUsers(val), 400);
  }

  async function applyFilter(
    field: 'role' | 'verified' | 'host_approved',
    val: string,
  ) {
    const next = { role: roleFilter, verified: verifiedFilter, host_approved: hostApprovedFilter };
    next[field] = val as any;
    if (field === 'role') setRoleFilter(val as RoleFilter);
    if (field === 'verified') setVerifiedFilter(val as VerifiedFilter);
    if (field === 'host_approved') setHostApprovedFilter(val as HostApprovedFilter);
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await callAdminUsers('GET', {
        search,
        role: next.role,
        verified: next.verified,
        host_approved: next.host_approved,
      });
      if (result.error) { setErrorMsg(result.error); setUsers([]); }
      else setUsers(result.data ?? []);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, updates: Record<string, unknown>, notifMsg: string) {
    setActionLoading(true);
    try {
      const result = await callAdminUsers('PATCH', {}, { userId, updates });
      if (result.error) { setErrorMsg(result.error); return; }
      // Update local state
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, ...mapUpdatesToUser(updates) } : u),
      );
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, ...mapUpdatesToUser(updates) } : prev);
      }
      flash(notifMsg);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Update failed');
    } finally {
      setActionLoading(false);
    }
  }

  function mapUpdatesToUser(updates: Record<string, unknown>): Partial<User> {
    const mapped: Partial<User> = {};
    if ('is_verified' in updates) mapped.isVerified = updates.is_verified as boolean;
    if ('is_host_approved' in updates) mapped.isHostApproved = updates.is_host_approved as boolean;
    if ('role' in updates) mapped.role = updates.role as string;
    return mapped;
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto' },
    header: { padding: '16px 20px 12px', borderBottom: '1px solid #F0EAEA' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#2D6A4F', fontWeight: 600, padding: '0 0 8px', display: 'block' },
    title: { fontSize: 24, fontWeight: 900, color: '#1a1a1a', margin: 0 },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    searchWrap: { padding: '12px 12px 0' },
    searchInput: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', boxSizing: 'border-box' as any, backgroundColor: '#fff' },
    filtersRow: { display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto' as any },
    filterBtn: (active: boolean) => ({
      padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? '#2D6A4F' : '#E5E7EB'}`,
      backgroundColor: active ? '#2D6A4F' : '#fff', color: active ? '#fff' : '#6B7280',
      fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as any, flexShrink: 0,
    }),
    msg: (type: 'success' | 'error') => ({
      margin: '8px 12px', padding: '10px 14px', borderRadius: 10,
      backgroundColor: type === 'success' ? '#D1FAE5' : '#FEF2F2',
      color: type === 'success' ? '#065F46' : '#DC2626',
      fontWeight: 600, fontSize: 13,
    }),
    userCard: { backgroundColor: '#fff', borderRadius: 14, border: '1px solid #F0EAEA', margin: '10px 12px 0', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 },
    avatar: (color: string) => ({
      width: 40, height: 40, borderRadius: 20, backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
    }),
    userName: { fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 },
    userEmail: { fontSize: 12, color: '#6B7280', margin: '2px 0 0' },
    userMeta: { fontSize: 11, color: '#9CA3AF', margin: '3px 0 0', display: 'flex', gap: 6, flexWrap: 'wrap' as any },
    badge: (color: string, bg: string) => ({ backgroundColor: bg, color, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }),
    arrow: { fontSize: 18, color: '#D1D5DB', marginLeft: 'auto', flexShrink: 0 },
    empty: { textAlign: 'center' as any, padding: '60px 20px', color: '#9CA3AF', fontSize: 15 },

    // Detail modal backdrop
    backdrop: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' as any, justifyContent: 'center' },
    sheet: { backgroundColor: '#FAF9F6', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' as any, padding: '0 0 40px' },
    sheetHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, margin: '12px auto 0' },
    sheetHeader: { padding: '16px 20px 12px', borderBottom: '1px solid #F0EAEA' },
    sheetTitle: { fontSize: 18, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    sheetEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    sheetSection: { padding: '14px 20px 0' },
    sheetSectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 8 },
    sheetRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
    sheetRowLabel: { fontSize: 14, color: '#6B7280' },
    sheetRowValue: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' as any },
    actionBtn: (color: string, border: string) => ({
      flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`,
      backgroundColor: color, fontWeight: 700, cursor: 'pointer', fontSize: 13, textAlign: 'center' as any,
    }),
    actionsRow: { display: 'flex', gap: 8, padding: '14px 20px 0' },
    closeBtn: { display: 'block', margin: '16px 20px 0', padding: '12px', borderRadius: 12, border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, textAlign: 'center' as any, color: '#6B7280' },
  };

  function avatarColor(id: string) {
    const colors = ['#2D6A4F', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
    const i = id.charCodeAt(0) % colors.length;
    return colors[i];
  }

  function initials(user: User) {
    const name = user.fullName?.trim();
    if (name) return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (user.email[0] ?? '?').toUpperCase();
  }

  function verifBadge(user: User) {
    if (user.isVerified) return <span style={s.badge('#16A34A', '#F0FDF4')}>✅ Verified</span>;
    if (user.verification?.status === 'pending') return <span style={s.badge('#D97706', '#FFFBEB')}>⏳ Pending</span>;
    return <span style={s.badge('#6B7280', '#F3F4F6')}>Unverified</span>;
  }

  function roleBadge(role: string) {
    const map: any = { traveller: ['#3B82F6', '#EFF6FF'], host: ['#2D6A4F', '#F0FDF4'], runner: ['#8B5CF6', '#F5F3FF'], both: ['#F59E0B', '#FFFBEB'] };
    const [c, bg] = map[role] ?? ['#6B7280', '#F3F4F6'];
    return <span style={s.badge(c, bg)}>{role}</span>;
  }

  // ─── Detail sheet ─────────────────────────────────────────────────────────

  function UserDetail({ user }: { user: User }) {
    return (
      <div style={s.backdrop} onClick={(e) => { if (e.target === e.currentTarget) setSelectedUser(null); }}>
        <div style={s.sheet}>
          <div style={s.sheetHandle} />

          <div style={s.sheetHeader}>
            <p style={s.sheetTitle}>{user.fullName ?? user.email.split('@')[0]}</p>
            <p style={s.sheetEmail}>{user.email}</p>
          </div>

          {/* Profile details */}
          <div style={s.sheetSection}>
            <p style={s.sheetSectionLabel}>Profile</p>
            {[
              ['Full name', user.fullName ?? '—'],
              ['Email', user.email],
              ['Phone', user.phone ?? '—'],
              ['Role', roleBadge(user.role)],
              ['Joined', new Date(user.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })],
              ['ID', <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{user.id}</span>],
            ].map(([label, value]) => (
              <div key={label as string} style={s.sheetRow}>
                <span style={s.sheetRowLabel}>{label}</span>
                <span style={s.sheetRowValue}>{value}</span>
              </div>
            ))}
          </div>

          {/* Verification */}
          <div style={s.sheetSection}>
            <p style={s.sheetSectionLabel}>Verification</p>
            <div style={s.sheetRow}>
              <span style={s.sheetRowLabel}>Profile verified</span>
              <span style={s.sheetRowValue}>{verifBadge(user)}</span>
            </div>
            {user.verification && (
              <div style={s.sheetRow}>
                <span style={s.sheetRowLabel}>Submission status</span>
                <span style={s.sheetRowValue}>{user.verification.status}</span>
              </div>
            )}
            {user.verification?.submitted_at && (
              <div style={s.sheetRow}>
                <span style={s.sheetRowLabel}>Submitted</span>
                <span style={s.sheetRowValue}>{new Date(user.verification.submitted_at).toLocaleDateString('en-ZA')}</span>
              </div>
            )}
          </div>

          {/* Activity */}
          <div style={s.sheetSection}>
            <p style={s.sheetSectionLabel}>Activity</p>
            <div style={s.sheetRow}>
              <span style={s.sheetRowLabel}>Bookings</span>
              <span style={s.sheetRowValue}>{user.bookingCount}</span>
            </div>
            <div style={s.sheetRow}>
              <span style={s.sheetRowLabel}>Reviews submitted</span>
              <span style={s.sheetRowValue}>{user.reviewCount}</span>
            </div>
          </div>

          {/* Host */}
          <div style={s.sheetSection}>
            <p style={s.sheetSectionLabel}>Host</p>
            <div style={s.sheetRow}>
              <span style={s.sheetRowLabel}>Host approved</span>
              <span style={s.sheetRowValue}>{user.isHostApproved ? <span style={s.badge('#16A34A', '#F0FDF4')}>Yes</span> : <span style={s.badge('#6B7280', '#F3F4F6')}>No</span>}</span>
            </div>
            <div style={s.sheetRow}>
              <span style={s.sheetRowLabel}>Assigned listing</span>
              <span style={s.sheetRowValue}>
                {user.assignedHost
                  ? <span style={{ color: '#2D6A4F', fontWeight: 700 }}>{user.assignedHost.display_name}</span>
                  : '—'}
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div style={s.sheetSection}>
            <p style={s.sheetSectionLabel}>Quick links</p>
            <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 8 }}>
              <button
                style={{ ...s.actionBtn('#F0FDF4', '#BBF7D0'), color: '#16A34A' }}
                onClick={() => { setSelectedUser(null); router.push('/(admin)/all-bookings' as any); }}
              >
                View All Bookings →
              </button>
              <button
                style={{ ...s.actionBtn('#F0F9FF', '#BAE6FD'), color: '#0369A1' }}
                onClick={() => { setSelectedUser(null); router.push('/(admin)/support-messages' as any); }}
              >
                View Support Messages →
              </button>
              <button
                style={{ ...s.actionBtn('#F5F3FF', '#DDD6FE'), color: '#6D28D9' }}
                onClick={() => { setSelectedUser(null); router.push('/(admin)/verifications' as any); }}
              >
                View Verifications →
              </button>
            </div>
          </div>

          {/* Admin actions */}
          <div style={s.sheetSection}>
            <p style={s.sheetSectionLabel}>Admin Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 8 }}>
              {user.isVerified ? (
                <button
                  style={{ ...s.actionBtn('#FEF2F2', '#FECACA'), color: '#DC2626' }}
                  disabled={actionLoading}
                  onClick={() => updateUser(user.id, { is_verified: false }, 'Verification revoked')}
                >
                  {actionLoading ? '…' : '✗ Revoke Verification'}
                </button>
              ) : (
                <button
                  style={{ ...s.actionBtn('#F0FDF4', '#BBF7D0'), color: '#16A34A' }}
                  disabled={actionLoading}
                  onClick={() => updateUser(user.id, { is_verified: true }, 'User marked as verified')}
                >
                  {actionLoading ? '…' : '✓ Mark as Verified'}
                </button>
              )}

              {user.isHostApproved ? (
                <button
                  style={{ ...s.actionBtn('#FEF2F2', '#FECACA'), color: '#DC2626' }}
                  disabled={actionLoading}
                  onClick={() => updateUser(user.id, { is_host_approved: false }, 'Host access revoked')}
                >
                  {actionLoading ? '…' : '✗ Revoke Host Access'}
                </button>
              ) : (
                <button
                  style={{ ...s.actionBtn('#FFFBEB', '#FDE68A'), color: '#92400E' }}
                  disabled={actionLoading}
                  onClick={() => updateUser(user.id, { is_host_approved: true }, 'Host access approved')}
                >
                  {actionLoading ? '…' : '✓ Approve Host Access'}
                </button>
              )}

              {user.assignedHost && (
                <button
                  style={{ ...s.actionBtn('#EFF6FF', '#BFDBFE'), color: '#1D4ED8' }}
                  disabled={actionLoading}
                  onClick={() => { setSelectedUser(null); router.push('/(admin)/manage-hosts' as any); }}
                >
                  Manage Host Listing →
                </button>
              )}
            </div>
          </div>

          <button style={s.closeBtn} onClick={() => setSelectedUser(null)}>Close</button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const totalCount = users.length;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Users</h1>
        <p style={s.subtitle}>{loading ? 'Loading…' : `${totalCount} user${totalCount !== 1 ? 's' : ''}`}</p>
      </div>

      {/* Search */}
      <div style={s.searchWrap}>
        <input
          style={s.searchInput}
          placeholder="Search by name or email…"
          value={search}
          onChange={(e: any) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div style={s.filtersRow}>
        <span style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'center', flexShrink: 0 }}>Role:</span>
        {(['', 'traveller', 'host', 'runner', 'both'] as RoleFilter[]).map(r => (
          <button key={r || 'all'} style={s.filterBtn(roleFilter === r)} onClick={() => applyFilter('role', r)}>
            {r || 'All'}
          </button>
        ))}
      </div>
      <div style={s.filtersRow}>
        <span style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'center', flexShrink: 0 }}>Verified:</span>
        {[['', 'All'], ['true', 'Yes'], ['false', 'No']].map(([val, label]) => (
          <button key={val || 'all-v'} style={s.filterBtn(verifiedFilter === val)} onClick={() => applyFilter('verified', val)}>
            {label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'center', flexShrink: 0, marginLeft: 8 }}>Host:</span>
        {[['', 'All'], ['true', 'Approved'], ['false', 'Not approved']].map(([val, label]) => (
          <button key={val || 'all-h'} style={s.filterBtn(hostApprovedFilter === val)} onClick={() => applyFilter('host_approved', val)}>
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {!!successMsg && <div style={s.msg('success')}>{successMsg}</div>}
      {!!errorMsg && <div style={s.msg('error')}>{errorMsg}</div>}

      {/* List */}
      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={s.empty}>No users found</div>
      ) : (
        users.map(user => (
          <div key={user.id} style={s.userCard} onClick={() => setSelectedUser(user)}>
            <div style={s.avatar(avatarColor(user.id))}>{initials(user)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.userName}>{user.fullName ?? user.email.split('@')[0]}</p>
              <p style={s.userEmail}>{user.email}</p>
              <div style={s.userMeta}>
                {roleBadge(user.role)}
                {verifBadge(user)}
                {user.bookingCount > 0 && (
                  <span style={s.badge('#3B82F6', '#EFF6FF')}>{user.bookingCount} booking{user.bookingCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
            <span style={s.arrow}>›</span>
          </div>
        ))
      )}

      <div style={{ height: 40 }} />

      {/* Detail sheet */}
      {selectedUser && <UserDetail user={selectedUser} />}
    </div>
  );
}
