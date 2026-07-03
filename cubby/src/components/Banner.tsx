import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/theme';

type BannerVariant = 'error' | 'warning' | 'success' | 'info';

interface BannerProps {
  message: string;
  variant?: BannerVariant;
  icon?: string;
}

const VARIANT_STYLES: Record<BannerVariant, { bg: string; text: string; border: string; defaultIcon: string }> = {
  error:   { bg: Colors.errorBg,   text: Colors.error,       border: '#FECACA', defaultIcon: '⚠️' },
  warning: { bg: Colors.warningBg, text: Colors.warningText, border: '#FDE68A', defaultIcon: '⚠️' },
  success: { bg: Colors.successBg, text: Colors.successText, border: '#BBF7D0', defaultIcon: '✅' },
  info:    { bg: Colors.infoBg,    text: Colors.infoText,    border: '#BFDBFE', defaultIcon: 'ℹ️' },
};

export default function Banner({ message, variant = 'error', icon }: BannerProps) {
  const v = VARIANT_STYLES[variant];
  const emoji = icon ?? v.defaultIcon;
  return (
    <View style={[styles.base, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Text style={styles.icon}>{emoji}</Text>
      <Text style={[styles.text, { color: v.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: Radius.sm,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  icon: { fontSize: 14, lineHeight: 20 },
  text: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
