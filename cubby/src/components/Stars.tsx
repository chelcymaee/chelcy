import { View, Text } from 'react-native';
import { Colors } from '../constants/colors';

interface StarsProps {
  value: number;
  size?: number;
  gap?: number;
}

export function Stars({ value, size = 18, gap = 3 }: StarsProps) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Text key={s} style={{ fontSize: size, color: s <= value ? Colors.star : Colors.border }}>★</Text>
      ))}
    </View>
  );
}
