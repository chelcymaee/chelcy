import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

export default function Profile() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('Chelcy');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('cubby_traveller_profile').then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.name) setName(data.name);
        if (data.avatarUri) setAvatar(data.avatarUri);
      } catch {}
    });
  }, []);

  async function saveProfile(newName: string, avatarUri: string | null) {
    await AsyncStorage.setItem('cubby_traveller_profile', JSON.stringify({ name: newName, avatarUri }));
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to add a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      await saveProfile(name, uri);
    }
  }

  function handleEditPress() {
    setDraftName(name);
    setEditingName(true);
  }

  async function handleSaveName() {
    const trimmed = draftName.trim() || name;
    setName(trimmed);
    setEditingName(false);
    await saveProfile(trimmed, avatar);
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  }

  const MENU_ITEMS = [
    { icon: '💳', label: 'Payment methods', onPress: () => router.push('/(traveller)/payment-details') },
    { icon: '🔔', label: 'Notifications', onPress: () => router.push('/(traveller)/notifications') },
    { icon: '✅', label: 'Get verified', onPress: () => router.push('/(traveller)/verification'), highlight: true },
    { icon: '🏦', label: 'Bank details (hosts)', onPress: () => router.push('/(host)/bank-details') },
    { icon: '🛡️', label: 'Safety & trust', onPress: () => router.push('/(traveller)/safety') },
    { icon: '❓', label: 'Help & support', onPress: () => router.push('/(traveller)/support') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Account</Text>
        </View>

        {/* Become a Host card */}
        <TouchableOpacity
          style={styles.becomeHostCard}
          onPress={() => router.push('/(host)/bank-details')}
          activeOpacity={0.85}
        >
          <View style={styles.becomeHostLeft}>
            <Text style={styles.becomeHostEmoji}>🏠</Text>
            <View>
              <Text style={styles.becomeHostTitle}>Become a Cubby Host</Text>
              <Text style={styles.becomeHostSub}>Earn money storing bags for travellers</Text>
            </View>
          </View>
          <Text style={styles.becomeHostArrow}>›</Text>
        </TouchableOpacity>

        {/* Switch to Host Dashboard */}
        <TouchableOpacity
          style={styles.switchBanner}
          onPress={() => router.replace('/(host)/dashboard')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.switchBannerTitle}>Switch to Host Dashboard 🏠</Text>
            <Text style={styles.switchBannerSub}>Manage your listing and earnings</Text>
          </View>
          <Text style={styles.switchBannerArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.profileCard}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditText}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={styles.nameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  onSubmitEditing={handleSaveName}
                />
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{name}</Text>
                <View style={styles.unverifiedBadge}>
                  <Text style={styles.unverifiedText}>Unverified</Text>
                </View>
              </View>
            )}
            <Text style={styles.profileEmail}>chelcymae1@gmail.com</Text>
          </View>
          {editingName ? (
            <TouchableOpacity style={styles.editBtn} onPress={handleSaveName}>
              <Text style={styles.editBtnText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={handleEditPress}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>R0</Text>
            <Text style={styles.statLabel}>Total spent</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuItem,
                item.highlight && styles.menuItemHighlight,
                item.accent && styles.menuItemAccent,
                idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[
                styles.menuLabel,
                item.highlight && styles.menuLabelHighlight,
                item.accent && styles.menuLabelAccent,
              ]}>
                {item.label}
              </Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Cubby v1.0 · Cape Town 🇿🇦</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 32 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  avatarEditText: { fontSize: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: Colors.primary, minWidth: 100 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  unverifiedBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  unverifiedText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 20,
    borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  menu: {
    marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuItemHighlight: { backgroundColor: '#F0FFF4' },
  menuItemAccent: { backgroundColor: '#FFF8F8' },
  menuIcon: { fontSize: 22, width: 28 },
  menuLabel: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  menuLabelHighlight: { color: Colors.success, fontWeight: '700' },
  menuLabelAccent: { color: Colors.primary, fontWeight: '700' },
  menuArrow: { fontSize: 20, color: Colors.textLight },
  signOutBtn: {
    marginHorizontal: 20, borderWidth: 1.5, borderColor: Colors.error,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.error },
  version: { textAlign: 'center', color: Colors.textLight, fontSize: 12, marginBottom: 8 },
  becomeHostCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FF5C5C', marginHorizontal: 20, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  becomeHostLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  becomeHostEmoji: { fontSize: 28 },
  becomeHostTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  becomeHostSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  becomeHostArrow: { fontSize: 24, color: '#FFFFFF' },
  switchBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', marginHorizontal: 20, borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  switchBannerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  switchBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  switchBannerArrow: { fontSize: 24, color: '#FFFFFF' },
});
