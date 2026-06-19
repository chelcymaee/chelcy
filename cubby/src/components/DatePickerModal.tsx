import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function tomorrowISO(): string {
  const n = new Date();
  n.setDate(n.getDate() + 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(iso: string): string {
  const today = todayISO();
  const tomorrow = tomorrowISO();
  // Use T12:00:00 to avoid DST/timezone shifts when parsing
  const d = new Date(iso + 'T12:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (iso === today) return `Today · ${d.getDate()} ${months[d.getMonth()]}`;
  if (iso === tomorrow) return `Tomorrow · ${d.getDate()} ${months[d.getMonth()]}`;
  return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7; // shift so Mon = 0
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface Props {
  visible: boolean;
  selected: string; // YYYY-MM-DD
  onSelect: (iso: string) => void;
  onClose: () => void;
}

export default function DatePickerModal({ visible, selected, onSelect, onClose }: Props) {
  const today = todayISO();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const grid = buildMonthGrid(viewYear, viewMonth);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        {/* Backdrop — tap to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
          // @ts-ignore
          onClick={onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Select date</Text>

          {/* Month navigation */}
          <View style={s.monthNav}>
            <TouchableOpacity
              style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}
              onPress={prevMonth}
              // @ts-ignore
              onClick={prevMonth}
              disabled={!canGoPrev}
            >
              <Text style={s.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={s.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={s.navBtn} onPress={nextMonth}
              // @ts-ignore
              onClick={nextMonth}>
              <Text style={s.navText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={s.row}>
            {DAY_HEADERS.map(h => (
              <View key={h} style={s.cell}>
                <Text style={s.dayHeader}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((iso, ci) => {
                if (!iso) return <View key={ci} style={s.cell} />;
                const isPast = iso < today;
                const isSelected = iso === selected;
                const isToday = iso === today;
                const tap = () => { if (!isPast) { onSelect(iso); onClose(); } };
                return (
                  <TouchableOpacity
                    key={ci}
                    style={s.cell}
                    onPress={tap}
                    // @ts-ignore
                    onClick={tap}
                    disabled={isPast}
                  >
                    <View style={[
                      s.dayCircle,
                      isSelected && s.dayCircleSelected,
                      isToday && !isSelected && s.dayCircleToday,
                    ]}>
                      <Text style={[
                        s.dayNum,
                        isPast && s.dayNumPast,
                        isSelected && s.dayNumSelected,
                        isToday && !isSelected && s.dayNumToday,
                      ]}>
                        {new Date(iso + 'T12:00:00').getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={{ height: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.2 },
  navText: { fontSize: 28, color: '#1A1A1A', lineHeight: 32 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  row: { flexDirection: 'row', marginBottom: 2 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayHeader: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', paddingBottom: 4, letterSpacing: 0.3 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: Colors.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: Colors.primary },
  dayNum: { fontSize: 14, color: '#1A1A1A' },
  dayNumPast: { color: '#D1D5DB' },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumToday: { fontWeight: '700', color: Colors.primary },
});
