import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Image, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

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
      // @ts-ignore
      onClick={item.onPress}
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isHostApproved, setIsHostApproved] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarToast, setAvatarToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Draft state for modal
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? '');
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          const parts = (profile.full_name ?? '').split(' ');
          setFirstName(parts[0] ?? '');
          setLastName(parts.slice(1).join(' '));
          setPhone(profile.phone ?? '');
          if (profile.avatar_url) setAvatar(profile.avatar_url);
          setIsHostApproved(profile.is_host_approved ?? false);

          // Check verification status
          const { data: verif } = await supabase
            .from('verifications')
            .select('status')
            .eq('user_id', user.id)
            .maybeSingle();
          if (verif) {
            setVerificationStatus(verif.status);
          } else if (profile.is_verified) {
            setVerificationStatus('approved');
          }
          return;
        }
      }
    }
    // Fallback: AsyncStorage
    const raw = await AsyncStorage.getItem('cubby_traveller_profile');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.firstName) setFirstName(data.firstName);
      if (data.lastName) setLastName(data.lastName);
      if (!data.firstName && data.name) setFirstName(data.name);
      if (data.avatarUri) setAvatar(data.avatarUri);
      if (data.phone) setPhone(data.phone);
      if (data.email) setEmail(data.email);
    } catch {}
  }

  function showToast(msg: string, ok: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setAvatarToast({ msg, ok });
    toastTimer.current = setTimeout(() => setAvatarToast(null), 3500);
  }

  async function saveProfile(fn: string, ln: string, ph: string, avatarUrl: string | null) {
    setSavingProfile(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email ?? '',
            full_name: [fn, ln].filter(Boolean).join(' '),
            phone: ph,
            ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
          });
        }
      }
      await AsyncStorage.setItem(
        'cubby_traveller_profile',
        JSON.stringify({ firstName: fn, lastName: ln, phone: ph, avatarUri: avatarUrl }),
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    // Show local preview immediately (optimistic)
    setAvatar(localUri);

    if (!isSupabaseConfigured) {
      // Demo mode: persist local URI only
      await AsyncStorage.setItem(
        'cubby_traveller_profile',
        JSON.stringify({ firstName, lastName, phone, avatarUri: localUri }),
      );
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch blob from local URI (works on both native and web)
      const response = await fetch(localUri);
      const blob = await response.blob();
      const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const safeExt = allowedExts.includes(ext) ? ext : 'jpg';
      const filePath = `${user.id}/avatar.${safeExt}`;
      const contentType = blob.type || `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType });

      if (uploadError) throw uploadError;

      // Get stable public URL (cache-busted with timestamp so UI refreshes)
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrlWithBust = `${publicUrl}?t=${Date.now()}`;

      // Persist public URL to profiles table
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: [firstName, lastName].filter(Boolean).join(' '),
        phone,
        avatar_url: publicUrl,
      });
      if (profileError) throw profileError;

      setAvatar(publicUrlWithBust);
      // Update AsyncStorage fallback with public URL so it persists across reinstall
      await AsyncStorage.setItem(
        'cubby_traveller_profile',
        JSON.stringify({ firstName, lastName, phone, avatarUri: publicUrl }),
      );
      showToast('Photo updated!', true);
    } catch {
      // Keep local URI as optimistic preview; surface error
      showToast('Upload failed — photo not saved to cloud.', false);
    } finally {
      setUploadingAvatar(false);
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
    // Pass undefined for avatarUrl so saveProfile doesn't overwrite the stored avatar_url
    await saveProfile(fn, ln, ph, avatar);
  }

  function handleSignOut() {
    setConfirmSignOut(true);
  }

  async function doSignOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem('cubby_traveller_profile');
    router.replace('/');
  }

  function handleDeleteAccount() {
    setConfirmDelete(true);
    setDeleteError('');
  }

  async function doDeleteAccount() {
    setDeletingAccount(true);
    setDeleteError('');
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.functions.invoke('delete-user-account', { body: {} });
        if (error) {
          setDeleteError('Could not delete account. Please contact support.');
          return;
        }
        await supabase.auth.signOut();
      }
      await AsyncStorage.clear();
      router.replace('/');
    } catch {
      setDeleteError('Something went wrong. Please try again.');
    } finally {
      setDeletingAccount(false);
      setConfirmDelete(false);
    }
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ');

  const SECTIONS: MenuSection[] = [
    ...(isHostApproved ? [{
      title: 'Hosting',
      items: [
        { icon: '🏠', label: 'Switch to Host Dashboard', onPress: () => router.replace('/(host)/dashboard') },
        { icon: '📋', label: 'My host listing', onPress: () => router.push('/(host)/host-profile') },
        { icon: '🏦', label: 'Bank details', onPress: () => router.push('/(host)/bank-details') },
      ],
    }] : []),
    {
      title: 'General',
      items: [
        { icon: '💳', label: 'Payment methods', onPress: () => router.push('/(traveller)/payment-details') },
        { icon: '🔔', label: 'Notification Preferences', onPress: () => router.push('/(traveller)/notification-preferences') },
        { icon: '🌐', label: 'Language', onPress: () => router.push('/(traveller)/language') },
        {
          icon: verificationStatus === 'approved' ? '✅' : verificationStatus === 'pending' ? '⏳' : verificationStatus === 'rejected' ? '❌' : '🪪',
          label: verificationStatus === 'approved' ? 'Verified ✅' : verificationStatus === 'pending' ? 'Verification pending…' : verificationStatus === 'rejected' ? 'Verification failed — retry' : 'Get verified ✅',
          onPress: () => router.push('/(traveller)/verification'),
          highlight: verificationStatus === 'none' || verificationStatus === 'rejected',
        },
      ],
    },
    {
      title: 'Information',
      items: [
        { icon: '🤝', label: 'Become a partner', onPress: () => router.push('/(traveller)/partner-apply') },
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

        {/* Avatar upload toast */}
        {!!avatarToast && (
          <View style={[styles.toast, avatarToast.ok ? styles.toastOk : styles.toastErr]}>
            <Text style={styles.toastText}>{avatarToast.ok ? '✅' : '⚠️'} {avatarToast.msg}</Text>
          </View>
        )}

        {/* Profile row */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.profileRow}
            activeOpacity={0.85}
            onPress={uploadingAvatar ? undefined : pickImage}
            // @ts-ignore
            onClick={uploadingAvatar ? undefined : pickImage}
            disabled={uploadingAvatar}
          >
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
              )}
              {uploadingAvatar ? (
                <View style={styles.avatarUploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditText}>📷</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.profileName}>{displayName}</Text>
                {verificationStatus === 'approved' && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
                  </View>
                )}
                {verificationStatus === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>⏳ Pending</Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileEmail}>{email}</Text>
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
              <Text style={styles.infoValue}>{email}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#F0EAEA' }]}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Become a Host banner — only shown to non-hosts */}
        {!isHostApproved && <TouchableOpacity
          style={styles.becomeHostCard}
          onPress={() => router.push('/(traveller)/partner-apply')}
          // @ts-ignore
          onClick={() => router.push('/(traveller)/partner-apply')}
          activeOpacity={0.85}
        >
          <Text style={styles.becomeHostEmoji}>🏠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.becomeHostTitle}>Become a Cubby Host</Text>
            <Text style={styles.becomeHostSub}>Earn money storing bags →</Text>
          </View>
          <Text style={styles.becomeHostArrow}>›</Text>
        </TouchableOpacity>}

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
        {confirmSignOut ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FEF2F2', marginHorizontal: 20, borderRadius: 14, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Sure you want to sign out?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* @ts-ignore */}
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: 10, padding: 12, alignItems: 'center' }} onPress={doSignOut} onClick={doSignOut}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Sign out</Text>
              </TouchableOpacity>
              {/* @ts-ignore */}
              <TouchableOpacity style={{ flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }} onPress={() => setConfirmSignOut(false)} onClick={() => setConfirmSignOut(false)}>
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}
            // @ts-ignore
            onClick={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
        {confirmDelete ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FEF2F2', marginHorizontal: 20, borderRadius: 14, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Delete account? This cannot be undone.</Text>
            {!!deleteError && <Text style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 8 }}>{deleteError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* @ts-ignore */}
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: 10, padding: 12, alignItems: 'center', opacity: deletingAccount ? 0.6 : 1 }} onPress={doDeleteAccount} onClick={doDeleteAccount} disabled={deletingAccount}>
                <Text style={{ color: 'white', fontWeight: '700' }}>{deletingAccount ? 'Deleting…' : 'Yes, delete'}</Text>
              </TouchableOpacity>
              {/* @ts-ignore */}
              <TouchableOpacity style={{ flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }} onPress={() => setConfirmDelete(false)} onClick={() => setConfirmDelete(false)}>
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount}
            // @ts-ignore
            onClick={handleDeleteAccount}>
            <Text style={styles.deleteText}>Delete account</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.replace('/(admin)/login')}
          // @ts-ignore
          onClick={() => router.replace('/(admin)/login')}>
          <Text style={{ color: 'rgba(0,0,0,0.08)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>v1.0.0</Text>
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
              <TouchableOpacity style={[styles.modalSaveBtn, savingProfile && { opacity: 0.6 }]} onPress={handleSave}
                // @ts-ignore
                onClick={handleSave} disabled={savingProfile}>
                <Text style={styles.modalSaveBtnText}>{savingProfile ? 'Saving…' : 'Save'}</Text>
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
                <Text style={styles.lockedInputText}>{email}</Text>
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
  avatarUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toast
  toast: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastOk: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7' },
  toastErr: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  toastText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  verifiedBadge: { backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  pendingBadge: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
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
