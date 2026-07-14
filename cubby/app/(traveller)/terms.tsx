import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const LAST_UPDATED = '6 July 2026';

const SECTIONS: { heading: string; paragraphs?: string[]; bullets?: string[] }[] = [
  {
    heading: '1. Acceptance of these Terms',
    paragraphs: [
      'Cubby ("Cubby", "we", "us", "our") is a peer-to-peer luggage storage marketplace, currently operated as a trading name pending formal company registration [COMPANY NAME]. By creating an account or using the Cubby app, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use Cubby.',
    ],
  },
  {
    heading: '2. What Cubby Is',
    paragraphs: [
      'Cubby connects Travellers who need short-term luggage storage with Hosts who offer storage space at cafés, hotels, guesthouses and other locations, and — where available — Bag Runners who collect and deliver bags.',
      'Cubby is a marketplace platform. Hosts and Bag Runners are independent third parties, not Cubby employees. Cubby does not itself store, handle or take custody of any luggage.',
    ],
  },
  {
    heading: '3. Eligibility',
    paragraphs: [
      'You must be at least 18 years old to create a Cubby account. Hosts must provide accurate business and location details and complete Cubby’s identity verification process before accepting bookings.',
    ],
  },
  {
    heading: '4. Bookings & Payments',
    bullets: [
      'All bookings and payments are made through the Cubby app.',
      'Payments are processed by PayFast, a licensed South African payment processor. Cubby does not receive or store your card details.',
      'A platform service fee (currently 10%) is added to the host’s listed price at checkout.',
      'Hosts receive their share of the booking value (currently a 70/30 split) after the booking is marked complete.',
    ],
  },
  {
    heading: '5. Cancellations',
    bullets: [
      'Free cancellation up to 1 hour before the scheduled drop-off time.',
      'Cancellations within 1 hour of drop-off may incur a cancellation fee of up to 50% of the booking value.',
      'Cubby may update this policy from time to time. The policy in force at the time of your booking applies to that booking.',
    ],
  },
  {
    heading: '6. Your Responsibilities',
    bullets: [
      'Declare an accurate number and type of bags when you make a booking.',
      'Do not store illegal items, weapons, flammable or hazardous materials, perishable goods, or any item prohibited by law.',
      'Cubby and Hosts reserve the right to refuse storage of any item that appears to violate this policy.',
      'You remain responsible for the contents of your own luggage at all times.',
    ],
  },
  {
    heading: '7. Verification',
    paragraphs: [
      'Cubby may ask Hosts and Travellers to verify their identity (for example, an ID document and a selfie photo) to improve trust and safety on the platform. Verification does not guarantee the conduct of any user, and Cubby is not liable for the actions of verified or unverified users.',
    ],
  },
  {
    heading: '8. Reviews & Conduct',
    paragraphs: [
      'Users may leave reviews of one another after a completed booking. Reviews must be honest and based on genuine experience. Cubby may remove reviews that are abusive, fraudulent, or that otherwise violate these Terms.',
    ],
  },
  {
    heading: '9. Luggage Coverage',
    paragraphs: [
      'Cubby does not currently provide insurance or a guaranteed compensation scheme for lost, damaged or stolen luggage. We strongly recommend that travellers obtain independent travel insurance covering their belongings while stored with a host. Any coverage or claims process introduced in future will be described separately and will not apply retroactively.',
    ],
  },
  {
    heading: '10. Platform Role & Limitation of Liability',
    paragraphs: [
      'Cubby acts solely as an intermediary connecting Travellers, Hosts and Bag Runners. To the maximum extent permitted by law, Cubby is not liable for any loss, theft, damage, delay, injury or dispute arising between Travellers, Hosts or Bag Runners. Use of the platform is at your own risk.',
    ],
  },
  {
    heading: '11. Account Suspension & Termination',
    paragraphs: [
      'Cubby may suspend or terminate an account that violates these Terms, receives repeated negative reviews, or engages in fraudulent or unsafe behaviour. You may delete your own account at any time from Profile → Delete Account.',
    ],
  },
  {
    heading: '12. Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. Continued use of Cubby after changes take effect means you accept the updated Terms.',
    ],
  },
  {
    heading: '13. Governing Law',
    paragraphs: [
      'These Terms are governed by the laws of the Republic of South Africa.',
    ],
  },
  {
    heading: '14. Contact',
    paragraphs: [
      'Questions about these Terms? Contact us at hello@mycubby.co.za.',
    ],
  },
];

export default function Terms() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}
            // @ts-ignore
            onClick={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Terms of Service</Text>
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
