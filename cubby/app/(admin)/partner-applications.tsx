import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface Application {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function PartnerApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [msg, setMsg] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadApps(); }, []));

  async function loadApps() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setApps(data.map((r: any) => ({
          id: r.id,
          businessName: r.business_name ?? '',
          contactName: r.name ?? '',
          email: r.email ?? '',
          phone: r.phone ?? '',
          message: r.message ?? '',
          status: r.status ?? 'pending',
          createdAt: r.created_at,
        })));
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('partner_applications')
      .update({ status })
      .eq('id', id);
    if (error) { setMsg('Error: ' + error.message); return; }
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setMsg(`Application ${status} ✓`);
    setTimeout(() => setMsg(''), 3000);
  }

  const filtered = apps.filter(a => a.status === tab);

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto' },
    header: { padding: '16px 20px 12px', borderBottom: '1px solid #F0EAEA' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#2D6A4F', fontWeight: 600, padding: '0 0 8px', display: 'block' },
    title: { fontSize: 24, fontWeight: 900, color: '#1a1a1a', margin: 0 },
    tabs: { display: 'flex', gap: 8, padding: '12px 12px 0' },
    tab: (active: boolean) => ({ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, backgroundColor: active ? '#2D6A4F' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }),
    msg: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 16px', margin: '12px', color: '#065F46', fontWeight: 600 },
    card: { backgroundColor: '#fff', borderRadius: 14, border: '1px solid #F0EAEA', margin: '12px 12px 0', overflow: 'hidden' },
    cardTop: { padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardBody: { padding: '0 16px 14px', borderTop: '1px solid #F8F8F8' },
    field: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
    fieldVal: { fontWeight: 600, color: '#1a1a1a' },
    actions: { display: 'flex', gap: 10, marginTop: 14 },
    approveBtn: { flex: 1, backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
    rejectBtn: { flex: 1, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
    empty: { textAlign: 'center' as any, padding: '60px 20px', color: '#9CA3AF', fontSize: 15 },
    badge: (status: string) => {
      const map: any = { pending: ['#F59E0B', '#FFFBEB'], approved: ['#16A34A', '#F0FDF4'], rejected: ['#DC2626', '#FEF2F2'] };
      const [color, bg] = map[status] ?? ['#6B7280', '#F3F4F6'];
      return { backgroundColor: bg, color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 };
    },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Partner Applications</h1>
      </div>

      <div style={s.tabs}>
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pending' && apps.filter(a => a.status === 'pending').length > 0 ? ` (${apps.filter(a => a.status === 'pending').length})` : ''}
          </button>
        ))}
      </div>

      {!!msg && <div style={s.msg}>{msg}</div>}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>No {tab} applications</div>
      ) : (
        filtered.map(app => (
          <div key={app.id} style={s.card}>
            <div style={s.cardTop} onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{app.businessName || 'Unnamed business'}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {new Date(app.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={s.badge(app.status)}>{app.status}</span>
                <span style={{ color: '#9CA3AF' }}>{expandedId === app.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedId === app.id && (
              <div style={s.cardBody}>
                <p style={s.field}>Contact: <span style={s.fieldVal}>{app.contactName || '—'}</span></p>
                <p style={s.field}>Email: <span style={s.fieldVal}>{app.email || '—'}</span></p>
                <p style={s.field}>Phone: <span style={s.fieldVal}>{app.phone || '—'}</span></p>
                {app.message && (
                  <p style={{ ...s.field, marginTop: 10 }}>Message:<br /><span style={{ ...s.fieldVal, display: 'block', marginTop: 4, lineHeight: 1.5 }}>{app.message}</span></p>
                )}
                {app.status === 'pending' && (
                  <div style={s.actions}>
                    <button style={s.approveBtn} onClick={() => updateStatus(app.id, 'approved')}>✓ Approve</button>
                    <button style={s.rejectBtn} onClick={() => updateStatus(app.id, 'rejected')}>✗ Reject</button>
                  </div>
                )}
                {app.status !== 'pending' && (
                  <div style={{ marginTop: 14, textAlign: 'center' as any }}>
                    <button
                      style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#6B7280', fontSize: 13 }}
                      onClick={() => updateStatus(app.id, app.status === 'approved' ? 'rejected' : 'approved')}
                    >
                      Change to {app.status === 'approved' ? 'rejected' : 'approved'}
                    </button>
                  </div>
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
