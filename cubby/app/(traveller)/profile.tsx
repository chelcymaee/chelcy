import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  highlight?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuRowIcon}>{item.icon}</Text>
      <Text style={[styles.menuRowLabel, item.highlight && styles.menuRowLabelHighlight]}>
        {item.label}
      </Text>
      <Text style={styles.menuRowChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
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

  function handleDeleteAccount() {
    Alert.alert('Delete account', 'This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {} },
    ]);
  }

  const SECTIONS: MenuSection[] = [
    {
      title: 'Hosting',
      items: [
        { icon: '🏠', label: 'Switch to Host Dashboard', onPress: () => router.replace('/(host)/dashboard') },
        { icon: '📋', label: 'My host listing', onPress: () => router.push('/(host)/host-profile') },
        { icon: '🏦', label: 'Bank details', onPress: () => router.push('/(host)/bank-details') },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: '💳', label: 'Payment methods', onPress: () => router.push('/(traveller)/payment-details') },
        { icon: '🔔', label: 'Notifications', onPress: () => router.push('/(traveller)/notifications') },
        { icon: '✅', label: 'Get verified ✅', onPress: () => router.push('/(traveller)/verification'), highlight: true },
      ],
    },
    {
      title: 'Information',
      items: [
        { icon: '❓', label: 'How it works', onPress: () => router.push('/(traveller)/support') },
        { icon: '💬', label: 'FAQ', onPress: () => router.push('/(traveller)/support') },
        { icon: '🛡️', label: 'Safety & trust', onPress: () => router.push('/(traveller)/safety') },
        { icon: '📞', label: 'Contact support', onPress: () => router.push('/(traveller)/support') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Account</Text>
        </View>

        {/* Profile row */}
        <TouchableOpacity style={styles.profileRow} activeOpacity={0.85} onPress={pickImage}>
          <View style={styles.avatarContainer}>
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
          </View>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                autoFocus
                onSubmitEditing={handleSaveName}
              />
            ) : (
              <Text style={styles.profileName}>{name}</Text>
            )}
            <Text style={styles.profileEmail}>chelcymae1@gmail.com</Text>
          </View>
          {editingName ? (
            <TouchableOpacity style={styles.editChip} onPress={handleSaveName}>
              <Text style={styles.editChipText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editChip} onPress={handleEditPress}>
              <Text style={styles.editChipText}>Edit ›</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Become a Host banner */}
        <TouchableOpacity
          style={styles.becomeHostCard}
          onPress={() => router.push('/(host)/bank-details')}
          activeOpacity={0.85}
        >
          <Text style={styles.becomeHostEmoji}>🏠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.becomeHostTitle}>Become a Cubby Host</Text>
            <Text style={styles.becomeHostSub}>Earn money storing bags →</Text>
          </View>
          <Text style={styles.becomeHostArrow}>›</Text>
        </TouchableOpacity>

        {/* Menu sections */}
        {SECTIONS.map(section => (
          <View key={section.title}>
            <SectionHeader title={section.title} />
            <View style={styles.menuSection}>
              {section.items.map((item, idx) => (
                <MenuRow key={item.label} item={item} isLast={idx === section.items.length - 1} />
              ))}
            </View>
          </View>
        ))}

        {/* Sign out / Delete */}
        <View style={styles.divider} />
        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },

  // Profile row
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, marginTop: 8,
  },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F0EAEA', alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  avatarEditText: { fontSize: 9 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  nameInput: {
    fontSize: 17, fontWeight: '700', color: Colors.textPrimary,
    borderBottomWidth: 1.5, borderBottomColor: Colors.primary, minWidth: 100,
  },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  editChip: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  editChipText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Become a host
  becomeHostCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FF5C5C', marginHorizontal: 20, borderRadius: 16,
    padding: 16, marginBottom: 8,
  },
  becomeHostEmoji: { fontSize: 26 },
  becomeHostTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  becomeHostSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  becomeHostArrow: { fontSize: 22, color: '#FFFFFF' },

  // Section header
  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginTop: 24, marginBottom: 8,
  },

  // Menu section
  menuSection: {
    backgroundColor: Colors.white, marginHorizontal: 20,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, height: 56,
    borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },
  menuRowIcon: { fontSize: 20, width: 26 },
  menuRowLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  menuRowLabelHighlight: { color: '#FF5C5C', fontWeight: '700' },
  menuRowChevron: { fontSize: 20, color: Colors.textSecondary },

  // Divider + sign out
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20, marginTop: 28, marginBottom: 4 },
  signOutRow: {
    paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.error },
  deleteRow: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  deleteText: { fontSize: 13, color: Colors.textLight },
});
