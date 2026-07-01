import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import type { LatLon } from '../lib/location';
import { haversineMeters, formatDistance, walkMinutes } from '../lib/location';

const CAPE_TOWN = { latitude: -33.9249, longitude: 18.4241 };
const DELTA = 0.075;

const TYPE_EMOJI: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

interface Props {
  filtered: any[];
  userLocation?: LatLon | null;
  onPinPress?: (id: string) => void;
}

export default function HostMap({ filtered, userLocation, onPinPress }: Props) {
  const hosts = filtered.filter((h: any) => h.latitude && h.longitude);

  const center = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lon }
    : CAPE_TOWN;

  const handlePress = (id: string) => {
    if (onPinPress) onPinPress(id);
    else router.push({ pathname: '/(traveller)/host-detail', params: { id } });
  };

  return (
    <MapView
      style={{ flex: 1 }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{ ...center, latitudeDelta: DELTA, longitudeDelta: DELTA }}
      showsUserLocation={!!userLocation}
      showsMyLocationButton={!!userLocation}
      showsCompass
    >
      {hosts.map((host: any) => {
        const distM = userLocation
          ? haversineMeters(userLocation, { lat: host.latitude, lon: host.longitude })
          : null;

        return (
          <Marker
            key={host.id}
            coordinate={{ latitude: host.latitude, longitude: host.longitude }}
            tracksViewChanges={false}
          >
            {/* Custom price-bubble pin */}
            <View style={styles.pin}>
              <Text style={styles.pinEmoji}>{TYPE_EMOJI[host.business_type] ?? '📦'}</Text>
              <Text style={styles.pinPrice}>R{host.price_per_bag_per_day}</Text>
              <View style={styles.pinTail} />
            </View>

            <Callout onPress={() => handlePress(host.id)} tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutName} numberOfLines={1}>{host.display_name}</Text>
                <Text style={styles.calloutMeta}>
                  ★ {host.rating.toFixed(1)} · R{host.price_per_bag_per_day}/bag/day
                </Text>
                {distM !== null && (
                  <Text style={styles.calloutDist}>
                    📍 {formatDistance(distM)} · 🚶 {walkMinutes(distM)} min walk
                  </Text>
                )}
                <Text style={styles.calloutCta}>Tap to view →</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinEmoji: { fontSize: 9, lineHeight: 11 },
  pinPrice: { fontSize: 11, fontWeight: '800', color: '#fff' },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    alignSelf: 'center',
    marginTop: -1,
  },
  callout: { padding: 10, width: 200, backgroundColor: '#fff', borderRadius: 10 },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  calloutMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  calloutDist: { fontSize: 12, color: '#059669', marginTop: 3 },
  calloutCta: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 7 },
});
