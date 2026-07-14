import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, ScrollView, Platform, Modal,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Host } from '../../src/types';
import DatePickerModal, { todayISO, formatDateLabel } from '../../src/components/DatePickerModal';
import NotificationBell from '../../src/components/NotificationBell';
import { computeHostBadges, topBadges } from '../../src/lib/trust-badges';
import { formatResponseTimeShort } from '../../src/lib/response-rate';
import { rankHosts, rankingLabel, rankingReason, RankingSignals } from '../../src/lib/host-ranking';
import HostMapComponent from '../../src/components/HostMap';
import { getUserLocation, haversineMeters, formatDistance, formatWalkLabel, LatLon } from '../../src/lib/location';
import { ExploreCardSkeleton } from '../../src/components/Skeleton';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.78;
const SNAP_FULL = 0;
const SNAP_HALF = SHEET_H * 0.52;
const SNAP_PEEK = SHEET_H - 80;

// ─── Location landmarks ───────────────────────────────────────────────────────

const LANDMARKS = [
  { icon: '✈️', label: 'Cape Town International Airport', value: 'Cape Town Airport' },
  { icon: '🚢', label: 'Cape Town Cruise Terminal', value: 'V&A Waterfront, Cape Town' },
  { icon: '🚉', label: 'Cape Town Station', value: 'Cape Town Station' },
  { icon: '🏙️', label: 'V&A Waterfront', value: 'V&A Waterfront, Cape Town' },
  { icon: '🌊', label: 'Sea Point Promenade', value: 'Sea Point, Cape Town' },
  { icon: '🏖️', label: 'Clifton & Camps Bay', value: 'Camps Bay, Cape Town' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '7am–8am','8am–9am','9am–10am','10am–11am','11am–12pm',
  '12pm–1pm','1pm–2pm','2pm–3pm','3pm–4pm','4pm–5pm',
  '5pm–6pm','6pm–7pm','7pm–8pm','8pm–9pm',
];

const typeEmoji: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

const TYPE_LABELS: Record<string, string> = {
  cafe: 'Café', hotel: 'Hotel', hostel: 'Hostel', guesthouse: 'Guesthouse',
  airbnb: 'Airbnb', tour_operator: 'Tour Op', home: 'Home', other: 'Other',
};

type SortOption = 'recommended' | 'price_asc' | 'rating' | 'fastest' | 'most_trusted';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recommended', label: '✨ Recommended' },
  { id: 'price_asc',   label: '💰 Price: Low → High' },
  { id: 'rating',      label: '⭐ Rating' },
  { id: 'fastest',     label: '⚡ Fastest Response' },
  { id: 'most_trusted', label: '🛡️ Most Trusted' },
];

type ActiveFilters = {
  verifiedOnly: boolean;
  fastResponders: boolean;
  priceRange: 'any' | 'budget' | 'mid' | 'premium';
  hostType: string | null;
};

const DEFAULT_FILTERS: ActiveFilters = {
  verifiedOnly: false, fastResponders: false, priceRange: 'any', hostType: null,
};

// ─── Filter helpers ───────────────────────────────────────────────────────────

function isoToDayOfWeek(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(y, m - 1, d).getDay()];
}

function slotStartMinutes(slot: string): number {
  const part = slot.split('–')[0].trim().toLowerCase();
  const h = parseInt(part, 10);
  if (part.includes('pm') && h !== 12) return (h + 12) * 60;
  if (part.includes('am') && h === 12) return 0;
  return h * 60;
}

function hhmm(t: string): number {
  const [h, m] = (t ?? '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

function locationMatches(hostLoc: string, search: string): boolean {
  if (!search) return true;
  const stripped = search.toLowerCase()
    .replace(/,/g, ' ').replace(/south africa/g, '').replace(/cape town/g, '').trim();
  if (!stripped) return true;
  const words = stripped.split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return true;
  return words.some(w => hostLoc.toLowerCase().includes(w));
}

interface SearchParams {
  location: string; bags: number; selectedDate: string; dropOff: string; pickUp: string;
}

function applyFilters(all: Host[], p: SearchParams): Host[] {
  const day = isoToDayOfWeek(p.selectedDate);
  const dropMin = slotStartMinutes(p.dropOff);
  const pickMin = slotStartMinutes(p.pickUp);
  return all.filter(h => {
    if (!locationMatches(h.location_name, p.location)) return false;
    if (h.max_bags < p.bags) return false;
    const days: string[] = h.available_days ?? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    if (!days.includes(day)) return false;
    if (hhmm(h.available_from ?? '00:00') > dropMin) return false;
    if (hhmm(h.available_until ?? '23:59') < pickMin) return false;
    return true;
  });
}

type RankedHostCard = Host & { ranking_score: number; ranking_signals: RankingSignals };

function applySortAndSecondaryFilters(
  ranked: RankedHostCard[], sortBy: SortOption, filters: ActiveFilters,
): RankedHostCard[] {
  let out = ranked.filter(h => {
    if (filters.verifiedOnly && !h.owner_is_verified) return false;
    if (filters.fastResponders && (h.avg_response_time_minutes == null || h.avg_response_time_minutes > 60)) return false;
    if (filters.priceRange === 'budget' && h.price_per_bag_per_day > 100) return false;
    if (filters.priceRange === 'mid' && (h.price_per_bag_per_day <= 100 || h.price_per_bag_per_day > 200)) return false;
    if (filters.priceRange === 'premium' && h.price_per_bag_per_day <= 200) return false;
    if (filters.hostType && h.business_type !== filters.hostType) return false;
    return true;
  });
  switch (sortBy) {
    case 'price_asc': return [...out].sort((a, b) => a.price_per_bag_per_day - b.price_per_bag_per_day);
    case 'rating':    return [...out].sort((a, b) => b.rating - a.rating || b.review_count - a.review_count);
    case 'fastest':   return [...out].sort((a, b) => (a.avg_response_time_minutes ?? Infinity) - (b.avg_response_time_minutes ?? Infinity));
    case 'most_trusted': return [...out].sort((a, b) => {
      const s = (r: RankingSignals) => r.verificationPts + r.reviewCountPts + r.responseRatePts;
      return s(b.ranking_signals) - s(a.ranking_signals);
    });
    default: return out;
  }
}

function filtersAreDefault(f: ActiveFilters, s: SortOption) {
  return s === 'recommended' && !f.verifiedOnly && !f.fastResponders && f.priceRange === 'any' && !f.hostType;
}

function emptyState(filters: ActiveFilters): { emoji: string; title: string; sub: string } {
  if (filters.verifiedOnly)   return { emoji: '🔒', title: 'No verified hosts here yet', sub: 'Remove the "Verified" filter to see all spots.' };
  if (filters.fastResponders) return { emoji: '⚡', title: 'No fast responders found', sub: 'Remove the "Fast Responder" filter to see more options.' };
  if (filters.priceRange !== 'any') return { emoji: '💰', title: 'No hosts in this price range', sub: 'Try a different price range or clear the filter.' };
  if (filters.hostType) return { emoji: typeEmoji[filters.hostType] ?? '📦', title: `No ${TYPE_LABELS[filters.hostType] ?? filters.hostType} spots found`, sub: 'Remove the type filter to see all storage spots.' };
  return { emoji: '🔍', title: 'No storage spots found nearby', sub: 'Try expanding your search area or adjusting the date or time filters.' };
}

function normalizeHost(raw: any): Host {
  return {
    id: raw.id,
    user_id: raw.user_id ?? raw.id,
    display_name: raw.display_name ?? '',
    bio: raw.bio ?? '',
    business_type: raw.business_type ?? 'other',
    location_name: raw.location_name ?? '',
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    price_per_bag_per_day: raw.price_per_bag_per_day ?? 100,
    rating: raw.rating ?? 0,
    review_count: raw.review_count ?? 0,
    available_from: raw.available_from ?? '08:00',
    available_until: raw.available_until ?? '20:00',
    available_days: raw.available_days ?? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    max_bags: raw.max_bags ?? 10,
    photos: raw.photos ?? [],
    is_active: raw.is_active ?? true,
    storage_features: raw.storage_features ?? [],
    response_rate: raw.response_rate ?? null,
    avg_response_time_minutes: raw.avg_response_time_minutes ?? null,
    total_requests: raw.total_requests ?? 0,
    responded_requests: raw.responded_requests ?? 0,
    owner_is_verified: raw.owner_is_verified ?? false,
    created_at: raw.created_at ?? new Date().toISOString(),
  };
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────

function TimePickerModal({ visible, title, selected, onSelect, onClose }: {
  visible: boolean; title: string; selected: string;
  onSelect: (t: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}
        // @ts-ignore
        onClick={onClose}>
        <View style={S.modalSheet}>
          <View style={S.modalHandle} />
          <Text style={S.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {TIME_SLOTS.map(slot => {
              const fn = () => { onSelect(slot); onClose(); };
              return (
                <TouchableOpacity key={slot} style={[S.timeSlotRow, selected === slot && S.timeSlotRowActive]}
                  onPress={fn}
                  // @ts-ignore
                  onClick={fn}>
                  <Text style={[S.timeSlotText, selected === slot && S.timeSlotTextActive]}>{slot}</Text>
                  {selected === slot && <Text style={S.timeSlotCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Location Modal (with recents + landmarks) ────────────────────────────────

function LocationModal({ visible, onSelect, onClose }: {
  visible: boolean; onSelect: (l: string) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setDraft('');
      AsyncStorage.getItem('cubby_recent_locations').then(r => {
        setRecents(r ? JSON.parse(r) : []);
      }).catch(() => {});
    }
  }, [visible]);

  async function select(loc: string) {
    try {
      const updated = [loc, ...recents.filter(r => r !== loc)].slice(0, 4);
      await AsyncStorage.setItem('cubby_recent_locations', JSON.stringify(updated));
    } catch {}
    onSelect(loc);
    onClose();
  }

  const shownLandmarks = draft.trim().length > 1
    ? LANDMARKS.filter(l => l.label.toLowerCase().includes(draft.toLowerCase()) || l.value.toLowerCase().includes(draft.toLowerCase()))
    : LANDMARKS;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}
        // @ts-ignore
        onClick={onClose}>
        <View style={[S.modalSheet, { paddingBottom: 40 }]}>
          <View style={S.modalHandle} />
          <Text style={S.modalTitle}>Where to?</Text>

          {/* Search input */}
          <View style={S.locInputRow}>
            <Text style={{ fontSize: 18 }}>📍</Text>
            <TextInput
              style={S.locInput}
              value={draft}
              onChangeText={setDraft}
              autoFocus
              placeholder="Search a place or neighbourhood…"
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={() => draft.trim() && select(draft.trim())}
              returnKeyType="search"
            />
            {draft.length > 0 && (
              <TouchableOpacity onPress={() => setDraft('')}
                // @ts-ignore
                onClick={() => setDraft('')}>
                <Text style={{ color: '#9CA3AF', fontSize: 18, paddingLeft: 6 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recent searches */}
          {recents.length > 0 && draft.length === 0 && (
            <>
              <Text style={S.locSection}>Recent</Text>
              {recents.map(r => {
                const fn = () => select(r);
                return (
                  <TouchableOpacity key={r} style={S.locRow} onPress={fn}
                    // @ts-ignore
                    onClick={fn}>
                    <Text style={S.locRowIcon}>🕐</Text>
                    <Text style={S.locRowText} numberOfLines={1}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Landmarks / popular spots */}
          <Text style={S.locSection}>
            {draft.trim().length > 1 ? 'Suggestions' : 'Popular spots'}
          </Text>
          {shownLandmarks.map(l => {
            const fn = () => select(l.value);
            return (
              <TouchableOpacity key={l.label} style={S.locRow} onPress={fn}
                // @ts-ignore
                onClick={fn}>
                <Text style={S.locRowIcon}>{l.icon}</Text>
                <Text style={S.locRowText}>{l.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Location Permission Card ─────────────────────────────────────────────────

function LocationPermissionCard({ onEnable, onDecline }: {
  onEnable: () => void; onDecline: () => void;
}) {
  return (
    <Modal visible transparent animationType="slide">
      <View style={S.permOverlay}>
        <View style={S.permCard}>
          <View style={S.permIconCircle}>
            <Text style={S.permIconText}>📍</Text>
          </View>
          <Text style={S.permTitle}>Find luggage storage near you</Text>
          <Text style={S.permBody}>
            Allow location access to instantly discover secure luggage storage spots around you, sorted by distance.
          </Text>
          <TouchableOpacity style={S.permPrimary} onPress={onEnable}
            // @ts-ignore
            onClick={onEnable}
            activeOpacity={0.88}>
            <Text style={S.permPrimaryText}>Enable Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.permSecondary} onPress={onDecline}
            // @ts-ignore
            onClick={onDecline}>
            <Text style={S.permSecondaryText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ host, sortBy, onPress, userLocation, isClosest }: {
  host: RankedHostCard; sortBy: SortOption; onPress: () => void;
  userLocation?: LatLon | null; isClosest?: boolean;
}) {
  const cardBadges = topBadges(computeHostBadges(host), 2);
  const responseTimeShort = formatResponseTimeShort(host.avg_response_time_minutes ?? null, host.responded_requests ?? 0);
  const rlabel = rankingLabel(host.ranking_signals, host);
  const reason = sortBy === 'recommended' ? rankingReason(host.ranking_signals, host) : null;
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = host.photos?.[0];

  const distInfo = useMemo(() => {
    if (!userLocation || !host.latitude || !host.longitude) return null;
    const m = haversineMeters(userLocation, { lat: host.latitude, lon: host.longitude });
    return { distance: formatDistance(m), walk: formatWalkLabel(m) };
  }, [userLocation, host.latitude, host.longitude]);

  return (
    <TouchableOpacity style={S.resultCard} onPress={onPress}
      // @ts-ignore
      onClick={onPress} activeOpacity={0.92}>
      <View style={S.resultCardLeft}>
        <View style={S.resultEmojiBox}>
          {photoUrl && !photoFailed ? (
            <Image source={{ uri: photoUrl }} style={S.resultCardImage} onError={() => setPhotoFailed(true)} />
          ) : (
            <Text style={S.resultEmoji}>{typeEmoji[host.business_type] ?? '📦'}</Text>
          )}
        </View>
      </View>
      <View style={S.resultCardBody}>
        <Text style={S.resultLabel}>STORAGE IN</Text>
        <Text style={S.resultName}>{host.display_name}</Text>
        <Text style={S.resultLocation}>{host.location_name}</Text>
        {distInfo && <Text style={S.resultDist}>📍 {distInfo.distance} away</Text>}
        <View style={S.resultStatsRow}>
          <Text style={S.resultStar}>★ {host.rating.toFixed(1)}</Text>
          <Text style={S.resultSep}>·</Text>
          <Text style={S.resultStat}>{host.review_count} reviews</Text>
          <Text style={S.resultSep}>·</Text>
          <Text style={S.resultPrice}>R{host.price_per_bag_per_day}/bag/day</Text>
          {distInfo && (
            <>
              <Text style={S.resultSep}>·</Text>
              <Text style={S.resultStat}>🚶 {distInfo.walk}</Text>
            </>
          )}
        </View>
        {responseTimeShort && <Text style={S.resultResponse}>⚡ {responseTimeShort}</Text>}
        {reason && <Text style={S.resultReason}>{reason}</Text>}
        <View style={S.resultBadgeRow}>
          <View style={S.openBadge}><Text style={S.openBadgeText}>OPEN</Text></View>
          {isClosest && <View style={S.closestBadge}><Text style={S.closestBadgeText}>CLOSEST</Text></View>}
          {rlabel && (
            <View style={[S.trustChip, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[S.trustChipText, { color: '#15803D' }]}>{rlabel}</Text>
            </View>
          )}
          {cardBadges.map(b => (
            <View key={b.id} style={[S.trustChip, { backgroundColor: b.bg }]}>
              <Text style={[S.trustChipText, { color: b.color }]}>{b.emoji} {b.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Runner Card ──────────────────────────────────────────────────────────────

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Explore() {
  // ── Data state ──
  const [allHosts, setAllHosts] = useState<RankedHostCard[]>([]);
  const [userLocation, setUserLocation] = useState<LatLon | null>(null);

  // ── Filter state ──
  const [location, setLocation] = useState('Cape Town, South Africa');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dropOff, setDropOff] = useState('9am–10am');
  const [pickUp, setPickUp] = useState('5pm–6pm');
  const [bags, setBags] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);

  // ── Loading state ──
  const [loading, setLoading] = useState(true);

  // ── Modal state ──
  const [showPermCard, setShowPermCard] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDropOff, setShowDropOff] = useState(false);
  const [showPickUp, setShowPickUp] = useState(false);

  // ── Bottom sheet (native only) ──
  const sheetAnim = useRef(new Animated.Value(SNAP_HALF)).current;
  const sheetSnapRef = useRef(SNAP_HALF);

  function snapSheet(pos: number) {
    sheetSnapRef.current = pos;
    Animated.spring(sheetAnim, {
      toValue: pos, useNativeDriver: true, tension: 65, friction: 14,
    }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => {
        const newY = Math.max(SNAP_FULL, Math.min(SNAP_PEEK, sheetSnapRef.current + g.dy));
        sheetAnim.setValue(newY);
      },
      onPanResponderRelease: (_, g) => {
        const projected = sheetSnapRef.current + g.dy;
        const vy = g.vy;
        let target: number;
        if (vy > 0.8) {
          target = sheetSnapRef.current === SNAP_FULL ? SNAP_HALF : SNAP_PEEK;
        } else if (vy < -0.8) {
          target = sheetSnapRef.current === SNAP_PEEK ? SNAP_HALF : SNAP_FULL;
        } else {
          const snaps = [SNAP_FULL, SNAP_HALF, SNAP_PEEK];
          target = snaps.reduce((best, s) =>
            Math.abs(projected - s) < Math.abs(projected - best) ? s : best, SNAP_PEEK);
        }
        snapSheet(target);
      },
    }),
  ).current;

  // ── Load hosts ────────────────────────────────────────────────────────────

  useFocusEffect(useCallback(() => {
    loadHosts();
    // Show location permission card once on native
    if (Platform.OS !== 'web') {
      AsyncStorage.getItem('cubby_location_prompted').then(val => {
        if (!val) setShowPermCard(true);
      }).catch(() => {});
    } else {
      // On web, silently try to get location (no prompt)
      getUserLocation().then(loc => { if (loc) setUserLocation(loc); }).catch(() => {});
    }
  }, []));

  async function loadHosts() {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('hosts').select('*').eq('is_active', true)
          .order('created_at', { ascending: false });
        if (data) { setAllHosts(rankHosts(data.map(normalizeHost))); return; }
      }
      const raw = await AsyncStorage.getItem('cubby_hosts');
      if (raw) setAllHosts(rankHosts(JSON.parse(raw).map(normalizeHost).filter((h: Host) => h.is_active)));
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleEnableLocation() {
    await AsyncStorage.setItem('cubby_location_prompted', '1').catch(() => {});
    setShowPermCard(false);
    const loc = await getUserLocation();
    if (loc) setUserLocation(loc);
  }

  async function handleDeclineLocation() {
    await AsyncStorage.setItem('cubby_location_prompted', '1').catch(() => {});
    setShowPermCard(false);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const params = useMemo<SearchParams>(() => ({
    location, bags, selectedDate, dropOff, pickUp,
  }), [location, bags, selectedDate, dropOff, pickUp]);

  const displayed = useMemo(() => {
    const base = applyFilters(allHosts, params);
    return applySortAndSecondaryFilters(base as RankedHostCard[], sortBy, filters);
  }, [allHosts, params, sortBy, filters]);

  const closestId = useMemo(() => {
    if (!userLocation) return null;
    let minId = '', minDist = Infinity;
    for (const h of displayed) {
      if (h.latitude && h.longitude) {
        const d = haversineMeters(userLocation, { lat: h.latitude, lon: h.longitude });
        if (d < minDist) { minDist = d; minId = h.id; }
      }
    }
    return minId || null;
  }, [userLocation, displayed]);

  const hasActiveFilters = !filtersAreDefault(filters, sortBy);

  const presentTypes = useMemo(() => {
    const s = new Set(allHosts.map(h => h.business_type));
    return ['cafe', 'hotel', 'hostel', 'guesthouse', 'airbnb'].filter(t => s.has(t));
  }, [allHosts]);

  const toggle = (key: keyof ActiveFilters, value: any) =>
    setFilters(f => ({ ...f, [key]: f[key] === value ? DEFAULT_FILTERS[key] : value }));

  const cycleBags = () => setBags(n => n === 8 ? 1 : n + 1);

  const dropOffLabel = dropOff.split('–')[0];
  const pickUpLabel = pickUp.split('–')[0];

  const es = emptyState(filters);

  // ── Filter chips ──────────────────────────────────────────────────────────

  const filterChipsContent = (
    <>
      {/* Verified */}
      {(() => {
        const active = filters.verifiedOnly;
        const fn = () => setFilters(f => ({ ...f, verifiedOnly: !f.verifiedOnly }));
        return (
          <TouchableOpacity style={[S.filterChip, active && S.filterChipActive]} onPress={fn}
            // @ts-ignore
            onClick={fn}>
            <Text style={[S.filterChipText, active && S.filterChipTextActive]}>🔒 Verified</Text>
          </TouchableOpacity>
        );
      })()}
      {/* Fast */}
      {(() => {
        const active = filters.fastResponders;
        const fn = () => setFilters(f => ({ ...f, fastResponders: !f.fastResponders }));
        return (
          <TouchableOpacity style={[S.filterChip, active && S.filterChipActive]} onPress={fn}
            // @ts-ignore
            onClick={fn}>
            <Text style={[S.filterChipText, active && S.filterChipTextActive]}>⚡ Fast</Text>
          </TouchableOpacity>
        );
      })()}
      {/* Price ranges */}
      {(['budget', 'mid', 'premium'] as const).map(range => {
        const labels = { budget: '💰 Under R100', mid: '💳 R100–200', premium: '💎 R200+' };
        const active = filters.priceRange === range;
        const fn = () => toggle('priceRange', range);
        return (
          <TouchableOpacity key={range} style={[S.filterChip, active && S.filterChipActive]} onPress={fn}
            // @ts-ignore
            onClick={fn}>
            <Text style={[S.filterChipText, active && S.filterChipTextActive]}>{labels[range]}</Text>
          </TouchableOpacity>
        );
      })}
      {/* Host types */}
      {presentTypes.map(type => {
        const active = filters.hostType === type;
        const fn = () => toggle('hostType', type);
        return (
          <TouchableOpacity key={type} style={[S.filterChip, active && S.filterChipActive]} onPress={fn}
            // @ts-ignore
            onClick={fn}>
            <Text style={[S.filterChipText, active && S.filterChipTextActive]}>{typeEmoji[type]} {TYPE_LABELS[type]}</Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  // ── Sort chips ────────────────────────────────────────────────────────────

  const sortChipsContent = SORT_OPTIONS.map(opt => {
    const active = sortBy === opt.id;
    const fn = () => setSortBy(opt.id);
    return (
      <TouchableOpacity key={opt.id} style={[S.sortChip, active && S.sortChipActive]} onPress={fn}
        // @ts-ignore
        onClick={fn}>
        <Text style={[S.sortChipText, active && S.sortChipTextActive]}>{opt.label}</Text>
      </TouchableOpacity>
    );
  });

  // ── Host list content ─────────────────────────────────────────────────────

  const hostListContent = loading ? (
    [1, 2, 3].map(i => <ExploreCardSkeleton key={i} />)
  ) : displayed.length === 0 ? (
    <View style={S.empty}>
      <Text style={S.emptyEmoji}>{es.emoji}</Text>
      <Text style={S.emptyTitle}>{es.title}</Text>
      <Text style={S.emptyText}>{es.sub}</Text>
      {hasActiveFilters && (
        <TouchableOpacity style={S.clearFiltersBtn}
          onPress={() => { setFilters(DEFAULT_FILTERS); setSortBy('recommended'); }}
          // @ts-ignore
          onClick={() => { setFilters(DEFAULT_FILTERS); setSortBy('recommended'); }}>
          <Text style={S.clearFiltersBtnText}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  ) : (
    displayed.map(host => (
      <ResultCard
        key={host.id}
        host={host}
        sortBy={sortBy}
        userLocation={userLocation}
        isClosest={closestId === host.id}
        onPress={() => router.push({ pathname: '/(traveller)/host-detail', params: { id: host.id, selectedDate } })}
      />
    ))
  );

  // ─────────────────────────────────────────────────────────────────────────
  // NATIVE LAYOUT: map fills background, bottom sheet floats over it
  // ─────────────────────────────────────────────────────────────────────────

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={S.container}>
        <View style={{ flex: 1 }}>
          {/* ── Map (fills background) ── */}
          <View style={StyleSheet.absoluteFill}>
            <HostMapComponent
              filtered={displayed}
              userLocation={userLocation}
              onPinPress={id => {
                router.push({ pathname: '/(traveller)/host-detail', params: { id, selectedDate } });
              }}
            />
          </View>

          {/* ── Floating top search bar ── */}
          <View style={S.topBarNative}>
            {/* Location row */}
            <TouchableOpacity style={S.searchPill} onPress={() => setShowLocation(true)}
              // @ts-ignore
              onClick={() => setShowLocation(true)} activeOpacity={0.88}>
              <Text style={S.searchPillIcon}>📍</Text>
              <Text style={S.searchPillText} numberOfLines={1}>{location}</Text>
              <NotificationBell variant="traveller" />
            </TouchableOpacity>

            {/* Compact filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={S.filterChipScroll} contentContainerStyle={S.filterChipScrollContent}>
              {/* Date chip */}
              {(() => {
                const fn = () => setShowDatePicker(true);
                return (
                  <TouchableOpacity style={S.compactChip} onPress={fn}
                    // @ts-ignore
                    onClick={fn}>
                    <Text style={S.compactChipText}>📅 {formatDateLabel(selectedDate)}</Text>
                  </TouchableOpacity>
                );
              })()}
              {/* Drop-off */}
              {(() => {
                const fn = () => setShowDropOff(true);
                return (
                  <TouchableOpacity style={S.compactChip} onPress={fn}
                    // @ts-ignore
                    onClick={fn}>
                    <Text style={S.compactChipText}>⬇ {dropOffLabel}</Text>
                  </TouchableOpacity>
                );
              })()}
              {/* Pick-up */}
              {(() => {
                const fn = () => setShowPickUp(true);
                return (
                  <TouchableOpacity style={S.compactChip} onPress={fn}
                    // @ts-ignore
                    onClick={fn}>
                    <Text style={S.compactChipText}>⬆ {pickUpLabel}</Text>
                  </TouchableOpacity>
                );
              })()}
              {/* Bags (cycles on tap) */}
              <TouchableOpacity style={S.compactChip} onPress={cycleBags}
                // @ts-ignore
                onClick={cycleBags}>
                <Text style={S.compactChipText}>🎒 {bags} bag{bags > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
              {/* Clear all if active */}
              {hasActiveFilters && (
                <TouchableOpacity style={[S.compactChip, S.compactChipClear]}
                  onPress={() => { setFilters(DEFAULT_FILTERS); setSortBy('recommended'); }}
                  // @ts-ignore
                  onClick={() => { setFilters(DEFAULT_FILTERS); setSortBy('recommended'); }}>
                  <Text style={S.compactChipClearText}>✕ Clear</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* ── Draggable bottom sheet ── */}
          <Animated.View style={[S.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            {/* Drag handle area */}
            <View style={S.sheetHandle} {...panResponder.panHandlers}>
              <View style={S.sheetHandleBar} />
              <Text style={S.sheetCount}>
                {loading ? 'Finding storage spots…' : `${displayed.length} storage spot${displayed.length !== 1 ? 's' : ''} near you`}
              </Text>
            </View>

            {/* Sort chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={S.sortRow} contentContainerStyle={S.sortRowContent}>
              {sortChipsContent}
            </ScrollView>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={S.filterRow} contentContainerStyle={S.filterRowContent}>
              {filterChipsContent}
            </ScrollView>

            {/* Host list — nestedScrollEnabled so it scrolls independently */}
            <ScrollView style={S.sheetList} showsVerticalScrollIndicator={false}
              nestedScrollEnabled contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
              {hostListContent}
              <View style={{ height: 20 }} />
            </ScrollView>
          </Animated.View>
        </View>

        {/* ── Modals ── */}
        <LocationModal visible={showLocation} onSelect={setLocation} onClose={() => setShowLocation(false)} />
        <DatePickerModal visible={showDatePicker} selected={selectedDate} onSelect={setSelectedDate} onClose={() => setShowDatePicker(false)} />
        <TimePickerModal visible={showDropOff} title="Drop-off Time" selected={dropOff} onSelect={setDropOff} onClose={() => setShowDropOff(false)} />
        <TimePickerModal visible={showPickUp} title="Pick-up Time" selected={pickUp} onSelect={setPickUp} onClose={() => setShowPickUp(false)} />

        {/* ── Location permission card (first launch only) ── */}
        {showPermCard && (
          <LocationPermissionCard onEnable={handleEnableLocation} onDecline={handleDeclineLocation} />
        )}
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEB LAYOUT: search bar + map (top) + host list (below)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={S.container}>
      {/* Top bar */}
      <View style={S.topBarWeb}>
        <TouchableOpacity style={S.webSearchPill} onPress={() => setShowLocation(true)}
          // @ts-ignore
          onClick={() => setShowLocation(true)} activeOpacity={0.88}>
          <Text style={S.searchPillIcon}>📍</Text>
          <Text style={S.searchPillText} numberOfLines={1}>{location}</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 44 }} contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 4, gap: 6, flexDirection: 'row', alignItems: 'center' }}>
          {(() => {
            const fn = () => setShowDatePicker(true);
            return <TouchableOpacity style={S.compactChip} onPress={fn}
              // @ts-ignore
              onClick={fn}><Text style={S.compactChipText}>📅 {formatDateLabel(selectedDate)}</Text></TouchableOpacity>;
          })()}
          {(() => {
            const fn = () => setShowDropOff(true);
            return <TouchableOpacity style={S.compactChip} onPress={fn}
              // @ts-ignore
              onClick={fn}><Text style={S.compactChipText}>⬇ {dropOffLabel}</Text></TouchableOpacity>;
          })()}
          {(() => {
            const fn = () => setShowPickUp(true);
            return <TouchableOpacity style={S.compactChip} onPress={fn}
              // @ts-ignore
              onClick={fn}><Text style={S.compactChipText}>⬆ {pickUpLabel}</Text></TouchableOpacity>;
          })()}
          <TouchableOpacity style={S.compactChip} onPress={cycleBags}
            // @ts-ignore
            onClick={cycleBags}><Text style={S.compactChipText}>🎒 {bags}</Text></TouchableOpacity>
          {sortChipsContent}
          {filterChipsContent}
        </ScrollView>

        <View style={{ marginLeft: 'auto' as any }}>
          <NotificationBell variant="traveller" />
        </View>
      </View>

      {/* Map */}
      <View style={S.webMap}>
        <HostMapComponent
          filtered={displayed}
          userLocation={userLocation}
          onPinPress={id => router.push({ pathname: '/(traveller)/host-detail', params: { id, selectedDate } })}
        />
      </View>

      {/* Result count */}
      <Text style={[S.sheetCount, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 0, backgroundColor: '#FAFAFA' }]}>
        {loading ? 'Finding storage spots…' : `${displayed.length} storage spot${displayed.length !== 1 ? 's' : ''} near you`}
      </Text>

      {/* Host list */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} showsVerticalScrollIndicator={false}>
        {hostListContent}
      </ScrollView>

      {/* Modals */}
      <LocationModal visible={showLocation} onSelect={setLocation} onClose={() => setShowLocation(false)} />
      <DatePickerModal visible={showDatePicker} selected={selectedDate} onSelect={setSelectedDate} onClose={() => setShowDatePicker(false)} />
      <TimePickerModal visible={showDropOff} title="Drop-off Time" selected={dropOff} onSelect={setDropOff} onClose={() => setShowDropOff(false)} />
      <TimePickerModal visible={showPickUp} title="Pick-up Time" selected={pickUp} onSelect={setPickUp} onClose={() => setShowPickUp(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EEE9' },

  // ── Native top bar (floats over map) ──
  topBarNative: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 20,
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 8,
  },
  searchPillIcon: { fontSize: 18 },
  searchPillText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  filterChipScroll: { maxHeight: 38 },
  filterChipScrollContent: {
    gap: 8, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center',
  },
  compactChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  compactChipText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  compactChipClear: { backgroundColor: '#FFF0F0' },
  compactChipClearText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  // ── Bottom sheet ──
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_H,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 20,
    overflow: 'hidden',
  },
  sheetHandle: {
    paddingTop: 10, paddingBottom: 12, paddingHorizontal: 20,
    alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },
  sheetHandleBar: {
    width: 36, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2,
  },
  sheetCount: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  sheetList: { flex: 1 },

  // ── Sort & filter rows ──
  sortRow: {
    backgroundColor: '#FFFFFF', borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA', maxHeight: 46,
  },
  sortRowContent: {
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  sortChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  sortChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' } as any,
  sortChipTextActive: { color: '#FFFFFF' },

  filterRow: {
    backgroundColor: '#FAFAFA', borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA', maxHeight: 42,
  },
  filterRowContent: {
    paddingHorizontal: 14, paddingVertical: 6, gap: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' } as any,
  filterChipTextActive: { color: '#1D4ED8' },

  // ── Web layout ──
  topBarWeb: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 3,
  },
  webSearchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, minWidth: 200,
  },
  webMap: { height: SCREEN_H * 0.45 },

  // ── Modals ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },

  timeSlotRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },
  timeSlotRowActive: { backgroundColor: '#FFF0F0', borderRadius: 10, paddingHorizontal: 10 },
  timeSlotText: { fontSize: 16, color: '#1A1A1A' },
  timeSlotTextActive: { fontWeight: '700', color: '#FF5C5C' },
  timeSlotCheck: { fontSize: 16, color: '#FF5C5C', fontWeight: '700' },

  locInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FAFAFA', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#F0EAEA', marginBottom: 8,
  },
  locInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  locSection: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 16, marginBottom: 6, paddingHorizontal: 4,
  },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },
  locRowIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  locRowText: { fontSize: 15, color: '#1A1A1A', flex: 1 },

  // ── Location permission card ──
  permOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  permCard: {
    backgroundColor: '#FFFFFF', borderRadius: 28,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 30, elevation: 20,
    marginBottom: 8,
  },
  permIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  permIconText: { fontSize: 36 },
  permTitle: {
    fontSize: 22, fontWeight: '800', color: '#1A1A1A',
    textAlign: 'center', marginBottom: 12,
  },
  permBody: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  permPrimary: {
    width: '100%', backgroundColor: '#FF5C5C',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#FF5C5C', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginBottom: 12,
  },
  permPrimaryText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  permSecondary: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  permSecondaryText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },

  // ── Result cards ──
  resultCard: {
    flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  resultCardLeft: { justifyContent: 'flex-start', paddingTop: 2 },
  resultEmojiBox: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF0F0',
    alignItems: 'center', justifyContent: 'center',
  },
  resultEmoji: { fontSize: 26 },
  resultCardImage: { width: 52, height: 52, borderRadius: 14 },
  resultCardBody: { flex: 1 },
  resultLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 2 },
  resultName: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  resultLocation: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  resultDist: { fontSize: 12, color: '#059669', fontWeight: '600', marginBottom: 5 },
  resultStatsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3, marginBottom: 6 },
  resultStar: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  resultSep: { fontSize: 12, color: '#D1D5DB' },
  resultStat: { fontSize: 12, color: '#6B7280' },
  resultPrice: { fontSize: 12, fontWeight: '700', color: '#FF5C5C' },
  resultResponse: { fontSize: 11, color: '#1D4ED8', fontWeight: '600', marginBottom: 4 },
  resultReason: { fontSize: 11, color: '#6B7280', fontStyle: 'italic', marginBottom: 6 },
  resultBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  openBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  openBadgeText: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  closestBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  closestBadgeText: { fontSize: 10, fontWeight: '800', color: '#4F46E5', letterSpacing: 0.5 },
  trustChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  trustChipText: { fontSize: 10, fontWeight: '700' },

  // ── Empty state ──
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  clearFiltersBtn: { backgroundColor: '#FF5C5C', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  clearFiltersBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
