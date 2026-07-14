import { Platform } from 'react-native';

export interface LatLon { lat: number; lon: number; }

// Haversine formula — returns distance in metres between two points
export function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Walking speed ≈ 5 km/h = 83 m/min
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 83));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatWalkLabel(meters: number): string {
  return `${walkMinutes(meters)} min walk`;
}

// Request foreground location permission and return current coordinates (native only)
export async function getUserLocation(): Promise<LatLon | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}
