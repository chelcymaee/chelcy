// Web-only admin control: a plain seven-row per-day hours editor, used by
// both app/(admin)/create-host.tsx and app/(admin)/manage-hosts.tsx so
// they can't drift from each other on this one piece of UI. Deliberately
// raw HTML elements (div/input/button), matching those two screens' own
// style — this is a web-only admin dashboard, not a cross-platform screen.
import { ALL_DAYS, DayAbbr, DayHours } from '../lib/host-hours';

const DAY_LABELS: Record<DayAbbr, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

interface WeeklyHoursEditorProps {
  value: Record<DayAbbr, DayHours>;
  onChange: (next: Record<DayAbbr, DayHours>) => void;
}

export default function WeeklyHoursEditor({ value, onChange }: WeeklyHoursEditorProps) {
  function setDay(day: DayAbbr, patch: Partial<DayHours>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  function toggleOpen(day: DayAbbr) {
    const wasOpen = value[day]?.open;
    setDay(day, wasOpen
      ? { open: false, from: undefined, until: undefined }
      : { open: true, from: value[day]?.from ?? '08:00', until: value[day]?.until ?? '17:00' });
  }

  return (
    <div style={s.wrap}>
      {ALL_DAYS.map(day => {
        const dh = value[day] ?? { open: false };
        return (
          <div key={day} style={s.row}>
            <label style={s.dayLabel}>
              <input type="checkbox" checked={dh.open} onChange={() => toggleOpen(day)} style={s.checkbox} />
              {DAY_LABELS[day]}
            </label>
            {dh.open ? (
              <div style={s.times}>
                <input
                  type="time" style={s.timeInput} value={dh.from ?? '08:00'}
                  onChange={e => setDay(day, { from: e.target.value })}
                />
                <span style={s.dash}>–</span>
                <input
                  type="time" style={s.timeInput} value={dh.until ?? '17:00'}
                  onChange={e => setDay(day, { until: e.target.value })}
                />
              </div>
            ) : (
              <span style={s.closedLabel}>Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const s: any = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#fff',
  },
  dayLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#1a1a1a', cursor: 'pointer', flex: 1 },
  checkbox: { width: 16, height: 16, cursor: 'pointer' },
  times: { display: 'flex', alignItems: 'center', gap: 6 },
  timeInput: { padding: '6px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 13, backgroundColor: '#fff' },
  dash: { color: '#9CA3AF', fontSize: 13 },
  closedLabel: { fontSize: 12, fontWeight: 600, color: '#9CA3AF' },
};
