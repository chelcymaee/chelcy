import { useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

type BusinessType = 'café' | 'hotel' | 'hostel' | 'guesthouse' | 'airbnb' | 'tour_operator' | 'home' | 'other';

const BUSINESS_TYPES: { value: BusinessType; label: string; emoji: string }[] = [
  { value: 'café', label: 'Café', emoji: '☕' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'hostel', label: 'Hostel', emoji: '🛏️' },
  { value: 'guesthouse', label: 'Guesthouse', emoji: '🏡' },
  { value: 'airbnb', label: 'Airbnb', emoji: '🔑' },
  { value: 'tour_operator', label: 'Tour Operator', emoji: '🗺️' },
  { value: 'home', label: 'Home', emoji: '🏠' },
  { value: 'other', label: 'Other', emoji: '📍' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CreateHost() {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [locationName, setLocationName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('café');
  const [pricePerBag, setPricePerBag] = useState('');
  const [maxBags, setMaxBags] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function toggleDay(day: string) {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!displayName.trim()) { setErrorMsg('Display name is required.'); return; }
    if (!locationName.trim()) { setErrorMsg('Location name is required.'); return; }
    const price = parseFloat(pricePerBag);
    if (isNaN(price) || price < 100 || price > 300) { setErrorMsg('Price must be between R100 and R300.'); return; }
    const bags = parseInt(maxBags);
    if (isNaN(bags) || bags < 1 || bags > 50) { setErrorMsg('Max bags must be between 1 and 50.'); return; }

    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        const payload = {
          display_name: displayName.trim(),
          bio: bio.trim(),
          location_name: locationName.trim(),
          business_type: businessType,
          price_per_bag: parseInt(pricePerBag),
          max_bags: parseInt(maxBags),
          available_from: availableFrom.trim() || '08:00',
          available_until: availableUntil.trim() || '20:00',
          available_days: availableDays,
          partner_email: partnerEmail.trim(),
          active: false,
        };
        const { data, error } = await supabase.from('hosts').insert(payload).select();
        if (error) {
          setErrorMsg('Error: ' + error.message);
          return;
        }
        setSuccessMsg('Host profile created! Redirecting...');
        setTimeout(() => router.replace('/(admin)/dashboard'), 1500);
      } else {
        const raw = await AsyncStorage.getItem('cubby_hosts');
        const hosts = raw ? JSON.parse(raw) : [];
        const newHost = {
          id: Date.now().toString(),
          displayName: displayName.trim(),
          bio: bio.trim(),
          locationName: locationName.trim(),
          businessType,
          pricePerBag: price,
          maxBags: bags,
          availableFrom: availableFrom.trim(),
          availableUntil: availableUntil.trim(),
          availableDays,
          partnerEmail: partnerEmail.trim(),
          active,
          createdAt: new Date().toISOString(),
        };
        hosts.push(newHost);
        await AsyncStorage.setItem('cubby_hosts', JSON.stringify(hosts));
        setSuccessMsg('Host profile created!');
        setTimeout(() => router.replace('/(admin)/dashboard'), 1500);
      }
    } catch (e: any) {
      setErrorMsg('Failed to save: ' + (e?.message ?? 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  const s: any = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#FAF9F6',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      overflowY: 'auto',
    },
    header: { padding: '16px 20px 8px' },
    backLink: { background: 'none', border: 'none', fontSize: 16, color: '#2D6A4F', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' },
    title: { fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: '4px 0 0' },
    form: { padding: '16px 20px 40px' },
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 8, display: 'block' },
    input: {
      backgroundColor: '#fff', borderRadius: 12, border: '1px solid #F0EAEA',
      padding: '14px 16px', fontSize: 15, color: '#1a1a1a', width: '100%',
      boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    },
    textarea: {
      backgroundColor: '#fff', borderRadius: 12, border: '1px solid #F0EAEA',
      padding: '14px 16px', fontSize: 15, color: '#1a1a1a', width: '100%',
      boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
      height: 100, resize: 'vertical',
    },
    typeGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    typeChip: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
      backgroundColor: active ? '#2D6A4F' : '#fff',
      border: active ? '1px solid #2D6A4F' : '1px solid #F0EAEA',
      color: active ? '#fff' : '#6B7280',
      fontWeight: 600, fontSize: 13,
    }),
    daysRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    dayChip: (selected: boolean) => ({
      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
      backgroundColor: selected ? '#2D6A4F' : '#fff',
      border: selected ? '1px solid #2D6A4F' : '1px solid #F0EAEA',
      color: selected ? '#fff' : '#6B7280',
      fontWeight: 600, fontSize: 13,
    }),
    activeRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#fff', borderRadius: 12, border: '1px solid #F0EAEA',
      padding: '14px 16px', marginBottom: 28,
    },
    activeLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
    activeBtn: (on: boolean) => ({
      backgroundColor: on ? '#2D6A4F' : '#D1D5DB',
      border: 'none', borderRadius: 20, padding: '6px 18px',
      color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13,
    }),
    errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#DC2626', fontWeight: 600 },
    successBox: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#065F46', fontWeight: 600 },
    saveBtn: (disabled: boolean) => ({
      backgroundColor: disabled ? '#ccc' : '#2D6A4F',
      color: 'white', border: 'none', borderRadius: 14,
      padding: '18px', fontSize: 16, fontWeight: 800,
      width: '100%', cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 8,
    }),
    successScreen: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', backgroundColor: '#fff',
    },
  };

  if (successMsg && !errorMsg) {
    return (
      <div style={s.successScreen}>
        <span style={{ fontSize: 64, marginBottom: 16 }}>✅</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px' }}>Host Saved!</h2>
        <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backLink} onClick={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}>
          ← Back
        </button>
        <h1 style={s.title}>Create Host Profile</h1>
      </div>

      <div style={s.form}>
        <div style={s.fieldGroup}>
          <label style={s.label}>Display Name *</label>
          <input style={s.input} value={displayName} onChange={e => setDisplayName((e.target as any).value)} placeholder="e.g. The Coffee Corner" />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Bio</label>
          <textarea style={s.textarea} value={bio} onChange={e => setBio((e.target as any).value)} placeholder="A short description of the hosting spot..." />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Location Name *</label>
          <input style={s.input} value={locationName} onChange={e => setLocationName((e.target as any).value)} placeholder="e.g. Cape Town City Bowl" />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Business Type</label>
          <div style={s.typeGrid}>
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.value} style={s.typeChip(businessType === bt.value)} onClick={() => setBusinessType(bt.value)}>
                <span>{bt.emoji}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Price per Bag per Day (R100–R300) *</label>
          <input style={s.input} type="number" value={pricePerBag} onChange={e => setPricePerBag((e.target as any).value)} placeholder="e.g. 150" />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Max Bags (1–50) *</label>
          <input style={s.input} type="number" value={maxBags} onChange={e => setMaxBags((e.target as any).value)} placeholder="e.g. 10" />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Available From</label>
          <input style={s.input} value={availableFrom} onChange={e => setAvailableFrom((e.target as any).value)} placeholder="e.g. 08:00" />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Available Until</label>
          <input style={s.input} value={availableUntil} onChange={e => setAvailableUntil((e.target as any).value)} placeholder="e.g. 18:00" />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Available Days</label>
          <div style={s.daysRow}>
            {DAYS.map(day => (
              <button key={day} style={s.dayChip(availableDays.includes(day))} onClick={() => toggleDay(day)}>
                {day}
              </button>
            ))}
          </div>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Partner Email</label>
          <input style={s.input} type="email" value={partnerEmail} onChange={e => setPartnerEmail((e.target as any).value)} placeholder="partner@example.com" />
        </div>

        <div style={s.activeRow}>
          <span style={s.activeLabel}>Active</span>
          <button style={s.activeBtn(active)} onClick={() => setActive(v => !v)}>
            {active ? 'Active' : 'Inactive'}
          </button>
        </div>

        {!!errorMsg && <div style={s.errorBox}>{errorMsg}</div>}
        {!!successMsg && <div style={s.successBox}>{successMsg}</div>}

        <button onClick={handleSave} disabled={saving} style={s.saveBtn(saving)}>
          {saving ? 'Saving...' : 'Create Host Profile'}
        </button>
      </div>
    </div>
  );
}
