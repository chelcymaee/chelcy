/**
 * Shared UGC moderation actions — report content and block/unblock users.
 * Backend-agnostic wrapper around the Stage 1 database layer (content_reports,
 * blocked_users, report_content(), users_are_blocked()) — see supabase/schema.sql.
 *
 * Built for Stage 2A (reviews) but deliberately generic so Stage 2B
 * (messages) can reuse it unchanged — every function here takes a
 * content_type/user id, nothing review-specific leaks into the shape.
 */
import { supabase } from './supabase';

export type ReportableContentType = 'host_review' | 'traveller_review' | 'message';

export interface ReportResult {
  ok: boolean;
  reason?: string; // one of report_content()'s rejection reasons when ok is false
}

/**
 * Files a report via the report_content() RPC. The server derives the
 * reported user itself from the actual content record — never trust a
 * client-supplied reported-user id for anything, this call doesn't even
 * accept one.
 */
export async function reportContent(
  contentType: ReportableContentType,
  contentId: string,
  reason: string
): Promise<ReportResult> {
  const { data, error } = await supabase.rpc('report_content', {
    p_content_type: contentType,
    p_content_id: contentId,
    p_reason: reason,
  });
  if (error) {
    console.error('[moderation-service] report_content RPC error:', error);
    return { ok: false, reason: 'network_error' };
  }
  return data as ReportResult;
}

export interface BlockResult {
  ok: boolean;
  alreadyBlocked?: boolean;
  error?: string;
}

/** Blocks a user. Idempotent — an existing block is treated as success, not an error. */
export async function blockUser(blockerId: string, blockedId: string): Promise<BlockResult> {
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) {
    if (error.code === '23505') return { ok: true, alreadyBlocked: true };
    console.error('[moderation-service] blockUser error:', error);
    return { ok: false, error: 'Could not block this user. Please try again.' };
  }
  return { ok: true };
}

/** Unblocks a user. Deleting a non-existent block row is a harmless no-op. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<BlockResult> {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) {
    console.error('[moderation-service] unblockUser error:', error);
    return { ok: false, error: 'Could not unblock this user. Please try again.' };
  }
  return { ok: true };
}

/**
 * Returns the set of user ids the given user has blocked — for
 * client-side hiding of that user's content. Own-row SELECT policy on
 * blocked_users means this only ever returns the caller's own blocks.
 */
export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', userId);
  if (error) {
    console.error('[moderation-service] getBlockedUserIds error:', error);
    return new Set();
  }
  return new Set((data ?? []).map((r: any) => r.blocked_id as string));
}
