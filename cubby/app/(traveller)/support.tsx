import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Linking, Platform, Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import Btn from '../../src/components/Btn';

const SUPPORT_EMAIL = 'hello@mycubby.co.za';
const CUBBY_WHATSAPP_NUMBER = '27774609484';
const CUBBY_SUPPORT_PHONE = '+27 77 460 9484';

const FAQS = [
  { q: 'How does Cubby work?', a: "Find a nearby host, book a time slot, drop your bags, and pick them up when you're ready. It's that simple." },
  { q: 'Is my luggage insured?', a: "Cubby doesn't currently provide built-in luggage insurance. All hosts are ID-verified, and we recommend travel insurance for valuable items." },
  { q: "What if I'm late for pick-up?", a: 'Message your host in-app as soon as possible. Hosts are usually flexible, but extended storage may incur additional charges.' },
  { q: 'Can I cancel a booking?', a: 'Free cancellation up to 1 hour before drop-off. After that, a 50% cancellation fee applies.' },
  { q: 'How do I become a host?', a: 'Tap "Become a Cubby host" in your profile, set up your listing, add your bank details, and start earning.' },
  { q: 'How long does verification take?', a: "Identity verification usually takes 24–48 hours. You'll get a notification once approved." },
];

function openLink(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sendError, setSendError] = useState('');
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successY = useRef(new Animated.Value(24)).current;
  const successScale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!success) return;
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(successY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }),
    ]).start();
  }, [success]);

  // FAT-004: "How it works", "FAQ", and "Contact support" (profile.tsx) all
  // correctly route here — there's no separate screen for any of them, FAQ
  // content already lives below as an accordion. The bug was this screen
  // itself: success never reset after a prior submission, so any later
  // visit from any of those three entry points showed the frozen "Message
  // sent!" view instead of the form/FAQ. Resetting on focus, same pattern
  // already used elsewhere in this app (e.g. (host)/messages.tsx).
  useFocusEffect(useCallback(() => { setSuccess(false); }, []));

  async function handleSend() {
    // FAT-005: Btn's TouchableOpacity wires the same handler to both
    // onPress and onClick (see src/components/Btn.tsx) — on web this can
    // invoke handleSend twice for a single tap, and nothing here stopped
    // a second concurrent call from also validating and inserting.
    // Guarding locally rather than touching the shared component.
    if (sending) return;

    let valid = true;
    setSubjectError('');
    setMessageError('');
    setSendError('');

    if (!subject.trim()) { setSubjectError('Please enter a subject.'); valid = false; }
    if (!message.trim()) { setMessageError('Please enter a message.'); valid = false; }
    if (!valid) return;

    setSending(true);
    try {
      let userEmail: string | null = null;
      let userId: string | null = null;

      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
        userEmail = user?.email ?? null;

        const { error } = await supabase.from('support_messages').insert({
          user_id: userId,
          user_email: userEmail,
          subject: subject.trim(),
          message: message.trim(),
          status: 'pending',
        });

        if (error) throw error;
      }

      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch {
      setSendError('Something went wrong. Please try again or email us directly.');
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
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
        <Animated.View style={[styles.successContainer, { opacity: successOpacity, transform: [{ translateY: successY }] }]}>
          <Animated.Text style={[styles.successEmoji, { transform: [{ scale: successScale }] }]}>✅</Animated.Text>
          <Text style={styles.successTitle}>Message sent!</Text>
          <Text style={styles.successText}>
            We've received your message and will get back to you at your registered email address within 24–48 hours.
          </Text>
          <Btn label="Send another message" onPress={() => setSuccess(false)} variant="secondary" style={styles.successBtn} />
          <Btn label="Back to profile" onPress={() => router.replace('/(traveller)/profile')} style={styles.backProfileBtn} />
        </Animated.View>
      </SafeAreaView>
    );
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

        {/* Send us a message — primary flow */}
        <Text style={styles.sectionTitle}>Send us a message</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={[styles.input, !!subjectError && styles.inputError]}
            value={subject}
            onChangeText={t => { setSubject(t); setSubjectError(''); }}
            placeholder="What can we help with?"
            placeholderTextColor={Colors.textLight}
          />
          {!!subjectError && <Text style={styles.fieldError}>{subjectError}</Text>}

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea, !!messageError && styles.inputError]}
            value={message}
            onChangeText={t => { setMessage(t); setMessageError(''); }}
            placeholder="Describe your issue or question…"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={5}
          />
          {!!messageError && <Text style={styles.fieldError}>{messageError}</Text>}

          {!!sendError && <Text style={styles.sendError}>{sendError}</Text>}

          <Btn label={sending ? 'Sending…' : 'Send message'} onPress={handleSend} loading={sending} style={styles.btn} />
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

        {/* Other ways to reach us */}
        <Text style={styles.sectionTitle}>Other ways to reach us</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
            // @ts-ignore
            onClick={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
          >
            <Text style={styles.contactIcon}>📧</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.contactDivider} />

          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => openLink(`https://wa.me/${CUBBY_WHATSAPP_NUMBER}`)}
            // @ts-ignore
            onClick={() => openLink(`https://wa.me/${CUBBY_WHATSAPP_NUMBER}`)}
          >
            <Text style={styles.contactIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>Message us on WhatsApp</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.contactDivider} />

          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => openLink(`tel:${CUBBY_SUPPORT_PHONE}`)}
            // @ts-ignore
            onClick={() => openLink(`tel:${CUBBY_SUPPORT_PHONE}`)}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Call us</Text>
              <Text style={styles.contactValue}>{CUBBY_SUPPORT_PHONE}</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  formCard: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  inputError: { borderColor: Colors.error },
  textArea: { height: 120, textAlignVertical: 'top' },
  fieldError: { fontSize: 12, color: Colors.error, fontWeight: '600', marginTop: 4 },
  sendError: { fontSize: 13, color: Colors.error, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  btn: { marginTop: 16 },
  faqList: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  faqItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  faqArrow: { fontSize: 16, color: Colors.textSecondary },
  faqA: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 10 },
  contactCard: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  contactIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  contactLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  contactValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500', marginTop: 1 },
  contactArrow: { fontSize: 16, color: Colors.textLight },
  contactDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 60 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successBtn: { marginBottom: 12 },
  backProfileBtn: {},
});
