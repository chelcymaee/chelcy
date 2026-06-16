import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const FAQS = [
  { q: 'How does Cubby work?', a: 'Find a nearby host, book a time slot, drop your bags, and pick them up when you\'re ready. It\'s that simple.' },
  { q: 'Is my luggage insured?', a: 'All bookings include basic coverage up to R2,000 per bag. For higher-value items, we recommend travel insurance.' },
  { q: 'What if I\'m late for pick-up?', a: 'Message your host in-app as soon as possible. Hosts are usually flexible, but extended storage may incur additional charges.' },
  { q: 'Can I cancel a booking?', a: 'Free cancellation up to 1 hour before drop-off. After that, a 50% cancellation fee applies.' },
  { q: 'How do I become a host?', a: 'Tap "Become a Cubby host" in your profile, set up your listing, add your bank details, and start earning.' },
  { q: 'How long does verification take?', a: 'Identity verification usually takes 24–48 hours. You\'ll get a notification once approved.' },
];

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  function sendMessage() {
    if (!subject || !message) {
      Alert.alert('Please fill in both fields');
      return;
    }
    Alert.alert('Message sent!', 'Our support team will get back to you within 24 hours.', [
      { text: 'OK', onPress: () => { setSubject(''); setMessage(''); } }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Help & Support</Text>
        </View>

        {/* Quick contact */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => Linking.openURL('mailto:hello@cubby.app')}>
            <Text style={styles.quickEmoji}>📧</Text>
            <Text style={styles.quickLabel}>Email us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => Linking.openURL('https://wa.me/27000000000')}>
            <Text style={styles.quickEmoji}>💬</Text>
            <Text style={styles.quickLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => Linking.openURL('tel:+27000000000')}>
            <Text style={styles.quickEmoji}>📞</Text>
            <Text style={styles.quickLabel}>Call us</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently asked questions</Text>
        <View style={styles.faqList}>
          {FAQS.map((faq, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.faqItem, idx === FAQS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setOpenFaq(openFaq === idx ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQ}>{faq.q}</Text>
                <Text style={styles.faqArrow}>{openFaq === idx ? '↑' : '↓'}</Text>
              </View>
              {openFaq === idx && <Text style={styles.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact form */}
        <Text style={styles.sectionTitle}>Send us a message</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Subject</Text>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="What can we help with?" placeholderTextColor={Colors.textLight} />
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue or question…"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={5}
          />
          <TouchableOpacity style={styles.btn} onPress={sendMessage}>
            <Text style={styles.btnText}>Send message</Text>
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
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  quickRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  quickBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  faqList: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  faqItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  faqArrow: { fontSize: 16, color: Colors.textSecondary },
  faqA: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 10 },
  formCard: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textPrimary,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
