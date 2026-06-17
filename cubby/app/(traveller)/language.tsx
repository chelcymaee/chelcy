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

  useEffect(() => {
    AsyncStorage.getItem('cubby_language').then(lang => {
      if (lang) setSelected(lang);
    });
  }, []);

  async function handleSelect(lang: string) {
    setSelected(lang);
    await AsyncStorage.setItem('cubby_language', lang);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
            >
              <Text style={styles.langLabel}>{lang}</Text>
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
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5C5C',
  },
});
