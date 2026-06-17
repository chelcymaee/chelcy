import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Alert, Image, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
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
  const [firstName, setFirstName] = useState('Chelcy');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Draft state for modal
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  const EMAIL = 'chelcymae1@gmail.com';

  useEffect(() => {
    AsyncStorage.getItem('cubby_traveller_profile').then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        // Legacy support for old 'name' key
        if (!data.firstName && data.name) setFirstName(data.name);
        if (data.avatarUri) setAvatar(data.avatarUri);
        if (data.phone) setPhone(data.phone);
      } catch {}
    });
  }, []);

  async function saveProfile(fn: string, ln: string, ph: string, avatarUri: string | null) {
    await AsyncStorage.setItem(
      'cubby_traveller_profile',
      JSON.stringify({ firstName: fn, lastName: ln, phone: ph, avatarUri }),
    );
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
      await saveProfile(firstName, lastName, phone, uri);
    }
  }

  function openEditModal() {
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setDraftPhone(phone);
    setEditModalVisible(true);
  }

  async function handleSave() {
    const fn = draftFirstName.trim() || firstName;
    const ln = draftLastName.trim();
    const ph = draftPhone.trim();
    setFirstName(fn);
    setLastName(ln);
    setPhone(ph);
    setEditModalVisible(false);
    await saveProfile(fn, ln, ph, avatar);
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

  const displayName = [firstName, lastName].filter(Boolean).join(' ');

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
        { icon: '🌐', label: 'Language', onPress: () => router.push('/(traveller)/language') },
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
        <View style={styles.profileCard}>
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
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{EMAIL}</Text>
            </View>
            <TouchableOpacity style={styles.editChip} onPress={openEditModal}>
              <Text style={styles.editChipText}>Edit ›</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Info rows */}
          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{displayName || '—'}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#F0EAEA' }]}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{EMAIL}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#F0EAEA' }]}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{phone || '—'}</Text>
            </View>
          </View>
        </View>

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

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit</Text>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Change your personal information.</Text>

            {/* First name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First name</Text>
              <TextInput
                style={styles.textInput}
                value={draftFirstName}
                onChangeText={setDraftFirstName}
                placeholder="First name"
                placeholderTextColor="#C0C0C0"
              />
            </View>

            {/* Last name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last name</Text>
              <TextInput
                style={styles.textInput}
                value={draftLastName}
                onChangeText={setDraftLastName}
                placeholder="Last name"
                placeholderTextColor="#C0C0C0"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>🇿🇦 +27</Text>
                </View>
                <TextInput
                  style={[styles.textInput, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                  value={draftPhone}
                  onChangeText={setDraftPhone}
                  placeholder="81 234 5678"
                  placeholderTextColor="#C0C0C0"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email (locked) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.textInput, styles.lockedInput]}>
                <Text style={styles.lockedInputText}>{EMAIL}</Text>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={styles.lockedNote}>Your email is locked to this account.</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },

  // Profile card
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0EAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarEditText: { fontSize: 9 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  editChip: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editChipText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Info rows
  infoRows: { borderTopWidth: 1, borderTopColor: '#F0EAEA' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flexShrink: 1, textAlign: 'right' },

  // Become a host
  becomeHostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FF5C5C',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  becomeHostEmoji: { fontSize: 26 },
  becomeHostTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  becomeHostSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  becomeHostArrow: { fontSize: 22, color: '#FFFFFF' },

  // Section header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },

  // Menu section
  menuSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA',
  },
  menuRowIcon: { fontSize: 20, width: 26 },
  menuRowLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  menuRowLabelHighlight: { color: '#FF5C5C', fontWeight: '700' },
  menuRowChevron: { fontSize: 20, color: Colors.textSecondary },

  // Divider + sign out
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 4,
  },
  signOutRow: { paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center' },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.error },
  deleteRow: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  deleteText: { fontSize: 13, color: Colors.textLight },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalSaveBtn: {
    backgroundColor: '#FF5C5C',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalSaveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  modalSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },

  // Inputs
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  phoneRow: { flexDirection: 'row' },
  phonePrefix: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  phonePrefixText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  lockedInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  lockedInputText: { flex: 1, fontSize: 16, color: Colors.textSecondary },
  lockIcon: { fontSize: 16 },
  lockedNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
});
