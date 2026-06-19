import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

const SA_BANKS = [
  'Absa', 'Capitec', 'FNB', 'Nedbank', 'Standard Bank',
  'African Bank', 'Discovery Bank', 'Investec', 'TymeBank', 'Other',
];

const BRANCH_CODES: Record<string, string> = {
  Absa: '632005', Capitec: '470010', FNB: '250655', Nedbank: '198765',
  'Standard Bank': '051001', 'African Bank': '430000', 'Discovery Bank': '679000',
  Investec: '580105', TymeBank: '678910',
};

interface BankDetails {
  hostId: string; hostName: string; accountHolder: string; bank: string;
  accountNumber: string; accountType: string; branchCode: string; updatedAt: string;
}

interface Host { id: string; displayName: string; locationName: string; businessType: string; }

export default function HostPayouts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [bankDetails, setBankDetails] = useState<Record<string, BankDetails>>({});
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [form, setForm] = useState({ accountHolder: '', bank: '', accountNumber: '', accountType: 'Cheque', branchCode: '' });
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    if (isSupabaseConfigured) {
      const { data: hostsData } = await supabase.from('hosts').select('*').order('created_at', { ascending: false });
      if (hostsData) {
        setHosts(hostsData.map((row: any) => ({
          id: row.id, displayName: row.display_name, locationName: row.location_name, businessType: row.business_type,
        })));
      }
      const { data: bankData } = await supabase.from('host_bank_details').select('*');
      if (bankData) {
        const map: Record<string, BankDetails> = {};
        for (const row of bankData) {
          map[row.host_id] = {
            hostId: row.host_id, hostName: row.host_name ?? '', accountHolder: row.account_holder,
            bank: row.bank, accountNumber: row.account_number, accountType: row.account_type,
            branchCode: row.branch_code, updatedAt: row.updated_at ?? '',
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
      accountHolder: existing?.accountHolder ?? '', bank: existing?.bank ?? '',
      accountNumber: existing?.accountNumber ?? '', accountType: existing?.accountType ?? 'Cheque',
      branchCode: existing?.branchCode ?? '',
    });
    setEditingHostId(host.id);
    setSuccessMsg(''); setErrorMsg('');
  }

  function selectBank(bank: string) {
    setForm(f => ({ ...f, bank, branchCode: BRANCH_CODES[bank] ?? '' }));
    setShowBankPicker(false);
  }

  async function save() {
    if (!form.accountHolder.trim() || !form.bank || !form.accountNumber.trim()) {
      setErrorMsg('Please fill in account holder, bank and account number.');
      return;
    }
    setSaving(true); setErrorMsg('');
    try {
      const host = hosts.find(h => h.id === editingHostId);
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('host_bank_details').upsert({
          host_id: editingHostId!, account_holder: form.accountHolder, bank: form.bank,
          account_number: form.accountNumber, account_type: form.accountType, branch_code: form.branchCode,
        }, { onConflict: 'host_id' });
        if (error) { setErrorMsg(error.message); return; }
        setBankDetails(prev => ({
          ...prev, [editingHostId!]: { hostId: editingHostId!, hostName: host?.displayName ?? '', ...form, updatedAt: new Date().toISOString() },
        }));
      } else {
        const updated = {
          ...bankDetails, [editingHostId!]: { hostId: editingHostId!, hostName: host?.displayName ?? '', ...form, updatedAt: new Date().toISOString() },
        };
        await AsyncStorage.setItem('cubby_host_bank_details', JSON.stringify(updated));
        setBankDetails(updated);
      }
      setSuccessMsg('Bank details saved!');
      setTimeout(() => { setSuccessMsg(''); setEditingHostId(null); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDetails(hostId: string) {
    const updated = { ...bankDetails };
    delete updated[hostId];
    await AsyncStorage.setItem('cubby_host_bank_details', JSON.stringify(updated));
    setBankDetails(updated);
    setConfirmRemoveId(null);
  }

  const editingHost = hosts.find(h => h.id === editingHostId);

  const s: any = {
    page: { minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
    header: { padding: '16px 20px 8px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#2D6A4F', fontWeight: 600, padding: 0, marginBottom: 12 },
    heading: { fontSize: 26, fontWeight: 900, color: '#1A1A1A', margin: '0 0 4px' },
    subheading: { fontSize: 14, color: '#6B7280', margin: 0 },
    splitCard: { margin: '16px', backgroundColor: '#2D6A4F', borderRadius: 18, padding: 20, textAlign: 'center' },
    splitTitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
    splitRow: { display: 'flex', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14 },
    splitItem: { flex: 1, textAlign: 'center' },
    splitPct: { fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 },
    splitLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: 600, margin: 0 },
    splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', margin: '4px 0' },
    list: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 },
    card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    cardHeader: { display: 'flex', alignItems: 'flex-start', marginBottom: 12 },
    hostName: { fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 },
    hostLocation: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    savedBadge: { backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#16A34A', marginLeft: 'auto' },
    missingBadge: { backgroundColor: '#FEF3C7', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#D97706', marginLeft: 'auto' },
    detailsBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, marginBottom: 14 },
    detailRow: { fontSize: 13, color: '#1A1A1A', fontWeight: 500, marginBottom: 4 },
    noDetails: { fontSize: 13, color: '#9CA3AF', marginBottom: 14, fontStyle: 'italic' },
    cardActions: { display: 'flex', gap: 10 },
    editBtn: { flex: 1, backgroundColor: '#2D6A4F', borderRadius: 12, padding: '12px', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: 14 },
    removeBtn: { padding: '12px 16px', borderRadius: 12, border: '1.5px solid #F0EAEA', background: 'none', cursor: 'pointer', color: '#6B7280', fontWeight: 600, fontSize: 14 },
    empty: { textAlign: 'center', paddingTop: 60, paddingBottom: 40, padding: '60px 32px 40px' },
    emptyBtn: { backgroundColor: '#2D6A4F', borderRadius: 14, padding: '14px 28px', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: 15, marginTop: 16 },
    // Modal overlay
    overlay: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' as any },
    handle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, margin: '0 auto 18px' },
    modalTitle: { fontSize: 18, fontWeight: 800, color: '#1A1A1A', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8, marginTop: 14, display: 'block' },
    input: { backgroundColor: '#FAFAFA', borderRadius: 12, border: '1.5px solid #F0EAEA', padding: '13px 14px', fontSize: 15, color: '#1A1A1A', width: '100%', boxSizing: 'border-box' as any },
    bankSelectorBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', borderRadius: 12, border: '1.5px solid #F0EAEA', padding: '13px 14px', cursor: 'pointer', width: '100%', fontSize: 15, color: '#1A1A1A' },
    typeRow: { display: 'flex', gap: 10, marginTop: 8 },
    typeChipBtn: (active: boolean) => ({ padding: '10px 20px', borderRadius: 20, border: active ? '1.5px solid #2D6A4F' : '1.5px solid #F0EAEA', backgroundColor: active ? '#EFF5F3' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: active ? '#2D6A4F' : '#6B7280' }),
    modalActions: { display: 'flex', gap: 10, marginTop: 24 },
    cancelBtn: { flex: 1, border: '1.5px solid #F0EAEA', borderRadius: 14, padding: '16px', background: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#6B7280' },
    saveBtn: (saving: boolean) => ({ flex: 1, backgroundColor: saving ? '#ccc' : '#2D6A4F', borderRadius: 14, padding: '16px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, color: 'white', opacity: saving ? 0.8 : 1 }),
    successBox: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#065F46', fontWeight: 600 },
    errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#DC2626', fontWeight: 600 },
    bankOptionBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #F0EAEA', background: 'none', border: 'none', borderBottom: '1px solid #F0EAEA', cursor: 'pointer', width: '100%', fontSize: 16, color: '#1A1A1A' },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>← Back</button>
        <h1 style={s.heading}>Host Bank Details</h1>
        <p style={s.subheading}>Payout bank accounts for your Cubby partners</p>
      </div>

      <div style={s.splitCard}>
        <p style={s.splitTitle}>Payout Split</p>
        <div style={s.splitRow}>
          <div style={s.splitItem}><p style={s.splitPct}>70%</p><p style={s.splitLabel}>Host</p></div>
          <div style={s.splitDivider} />
          <div style={s.splitItem}><p style={s.splitPct}>30%</p><p style={s.splitLabel}>Cubby</p></div>
        </div>
      </div>

      {hosts.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🏦</div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>No hosts yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', margin: 0 }}>Create host profiles first, then add their bank details here.</p>
          <button style={s.emptyBtn} onClick={() => router.replace('/(admin)/create-host')}>Create Host Profile</button>
        </div>
      ) : (
        <div style={s.list}>
          {hosts.map(host => {
            const details = bankDetails[host.id];
            return (
              <div key={host.id} style={s.card}>
                <div style={s.cardHeader}>
                  <div style={{ flex: 1 }}>
                    <p style={s.hostName}>{host.displayName}</p>
                    <p style={s.hostLocation}>{host.locationName}</p>
                  </div>
                  {details
                    ? <span style={s.savedBadge}>✓ On file</span>
                    : <span style={s.missingBadge}>Missing</span>}
                </div>

                {details ? (
                  <div style={s.detailsBox}>
                    <p style={s.detailRow}>🏦 {details.bank}</p>
                    <p style={s.detailRow}>👤 {details.accountHolder}</p>
                    <p style={s.detailRow}>💳 ••••{details.accountNumber.slice(-4)} · {details.accountType}</p>
                    <p style={s.detailRow}>🔢 Branch: {details.branchCode}</p>
                  </div>
                ) : (
                  <p style={s.noDetails}>No bank details added yet</p>
                )}

                <div style={s.cardActions}>
                  <button style={s.editBtn} onClick={() => openEdit(host)}>
                    {details ? 'Edit details' : 'Add bank details'}
                  </button>
                  {details && (
                    confirmRemoveId === host.id ? (
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>Sure?</span>
                        <button style={{ ...s.removeBtn, backgroundColor: '#DC2626', color: 'white', border: 'none' }} onClick={() => deleteDetails(host.id)}>Yes</button>
                        <button style={s.removeBtn} onClick={() => setConfirmRemoveId(null)}>No</button>
                      </span>
                    ) : (
                      <button style={s.removeBtn} onClick={() => setConfirmRemoveId(host.id)}>Remove</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 40 }} />

      {/* Edit modal */}
      {!!editingHostId && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setEditingHostId(null); }}>
          <div style={s.sheet}>
            <div style={s.handle} />
            <h2 style={s.modalTitle}>Bank details — {editingHost?.displayName}</h2>

            {!!successMsg && <div style={s.successBox}>{successMsg}</div>}
            {!!errorMsg && <div style={s.errorBox}>{errorMsg}</div>}

            <label style={s.label}>Account Holder Name</label>
            <input style={s.input} value={form.accountHolder} onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))} placeholder="Full name on account" />

            <label style={s.label}>Bank</label>
            <button style={s.bankSelectorBtn} onClick={() => setShowBankPicker(true)}>
              <span style={{ color: form.bank ? '#1A1A1A' : '#9CA3AF' }}>{form.bank || 'Select bank…'}</span>
              <span style={{ color: '#6B7280' }}>▾</span>
            </button>
            {form.branchCode && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: 500 }}>Branch code: {form.branchCode}</p>}

            <label style={s.label}>Account Number</label>
            <input style={s.input} type="number" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="e.g. 1234567890" />

            <label style={s.label}>Account Type</label>
            <div style={s.typeRow}>
              {['Cheque', 'Savings'].map(t => (
                <button key={t} style={s.typeChipBtn(form.accountType === t)} onClick={() => setForm(f => ({ ...f, accountType: t }))}>{t}</button>
              ))}
            </div>

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setEditingHostId(null)}>Cancel</button>
              <button style={s.saveBtn(saving)} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bank picker modal */}
      {showBankPicker && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowBankPicker(false); }}>
          <div style={s.sheet}>
            <div style={s.handle} />
            <h2 style={s.modalTitle}>Select Bank</h2>
            <div style={{ overflowY: 'auto', maxHeight: 400 } as any}>
              {SA_BANKS.map(bank => (
                <button key={bank} style={s.bankOptionBtn} onClick={() => selectBank(bank)}>
                  <span>{bank}</span>
                  {BRANCH_CODES[bank] && <span style={{ fontSize: 13, color: '#6B7280' }}>{BRANCH_CODES[bank]}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
