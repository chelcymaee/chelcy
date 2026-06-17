import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOCK_RUNNERS } from '../../src/lib/mock-data';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { MOCK_HOSTS, MOCK_RUNNERS, Runner } from '../../src/lib/mock-data';
import { Host } from '../../src/types';

const TIME_SLOTS = [
  '7am–8am','8am–9am','9am–10am','10am–11am','11am–12pm',
  '12pm–1pm','1pm–2pm','2pm–3pm','3pm–4pm','4pm–5pm',
  '5pm–6pm','6pm–7pm','7pm–8pm','8pm–9pm',
];

const typeEmoji: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

function todayLabel() {
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `Today, ${now.getDate()} ${months[now.getMonth()]}`;
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────
function TimePickerModal({
  visible, title, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; selected: string;
  onSelect: (t: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {TIME_SLOTS.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.timeSlotRow, selected === slot && styles.timeSlotRowActive]}
                onPress={() => { onSelect(slot); onClose(); }}
              >
                <Text style={[styles.timeSlotText, selected === slot && styles.timeSlotTextActive]}>
                  {slot}
                </Text>
                {selected === slot && <Text style={styles.timeSlotCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Location Search Modal ────────────────────────────────────────────────────
function LocationModal({
  visible, value, onSelect, onClose,
}: {
  visible: boolean; value: string; onSelect: (l: string) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const suggestions = ['Cape Town, South Africa', 'Sea Point, Cape Town', 'V&A Waterfront, Cape Town', 'Camps Bay, Cape Town', 'Green Point, Cape Town'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { paddingBottom: 32 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Where to?</Text>
          <View style={styles.locInputRow}>
            <Text style={styles.locInputIcon}>📍</Text>
            <TextInput
              style={styles.locInput}
              value={draft}
              onChangeText={setDraft}
              autoFocus
              placeholder="Search location…"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {suggestions.map(s => (
            <TouchableOpacity key={s} style={styles.suggestionRow} onPress={() => { onSelect(s); onClose(); }}>
              <Text style={styles.suggestionIcon}>🔍</Text>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Results Host Card ────────────────────────────────────────────────────────
function ResultCard({ host, index, onPress }: { host: Host; index: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.resultCardLeft}>
        <View style={styles.resultEmojiBox}>
          <Text style={styles.resultEmoji}>{typeEmoji[host.business_type] ?? '📦'}</Text>
        </View>
      </View>
      <View style={styles.resultCardBody}>
        <Text style={styles.resultLabel}>STORAGE IN</Text>
        <Text style={styles.resultName}>{host.display_name}</Text>
        <Text style={styles.resultLocation}>{host.location_name}</Text>
        <View style={styles.resultStatsRow}>
          <Text style={styles.resultStar}>★ {host.rating.toFixed(1)}</Text>
          <Text style={styles.resultStatSep}>·</Text>
          <Text style={styles.resultStatText}>{host.review_count} reviews</Text>
          <Text style={styles.resultStatSep}>·</Text>
          <Text style={styles.resultPrice}>R{host.price_per_bag_per_day}/bag/day</Text>
          <Text style={styles.resultStatSep}>·</Text>
          <Text style={styles.resultWalk}>🚶 {3 + index * 2} min</Text>
        </View>
        <View style={styles.resultBadgeRow}>
          <View style={styles.openBadge}><Text style={styles.openBadgeText}>OPEN</Text></View>
          {index === 0 && <View style={styles.closestBadge}><Text style={styles.closestBadgeText}>CLOSEST</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Search Screen ────────────────────────────────────────────────────────────
function SearchScreen({
  location, setLocation,
  dropOff, setDropOff,
  pickUp, setPickUp,
  onSearch,
}: {
  location: string; setLocation: (l: string) => void;
  dropOff: string; setDropOff: (t: string) => void;
  pickUp: string; setPickUp: (t: string) => void;
  onSearch: () => void;
}) {
  const [showLocation, setShowLocation] = useState(false);
  const [showDropOff, setShowDropOff] = useState(false);
  const [showPickUp, setShowPickUp] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.searchHeading}>Find storage near you</Text>

        {/* Where */}
        <Text style={styles.sectionLabel}>Where?</Text>
        <TouchableOpacity style={styles.locationCard} onPress={() => setShowLocation(true)} activeOpacity={0.85}>
          <Text style={styles.locationCardPin}>📍</Text>
          <Text style={styles.locationCardText} numberOfLines={1}>{location}</Text>
          <Text style={styles.locationCardGps}>⊕</Text>
        </TouchableOpacity>

        {/* When */}
        <Text style={styles.sectionLabel}>When?</Text>
        <View style={styles.dateCard}>
          <Text style={styles.dateCardIcon}>📅</Text>
          <Text style={styles.dateCardText}>{todayLabel()}</Text>
        </View>

        {/* Times */}
        <View style={styles.timesRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeLabel}>Drop-off Time</Text>
            <TouchableOpacity style={styles.timeSelector} onPress={() => setShowDropOff(true)} activeOpacity={0.85}>
              <Text style={styles.timeSelectorText}>{dropOff}</Text>
              <Text style={styles.timeSelectorArrow}>▾</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeArrowBetween}><Text style={styles.timeArrowBetweenText}>→</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeLabel}>Pick-up Time</Text>
            <TouchableOpacity style={styles.timeSelector} onPress={() => setShowPickUp(true)} activeOpacity={0.85}>
              <Text style={styles.timeSelectorText}>{pickUp}</Text>
              <Text style={styles.timeSelectorArrow}>▾</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.seeResultsBtn} onPress={onSearch} activeOpacity={0.88}>
          <Text style={styles.seeResultsBtnText}>See results →</Text>
        </TouchableOpacity>
      </ScrollView>

      <LocationModal
        visible={showLocation}
        value={location}
        onSelect={setLocation}
        onClose={() => setShowLocation(false)}
      />
      <TimePickerModal
        visible={showDropOff}
        title="Drop-off Time"
        selected={dropOff}
        onSelect={setDropOff}
        onClose={() => setShowDropOff(false)}
      />
      <TimePickerModal
        visible={showPickUp}
        title="Pick-up Time"
        selected={pickUp}
        onSelect={setPickUp}
        onClose={() => setShowPickUp(false)}
      />
    </SafeAreaView>
  );
}

// ─── Runner Card ─────────────────────────────────────────────────────────────
function RunnerCard({ runner }: { runner: Runner }) {
  return (
    <View style={styles.runnerCard}>
      <View style={styles.runnerLeft}>
        <View style={styles.runnerAvatarBox}>
          <Text style={styles.runnerAvatarText}>{runner.name[0]}</Text>
        </View>
      </View>
      <View style={styles.runnerBody}>
        <View style={styles.runnerTopRow}>
          <Text style={styles.runnerName}>{runner.name}</Text>
          <View style={styles.runnerAvailBadge}><Text style={styles.runnerAvailText}>AVAILABLE</Text></View>
        </View>
        <Text style={styles.runnerVehicle}>🚗 {runner.vehicle} · {runner.location_name}</Text>
        <View style={styles.runnerStatsRow}>
          <Text style={styles.runnerStar}>★ {runner.rating.toFixed(1)}</Text>
          <Text style={styles.runnerSep}>·</Text>
          <Text style={styles.runnerStat}>{runner.review_count} reviews</Text>
          <Text style={styles.runnerSep}>·</Text>
          <Text style={styles.runnerEta}>⏱ {runner.eta_minutes} min away</Text>
        </View>
        <View style={styles.runnerBottomRow}>
          <Text style={styles.runnerPrice}>R{runner.price_per_bag}/bag</Text>
          <Text style={styles.runnerRadius}>Delivers up to {runner.delivery_radius_km}km</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({
  hosts, location, dropOff, pickUp,
  onBack,
}: {
  hosts: Host[]; location: string; dropOff: string; pickUp: string;
  onBack: () => void;
}) {
  const [showMap, setShowMap] = useState(false);
  const insets = useSafeAreaInsets();

  // Lazy-load HostMap on native only
  const HostMap = Platform.OS !== 'web'
    ? require('../../src/components/HostMap').default
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.resultsTopBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultsSummary} numberOfLines={1}>
            {location} · {todayLabel()} · {dropOff} → {pickUp}
          </Text>
        </View>
      </View>

      <Text style={styles.resultsCount}>{hosts.length} storage spots</Text>

      {showMap && HostMap ? (
        <View style={{ flex: 1 }}>
          <HostMap
            filtered={hosts}
            style={StyleSheet.absoluteFillObject}
            onPinPress={(id: string) => {
              router.push({ pathname: '/(traveller)/host-detail', params: { id } });
            }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultsList} showsVerticalScrollIndicator={false}>
          {/* Storage spots */}
          <Text style={styles.sectionHeader}>📦 Storage spots near you</Text>
          {hosts.map((item, index) => (
            <ResultCard
              key={item.id}
              host={item}
              index={index}
              onPress={() => router.push({ pathname: '/(traveller)/host-detail', params: { id: item.id } })}
            />
          ))}

          {/* Bag Runners */}
          <View style={styles.runnerSectionHeader}>
            <Text style={styles.sectionHeader}>🚗 Cubby Runners near you</Text>
            <Text style={styles.sectionSubHeader}>Drivers who store your bags & deliver on demand</Text>
          </View>
          {MOCK_RUNNERS.map(runner => (
            <RunnerCard key={runner.id} runner={runner} />
          ))}

          {hosts.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No spots found</Text>
              <Text style={styles.emptyText}>Try a different location or time.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Map toggle bar */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={[styles.mapToggleBar, { paddingBottom: insets.bottom + 8 }]}
          onPress={() => setShowMap(v => !v)}
          activeOpacity={0.88}
        >
          <Text style={styles.mapToggleText}>
            {showMap ? 'Show list 📋' : 'Tap to show on map 🗺️'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Explore() {
  const [step, setStep] = useState<'search' | 'results'>('search');
  const [location, setLocation] = useState('Cape Town, South Africa');
  const [dropOff, setDropOff] = useState('9am–10am');
  const [pickUp, setPickUp] = useState('5pm–6pm');

  const hosts = MOCK_HOSTS;

  if (step === 'results') {
    return (
      <ResultsScreen
        hosts={hosts}
        location={location}
        dropOff={dropOff}
        pickUp={pickUp}
        onBack={() => setStep('search')}
      />
    );
  }

  return (
    <SearchScreen
      location={location}
      setLocation={setLocation}
      dropOff={dropOff}
      setDropOff={setDropOff}
      pickUp={pickUp}
      setPickUp={setPickUp}
      onSearch={() => setStep('results')}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // ── Search screen ──
  searchScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  searchHeading: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 28 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },

  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#F0EAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    marginBottom: 20,
  },
  locationCardPin: { fontSize: 18 },
  locationCardText: { flex: 1, fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  locationCardGps: { fontSize: 20, color: '#FF5C5C', fontWeight: '700' },

  dateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#F0EAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    marginBottom: 20,
  },
  dateCardIcon: { fontSize: 18 },
  dateCardText: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },

  timesRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 32 },
  timeLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  timeSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#F0EAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  timeSelectorText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  timeSelectorArrow: { fontSize: 14, color: '#6B7280' },
  timeArrowBetween: { paddingBottom: 14, paddingHorizontal: 2 },
  timeArrowBetweenText: { fontSize: 18, color: '#9CA3AF' },

  seeResultsBtn: {
    backgroundColor: '#FF5C5C', borderRadius: 18, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#FF5C5C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  seeResultsBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

  // ── Modals ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },

  timeSlotRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },
  timeSlotRowActive: { backgroundColor: '#FFF0F0', borderRadius: 10, paddingHorizontal: 10 },
  timeSlotText: { fontSize: 16, color: '#1A1A1A' },
  timeSlotTextActive: { fontWeight: '700', color: '#FF5C5C' },
  timeSlotCheck: { fontSize: 16, color: '#FF5C5C', fontWeight: '700' },

  locInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FAFAFA', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#F0EAEA', marginBottom: 16,
  },
  locInputIcon: { fontSize: 18 },
  locInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EAEA',
  },
  suggestionIcon: { fontSize: 16 },
  suggestionText: { fontSize: 15, color: '#1A1A1A' },

  // ── Results screen ──
  resultsTopBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0EAEA', backgroundColor: '#FFFFFF',
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 28, color: '#1A1A1A', lineHeight: 28 },
  resultsSummary: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  resultsCount: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  resultsList: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80, gap: 12 },

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
  resultCardBody: { flex: 1 },
  resultLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 2 },
  resultName: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  resultLocation: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  resultStatsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3, marginBottom: 8 },
  resultStar: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  resultStatSep: { fontSize: 12, color: '#D1D5DB' },
  resultStatText: { fontSize: 12, color: '#6B7280' },
  resultPrice: { fontSize: 12, fontWeight: '700', color: '#FF5C5C' },
  resultWalk: { fontSize: 12, color: '#6B7280' },
  resultBadgeRow: { flexDirection: 'row', gap: 6 },
  openBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  openBadgeText: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  closestBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  closestBadgeText: { fontSize: 10, fontWeight: '800', color: '#4F46E5', letterSpacing: 0.5 },

  mapToggleBar: {
    backgroundColor: '#1A1A1A', paddingTop: 16, alignItems: 'center',
  },
  mapToggleText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  sectionHeader: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10, marginTop: 4 },
  sectionSubHeader: { fontSize: 13, color: '#6B7280', marginBottom: 12, marginTop: -6 },
  runnerSectionHeader: { marginTop: 24 },

  runnerCard: {
    flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderLeftWidth: 3, borderLeftColor: '#FF5C5C',
  },
  runnerLeft: { justifyContent: 'flex-start', paddingTop: 2 },
  runnerAvatarBox: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF5C5C',
    alignItems: 'center', justifyContent: 'center',
  },
  runnerAvatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  runnerBody: { flex: 1 },
  runnerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  runnerName: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  runnerAvailBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  runnerAvailText: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  runnerVehicle: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  runnerStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  runnerStar: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  runnerSep: { fontSize: 12, color: '#D1D5DB' },
  runnerStat: { fontSize: 12, color: '#6B7280' },
  runnerEta: { fontSize: 12, color: '#6B7280' },
  runnerBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  runnerPrice: { fontSize: 14, fontWeight: '800', color: '#FF5C5C' },
  runnerRadius: { fontSize: 12, color: '#9CA3AF' },

  // Shared empty state
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
});
