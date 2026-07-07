import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { computeHostBadges, topBadges, TrustBadge } from '../../src/lib/trust-badges';
import { formatResponseRate, formatResponseTime, formatResponseTimeShort } from '../../src/lib/response-rate';
import { HostDetailSkeleton } from '../../src/components/Skeleton';

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

function normalizeHost(raw: any, ownerIsVerified?: boolean) {
  return {
    id: raw.id,
    display_name: raw.display_name ?? raw.displayName ?? '',
    bio: raw.bio ?? '',
    business_type: raw.business_type ?? raw.businessType ?? 'other',
    location_name: raw.location_name ?? raw.locationName ?? '',
    price_per_bag_per_day: raw.price_per_bag_per_day ?? raw.pricePerBag ?? 100,
    rating: raw.rating ?? 0,
    review_count: raw.review_count ?? 0,
    response_rate: raw.response_rate ?? null,
    avg_response_time_minutes: raw.avg_response_time_minutes ?? null,
    total_requests: raw.total_requests ?? 0,
    responded_requests: raw.responded_requests ?? 0,
    available_from: raw.available_from ?? raw.availableFrom ?? '08:00',
    available_until: raw.available_until ?? raw.availableUntil ?? '20:00',
    available_days: raw.available_days ?? raw.availableDays ?? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    max_bags: raw.max_bags ?? raw.maxBags ?? 10,
    storage_features: raw.storage_features ?? [],
    photos: raw.photos ?? [],
    owner_is_verified: ownerIsVerified ?? false,
    created_at: raw.created_at ?? new Date().toISOString(),
  };
}

export default function HostDetail() {
  const { id, selectedDate } = useLocalSearchParams<{ id: string; selectedDate: string }>();
  const [host, setHost] = useState<any>(null);
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  const [bagCount, setBagCount] = useState(1);
  const [savedReviews, setSavedReviews] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savingSpot, setSavingSpot] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

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
          // Fetch owner profile for verification status
          const ownerId = data.assigned_user_id ?? data.user_id;
          let ownerIsVerified = false;
          if (ownerId) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('is_verified')
              .eq('id', ownerId)
              .single();
            ownerIsVerified = prof?.is_verified ?? false;
          }
          const normalized = normalizeHost(data, ownerIsVerified);
          setHost(normalized);
          setBadges(computeHostBadges(normalized));
        }
      } else {
        const raw = await AsyncStorage.getItem('cubby_hosts');
        if (raw) {
          const found = JSON.parse(raw).find((h: any) => h.id === id);
          if (found) {
            const normalized = normalizeHost(found);
            setHost(normalized);
            setBadges(computeHostBadges(normalized));
          }
        }
      }
    }
    async function loadReviews() {
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('reviews')
          .select('id, reviewer_name, rating, comment, tags, created_at, rating_friendliness, rating_location, rating_drop_off, rating_security')
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

  function animateHeart() {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
    ]).start();
  }

  async function toggleSave() {
    if (!id) return;
    animateHeart();
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

  const reviews = savedReviews;

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
      <ScrollView showsVerticalScrollIndicator={false}>
        <HostDetailSkeleton />
      </ScrollView>
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
              {host.photos?.[0] && !photoFailed ? (
                <Image source={{ uri: host.photos[0] }} style={styles.iconImage} onError={() => setPhotoFailed(true)} />
              ) : (
                <Text style={styles.iconEmoji}>🧳</Text>
              )}
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
              <Animated.Text style={{ fontSize: 24, transform: [{ scale: heartScale }] }}>
                {isSaved ? '❤️' : '🤍'}
              </Animated.Text>
            </TouchableOpacity>

          {/* Rating row */}
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>{host.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({host.review_count})</Text>
              <Text style={styles.ratingDot}>·</Text>
              <Text style={styles.responseRate}>{formatResponseRate(host.response_rate, host.total_requests)} response</Text>
              {isOpen && (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>OPEN</Text>
                </View>
              )}
            </View>

            {/* Response time row */}
            {(() => {
              const rt = formatResponseTime(host.avg_response_time_minutes, host.responded_requests ?? 0);
              return rt ? (
                <View style={styles.responseTimeRow}>
                  <Text style={styles.responseTimeEmoji}>⚡</Text>
                  <Text style={styles.responseTimeText}>{rt}</Text>
                </View>
              ) : null;
            })()}

            {/* Top trust badges — 2–3 most important only */}
            {badges.length > 0 && (
              <View style={styles.headerBadgesRow}>
                {topBadges(badges, 3).map(b => (
                  <View key={b.id} style={[styles.headerBadge, { backgroundColor: b.bg }]}>
                    <Text style={styles.headerBadgeEmoji}>{b.emoji}</Text>
                    <Text style={[styles.headerBadgeLabel, { color: b.color }]}>{b.label}</Text>
                  </View>
                ))}
              </View>
            )}
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

          {/* Trust & Safety section */}
          <Text style={styles.sectionTitle}>Trust & Safety</Text>

          {/* Cubby guarantee + response time */}
          <View style={styles.trustCard}>
            <Text style={styles.trustTitle}>🛡️  ID-verified host, booked securely through Cubby</Text>
            <Text style={styles.trustSub}>Payments and messaging stay protected in-app.</Text>
            {(() => {
              const rt = formatResponseTime(host.avg_response_time_minutes, host.responded_requests ?? 0);
              return rt ? (
                <View style={styles.trustResponseRow}>
                  <Text style={styles.trustResponseEmoji}>⚡</Text>
                  <Text style={styles.trustResponseText}>{rt}</Text>
                </View>
              ) : (
                <View style={styles.trustResponseRow}>
                  <Text style={styles.trustResponseEmoji}>⚡</Text>
                  <Text style={[styles.trustResponseText, { color: Colors.textLight }]}>New host — response time not yet available</Text>
                </View>
              );
            })()}
          </View>

          {/* Trust badges grid */}
          {badges.length > 0 && (
            <View style={styles.badgesGrid}>
              {badges.map(b => (
                <View key={b.id} style={[styles.badgeCell, { backgroundColor: b.bg }]}>
                  <Text style={styles.badgeCellEmoji}>{b.emoji}</Text>
                  <Text style={[styles.badgeCellLabel, { color: b.color }]}>{b.label}</Text>
                  <Text style={styles.badgeCellDesc}>{b.description}</Text>
                </View>
              ))}
            </View>
          )}

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

          {/* Rating distribution */}
          {reviews.length >= 3 && (() => {
            const dist = [5, 4, 3, 2, 1].map(star => ({
              star,
              count: reviews.filter((r: any) => r.rating === star).length,
            }));
            const catAvgs = [
              { emoji: '😊', label: 'Friendliness', key: 'rating_friendliness' },
              { emoji: '📍', label: 'Location', key: 'rating_location' },
              { emoji: '🧳', label: 'Drop-off', key: 'rating_drop_off' },
              { emoji: '🔒', label: 'Security', key: 'rating_security' },
            ].map(c => {
              const vals = reviews.map((r: any) => r[c.key]).filter(Boolean);
              return { ...c, avg: vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null };
            }).filter(c => c.avg !== null);

            return (
              <View style={styles.ratingDistBox}>
                <View style={styles.ratingDistBars}>
                  {dist.map(({ star, count }) => (
                    <View key={star} style={styles.distRow}>
                      <Text style={styles.distStar}>{star}★</Text>
                      <View style={styles.distBarBg}>
                        <View style={[styles.distBarFill, { flex: count / reviews.length }]} />
                      </View>
                      <Text style={styles.distCount}>{count}</Text>
                    </View>
                  ))}
                </View>
                {catAvgs.length > 0 && (
                  <View style={styles.catAvgsRow}>
                    {catAvgs.map(c => (
                      <View key={c.key} style={styles.catAvgChip}>
                        <Text style={styles.catAvgEmoji}>{c.emoji}</Text>
                        <Text style={styles.catAvgVal}>{(c.avg as number).toFixed(1)}</Text>
                        <Text style={styles.catAvgLabel}>{c.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })()}

          {reviews.length > 0 && (
            <View style={styles.reviewsList}>
              {reviews.map((r: any) => (
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
                  {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                  {r.tags?.length > 0 && (
                    <View style={styles.reviewTagsRow}>
                      {r.tags.map((tag: string) => (
                        <View key={tag} style={styles.reviewTag}>
                          <Text style={styles.reviewTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {reviews.length === 0 && (
            <View style={styles.noReviewsBox}>
              <Text style={styles.noReviewsEmoji}>💬</Text>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSub}>Be the first to leave a review after your stay.</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },

  backLink: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  backLinkText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },

  body: { paddingHorizontal: 20 },

  /* Header block */
  headerBlock: { alignItems: 'center', paddingVertical: 20 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconEmoji: { fontSize: 36 },
  iconImage: { width: 72, height: 72, borderRadius: 16 },
  storageLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hostName: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  locationName: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { color: Colors.star, fontSize: 14 },
  ratingText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  ratingCount: { fontSize: 13, color: Colors.textSecondary },
  ratingDot: { fontSize: 13, color: Colors.textSecondary },
  responseRate: { fontSize: 13, color: Colors.textSecondary },
  openBadge: {
    backgroundColor: Colors.accentAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  openBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },

  divider: { height: 8, backgroundColor: Colors.border, marginHorizontal: -20, marginVertical: 12 },

  /* Address warning */
  addressWarning: { paddingVertical: 4 },
  addressWarningText: { fontSize: 13, color: '#F59E0B', lineHeight: 20 },

  /* Bag tip card */
  bagTipCard: {
    backgroundColor: Colors.infoBg,
    borderRadius: 12,
    padding: 14,
  },
  bagTipText: { fontSize: 13, color: Colors.infoText, lineHeight: 20 },

  /* Response time row (under rating) */
  responseTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  responseTimeEmoji: { fontSize: 13 },
  responseTimeText: { fontSize: 13, color: Colors.infoText, fontWeight: '600' },

  /* Trust card */
  trustCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  trustTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  trustSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  trustResponseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  trustResponseEmoji: { fontSize: 13 },
  trustResponseText: { fontSize: 13, color: Colors.infoText, fontWeight: '600' },

  /* Header badge chips */
  headerBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  headerBadgeEmoji: { fontSize: 12 },
  headerBadgeLabel: { fontSize: 11, fontWeight: '700' },

  /* Trust badges full grid */
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCell: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  badgeCellEmoji: { fontSize: 22 },
  badgeCellLabel: { fontSize: 13, fontWeight: '700' },
  badgeCellDesc: { fontSize: 11, color: '#6B7280', lineHeight: 15, marginTop: 2 },

  /* Section title */
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },

  /* How it works */
  stepsCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  stepTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  stepDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  /* Opening hours */
  hoursTable: { gap: 8 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursDay: { fontSize: 14, color: Colors.textPrimary },
  hoursTime: { fontSize: 14, color: Colors.textPrimary },
  hoursBold: { fontWeight: '700' },
  hoursClosed: { fontSize: 14, color: Colors.textSecondary },

  /* Bag counter */
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
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

  /* Reviews */
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  writeReviewBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  writeReviewBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  ratingDistBox: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 },
  ratingDistBars: { gap: 6 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distStar: { fontSize: 12, color: Colors.textSecondary, width: 22, textAlign: 'right' },
  distBarBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, flexDirection: 'row' },
  distBarFill: { backgroundColor: Colors.star, borderRadius: 3 },
  distCount: { fontSize: 12, color: Colors.textSecondary, width: 16, textAlign: 'right' },
  catAvgsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  catAvgChip: { backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  catAvgEmoji: { fontSize: 14 },
  catAvgVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  catAvgLabel: { fontSize: 10, color: Colors.textSecondary },
  reviewsList: { gap: 12 },
  reviewTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reviewTag: { backgroundColor: '#FFF0F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  reviewTagText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  review: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  reviewDate: { fontSize: 12, color: Colors.textSecondary },
  reviewComment: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  noReviewsBox: { alignItems: 'center', paddingVertical: 24 },
  noReviewsEmoji: { fontSize: 32, marginBottom: 8 },
  noReviewsText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  noReviewsSub: { fontSize: 13, color: Colors.textSecondary },

  /* Sticky footer */
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerPrice: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  footerPriceSub: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },
  footerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  footerBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
