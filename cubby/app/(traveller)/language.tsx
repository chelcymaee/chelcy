import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const LANGUAGES = [
  'English',
  'Afrikaans',
  'Zulu',
  'Xhosa',
  'German',
  'French',
  'Portuguese',
];

export default function Language() {
  const [selected, setSelected] = useState('English');
  const [toast, setToast] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('cubby_language').then(lang => {
      if (lang) setSelected(lang);
    });
  }, []);

  async function handleSelect(lang: string) {
    if (lang !== 'English') {
      setToast(`${lang} — coming soon!`);
      setTimeout(() => setToast(''), 2500);
      return;
    }
    setSelected(lang);
    await AsyncStorage.setItem('cubby_language', lang);
  }

  return (
    <SafeAreaView style={styles.container}>
      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(traveller)/profile')} style={styles.backBtn}
          // @ts-ignore
          onClick={() => router.replace('/(traveller)/profile')}>
          <Text style={styles.backText}>← Account</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Language</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.listCard}>
          {LANGUAGES.map((lang, idx) => (
            <TouchableOpacity
              key={lang}
              style={[styles.row, idx === LANGUAGES.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => handleSelect(lang)}
              activeOpacity={0.7}
              // @ts-ignore
              onClick={() => handleSelect(lang)}
            >
              <Text style={styles.langLabel}>{lang}</Text>
              {lang !== 'English' && <Text style={styles.comingSoon}>Coming soon</Text>}
              <View style={[styles.radio, selected === lang && styles.radioSelected]}>
                {selected === lang && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: { flex: 1 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerRight: { flex: 1 },
  listCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA',
  },
  langLabel: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#FF5C5C' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5C5C' },
  comingSoon: { fontSize: 11, color: '#9CA3AF', marginRight: 10, fontStyle: 'italic' },
  toast: {
    position: 'absolute', top: 16, left: 24, right: 24, zIndex: 100,
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
