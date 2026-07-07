import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/theme';

type BtnVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Btn({ label, onPress, variant = 'primary', loading, disabled, style, textStyle }: BtnProps) {
  const btnStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'destructive' && styles.destructive,
    variant === 'ghost' && styles.ghost,
    (loading || disabled) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    variant === 'primary' && styles.labelPrimary,
    variant === 'secondary' && styles.labelSecondary,
    variant === 'destructive' && styles.labelDestructive,
    variant === 'ghost' && styles.labelGhost,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={btnStyle}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.82}
      // @ts-ignore
      onClick={onPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  destructive: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.error },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.55 },
  label: { fontSize: 16, fontWeight: '700' },
  labelPrimary: { color: Colors.white },
  labelSecondary: { color: Colors.primary },
  labelDestructive: { color: Colors.error },
  labelGhost: { color: Colors.textSecondary },
});
