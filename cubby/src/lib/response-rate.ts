// ─── Response Rate Calculator ─────────────────────────────────────────────────
//
// Formula:
//   response_rate = round(responded / (responded + missed) * 100)
//
// Definitions:
//   responded = bookings where host_responded_at IS NOT NULL (accepted or declined)
//   missed    = bookings where status='pending' AND created_at < now()-24h
//               AND host_responded_at IS NULL
//   window    = last 90 days (so hosts can recover from early mistakes)
//
// Called after every Accept or Decline action.

import { SupabaseClient } from '@supabase/supabase-js';

export interface ResponseRateResult {
  response_rate: number | null;
  avg_response_time_minutes: number | null;
  total_requests: number;
  responded_requests: number;
  missed_requests: number;
}

const WINDOW_DAYS = 90;
const MISSED_AFTER_HOURS = 24;
const MIN_REQUESTS_FOR_RATE = 3;

export async function recalculateHostResponseRate(
  supabase: SupabaseClient,
  hostId: string,
): Promise<ResponseRateResult> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  // Fetch all booking requests for this host in the last 90 days
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, status, created_at, host_responded_at, response_time_minutes')
    .eq('host_id', hostId)
    .gte('created_at', windowStart.toISOString());

  if (error || !bookings) {
    return { response_rate: null, avg_response_time_minutes: null, total_requests: 0, responded_requests: 0, missed_requests: 0 };
  }

  const missedCutoff = new Date(Date.now() - MISSED_AFTER_HOURS * 60 * 60 * 1000);

  const responded = bookings.filter(b => b.host_responded_at != null);
  const missed = bookings.filter(
    b => b.host_responded_at == null && b.status === 'pending' && new Date(b.created_at) < missedCutoff,
  );

  const total = responded.length + missed.length;
  const rate = total >= MIN_REQUESTS_FOR_RATE
    ? Math.round((responded.length / total) * 100)
    : null; // "New host" — not enough data

  const responseTimes = responded
    .map(b => b.response_time_minutes)
    .filter((t): t is number => typeof t === 'number' && t > 0);

  const avgTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  // Persist to hosts row
  await supabase.from('hosts').update({
    response_rate: rate,
    avg_response_time_minutes: avgTime,
    total_requests: total,
    responded_requests: responded.length,
  }).eq('id', hostId);

  return {
    response_rate: rate,
    avg_response_time_minutes: avgTime,
    total_requests: total,
    responded_requests: responded.length,
    missed_requests: missed.length,
  };
}

/** Returns minutes between two ISO timestamps, rounded. */
export function minutesBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
}

/** Human-readable label for a response rate value. */
export function formatResponseRate(
  rate: number | null,
  totalRequests: number,
): string {
  if (totalRequests < MIN_REQUESTS_FOR_RATE || rate === null) return 'New host';
  return `${rate}%`;
}

/**
 * Human-readable response time label.
 *
 * Display rules:
 *   < 3 responded bookings        → null (caller shows "New host" context)
 *   avgMinutes <= 60              → "Responds within 1 hour"
 *   avgMinutes <= 180             → "Responds in a few hours"
 *   avgMinutes <= 480             → "Responds same day"
 *   avgMinutes > 480              → "Usually responds in 1+ days"
 */
export function formatResponseTime(
  avgMinutes: number | null,
  respondedRequests: number,
): string | null {
  if (respondedRequests < MIN_REQUESTS_FOR_RATE || avgMinutes === null) return null;
  if (avgMinutes <= 60) return 'Responds within 1 hour';
  if (avgMinutes <= 180) return 'Responds in a few hours';
  if (avgMinutes <= 480) return 'Responds same day';
  return 'Usually responds in 1+ days';
}

/**
 * Short label for compact UI (host cards, badges).
 *
 *   <= 60 min  → "~1hr"
 *   <= 180 min → "~Xhr"   (rounded to nearest hour)
 *   <= 480 min → "same day"
 *   > 480 min  → "1+ days"
 */
export function formatResponseTimeShort(
  avgMinutes: number | null,
  respondedRequests: number,
): string | null {
  if (respondedRequests < MIN_REQUESTS_FOR_RATE || avgMinutes === null) return null;
  if (avgMinutes <= 60) return '~1hr';
  if (avgMinutes <= 180) return `~${Math.round(avgMinutes / 60)}hr`;
  if (avgMinutes <= 480) return 'same day';
  return '1+ days';
}
