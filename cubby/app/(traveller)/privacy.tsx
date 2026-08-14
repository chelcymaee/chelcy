import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const LAST_UPDATED = '14 August 2026';

const SECTIONS: { heading: string; paragraphs?: string[]; bullets?: string[] }[] = [
  {
    heading: 'Overview',
    paragraphs: [
      'Cubby ("we", "us", "our") respects your privacy. This Privacy Policy explains what personal information we collect, how we use it, and your rights under South Africa’s Protection of Personal Information Act (POPIA).',
    ],
  },
  {
    heading: '1. Information We Collect',
    bullets: [
      'Account information: full name, email address, phone number, password (encrypted).',
      'Profile information: photo, role (traveller / host / bag runner), bio.',
      'Verification data: ID document photo and selfie photo, for users who choose to verify.',
      'Booking data: booking times, locations, bag counts, PIN codes, and messages between users.',
      'Payment data: processed directly by PayGate — Cubby does not receive or store your card number.',
      'Location data: only when you grant location permission, to show nearby hosts.',
      'Location search data: when you search for an address or area, your search text is sent to Google Places to return matching suggestions.',
      'Host bank details: used only to pay out host earnings.',
      'Device / push notification tokens: used to deliver booking and message notifications.',
      'Diagnostic data: automatic crash and error reports collected via Sentry to help us find and fix bugs.',
    ],
  },
  {
    heading: '2. How We Use Your Information',
    bullets: [
      'To operate bookings, payments and messaging between Travellers and Hosts.',
      'To verify user identity and improve platform trust and safety.',
      'To send transactional notifications (booking confirmed, message received, etc.) via in-app notifications, push notifications and email.',
      'To respond to support requests.',
      'To detect and prevent fraud or abuse of the platform.',
    ],
  },
  {
    heading: '3. Who We Share Data With',
    paragraphs: [
      'We do not sell your personal information to third parties. We share data only with the service providers needed to run Cubby, and where required by law or to protect the safety of our users.',
    ],
    bullets: [
      'Supabase — our database and authentication provider, stores your account and booking data securely.',
      'PayGate — processes payments and receives only the data required to complete a transaction.',
      'Resend — our email delivery provider, used to send transactional emails.',
      'Google — receives location search queries (via Google Places) and displays map data to show nearby hosts.',
      'Sentry — receives automatic crash and error diagnostic reports to help us identify and fix bugs.',
    ],
  },
  {
    heading: '4. Data Retention',
    paragraphs: [
      'We retain your data for as long as your account is active. If you delete your account, your profile and personal data are removed; some booking records may be retained where required for legal, financial or dispute-resolution purposes.',
    ],
  },
  {
    heading: '5. Your Rights',
    paragraphs: [
      'Under POPIA, you have the right to:',
    ],
    bullets: [
      'Access the personal information we hold about you.',
      'Request correction of inaccurate information.',
      'Request deletion of your account and associated personal data — available directly from Profile → Delete Account.',
      'Object to certain processing of your data.',
    ],
  },
  {
    heading: '6. Security',
    paragraphs: [
      'We use industry-standard measures — encrypted storage, row-level security, and secure payment processing — to protect your data. No system is 100% secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    heading: '7. Children',
    paragraphs: [
      'Cubby is not intended for use by anyone under 18. We do not knowingly collect data from children.',
    ],
  },
  {
    heading: '8. Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. Material changes will be reflected by an updated "Last updated" date at the top of this page.',
    ],
  },
  {
    heading: '9. Contact',
    paragraphs: [
      'Questions about this Privacy Policy or your data? Contact us at hello@mycubby.co.za or call +27 77 460 9484.',
    ],
  },
];

export default function Privacy() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}
            // @ts-ignore
            onClick={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        <View style={styles.body}>
          {SECTIONS.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              {section.paragraphs?.map((p, i) => (
                <Text key={i} style={styles.paragraph}>{p}</Text>
              ))}
              {section.bullets?.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
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
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  updated: { fontSize: 13, color: Colors.textLight },
  body: { paddingHorizontal: 20 },
  section: { marginBottom: 22 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  paragraph: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6, paddingRight: 4 },
  bulletDot: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  bulletText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
});
