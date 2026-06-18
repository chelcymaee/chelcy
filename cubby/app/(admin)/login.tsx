import {
  View, Text, StyleSheet, SafeAreaView,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const CORRECT_PIN = '2604';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleDigit(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN) {
        await AsyncStorage.setItem('cubby_admin_session', 'true');
        router.replace('/(admin)/dashboard');
      } else {
        shake();
        setError('Incorrect PIN');
        setTimeout(() => setPin(''), 600);
      }
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Cubby Admin</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.keypad}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key, ki) => (
                // @ts-ignore
                <button
                  key={ki}
                  onClick={() => {
                    if (key === '') return;
                    if (key === '⌫') handleDelete();
                    else handleDigit(key);
                  }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: key === '' ? 'transparent' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    cursor: key === '' ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[styles.keyText, key === '⌫' && styles.keyDelete]}>{key}</Text>
                </button>
              ))}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.white, marginBottom: 6 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 36 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: Colors.white },
  errorText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 16, fontWeight: '600' },
  keypad: { width: '100%', maxWidth: 280, marginTop: 16 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 20 },
  keyText: { fontSize: 24, fontWeight: '600', color: Colors.white },
  keyDelete: { fontSize: 20 },
});
