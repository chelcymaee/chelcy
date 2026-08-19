/**
 * Preset-reason report modal — reused unchanged from Stage 2A (reviews)
 * into Stage 2B (messages). No free-text reporting: a small fixed list of
 * Apple-review-friendly reasons, matching what report_content()'s `reason`
 * field expects (plain text, not an enum — these strings are what actually
 * get stored).
 */
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';

export const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Inappropriate or explicit content',
  'Spam or misleading content',
  'Other',
] as const;

interface Props {
  visible: boolean;
  submitting?: boolean;
  onSelect: (reason: string) => void;
  onClose: () => void;
}

export default function ReportReasonModal({ visible, submitting, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={submitting ? undefined : onClose}
          // @ts-ignore
          onClick={submitting ? undefined : onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Report this content</Text>
          <Text style={s.sub}>Why are you reporting this?</Text>

          {REPORT_REASONS.map(reason => (
            <TouchableOpacity
              key={reason}
              style={s.reasonRow}
              disabled={submitting}
              onPress={() => onSelect(reason)}
              // @ts-ignore
              onClick={() => onSelect(reason)}
            >
              <Text style={s.reasonText}>{reason}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          {submitting && (
            <View style={s.loadingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          )}

          <TouchableOpacity
            style={s.cancelBtn}
            disabled={submitting}
            onPress={onClose}
            // @ts-ignore
            onClick={onClose}
          >
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reasonText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600', flex: 1 },
  chevron: { fontSize: 20, color: Colors.textLight },
  loadingRow: { paddingVertical: 16, alignItems: 'center' },
  cancelBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
});
