import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { MOCK_REVIEWS } from '../../src/lib/mock-data';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

const HOW_IT_WORKS = [
  {
    title: 'Book online only',
    desc: 'You must book and pay online through Cubby to be covered by our guarantee.',
  },
  {
    title: 'Get your booking details',
    desc: 'Your PIN code and full address will be shown in your account.',
  },
  {
    title: 'Show your PIN at the storage location',
    desc: 'Present your PIN on arrival so the host can store your bags safely.',
  },
  {
    title: 'Enjoy your day luggage-free!',
    desc: 'Return before closing time to collect your bags.',
  },
];

function normalizeHost(raw: any) {
  return {
    id: raw.id,
    display_name: raw.display_name ?? raw.displayName ?? '',
    bio: raw.bio ?? '',
    business_type: raw.business_type ?? raw.businessType ?? 'other',
    location_name: raw.location_name ?? raw.locationName ?? '',
    price_per_bag_per_day: raw.price_per_bag_per_day ?? raw.pricePerBag ?? 100,
    rating: raw.rating ?? 0,
    review_count: raw.review_count ?? 0,
    response_rate: raw.response_rate ?? raw.responseRate ?? 100,
    available_from: raw.available_from ?? raw.availableFrom ?? '08:00',
    available_until: raw.available_until ?? raw.availableUntil ?? '20:00',
    available_days: raw.available_days ?? raw.availableDays ?? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    max_bags: raw.max_bags ?? raw.maxBags ?? 10,
  };
}

export default function HostDetail() {
  const { id, selectedDate } = useLocalSearchParams<{ id: string; selectedDate: string }>();
  const [host, setHost] = useState<any>(null);
  const mockReviews = MOCK_REVIEWS.filter(r => r.host_id === id);
  const [bagCount, setBagCount] = useState(1);
  const [savedReviews, setSavedReviews] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savingSpot, setSavingSpot] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function loadHost() {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('hosts')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) {
          setHost(normalizeHost(data));
        }
      } else {
        const raw = await AsyncStorage.getItem('cubby_hosts');
        if (raw) {
          const found = JSON.parse(raw).find((h: any) => h.id === id);
          if (found) setHost(normalizeHost(found));
        }
      }
    }
    async function loadReviews() {
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('reviews')
          .select('id, reviewer_name, rating, comment, tags, created_at')
          .eq('host_id', id)
          .order('created_at', { ascending: false });
        if (data && data.length > 0) { setSavedReviews(data); return; }
      }
      // Fallback: AsyncStorage (demo mode reviews)
      const raw = await AsyncStorage.getItem(`cubby_reviews_${id}`);
      if (raw) setSavedReviews(JSON.parse(raw));
    }
    loadHost();
    loadReviews();
    // Check if saved
    checkSaved();
  }, [id]);

  async function checkSaved() {
    if (!id) return;
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('saved_spots').select('id').eq('user_id', user.id).eq('host_id', id).single();
        setIsSaved(!!data);
        return;
      }
    }
    const raw = await AsyncStorage.getItem('cubby_saved_spots');
    const saved: string[] = raw ? JSON.parse(raw) : [];
    setIsSaved(saved.includes(id));
  }

  async function toggleSave() {
    if (!id) return;
    setSavingSpot(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (isSaved) {
            await supabase.from('saved_spots').delete().eq('user_id', user.id).eq('host_id', id);
          } else {
            await supabase.from('saved_spots').insert({ user_id: user.id, host_id: id });
          }
          setIsSaved(!isSaved);
          return;
        }
      }
      // AsyncStorage fallback
      const raw = await AsyncStorage.getItem('cubby_saved_spots');
      const saved: string[] = raw ? JSON.parse(raw) : [];
      const next = isSaved ? saved.filter(s => s !== id) : [...saved, id];
      await AsyncStorage.setItem('cubby_saved_spots', JSON.stringify(next));
      setIsSaved(!isSaved);
    } finally {
      setSavingSpot(false);
    }
  }

  const reviews = [...savedReviews, ...mockReviews];

  const goBack = () => router.replace('/(traveller)/explore');

  if (!host) return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backLink}
        onPress={goBack}
        // @ts-ignore
        onClick={goBack}
      >
        <Text style={styles.backLinkText}>← Back to results</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textSecondary }}>Loading…</Text>
      </View>
    </SafeAreaView>
  );

  const isOpen = host.available_days.includes(TODAY_ABBR);
  const total = host.price_per_bag_per_day * bagCount;

  const decreaseBags = () => setBagCount(Math.max(1, bagCount - 1));
  const increaseBags = () => setBagCount(Math.min(host.max_bags, bagCount + 1));

  const goToReview = () => router.push({ pathname: '/(traveller)/review', params: { hostId: id, hostName: host.display_name } });
  const goToBooking = () => router.push({ pathname: '/(traveller)/booking', params: { hostId: id, bagCount: String(bagCount), selectedDate: selectedDate ?? '' } });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back link */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={goBack}
          // @ts-ignore
          onClick={goBack}
        >
          <Text style={styles.backLinkText}>← Back to results</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          {/* Icon + name block */}
          <View style={styles.headerBlock}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>🧳</Text>
            </View>
            <Text style={styles.storageLabel}>STORAGE IN</Text>
            <Text style={styles.hostName}>{host.display_name}</Text>
            <Text style={styles.locationName}>{host.location_name}</Text>

            {/* Save button */}
            <TouchableOpacity
              onPress={toggleSave}
              // @ts-ignore
              onClick={toggleSave}
              disabled={savingSpot}
              style={{ marginBottom: 8 }}
            >
              <Text style={{ fontSize: 24 }}>{isSaved ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>

          {/* Rating row */}
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>{host.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({host.review_count})</Text>
              <Text style={styles.ratingDot}>·</Text>
              <Text style={styles.responseRate}>{host.response_rate}% response</Text>
              {isOpen && (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>OPEN</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Address warning */}
          <View style={styles.addressWarning}>
            <Text style={styles.addressWarningText}>ⓘ  Full address shared after booking confirmation</Text>
          </View>

          <View style={styles.divider} />

          {/* Bag tip card */}
          <View style={styles.bagTipCard}>
            <Text style={styles.bagTipText}>🧳  Choose the number of bags carefully to speed up your drop-off.</Text>
          </View>

          <View style={styles.divider} />

          {/* Trust card */}
          <View style={styles.trustCard}>
            <Text style={styles.trustTitle}>🛡️  Each bag is protected up to R2,000!</Text>
            <Text style={styles.trustSub}>Only when booking online with Cubby.</Text>
          </View>

          <View style={styles.divider} />

          {/* How Cubby works */}
          <Text style={styles.sectionTitle}>How Cubby works</Text>
          <View style={styles.stepsCard}>
            {HOW_IT_WORKS.map((step, i) => (
              <View key={i} style={[styles.stepRow, i < HOW_IT_WORKS.length - 1 && styles.stepRowBorder]}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Opening hours */}
          <Text style={styles.sectionTitle}>Opening hours</Text>
          <View style={styles.hoursTable}>
            {ALL_DAYS.map(day => {
              const isToday = day === TODAY_ABBR;
              const isAvailable = host.available_days.includes(day);
              return (
                <View key={day} style={styles.hoursRow}>
                  <Text style={[styles.hoursDay, isToday && styles.hoursBold]}>{day}</Text>
                  {isAvailable ? (
                    <Text style={[styles.hoursTime, isToday && styles.hoursBold]}>
                      {host.available_from} – {host.available_until}
                    </Text>
                  ) : (
                    <Text style={styles.hoursClosed}>Closed</Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Bag counter */}
          <Text style={styles.sectionTitle}>How many bags?</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={decreaseBags}
              // @ts-ignore
              onClick={decreaseBags}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterVal}>{bagCount}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={increaseBags}
              // @ts-ignore
              onClick={increaseBags}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.counterDesc}>{bagCount === 1 ? 'bag' : 'bags'} · R{total} per day</Text>
          </View>

          <View style={styles.divider} />

          {/* Reviews */}
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={goToReview}
              // @ts-ignore
              onClick={goToReview}
            >
              <Text style={styles.writeReviewBtnText}>✏️ Write a review</Text>
            </TouchableOpacity>
          </View>

          {reviews.length > 0 && (
            <View style={styles.reviewsList}>
              {reviews.map(r => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.reviewHeaderRow}>
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
          )}

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* Sticky footer CTA */}
      <View style={styles.stickyFooter}>
        <View>
          <Text style={styles.footerPrice}>R{total}<Text style={styles.footerPriceSub}> /bag/day</Text></Text>
        </View>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={goToBooking}
          // @ts-ignore
          onClick={goToBooking}
          activeOpacity={0.85}
        >
          <Text style={styles.footerBtnText}>Select no. of bags →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  backLink: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  backLinkText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },

  body: { paddingHorizontal: 20 },

  /* Header block */
  headerBlock: { alignItems: 'center', paddingVertical: 20 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconEmoji: { fontSize: 36 },
  storageLabel: {
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hostName: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  locationName: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { color: '#FFD93D', fontSize: 14 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  ratingCount: { fontSize: 13, color: '#6B7280' },
  ratingDot: { fontSize: 13, color: '#6B7280' },
  responseRate: { fontSize: 13, color: '#6B7280' },
  openBadge: {
    backgroundColor: '#6BCB77',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  openBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  divider: { height: 8, backgroundColor: '#F0EAEA', marginHorizontal: -20, marginVertical: 12 },

  /* Address warning */
  addressWarning: { paddingVertical: 4 },
  addressWarningText: { fontSize: 13, color: '#F59E0B', lineHeight: 20 },

  /* Bag tip card */
  bagTipCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
  },
  bagTipText: { fontSize: 13, color: '#1D4ED8', lineHeight: 20 },

  /* Trust card */
  trustCard: {
    borderWidth: 1,
    borderColor: '#F0EAEA',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  trustTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  trustSub: { fontSize: 13, color: '#6B7280' },

  /* Section title */
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  /* How it works */
  stepsCard: {
    borderWidth: 1,
    borderColor: '#F0EAEA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EAEA' },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 15, fontWeight: '700', color: '#FF5C5C' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  stepDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  /* Opening hours */
  hoursTable: { gap: 8 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursDay: { fontSize: 14, color: '#1A1A1A' },
  hoursTime: { fontSize: 14, color: '#1A1A1A' },
  hoursBold: { fontWeight: '700' },
  hoursClosed: { fontSize: 14, color: '#6B7280' },

  /* Bag counter */
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF5C5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  counterVal: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', minWidth: 30, textAlign: 'center' },
  counterDesc: { fontSize: 14, color: '#6B7280' },

  /* Reviews */
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  writeReviewBtn: { backgroundColor: '#FF5C5C', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  writeReviewBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  reviewsList: { gap: 12 },
  review: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAEA',
  },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  reviewDate: { fontSize: 12, color: '#6B7280' },
  reviewComment: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  /* Sticky footer */
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EAEA',
    padding: 16,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerPrice: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  footerPriceSub: { fontSize: 14, fontWeight: '400', color: '#6B7280' },
  footerBtn: {
    backgroundColor: '#FF5C5C',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  footerBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
