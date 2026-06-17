import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Switch, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
  const [type, setType] = useState('home');
  const [pricePerBag, setPricePerBag] = useState('60');
  const [maxBags, setMaxBags] = useState('4');
  const [fromTime, setFromTime] = useState('08:00');
  const [untilTime, setUntilTime] = useState('20:00');
  const [days, setDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [isActive, setIsActive] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('cubby_host_profile').then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.displayName !== undefined) setDisplayName(data.displayName);
        if (data.bio !== undefined) setBio(data.bio);
        if (data.location !== undefined) setLocation(data.location);
        if (data.type !== undefined) setType(data.type);
        if (data.pricePerBag !== undefined) setPricePerBag(data.pricePerBag);
        if (data.maxBags !== undefined) setMaxBags(data.maxBags);
        if (data.fromTime !== undefined) setFromTime(data.fromTime);
        if (data.untilTime !== undefined) setUntilTime(data.untilTime);
        if (data.days !== undefined) setDays(data.days);
        if (data.isActive !== undefined) setIsActive(data.isActive);
      } catch {}
    });
  }, []);

  function toggleDay(d: string) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function save() {
    const data = { displayName, bio, location, type, pricePerBag, maxBags, fromTime, untilTime, days, isActive };
    await AsyncStorage.setItem('cubby_host_profile', JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    Alert.alert('Saved!', 'Your host profile has been saved.');
  }

  return (
    <SafeAreaView style={styles.container}>
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
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Basic info */}
        <Text style={styles.sectionTitle}>Display name</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

        <Text style={styles.sectionTitle}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Sea Point, Cape Town"
          placeholderTextColor={Colors.textLight}
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
        <Text style={styles.sectionTitle}>Price per bag per day (ZAR)</Text>
        <View style={styles.priceRow}>
          <Text style={styles.pricePrefix}>R</Text>
          <TextInput
            style={[styles.input, styles.priceInput]}
            value={pricePerBag}
            onChangeText={setPricePerBag}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.sectionTitle}>Max bags you can take</Text>
        <TextInput
          style={[styles.input, { width: 100 }]}
          value={maxBags}
          onChangeText={setMaxBags}
          keyboardType="numeric"
        />

        {/* Hours */}
        <Text style={styles.sectionTitle}>Available hours</Text>
        <View style={styles.hoursRow}>
          <View style={styles.hoursField}>
            <Text style={styles.hoursLabel}>From</Text>
            <TextInput style={styles.hoursInput} value={fromTime} onChangeText={setFromTime} />
          </View>
          <Text style={styles.hoursDash}>–</Text>
          <View style={styles.hoursField}>
            <Text style={styles.hoursLabel}>Until</Text>
            <TextInput style={styles.hoursInput} value={untilTime} onChangeText={setUntilTime} />
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
            >
              <Text style={[styles.dayText, days.includes(d) && styles.dayTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photos placeholder */}
        <Text style={styles.sectionTitle}>Photos of your storage space</Text>
        <TouchableOpacity style={styles.photosPlaceholder}>
          <Text style={styles.photosIcon}>📷</Text>
          <Text style={styles.photosText}>Add photos</Text>
          <Text style={styles.photosSub}>Hosts with photos earn 3× more bookings</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save profile'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
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
  textArea: { height: 100, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20 },
  pricePrefix: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginRight: 4 },
  priceInput: { width: 100, marginLeft: 0 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  hoursField: { flex: 1 },
  hoursLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  hoursInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  hoursDash: { fontSize: 20, color: Colors.textLight, marginTop: 18 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  dayTextActive: { color: Colors.white },
  photosPlaceholder: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 24,
  },
  photosIcon: { fontSize: 36, marginBottom: 8 },
  photosText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  photosSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
