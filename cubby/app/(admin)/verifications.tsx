import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

const SUPABASE_URL = 'https://gqgxahqmndkaeyuvhliv.supabase.co';
const ADMIN_SECRET = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ3hhaHFtbmRrYWV5dXZobGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzczNjIsImV4cCI6MjA5NzM1MzM2Mn0.EVuPdC3L_eFrCAGKVCDYPpuuSUiNXOvAkBf-Uc5NqyM';

async function callAdminHosts(method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-hosts`, {
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

interface Verification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  idPhotoUrl: string | null;
  selfieUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
}

export default function Verifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useFocusEffect(useCallback(() => { loadVerifications(); }, []));

  async function loadVerifications() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      // Try to load from verifications table — may not exist yet
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        // Table doesn't exist yet — show empty state
        setVerifications([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) { setVerifications([]); setLoading(false); return; }

      // Fetch profile info for each verification
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      let profileMap: Record<string, { name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        for (const p of profiles ?? []) {
          profileMap[p.id] = { name: p.full_name?.trim() || p.email?.split('@')[0] || 'User', email: p.email ?? '' };
        }
      }

      setVerifications(data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: profileMap[r.user_id]?.name ?? 'Unknown',
        userEmail: profileMap[r.user_id]?.email ?? '',
        idPhotoUrl: r.id_photo_url ?? null,
        selfieUrl: r.selfie_url ?? null,
        status: r.status ?? 'pending',
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at ?? null,
      })));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, userId: string, status: 'approved' | 'rejected') {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('verifications')
      .update({ status, reviewed_at: now })
      .eq('id', id);
    if (error) { setMsg('Error: ' + error.message); return; }

    // Update profile is_verified flag + sync the host listing for this user
    const isApproved = status === 'approved';
    await supabase.from('profiles').update({ is_verified: isApproved }).eq('id', userId);

    // Host row update goes through the service-role admin-hosts edge function
    // (not a direct client write) — the admin's own session has no special
    // RLS standing on the hosts table, only its own row via user_id.
    const { data: hostRow } = await supabase.from('hosts').select('id').eq('assigned_user_id', userId).maybeSingle();
    if (hostRow) {
      await callAdminHosts('PATCH', { hostId: hostRow.id, updates: { owner_is_verified: isApproved } });
    }

    // Notify the traveller
    await supabase.from('notifications').insert({
      user_id: userId,
      type: status === 'approved' ? 'verification_approved' : 'verification_rejected',
      title: status === 'approved' ? 'You\'re verified! ✅' : 'Verification unsuccessful',
      body: status === 'approved'
        ? 'Your identity has been confirmed. Your profile now shows the verified badge.'
        : 'We couldn\'t verify your identity. Please try again with a clearer photo of your ID and selfie.',
      read_at: null,
    });

    setVerifications(prev => prev.map(v => v.id === id ? { ...v, status, reviewedAt: now } : v));
    setMsg(`Verification ${status} ✓`);

    // Fire-and-forget push notification to the user
    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: userId,
        title: status === 'approved' ? 'You\'re verified! ✅' : 'Verification unsuccessful',
        body: status === 'approved'
          ? 'Your identity has been confirmed. Your profile now shows the verified badge.'
          : 'We couldn\'t verify your identity. Please try again with clearer photos.',
        data: { type: status === 'approved' ? 'verification_approved' : 'verification_rejected' },
      }),
    }).catch(() => {});
    setTimeout(() => setMsg(''), 3000);
  }

  const filtered = verifications.filter(v => v.status === tab);
  const pendingCount = verifications.filter(v => v.status === 'pending').length;

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto' },
    header: { padding: '16px 20px 12px', borderBottom: '1px solid #F0EAEA' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#2D6A4F', fontWeight: 600, padding: '0 0 8px', display: 'block' },
    title: { fontSize: 24, fontWeight: 900, color: '#1a1a1a', margin: 0 },
    tabs: { display: 'flex', gap: 8, padding: '12px 12px 0' },
    tab: (active: boolean) => ({ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, backgroundColor: active ? '#2D6A4F' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }),
    msg: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 16px', margin: '12px', color: '#065F46', fontWeight: 600 },
    card: { backgroundColor: '#fff', borderRadius: 14, border: '1px solid #F0EAEA', margin: '12px 12px 0', overflow: 'hidden' },
    cardTop: { padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cardBody: { padding: '0 16px 16px', borderTop: '1px solid #F8F8F8' },
    userName: { fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
    userEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    photosRow: { display: 'flex', gap: 12, marginTop: 14 },
    photoBox: { flex: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid #F0EAEA', aspectRatio: '3/4', backgroundColor: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    photoLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textAlign: 'center' as any, padding: '8px 0 6px', borderBottom: '1px solid #F5F5F5' },
    actions: { display: 'flex', gap: 10, marginTop: 14 },
    approveBtn: { flex: 1, backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
    rejectBtn: { flex: 1, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
    empty: { textAlign: 'center' as any, padding: '60px 20px', color: '#9CA3AF', fontSize: 15 },
    badge: (status: string) => {
      const map: any = { pending: ['#F59E0B', '#FFFBEB'], approved: ['#16A34A', '#F0FDF4'], rejected: ['#DC2626', '#FEF2F2'] };
      const [color, bg] = map[status] ?? ['#6B7280', '#F3F4F6'];
      return { backgroundColor: bg, color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 };
    },
    setupNotice: { margin: 12, padding: 16, backgroundColor: '#EFF6FF', borderRadius: 12, border: '1px solid #DBEAFE', fontSize: 14, color: '#1D4ED8', lineHeight: 1.6 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Verifications</h1>
      </div>

      <div style={s.tabs}>
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {!!msg && <div style={s.msg}>{msg}</div>}

      {!loading && verifications.length === 0 && (
        <div style={s.setupNotice}>
          <strong>Verification system not yet set up.</strong><br /><br />
          The <code>verifications</code> table doesn't exist yet. Run the SQL in the project setup guide to create it, then traveller ID submissions will appear here.
        </div>
      )}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : filtered.length === 0 && verifications.length > 0 ? (
        <div style={s.empty}>No {tab} verifications</div>
      ) : (
        filtered.map(v => (
          <div key={v.id} style={s.card}>
            <div style={s.cardTop} onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
              <div style={{ flex: 1 }}>
                <div style={s.userName}>{v.userName}</div>
                <div style={s.userEmail}>{v.userEmail}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                  {new Date(v.submittedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={s.badge(v.status)}>{v.status}</span>
                <span style={{ color: '#9CA3AF' }}>{expandedId === v.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedId === v.id && (
              <div style={s.cardBody}>
                <div style={s.photosRow}>
                  <div>
                    <div style={s.photoLabel}>ID Document</div>
                    {v.idPhotoUrl ? (
                      <img src={v.idPhotoUrl} alt="ID" style={{ width: '100%', display: 'block' }} />
                    ) : (
                      <div style={{ padding: 24, textAlign: 'center' as any, color: '#9CA3AF', fontSize: 13 }}>No photo</div>
                    )}
                  </div>
                  <div>
                    <div style={s.photoLabel}>Selfie</div>
                    {v.selfieUrl ? (
                      <img src={v.selfieUrl} alt="Selfie" style={{ width: '100%', display: 'block' }} />
                    ) : (
                      <div style={{ padding: 24, textAlign: 'center' as any, color: '#9CA3AF', fontSize: 13 }}>No photo</div>
                    )}
                  </div>
                </div>

                {v.status === 'pending' && (
                  <div style={s.actions}>
                    <button style={s.approveBtn} onClick={() => updateStatus(v.id, v.userId, 'approved')}>✓ Approve</button>
                    <button style={s.rejectBtn} onClick={() => updateStatus(v.id, v.userId, 'rejected')}>✗ Reject</button>
                  </div>
                )}
                {v.status !== 'pending' && v.reviewedAt && (
                  <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' as any, marginTop: 12 }}>
                    {v.status === 'approved' ? 'Approved' : 'Rejected'} on {new Date(v.reviewedAt).toLocaleDateString('en-ZA')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}
