import { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Platform,
  useSafeAreaInsets,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { MOCK_HOSTS } from '../../src/lib/mock-data';
import { Host } from '../../src/types';

const BUSINESS_FILTERS = ['All', 'Café', 'Hotel', 'Hostel', 'Guesthouse', 'Airbnb', 'Tour Operator'];

const typeEmoji: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

// Mini card shown in the bottom horizontal strip
function HostMiniCard({ host, highlighted, onPress }: { host: Host; highlighted: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.miniCard, highlighted && styles.miniCardHighlighted]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.miniCardRow}>
        <Text style={styles.miniCardEmoji}>{typeEmoji[host.business_type] ?? '📦'}</Text>
        <View style={styles.miniCardInfo}>
          <Text style={styles.miniCardName} numberOfLines={1}>{host.display_name}</Text>
          <Text style={styles.miniCardLocation} numberOfLines={1}>📍 {host.location_name}</Text>
          <View style={styles.miniCardBottomRow}>
            <View style={styles.miniPriceBadge}>
              <Text style={styles.miniPriceText}>R{host.price_per_bag_per_day}/day</Text>
            </View>
            <Text style={styles.miniRating}>★ {host.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Full card for the web/list fallback
function HostCard({ host, onPress }: { host: Host; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.cardImage}>
        <Text style={styles.cardImageEmoji}>{typeEmoji[host.business_type] ?? '📦'}</Text>
        <View style={styles.instantBadge}>
          <Text style={styles.instantBadgeText}>⚡ Instant Book</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>{host.display_name}</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>R{host.price_per_bag_per_day}</Text>
            <Text style={styles.priceUnit}>/bag/day</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.cardLocation}>📍 {host.location_name}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.starText}>★ {host.rating.toFixed(1)}</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statText}>{host.review_count} reviews</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Map-first layout (native only)
function MapFirstExplore({ filtered, search, setSearch, filter, setFilter }: {
  filtered: Host[];
  search: string;
  setSearch: (s: string) => void;
  filter: string;
  setFilter: (f: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Lazy import HostMap only on native to avoid web issues
  const HostMap = require('../../src/components/HostMap').default;

  function handlePinPress(hostId: string) {
    setSelectedId(hostId);
    const idx = filtered.findIndex(h => h.id === hostId);
    if (idx >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
    }
  }

  return (
    <View style={styles.mapContainer}>
      {/* Map fills entire screen */}
      <HostMap
        filtered={filtered}
        style={StyleSheet.absoluteFillObject}
        onPinPress={handlePinPress}
      />

      {/* Floating top bar */}
      <View style={[styles.floatingTop, { paddingTop: insets.top + 8 }]}>
        {/* Search box */}
        <View style={styles.floatingSearchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search Cape Town..."
            placeholderTextColor="#6B7280"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: '#6B7280' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
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
      </View>

      {/* Bottom cards strip */}
      <View style={[styles.bottomStrip, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.hostsNearLabel}>{filtered.length} hosts near you</Text>
        <FlatList
          ref={flatListRef}
          data={filtered}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled={false}
          contentContainerStyle={styles.miniCardList}
          renderItem={({ item }) => (
            <HostMiniCard
              host={item}
              highlighted={selectedId === item.id}
              onPress={() => router.push({ pathname: '/(traveller)/host-detail', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.miniEmpty}>
              <Text style={styles.miniEmptyText}>No hosts found. Try a different filter.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

// Web/list fallback
function ListExplore({ filtered, search, setSearch, filter, setFilter }: {
  filtered: Host[];
  search: string;
  setSearch: (s: string) => void;
  filter: string;
  setFilter: (f: string) => void;
}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.headerTitle}>Find storage near you</Text>
        </View>
        <View style={styles.locationChip}>
          <Text style={styles.locationChipText}>📍 Cape Town</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search Cape Town..."
            placeholderTextColor="#6B7280"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: '#6B7280' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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

      <Text style={styles.resultCount}>{filtered.length} hosts available</Text>

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
            <Text style={styles.emptyEmoji}>🚀</Text>
            <Text style={styles.emptyTitle}>Growing fast in Cape Town</Text>
            <Text style={styles.emptyText}>
              No hosts in this category yet — but we're signing up new hosts every day.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(traveller)/support')}>
              <Text style={styles.emptyBtnText}>Nominate a location</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
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
      || (filter === 'Hotel' && h.business_type === 'hotel')
      || (filter === 'Hostel' && h.business_type === 'hostel')
      || (filter === 'Guesthouse' && h.business_type === 'guesthouse')
      || (filter === 'Airbnb' && h.business_type === 'airbnb')
      || (filter === 'Tour Operator' && h.business_type === 'tour_operator');
    return matchSearch && matchFilter;
  });

  if (Platform.OS === 'web') {
    return (
      <ListExplore
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />
    );
  }

  return (
    <MapFirstExplore
      filtered={filtered}
      search={search}
      setSearch={setSearch}
      filter={filter}
      setFilter={setFilter}
    />
  );
}

const styles = StyleSheet.create({
  // Map-first styles
  mapContainer: { flex: 1 },
  floatingTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  floatingSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
    marginBottom: 10,
  },
  filterScroll: { },
  filterContent: { gap: 8 },
  bottomStrip: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 12,
  },
  hostsNearLabel: {
    fontSize: 13, fontWeight: '700', color: '#FFFFFF',
    marginLeft: 16, marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  miniCardList: { paddingHorizontal: 12, gap: 0 },
  miniCard: {
    width: 220, backgroundColor: '#FFFFFF', borderRadius: 16,
    marginLeft: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  miniCardHighlighted: {
    borderWidth: 2, borderColor: '#FF5C5C',
  },
  miniCardRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  miniCardEmoji: { fontSize: 28, lineHeight: 36 },
  miniCardInfo: { flex: 1 },
  miniCardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  miniCardLocation: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  miniCardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniPriceBadge: { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  miniPriceText: { fontSize: 12, fontWeight: '700', color: '#FF5C5C' },
  miniRating: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  miniEmpty: { width: 280, padding: 20, alignItems: 'center' },
  miniEmptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  // Shared filter chip styles
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  filterChipActive: { backgroundColor: '#FF5C5C', borderColor: '#FF5C5C' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },

  // Web/list layout styles
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  greeting: { fontSize: 14, color: '#6B7280' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 2 },
  locationChip: { backgroundColor: '#FF5C5C', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  filtersScroll: { marginBottom: 6 },
  filtersContent: { paddingHorizontal: 20, gap: 8 },
  resultCount: { paddingHorizontal: 20, fontSize: 13, color: '#6B7280', marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardImage: {
    height: 140, backgroundColor: '#FFF0F0', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  cardImageEmoji: { fontSize: 56 },
  instantBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#FF5C5C', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  instantBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  priceBadge: { alignItems: 'flex-end' },
  priceText: { fontSize: 16, fontWeight: '800', color: '#FF5C5C' },
  priceUnit: { fontSize: 10, color: '#6B7280' },
  locationRow: { marginBottom: 6 },
  cardLocation: { fontSize: 13, color: '#6B7280' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  statSep: { color: '#9CA3AF' },
  statText: { fontSize: 12, color: '#6B7280' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#FF5C5C', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
