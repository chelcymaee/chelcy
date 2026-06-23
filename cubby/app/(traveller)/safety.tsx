import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const SECTIONS = [
  {
    title: 'How Cubby keeps you safe',
    items: [
      { emoji: '✅', title: 'Verified hosts', desc: 'Every host goes through ID verification before they can list on Cubby.' },
      { emoji: '🔒', title: 'Secure payments', desc: 'Payments are held securely via PayFast and only released after successful pickup.' },
      { emoji: '⭐', title: 'Review system', desc: 'Every booking can be reviewed. Low-rated hosts are removed from the platform.' },
      { emoji: '📍', title: 'Location verified', desc: 'Host addresses are verified during onboarding.' },
      { emoji: '💬', title: 'In-app messaging', desc: 'All communication stays inside Cubby. Never share personal contact details.' },
    ],
  },
  {
    title: 'Your responsibilities',
    items: [
      { emoji: '🧳', title: 'Declare your bags', desc: 'Always declare the correct number and type of bags when booking.' },
      { emoji: '🚫', title: 'Prohibited items', desc: 'Do not store illegal items, weapons, perishables, or hazardous materials.' },
      { emoji: '📸', title: 'Photo your bags', desc: 'Take a photo of your bags before drop-off as evidence if needed.' },
    ],
  },
];

export default function Safety() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(traveller)/profile')}
            // @ts-ignore
            onClick={() => router.replace('/(traveller)/profile')}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Safety & Trust</Text>
          <Text style={styles.sub}>Cubby is built on trust. Here's how we protect everyone on the platform.</Text>
        </View>

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <View key={idx} style={[styles.item, idx === section.items.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>🚨 Emergency?</Text>
          <Text style={styles.emergencyText}>If you feel unsafe or something has gone wrong, contact us immediately.</Text>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => Linking.openURL('mailto:safety@cubby.app')}>
            <Text style={styles.emergencyBtnText}>Contact safety team</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 8, marginTop: 16 },
  card: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  item: { flexDirection: 'row', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemEmoji: { fontSize: 24, width: 32 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  itemDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  emergencyCard: { backgroundColor: '#FFF1F1', marginHorizontal: 20, borderRadius: 18, padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#FFD0D0' },
  emergencyTitle: { fontSize: 18, fontWeight: '800', color: Colors.error, marginBottom: 6 },
  emergencyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  emergencyBtn: { backgroundColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  emergencyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
