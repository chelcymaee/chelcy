import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { MOCK_HOSTS } from '../../src/lib/mock-data';
import { Host } from '../../src/types';

const BUSINESS_FILTERS = ['All', 'Café', 'Home', 'Shop', 'Guesthouse'];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ color: Colors.star, fontSize: 12 }}>★</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function HostCard({ host, onPress }: { host: Host; onPress: () => void }) {
  const typeEmoji: Record<string, string> = {
    cafe: '☕', home: '🏠', shop: '🛍️', guesthouse: '🏨', other: '📦',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Photo placeholder */}
      <View style={styles.cardImage}>
        <Text style={styles.cardImageEmoji}>{typeEmoji[host.business_type]}</Text>
      </View>

      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>{host.display_name}</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>R{host.price_per_bag_per_day}</Text>
            <Text style={styles.priceUnit}>/bag/day</Text>
          </View>
        </View>

        <Text style={styles.cardLocation}>📍 {host.location_name}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StarRating rating={host.rating} />
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statText}>{host.review_count} reviews</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statText}>{host.response_rate}% response</Text>
        </View>

        {/* Hours */}
        <View style={styles.hoursRow}>
          <Text style={styles.hoursText}>🕐 {host.available_from} – {host.available_until}</Text>
          <View style={styles.availBadge}>
            <View style={styles.availDot} />
            <Text style={styles.availText}>Available</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Explore() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = MOCK_HOSTS.filter(h => {
    const matchSearch = h.display_name.toLowerCase().includes(search.toLowerCase())
      || h.location_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All'
      || (filter === 'Café' && h.business_type === 'cafe')
      || (filter === 'Home' && h.business_type === 'home')
      || (filter === 'Shop' && h.business_type === 'shop')
      || (filter === 'Guesthouse' && h.business_type === 'guesthouse');
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.headerTitle}>Find bag storage near you</Text>
        </View>
        <View style={styles.locationChip}>
          <Text style={styles.locationChipText}>📍 Cape Town</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or area…"
            placeholderTextColor={Colors.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: Colors.textLight }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {BUSINESS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <Text style={styles.resultCount}>{filtered.length} hosts available</Text>

      {/* Host list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <HostCard
            host={item}
            onPress={() => router.push({ pathname: '/(traveller)/host-detail', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No hosts found{'\n'}Try a different search</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  locationChip: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationChipText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  filtersScroll: { marginBottom: 8 },
  filtersContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  resultCount: { paddingHorizontal: 20, fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    height: 140,
    backgroundColor: '#EFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageEmoji: { fontSize: 56 },
  cardBody: { padding: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  priceBadge: { alignItems: 'flex-end' },
  priceText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 10, color: Colors.textSecondary },
  cardLocation: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  statSep: { color: Colors.textLight },
  statText: { fontSize: 12, color: Colors.textSecondary },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursText: { fontSize: 12, color: Colors.textSecondary },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  availText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
