import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { adminFetch as adminAuthFetch } from '../../src/lib/admin-auth';

async function adminFetch(method: string, body?: object) {
  const res = await adminAuthFetch('/admin-support-messages', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  email: string;
  userId: string | null;
  status: 'open' | 'resolved' | 'pending';
  createdAt: string;
}

export default function SupportMessages() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useFocusEffect(useCallback(() => { loadMessages(); }, []));

  async function loadMessages() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data, error } = await adminFetch('GET');
      if (!error && data) {
        setMessages(data.map((r: any) => ({
          id: r.id,
          subject: r.subject ?? 'No subject',
          message: r.message ?? '',
          email: r.user_email ?? r.email ?? '',
          userId: r.user_id ?? null,
          status: r.status === 'resolved' ? 'resolved' : 'open',
          createdAt: r.created_at,
        })));
      }
    } finally {
      setLoading(false);
    }
  }

  async function resolveMessage(id: string) {
    const { error } = await adminFetch('POST', { id, status: 'resolved' });
    if (error) { setMsg('Error: ' + error); return; }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m));
    setExpandedId(null);
    setMsg('Marked as resolved ✓');
    setTimeout(() => setMsg(''), 3000);
  }

  async function reopenMessage(id: string) {
    const { error } = await adminFetch('POST', { id, status: 'pending' });
    if (error) { setMsg('Error: ' + error); return; }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'open' } : m));
    setMsg('Reopened ✓');
    setTimeout(() => setMsg(''), 3000);
  }

  const filtered = messages.filter(m => m.status === tab);
  const openCount = messages.filter(m => m.status === 'open').length;

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto' },
    header: { padding: '16px 20px 12px', borderBottom: '1px solid #F0EAEA' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#2D6A4F', fontWeight: 600, padding: '0 0 8px', display: 'block' },
    title: { fontSize: 24, fontWeight: 900, color: '#1a1a1a', margin: 0 },
    tabs: { display: 'flex', gap: 8, padding: '12px 12px 0' },
    tab: (active: boolean) => ({ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, backgroundColor: active ? '#2D6A4F' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }),
    msg: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 16px', margin: '12px', color: '#065F46', fontWeight: 600 },
    card: { backgroundColor: '#fff', borderRadius: 14, border: '1px solid #F0EAEA', margin: '12px 12px 0', overflow: 'hidden' },
    cardTop: { padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    cardBody: { padding: '0 16px 16px', borderTop: '1px solid #F8F8F8' },
    subject: { fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 },
    meta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    messageText: { fontSize: 14, color: '#374151', lineHeight: 1.6, marginTop: 12, whiteSpace: 'pre-wrap' as any },
    resolveBtn: { backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 14, width: '100%', marginTop: 14 },
    reopenBtn: { backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 14, width: '100%', marginTop: 14 },
    empty: { textAlign: 'center' as any, padding: '60px 20px', color: '#9CA3AF', fontSize: 15 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', display: 'inline-block', marginRight: 6 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Support Messages</h1>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'open')} onClick={() => setTab('open')}>
          Open{openCount > 0 ? ` (${openCount})` : ''}
        </button>
        <button style={s.tab(tab === 'resolved')} onClick={() => setTab('resolved')}>
          Resolved
        </button>
      </div>

      {!!msg && <div style={s.msg}>{msg}</div>}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          {tab === 'open' ? '✅ No open support messages' : 'No resolved messages yet'}
        </div>
      ) : (
        filtered.map(item => (
          <div key={item.id} style={s.card}>
            <div style={s.cardTop} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div style={{ flex: 1 }}>
                <p style={s.subject}>
                  {item.status === 'open' && <span style={s.dot} />}
                  {item.subject}
                </p>
                <p style={s.meta}>
                  {item.email} · {new Date(item.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: 18 }}>{expandedId === item.id ? '▲' : '▼'}</span>
            </div>

            {expandedId === item.id && (
              <div style={s.cardBody}>
                <p style={s.messageText}>{item.message}</p>
                {item.status === 'open' ? (
                  <button style={s.resolveBtn} onClick={() => resolveMessage(item.id)}>✓ Mark as Resolved</button>
                ) : (
                  <button style={s.reopenBtn} onClick={() => reopenMessage(item.id)}>↩ Reopen</button>
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
