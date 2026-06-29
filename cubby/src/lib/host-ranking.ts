// ─── Host Ranking V1 ──────────────────────────────────────────────────────────
//
// Formula (max 100 points):
//
//   Verification   10 pts  — owner is verified
//   Rating         25 pts  — scaled 0-5 → 0-25, only if review_count >= 3
//   Review count   15 pts  — log scale, caps at ~20 reviews
//   Response rate  20 pts  — scaled 0-100% → 0-20 pts, only if total_requests >= 3
//   Response time  15 pts  — ≤60min=15, ≤180min=10, ≤480min=5, >480min=0
//   Availability   10 pts  — host is active (date/time filtering already done pre-rank)
//   Booking hist    5 pts  — has any completed bookings (responded_requests proxy)
//
//   New host boost: if total_requests < 3 AND review_count < 3 → +15 discovery bonus
//   (prevents new hosts being buried; decays naturally once they get reviews/requests)
//
// Signals are returned alongside the score for debugging (admin panel + tests).

export interface RankingInput {
  id: string;
  rating: number;
  review_count: number;
  response_rate: number | null;
  avg_response_time_minutes: number | null;
  total_requests: number;
  responded_requests: number;
  is_active: boolean;
  owner_is_verified?: boolean;
  created_at: string;
}

export interface RankingSignals {
  verificationPts: number;
  ratingPts: number;
  reviewCountPts: number;
  responseRatePts: number;
  responseTimePts: number;
  availabilityPts: number;
  bookingHistPts: number;
  newHostBonus: number;
  total: number;
  isNewHost: boolean;
}

export interface RankedHost {
  ranking_score: number;
  ranking_signals: RankingSignals;
}

const MIN_REVIEWS_FOR_RATING = 3;
const MIN_REQUESTS_FOR_RATE = 3;

export function computeHostRanking(host: RankingInput): RankedHost {
  // 1. Verification (10 pts)
  const verificationPts = host.owner_is_verified ? 10 : 0;

  // 2. Rating (25 pts) — only counts with enough reviews
  let ratingPts = 0;
  if (host.review_count >= MIN_REVIEWS_FOR_RATING && host.rating > 0) {
    ratingPts = Math.round((host.rating / 5) * 25);
  }

  // 3. Review count (15 pts) — log scale: log2(count+1)/log2(21) * 15, caps at ~20
  const reviewCountPts = host.review_count > 0
    ? Math.min(15, Math.round((Math.log2(host.review_count + 1) / Math.log2(21)) * 15))
    : 0;

  // 4. Response rate (20 pts) — only counts with enough requests
  let responseRatePts = 0;
  if (host.total_requests >= MIN_REQUESTS_FOR_RATE && host.response_rate != null) {
    responseRatePts = Math.round((host.response_rate / 100) * 20);
  }

  // 5. Response time (15 pts)
  let responseTimePts = 0;
  if (host.responded_requests >= MIN_REQUESTS_FOR_RATE && host.avg_response_time_minutes != null) {
    if (host.avg_response_time_minutes <= 60) responseTimePts = 15;
    else if (host.avg_response_time_minutes <= 180) responseTimePts = 10;
    else if (host.avg_response_time_minutes <= 480) responseTimePts = 5;
  }

  // 6. Availability (10 pts) — active status (date/time filtering already applied upstream)
  const availabilityPts = host.is_active ? 10 : 0;

  // 7. Booking history (5 pts) — any responded/completed bookings signals real usage
  const bookingHistPts = host.responded_requests > 0 ? 5 : 0;

  // 8. New host discovery bonus (15 pts) — fades once they have real data
  const isNewHost = host.total_requests < MIN_REQUESTS_FOR_RATE && host.review_count < MIN_REVIEWS_FOR_RATING;
  const newHostBonus = isNewHost ? 15 : 0;

  const total = Math.min(
    100,
    verificationPts + ratingPts + reviewCountPts + responseRatePts +
    responseTimePts + availabilityPts + bookingHistPts + newHostBonus,
  );

  return {
    ranking_score: total,
    ranking_signals: {
      verificationPts,
      ratingPts,
      reviewCountPts,
      responseRatePts,
      responseTimePts,
      availabilityPts,
      bookingHistPts,
      newHostBonus,
      total,
      isNewHost,
    },
  };
}

/** Sort a list of hosts by ranking score descending. Mutates the array. */
export function rankHosts<T extends RankingInput>(hosts: T[]): (T & RankedHost)[] {
  return hosts
    .map(h => ({ ...h, ...computeHostRanking(h) }))
    .sort((a, b) => b.ranking_score - a.ranking_score);
}

/**
 * Short label for the top-ranked signal on a host card.
 * Returns null if nothing notable to show.
 */
export function rankingLabel(signals: RankingSignals, host: Pick<RankingInput, 'rating' | 'review_count' | 'owner_is_verified'>): string | null {
  if (signals.isNewHost) return 'New Host';
  if (signals.verificationPts > 0 && signals.responseTimePts === 15) return 'Highly Trusted';
  if (host.rating >= 4.8 && host.review_count >= 5) return 'Top Rated';
  if (signals.responseTimePts === 15) return 'Fast Responder';
  if (signals.verificationPts > 0) return 'Verified Host';
  return null;
}
