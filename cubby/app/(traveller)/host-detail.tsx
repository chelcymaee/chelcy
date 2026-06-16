import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { MOCK_HOSTS, MOCK_REVIEWS } from '../../src/lib/mock-data';

export default function HostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const host = MOCK_HOSTS.find(h => h.id === id);
  const reviews = MOCK_REVIEWS.filter(r => r.host_id === id);
  const [bagCount, setBagCount] = useState(1);

  if (!host) return null;

  const typeEmoji: Record<string, string> = {
    cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡', airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
  };
  const typeLabel: Record<string, string> = {
    cafe: 'Café', hotel: 'Hotel', hostel: 'Hostel', guesthouse: 'Guesthouse',
    airbnb: 'Airbnb Host', tour_operator: 'Tour Operator', home: 'Private Home', other: 'Other',
  };

  const total = host.price_per_bag_per_day * bagCount;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{typeEmoji[host.business_type]}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Name + type */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{host.display_name}</Text>
              <Text style={styles.type}>{typeLabel[host.business_type]} · {host.location_name}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingNum}>{host.rating.toFixed(1)}</Text>
              <Text style={styles.ratingStar}>★</Text>
            </View>
          </View>

          {/* Stats chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Reviews</Text>
              <Text style={styles.chipValue}>{host.review_count}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Response</Text>
              <Text style={styles.chipValue}>{host.response_rate}%</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Max bags</Text>
              <Text style={styles.chipValue}>{host.max_bags}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Price/bag</Text>
              <Text style={styles.chipValue}>R{host.price_per_bag_per_day}</Text>
            </View>
          </View>

          {/* About */}
          <Text style={styles.sectionTitle}>About this host</Text>
          <Text style={styles.bio}>{host.bio}</Text>

          {/* Hours */}
          <Text style={styles.sectionTitle}>Opening hours</Text>
          <View style={styles.hoursBox}>
            <Text style={styles.hoursTime}>{host.available_from} – {host.available_until}</Text>
            <Text style={styles.hoursDays}>{host.available_days.join(', ')}</Text>
          </View>

          {/* Bag count */}
          <Text style={styles.sectionTitle}>How many bags?</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setBagCount(Math.max(1, bagCount - 1))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterVal}>{bagCount}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setBagCount(Math.min(host.max_bags, bagCount + 1))}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.counterDesc}>{bagCount === 1 ? 'bag' : 'bags'} · R{total} per day</Text>
          </View>

          {/* Reviews */}
          {reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent reviews</Text>
              <View style={styles.reviewsList}>
                {reviews.map(r => (
                  <View key={r.id} style={styles.review}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={{ fontSize: 16 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewName}>{r.reviewer_name}</Text>
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Text key={i} style={{ color: i < r.rating ? Colors.star : Colors.border, fontSize: 12 }}>★</Text>
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>{r.created_at.slice(0, 7)}</Text>
                    </View>
                    <Text style={styles.reviewComment}>{r.comment}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Book CTA */}
      <View style={styles.bookBar}>
        <View>
          <Text style={styles.bookPrice}>R{total} <Text style={styles.bookPriceSub}>/day · {bagCount} bag{bagCount > 1 ? 's' : ''}</Text></Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push({ pathname: '/(traveller)/booking', params: { hostId: id, bagCount: String(bagCount) } })}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>Book now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    height: 220,
    backgroundColor: '#D4EDE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 80 },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backBtnText: { fontSize: 20, color: Colors.textPrimary },
  body: { padding: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  type: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  ratingBox: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingNum: { fontSize: 16, fontWeight: '800', color: Colors.white },
  ratingStar: { fontSize: 14, color: Colors.star },
  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  chip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipLabel: { fontSize: 10, color: Colors.textLight, marginBottom: 2 },
  chipValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, marginTop: 4 },
  bio: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  hoursBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  hoursTime: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  hoursDays: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 22, color: Colors.white, fontWeight: '700' },
  counterVal: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, minWidth: 30, textAlign: 'center' },
  counterDesc: { fontSize: 14, color: Colors.textSecondary },
  reviewsList: { gap: 12 },
  review: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  reviewDate: { fontSize: 12, color: Colors.textLight },
  reviewComment: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  bookBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 20,
    paddingBottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookPrice: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  bookPriceSub: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },
  bookBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  bookBtnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
