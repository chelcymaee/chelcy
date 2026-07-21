import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { adminFetch as adminAuthFetch } from '../../src/lib/admin-auth';

async function adminFetch(method: string, params?: Record<string, string>, body?: object) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await adminAuthFetch(`/admin-reviews${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reported'>('reported');
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) { setReviews([]); return; }
      const { data } = await adminFetch('GET', filter === 'reported' ? { reported: 'true' } : undefined);
      setReviews(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function removeReview(id: string) {
    if (!confirm('Permanently delete this review?')) return;
    const result = await adminFetch('DELETE', { id });
    if (result.error) { setMsg('Error: ' + result.error); return; }
    setReviews(prev => prev.filter(r => r.id !== id));
    setMsg('Review removed ✓');
    setTimeout(() => setMsg(''), 3000);
  }

  async function clearReport(id: string) {
    await adminFetch('PATCH', undefined, { id });
    setReviews(prev => prev.filter(r => r.id !== id));
    setMsg('Report cleared ✓');
    setTimeout(() => setMsg(''), 3000);
  }

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 80 },
    header: { padding: '16px 20px 8px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#2D6A4F', fontWeight: 600, padding: 0, marginBottom: 8, display: 'block' },
    title: { fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    tabs: { display: 'flex', gap: 8, padding: '12px 20px' },
    tab: (active: boolean) => ({
      padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
      backgroundColor: active ? '#1a1a1a' : '#F3F4F6', color: active ? '#fff' : '#6B7280',
    }),
    msg: { margin: '0 20px 12px', backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 14px', color: '#065F46', fontWeight: 600 },
    list: { padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 },
    card: { backgroundColor: 'white', borderRadius: 14, border: '1px solid #F0EAEA', padding: 16 },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    hostName: { fontSize: 13, fontWeight: 700, color: '#2D6A4F' },
    reviewer: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
    rating: { fontSize: 13, color: '#F59E0B', fontWeight: 700 },
    date: { fontSize: 12, color: '#9CA3AF' },
    comment: { fontSize: 14, color: '#1a1a1a', margin: '8px 0', lineHeight: 1.5 },
    tags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#FF5C5C' },
    reportedBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#D97706' },
    actions: { display: 'flex', gap: 8 },
    removeBtn: { backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
    clearBtn: { backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
    empty: { textAlign: 'center', color: '#9CA3AF', padding: '60px 20px', fontSize: 15 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Review Moderation</h1>
      </div>

      <div style={s.tabs}>
        {(['reported', 'all'] as const).map(f => (
          <button key={f} style={s.tab(filter === f)} onClick={() => setFilter(f)}>
            {f === 'reported' ? '🚨 Reported' : '📋 All reviews'}
          </button>
        ))}
      </div>

      {!!msg && <div style={s.msg}>{msg}</div>}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div style={s.empty}>
          {filter === 'reported' ? '✅ No reported reviews' : 'No reviews yet'}
        </div>
      ) : (
        <div style={s.list}>
          {reviews.map(r => (
            <div key={r.id} style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <div style={s.hostName}>📍 {(r.hosts as any)?.display_name ?? r.host_id}</div>
                  <div style={s.reviewer}>{r.reviewer_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.rating}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.rating}/5</div>
                  <div style={s.date}>{r.created_at?.slice(0, 10)}</div>
                  {r.reported && <div style={s.reportedBadge}>⚠️ Reported</div>}
                </div>
              </div>

              {r.comment && <div style={s.comment}>"{r.comment}"</div>}

              {r.tags?.length > 0 && (
                <div style={s.tags}>
                  {r.tags.map((tag: string) => (
                    <span key={tag} style={s.tag}>{tag}</span>
                  ))}
                </div>
              )}

              <div style={s.actions}>
                <button style={s.removeBtn} onClick={() => removeReview(r.id)}>🗑 Remove review</button>
                {r.reported && (
                  <button style={s.clearBtn} onClick={() => clearReport(r.id)}>✓ Clear report</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
