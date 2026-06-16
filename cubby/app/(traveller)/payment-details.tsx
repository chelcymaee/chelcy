import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function PaymentDetails() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  function formatCardNumber(text: string) {
    const cleaned = text.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : cleaned);
  }

  function formatExpiry(text: string) {
    const cleaned = text.replace('/', '');
    if (cleaned.length >= 2) {
      setExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
    } else {
      setExpiry(cleaned);
    }
  }

  function handleSave() {
    if (!cardNumber || !expiry || !cvv || !cardHolder) {
      Alert.alert('Please fill in all card details');
      return;
    }
    Alert.alert('Card saved!', 'Your card has been added securely.', [
      { text: 'OK', onPress: () => router.replace('/(traveller)/explore') },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity style={styles.skip} onPress={() => router.replace('/(traveller)/explore')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.emoji}>💳</Text>
        <Text style={styles.heading}>Add payment card</Text>
        <Text style={styles.sub}>Your card is charged when a booking is confirmed. Secured via PayFast.</Text>

        <View style={styles.cardPreview}>
          <Text style={styles.cardPreviewNumber}>{cardNumber || '•••• •••• •••• ••••'}</Text>
          <View style={styles.cardPreviewBottom}>
            <Text style={styles.cardPreviewLabel}>{cardHolder || 'CARDHOLDER NAME'}</Text>
            <Text style={styles.cardPreviewExpiry}>{expiry || 'MM/YY'}</Text>
          </View>
        </View>

        <Text style={styles.label}>Cardholder name</Text>
        <TextInput style={styles.input} value={cardHolder} onChangeText={setCardHolder} placeholder="As it appears on your card" placeholderTextColor={Colors.textLight} autoCapitalize="characters" />

        <Text style={styles.label}>Card number</Text>
        <TextInput style={styles.input} value={cardNumber} onChangeText={formatCardNumber} placeholder="1234 5678 9012 3456" placeholderTextColor={Colors.textLight} keyboardType="numeric" maxLength={19} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Expiry</Text>
            <TextInput style={styles.input} value={expiry} onChangeText={formatExpiry} placeholder="MM/YY" placeholderTextColor={Colors.textLight} keyboardType="numeric" maxLength={5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CVV</Text>
            <TextInput style={styles.input} value={cvv} onChangeText={setCvv} placeholder="•••" placeholderTextColor={Colors.textLight} keyboardType="numeric" maxLength={4} secureTextEntry />
          </View>
        </View>

        <View style={styles.secureNote}>
          <Text style={styles.secureIcon}>🔒</Text>
          <Text style={styles.secureText}>Your card details are encrypted and never stored on Cubby servers. Payments processed securely via PayFast.</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.btnText}>Save card & continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 20 },
  skip: { alignSelf: 'flex-end', marginBottom: 8 },
  skipText: { color: Colors.textSecondary, fontSize: 14 },
  emoji: { fontSize: 48, marginBottom: 12 },
  heading: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 28 },
  cardPreview: { backgroundColor: Colors.primary, borderRadius: 20, padding: 24, marginBottom: 28, height: 140, justifyContent: 'space-between' },
  cardPreviewNumber: { fontSize: 20, fontWeight: '700', color: Colors.white, letterSpacing: 2 },
  cardPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  cardPreviewExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  row: { flexDirection: 'row', gap: 12 },
  secureNote: { flexDirection: 'row', gap: 10, backgroundColor: '#F0FFF4', borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 24 },
  secureIcon: { fontSize: 18 },
  secureText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
