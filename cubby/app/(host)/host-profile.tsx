import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Switch, Image, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import LocationPicker, { LocationResult } from '../../src/components/LocationPicker';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STORAGE_FEATURES = [
  { value: 'secure_storage', emoji: '🛡', label: 'Secure Storage' },
  { value: 'cctv', emoji: '📷', label: 'CCTV' },
  { value: 'staffed', emoji: '🏢', label: 'Staffed Location' },
  { value: 'indoor', emoji: '🏠', label: 'Indoor Storage' },
];
const TYPES = [
  { value: 'cafe', label: 'Café', emoji: '☕' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'hostel', label: 'Hostel', emoji: '🛏️' },
  { value: 'guesthouse', label: 'Guesthouse', emoji: '🏡' },
  { value: 'airbnb', label: 'Airbnb', emoji: '🔑' },
  { value: 'tour_operator', label: 'Tour Operator', emoji: '🗺️' },
  { value: 'home', label: 'Home', emoji: '🏠' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export default function HostProfile() {
  const [displayName, setDisplayName] = useState('My Cubby Spot');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [type, setType] = useState('home');
  const [pricePerBag, setPricePerBag] = useState('100');
  const [maxBags, setMaxBags] = useState('4');
  const [fromTime, setFromTime] = useState('08:00');
  const [untilTime, setUntilTime] = useState('20:00');
  const [days, setDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [isActive, setIsActive] = useState(true);
  const [storageFeatures, setStorageFeatures] = useState<string[]>([]);

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<any>(null);

  const [loading, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [priceError, setPriceError] = useState('');

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('hosts')
          .select('*')
          .eq('assigned_user_id', user.id)
          .single();
        if (!error && data) {
          setDisplayName(data.display_name ?? 'My Cubby Spot');
          setBio(data.bio ?? '');
          setLocation(data.location_name ?? '');
          setLatitude(data.latitude ?? 0);
          setLongitude(data.longitude ?? 0);
          setType(data.business_type ?? 'home');
          setPricePerBag(String(data.price_per_bag_per_day ?? 100));
          setMaxBags(String(data.max_bags ?? 4));
          setFromTime(data.available_from ?? '08:00');
          setUntilTime(data.available_until ?? '20:00');
          setDays(data.available_days ?? DAYS);
          setIsActive(data.is_active ?? true);
          setStorageFeatures(data.storage_features ?? []);
          setPhotos(data.photos ?? []);
          return;
        }
      }
    }
    // Fallback: AsyncStorage
    const raw = await AsyncStorage.getItem('cubby_host_profile');
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.displayName !== undefined) setDisplayName(d.displayName);
      if (d.bio !== undefined) setBio(d.bio);
      if (d.location !== undefined) setLocation(d.location);
      if (d.type !== undefined) setType(d.type);
      if (d.pricePerBag !== undefined) setPricePerBag(d.pricePerBag);
      if (d.maxBags !== undefined) setMaxBags(d.maxBags);
      if (d.fromTime !== undefined) setFromTime(d.fromTime);
      if (d.untilTime !== undefined) setUntilTime(d.untilTime);
      if (d.days !== undefined) setDays(d.days);
      if (d.isActive !== undefined) setIsActive(d.isActive);
    } catch {}
  }

  function toggleDay(d: string) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function toggleFeature(f: string) {
    setStorageFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  async function handlePhotoSelect(e: any) {
    const file: File = e.target.files?.[0];
    if (!file) return;
    if (!isSupabaseConfigured) { showToast('Photo upload requires Supabase', true); return; }
    if (photos.length >= 5) { showToast('Maximum 5 photos allowed', true); return; }

    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast('Not logged in', true); return; }

      const ext = file.name.split('.').pop();
      const path = `host-photos/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('host-photos')
        .upload(path, file, { upsert: false });
      if (upErr) { showToast('Upload failed: ' + upErr.message, true); return; }

      const { data: { publicUrl } } = supabase.storage.from('host-photos').getPublicUrl(path);
      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);

      // persist to host row immediately
      await supabase.from('hosts').update({ photos: newPhotos }).eq('assigned_user_id', user.id);
      showToast('Photo added ✓');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removePhoto(url: string) {
    const newPhotos = photos.filter(p => p !== url);
    setPhotos(newPhotos);
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('hosts').update({ photos: newPhotos }).eq('assigned_user_id', user.id);
    }
  }

  async function save() {
    if (location.trim() && (!latitude || !longitude)) {
      showToast('Please select a location from the suggestions — do not type manually.', true);
      return;
    }

    const price = parseInt(pricePerBag);
    if (isNaN(price) || price < 10 || price > 1000) {
      setPriceError('Price must be between R10 and R1,000 per bag per day.');
      return;
    }
    setPriceError('');

    const bags = Math.max(1, Math.min(50, parseInt(maxBags) || 4));

    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('hosts')
            .update({
              display_name: displayName.trim(),
              bio: bio.trim(),
              location_name: location.trim(),
              latitude: latitude || null,
              longitude: longitude || null,
              business_type: type,
              price_per_bag_per_day: price,
              max_bags: bags,
              available_from: fromTime,
              available_until: untilTime,
              available_days: days,
              is_active: isActive,
              storage_features: storageFeatures,
            })
            .eq('assigned_user_id', user.id);

          if (error) {
            showToast('Could not save. Please try again.', true);
            return;
          }

          // Cache locally so offline reads are also fresh
          await AsyncStorage.setItem('cubby_host_profile', JSON.stringify({
            displayName: displayName.trim(), bio: bio.trim(), location: location.trim(),
            type, pricePerBag: String(price), maxBags: String(bags),
            fromTime, untilTime, days, isActive,
          }));

          showToast('Listing updated ✓');
          return;
        }
      }

      // Demo mode: AsyncStorage only
      await AsyncStorage.setItem('cubby_host_profile', JSON.stringify({
        displayName: displayName.trim(), bio: bio.trim(), location: location.trim(),
        type, pricePerBag: String(price), maxBags: String(bags),
        fromTime, untilTime, days, isActive,
      }));
      showToast('Listing updated ✓');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.error && styles.toastError]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>My Host Profile</Text>
        </View>

        {/* Active toggle */}
        <View style={styles.activeCard}>
          <View>
            <Text style={styles.activeTitle}>Accepting bookings</Text>
            <Text style={styles.activeSub}>Toggle off to pause new bookings</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Business type */}
        <Text style={styles.sectionTitle}>Type of space</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, type === t.value && styles.typeChipActive]}
                onPress={() => setType(t.value)}
                // @ts-ignore
                onClick={() => setType(t.value)}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Basic info */}
        <Text style={styles.sectionTitle}>Display name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Sea Point Café & Co"
          placeholderTextColor={Colors.textLight}
        />

        <LocationPicker
          label="Location"
          value={location}
          placeholder="Search address or area…"
          onSelect={(r: LocationResult) => { setLocation(r.address); setLatitude(r.latitude); setLongitude(r.longitude); }}
        />

        <Text style={styles.sectionTitle}>About your space</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Describe your space, what travellers can expect, and any house rules…"
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
        />

        {/* Pricing */}
        <Text style={styles.sectionTitle}>Price per bag per day</Text>
        <View style={styles.priceRow}>
          <Text style={styles.pricePrefix}>R</Text>
          <TextInput
            style={[styles.input, styles.priceInput, !!priceError && styles.inputError]}
            value={pricePerBag}
            onChangeText={v => { setPricePerBag(v); setPriceError(''); }}
            keyboardType="numeric"
          />
        </View>
        {!!priceError && <Text style={styles.errorText}>{priceError}</Text>}

        <Text style={styles.sectionTitle}>Max bags you can take</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setMaxBags(String(Math.max(1, (parseInt(maxBags) || 1) - 1)))}
            // @ts-ignore
            onClick={() => setMaxBags(String(Math.max(1, (parseInt(maxBags) || 1) - 1)))}
          >
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterVal}>{maxBags}</Text>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setMaxBags(String(Math.min(50, (parseInt(maxBags) || 1) + 1)))}
            // @ts-ignore
            onClick={() => setMaxBags(String(Math.min(50, (parseInt(maxBags) || 1) + 1)))}
          >
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.counterLabel}>bags max</Text>
        </View>

        {/* Hours */}
        <Text style={styles.sectionTitle}>Available hours</Text>
        <View style={styles.hoursRow}>
          <View style={styles.hoursField}>
            <Text style={styles.hoursLabel}>From</Text>
            <TextInput style={styles.hoursInput} value={fromTime} onChangeText={setFromTime} placeholder="08:00" placeholderTextColor={Colors.textLight} />
          </View>
          <Text style={styles.hoursDash}>–</Text>
          <View style={styles.hoursField}>
            <Text style={styles.hoursLabel}>Until</Text>
            <TextInput style={styles.hoursInput} value={untilTime} onChangeText={setUntilTime} placeholder="20:00" placeholderTextColor={Colors.textLight} />
          </View>
        </View>

        {/* Days */}
        <Text style={styles.sectionTitle}>Available days</Text>
        <View style={styles.daysRow}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, days.includes(d) && styles.dayChipActive]}
              onPress={() => toggleDay(d)}
              // @ts-ignore
              onClick={() => toggleDay(d)}
            >
              <Text style={[styles.dayText, days.includes(d) && styles.dayTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Storage features */}
        <Text style={styles.sectionTitle}>Storage features</Text>
        <Text style={styles.sectionSub}>Tick what applies — these appear as trust badges on your listing.</Text>
        <View style={styles.featuresGrid}>
          {STORAGE_FEATURES.map(f => {
            const active = storageFeatures.includes(f.value);
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.featureChip, active && styles.featureChipActive]}
                onPress={() => toggleFeature(f.value)}
                // @ts-ignore
                onClick={() => toggleFeature(f.value)}
                activeOpacity={0.85}
              >
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={[styles.featureLabel, active && styles.featureLabelActive]}>{f.label}</Text>
                {active && <Text style={styles.featureCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photos */}
        <Text style={styles.sectionTitle}>Photos of your storage space</Text>
        {Platform.OS === 'web' && (
          // @ts-ignore
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
        )}
        <View style={styles.photosGrid}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoImg} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => removePhoto(uri)}
                // @ts-ignore
                onClick={() => removePhoto(uri)}
              >
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity
              style={styles.photosPlaceholder}
              onPress={() => fileInputRef.current?.click()}
              // @ts-ignore
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              <Text style={styles.photosIcon}>{uploadingPhoto ? '⏳' : '📷'}</Text>
              <Text style={styles.photosText}>{uploadingPhoto ? 'Uploading…' : 'Add photo'}</Text>
              {photos.length === 0 && (
                <Text style={styles.photosSub}>Hosts with photos earn 3× more bookings</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={save}
          // @ts-ignore
          onClick={save}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>{loading ? 'Saving…' : 'Save listing'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  toast: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  toastError: { backgroundColor: '#DC2626' },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  header: { padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  activeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  activeTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  activeSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  typeChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeEmoji: { fontSize: 20, marginBottom: 2 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  typeLabelActive: { color: Colors.white },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  inputError: { borderColor: '#DC2626' },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { fontSize: 13, color: '#DC2626', marginHorizontal: 20, marginTop: -14, marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20 },
  pricePrefix: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginRight: 4 },
  priceInput: { width: 120, marginLeft: 0 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  counterBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  counterBtnText: { fontSize: 22, color: Colors.white, fontWeight: '700', lineHeight: 26 },
  counterVal: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, minWidth: 32, textAlign: 'center' },
  counterLabel: { fontSize: 14, color: Colors.textSecondary },
  hoursRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  hoursField: { flex: 1 },
  hoursLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  hoursInput: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary, textAlign: 'center',
  },
  hoursDash: { fontSize: 20, color: Colors.textLight, marginTop: 18 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  dayTextActive: { color: Colors.white },
  photosGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 20, marginBottom: 24,
  },
  photoThumb: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImg: { width: 100, height: 100 },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photosPlaceholder: {
    width: 100, height: 100, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white,
  },
  photosIcon: { fontSize: 28, marginBottom: 4 },
  photosText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  photosSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 4 },
  sectionSub: { fontSize: 12, color: Colors.textSecondary, paddingHorizontal: 20, marginTop: -6, marginBottom: 12 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.white,
  },
  featureChipActive: { borderColor: Colors.primary, backgroundColor: '#FFF0F0' },
  featureEmoji: { fontSize: 18 },
  featureLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  featureLabelActive: { color: Colors.primary },
  featureCheck: { fontSize: 13, color: Colors.primary, fontWeight: '800', marginLeft: 2 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginHorizontal: 20,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
