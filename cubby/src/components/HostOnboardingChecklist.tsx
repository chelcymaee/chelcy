import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const STEPS = [
  'Apply to become a host',
  'Await approval',
  'Complete verification',
  'Add bank details',
  'Listing goes live',
];

// Shown to a signed-up host/both-role user until Cubby admin approves them
// and assigns a hosts row (assigned_user_id) to their account.
export default function HostOnboardingChecklist({ isApproved }: { isApproved: boolean }) {
  const currentIndex = isApproved ? 2 : 1;

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>🕒</Text>
      <Text style={styles.title}>
        {isApproved ? "You're approved!" : 'Host application pending'}
      </Text>
      <Text style={styles.body}>
        {isApproved
          ? "Cubby is finishing setting up your listing. We'll let you know as soon as it's ready to go live."
          : 'Cubby reviews and approves every host before their listing goes live. This keeps storage safe and trustworthy for travellers.'}
      </Text>

      <View style={styles.steps}>
        {STEPS.map((label, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <View key={label} style={styles.step}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, (done || active) && styles.stepDotTextActive]}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  steps: { width: '100%', gap: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: Colors.success },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotText: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary },
  stepDotTextActive: { color: Colors.white },
  stepLabel: { fontSize: 14, color: Colors.textLight, fontWeight: '600' },
  stepLabelActive: { color: Colors.textPrimary },
});
