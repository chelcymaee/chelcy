import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Linking, Platform, Modal, Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const SUPPORT_EMAIL = 'hello@mycubby.co.za';
const CUBBY_WHATSAPP_NUMBER = '27000000000'; // TODO: replace with real number
const CUBBY_SUPPORT_PHONE = '+27000000000';  // TODO: replace with real number

const FAQS = [
  { q: 'How does Cubby work?', a: "Find a nearby host, book a time slot, drop your bags, and pick them up when you're ready. It's that simple." },
  { q: 'Is my luggage insured?', a: 'All bookings include basic coverage up to R2,000 per bag. For higher-value items, we recommend travel insurance.' },
  { q: "What if I'm late for pick-up?", a: 'Message your host in-app as soon as possible. Hosts are usually flexible, but extended storage may incur additional charges.' },
  { q: 'Can I cancel a booking?', a: 'Free cancellation up to 1 hour before drop-off. After that, a 50% cancellation fee applies.' },
  { q: 'How do I become a host?', a: 'Tap "Become a Cubby host" in your profile, set up your listing, add your bank details, and start earning.' },
  { q: 'How long does verification take?', a: 'Identity verification usually takes 24–48 hours. You\'ll get a notification once approved.' },
];

function openLink(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

function buildMailto(subject: string, body: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingMailto, setPendingMailto] = useState('');
  const [copied, setCopied] = useState(false);

  function handleEmailUs() {
    const url = buildMailto('Cubby Support Request', `Hi Cubby team,\n\nI need help with:\n\n`);
    if (Platform.OS === 'web') {
      setPendingMailto(url);
      setShowModal(true);
    } else {
      Linking.openURL(url).catch(() => {
        setPendingMailto(url);
        setShowModal(true);
      });
    }
  }

  function handleSendForm() {
    setFormError('');
    if (!subject.trim() || !message.trim()) {
      setFormError('Please fill in both fields.');
      return;
    }
    const body = `Hi Cubby team,\n\nI need help with:\n\n${message.trim()}`;
    const url = buildMailto(subject.trim(), body);
    if (Platform.OS === 'web') {
      setPendingMailto(url);
      setShowModal(true);
    } else {
      Linking.openURL(url).catch(() => {
        setPendingMailto(url);
        setShowModal(true);
      });
    }
    setSubject('');
    setMessage('');
  }

  function handleWhatsApp() {
    openLink(`https://wa.me/${CUBBY_WHATSAPP_NUMBER}`);
  }

  function handleCall() {
    if (Platform.OS === 'web') {
      openLink(`tel:${CUBBY_SUPPORT_PHONE}`);
    } else {
      Linking.openURL(`tel:${CUBBY_SUPPORT_PHONE}`).catch(() => {});
    }
  }

  function copyEmail() {
    Clipboard.setString(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(traveller)/profile')}
            // @ts-ignore
            onClick={() => router.replace('/(traveller)/profile')}
          >
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Help & Support</Text>
        </View>

        {/* Quick contact */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={handleEmailUs}
            // @ts-ignore
            onClick={handleEmailUs}
          >
            <Text style={styles.quickEmoji}>📧</Text>
            <Text style={styles.quickLabel}>Email us</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={handleWhatsApp}
            // @ts-ignore
            onClick={handleWhatsApp}
          >
            <Text style={styles.quickEmoji}>💬</Text>
            <Text style={styles.quickLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={handleCall}
            // @ts-ignore
            onClick={handleCall}
          >
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
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="What can we help with?"
            placeholderTextColor={Colors.textLight}
          />
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
          {!!formError && <Text style={styles.errorText}>{formError}</Text>}
          <TouchableOpacity
            style={styles.btn}
            onPress={handleSendForm}
            // @ts-ignore
            onClick={handleSendForm}
          >
            <Text style={styles.btnText}>Send message</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Contact modal — shown on web or when email app fails */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
          // @ts-ignore
          onClick={() => setShowModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Contact Support</Text>
            <Text style={styles.modalSub}>Reach us at</Text>
            <Text style={styles.modalEmail}>{SUPPORT_EMAIL}</Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={copyEmail}
              // @ts-ignore
              onClick={copyEmail}
            >
              <Text style={styles.modalBtnText}>{copied ? '✓ Copied!' : '📋 Copy email address'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => { openLink(pendingMailto); setShowModal(false); }}
              // @ts-ignore
              onClick={() => { openLink(pendingMailto); setShowModal(false); }}
            >
              <Text style={styles.modalBtnText}>📧 Open email app</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleWhatsApp}
              // @ts-ignore
              onClick={handleWhatsApp}
            >
              <Text style={styles.modalBtnText}>💬 Message on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => setShowModal(false)}
              // @ts-ignore
              onClick={() => setShowModal(false)}
            >
              <Text style={styles.modalBtnSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  quickRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  quickBtn: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6 },
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
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  textArea: { height: 120, textAlignVertical: 'top' },
  errorText: { color: '#DC2626', fontWeight: '600', marginTop: 8, fontSize: 13 },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, gap: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  modalEmail: { fontSize: 16, fontWeight: '700', color: Colors.primary, textAlign: 'center', marginBottom: 4 },
  modalBtn: { backgroundColor: Colors.background, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalBtnSecondary: { backgroundColor: Colors.primary, borderColor: Colors.primary, marginTop: 4 },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
