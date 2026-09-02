import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { adminFetch } from '../../src/lib/admin-auth';

async function adminFetchBankDetails(method: string, path: string, body?: object) {
  const res = await adminFetch(`/admin-bank-details${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

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

// A completed booking as returned by admin-bookings — only the fields this
// screen actually reads. host_payout_amount is the locked 70% snapshot
// admin-bookings.tsx.
interface PayoutBooking {
  id: string;
  host_id: string;
  status: string;
  bag_count: number;
  drop_off_date: string;
  completed_at: string | null;
  host_payout_amount: number | null;
  payout_status: string | null;
  host_paid_at: string | null;
}

// ─── Weekly payout period grouping ─────────────────────────────────────────
//
// Cubby pays hosts every Friday. A booking completed ON a Friday must NOT
// be included in that same Friday's payout — the host is being paid that
// morning, and bookings can still complete later that day. So each period
// runs Friday 00:00 -> Thursday 23:59, and is paid out on the FOLLOWING
// Friday:
//   Earnings period: Fri 28 Aug - Thu 3 Sep  ->  Payout: Fri 4 Sep
// completed_at (set once, atomically, by complete-booking) is the anchor —
// never created_at/drop_off_date, since host_payout_amount/payout_status
// don't exist until completion. See PROJECT audit for the full reasoning.
const DAY_MS = 24 * 60 * 60 * 1000;

// Midnight-aligned start of the Friday-anchored period containing `date`.
// A booking completed exactly on a Friday returns that same Friday as its
// period start — i.e. it starts a NEW period, matching "belongs to the
// next payout period" from the spec.
function periodStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat, Fri=5
  const diff = (day - 5 + 7) % 7; // days since the most recent Friday (0 if today is Friday)
  return new Date(d.getTime() - diff * DAY_MS);
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

// 'YYYY-MM-DD' from a period's local-midnight start Date, using local
// getters (not toISOString, which would convert to UTC and could shift
// the calendar date). Sent to admin-mark-payout-paid as the plain
// calendar-date identifier of "which Friday" — the server alone decides
// the actual Africa/Johannesburg UTC boundaries for that date; this is
// never a computed timestamp/boundary the server is asked to trust.
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface PayoutPeriod {
  key: string; // period start, ISO date — stable grouping/sort key
  start: Date;
  end: Date; // Thursday 23:59:59
  payoutDate: Date; // following Friday
  bookings: PayoutBooking[];
  total: number; // sum of stored host_payout_amount for EVERY booking in the
                  // period, whatever its payout_status — "period earnings",
                  // a historical record, never what gets EFT'd.
  outstanding: number; // sum of ONLY status='pending_manual' bookings — the
                        // actual amount still owed, and the only number the
                        // Mark as Paid button may ever show or act on.
}

// Groups one host's completed bookings into Friday->Thursday periods.
// Sums the already-stored host_payout_amount snapshot — this screen never
// derives the 70% split from prices itself.
function groupIntoPeriods(bookings: PayoutBooking[]): Map<string, PayoutPeriod> {
  const periods = new Map<string, PayoutPeriod>();
  for (const b of bookings) {
    if (b.status !== 'completed' || !b.completed_at) continue;
    const start = periodStart(new Date(b.completed_at));
    const key = start.toISOString();
    let period = periods.get(key);
    if (!period) {
      const end = new Date(start.getTime() + 6 * DAY_MS + (DAY_MS - 1));
      const payoutDate = new Date(start.getTime() + 7 * DAY_MS);
      period = { key, start, end, payoutDate, bookings: [], total: 0, outstanding: 0 };
      periods.set(key, period);
    }
    period.bookings.push(b);
    period.total += Number(b.host_payout_amount ?? 0);
    // A refunded/voided booking never enters the amount about to be EFT'd,
    // and once a booking is 'paid' it must not be counted as owed again —
    // only 'pending_manual' bookings are actually outstanding.
    if (b.payout_status === 'pending_manual') {
      period.outstanding += Number(b.host_payout_amount ?? 0);
    }
  }
  return periods;
}

export default function HostPayouts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [bankDetails, setBankDetails] = useState<Record<string, BankDetails>>({});
  const [bookings, setBookings] = useState<PayoutBooking[]>([]);
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [form, setForm] = useState({ accountHolder: '', bank: '', accountNumber: '', accountType: 'Cheque', branchCode: '' });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Earnings drill-down state — separate from editingHostId (the bank-
  // details edit form), so viewing earnings and editing bank details don't
  // fight over the same piece of state.
  const [viewHostId, setViewHostId] = useState<string | null>(null);
  const [expandedPeriodKey, setExpandedPeriodKey] = useState<string | null>(null);
  const [confirmPayPeriodKey, setConfirmPayPeriodKey] = useState<string | null>(null);
  const [payingPeriodKey, setPayingPeriodKey] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  function showError(msg: string) {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 3000);
  }

  async function loadData() {
    if (isSupabaseConfigured) {
      // Hosts are publicly readable — fetch directly
      const { data: hostsData } = await supabase.from('hosts').select('*').order('created_at', { ascending: false });
      if (hostsData) {
        setHosts(hostsData.map((row: any) => ({
          id: row.id,
          displayName: row.display_name,
          locationName: row.location_name,
          businessType: row.business_type,
        })));
      }
      // Bank details go through the admin edge function (service role)
      const result = await adminFetchBankDetails('GET', '');
      if (result.data) {
        const map: Record<string, BankDetails> = {};
        for (const row of result.data) {
          map[row.host_id] = {
            hostId: row.host_id,
            hostName: row.hosts?.display_name ?? '',
            accountHolder: row.account_holder,
            bank: row.bank_name,
            accountNumber: row.account_number,
            accountType: row.account_type,
            branchCode: row.branch_code,
            updatedAt: row.updated_at ?? '',
          };
        }
        setBankDetails(map);
      }
      // Same admin-bookings source All Bookings/Revenue already use — filtered
      // client-side to completed, same pattern revenue.tsx already uses.
      // host_payout_amount is read as-is, never recalculated from prices here.
      const bookingsRes = await adminFetch('/admin-bookings', { method: 'GET' });
      const bookingsJson = await bookingsRes.json();
      if (bookingsJson.data) {
        setBookings((bookingsJson.data as any[]).filter(b => b.status === 'completed'));
      }
    } else {
      const hostsRaw = await AsyncStorage.getItem('cubby_hosts');
      const detailsRaw = await AsyncStorage.getItem('cubby_host_bank_details');
      if (hostsRaw) setHosts(JSON.parse(hostsRaw));
      if (detailsRaw) setBankDetails(JSON.parse(detailsRaw));
    }
  }

  // Records that a week's manual EFT was made. Sends only hostId + which
  // Friday (a plain calendar date) — never a booking list or a Rand
  // amount. The server/RPC alone decides the eligible bookings and total;
  // on success this reloads everything from the backend rather than
  // trusting the pre-click UI total, so the dashboard never shows a
  // number it merely assumed was marked.
  async function markPeriodPaid(hostId: string, period: PayoutPeriod) {
    setPayingPeriodKey(period.key);
    setErrorMsg('');
    try {
      const res = await adminFetch('/admin-mark-payout-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, periodStartDate: toDateString(period.start) }),
      });
      const result = await res.json();
      if (result.error) {
        showError(result.error);
        return;
      }
      await loadData();
      // count === 0 is a real, harmless outcome — not an error — from the
      // RPC's own idempotency guard: e.g. a second click, or someone else
      // already closed this period out in another tab. It must never be
      // announced as a payment ("R0.00 marked as paid" would be
      // confusing/misleading); the refreshed card itself (PAID badge,
      // outstanding line, or button gone entirely) is the honest source
      // of truth for what actually happened.
      if (result.data.count === 0) {
        showSuccess('Nothing outstanding to mark — this period may already be paid.');
      } else {
        showSuccess(`R${Number(result.data.total).toFixed(2)} marked as paid (${result.data.count} booking${result.data.count === 1 ? '' : 's'}).`);
      }
    } catch {
      showError('Could not mark payout as paid. Please try again.');
    } finally {
      setPayingPeriodKey(null);
      setConfirmPayPeriodKey(null);
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
    setSuccessMsg('');
    setErrorMsg('');
  }

  function selectBank(bank: string) {
    setForm(f => ({ ...f, bank, branchCode: BRANCH_CODES[bank] ?? '' }));
  }

  async function save() {
    if (!form.accountHolder.trim() || !form.bank || !form.accountNumber.trim()) {
      showError('Please fill in account holder, bank and account number.');
      return;
    }
    setSaving(true);
    try {
      const host = hosts.find(h => h.id === editingHostId);
      if (isSupabaseConfigured) {
        const result = await adminFetchBankDetails('POST', '', {
          host_id: editingHostId!,
          account_holder: form.accountHolder,
          bank_name: form.bank,
          account_number: form.accountNumber,
          account_type: form.accountType,
          branch_code: form.branchCode,
        });
        if (result.error) {
          showError(result.error);
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
      showSuccess('Bank details saved successfully.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDetails(hostId: string) {
    const updated = { ...bankDetails };
    delete updated[hostId];
    if (isSupabaseConfigured) {
      await adminFetchBankDetails('DELETE', `?hostId=${hostId}`);
    } else {
      await AsyncStorage.setItem('cubby_host_bank_details', JSON.stringify(updated));
    }
    setBankDetails(updated);
    setConfirmDeleteId(null);
    showSuccess('Bank details removed.');
  }

  const editingHost = hosts.find(h => h.id === editingHostId);
  const viewHost = hosts.find(h => h.id === viewHostId);

  const currentPeriodKey = periodStart(new Date()).toISOString();

  function hostPeriods(hostId: string) {
    const hostBookings = bookings.filter(b => b.host_id === hostId);
    const periods = groupIntoPeriods(hostBookings);
    // Always show the current period, even with zero bookings so far —
    // an admin checking mid-week should see "R0.00, nothing yet" rather
    // than the period simply not existing.
    if (!periods.has(currentPeriodKey)) {
      const start = periodStart(new Date());
      const end = new Date(start.getTime() + 6 * DAY_MS + (DAY_MS - 1));
      const payoutDate = new Date(start.getTime() + 7 * DAY_MS);
      periods.set(currentPeriodKey, { key: currentPeriodKey, start, end, payoutDate, bookings: [], total: 0, outstanding: 0 });
    }
    return Array.from(periods.values()).sort((a, b) => b.start.getTime() - a.start.getTime());
  }

  function currentPeriodTotal(hostId: string): number {
    const hostBookings = bookings.filter(b => b.host_id === hostId && b.status === 'completed' && b.completed_at);
    return hostBookings
      .filter(b => periodStart(new Date(b.completed_at as string)).toISOString() === currentPeriodKey)
      .reduce((sum, b) => sum + Number(b.host_payout_amount ?? 0), 0);
  }

  const s: any = {
    page: {
      minHeight: '100vh', backgroundColor: '#FAFAFA',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowY: 'auto',
    },
    header: { padding: '16px 20px 8px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#2D6A4F', fontWeight: 600, padding: 0, marginBottom: 12, display: 'block' },
    heading: { fontSize: 26, fontWeight: 900, color: '#1A1A1A', margin: '0 0 4px' },
    subheading: { fontSize: 14, color: '#6B7280', margin: 0 },
    splitCard: {
      margin: '16px', backgroundColor: '#2D6A4F', borderRadius: 18,
      padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    splitTitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, margin: '0 0 14px' },
    splitRow: {
      display: 'flex', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 12, padding: 14,
    },
    splitItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', margin: '4px 0' },
    splitPct: { fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 },
    splitLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: 600 },
    successBox: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: '10px 16px', margin: '0 16px 12px', color: '#065F46', fontWeight: 600 },
    errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: '10px 16px', margin: '0 16px 12px', color: '#DC2626', fontWeight: 600 },
    list: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 },
    card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    cardHeader: { display: 'flex', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    hostName: { fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 },
    hostLocation: { fontSize: 13, color: '#6B7280', margin: '2px 0 0' },
    savedBadge: { backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' },
    savedBadgeText: { fontSize: 11, fontWeight: 700, color: '#16A34A' },
    missingBadge: { backgroundColor: '#FEF3C7', padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' },
    missingBadgeText: { fontSize: 11, fontWeight: 700, color: '#D97706' },
    detailsBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, marginBottom: 14 },
    detailRow: { fontSize: 13, color: '#1A1A1A', fontWeight: 500, margin: '3px 0' },
    noDetails: { fontSize: 13, color: '#9CA3AF', marginBottom: 14, fontStyle: 'italic' },
    cardActions: { display: 'flex', gap: 10, alignItems: 'center' },
    editBtn: { flex: 1, backgroundColor: '#2D6A4F', borderRadius: 12, padding: '12px', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 },
    confirmRow: { display: 'flex', alignItems: 'center', gap: 8 },
    confirmText: { fontSize: 13, color: '#DC2626', fontWeight: 600 },
    confirmYes: { backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
    confirmNo: { backgroundColor: '#fff', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: 8, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
    removeBtn: { padding: '12px 16px', borderRadius: 12, border: '1.5px solid #F0EAEA', background: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 14, fontWeight: 600 },
    empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, paddingLeft: 32, paddingRight: 32 },
    emptyEmoji: { fontSize: 48, marginBottom: 14 },
    emptyTitle: { fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', margin: '0 0 24px' },
    emptyBtn: { backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
    editForm: {
      backgroundColor: '#fff', borderRadius: 18, margin: 16,
      padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      border: '1px solid #F0EAEA',
    },
    editTitle: { fontSize: 18, fontWeight: 800, color: '#1A1A1A', margin: '0 0 20px' },
    label: { fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8, marginTop: 14, display: 'block' },
    input: {
      backgroundColor: '#FAFAFA', borderRadius: 12, border: '1.5px solid #F0EAEA',
      padding: '13px 14px', fontSize: 15, color: '#1A1A1A', width: '100%',
      boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    },
    select: {
      backgroundColor: '#FAFAFA', borderRadius: 12, border: '1.5px solid #F0EAEA',
      padding: '13px 14px', fontSize: 15, color: '#1A1A1A', width: '100%',
      boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
    },
    branchHint: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: 500 },
    typeRow: { display: 'flex', gap: 10, marginTop: 4 },
    typeChip: (isActive: boolean) => ({
      padding: '10px 20px', borderRadius: 20, cursor: 'pointer',
      border: isActive ? '1.5px solid #2D6A4F' : '1.5px solid #F0EAEA',
      backgroundColor: isActive ? '#F0FDF4' : '#fff',
      color: isActive ? '#2D6A4F' : '#6B7280', fontWeight: 600, fontSize: 14,
    }),
    modalActions: { display: 'flex', gap: 10, marginTop: 24 },
    cancelBtn: { flex: 1, border: '1.5px solid #F0EAEA', borderRadius: 14, padding: '16px', background: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#6B7280' },
    saveBtn: (disabled: boolean) => ({
      flex: 1, backgroundColor: disabled ? '#ccc' : '#2D6A4F', borderRadius: 14,
      padding: '16px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 15, fontWeight: 700, color: '#fff',
    }),
    editErrorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: '10px 14px', marginTop: 12, color: '#DC2626', fontWeight: 600, fontSize: 14 },

    // Earnings view
    weekBadge: { fontSize: 12, color: '#2D6A4F', fontWeight: 700, margin: '4px 0 0' },
    earningsBtn: { flex: 1, backgroundColor: '#fff', border: '1.5px solid #2D6A4F', borderRadius: 12, padding: '12px', cursor: 'pointer', color: '#2D6A4F', fontSize: 14, fontWeight: 700 },
    currentCard: { margin: '16px', backgroundColor: '#2D6A4F', borderRadius: 18, padding: 20 },
    currentLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' },
    currentRange: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 600, margin: '0 0 14px' },
    currentTotal: { fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 6px' },
    currentSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 },
    sectionLabel: { fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: '20px 16px 10px' },
    periodRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
    periodRowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    periodRange: { fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 },
    periodPayout: { fontSize: 12, color: '#6B7280', margin: '2px 0 0' },
    periodTotal: { fontSize: 16, fontWeight: 800, color: '#2D6A4F', margin: 0 },
    periodCount: { fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', textAlign: 'right' },
    bookingList: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EAEA', display: 'flex', flexDirection: 'column', gap: 8 },
    bookingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 10, padding: '10px 12px' },
    bookingDate: { fontSize: 13, fontWeight: 600, color: '#1A1A1A', margin: 0 },
    bookingBags: { fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' },
    bookingAmount: { fontSize: 14, fontWeight: 800, color: '#2D6A4F', margin: 0 },
    payoutStatusPill: (status: string | null) => ({
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, marginTop: 3, display: 'inline-block',
      backgroundColor: status === 'pending_manual' ? '#FEF3C7' : status === 'voided_refunded' ? '#F3F4F6' : '#F3F4F6',
      color: status === 'pending_manual' ? '#D97706' : status === 'voided_refunded' ? '#6B7280' : '#6B7280',
    }),
    emptyPeriods: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', margin: '0 16px 16px' },

    // Mark as Paid
    outstandingLine: { fontSize: 13, color: '#D97706', fontWeight: 700, margin: '0 0 8px' },
    markPaidBtn: { width: '100%', backgroundColor: '#2D6A4F', border: 'none', borderRadius: 12, padding: '12px', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 },
    payConfirmBox: { marginTop: 10, backgroundColor: '#F0FDF4', border: '1.5px solid #2D6A4F', borderRadius: 12, padding: 14 },
    payConfirmText: { fontSize: 13, color: '#1A1A1A', fontWeight: 600, margin: '0 0 12px', lineHeight: 1.5 },
    payConfirmActions: { display: 'flex', gap: 10 },
    paidBadge: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#DCFCE7', borderRadius: 10, padding: '8px 12px' },
    paidBadgeText: { fontSize: 13, fontWeight: 800, color: '#16A34A' },
    paidBadgeDate: { fontSize: 12, fontWeight: 600, color: '#166534' },
  };

  if (viewHost) {
    const periods = hostPeriods(viewHost.id);
    const current = periods[0]; // currentPeriodKey is always present, and sorts newest-first
    const previous = periods.slice(1);
    const details = bankDetails[viewHost.id];
    const isConfirmingDelete = confirmDeleteId === viewHost.id;

    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => { setViewHostId(null); setExpandedPeriodKey(null); }}>
            ← Back to hosts
          </button>
          <h1 style={s.heading}>{viewHost.displayName}</h1>
          <p style={s.subheading}>{viewHost.locationName}</p>
        </div>

        <div style={s.currentCard}>
          <p style={s.currentLabel}>Current period (unpaid)</p>
          <p style={s.currentRange}>{formatDay(current.start)} – {formatDay(current.end)}</p>
          <p style={s.currentTotal}>R{current.total.toFixed(2)}</p>
          <p style={s.currentSub}>
            {current.bookings.length} booking{current.bookings.length === 1 ? '' : 's'} · Payout {formatDay(current.payoutDate)}
          </p>
        </div>

        {!!errorMsg && !editingHostId && <div style={s.errorBox}>{errorMsg}</div>}
        {!!successMsg && <div style={s.successBox}>{successMsg}</div>}

        {editingHostId === viewHost.id ? (
          <div style={s.editForm}>
            <h2 style={s.editTitle}>Bank details — {viewHost.displayName}</h2>

            <label style={s.label}>Account Holder Name</label>
            <input
              style={s.input}
              value={form.accountHolder}
              onChange={e => setForm(f => ({ ...f, accountHolder: (e.target as any).value }))}
              placeholder="Full name on account"
            />

            <label style={s.label}>Bank</label>
            <select style={s.select} value={form.bank} onChange={e => selectBank((e.target as any).value)}>
              <option value="">Select bank…</option>
              {SA_BANKS.map(bank => (
                <option key={bank} value={bank}>{bank}{BRANCH_CODES[bank] ? ` — ${BRANCH_CODES[bank]}` : ''}</option>
              ))}
            </select>

            {form.branchCode ? <p style={s.branchHint}>Branch code: {form.branchCode}</p> : null}

            <label style={s.label}>Account Number</label>
            <input
              style={s.input}
              type="number"
              value={form.accountNumber}
              onChange={e => setForm(f => ({ ...f, accountNumber: (e.target as any).value }))}
              placeholder="e.g. 1234567890"
            />

            <label style={s.label}>Account Type</label>
            <div style={s.typeRow}>
              {['Cheque', 'Savings'].map(t => (
                <button key={t} style={s.typeChip(form.accountType === t)} onClick={() => setForm(f => ({ ...f, accountType: t }))}>
                  {t}
                </button>
              ))}
            </div>

            {!!errorMsg && <div style={s.editErrorBox}>{errorMsg}</div>}

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setEditingHostId(null)}>Cancel</button>
              <button style={s.saveBtn(saving)} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ margin: '0 16px' }}>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <p style={{ ...s.hostName, fontSize: 14 }}>Bank details</p>
                {details ? (
                  <div style={s.savedBadge}><span style={s.savedBadgeText}>✓ On file</span></div>
                ) : (
                  <div style={s.missingBadge}><span style={s.missingBadgeText}>Missing</span></div>
                )}
              </div>
              {details ? (
                <div style={s.detailsBox}>
                  <p style={s.detailRow}>🏦 {details.bank}</p>
                  <p style={s.detailRow}>👤 {details.accountHolder}</p>
                  <p style={s.detailRow}>💳 ••••{details.accountNumber.slice(-4)} · {details.accountType}</p>
                  <p style={s.detailRow}>🔢 Branch: {details.branchCode}</p>
                </div>
              ) : (
                <p style={s.noDetails}>No bank details added yet — needed to make the Friday EFT.</p>
              )}
              <div style={s.cardActions}>
                <button style={s.editBtn} onClick={() => openEdit(viewHost)}>
                  {details ? 'Edit bank details' : 'Add bank details'}
                </button>
                {details && (
                  isConfirmingDelete ? (
                    <div style={s.confirmRow}>
                      <span style={s.confirmText}>Sure?</span>
                      <button style={s.confirmYes} onClick={() => deleteDetails(viewHost.id)}>Yes</button>
                      <button style={s.confirmNo} onClick={() => setConfirmDeleteId(null)}>No</button>
                    </div>
                  ) : (
                    <button style={s.removeBtn} onClick={() => setConfirmDeleteId(viewHost.id)}>Remove</button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <p style={s.sectionLabel}>Previous periods</p>
        {previous.length === 0 ? (
          <p style={s.emptyPeriods}>No completed bookings from before this period yet.</p>
        ) : (
          <div style={s.list}>
            {previous.map(period => {
              const expanded = expandedPeriodKey === period.key;
              const isConfirming = confirmPayPeriodKey === period.key;
              const isPaying = payingPeriodKey === period.key;
              // Fully resolved only if something was actually paid and
              // nothing remains owed — a period that's R0 outstanding
              // purely because every booking was refunded/voided never
              // shows a false "PAID" badge.
              const paidBookings = period.bookings.filter(b => b.payout_status === 'paid');
              const fullyPaid = paidBookings.length > 0 && period.outstanding === 0;
              const lastPaidAt = fullyPaid
                ? paidBookings.reduce((latest: string | null, b) => (
                    !latest || (b.host_paid_at && b.host_paid_at > latest) ? (b.host_paid_at as string) : latest
                  ), null)
                : null;
              return (
                <div key={period.key} style={s.periodRow}>
                  <div style={s.periodRowTop} onClick={() => setExpandedPeriodKey(expanded ? null : period.key)}>
                    <div>
                      <p style={s.periodRange}>{formatDay(period.start)} – {formatDay(period.end)}</p>
                      <p style={s.periodPayout}>Payout {formatDay(period.payoutDate)}</p>
                    </div>
                    <div>
                      <p style={s.periodTotal}>R{period.total.toFixed(2)}</p>
                      <p style={s.periodCount}>{period.bookings.length} booking{period.bookings.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  {fullyPaid ? (
                    <div style={s.paidBadge}>
                      <span style={s.paidBadgeText}>✓ PAID</span>
                      {!!lastPaidAt && <span style={s.paidBadgeDate}>Paid on {formatDay(new Date(lastPaidAt))}</span>}
                    </div>
                  ) : period.outstanding > 0 ? (
                    isConfirming ? (
                      <div style={s.payConfirmBox} onClick={e => e.stopPropagation()}>
                        <p style={s.payConfirmText}>
                          Mark R{period.outstanding.toFixed(2)} as paid to {viewHost.displayName}?
                          <br />
                          {formatDay(period.start)} – {formatDay(period.end)} · {period.bookings.filter(b => b.payout_status === 'pending_manual').length} booking{period.bookings.filter(b => b.payout_status === 'pending_manual').length === 1 ? '' : 's'}
                        </p>
                        <div style={s.payConfirmActions}>
                          <button style={s.cancelBtn} onClick={() => setConfirmPayPeriodKey(null)} disabled={isPaying}>Cancel</button>
                          <button style={s.saveBtn(isPaying)} onClick={() => markPeriodPaid(viewHost.id, period)} disabled={isPaying}>
                            {isPaying ? 'Marking…' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                        {period.outstanding !== period.total && (
                          <p style={s.outstandingLine}>Outstanding: R{period.outstanding.toFixed(2)}</p>
                        )}
                        <button style={s.markPaidBtn} onClick={() => setConfirmPayPeriodKey(period.key)}>
                          Mark R{period.outstanding.toFixed(2)} as Paid
                        </button>
                      </div>
                    )
                  ) : null}

                  {expanded && (
                    <div style={s.bookingList}>
                      {period.bookings
                        .slice()
                        .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? ''))
                        .map(b => (
                          <div key={b.id} style={s.bookingRow}>
                            <div>
                              <p style={s.bookingDate}>{b.drop_off_date}</p>
                              <p style={s.bookingBags}>{b.bag_count} bag{b.bag_count === 1 ? '' : 's'}</p>
                              <span style={s.payoutStatusPill(b.payout_status)}>{b.payout_status ?? 'unknown'}</span>
                            </div>
                            <p style={s.bookingAmount}>R{Number(b.host_payout_amount ?? 0).toFixed(2)}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.replace('/(admin)/dashboard')}>
          ← Back
        </button>
        <h1 style={s.heading}>Host Payouts</h1>
        <p style={s.subheading}>Weekly earnings and bank details for your Cubby partners</p>
      </div>

      <div style={s.splitCard}>
        <p style={s.splitTitle}>Payout Split</p>
        <div style={s.splitRow}>
          <div style={s.splitItem}>
            <p style={s.splitPct}>70%</p>
            <span style={s.splitLabel}>Host</span>
          </div>
          <div style={s.splitDivider} />
          <div style={s.splitItem}>
            <p style={s.splitPct}>30%</p>
            <span style={s.splitLabel}>Cubby</span>
          </div>
        </div>
      </div>

      {!!successMsg && <div style={s.successBox}>{successMsg}</div>}
      {!!errorMsg && !editingHostId && <div style={s.errorBox}>{errorMsg}</div>}

      {editingHostId && (
        <div style={s.editForm}>
          <h2 style={s.editTitle}>Bank details — {editingHost?.displayName}</h2>

          <label style={s.label}>Account Holder Name</label>
          <input
            style={s.input}
            value={form.accountHolder}
            onChange={e => setForm(f => ({ ...f, accountHolder: (e.target as any).value }))}
            placeholder="Full name on account"
          />

          <label style={s.label}>Bank</label>
          <select
            style={s.select}
            value={form.bank}
            onChange={e => selectBank((e.target as any).value)}
          >
            <option value="">Select bank…</option>
            {SA_BANKS.map(bank => (
              <option key={bank} value={bank}>{bank}{BRANCH_CODES[bank] ? ` — ${BRANCH_CODES[bank]}` : ''}</option>
            ))}
          </select>

          {form.branchCode ? <p style={s.branchHint}>Branch code: {form.branchCode}</p> : null}

          <label style={s.label}>Account Number</label>
          <input
            style={s.input}
            type="number"
            value={form.accountNumber}
            onChange={e => setForm(f => ({ ...f, accountNumber: (e.target as any).value }))}
            placeholder="e.g. 1234567890"
          />

          <label style={s.label}>Account Type</label>
          <div style={s.typeRow}>
            {['Cheque', 'Savings'].map(t => (
              <button key={t} style={s.typeChip(form.accountType === t)} onClick={() => setForm(f => ({ ...f, accountType: t }))}>
                {t}
              </button>
            ))}
          </div>

          {!!errorMsg && <div style={s.editErrorBox}>{errorMsg}</div>}

          <div style={s.modalActions}>
            <button style={s.cancelBtn} onClick={() => setEditingHostId(null)}>Cancel</button>
            <button style={s.saveBtn(saving)} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </div>
      )}

      {hosts.length === 0 ? (
        <div style={s.empty}>
          <span style={s.emptyEmoji}>🏦</span>
          <h2 style={s.emptyTitle}>No hosts yet</h2>
          <p style={s.emptySub}>Create host profiles first, then add their bank details here.</p>
          <button style={s.emptyBtn} onClick={() => router.replace('/(admin)/create-host')}>
            Create Host Profile
          </button>
        </div>
      ) : (
        <div style={s.list}>
          {hosts.map(host => {
            const details = bankDetails[host.id];
            const isConfirmingDelete = confirmDeleteId === host.id;
            return (
              <div key={host.id} style={s.card}>
                <div style={s.cardHeader}>
                  <div style={{ flex: 1 }}>
                    <p style={s.hostName}>{host.displayName}</p>
                    <p style={s.hostLocation}>{host.locationName}</p>
                    <p style={s.weekBadge}>This period: R{currentPeriodTotal(host.id).toFixed(2)}</p>
                  </div>
                  {details ? (
                    <div style={s.savedBadge}><span style={s.savedBadgeText}>✓ On file</span></div>
                  ) : (
                    <div style={s.missingBadge}><span style={s.missingBadgeText}>Missing</span></div>
                  )}
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
                  <button style={s.earningsBtn} onClick={() => setViewHostId(host.id)}>
                    View earnings →
                  </button>
                  <button style={s.editBtn} onClick={() => openEdit(host)}>
                    {details ? 'Edit details' : 'Add bank details'}
                  </button>
                  {details && (
                    isConfirmingDelete ? (
                      <div style={s.confirmRow}>
                        <span style={s.confirmText}>Sure?</span>
                        <button style={s.confirmYes} onClick={() => deleteDetails(host.id)}>Yes</button>
                        <button style={s.confirmNo} onClick={() => setConfirmDeleteId(null)}>No</button>
                      </div>
                    ) : (
                      <button style={s.removeBtn} onClick={() => setConfirmDeleteId(host.id)}>Remove</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}
