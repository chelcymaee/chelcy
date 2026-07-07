import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors } from '../../src/constants/colors';

export default function RunnerDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Runner Dashboard</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🚗</Text>
        <Text style={styles.emptyText}>Bag Runners is coming soon</Text>
        <Text style={styles.emptySub}>
          We're building a network of trusted drivers who can pick up and deliver bags on demand. Check back soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
