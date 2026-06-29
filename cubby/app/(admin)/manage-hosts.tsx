import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';

const ADMIN_SECRET = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? 'cubby-admin-secret-2025';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gqgxahqmndkaeyuvhliv.supabase.co';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ3hhaHFtbmRrYWV5dXZobGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzczNjIsImV4cCI6MjA5NzM1MzM2Mn0.EVuPdC3L_eFrCAGKVCDYPpuuSUiNXOvAkBf-Uc5NqyM';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HostSummary {
  id: string;
  display_name: string;
  location_name: string;
  business_type: string;
  price_per_bag_per_day: number;
  max_bags: number;
  is_active: boolean;
  assigned_user_id: string | null;
  user_id: string;
  rating: number;
  review_count: number;
  created_at: string;
  ownerEmail: string | null;
  bookingCount: number;
}

interface HostDetail {
  host: Record<string, any>;
  ownerProfile: { id: string; email: string; full_name: string; phone: string } | null;
  bookings: Array<Record<string, any>>;
  stats: {
    total: number;
    completed: number;
    cancelled: number;
    active: number;
    upcoming: number;
    totalRevenue: number;
    hostEarnings: number;
    cubbyEarnings: number;
    avgRating: number;
    reviewCount: number;
    responseRate: number | null;
    avgResponseTimeMinutes: number | null;
    totalRequests: number;
    respondedRequests: number;
    missedRequests: number;
    pendingRequests: number;
  };
}

const TYPE_EMOJI: Record<string, string> = {
  café: '☕', cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📍',
};

const BUSINESS_TYPES = ['café', 'hotel', 'hostel', 'guesthouse', 'airbnb', 'tour_operator', 'home', 'other'];
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── API helper ───────────────────────────────────────────────────────────────

async function callAdminHosts(
  method: 'GET' | 'POST' | 'PATCH',
  params?: Record<string, string>,
  body?: unknown,
): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/admin-hosts`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
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

export default function ManageHosts() {
  const [hosts, setHosts] = useState<HostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Detail sheet state
  const [selectedHost, setSelectedHost] = useState<HostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Assign state
  const [assignEmail, setAssignEmail] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Delete state
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'force'>('idle');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadHosts(); }, []));

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  // ─── Load list ──────────────────────────────────────────────────────────────

  async function loadHosts() {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await callAdminHosts('GET');
      if (result.error) { setErrorMsg(result.error); }
      else setHosts(result.data ?? []);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to load hosts');
    } finally {
      setLoading(false);
    }
  }

  // ─── Load detail ────────────────────────────────────────────────────────────

  async function openDetail(hostId: string) {
    setDetailLoading(true);
    setDetailError('');
    setSelectedHost(null);
    setEditing(false);
    setEditFields({});
    setDeleteStep('idle');
    setAssignEmail('');
    try {
      const result = await callAdminHosts('GET', { id: hostId });
      if (result.error) { setDetailError(result.error); }
      else {
        setSelectedHost(result.data);
        setEditFields(result.data.host);
      }
    } catch (e: any) {
      setDetailError(e.message ?? 'Failed to load host detail');
    } finally {
      setDetailLoading(false);
    }
  }

  // ─── Edit ───────────────────────────────────────────────────────────────────

  async function saveEdit() {
    if (!selectedHost) return;
    setEditLoading(true);
    try {
      const updates: Record<string, any> = {};
      const h = selectedHost.host;
      const fields = ['display_name', 'bio', 'location_name', 'business_type',
        'price_per_bag_per_day', 'max_bags', 'available_from', 'available_until',
        'available_days', 'is_active'];
      for (const f of fields) {
        if (editFields[f] !== h[f]) updates[f] = editFields[f];
      }
      if (Object.keys(updates).length === 0) { setEditing(false); return; }
      const result = await callAdminHosts('PATCH', {}, { hostId: h.id, updates });
      if (result.error) { setDetailError(result.error); return; }
      // Update local state
      setSelectedHost(prev => prev ? { ...prev, host: { ...prev.host, ...updates } } : prev);
      setHosts(prev => prev.map(host => host.id === h.id
        ? { ...host, display_name: editFields.display_name ?? host.display_name, is_active: editFields.is_active ?? host.is_active, location_name: editFields.location_name ?? host.location_name, price_per_bag_per_day: editFields.price_per_bag_per_day ?? host.price_per_bag_per_day }
        : host));
      setEditing(false);
      flash('Host updated ✓');
    } catch (e: any) {
      setDetailError(e.message ?? 'Update failed');
    } finally {
      setEditLoading(false);
    }
  }

  // ─── Assign ─────────────────────────────────────────────────────────────────

  async function assignUser() {
    if (!selectedHost || !assignEmail.trim()) return;
    setAssignLoading(true);
    setDetailError('');
    try {
      const result = await callAdminHosts('POST', {}, {
        action: 'assign',
        hostId: selectedHost.host.id,
        email: assignEmail.trim(),
      });
      if (result.error) { setDetailError(result.error); return; }
      setSelectedHost(prev => prev ? { ...prev, ownerProfile: result.profile } : prev);
      setHosts(prev => prev.map(h => h.id === selectedHost.host.id
        ? { ...h, ownerEmail: result.profile?.email ?? null, assigned_user_id: result.profile?.id ?? null }
        : h));
      setAssignEmail('');
      flash('User assigned ✓');
    } catch (e: any) {
      setDetailError(e.message ?? 'Assign failed');
    } finally {
      setAssignLoading(false);
    }
  }

  async function removeUser() {
    if (!selectedHost) return;
    setAssignLoading(true);
    setDetailError('');
    try {
      const result = await callAdminHosts('POST', {}, {
        action: 'remove_user',
        hostId: selectedHost.host.id,
      });
      if (result.error) { setDetailError(result.error); return; }
      setSelectedHost(prev => prev ? { ...prev, ownerProfile: null } : prev);
      setHosts(prev => prev.map(h => h.id === selectedHost.host.id
        ? { ...h, ownerEmail: null, assigned_user_id: null }
        : h));
      flash('Owner removed ✓');
    } catch (e: any) {
      setDetailError(e.message ?? 'Remove failed');
    } finally {
      setAssignLoading(false);
    }
  }

  // ─── Deactivate ─────────────────────────────────────────────────────────────

  async function deactivate() {
    if (!selectedHost) return;
    setEditLoading(true);
    try {
      const result = await callAdminHosts('PATCH', {}, {
        hostId: selectedHost.host.id,
        updates: { is_active: false },
      });
      if (result.error) { setDetailError(result.error); return; }
      setSelectedHost(prev => prev ? { ...prev, host: { ...prev.host, is_active: false } } : prev);
      setHosts(prev => prev.map(h => h.id === selectedHost.host.id ? { ...h, is_active: false } : h));
      flash('Host deactivated ✓');
      setDeleteStep('idle');
    } catch (e: any) {
      setDetailError(e.message ?? 'Deactivate failed');
    } finally {
      setEditLoading(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function deleteHost(force = false) {
    if (!selectedHost) return;
    setDeleteLoading(true);
    setDetailError('');
    try {
      const result = await callAdminHosts('POST', {}, {
        action: 'delete',
        hostId: selectedHost.host.id,
        force,
      });
      if (result.requiresForce) {
        setDeleteStep('force');
        setDeleteLoading(false);
        return;
      }
      if (result.error) { setDetailError(result.error); setDeleteLoading(false); return; }
      setHosts(prev => prev.filter(h => h.id !== selectedHost.host.id));
      setSelectedHost(null);
      flash(`Host deleted`);
    } catch (e: any) {
      setDetailError(e.message ?? 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto' },
    header: { padding: '16px 20px 12px', borderBottom: '1px solid #F0EAEA' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#2D6A4F', fontWeight: 600, padding: '0 0 8px', display: 'block' },
    title: { fontSize: 24, fontWeight: 900, color: '#1a1a1a', margin: 0 },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    msg: (type: 'success' | 'error') => ({
      margin: '8px 12px', padding: '10px 14px', borderRadius: 10,
      backgroundColor: type === 'success' ? '#D1FAE5' : '#FEF2F2',
      color: type === 'success' ? '#065F46' : '#DC2626', fontWeight: 600, fontSize: 13,
    }),
    card: { backgroundColor: '#fff', borderRadius: 14, border: '1px solid #F0EAEA', margin: '10px 12px 0', cursor: 'pointer', overflow: 'hidden' },
    cardTop: { padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
    cardBottom: { padding: '10px 16px', borderTop: '1px solid #F8F8F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    activeBadge: (active: boolean) => ({
      backgroundColor: active ? '#D1FAE5' : '#F3F4F6',
      color: active ? '#16A34A' : '#9CA3AF',
      borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700,
    }),
    empty: { textAlign: 'center' as any, padding: '60px 20px', color: '#9CA3AF' },
    fab: { position: 'fixed' as any, bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: '#2D6A4F', border: 'none', color: 'white', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    // Sheet
    backdrop: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' as any, justifyContent: 'center' },
    sheet: { backgroundColor: '#FAF9F6', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' as any, padding: '0 0 40px' },
    sheetHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, margin: '12px auto 0' },
    sheetHeader: { padding: '14px 20px 12px', borderBottom: '1px solid #F0EAEA', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
    sheetTitle: { fontSize: 18, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    sheetSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    section: { padding: '14px 20px 0' },
    sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 8 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
    rowLabel: { fontSize: 14, color: '#6B7280' },
    rowValue: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' as any, maxWidth: '55%' },
    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 },
    statCard: { backgroundColor: '#fff', borderRadius: 10, border: '1px solid #F0EAEA', padding: '10px 8px', textAlign: 'center' as any },
    statVal: { fontSize: 18, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    statLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
    // Edit form
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, backgroundColor: '#fff', boxSizing: 'border-box' as any, marginBottom: 10 },
    textarea: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, backgroundColor: '#fff', boxSizing: 'border-box' as any, marginBottom: 10, minHeight: 72, resize: 'vertical' as any },
    select: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, backgroundColor: '#fff', boxSizing: 'border-box' as any, marginBottom: 10 },
    // Action buttons
    btn: (bg: string, color: string, border = 'transparent') => ({
      padding: '10px 16px', borderRadius: 10, border: `1px solid ${border}`,
      backgroundColor: bg, color, fontWeight: 700, cursor: 'pointer', fontSize: 13,
      textAlign: 'center' as any,
    }),
    btnRow: { display: 'flex', gap: 8, marginTop: 10 },
    closeBtn: { display: 'block', margin: '16px 20px 0', padding: '12px', borderRadius: 12, border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, textAlign: 'center' as any, color: '#6B7280' },
    dayChip: (active: boolean) => ({
      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
      backgroundColor: active ? '#2D6A4F' : '#F3F4F6',
      color: active ? '#fff' : '#6B7280',
      border: 'none',
    }),
  };

  // ─── Detail sheet ────────────────────────────────────────────────────────────

  function HostSheet() {
    if (!selectedHost) return null;
    const { host, ownerProfile, bookings, stats } = selectedHost;
    const days: string[] = editFields.available_days ?? host.available_days ?? ALL_DAYS;

    function toggleDay(d: string) {
      const current: string[] = editFields.available_days ?? host.available_days ?? ALL_DAYS;
      const next = current.includes(d) ? current.filter((x: string) => x !== d) : [...current, d];
      setEditFields((prev: any) => ({ ...prev, available_days: next }));
    }

    const recentBookings = bookings.slice(0, 5);

    return (
      <div style={s.backdrop} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedHost(null); setEditing(false); } }}>
        <div style={s.sheet}>
          <div style={s.sheetHandle} />

          <div style={s.sheetHeader}>
            <div>
              <p style={s.sheetTitle}>{host.display_name}</p>
              <p style={s.sheetSub}>{host.location_name} · {host.business_type}</p>
            </div>
            <span style={s.activeBadge(host.is_active)}>{host.is_active ? 'Active' : 'Inactive'}</span>
          </div>

          {!!detailError && <div style={{ ...s.msg('error'), margin: '8px 20px' }}>{detailError}</div>}

          {/* ── Performance Stats ── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>Performance</p>
            <div style={s.statGrid}>
              {[
                [stats.total, 'Total bookings'],
                [stats.completed, 'Completed'],
                [stats.cancelled, 'Cancelled'],
                [`R${stats.totalRevenue}`, 'Total revenue'],
                [`R${stats.hostEarnings}`, 'Host earnings'],
                [`R${stats.cubbyEarnings}`, 'Cubby cut'],
                [stats.avgRating > 0 ? `${stats.avgRating}★` : '—', 'Rating'],
                [stats.reviewCount, 'Reviews'],
                [stats.responseRate != null ? `${stats.responseRate}%` : 'New host', 'Response rate'],
                [stats.avgResponseTimeMinutes != null ? `${stats.avgResponseTimeMinutes}m` : '—', 'Avg response time'],
                [stats.totalRequests, 'Total requests'],
                [stats.respondedRequests, 'Responded'],
                [stats.missedRequests, 'Missed'],
                [stats.pendingRequests, 'Pending now'],
              ].map(([val, lbl]) => (
                <div key={lbl as string} style={s.statCard}>
                  <p style={s.statVal}>{val}</p>
                  <p style={s.statLbl}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Host Info ── */}
          {!editing && (
            <div style={s.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ ...s.sectionLabel, margin: 0 }}>Host Details</p>
                <button style={s.btn('#F0FDF4', '#16A34A', '#BBF7D0')} onClick={() => setEditing(true)}>✏️ Edit</button>
              </div>
              {[
                ['Name', host.display_name],
                ['Location', host.location_name],
                ['Type', host.business_type],
                ['Bio', host.bio ?? '—'],
                ['Price', `R${host.price_per_bag_per_day}/bag/day`],
                ['Max bags', host.max_bags],
                ['Hours', `${host.available_from ?? '—'} – ${host.available_until ?? '—'}`],
                ['Days', (host.available_days ?? ALL_DAYS).join(', ')],
                ['Rating', host.rating > 0 ? `${host.rating} ★ (${host.review_count} reviews)` : 'No reviews yet'],
                ['Created', new Date(host.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })],
                ['ID', <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9CA3AF' }}>{host.id}</span>],
              ].map(([label, value]) => (
                <div key={label as string} style={s.row}>
                  <span style={s.rowLabel}>{label}</span>
                  <span style={s.rowValue}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Edit Form ── */}
          {editing && (
            <div style={s.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ ...s.sectionLabel, margin: 0 }}>Editing Host</p>
                <button style={s.btn('#F3F4F6', '#6B7280')} onClick={() => { setEditing(false); setEditFields(host); }}>Cancel</button>
              </div>

              <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Name</label>
              <input style={s.input} value={editFields.display_name ?? ''} onChange={(e: any) => setEditFields((p: any) => ({ ...p, display_name: e.target.value }))} />

              <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Location</label>
              <input style={s.input} value={editFields.location_name ?? ''} onChange={(e: any) => setEditFields((p: any) => ({ ...p, location_name: e.target.value }))} />

              <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Bio</label>
              <textarea style={s.textarea} value={editFields.bio ?? ''} onChange={(e: any) => setEditFields((p: any) => ({ ...p, bio: e.target.value }))} />

              <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Business type</label>
              <select style={s.select} value={editFields.business_type ?? 'home'} onChange={(e: any) => setEditFields((p: any) => ({ ...p, business_type: e.target.value }))}>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Price (R/bag/day)</label>
                  <input style={s.input} type="number" value={editFields.price_per_bag_per_day ?? ''} onChange={(e: any) => setEditFields((p: any) => ({ ...p, price_per_bag_per_day: Number(e.target.value) }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Max bags</label>
                  <input style={s.input} type="number" value={editFields.max_bags ?? ''} onChange={(e: any) => setEditFields((p: any) => ({ ...p, max_bags: Number(e.target.value) }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Opens</label>
                  <input style={s.input} type="time" value={editFields.available_from ?? '08:00'} onChange={(e: any) => setEditFields((p: any) => ({ ...p, available_from: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Closes</label>
                  <input style={s.input} type="time" value={editFields.available_until ?? '20:00'} onChange={(e: any) => setEditFields((p: any) => ({ ...p, available_until: e.target.value }))} />
                </div>
              </div>

              <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 6 }}>Available days</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as any, marginBottom: 10 }}>
                {ALL_DAYS.map(d => (
                  <button key={d} style={s.dayChip(days.includes(d))} onClick={() => toggleDay(d)}>{d}</button>
                ))}
              </div>

              <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={editFields.is_active ?? host.is_active} onChange={(e: any) => setEditFields((p: any) => ({ ...p, is_active: e.target.checked }))} />
                Active (visible to travellers)
              </label>

              <div style={s.btnRow}>
                <button style={{ ...s.btn('#2D6A4F', '#fff'), flex: 1 }} onClick={saveEdit} disabled={editLoading}>
                  {editLoading ? 'Saving…' : '✓ Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Owner ── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>Owner</p>
            {ownerProfile ? (
              <>
                {[
                  ['Name', ownerProfile.full_name ?? '—'],
                  ['Email', ownerProfile.email],
                  ['Phone', ownerProfile.phone ?? '—'],
                ].map(([label, value]) => (
                  <div key={label as string} style={s.row}>
                    <span style={s.rowLabel}>{label}</span>
                    <span style={s.rowValue}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...s.input, flex: 1, marginBottom: 0 }}
                    placeholder="New owner email…"
                    value={assignEmail}
                    onChange={(e: any) => setAssignEmail(e.target.value)}
                  />
                  <button style={s.btn('#FFFBEB', '#92400E', '#FDE68A')} onClick={assignUser} disabled={assignLoading}>
                    {assignLoading ? '…' : 'Reassign'}
                  </button>
                </div>
                <button style={{ ...s.btn('#FEF2F2', '#DC2626', '#FECACA'), width: '100%', marginTop: 8 }} onClick={removeUser} disabled={assignLoading}>
                  {assignLoading ? '…' : '✗ Remove Owner'}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600, margin: '0 0 8px' }}>⚠️ No owner assigned</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...s.input, flex: 1, marginBottom: 0 }}
                    placeholder="Assign by email…"
                    value={assignEmail}
                    onChange={(e: any) => setAssignEmail(e.target.value)}
                  />
                  <button style={s.btn('#2D6A4F', '#fff')} onClick={assignUser} disabled={assignLoading}>
                    {assignLoading ? '…' : 'Assign'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Recent Bookings ── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>Recent Bookings ({stats.total} total)</p>
            {recentBookings.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>No bookings yet</p>
            ) : (
              recentBookings.map((b: any) => {
                const statusColor: Record<string, string> = { pending: '#F59E0B', confirmed: '#3B82F6', active: '#2D6A4F', completed: '#16A34A', cancelled: '#DC2626' };
                return (
                  <div key={b.id} style={s.row}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: statusColor[b.status] ?? '#6B7280' }}>{b.status}</span>
                      <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>{b.bag_count} bag{b.bag_count !== 1 ? 's' : ''}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>R{b.total_price ?? 0}</span>
                  </div>
                );
              })
            )}
            {bookings.length > 5 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' as any, marginTop: 8 }}>
                +{bookings.length - 5} more — view in All Bookings
              </p>
            )}
          </div>

          {/* ── Danger Zone ── */}
          <div style={s.section}>
            <p style={{ ...s.sectionLabel, color: '#DC2626' }}>Danger Zone</p>

            {deleteStep === 'idle' && (
              <div style={s.btnRow}>
                {host.is_active ? (
                  <button style={{ ...s.btn('#FEF3C7', '#92400E', '#FDE68A'), flex: 1 }} onClick={deactivate} disabled={editLoading}>
                    {editLoading ? '…' : '⏸ Deactivate Listing'}
                  </button>
                ) : (
                  <button style={{ ...s.btn('#F0FDF4', '#16A34A', '#BBF7D0'), flex: 1 }}
                    onClick={() => callAdminHosts('PATCH', {}, { hostId: host.id, updates: { is_active: true } }).then(() => {
                      setSelectedHost(prev => prev ? { ...prev, host: { ...prev.host, is_active: true } } : prev);
                      setHosts(prev => prev.map(h => h.id === host.id ? { ...h, is_active: true } : h));
                      flash('Host reactivated ✓');
                    })}>
                    ▶ Reactivate Listing
                  </button>
                )}
                <button style={{ ...s.btn('#FEF2F2', '#DC2626', '#FECACA'), flex: 1 }} onClick={() => setDeleteStep('confirm')}>
                  🗑 Delete Host
                </button>
              </div>
            )}

            {deleteStep === 'confirm' && (
              <div style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, border: '1px solid #FECACA' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: '0 0 10px' }}>
                  Are you sure? This will permanently delete the host listing.
                </p>
                <div style={s.btnRow}>
                  <button style={{ ...s.btn('#DC2626', '#fff'), flex: 1 }} onClick={() => deleteHost(false)} disabled={deleteLoading}>
                    {deleteLoading ? '…' : 'Yes, Delete'}
                  </button>
                  <button style={{ ...s.btn('#fff', '#6B7280', '#E5E7EB'), flex: 1 }} onClick={() => setDeleteStep('idle')}>Cancel</button>
                </div>
              </div>
            )}

            {deleteStep === 'force' && (
              <div style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, border: '1px solid #FECACA' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: '0 0 6px' }}>
                  ⚠️ This host has active bookings.
                </p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 10px' }}>
                  Deleting will also cancel those bookings. Are you absolutely sure?
                </p>
                <div style={s.btnRow}>
                  <button style={{ ...s.btn('#DC2626', '#fff'), flex: 1 }} onClick={() => deleteHost(true)} disabled={deleteLoading}>
                    {deleteLoading ? '…' : 'Delete Anyway'}
                  </button>
                  <button style={{ ...s.btn('#fff', '#6B7280', '#E5E7EB'), flex: 1 }} onClick={() => setDeleteStep('idle')}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <button style={s.closeBtn} onClick={() => { setSelectedHost(null); setEditing(false); }}>Close</button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Manage Hosts</h1>
        <p style={s.subtitle}>{loading ? 'Loading…' : `${hosts.length} host${hosts.length !== 1 ? 's' : ''}`}</p>
      </div>

      {!!successMsg && <div style={s.msg('success')}>{successMsg}</div>}
      {!!errorMsg && <div style={s.msg('error')}>{errorMsg}</div>}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : hosts.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48 }}>🏠</div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '12px 0 8px' }}>No hosts yet</p>
          <button
            style={{ backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14, marginTop: 8 }}
            onClick={() => router.push('/(admin)/create-host' as any)}
          >
            Create Host Profile
          </button>
        </div>
      ) : (
        hosts.map(host => (
          <div key={host.id} style={s.card} onClick={() => openDetail(host.id)}>
            <div style={s.cardTop}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{TYPE_EMOJI[host.business_type] ?? '📍'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{host.display_name}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{host.location_name}</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {host.ownerEmail
                    ? <span style={{ color: '#2D6A4F', fontWeight: 600 }}>👤 {host.ownerEmail}</span>
                    : <span style={{ color: '#F59E0B', fontWeight: 600 }}>⚠️ Unassigned</span>
                  }
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as any, alignItems: 'flex-end', gap: 6 }}>
                <span style={s.activeBadge(host.is_active)}>{host.is_active ? 'Active' : 'Inactive'}</span>
                {host.rating > 0 && <span style={{ fontSize: 11, color: '#6B7280' }}>{host.rating}★</span>}
              </div>
            </div>
            <div style={s.cardBottom}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2D6A4F' }}>R{host.price_per_bag_per_day}/bag/day</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {host.bookingCount} booking{host.bookingCount !== 1 ? 's' : ''} · max {host.max_bags} bags
              </span>
              <span style={{ fontSize: 16, color: '#D1D5DB' }}>›</span>
            </div>
          </div>
        ))
      )}

      <div style={{ height: 80 }} />
      <button style={s.fab} onClick={() => router.push('/(admin)/create-host' as any)}>+</button>

      {/* Loading overlay for detail */}
      {detailLoading && (
        <div style={{ ...s.backdrop }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: 32, textAlign: 'center' as any }}>
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>Loading host details…</p>
          </div>
        </div>
      )}

      {selectedHost && <HostSheet />}
    </div>
  );
}
