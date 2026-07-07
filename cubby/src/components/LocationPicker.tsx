// Native location picker using Google Places REST API.
// Metro selects LocationPicker.web.tsx on web; this file is used on iOS/Android.
import { useState, useRef, useCallback } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const PLACES_BASE = 'https://maps.googleapis.com/maps/api';

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
}

export default function LocationPicker({ value, onSelect, placeholder, label }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((text: string) => {
    if (!GOOGLE_MAPS_KEY || !text || text.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `${PLACES_BASE}/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:za&types=geocode|establishment&key=${GOOGLE_MAPS_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.status === 'OK' ? json.predictions.slice(0, 5) : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 320);
  }, []);

  function handleChange(text: string) {
    setQuery(text);
    setConfirmed(false);
    search(text);
  }

  async function handleSelect(place: any) {
    setSuggestions([]);
    setLoading(true);
    try {
      const url = `${PLACES_BASE}/place/details/json?place_id=${place.place_id}&fields=formatted_address,geometry&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.result) {
        const { formatted_address, geometry } = json.result;
        const { lat, lng } = geometry.location;
        setQuery(formatted_address);
        setConfirmed(true);
        onSelect({ address: formatted_address, latitude: lat, longitude: lng });
      }
    } catch {
      // silent — leave query as-is
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQuery('');
    setConfirmed(false);
    setSuggestions([]);
    onSelect({ address: '', latitude: 0, longitude: 0 });
  }

  return (
    <View style={{ position: 'relative' }}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrap, confirmed && styles.inputWrapConfirmed]}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder ?? 'Search address or area…'}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading
          ? <ActivityIndicator size="small" color="#9CA3AF" style={styles.icon} />
          : confirmed
            ? <TouchableOpacity onPress={clear} style={styles.icon}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity>
            : null}
      </View>

      {confirmed && <Text style={styles.confirmed}>✅ Location confirmed</Text>}

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.place_id}
              onPress={() => handleSelect(s)}
              style={[styles.suggestion, i < suggestions.length - 1 && styles.suggestionBorder]}
            >
              <Text style={styles.suggestionPin}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mainText}>{s.structured_formatting?.main_text ?? s.description}</Text>
                {!!s.structured_formatting?.secondary_text && (
                  <Text style={styles.secondaryText}>{s.structured_formatting.secondary_text}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, marginTop: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#F0EAEA',
    paddingHorizontal: 16,
  },
  inputWrapConfirmed: { borderWidth: 1.5, borderColor: '#10B981' },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },
  icon: { paddingLeft: 8 },
  clearBtn: { fontSize: 14, color: '#9CA3AF' },
  confirmed: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 5 },
  dropdown: {
    position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 9999,
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#F0EAEA',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
    elevation: 8, overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionPin: { fontSize: 14, marginTop: 1 },
  mainText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  secondaryText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
