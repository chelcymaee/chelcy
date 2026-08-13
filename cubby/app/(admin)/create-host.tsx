import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import LocationPicker, { LocationResult } from '../../src/components/LocationPicker.web';
import { adminFetch as adminHostsFetch } from '../../src/lib/admin-auth';

async function createHost(body: object) {
  const res = await adminHostsFetch('/admin-hosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

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
  // Multi-listing: arriving here from manage-hosts.tsx's "Add Another
  // Listing for This Owner" button carries these two params. Their presence
  // switches this screen into "additional listing" mode — same form, same
  // fields, just a different owner-assignment path and a forced-draft
  // status (see handleSave below), reusing this screen rather than building
  // a second one.
  const { ownerUserId, ownerName } = useLocalSearchParams<{ ownerUserId?: string; ownerName?: string }>();
  const isAdditionalListing = !!ownerUserId;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [businessType, setBusinessType] = useState<BusinessType>('café');
  const [pricePerBag, setPricePerBag] = useState('');
  const [maxBags, setMaxBags] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function log(msg: string) {
    console.log('[create-host]', msg);
  }
  const [successMsg, setSuccessMsg] = useState('');

  function toggleDay(day: string) {
    setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function handleSave() {
    setErrorMsg(''); setSuccessMsg('');
    log('Button pressed');
    log('Supabase mode: ' + (isSupabaseConfigured ? 'ON' : 'OFF'));

    if (!displayName.trim()) { setErrorMsg('Display name is required.'); log('FAIL: no display name'); return; }
    if (!locationName.trim()) { setErrorMsg('Location name is required.'); log('FAIL: no location name'); return; }
    if (!latitude || !longitude) { setErrorMsg('Please select a location from the autocomplete suggestions — do not type manually.'); log('FAIL: no coordinates'); return; }
    const price = parseFloat(pricePerBag);
    if (isNaN(price) || price < 1 || price > 1000) { setErrorMsg('Price must be between R1 and R1000. Got: ' + pricePerBag); log('FAIL: invalid price: ' + pricePerBag); return; }
    const bags = parseInt(maxBags);
    if (isNaN(bags) || bags < 1 || bags > 200) { setErrorMsg('Max bags must be between 1 and 200. Got: ' + maxBags); log('FAIL: invalid bags: ' + maxBags); return; }

    log('Validation passed');
    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        const basePayload = {
          display_name: displayName.trim(), bio: bio.trim(), location_name: locationName.trim(),
          latitude: latitude || null, longitude: longitude || null,
          business_type: businessType, price_per_bag_per_day: parseInt(pricePerBag), max_bags: parseInt(maxBags),
          available_from: availableFrom.trim() || '08:00', available_until: availableUntil.trim() || '20:00',
          available_days: availableDays,
        };
        // Multi-listing: additional listings always go through
        // create_additional_listing — never 'create' — and are always
        // forced to a draft (is_active excluded here; the Edge Function
        // hardcodes it false regardless, but not sending it at all keeps
        // this call site honest about what it's actually requesting).
        const result = isAdditionalListing
          ? await createHost({ action: 'create_additional_listing', ownerUserId, payload: basePayload })
          : await createHost({ action: 'create', payload: { ...basePayload, is_active: active }, partnerEmail: partnerEmail.trim() || undefined });
        log(isAdditionalListing ? 'Calling admin-hosts create_additional_listing action...' : 'Calling admin-hosts create action...');
        if (result.error) {
          log('CREATE ERROR: ' + result.error);
          setErrorMsg(result.error);
          return;
        }
        log('Create success! Row ID: ' + (result.data?.id ?? 'unknown'));
        setSuccessMsg(isAdditionalListing ? 'New listing created!' : 'Host profile created!');
        setTimeout(() => router.replace('/(admin)/manage-hosts'), 1500);
      } else {
        const raw = await AsyncStorage.getItem('cubby_hosts');
        const hosts = raw ? JSON.parse(raw) : [];
        hosts.push({
          id: Date.now().toString(), displayName: displayName.trim(), bio: bio.trim(),
          locationName: locationName.trim(), businessType, pricePerBag: price, maxBags: bags,
          availableFrom: availableFrom.trim() || '08:00', availableUntil: availableUntil.trim() || '20:00',
          availableDays, partnerEmail: partnerEmail.trim(), active, createdAt: new Date().toISOString(),
        });
        await AsyncStorage.setItem('cubby_hosts', JSON.stringify(hosts));
        setSuccessMsg('Host profile created!');
        setTimeout(() => router.replace('/(admin)/manage-hosts'), 1500);
      }
    } catch (e: any) {
      setErrorMsg('Failed to save: ' + (e?.message ?? 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAF9F6', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 100 },
    header: { padding: '16px 20px 8px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#2D6A4F', fontWeight: 600, padding: 0, marginBottom: 8, display: 'block' },
    title: { fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: 0 },
    form: { padding: '16px 20px 40px' },
    fieldLabel: { fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 8, marginTop: 20, display: 'block' },
    input: { backgroundColor: 'white', borderRadius: 12, border: '1px solid #F0EAEA', padding: '14px 16px', fontSize: 15, color: '#1a1a1a', width: '100%', boxSizing: 'border-box' as any },
    textarea: { backgroundColor: 'white', borderRadius: 12, border: '1px solid #F0EAEA', padding: '14px 16px', fontSize: 15, color: '#1a1a1a', width: '100%', boxSizing: 'border-box' as any, height: 100, resize: 'vertical' as any },
    typeGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    typeChip: (sel: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
      backgroundColor: sel ? '#2D6A4F' : 'white', border: sel ? '1px solid #2D6A4F' : '1px solid #F0EAEA',
      color: sel ? 'white' : '#6B7280', fontWeight: 600, fontSize: 13,
    }),
    daysRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    dayChip: (sel: boolean) => ({
      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
      backgroundColor: sel ? '#2D6A4F' : 'white', border: sel ? '1px solid #2D6A4F' : '1px solid #F0EAEA',
      color: sel ? 'white' : '#6B7280', fontWeight: 600, fontSize: 13,
    }),
    switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, border: '1px solid #F0EAEA', padding: '14px 16px', marginBottom: 28, marginTop: 20 },
    errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#DC2626', fontWeight: 600 },
    successBox: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#065F46', fontWeight: 600 },
    saveBtn: (isSaving: boolean) => ({
      backgroundColor: isSaving ? '#ccc' : '#2D6A4F', color: 'white', border: 'none', borderRadius: 14,
      padding: '18px', fontSize: 16, fontWeight: 800, width: '100%', cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: 8,
    }),
  };

  if (successMsg) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px' }}>{isAdditionalListing ? 'Listing Created!' : 'Host Saved!'}</h2>
          <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>Redirecting to hosts...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace(isAdditionalListing ? '/(admin)/manage-hosts' : '/(admin)/dashboard')}>
          ← Back to {isAdditionalListing ? 'Hosts' : 'Dashboard'}
        </button>
        <h1 style={s.title}>{isAdditionalListing ? 'Add Another Listing' : 'Create Host Profile'}</h1>
      </div>

      <div style={s.form}>
        {isAdditionalListing && (
          <div style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#1E3A8A', fontWeight: 600, fontSize: 14 }}>
            New location for {ownerName || 'this owner'}'s existing account. It's created as a draft — the host completes and activates it themselves from their own dashboard.
          </div>
        )}

        <label style={s.fieldLabel}>Display Name *</label>
        <input style={s.input} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. The Coffee Corner" />

        <label style={s.fieldLabel}>Bio</label>
        <textarea style={s.textarea} value={bio} onChange={(e: any) => setBio(e.target.value)} placeholder="A short description of the hosting spot..." />

        <LocationPicker
          label="Location *"
          value={locationName}
          placeholder="Search address or area…"
          onSelect={(r: LocationResult) => { setLocationName(r.address); setLatitude(r.latitude); setLongitude(r.longitude); }}
          inputStyle={s.input}
        />

        <label style={s.fieldLabel}>Business Type</label>
        <div style={s.typeGrid}>
          {BUSINESS_TYPES.map(bt => (
            <button key={bt.value} style={s.typeChip(businessType === bt.value)} onClick={() => setBusinessType(bt.value)}>
              <span>{bt.emoji}</span> {bt.label}
            </button>
          ))}
        </div>

        <label style={s.fieldLabel}>Price per Bag per Day (R100–R300) *</label>
        <input style={s.input} type="number" value={pricePerBag} onChange={e => setPricePerBag(e.target.value)} placeholder="e.g. 150" min="100" max="300" />

        <label style={s.fieldLabel}>Max Bags (1–50) *</label>
        <input style={s.input} type="number" value={maxBags} onChange={e => setMaxBags(e.target.value)} placeholder="e.g. 10" min="1" max="50" />

        <label style={s.fieldLabel}>Available From</label>
        <input style={s.input} value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} placeholder="e.g. 08:00" />

        <label style={s.fieldLabel}>Available Until</label>
        <input style={s.input} value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} placeholder="e.g. 18:00" />

        <label style={s.fieldLabel}>Available Days</label>
        <div style={s.daysRow}>
          {DAYS.map(day => (
            <button key={day} style={s.dayChip(availableDays.includes(day))} onClick={() => toggleDay(day)}>{day}</button>
          ))}
        </div>

        {!isAdditionalListing && (
          <>
            <label style={s.fieldLabel}>Assign to User (Email) — optional</label>
            <input style={s.input} type="email" value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} placeholder="host@example.com — must already have a Cubby account" />

            <div style={s.switchRow}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Active on launch</span>
              <button
                onClick={() => setActive(v => !v)}
                style={{ width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', backgroundColor: active ? '#2D6A4F' : '#D1D5DB', position: 'relative', transition: 'background-color 0.2s' }}
              >
                <span style={{ position: 'absolute', top: 3, left: active ? 24 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: 'white', transition: 'left 0.2s', display: 'block' }} />
              </button>
            </div>
          </>
        )}

        {isAdditionalListing && (
          <div style={{ ...s.switchRow, backgroundColor: '#F9FAFB' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>Starts as draft (inactive)</span>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>Host activates it themselves</span>
          </div>
        )}

        {!!errorMsg && <div style={s.errorBox}>{errorMsg}</div>}

        <button onClick={handleSave} disabled={saving} style={s.saveBtn(saving)}>
          {saving ? 'Saving...' : isAdditionalListing ? 'Create Listing' : 'Create Host Profile'}
        </button>
      </div>

      {/* Sticky footer: error + save button always visible */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', backgroundColor: '#FAF9F6', borderTop: '1px solid #F0EAEA' }}>
        {!!errorMsg && <div style={{ ...s.errorBox, marginBottom: 8 }}>{errorMsg}</div>}
        {!!successMsg && <div style={{ ...s.successBox, marginBottom: 8 }}>{successMsg}</div>}
        <button onClick={handleSave} disabled={saving} style={s.saveBtn(saving)}>
          {saving ? 'Saving…' : isAdditionalListing ? 'Create Listing' : 'Create Host Profile'}
        </button>
      </div>
    </div>
  );
}
