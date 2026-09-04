// ─── Africa/Johannesburg payout-period helper ──────────────────────────────
//
// Determines which Friday->Thursday host-payout period a given `completed_at`
// timestamp belongs to, anchored to Africa/Johannesburg local time — matching
// the *server's* interpretation in mark_host_payout_paid() (schema.sql),
// which converts via `AT TIME ZONE 'Africa/Johannesburg'`.
//
// Deliberately NOT the same as host-payouts.tsx's existing periodStart(),
// which operates in the admin's own browser-local time (a known,
// pre-existing inconsistency — see the Priority 3 audit). That function is
// intentionally left untouched here; this is a separate, correctly
// timezone-pinned helper for new code (currently: the dashboard's Host
// Payouts summary card) that needs to reason about payout periods without
// depending on the viewer's browser timezone.
//
// SA has no DST, but this still derives the date via a real Intl timeZone
// conversion rather than a hardcoded +2 offset, for the same reason the
// RPC's own AT TIME ZONE conversion does — see schema.sql.

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns the Johannesburg calendar date (YYYY-MM-DD) of the Friday that
// starts the payout period containing `isoTimestamp`. YYYY-MM-DD strings
// sort and compare lexicographically exactly like their dates do, so the
// result is directly usable as a stable grouping/comparison key.
export function johannesburgPeriodStartKey(isoTimestamp: string): string {
  // Project the instant onto its Johannesburg calendar date. en-CA formats
  // as YYYY-MM-DD directly.
  const jhbDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date(isoTimestamp));

  // Parse that calendar date at UTC midnight purely to read back its
  // day-of-week — safe because a calendar date's weekday is timezone-
  // independent once the date string itself is correct; this never
  // re-enters browser-local time.
  const asUtcMidnight = new Date(`${jhbDateStr}T00:00:00Z`);
  const day = asUtcMidnight.getUTCDay(); // 0=Sun..6=Sat, Fri=5
  const daysSinceFriday = (day - 5 + 7) % 7; // 0 if jhbDateStr is itself a Friday

  const periodStart = new Date(asUtcMidnight.getTime() - daysSinceFriday * DAY_MS);
  return periodStart.toISOString().slice(0, 10); // back to YYYY-MM-DD
}

// The payout-period key containing "right now", in Johannesburg time —
// independent of the viewer's own browser/OS timezone.
export function currentJohannesburgPeriodKey(): string {
  return johannesburgPeriodStartKey(new Date().toISOString());
}
