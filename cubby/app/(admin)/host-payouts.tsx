import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TextInput, Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

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
    if (isSupabaseConfigured) {
      const { data: hostsData } = await supabase.from('hosts').select('*').order('created_at', { ascending: false });
      if (hostsData) {
        setHosts(hostsData.map((row: any) => ({
          id: row.id,
          displayName: row.display_name,
          locationName: row.location_name,
          businessType: row.business_type,
        })));
      }
      const { data: bankData } = await supabase.from('host_bank_details').select('*');
      if (bankData) {
        const map: Record<string, BankDetails> = {};
        for (const row of bankData) {
          map[row.host_id] = {
            hostId: row.host_id,
            hostName: row.host_name ?? '',
            accountHolder: row.account_holder,
            bank: row.bank,
            accountNumber: row.account_number,
            accountType: row.account_type,
            branchCode: row.branch_code,
            updatedAt: row.updated_at ?? '',
          };
        }
        setBankDetails(map);
      }
    } else {
      const hostsRaw = await AsyncStorage.getItem('cubby_hosts');
      const detailsRaw = await AsyncStorage.getItem('cubby_host_bank_details');
      if (hostsRaw) setHosts(JSON.parse(hostsRaw));
      if (detailsRaw) setBankDetails(JSON.parse(detailsRaw));
    }
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
      alert('Please fill in account holder, bank and account number.');
      return;
    }
    setSaving(true);
    try {
      const host = hosts.find(h => h.id === editingHostId);
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('host_bank_details').upsert({
          host_id: editingHostId!,
          account_holder: form.accountHolder,
          bank: form.bank,
          account_number: form.accountNumber,
          account_type: form.accountType,
          branch_code: form.branchCode,
        }, { onConflict: 'host_id' });
        if (error) {
          alert(error.message);
          return;
        }
        setBankDetails(prev => ({
          ...prev,
          [editingHostId!]: {
            hostId: editingHostId!,
            hostName: host?.displayName ?? '',
            ...form,
            updatedAt: new Date().toISOString(),
          },
        }));
      } else {
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
      }
      setEditingHostId(null);
      alert('Bank details saved successfully.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDetails(hostId: string) {
    if (window.confirm('Remove banking details for this host?')) {
      const updated = { ...bankDetails };
      delete updated[hostId];
      await AsyncStorage.setItem('cubby_host_bank_details', JSON.stringify(updated));
      setBankDetails(updated);
    }
  }

  const editingHost = hosts.find(h => h.id === editingHostId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, overflowY: 'auto' } as any}>
        <View style={styles.header}>
          {/* @ts-ignore */}
          <button onClick={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Text style={styles.backText}>← Back</Text>
          </button>
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
            {/* @ts-ignore */}
            <button onClick={() => router.push('/(admin)/create-host')} style={{ backgroundColor: '#2D6A4F', borderRadius: 14, paddingLeft: 28, paddingRight: 28, paddingTop: 14, paddingBottom: 14, border: 'none', cursor: 'pointer' }}>
              <Text style={styles.emptyBtnText}>Create Host Profile</Text>
            </button>
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
                    {/* @ts-ignore */}
                    <button onClick={() => openEdit(host)} style={{ flex: 1, backgroundColor: '#2D6A4F', borderRadius: 12, paddingTop: 12, paddingBottom: 12, border: 'none', cursor: 'pointer' }}>
                      <Text style={styles.editBtnText}>{details ? 'Edit details' : 'Add bank details'}</Text>
                    </button>
                    {details && (
                      // @ts-ignore
                      <button onClick={() => deleteDetails(host.id)} style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, border: '1.5px solid #F0EAEA', background: 'none', cursor: 'pointer' }}>
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </button>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>

      {/* Edit modal */}
      <Modal visible={!!editingHostId} animationType="slide" transparent onRequestClose={() => setEditingHostId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Bank details — {editingHost?.displayName}</Text>

            <Text style={styles.label}>Account Holder Name</Text>
            <TextInput style={styles.input} value={form.accountHolder} onChangeText={v => setForm(f => ({ ...f, accountHolder: v }))} placeholder="Full name on account" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Bank</Text>
            {/* @ts-ignore */}
            <button onClick={() => setShowBankPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', borderRadius: 12, border: '1.5px solid #F0EAEA', paddingLeft: 14, paddingRight: 14, paddingTop: 13, paddingBottom: 13, cursor: 'pointer', display: 'flex', width: '100%' }}>
              <Text style={[styles.bankSelectorText, !form.bank && { color: '#9CA3AF' }]}>{form.bank || 'Select bank…'}</Text>
              <Text style={styles.bankArrow}>▾</Text>
            </button>

            {form.branchCode ? (
              <Text style={styles.branchCodeHint}>Branch code: {form.branchCode}</Text>
            ) : null}

            <Text style={styles.label}>Account Number</Text>
            <TextInput style={styles.input} value={form.accountNumber} onChangeText={v => setForm(f => ({ ...f, accountNumber: v }))} placeholder="e.g. 1234567890" placeholderTextColor="#9CA3AF" keyboardType="numeric" />

            <Text style={styles.label}>Account Type</Text>
            <View style={styles.typeRow}>
              {['Cheque', 'Savings'].map(t => (
                // @ts-ignore
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, accountType: t }))}
                  style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 10, paddingBottom: 10, borderRadius: 20, border: form.accountType === t ? '1.5px solid #2D6A4F' : '1.5px solid #F0EAEA', backgroundColor: form.accountType === t ? '#FFF0F0' : '#fff', cursor: 'pointer' }}
                >
                  <Text style={[styles.typeChipText, form.accountType === t && styles.typeChipTextActive]}>{t}</Text>
                </button>
              ))}
            </View>

            <View style={styles.modalActions}>
              {/* @ts-ignore */}
              <button onClick={() => setEditingHostId(null)} style={{ flex: 1, border: '1.5px solid #F0EAEA', borderRadius: 14, paddingTop: 16, paddingBottom: 16, background: 'none', cursor: 'pointer' }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </button>
              {/* @ts-ignore */}
              <button onClick={save} disabled={saving} style={{ flex: 1, backgroundColor: '#2D6A4F', borderRadius: 14, paddingTop: 16, paddingBottom: 16, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save details'}</Text>
              </button>
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
            <View style={{ overflowY: 'auto', maxHeight: 400 } as any}>
              {SA_BANKS.map(bank => (
                // @ts-ignore
                <button key={bank} onClick={() => selectBank(bank)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 16, borderBottom: '1px solid #F0EAEA', background: 'none', border: 'none', borderBottom: '1px solid #F0EAEA', cursor: 'pointer', display: 'flex', width: '100%' }}>
                  <Text style={styles.bankOptionText}>{bank}</Text>
                  {BRANCH_CODES[bank] && <Text style={styles.bankOptionCode}>{BRANCH_CODES[bank]}</Text>}
                </button>
              ))}
            </View>
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
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
  removeBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EAEA', paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1A1A1A' },
  bankSelectorText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  bankArrow: { fontSize: 14, color: '#6B7280' },
  branchCodeHint: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '500' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeChipTextActive: { color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },

  bankOptionText: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  bankOptionCode: { fontSize: 13, color: '#6B7280' },
});
