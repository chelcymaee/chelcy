import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/constants/colors';

type Period = 'week' | 'month';

const WEEK_DATA = {
  total: 680,
  deliveries: 9,
  avgPerDelivery: 76,
  breakdown: [
    { day: 'Mon', amount: 120, count: 2 },
    { day: 'Tue', amount: 60, count: 1 },
    { day: 'Wed', amount: 180, count: 3 },
    { day: 'Thu', amount: 0, count: 0 },
    { day: 'Fri', amount: 200, count: 2 },
    { day: 'Sat', amount: 120, count: 1 },
    { day: 'Sun', amount: 0, count: 0 },
  ],
};

const MONTH_DATA = {
  total: 2840,
  deliveries: 37,
  avgPerDelivery: 77,
  breakdown: [
    { day: 'Week 1', amount: 580, count: 8 },
    { day: 'Week 2', amount: 720, count: 9 },
    { day: 'Week 3', amount: 860, count: 11 },
    { day: 'Week 4', amount: 680, count: 9 },
  ],
};

export default function Earnings() {
  const [period, setPeriod] = useState<Period>('week');
  const data = period === 'week' ? WEEK_DATA : MONTH_DATA;
  const maxAmount = Math.max(...data.breakdown.map(b => b.amount), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Earnings</Text>
        </View>

        {/* Period toggle */}
        <View style={styles.toggleRow}>
          {(['week', 'month'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleBtn, period === p && styles.toggleBtnActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, period === p && styles.toggleBtnTextActive]}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{period === 'week' ? 'This week' : 'This month'}</Text>
          <Text style={styles.summaryAmount}>R{data.total.toLocaleString()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{data.deliveries}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>R{data.avgPerDelivery}</Text>
              <Text style={styles.statLabel}>Avg per trip</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>4.9</Text>
              <Text style={styles.statLabel}>Avg rating</Text>
            </View>
          </View>
        </View>

        {/* Bar chart */}
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <View style={styles.chartCard}>
          <View style={styles.barsRow}>
            {data.breakdown.map((item) => {
              const heightPct = item.amount > 0 ? (item.amount / maxAmount) * 100 : 4;
              return (
                <View key={item.day} style={styles.barCol}>
                  <Text style={styles.barAmount}>
                    {item.amount > 0 ? `R${item.amount}` : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: item.amount > 0 ? Colors.primary : Colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.day}</Text>
                  {item.count > 0 && (
                    <Text style={styles.barCount}>{item.count}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent deliveries */}
        <Text style={styles.sectionTitle}>Recent deliveries</Text>
        <View style={styles.recentList}>
          {[
            { id: '1', traveller: 'Sarah T.', bags: 2, amount: 120, date: 'Today, 10:30' },
            { id: '2', traveller: 'Luca B.', bags: 3, amount: 180, date: 'Today, 13:00' },
            { id: '3', traveller: 'Anika R.', bags: 1, amount: 60, date: 'Yesterday, 08:45' },
            { id: '4', traveller: 'Marco V.', bags: 2, amount: 120, date: 'Mon, 14:00' },
          ].map(item => (
            <View key={item.id} style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Text style={{ fontSize: 18 }}>🚗</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{item.traveller}</Text>
                <Text style={styles.recentSub}>{item.bags} bag{item.bags > 1 ? 's' : ''} · {item.date}</Text>
              </View>
              <Text style={styles.recentAmount}>R{item.amount}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  toggleBtnTextActive: { color: Colors.white },
  summaryCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryAmount: { fontSize: 36, fontWeight: '900', color: Colors.white, marginBottom: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 12 },
  chartCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    height: 180,
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmount: { fontSize: 8, color: Colors.textLight, marginBottom: 2, textAlign: 'center' },
  barTrack: { width: '100%', height: 100, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', marginTop: 4 },
  barCount: { fontSize: 9, color: Colors.textLight },
  recentList: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  recentSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  recentAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
});
