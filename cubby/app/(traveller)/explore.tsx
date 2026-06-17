import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Switch,
} from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Colors } from '../../src/constants/colors';
import { MOCK_HOSTS } from '../../src/lib/mock-data';
import { Host } from '../../src/types';

const BUSINESS_FILTERS = ['All', 'Café', 'Hotel', 'Hostel', 'Guesthouse', 'Airbnb', 'Tour Operator'];
const SORT_OPTIONS = ['Nearest', 'Best rated', 'Cheapest'];

const typeEmoji: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

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
          <Text style={styles.distanceText}>0.4 km</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.starText}>★ {host.rating.toFixed(1)}</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statText}>{host.review_count} reviews</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.statText}>{host.response_rate}% response</Text>
        </View>

        <View style={styles.hoursRow}>
          <Text style={styles.hoursText}>🕐 {host.available_from} – {host.available_until}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✅ Verified</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Explore() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('Nearest');
  const [availableNow, setAvailableNow] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.headerTitle}>Find storage near you</Text>
        </View>
        <View style={styles.locationChip}>
          <Text style={styles.locationChipText}>📍 Cape Town</Text>
        </View>
      </View>

      {/* Social proof */}
      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>🧳 Trusted by 2,400+ travellers in Cape Town</Text>
      </View>

      {/* How it works */}
      {showHowItWorks && (
        <View style={styles.howItWorks}>
          <View style={styles.howStep}>
            <Text style={styles.howEmoji}>📍</Text>
            <Text style={styles.howText}>Find a host</Text>
          </View>
          <Text style={styles.howArrow}>→</Text>
          <View style={styles.howStep}>
            <Text style={styles.howEmoji}>🧳</Text>
            <Text style={styles.howText}>Drop your bags</Text>
          </View>
          <Text style={styles.howArrow}>→</Text>
          <View style={styles.howStep}>
            <Text style={styles.howEmoji}>🌍</Text>
            <Text style={styles.howText}>Explore freely</Text>
          </View>
          <TouchableOpacity onPress={() => setShowHowItWorks(false)} style={styles.howClose}>
            <Text style={styles.howCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search + available now */}
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

      {/* Available now toggle */}
      <View style={styles.availableRow}>
        <Text style={styles.availableLabel}>Available now</Text>
        <Switch
          value={availableNow}
          onValueChange={setAvailableNow}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sort === s && styles.sortChipActive]}
              onPress={() => setSort(s)}
            >
              <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>☰ List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>🗺️ Map</Text>
        </TouchableOpacity>
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

      <Text style={styles.resultCount}>{filtered.length} hosts available</Text>

      {viewMode === 'map' ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: -33.9249,
            longitude: 18.4241,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {filtered
            .filter(host => host.latitude != null && host.longitude != null)
            .map(host => (
              <Marker
                key={host.id}
                coordinate={{ latitude: host.latitude, longitude: host.longitude }}
              >
                <Callout
                  onPress={() => router.push({ pathname: '/(traveller)/host-detail', params: { id: host.id } })}
                >
                  <View style={{ padding: 8, maxWidth: 180 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14 }}>
                      {typeEmoji[host.business_type] ?? '📦'} {host.display_name}
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>
                      R{host.price_per_bag_per_day}/bag/day · ★ {host.rating.toFixed(1)}
                    </Text>
                    <Text style={{ color: '#FF5C5C', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                      Tap to view →
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
        </MapView>
      ) : (
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
                No hosts in this category yet — but we're signing up new hosts every day.{'\n\n'}
                Know a café, hotel, or guesthouse that should be on Cubby?
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(traveller)/support')}>
                <Text style={styles.emptyBtnText}>Nominate a location</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <View style={styles.runnerBanner}>
                <Text style={styles.runnerBannerEmoji}>🚗</Text>
                <Text style={styles.runnerBannerTitle}>Need bags collected & delivered?</Text>
                <Text style={styles.runnerBannerDesc}>
                  A Cubby Runner will pick up your bags and deliver them when you're ready. Perfect for airport transfers.
                </Text>
                <TouchableOpacity
                  style={styles.runnerBannerBtn}
                  onPress={() => router.push('/(traveller)/runners')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.runnerBannerBtnText}>Find a Bag Runner →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  locationChip: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationChipText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  socialProof: {
    backgroundColor: '#FFF8F0', marginHorizontal: 20, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: '#FFE4C4',
  },
  socialProofText: { fontSize: 13, fontWeight: '600', color: '#C2650A' },
  howItWorks: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    marginHorizontal: 20, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  howStep: { alignItems: 'center', flex: 1 },
  howEmoji: { fontSize: 20 },
  howText: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  howArrow: { fontSize: 14, color: Colors.textLight },
  howClose: { padding: 4 },
  howCloseText: { fontSize: 14, color: Colors.textLight },
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.border, gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  availableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    marginBottom: 10, gap: 8, flexWrap: 'wrap',
  },
  availableLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  sortRow: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end' },
  sortChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  sortTextActive: { color: Colors.white },
  viewToggle: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 8,
    backgroundColor: Colors.white, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  viewToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  viewToggleBtnActive: { backgroundColor: Colors.primary },
  viewToggleText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  viewToggleTextActive: { color: Colors.white },
  filtersScroll: { marginBottom: 6 },
  filtersContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  resultCount: { paddingHorizontal: 20, fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
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
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  instantBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  priceBadge: { alignItems: 'flex-end' },
  priceText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 10, color: Colors.textSecondary },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardLocation: { fontSize: 13, color: Colors.textSecondary },
  distanceText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  starText: { fontSize: 12, fontWeight: '700', color: Colors.star },
  statSep: { color: Colors.textLight },
  statText: { fontSize: 12, color: Colors.textSecondary },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursText: { fontSize: 12, color: Colors.textSecondary },
  verifiedBadge: { backgroundColor: '#F0FFF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  runnerBanner: {
    backgroundColor: '#FFF8F0', borderRadius: 18, padding: 18, marginTop: 8,
    borderWidth: 1, borderColor: '#FFE4C4',
  },
  runnerBannerEmoji: { fontSize: 32, marginBottom: 8 },
  runnerBannerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  runnerBannerDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  runnerBannerBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  runnerBannerBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
