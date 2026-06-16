import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../src/constants/colors';

const { width } = Dimensions.get('window');

export default function Welcome() {
  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🧳</Text>
        </View>
        <Text style={styles.logoText}>cubby</Text>
        <Text style={styles.tagline}>Drop your bags.{'\n'}Own your day.</Text>
      </View>

      <View style={styles.pillsRow}>
        <View style={styles.pill}><Text style={styles.pillText}>☕ Cafés</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🏠 Homes</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🚗 Runners</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🛍️ Shops</Text></View>
      </View>

      <View style={styles.ctas}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Get started — it's free</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.location}>📍 Cape Town, South Africa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'space-between', paddingTop: 100, paddingBottom: 50, paddingHorizontal: 24 },
  topSection: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
  logoIcon: { fontSize: 40 },
  logoText: { fontSize: 48, fontWeight: '900', color: Colors.white, letterSpacing: -2 },
  tagline: { fontSize: 20, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 12, lineHeight: 28, fontWeight: '500' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  pillText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  ctas: { width: '100%', gap: 12 },
  btnPrimary: { backgroundColor: Colors.white, borderRadius: 18, paddingVertical: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  btnPrimaryText: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  btnSecondary: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  btnSecondaryText: { fontSize: 17, fontWeight: '600', color: Colors.white },
  location: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
});
