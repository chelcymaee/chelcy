import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface Host {
  id: string;
  displayName: string;
  locationName: string;
  businessType: string;
  pricePerBag: number;
  active: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  café: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📍',
};

export default function ManageHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [msg, setMsg] = useState('');

  useFocusEffect(useCallback(() => { loadHosts(); }, []));

  async function loadHosts() {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('hosts').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          setHosts(data.map((r: any) => ({
            id: r.id, displayName: r.display_name, locationName: r.location_name,
            businessType: r.business_type, pricePerBag: r.price_per_bag,
            active: r.active ?? r.is_active ?? false,
          })));
        }
      } else {
        const raw = await AsyncStorage.getItem('cubby_hosts');
        setHosts(raw ? JSON.parse(raw) : []);
      }
    } catch {}
  }

  async function toggleActive(host: Host) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('hosts').update({ active: !host.active }).eq('id', host.id);
      if (!error) setHosts(prev => prev.map(h => h.id === host.id ? { ...h, active: !h.active } : h));
    } else {
      const updated = hosts.map(h => h.id === host.id ? { ...h, active: !h.active } : h);
      await AsyncStorage.setItem('cubby_hosts', JSON.stringify(updated));
      setHosts(updated);
    }
  }

  async function deleteHost(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('hosts').delete().eq('id', id);
      if (error) { setMsg('Error: ' + error.message); return; }
    } else {
      const updated = hosts.filter(h => h.id !== id);
      await AsyncStorage.setItem('cubby_hosts', JSON.stringify(updated));
    }
    setMsg('Host deleted.');
    setHosts(prev => prev.filter(h => h.id !== id));
    setTimeout(() => setMsg(''), 2000);
  }

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 20 },
    header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#2D6A4F', fontWeight: 600, padding: 0 },
    title: { fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    msg: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#065F46', fontWeight: 600 },
    card: { backgroundColor: 'white', borderRadius: 16, border: '1px solid #F0EAEA', marginBottom: 12, overflow: 'hidden' },
    cardTop: { display: 'flex', alignItems: 'center', gap: 12, padding: 16 },
    cardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #F0EAEA' },
    badge: (active: boolean) => ({ backgroundColor: active ? '#DCFCE7' : '#F3F4F6', color: active ? '#16A34A' : '#6B7280', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }),
    price: { fontSize: 14, fontWeight: 700, color: '#2D6A4F', margin: 0 },
    actions: { display: 'flex', alignItems: 'center', gap: 16 },
    toggleBtn: (active: boolean) => ({ backgroundColor: active ? '#2D6A4F' : '#D1D5DB', border: 'none', borderRadius: 20, padding: '6px 16px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }),
    deleteBtn: { backgroundColor: '#FEF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#DC2626', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
    fab: { position: 'fixed' as any, bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2D6A4F', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    empty: { textAlign: 'center' as any, paddingTop: 80 },
    createBtn: { backgroundColor: '#2D6A4F', color: 'white', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}>← Back</button>
        <h1 style={s.title}>Manage Hosts</h1>
      </div>

      {!!msg && <div style={s.msg}>{msg}</div>}

      {hosts.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48 }}>🏠</div>
          <p style={{ fontSize: 18, fontWeight: 700 }}>No hosts yet.</p>
          <button style={s.createBtn} onClick={() => router.push('/(admin)/create-host')}>Create Host Profile</button>
        </div>
      ) : (
        hosts.map(host => (
          <div key={host.id} style={s.card}>
            <div style={s.cardTop}>
              <span style={{ fontSize: 28 }}>{TYPE_EMOJI[host.businessType] || '📍'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{host.displayName}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{host.locationName}</div>
              </div>
              <span style={s.badge(host.active)}>{host.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div style={s.cardBottom}>
              <p style={s.price}>R{host.pricePerBag}/bag/day</p>
              <div style={s.actions}>
                <button style={s.toggleBtn(host.active)} onClick={() => toggleActive(host)}>
                  {host.active ? 'Deactivate' : 'Activate'}
                </button>
                <button style={s.deleteBtn} onClick={() => deleteHost(host.id, host.displayName)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <div style={{ height: 100 }} />
      <button style={s.fab} onClick={() => router.push('/(admin)/create-host')}>+</button>
    </div>
  );
}
