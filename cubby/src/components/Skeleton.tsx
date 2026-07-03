import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// ─── Single shimmer bone ──────────────────────────────────────────────────────

interface BoneProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Bone({ width = '100%', height = 14, borderRadius = 8, style }: BoneProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EDEDEB', '#F7F6F4'],
  });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: bg }, style]}
    />
  );
}

// ─── Booking card skeleton ────────────────────────────────────────────────────

export function BookingCardSkeleton() {
  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <View style={{ flex: 1, gap: 6 }}>
          <Bone width="60%" height={16} borderRadius={8} />
          <Bone width="40%" height={12} borderRadius={6} />
        </View>
        <Bone width={80} height={24} borderRadius={8} />
      </View>
      <View style={S.cardDetails}>
        <Bone width="55%" height={12} borderRadius={6} />
        <Bone width="65%" height={12} borderRadius={6} />
        <Bone width="30%" height={12} borderRadius={6} />
        <Bone width="25%" height={12} borderRadius={6} />
      </View>
      <Bone width="100%" height={40} borderRadius={10} />
    </View>
  );
}

// ─── Message row skeleton ─────────────────────────────────────────────────────

export function MessageRowSkeleton() {
  return (
    <View style={S.msgRow}>
      <Bone width={50} height={50} borderRadius={25} />
      <View style={S.msgBody}>
        <Bone width="45%" height={14} borderRadius={7} />
        <Bone width="75%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <View style={S.msgRight}>
        <Bone width={36} height={11} borderRadius={5} />
      </View>
    </View>
  );
}

// ─── Host detail skeleton ─────────────────────────────────────────────────────

export function HostDetailSkeleton() {
  return (
    <View style={S.detailWrap}>
      {/* Back link placeholder */}
      <Bone width={120} height={14} borderRadius={7} style={{ marginBottom: 20 }} />

      {/* Hero block */}
      <View style={S.detailHero}>
        <Bone width={64} height={64} borderRadius={18} />
        <View style={{ flex: 1, gap: 8 }}>
          <Bone width="70%" height={20} borderRadius={8} />
          <Bone width="50%" height={13} borderRadius={6} />
          <Bone width="40%" height={13} borderRadius={6} />
        </View>
      </View>

      {/* Stats row */}
      <View style={S.detailStatsRow}>
        {[1, 2, 3].map(i => (
          <View key={i} style={S.detailStatBlock}>
            <Bone width={36} height={20} borderRadius={6} />
            <Bone width={52} height={11} borderRadius={5} style={{ marginTop: 5 }} />
          </View>
        ))}
      </View>

      {/* Bio lines */}
      <Bone width="100%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
      <Bone width="85%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
      <Bone width="60%" height={13} borderRadius={6} style={{ marginBottom: 20 }} />

      {/* Badge row */}
      <View style={S.detailBadgeRow}>
        {[1, 2, 3].map(i => <Bone key={i} width={80} height={28} borderRadius={14} />)}
      </View>

      {/* Availability section */}
      <Bone width={120} height={14} borderRadius={7} style={{ marginTop: 24, marginBottom: 12 }} />
      <View style={S.detailDayRow}>
        {[1, 2, 3, 4, 5, 6, 7].map(i => <Bone key={i} width={36} height={36} borderRadius={10} />)}
      </View>

      {/* Review stubs */}
      <Bone width={100} height={14} borderRadius={7} style={{ marginTop: 24, marginBottom: 12 }} />
      {[1, 2].map(i => (
        <View key={i} style={S.reviewStub}>
          <Bone width={36} height={36} borderRadius={18} />
          <View style={{ flex: 1, gap: 7 }}>
            <Bone width="40%" height={13} borderRadius={6} />
            <Bone width="80%" height={12} borderRadius={5} />
            <Bone width="60%" height={12} borderRadius={5} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Dashboard skeleton ───────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <View style={S.dashWrap}>
      {/* Stat tiles 2×2 */}
      <View style={S.statGrid}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={S.statTile}>
            <Bone width={52} height={28} borderRadius={8} />
            <Bone width={64} height={12} borderRadius={5} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Chart bars */}
      <View style={S.chartWrap}>
        <Bone width={110} height={14} borderRadius={7} style={{ marginBottom: 14 }} />
        <View style={S.chartBars}>
          {[60, 85, 45, 100, 70, 55, 80].map((pct, i) => (
            <View key={i} style={S.chartBarCol}>
              <View style={[S.chartBarTrack]}>
                <Bone width="100%" height={`${pct}%` as any} borderRadius={4} style={{ position: 'absolute', bottom: 0 }} />
              </View>
              <Bone width={24} height={10} borderRadius={4} style={{ marginTop: 5 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Booking rows */}
      <Bone width={140} height={14} borderRadius={7} style={{ marginBottom: 12 }} />
      {[1, 2].map(i => (
        <View key={i} style={S.dashBookingRow}>
          <Bone width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, gap: 7 }}>
            <Bone width="50%" height={14} borderRadius={7} />
            <Bone width="70%" height={12} borderRadius={5} />
          </View>
          <Bone width={60} height={26} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

// ─── Explore result card skeleton ─────────────────────────────────────────────

export function ExploreCardSkeleton() {
  return (
    <View style={S.exploreCard}>
      <Bone width={52} height={52} borderRadius={14} />
      <View style={{ flex: 1, gap: 7 }}>
        <Bone width={80} height={10} borderRadius={5} />
        <Bone width="70%" height={16} borderRadius={7} />
        <Bone width="50%" height={12} borderRadius={5} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
          <Bone width={50} height={11} borderRadius={5} />
          <Bone width={50} height={11} borderRadius={5} />
          <Bone width={60} height={11} borderRadius={5} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <Bone width={44} height={20} borderRadius={8} />
          <Bone width={60} height={20} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F0EAEA', gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardDetails: { gap: 8 },

  msgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
    backgroundColor: '#FFFFFF',
  },
  msgBody: { flex: 1, gap: 0 },
  msgRight: { alignItems: 'flex-end' },

  detailWrap: { padding: 20, gap: 0 },
  detailHero: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 16 },
  detailStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  detailStatBlock: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12 },
  detailBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  detailDayRow: { flexDirection: 'row', gap: 6 },
  reviewStub: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },

  dashWrap: { padding: 16, gap: 0 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statTile: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#F0EAEA',
  },
  chartWrap: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F0EAEA', marginBottom: 20,
  },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80 },
  chartBarCol: { flex: 1, alignItems: 'center' },
  chartBarTrack: {
    width: '100%', height: 70, backgroundColor: '#F3F4F6',
    borderRadius: 4, overflow: 'hidden', position: 'relative',
  },

  dashBookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F0EAEA', marginBottom: 10,
  },

  exploreCard: {
    flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
});
