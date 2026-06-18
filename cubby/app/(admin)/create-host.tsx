import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch, Pressable, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
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
        console.log('Inserting host:', payload);
        const { data, error } = await supabase.from('hosts').insert(payload).select();
        console.log('Supabase result:', { data, error });
        if (error) {
          console.error('Supabase error:', error);
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
        Alert.alert('Success', 'Host profile created!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      console.error('Caught error:', e);
      setErrorMsg('Failed to save: ' + (e?.message ?? 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, overflowY: 'auto' } as any}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}>
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Create Host Profile</Text>
        </View>

        <View style={styles.form}>
          <Field label="Display Name *">
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. The Coffee Corner"
              placeholderTextColor="#C0C0C0"
            />
          </Field>

          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="A short description of the hosting spot..."
              placeholderTextColor="#C0C0C0"
              multiline
              numberOfLines={4}
            />
          </Field>

          <Field label="Location Name *">
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. Cape Town City Bowl"
              placeholderTextColor="#C0C0C0"
            />
          </Field>

          <Field label="Business Type">
            <View style={styles.typeGrid}>
              {BUSINESS_TYPES.map(bt => (
                <TouchableOpacity
                  key={bt.value}
                  style={[styles.typeChip, businessType === bt.value && styles.typeChipActive]}
                  onPress={() => setBusinessType(bt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{bt.emoji}</Text>
                  <Text style={[styles.typeLabel, businessType === bt.value && styles.typeLabelActive]}>
                    {bt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Price per Bag per Day (R100–R300) *">
            <TextInput
              style={styles.input}
              value={pricePerBag}
              onChangeText={setPricePerBag}
              placeholder="e.g. 150"
              placeholderTextColor="#C0C0C0"
              keyboardType="numeric"
            />
          </Field>

          <Field label="Max Bags (1–50) *">
            <TextInput
              style={styles.input}
              value={maxBags}
              onChangeText={setMaxBags}
              placeholder="e.g. 10"
              placeholderTextColor="#C0C0C0"
              keyboardType="numeric"
            />
          </Field>

          <Field label="Available From">
            <TextInput
              style={styles.input}
              value={availableFrom}
              onChangeText={setAvailableFrom}
              placeholder="e.g. 08:00"
              placeholderTextColor="#C0C0C0"
            />
          </Field>

          <Field label="Available Until">
            <TextInput
              style={styles.input}
              value={availableUntil}
              onChangeText={setAvailableUntil}
              placeholder="e.g. 18:00"
              placeholderTextColor="#C0C0C0"
            />
          </Field>

          <Field label="Available Days">
            <View style={styles.daysRow}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, availableDays.includes(day) && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLabel, availableDays.includes(day) && styles.dayLabelActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Partner Email">
            <TextInput
              style={styles.input}
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              placeholder="partner@example.com"
              placeholderTextColor="#C0C0C0"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: '#D1D5DB', true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          {!!errorMsg && (
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: '#DC2626', fontWeight: '600' }}>{errorMsg}</Text>
            </View>
          )}
          {!!successMsg && (
            <View style={{ backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: '#065F46', fontWeight: '600' }}>{successMsg}</Text>
            </View>
          )}

          {/* @ts-ignore */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? '#ccc' : '#2D6A4F',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '18px',
              fontSize: 16,
              fontWeight: 800,
              width: '100%',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {saving ? 'Saving...' : 'Create Host Profile'}
          </button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backLink: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  form: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F0EAEA',
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeLabelActive: { color: Colors.white },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F0EAEA',
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  dayLabelActive: { color: Colors.white },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 28,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
});
