// Web-only map component using Google Maps JavaScript API.
// Metro automatically selects this file over HostMap.tsx on web builds.
//
// Markers are DOM-based OverlayView instances ("price pills") — full CSS
// control for shape, shadow, animation, and selected state. This approach
// keeps the door open for clustering, availability badges, and favourites
// without fighting the Google Maps marker API limitations.
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import type { LatLon } from '../lib/location';
import { haversineMeters, formatDistance, walkMinutes } from '../lib/location';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const CAPE_TOWN = { lat: -33.9249, lng: 18.4241 };

// TEMP DEBUG — remove once the Maps env var loading issue is resolved.
console.log('[HostMap debug] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY present:', !!GOOGLE_MAPS_KEY,
  '| length:', GOOGLE_MAPS_KEY.length,
  '| preview:', GOOGLE_MAPS_KEY ? `${GOOGLE_MAPS_KEY.slice(0, 6)}...${GOOGLE_MAPS_KEY.slice(-4)}` : '(empty)');

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

// --- CSS injected once into <head> ---
const PILL_CSS = `
.cubby-pill {
  position: absolute;
  transform: translate(-50%, -50%);
  background: ${Colors.primary};
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.2px;
  white-space: nowrap;
  padding: 6px 11px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(255,92,92,0.35), 0 1px 3px rgba(0,0,0,0.18);
  cursor: pointer;
  user-select: none;
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  /* entrance animation */
  animation: cubby-pill-in 0.2s ease both;
}
@keyframes cubby-pill-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.88); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.cubby-pill:hover {
  background: #f04040;
  box-shadow: 0 4px 14px rgba(255,92,92,0.45), 0 2px 5px rgba(0,0,0,0.2);
  transform: translate(-50%, -50%) scale(1.06);
}
.cubby-pill.selected {
  background: #c0392b;
  box-shadow: 0 6px 20px rgba(192,57,43,0.55), 0 2px 8px rgba(0,0,0,0.25);
  transform: translate(-50%, -50%) scale(1.14);
  z-index: 10 !important;
}
`;

function injectPillCSS() {
  if (document.getElementById('cubby-pill-css')) return;
  const style = document.createElement('style');
  style.id = 'cubby-pill-css';
  style.textContent = PILL_CSS;
  document.head.appendChild(style);
}

// Build a DOM-based price pill using OverlayView.
// Each marker is self-contained and holds a reference to its host data,
// making it straightforward to add clustering, badges, or state later.
function createPillOverlay(
  g: any,
  map: any,
  host: any,
  distM: number | null,
  onSelect: (overlay: any) => void,
) {
  const overlay = new g.OverlayView();

  overlay._host = host;
  overlay._el = null as HTMLDivElement | null;
  overlay._latlng = new g.LatLng(host.latitude, host.longitude);
  overlay._selected = false;

  overlay.onAdd = function () {
    const el = document.createElement('div');
    el.className = 'cubby-pill';
    el.textContent = `R${host.price_per_bag_per_day}`;
    el.addEventListener('click', () => onSelect(overlay));
    overlay._el = el;
    overlay.getPanes().floatPane.appendChild(el);
  };

  overlay.draw = function () {
    if (!overlay._el) return;
    const proj = overlay.getProjection();
    const pt = proj.fromLatLngToDivPixel(overlay._latlng);
    if (!pt) return;
    overlay._el.style.left = `${pt.x}px`;
    overlay._el.style.top = `${pt.y}px`;
  };

  overlay.onRemove = function () {
    overlay._el?.parentNode?.removeChild(overlay._el);
    overlay._el = null;
  };

  overlay.setSelected = function (sel: boolean) {
    overlay._selected = sel;
    if (overlay._el) {
      overlay._el.classList.toggle('selected', sel);
    }
  };

  overlay.setMap(map);
  return overlay;
}

export default function HostMap({ filtered, userLocation, onPinPress }: Props) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  const selectedRef = useRef<any>(null);

  useEffect(() => {
    const hosts = filtered.filter((h: any) => h.latitude && h.longitude);
    const center = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lon }
      : CAPE_TOWN;

    window._cubbyPush = (id: string) => {
      if (onPinPress) {
        onPinPress(id);
      } else {
        const url = new URL(window.location.href);
        url.pathname = '/host-detail';
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url.toString());
      }
    };

    function buildMap(el: HTMLElement) {
      const g = (window as any).google?.maps;
      if (!g) return;

      injectPillCSS();

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
        infoRef.current = new g.InfoWindow({ maxWidth: 240 });

        // Clicking the map deselects the active pill
        mapRef.current.addListener('click', () => {
          if (selectedRef.current) {
            selectedRef.current.setSelected(false);
            selectedRef.current = null;
          }
          infoRef.current.close();
        });
      } else {
        mapRef.current.setCenter(center);
      }

      // Remove old overlays
      overlaysRef.current.forEach((o: any) => o.setMap(null));
      overlaysRef.current = [];
      selectedRef.current = null;

      hosts.forEach((host: any) => {
        const distM = userLocation
          ? haversineMeters(userLocation, { lat: host.latitude, lon: host.longitude })
          : null;

        const overlay = createPillOverlay(
          g,
          mapRef.current,
          host,
          distM,
          (clicked: any) => {
            // Deselect previous
            if (selectedRef.current && selectedRef.current !== clicked) {
              selectedRef.current.setSelected(false);
            }
            // Toggle selection
            const nowSelected = !clicked._selected;
            clicked.setSelected(nowSelected);
            selectedRef.current = nowSelected ? clicked : null;

            if (nowSelected) {
              const ratingStr = typeof host.rating === 'number' ? host.rating.toFixed(1) : '—';
              const distHtml = distM !== null
                ? `<div style="font-size:11px;color:#059669;margin-top:4px">📍 ${formatDistance(distM)} · 🚶 ${walkMinutes(distM)} min walk</div>`
                : '';
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
              // Anchor InfoWindow to an invisible zero-size marker at the same position
              // so it appears above the pill without relying on the OverlayView pane
              if (!overlay._anchorMarker) {
                overlay._anchorMarker = new g.Marker({
                  position: overlay._latlng,
                  map: mapRef.current,
                  icon: { path: g.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0, strokeOpacity: 0 },
                });
              }
              infoRef.current.open(mapRef.current, overlay._anchorMarker);
            } else {
              infoRef.current.close();
            }
          },
        );

        overlaysRef.current.push(overlay);
      });

      // Blue dot for user location
      if (userLocation) {
        const g2 = (window as any).google.maps;
        new g2.Marker({
          position: center,
          map: mapRef.current,
          icon: {
            path: g2.SymbolPath.CIRCLE,
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=_cubbyMapInit`;
      script.async = true;
      window._cubbyMapInit = () => {
        delete window._cubbyMapInit;
        buildMap(el);
      };
      document.head.appendChild(script);
    } else {
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
