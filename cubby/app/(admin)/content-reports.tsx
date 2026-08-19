import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { adminFetch as adminAuthFetch } from '../../src/lib/admin-auth';

async function adminFetch(method: string, params?: Record<string, string>, body?: object) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await adminAuthFetch(`/admin-content-reports${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  host_review: '⭐ Host review',
  traveller_review: '⭐ Traveller review',
  message: '💬 Message',
};

function ageLabel(createdAt: string): { text: string; overdue: boolean } {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const overdue = hours >= 20; // visual flag before the 24h commitment is breached
  if (hours < 1) return { text: 'just now', overdue };
  if (hours < 24) return { text: `${Math.floor(hours)}h ago`, overdue };
  return { text: `${Math.floor(hours / 24)}d ago`, overdue };
}

export default function AdminContentReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'actioned' | 'dismissed' | 'all'>('pending');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) { setReports([]); return; }
      const { data } = await adminFetch('GET', filter === 'all' ? undefined : { status: filter });
      setReports(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusyId(id);
    try {
      const result = await adminFetch('PATCH', undefined, { id, action });
      if (result.error) { setMsg('Error: ' + result.error); return; }
      setMsg({
        remove_content: 'Content removed ✓',
        suspend_user: 'User suspended ✓',
        unsuspend_user: 'User unsuspended ✓',
        dismiss: 'Report dismissed ✓',
      }[action] ?? 'Done ✓');
      setTimeout(() => setMsg(''), 3000);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 80 },
    header: { padding: '16px 20px 8px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#2D6A4F', fontWeight: 600, padding: 0, marginBottom: 8, display: 'block' },
    title: { fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    tabs: { display: 'flex', gap: 8, padding: '12px 20px', flexWrap: 'wrap' },
    tab: (active: boolean) => ({
      padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
      backgroundColor: active ? '#1a1a1a' : '#F3F4F6', color: active ? '#fff' : '#6B7280',
    }),
    msg: { margin: '0 20px 12px', backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 14px', color: '#065F46', fontWeight: 600 },
    list: { padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 },
    card: { backgroundColor: 'white', borderRadius: 14, border: '1px solid #F0EAEA', padding: 16 },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    typeLabel: { fontSize: 13, fontWeight: 700, color: '#2D6A4F' },
    reason: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginTop: 2 },
    date: (overdue: boolean) => ({ fontSize: 12, fontWeight: overdue ? 700 : 400, color: overdue ? '#DC2626' : '#9CA3AF' }),
    statusBadge: (status: string) => ({
      backgroundColor: status === 'pending' ? '#FEF3C7' : status === 'actioned' ? '#D1FAE5' : '#F3F4F6',
      color: status === 'pending' ? '#D97706' : status === 'actioned' ? '#059669' : '#6B7280',
      borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700, display: 'inline-block', marginTop: 4,
    }),
    peopleRow: { fontSize: 13, color: '#6B7280', margin: '8px 0 4px' },
    preview: { fontSize: 14, color: '#1a1a1a', margin: '8px 0', lineHeight: 1.5, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 },
    actionTaken: { fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 8 },
    actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    removeBtn: { backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
    suspendBtn: { backgroundColor: '#7C2D12', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
    unsuspendBtn: { backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
    dismissBtn: { backgroundColor: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
    empty: { textAlign: 'center', color: '#9CA3AF', padding: '60px 20px', fontSize: 15 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back to Dashboard</button>
        <h1 style={s.title}>Content Reports</h1>
      </div>

      <div style={s.tabs}>
        {(['pending', 'actioned', 'dismissed', 'all'] as const).map(f => (
          <button key={f} style={s.tab(filter === f)} onClick={() => setFilter(f)}>
            {f === 'pending' ? '🚨 Pending' : f === 'actioned' ? '✓ Actioned' : f === 'dismissed' ? '✗ Dismissed' : '📋 All'}
          </button>
        ))}
      </div>

      {!!msg && <div style={s.msg}>{msg}</div>}

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={s.empty}>{filter === 'pending' ? '✅ No pending reports' : 'No reports here'}</div>
      ) : (
        <div style={s.list}>
          {reports.map((r: any) => {
            const age = ageLabel(r.created_at);
            const alreadySuspended = (r.action_taken ?? '').includes('user_suspended') && !(r.action_taken ?? '').includes('user_unsuspended');
            const alreadyRemoved = (r.action_taken ?? '').includes('content_removed');
            return (
              <div key={r.id} style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.typeLabel}>{CONTENT_TYPE_LABEL[r.content_type] ?? r.content_type}</div>
                    <div style={s.reason}>{r.reason}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={s.date(age.overdue && r.status === 'pending')}>{age.overdue && r.status === 'pending' ? '⚠️ ' : ''}{age.text}</div>
                    <div style={s.statusBadge(r.status)}>{r.status}</div>
                  </div>
                </div>

                <div style={s.peopleRow}>
                  Reported by <strong>{r.reporterName}</strong> ({r.reporterEmail}) — about <strong>{r.reportedUserName}</strong> ({r.reportedUserEmail})
                </div>

                <div style={s.preview}>
                  {r.contentPreview ? `"${r.contentPreview}"` : '(no text content)'}
                  {!!r.contentExtra && <span style={{ color: '#9CA3AF' }}> — {r.contentExtra}</span>}
                </div>

                {!!r.action_taken && <div style={s.actionTaken}>Action taken: {r.action_taken}</div>}

                <div style={s.actions}>
                  {!alreadyRemoved && (
                    <button style={s.removeBtn} disabled={busyId === r.id}
                      onClick={() => act(r.id, 'remove_content', 'Permanently remove this content?')}>
                      🗑 Remove content
                    </button>
                  )}
                  {alreadySuspended ? (
                    <button style={s.unsuspendBtn} disabled={busyId === r.id}
                      onClick={() => act(r.id, 'unsuspend_user', 'Restore this user\'s access?')}>
                      ↩ Unsuspend user
                    </button>
                  ) : (
                    <button style={s.suspendBtn} disabled={busyId === r.id}
                      onClick={() => act(r.id, 'suspend_user', 'Suspend this user\'s account? They will be unable to sign in.')}>
                      🚫 Suspend user
                    </button>
                  )}
                  {r.status === 'pending' && (
                    <button style={s.dismissBtn} disabled={busyId === r.id} onClick={() => act(r.id, 'dismiss')}>
                      ✓ Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
