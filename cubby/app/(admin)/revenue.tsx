import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { adminFetch } from '../../src/lib/admin-auth';

async function adminFetchBookings() {
  const res = await adminFetch('/admin-bookings', { method: 'GET' });
  return res.json();
}

// Host/Cubby split source of truth (matches hostEarnings in
// admin-hosts/index.ts and hostShare() in app/(host)/dashboard.tsx,
// established by the PR #101 financial integrity fix): host = 70% of
// base storage price only, never the traveller service fee — Cubby keeps
// the rest of total_price. Prefer the locked host_payout_amount snapshot
// taken at booking completion; fall back to 70% of base_storage_amount for
// completed bookings that predate the snapshot column. Only for genuinely
// old/legacy rows missing both do we fall back to 70% of total_price —
// that fallback is financially wrong (it includes the traveller fee in
// the split) and should never be hit for any booking created after PR
// #101 shipped.
function hostShareOf(b: { total_price?: number | null; base_storage_amount?: number | null; host_payout_amount?: number | null }): number {
  if (b.host_payout_amount != null) return Number(b.host_payout_amount);
  // Integer-multiply-then-divide, same convention as complete-booking's
  // cents-based rounding — `x * 0.70` alone hits JS float imprecision
  // (e.g. 165 * 0.70 === 115.49999999999999).
  if (b.base_storage_amount != null) return Math.round(Number(b.base_storage_amount) * 70) / 100;
  return Math.round(Number(b.total_price ?? 0) * 70) / 100;
}

export default function Revenue() {
  const [bookings, setBookings] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    if (!isSupabaseConfigured) return;
    async function load() {
      const { data } = await adminFetchBookings();
      setBookings((data ?? []).filter((b: any) => b.status === 'completed'));
    }
    load();
  }, []));

  const total = bookings.reduce((sum, b) => sum + (b.total_price ?? b.totalPrice ?? 0), 0);
  const hostShare = bookings.reduce((sum, b) => sum + hostShareOf(b), 0);
  const cubbyShare = total - hostShare;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: 'system-ui, sans-serif', overflowY: 'auto' }}>
      <div style={{ padding: '16px 20px 8px' }}>
        <button
          onClick={() => router.replace('/(admin)/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, display: 'block' }}
        >
          <span style={{ fontSize: 15, color: '#2D6A4F', fontWeight: 600 }}>← Back</span>
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>Revenue</h1>
      </div>

      <div
        style={{
          margin: 16,
          backgroundColor: '#2D6A4F',
          borderRadius: 20,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Total Revenue
        </p>
        <p style={{ fontSize: 42, fontWeight: 900, color: '#fff', margin: '0 0 20px' }}>
          R{total.toFixed(2)}
        </p>
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: '0 0 4px' }}>Cubby (30%)</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>R{cubbyShare.toFixed(2)}</p>
          </div>
          <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)', margin: '4px 0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: '0 0 4px' }}>Hosts (70%)</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>R{hostShare.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 20px 12px' }}>Completed Bookings</h3>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#6B7280', margin: 0 }}>No completed bookings yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 40px' }}>
          {bookings.map(b => {
            const price = b.total_price ?? b.totalPrice ?? 0;
            const rowHostShare = hostShareOf(b);
            const rowCubbyShare = price - rowHostShare;
            return (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 16,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                    {b.host_display_name ?? 'Host'}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                    {b.drop_off_date ?? b.date ?? '—'} · {b.bag_count ?? b.bags ?? '—'} bags
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#2D6A4F', margin: 0 }}>R{price}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
                    ↳ R{rowCubbyShare.toFixed(0)} / R{rowHostShare.toFixed(0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
