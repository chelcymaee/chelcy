import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function HostMap({ filtered }: { filtered: any[] }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>Map view available on mobile</Text>
      <Text style={styles.sub}>Download the Cubby app to see {filtered.length} hosts on a live map of Cape Town</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
