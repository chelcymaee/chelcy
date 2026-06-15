import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const MENU_ITEMS = [
  { icon: '📋', label: 'My bookings', onPress: () => {} },
  { icon: '⭐', label: 'My reviews', onPress: () => {} },
  { icon: '💳', label: 'Payment methods', onPress: () => {} },
  { icon: '🔔', label: 'Notifications', onPress: () => {} },
  { icon: '🏠', label: 'Become a Cubby host', onPress: () => {}, highlight: true },
  { icon: '🛡️', label: 'Safety & trust', onPress: () => {} },
  { icon: '❓', label: 'Help & support', onPress: () => {} },
];

export default function Profile() {
  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Profile</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Demo User</Text>
            <Text style={styles.profileEmail}>demo@cubby.app</Text>
            <View style={styles.verifiedRow}>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>1</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Reviews left</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>R160</Text>
            <Text style={styles.statLabel}>Total spent</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuItem, item.highlight && styles.menuItemHighlight]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.highlight && styles.menuLabelHighlight]}>
                {item.label}
              </Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 30 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  verifiedRow: { marginTop: 6 },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  editBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  menu: { marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemHighlight: { backgroundColor: '#EFF9F5' },
  menuIcon: { fontSize: 22, width: 28 },
  menuLabel: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  menuLabelHighlight: { color: Colors.primary, fontWeight: '700' },
  menuArrow: { fontSize: 20, color: Colors.textLight },
  signOutBtn: {
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.error },
  version: { textAlign: 'center', color: Colors.textLight, fontSize: 12, marginBottom: 8 },
});
