import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const SA_BANKS = [
  'Absa', 'Capitec', 'FNB', 'Nedbank', 'Standard Bank',
  'African Bank', 'Discovery Bank', 'Investec', 'TymeBank', 'Other',
];

const BRANCH_CODES: Record<string, string> = {
  Absa: '632005',
  Capitec: '470010',
  FNB: '250655',
  Nedbank: '198765',
  'Standard Bank': '051001',
  'African Bank': '430000',
  'Discovery Bank': '679000',
  Investec: '580105',
  TymeBank: '678910',
};

interface BankDetails {
  hostId: string;
  hostName: string;
  accountHolder: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  branchCode: string;
  updatedAt: string;
}

interface Host {
  id: string;
  displayName: string;
  locationName: string;
  businessType: string;
}

export default function HostPayouts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [bankDetails, setBankDetails] = useState<Record<string, BankDetails>>({});
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [form, setForm] = useState({ accountHolder: '', bank: '', accountNumber: '', accountType: 'Cheque', branchCode: '' });
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  async function loadData() {
    const hostsRaw = await AsyncStorage.getItem('cubby_hosts');
    const detailsRaw = await AsyncStorage.getItem('cubby_host_bank_details');
    if (hostsRaw) setHosts(JSON.parse(hostsRaw));
    if (detailsRaw) setBankDetails(JSON.parse(detailsRaw));
  }

  function openEdit(host: Host) {
    const existing = bankDetails[host.id];
    setForm({
      accountHolder: existing?.accountHolder ?? '',
      bank: existing?.bank ?? '',
      accountNumber: existing?.accountNumber ?? '',
      accountType: existing?.accountType ?? 'Cheque',
      branchCode: existing?.branchCode ?? '',
    });
    setEditingHostId(host.id);
  }

  function selectBank(bank: string) {
    setForm(f => ({ ...f, bank, branchCode: BRANCH_CODES[bank] ?? '' }));
    setShowBankPicker(false);
  }

  async function save() {
    if (!form.accountHolder.trim() || !form.bank || !form.accountNumber.trim()) {
      Alert.alert('Missing info', 'Please fill in account holder, bank and account number.');
      return;
    }
    setSaving(true);
    try {
      const host = hosts.find(h => h.id === editingHostId);
      const updated = {
        ...bankDetails,
        [editingHostId!]: {
          hostId: editingHostId!,
          hostName: host?.displayName ?? '',
          ...form,
          updatedAt: new Date().toISOString(),
        },
      };
      await AsyncStorage.setItem('cubby_host_bank_details', JSON.stringify(updated));
      setBankDetails(updated);
      setEditingHostId(null);
      Alert.alert('Saved', 'Bank details saved successfully.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDetails(hostId: string) {
    Alert.alert('Remove bank details', 'Remove banking details for this host?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const updated = { ...bankDetails };
        delete updated[hostId];
        await AsyncStorage.setItem('cubby_host_bank_details', JSON.stringify(updated));
        setBankDetails(updated);
      }},
    ]);
  }

  const editingHost = hosts.find(h => h.id === editingHostId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Host Bank Details</Text>
          <Text style={styles.subheading}>Payout bank accounts for your Cubby partners</Text>
        </View>

        {/* Split info card */}
        <View style={styles.splitCard}>
          <Text style={styles.splitTitle}>Payout Split</Text>
          <View style={styles.splitRow}>
            <View style={styles.splitItem}>
              <Text style={styles.splitPct}>70%</Text>
              <Text style={styles.splitLabel}>Host</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <Text style={styles.splitPct}>30%</Text>
              <Text style={styles.splitLabel}>Cubby</Text>
            </View>
          </View>
        </View>

        {hosts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏦</Text>
            <Text style={styles.emptyTitle}>No hosts yet</Text>
            <Text style={styles.emptySub}>Create host profiles first, then add their bank details here.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(admin)/create-host')}>
              <Text style={styles.emptyBtnText}>Create Host Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {hosts.map(host => {
              const details = bankDetails[host.id];
              return (
                <View key={host.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hostName}>{host.displayName}</Text>
                      <Text style={styles.hostLocation}>{host.locationName}</Text>
                    </View>
                    {details ? (
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedBadgeText}>✓ On file</Text>
                      </View>
                    ) : (
                      <View style={styles.missingBadge}>
                        <Text style={styles.missingBadgeText}>Missing</Text>
                      </View>
                    )}
                  </View>

                  {details ? (
                    <View style={styles.detailsBox}>
                      <Text style={styles.detailRow}>🏦 {details.bank}</Text>
                      <Text style={styles.detailRow}>👤 {details.accountHolder}</Text>
                      <Text style={styles.detailRow}>💳 ••••{details.accountNumber.slice(-4)} · {details.accountType}</Text>
                      <Text style={styles.detailRow}>🔢 Branch: {details.branchCode}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noDetails}>No bank details added yet</Text>
                  )}

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(host)} activeOpacity={0.8}>
                      <Text style={styles.editBtnText}>{details ? 'Edit details' : 'Add bank details'}</Text>
                    </TouchableOpacity>
                    {details && (
                      <TouchableOpacity style={styles.removeBtn} onPress={() => deleteDetails(host.id)} activeOpacity={0.8}>
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={!!editingHostId} animationType="slide" transparent onRequestClose={() => setEditingHostId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Bank details — {editingHost?.displayName}</Text>

            <Text style={styles.label}>Account Holder Name</Text>
            <TextInput style={styles.input} value={form.accountHolder} onChangeText={v => setForm(f => ({ ...f, accountHolder: v }))} placeholder="Full name on account" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Bank</Text>
            <TouchableOpacity style={styles.bankSelector} onPress={() => setShowBankPicker(true)} activeOpacity={0.8}>
              <Text style={[styles.bankSelectorText, !form.bank && { color: '#9CA3AF' }]}>{form.bank || 'Select bank…'}</Text>
              <Text style={styles.bankArrow}>▾</Text>
            </TouchableOpacity>

            {form.branchCode ? (
              <Text style={styles.branchCodeHint}>Branch code: {form.branchCode}</Text>
            ) : null}

            <Text style={styles.label}>Account Number</Text>
            <TextInput style={styles.input} value={form.accountNumber} onChangeText={v => setForm(f => ({ ...f, accountNumber: v }))} placeholder="e.g. 1234567890" placeholderTextColor="#9CA3AF" keyboardType="numeric" />

            <Text style={styles.label}>Account Type</Text>
            <View style={styles.typeRow}>
              {['Cheque', 'Savings'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.accountType === t && styles.typeChipActive]}
                  onPress={() => setForm(f => ({ ...f, accountType: t }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeChipText, form.accountType === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingHostId(null)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save details'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank picker modal */}
      <Modal visible={showBankPicker} animationType="slide" transparent onRequestClose={() => setShowBankPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Bank</Text>
            <ScrollView>
              {SA_BANKS.map(bank => (
                <TouchableOpacity key={bank} style={styles.bankOption} onPress={() => selectBank(bank)} activeOpacity={0.8}>
                  <Text style={styles.bankOptionText}>{bank}</Text>
                  {BRANCH_CODES[bank] && <Text style={styles.bankOptionCode}>{BRANCH_CODES[bank]}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  subheading: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  splitCard: { margin: 16, backgroundColor: Colors.primary, borderRadius: 18, padding: 20, alignItems: 'center' },
  splitTitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  splitRow: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14 },
  splitItem: { flex: 1, alignItems: 'center' },
  splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  splitPct: { fontSize: 28, fontWeight: '900', color: '#fff' },
  splitLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },

  list: { paddingHorizontal: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  hostName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  hostLocation: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  savedBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  savedBadgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  missingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  missingBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  detailsBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, gap: 6, marginBottom: 14 },
  detailRow: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  noDetails: { fontSize: 13, color: '#9CA3AF', marginBottom: 14, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  removeBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EAEA' },
  removeBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EAEA', paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1A1A1A' },
  bankSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EAEA', paddingHorizontal: 14, paddingVertical: 13 },
  bankSelectorText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  bankArrow: { fontSize: 14, color: '#6B7280' },
  branchCodeHint: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '500' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#F0EAEA', backgroundColor: '#fff' },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: '#FFF0F0' },
  typeChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeChipTextActive: { color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#F0EAEA', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  bankOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0EAEA' },
  bankOptionText: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  bankOptionCode: { fontSize: 13, color: '#6B7280' },
});
