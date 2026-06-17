import { View, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';

const typeEmoji: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

export default function HostMap({ filtered }: { filtered: any[] }) {
  return (
    <MapView style={{ flex: 1 }} initialRegion={{ latitude: -33.9249, longitude: 18.4241, latitudeDelta: 0.08, longitudeDelta: 0.08 }}>
      {filtered.filter(h => h.latitude && h.longitude).map(host => (
        <Marker key={host.id} coordinate={{ latitude: host.latitude, longitude: host.longitude }}>
          <Callout onPress={() => router.push({ pathname: '/(traveller)/host-detail', params: { id: host.id } })}>
            <View style={{ padding: 8, maxWidth: 180 }}>
              <Text style={{ fontWeight: '700', fontSize: 14 }}>{typeEmoji[host.business_type] ?? '📦'} {host.display_name}</Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>R{host.price_per_bag_per_day}/bag/day · ★ {host.rating.toFixed(1)}</Text>
              <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>Tap to view →</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}
