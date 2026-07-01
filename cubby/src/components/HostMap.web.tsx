// Web-only map component using Google Maps JavaScript API.
// Metro automatically selects this file over HostMap.tsx on web builds.
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import type { LatLon } from '../lib/location';
import { haversineMeters, formatDistance, walkMinutes } from '../lib/location';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const CAPE_TOWN = { lat: -33.9249, lng: 18.4241 };

const TYPE_EMOJI: Record<string, string> = {
  cafe: '☕', hotel: '🏨', hostel: '🛏️', guesthouse: '🏡',
  airbnb: '🔑', tour_operator: '🗺️', home: '🏠', other: '📦',
};

interface Props {
  filtered: any[];
  userLocation?: LatLon | null;
  onPinPress?: (id: string) => void;
}

declare global {
  interface Window {
    _cubbyMapInit?: () => void;
    _cubbyPush?: (id: string) => void;
  }
}

export default function HostMap({ filtered, userLocation, onPinPress }: Props) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);

  useEffect(() => {
    const hosts = filtered.filter((h: any) => h.latitude && h.longitude);
    const center = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lon }
      : CAPE_TOWN;

    // Expose router helper for InfoWindow button clicks
    window._cubbyPush = (id: string) => {
      if (onPinPress) {
        onPinPress(id);
      } else {
        // Fallback: navigate via URL (Expo Router web)
        const url = new URL(window.location.href);
        url.pathname = '/host-detail';
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url.toString());
      }
    };

    function buildMap(el: HTMLElement) {
      const g = (window as any).google?.maps;
      if (!g) return;

      if (!mapRef.current) {
        mapRef.current = new g.Map(el, {
          center,
          zoom: 13,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        });
        infoRef.current = new g.InfoWindow({ maxWidth: 220 });
      } else {
        mapRef.current.setCenter(center);
      }

      // Clear old markers
      markersRef.current.forEach((m: any) => m.setMap(null));
      markersRef.current = [];

      hosts.forEach((host: any) => {
        const distM = userLocation
          ? haversineMeters(userLocation, { lat: host.latitude, lon: host.longitude })
          : null;

        const distHtml = distM !== null
          ? `<div style="font-size:11px;color:#059669;margin-top:3px">📍 ${formatDistance(distM)} · 🚶 ${walkMinutes(distM)} min walk</div>`
          : '';

        const ratingStr = typeof host.rating === 'number' ? host.rating.toFixed(1) : '—';

        const marker = new g.Marker({
          position: { lat: host.latitude, lng: host.longitude },
          map: mapRef.current,
          label: {
            text: `R${host.price_per_bag_per_day}`,
            color: '#fff',
            fontWeight: '700',
            fontSize: '11px',
          },
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: Colors.primary,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: host.display_name,
        });

        marker.addListener('click', () => {
          infoRef.current.setContent(`
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:4px 2px">
              <div style="font-weight:700;font-size:14px;color:#1A1A1A">${host.display_name}</div>
              <div style="font-size:12px;color:#6B7280;margin-top:3px">★ ${ratingStr} · R${host.price_per_bag_per_day}/bag/day</div>
              ${distHtml}
              <div onclick="window._cubbyPush('${host.id}')"
                style="margin-top:8px;color:${Colors.primary};font-size:12px;font-weight:600;cursor:pointer">
                View details →
              </div>
            </div>
          `);
          infoRef.current.open(mapRef.current, marker);
        });

        markersRef.current.push(marker);
      });

      // Blue dot for user location (manual — Google Maps JS doesn't auto-show on web)
      if (userLocation) {
        new g.Marker({
          position: center,
          map: mapRef.current,
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2.5,
          },
          title: 'Your location',
          zIndex: 9999,
        });
      }
    }

    const el = containerRef.current as HTMLElement | null;
    if (!el) return;

    if ((window as any).google?.maps) {
      buildMap(el);
    } else if (!document.getElementById('cubby-gmaps')) {
      const script = document.createElement('script');
      script.id = 'cubby-gmaps';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=_cubbyMapInit`;
      script.async = true;
      window._cubbyMapInit = () => {
        delete window._cubbyMapInit;
        buildMap(el);
      };
      document.head.appendChild(script);
    } else {
      // Script is already loading — chain callback
      const prev = window._cubbyMapInit;
      window._cubbyMapInit = () => {
        prev?.();
        buildMap(el);
      };
    }
  }, [filtered, userLocation]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Map unavailable</Text>
        <Text style={styles.sub}>
          Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your environment to enable the map.
        </Text>
      </View>
    );
  }

  return <View ref={containerRef} style={{ flex: 1 }} />;
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, backgroundColor: '#F5F4EF',
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
