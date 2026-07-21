import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { adminFetch } from '../../src/lib/admin-auth';

async function adminFetchBookings() {
  const res = await adminFetch('/admin-bookings', { method: 'GET' });
  return res.json();
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  active: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');

  useFocusEffect(useCallback(() => {
    if (!isSupabaseConfigured) return;
    async function load() {
      const { data } = await adminFetchBookings();
      setBookings(data ?? []);
    }
    load();
  }, []));

  const filtered = tab === 'all' ? bookings
    : tab === 'active' ? bookings.filter(b => ['pending', 'confirmed', 'active'].includes(b.status))
    : bookings.filter(b => b.status === 'completed');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '16px 20px 8px' }}>
        <button
          onClick={() => router.replace('/(admin)/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, display: 'block' }}
        >
          <span style={{ fontSize: 15, color: '#2D6A4F', fontWeight: 600 }}>← Back</span>
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>All Bookings</h1>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #F0EAEA', backgroundColor: '#fff' }}>
        {(['all', 'active', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2.5px solid #2D6A4F' : '2.5px solid transparent',
              cursor: 'pointer',
              padding: '14px 0',
              fontSize: 14,
              fontWeight: tab === t ? 800 : 600,
              color: tab === t ? '#2D6A4F' : '#6B7280',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>No bookings yet.</p>
          </div>
        ) : filtered.map(item => {
          const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';
          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
                    {item.host_display_name ?? 'Unknown host'}
                  </p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>
                    👤 {item.traveller_name ?? 'Traveller'}
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: statusColor + '20',
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    padding: '4px 8px',
                    borderRadius: 8,
                  }}
                >
                  {(item.status ?? '').toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                  📅 {item.drop_off_date ?? item.date ?? '—'}
                </span>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                  🧳 {item.bag_count ?? item.bags ?? '—'} bags
                </span>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                  💰 R{item.total_price ?? item.totalPrice ?? '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
