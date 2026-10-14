/**
 * Shared review submission logic for both directions:
 *  - submitHostReview: traveller → reviews host (writes to `reviews` table)
 *  - submitTravellerReview: host → reviews traveller (writes to `traveller_reviews` table)
 *
 * Keeps both flows in sync so a bug in one can't silently diverge from the other.
 */

import { supabase } from './supabase';
import { triggerReviewNotification } from './notification-service';

const SUPABASE_URL = 'https://gqgxahqmndkaeyuvhliv.supabase.co';

// The caller submitting a review is always a signed-in traveller or host —
// send-email accepts their own Supabase session as a credential for this
// one client-facing call site, same shape as send-push's admin-session
// path for the admin panel. See supabase/functions/send-email/index.ts.
async function fireEmail(body: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;
  fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Traveller reviews host
// ---------------------------------------------------------------------------

export interface SubmitHostReviewParams {
  userId: string;
  reviewerName: string;
  /** profiles.avatar_url of the submitting traveller, or null — snapshotted
   * onto the review row at insert time (same denormalized-snapshot model as
   * reviewerName) so the public listing page can show a real photo without
   * ever needing a cross-user profiles read. */
  reviewerAvatarUrl: string | null;
  hostId: string;
  bookingId: string | undefined;
  rating: number;
  categoryRatings: Record<string, number>;
  comment: string;
  tags: string[];
}

export interface ReviewResult {
  success: boolean;
  alreadyReviewed?: boolean;
  error?: string;
}

export async function submitHostReview(p: SubmitHostReviewParams): Promise<ReviewResult> {
  // reviews.booking_id is NOT NULL with no default — a review can't exist
  // without a real booking behind it, by design. Fail gracefully here
  // rather than ever attempting an insert that's guaranteed to hit a
  // database-level 23502. The UI (host-detail.tsx) is the primary gate —
  // it only offers "Write a review" once it's found a real eligible
  // booking — this is defense in depth for any other caller.
  if (!p.bookingId) {
    return { success: false, error: 'A completed booking with this host is required to leave a review.' };
  }

  // Duplicate guard
  const { data: existing, error: dupErr } = await supabase
    .from('reviews').select('id').eq('booking_id', p.bookingId).maybeSingle();
  if (dupErr) console.error('[review-service] duplicate check error:', dupErr);
  if (existing) return { success: false, alreadyReviewed: true };

  const reviewRow: Record<string, any> = {
    reviewer_id: p.userId,
    host_id: p.hostId,
    reviewer_name: p.reviewerName,
    reviewer_avatar_url: p.reviewerAvatarUrl,
    rating: p.rating,
    comment: p.comment.trim() || null,
    tags: p.tags,
    booking_id: p.bookingId,
    ...Object.fromEntries(Object.entries(p.categoryRatings).filter(([, v]) => v > 0)),
  };

  const { data: inserted, error: insertError } = await supabase
    .from('reviews').insert(reviewRow).select('id').single();
  if (insertError) {
    console.error('[review-service] reviews insert error:', JSON.stringify(insertError));
    if (insertError.code === '23505') return { success: false, alreadyReviewed: true };
    if (insertError.code === '23514' && insertError.message?.includes('_no_objectionable_language')) {
      return { success: false, error: "Your review contains language that isn't allowed. Please revise your comment and try again." };
    }
    return { success: false, error: `Could not submit review. Please try again. (${insertError.code})` };
  }

  notifyHostOfReview(p, inserted?.id).catch(err => console.error('[review-service] notifyHostOfReview error:', err));
  return { success: true };
}

async function notifyHostOfReview(p: SubmitHostReviewParams, reviewId?: string): Promise<void> {
  const { data: host } = await supabase
    .from('hosts').select('assigned_user_id, display_name').eq('id', p.hostId).single();
  if (!host?.assigned_user_id) return;

  // review_received, milestone_reached and the reciprocal review_request
  // nudge are all now written server-side by create_review_notification
  // (Stage 2 Phase 1/2) in a single call — it independently re-validates
  // the caller against the real review row and applies the recipient's
  // notification preferences itself. Replaces the three separate
  // sendNotification() calls that used to live in this function. Never
  // awaited into this function's own error path: a notification failure
  // must not look like a failed review submission.
  if (p.bookingId) {
    triggerReviewNotification(p.bookingId, 'host').catch(err =>
      console.error('[review-service] create_review_notification (host) failed:', err));
  }

  // Milestone check — kept here independently of the RPC above because the
  // milestone email below needs the raw milestone/detail strings, which the
  // RPC doesn't expose (and email is unrelated to Stage 2, untouched).
  const { data: stats } = await supabase.from('reviews').select('rating').eq('host_id', p.hostId);
  if (stats?.length) {
    const fiveStarCount = stats.filter((r: any) => r.rating === 5).length;
    const avgRating = stats.reduce((s: number, r: any) => s + r.rating, 0) / stats.length;
    const totalReviews = stats.length;
    let milestone: string | null = null;
    let detail: string | null = null;

    if (fiveStarCount === 10)       { milestone = '10 five-star reviews'; detail = 'Travellers love you — keep it up!'; }
    else if (fiveStarCount === 5)   { milestone = 'First 5 five-star reviews'; detail = "You're building an outstanding reputation."; }
    else if (totalReviews === 10)   { milestone = '10 reviews'; detail = "You're a well-established Cubby host!"; }
    else if (totalReviews === 5)    { milestone = 'First 5 reviews'; detail = 'Your reputation is growing!'; }
    else if (avgRating >= 4.8 && totalReviews >= 5) { milestone = '4.8★ average rating'; detail = 'You rank among the top Cubby hosts.'; }

    if (milestone) {
      // send-email resolves the recipient email itself, server-side, from
      // hostUserId — and binds hostUserId to a review this caller actually
      // wrote before trusting it (see send-email/index.ts). The client
      // never reads another user's profiles row here; hostName is only
      // ever the public hosts.display_name as a fallback.
      fireEmail({ emailType: 'milestone_reached', data: { hostUserId: host.assigned_user_id, hostName: host.display_name, milestone, detail } });
    }
  }

  // Email host about the review — send-email resolves the recipient's
  // email/name AND the review content itself server-side from this
  // reviewId, bound to the caller's own session. The client never reads
  // another user's profiles row, and never supplies content the server
  // could instead read from the authoritative reviews row.
  if (reviewId) {
    fireEmail({ emailType: 'review_received', data: { reviewId, role: 'host' } });
  }
}

// ---------------------------------------------------------------------------
// Host reviews traveller
// ---------------------------------------------------------------------------

export interface SubmitTravellerReviewParams {
  reviewerId: string;       // auth.uid() of the host
  hostId: string;           // hosts.id
  hostName: string;
  travellerId: string;
  bookingId: string;
  ratings: { rating_respectful: number; rating_on_time: number; rating_communication: number };
  comment: string;
}

export async function submitTravellerReview(p: SubmitTravellerReviewParams): Promise<ReviewResult> {
  // Duplicate guard
  const { data: existing, error: dupErr } = await supabase
    .from('traveller_reviews').select('id').eq('booking_id', p.bookingId).maybeSingle();
  if (dupErr) console.error('[review-service] duplicate check error:', dupErr);
  if (existing) return { success: false, alreadyReviewed: true };

  const { data: inserted, error: insertError } = await supabase.from('traveller_reviews').insert({
    booking_id: p.bookingId,
    reviewer_id: p.reviewerId,
    host_id: p.hostId,
    traveller_id: p.travellerId,
    host_name: p.hostName,
    rating_respectful: p.ratings.rating_respectful,
    rating_on_time: p.ratings.rating_on_time,
    rating_communication: p.ratings.rating_communication,
    comment: p.comment.trim() || null,
  }).select('id').single();

  if (insertError) {
    console.error('[review-service] insert error:', insertError.code, insertError.message);
    if (insertError.code === '23505') return { success: false, alreadyReviewed: true };
    if (insertError.code === '23514' && insertError.message?.includes('_no_objectionable_language')) {
      return { success: false, error: "This review contains language that isn't allowed. Please revise the comment and try again." };
    }
    return { success: false, error: `Could not submit review. Please try again. (${insertError.code})` };
  }

  notifyTravellerOfReview(p, inserted?.id).catch(err => console.error('[review-service] notify error:', err));
  return { success: true };
}

async function notifyTravellerOfReview(p: SubmitTravellerReviewParams, reviewId?: string): Promise<void> {
  // review_received and the reciprocal review_request nudge are both now
  // written server-side by create_review_notification (Stage 2 Phase
  // 1/2) in a single call — see notifyHostOfReview() above for the same
  // pattern and rationale. Never awaited into this function's own error
  // path: a notification failure must not look like a failed review
  // submission.
  triggerReviewNotification(p.bookingId, 'traveller').catch(err =>
    console.error('[review-service] create_review_notification (traveller) failed:', err));

  // Email traveller — same pattern: send-email resolves everything
  // server-side from this reviewId.
  if (reviewId) {
    fireEmail({ emailType: 'review_received', data: { reviewId, role: 'traveller' } });
  }
}
