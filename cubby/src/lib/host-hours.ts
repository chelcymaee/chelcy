// ─── Per-day host opening hours ────────────────────────────────────────────
//
// hosts.weekly_hours (JSONB, nullable) is the authoritative per-day
// schedule once it exists on a host row — see supabase/schema.sql for the
// column and its one-time backfill from the legacy available_from/
// available_until/available_days fields. Those three legacy fields are
// kept, unremoved, for hosts that predate this feature and for anything
// that hasn't been migrated to read weekly_hours yet.
//
// getDayHours() is the single place every consumer (Explore, booking,
// host-detail) resolves "is this host open on day X, and if so what are
// its hours" — introduced specifically so all three can never drift from
// each other on this logic, the same class of bug this feature exists to
// fix in the first place.

export type DayAbbr = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const ALL_DAYS: DayAbbr[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DayHours {
  open: boolean;
  from?: string;  // "HH:MM" — present only when open is true
  until?: string; // "HH:MM" — present only when open is true
}

export type WeeklyHours = Partial<Record<DayAbbr, DayHours>>;

interface LegacyHoursFields {
  available_from: string;
  available_until: string;
  available_days: string[];
}

// Resolve one day's hours for a host.
//
// Precedence (deliberate product decision, not an implementation detail):
// - weekly_hours present at all → fully authoritative. A day missing from
//   the object is CLOSED, never a silent fallback to the legacy fields for
//   just that one day — a populated object is expected to always cover all
//   seven days (the backfill guarantees this), so a hole in it is treated
//   as "closed" rather than papered over, to avoid a host accidentally
//   showing as open on a day nobody actually configured.
// - weekly_hours absent/null entirely → legacy available_days/
//   available_from/available_until, reproducing pre-migration behaviour
//   exactly for any host that hasn't been backfilled yet.
export function getDayHours(
  host: { weekly_hours?: WeeklyHours | null } & LegacyHoursFields,
  day: string,
): DayHours {
  if (host.weekly_hours) {
    return host.weekly_hours[day as DayAbbr] ?? { open: false };
  }
  if (host.available_days.includes(day)) {
    return { open: true, from: host.available_from, until: host.available_until };
  }
  return { open: false };
}

// Expand the legacy fields into a complete seven-day WeeklyHours object —
// the exact same shape the production backfill produces in SQL. Used
// client-side to seed the admin editor's initial per-day state for a host
// that doesn't have weekly_hours yet, so opening the new editor on an
// unmigrated host shows its real current schedule rather than a blank one.
export function expandLegacyToWeeklyHours(fields: LegacyHoursFields): Record<DayAbbr, DayHours> {
  const result = {} as Record<DayAbbr, DayHours>;
  for (const day of ALL_DAYS) {
    result[day] = fields.available_days.includes(day)
      ? { open: true, from: fields.available_from, until: fields.available_until }
      : { open: false };
  }
  return result;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// The reverse of expandLegacyToWeeklyHours: derive a compatibility mirror
// for the legacy fields from an authoritative weekly_hours object, so a
// host written by the new admin editor doesn't sit there with obviously
// contradictory data (e.g. weekly_hours says Sunday closed while the
// legacy fields still default to every day 08:00-20:00).
//
// Per-day hours can't be perfectly represented by one shared range, so
// this is deliberately a simple, deterministic compatibility value, not an
// attempt to preserve every day's real hours:
//   - available_days = every day where weekly_hours[day].open is true
//   - available_from  = the earliest opening time across those open days
//   - available_until = the latest closing time across those open days
// weekly_hours remains authoritative regardless — these three are a
// mirror for any consumer that hasn't migrated to read weekly_hours yet,
// never read by anything that has (see getDayHours() above).
export function deriveLegacyFields(weeklyHours: WeeklyHours): LegacyHoursFields {
  const openDays = ALL_DAYS.filter(d => weeklyHours[d]?.open);
  if (openDays.length === 0) {
    return { available_from: '08:00', available_until: '20:00', available_days: [] };
  }
  const openMinutes = openDays.map(d => toMinutes(weeklyHours[d]!.from!));
  const closeMinutes = openDays.map(d => toMinutes(weeklyHours[d]!.until!));
  return {
    available_days: openDays,
    available_from: formatMinutes(Math.min(...openMinutes)),
    available_until: formatMinutes(Math.max(...closeMinutes)),
  };
}
