// ─── Trust Badge Architecture ─────────────────────────────────────────────────
//
// To add a new badge:
//  1. Add an entry to HOST_BADGE_DEFINITIONS or TRAVELLER_BADGE_DEFINITIONS
//  2. Implement its qualification rule in computeHostBadges / computeTravellerBadges
//  3. No other files need to change
//
// Badges that cannot yet be computed (missing data) simply won't appear.

export type BadgeTier = 'verified' | 'performance' | 'facility' | 'activity';

export interface TrustBadge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  tier: BadgeTier;
}

// ─── Host badge definitions ───────────────────────────────────────────────────

export const HOST_BADGE_DEFINITIONS: TrustBadge[] = [
  // Verified tier
  {
    id: 'verified_host',
    emoji: '✅',
    label: 'Verified Host',
    description: 'This host\'s identity has been verified by Cubby.',
    color: '#059669',
    bg: '#D1FAE5',
    tier: 'verified',
  },
  // Performance tier
  {
    id: 'top_rated',
    emoji: '⭐',
    label: 'Top Rated',
    description: 'Consistently earns top reviews from travellers.',
    color: '#92400E',
    bg: '#FEF3C7',
    tier: 'performance',
  },
  {
    id: 'top_host',
    emoji: '🏆',
    label: 'Top Host',
    description: 'Outstanding rating, many completed bookings, and fast responses.',
    color: '#7C3AED',
    bg: '#EDE9FE',
    tier: 'performance',
  },
  {
    id: 'fast_responder',
    emoji: '⚡',
    label: 'Fast Responder',
    description: 'Responds to booking requests quickly.',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    tier: 'performance',
  },
  // Activity tier
  {
    id: 'bags_stored',
    emoji: '🎒',
    label: 'Bags Stored',
    description: 'Has experience looking after travellers\' bags.',
    color: '#0369A1',
    bg: '#E0F2FE',
    tier: 'activity',
  },
  {
    id: 'recently_active',
    emoji: '🟢',
    label: 'Recently Active',
    description: 'Has accepted bookings recently.',
    color: '#065F46',
    bg: '#ECFDF5',
    tier: 'activity',
  },
  // Facility tier — requires storage_features column (hidden until set)
  {
    id: 'secure_storage',
    emoji: '🛡',
    label: 'Secure Storage',
    description: 'Bags are stored in a dedicated secure area.',
    color: '#1E3A5F',
    bg: '#EFF6FF',
    tier: 'facility',
  },
  {
    id: 'cctv',
    emoji: '📷',
    label: 'CCTV',
    description: 'Premises are monitored by CCTV cameras.',
    color: '#374151',
    bg: '#F3F4F6',
    tier: 'facility',
  },
  {
    id: 'staffed',
    emoji: '🏢',
    label: 'Staffed Location',
    description: 'Staff are present during all operating hours.',
    color: '#374151',
    bg: '#F3F4F6',
    tier: 'facility',
  },
  {
    id: 'indoor',
    emoji: '🏠',
    label: 'Indoor Storage',
    description: 'Bags are stored indoors, protected from the elements.',
    color: '#374151',
    bg: '#F3F4F6',
    tier: 'facility',
  },
];

// ─── Traveller badge definitions ──────────────────────────────────────────────

export const TRAVELLER_BADGE_DEFINITIONS: TrustBadge[] = [
  {
    id: 'verified_traveller',
    emoji: '✅',
    label: 'Verified Traveller',
    description: 'This traveller\'s identity has been verified by Cubby.',
    color: '#059669',
    bg: '#D1FAE5',
    tier: 'verified',
  },
  {
    id: 'experienced_traveller',
    emoji: '🎒',
    label: 'Experienced Traveller',
    description: 'Has completed 5 or more bookings with Cubby.',
    color: '#0369A1',
    bg: '#E0F2FE',
    tier: 'activity',
  },
  {
    id: 'member_since',
    emoji: '📅',
    label: 'Early Member',
    description: 'Has been a Cubby member for over a year.',
    color: '#6B7280',
    bg: '#F3F4F6',
    tier: 'activity',
  },
];

// ─── Badge qualification rules ────────────────────────────────────────────────

export interface HostBadgeInput {
  rating: number;
  review_count: number;
  response_rate: number;
  is_active: boolean;
  created_at: string;
  storage_features?: string[];
  owner_is_verified?: boolean;
  completed_bookings?: number;
  last_booking_at?: string | null;
}

export interface TravellerBadgeInput {
  is_verified: boolean;
  created_at: string;
  completed_bookings: number;
}

const BADGE_MAP = Object.fromEntries(HOST_BADGE_DEFINITIONS.map(b => [b.id, b]));
const TRAVELLER_BADGE_MAP = Object.fromEntries(TRAVELLER_BADGE_DEFINITIONS.map(b => [b.id, b]));

export function computeHostBadges(input: HostBadgeInput): TrustBadge[] {
  const earned: TrustBadge[] = [];
  const features = input.storage_features ?? [];
  const daysSinceLastBooking = input.last_booking_at
    ? (Date.now() - new Date(input.last_booking_at).getTime()) / 86_400_000
    : Infinity;

  const check = (id: string, qualifies: boolean) => {
    if (qualifies && BADGE_MAP[id]) earned.push(BADGE_MAP[id]);
  };

  check('verified_host', input.owner_is_verified === true);
  check('top_host', input.rating >= 4.9 && input.review_count >= 10 && input.response_rate >= 90);
  check('top_rated', input.rating >= 4.7 && input.review_count >= 5);
  check('fast_responder', input.response_rate >= 95);
  check('bags_stored', (input.completed_bookings ?? 0) >= 1);
  check('recently_active', daysSinceLastBooking <= 30);
  check('secure_storage', features.includes('secure_storage'));
  check('cctv', features.includes('cctv'));
  check('staffed', features.includes('staffed'));
  check('indoor', features.includes('indoor'));

  // Sort: verified → performance → facility → activity
  const tierOrder: BadgeTier[] = ['verified', 'performance', 'facility', 'activity'];
  return earned.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
}

export function computeTravellerBadges(input: TravellerBadgeInput): TrustBadge[] {
  const earned: TrustBadge[] = [];
  const memberMonths = (Date.now() - new Date(input.created_at).getTime()) / (30 * 86_400_000);

  const check = (id: string, qualifies: boolean) => {
    if (qualifies && TRAVELLER_BADGE_MAP[id]) earned.push(TRAVELLER_BADGE_MAP[id]);
  };

  check('verified_traveller', input.is_verified);
  check('experienced_traveller', input.completed_bookings >= 5);
  check('member_since', memberMonths >= 12);

  return earned;
}

/** Returns the top N badges for compact display (e.g. host cards in search). */
export function topBadges(badges: TrustBadge[], n = 3): TrustBadge[] {
  return badges.slice(0, n);
}
