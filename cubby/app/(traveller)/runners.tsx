import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Runner } from '../../src/types';

const VEHICLE_EMOJI: Record<string, string> = {
  car: '🚗',
  suv: '🚙',
  bakkie: '🛻',
  motorbike: '🏍️',
};

const VEHICLE_LABEL: Record<string, string> = {
  car: 'Car',
  suv: 'SUV',
  bakkie: 'Bakkie',
  motorbike: 'Motorbike',
};

const MOCK_RUNNERS: Runner[] = [
  {
    id: '1',
    user_id: 'u1',
    display_name: 'Sipho M.',
    vehicle_type: 'car',
    max_bags: 4,
    price_per_bag_per_delivery: 60,
    current_area: 'Cape Town City Bowl',
    rating: 4.9,
    review_count: 34,
    is_available: true,
    created_at: '2024-01-01',
  },
  {
    id: '2',
    user_id: 'u2',
    display_name: 'Lerato K.',
    vehicle_type: 'suv',
    max_bags: 6,
    price_per_bag_per_delivery: 75,
    current_area: 'Sea Point & Waterfront',
    rating: 4.8,
    review_count: 21,
    is_available: true,
    created_at: '2024-01-01',
  },
  {
    id: '3',
    user_id: 'u3',
    display_name: 'Kyle P.',
    vehicle_type: 'bakkie',
    max_bags: 10,
    price_per_bag_per_delivery: 90,
    current_area: 'Airport & Southern Suburbs',
    rating: 4.7,
    review_count: 15,
    is_available: true,
    created_at: '2024-01-01',
  },
  {
    id: '4',
    user_id: 'u4',
    display_name: 'Amira J.',
    vehicle_type: 'motorbike',
    max_bags: 2,
    price_per_bag_per_delivery: 45,
    current_area: 'City Bowl & De Waterkant',
    rating: 4.6,
    review_count: 9,
    is_available: false,
    created_at: '2024-01-01',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ color: Colors.star, fontSize: 12 }}>★</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function RunnerCard({ runner, onBook }: { runner: Runner; onBook: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{VEHICLE_EMOJI[runner.vehicle_type]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.runnerName}>{runner.display_name}</Text>
          <Text style={styles.vehicleText}>
            {VEHICLE_EMOJI[runner.vehicle_type]} {VEHICLE_LABEL[runner.vehicle_type]} · up to {runner.max_bags} bags
          </Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>R{runner.price_per_bag_per_delivery}</Text>
          <Text style={styles.priceUnit}>/bag</Text>
        </View>
      </View>

      <Text style={styles.areaText}>📍 {runner.current_area}</Text>

      <View style={styles.statsRow}>
        <StarRating rating={runner.rating} />
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.statText}>{runner.review_count} reviews</Text>
        <Text style={styles.statSep}>·</Text>
        <View style={styles.availRow}>
          <View style={[styles.availDot, { backgroundColor: runner.is_available ? Colors.success : Colors.textLight }]} />
          <Text style={[styles.availText, { color: runner.is_available ? Colors.success : Colors.textLight }]}>
            {runner.is_available ? 'Available' : 'Offline'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bookBtn, !runner.is_available && styles.bookBtnDisabled]}
        onPress={onBook}
        disabled={!runner.is_available}
        activeOpacity={0.85}
      >
        <Text style={[styles.bookBtnText, !runner.is_available && styles.bookBtnTextDisabled]}>
          {runner.is_available ? 'Book Runner' : 'Currently Offline'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Runners() {
  const [runners] = useState<Runner[]>(MOCK_RUNNERS);

  function handleBook(runner: Runner) {
    Alert.alert(
      `Book ${runner.display_name}`,
      `R${runner.price_per_bag_per_delivery} per bag delivered. Booking flow coming soon!`,
      [{ text: 'OK' }],
    );
  }

  const available = runners.filter(r => r.is_available).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.replace('/(traveller)/explore')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.heading}>Bag Runners</Text>
          <Text style={styles.subheading}>{available} available near you</Text>
        </View>
      </View>

      <FlatList
        data={runners}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <RunnerCard runner={item} onBook={() => handleBook(item)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>No runners available{'\n'}Check back soon!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  back: { marginBottom: 12 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  subheading: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },
  runnerName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  vehicleText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  priceBadge: { alignItems: 'flex-end' },
  priceText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 10, color: Colors.textSecondary },
  areaText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  statSep: { color: Colors.textLight },
  statText: { fontSize: 12, color: Colors.textSecondary },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 12, fontWeight: '600' },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  bookBtnDisabled: { backgroundColor: Colors.border },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  bookBtnTextDisabled: { color: Colors.textLight },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
