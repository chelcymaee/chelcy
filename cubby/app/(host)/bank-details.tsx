import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const STORAGE_KEY = 'cubby_bank_details';

const BANKS = ['Capitec', 'FNB', 'Standard Bank', 'Absa', 'Nedbank', 'TymeBank', 'Discovery Bank', 'African Bank'];
const ACCOUNT_TYPES = ['Cheque / Current', 'Savings'];

const BRANCH_CODES: Record<string, string> = {
  'Capitec': '470010', 'FNB': '250655', 'Standard Bank': '051001',
  'Absa': '632005', 'Nedbank': '198765', 'TymeBank': '678910',
  'Discovery Bank': '679000', 'African Bank': '430000',
};

export default function BankDetails() {
  const [bank, setBank] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountType, setAccountType] = useState('Cheque / Current');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) {
        const d = JSON.parse(data);
        setBank(d.bank ?? '');
        setAccountHolder(d.accountHolder ?? '');
        setAccountNumber(d.accountNumber ?? '');
        setBranchCode(d.branchCode ?? '');
        setAccountType(d.accountType ?? 'Cheque / Current');
        setSaved(true);
      }
    });
  }, []);

  function selectBank(b: string) {
    setBank(b);
    setBranchCode(BRANCH_CODES[b] || '');
  }

  async function handleSave() {
    if (!bank || !accountHolder || !accountNumber) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ bank, accountHolder, accountNumber, branchCode, accountType }));
    setSaved(true);
    Alert.alert('Bank details saved!', "You'll receive payouts within 2 business days of each completed booking.", [
      { text: 'OK', onPress: () => router.replace('/(host)/dashboard') },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity style={styles.skip} onPress={() => router.replace('/(host)/dashboard')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.emoji}>🏦</Text>
        <Text style={styles.heading}>{saved ? 'Edit bank account' : 'Add bank account'}</Text>
        {saved && (
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>✅ Bank details on file</Text>
          </View>
        )}
        <Text style={styles.sub}>We'll pay your earnings directly into this account within 2 business days.</Text>

        <Text style={styles.label}>Select your bank</Text>
        <View style={styles.bankGrid}>
          {BANKS.map(b => (
            <TouchableOpacity key={b} style={[styles.bankChip, bank === b && styles.bankChipActive]} onPress={() => selectBank(b)}>
              <Text style={[styles.bankChipText, bank === b && styles.bankChipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Account holder name</Text>
        <TextInput style={styles.input} value={accountHolder} onChangeText={setAccountHolder} placeholder="Full name as per bank account" placeholderTextColor={Colors.textLight} autoCapitalize="words" />

        <Text style={styles.label}>Account number</Text>
        <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} placeholder="Your account number" placeholderTextColor={Colors.textLight} keyboardType="numeric" />

        <Text style={styles.label}>Branch code</Text>
        <TextInput style={styles.input} value={branchCode} onChangeText={setBranchCode} placeholder="Auto-filled when you select a bank" placeholderTextColor={Colors.textLight} keyboardType="numeric" />

        <Text style={styles.label}>Account type</Text>
        <View style={styles.typeRow}>
          {ACCOUNT_TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.typeChip, accountType === t && styles.typeChipActive]} onPress={() => setAccountType(t)}>
              <Text style={[styles.typeText, accountType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.payoutNote}>
          <Text style={styles.payoutIcon}>💰</Text>
          <Text style={styles.payoutText}>Cubby takes a 15% platform fee. The remaining 85% is paid to you after each completed booking.</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.btnText}>Save bank details</Text>
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
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 12 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  bankChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  bankChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bankChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  bankChipTextActive: { color: Colors.white },
  input: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeChip: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeTextActive: { color: Colors.white },
  payoutNote: { flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 24 },
  payoutIcon: { fontSize: 18 },
  payoutText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  savedBadge: { backgroundColor: '#F0FFF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: Colors.success },
  savedBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.success },
});
