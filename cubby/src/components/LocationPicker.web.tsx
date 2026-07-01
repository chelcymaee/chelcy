// Web-only location picker using Google Maps Places Autocomplete JS API.
// Metro selects this over LocationPicker.tsx for web builds.
import { useEffect, useRef, useState, useCallback } from 'react';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface Props {
  value: string;
  onSelect: (result: LocationResult) => void;
  placeholder?: string;
  label?: string;
  inputStyle?: React.CSSProperties;
}

// Shared loader — ensures Maps JS API (with Places) loads exactly once
let _mapsPromise: Promise<void> | null = null;
function loadMapsJS(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise<void>((resolve) => {
    const existing = document.getElementById('cubby-gmaps') as HTMLScriptElement | null;
    if (existing) {
      // Script already in DOM — wait for it; update src to include places if missing
      const poll = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(poll); resolve(); }
      }, 80);
      return;
    }
    const script = document.createElement('script');
    script.id = 'cubby-gmaps';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return _mapsPromise;
}

export default function LocationPicker({ value, onSelect, placeholder, label, inputStyle }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const svcRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const autoGeocoded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init Places service + auto-geocode existing address on mount
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    loadMapsJS().then(() => {
      svcRef.current = new (window as any).google.maps.places.AutocompleteService();

      // Auto-geocode existing address (existing hosts with no coordinates)
      if (value && !autoGeocoded.current) {
        autoGeocoded.current = true;
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: value, region: 'za' }, (results: any[], status: string) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            const address = results[0].formatted_address;
            setQuery(address);
            setConfirmed(true);
            onSelect({ address, latitude: loc.lat(), longitude: loc.lng() });
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    setQuery(value);
    if (!value) setConfirmed(false);
  }, [value]);

  const search = useCallback((text: string) => {
    if (!svcRef.current || !text || text.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      svcRef.current.getPlacePredictions(
        { input: text, componentRestrictions: { country: 'za' }, types: ['geocode', 'establishment'] },
        (preds: any[], status: string) => {
          setLoading(false);
          setSuggestions(status === 'OK' ? preds.slice(0, 5) : []);
        },
      );
    }, 320);
  }, []);

  function handleChange(text: string) {
    setQuery(text);
    setConfirmed(false);
    search(text);
  }

  function handleSelect(place: any) {
    setSuggestions([]);
    setLoading(true);
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ placeId: place.place_id }, (results: any[], status: string) => {
      setLoading(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const address = results[0].formatted_address;
        setQuery(address);
        setConfirmed(true);
        onSelect({ address, latitude: loc.lat(), longitude: loc.lng() });
      }
    });
  }

  function clear() {
    setQuery('');
    setConfirmed(false);
    setSuggestions([]);
    onSelect({ address: '', latitude: 0, longitude: 0 });
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const baseInput: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: 12,
    border: confirmed ? '1.5px solid #10B981' : '1px solid #F0EAEA',
    padding: '14px 40px 14px 16px',
    fontSize: 15,
    color: '#1a1a1a',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 8, marginTop: 20, display: 'block' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          style={inputStyle ?? baseInput}
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder ?? 'Search address or area…'}
          autoComplete="off"
          spellCheck={false}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4, pointerEvents: confirmed ? 'auto' : 'none' }}>
          {loading
            ? <span style={{ fontSize: 13, color: '#9CA3AF' }}>⏳</span>
            : confirmed
              ? <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14, padding: '2px 4px', lineHeight: 1 }} title="Clear">✕</button>
              : null}
        </div>
      </div>

      {confirmed && (
        <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginTop: 5 }}>
          ✅ Location confirmed
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 9999, left: 0, right: 0, top: 'calc(100% + 4px)',
          backgroundColor: 'white', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #F0EAEA',
          overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s.place_id}
              onClick={() => handleSelect(s)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 16px', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F5F5F5' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFF5F5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>📍</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                  {s.structured_formatting?.main_text ?? s.description}
                </div>
                {s.structured_formatting?.secondary_text && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {s.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
