import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const ADMIN_PIN = process.env.EXPO_PUBLIC_ADMIN_PIN ?? '1234';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  // Load lockout state on mount
  useEffect(() => {
    AsyncStorage.getItem('cubby_admin_lockout').then(raw => {
      if (!raw) return;
      const { until, count } = JSON.parse(raw);
      if (Date.now() < until) {
        setLockedUntil(until);
        setAttempts(count);
      } else {
        // Lockout expired — clear it
        AsyncStorage.removeItem('cubby_admin_lockout');
      }
    });
  }, []);

  // Countdown timer when locked
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setError('');
        AsyncStorage.removeItem('cubby_admin_lockout');
        clearInterval(tick);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [lockedUntil]);

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  async function recordFailedAttempt() {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS;
      setLockedUntil(until);
      await AsyncStorage.setItem('cubby_admin_lockout', JSON.stringify({ until, count: next }));
      setError(`Too many attempts. Locked for 15 minutes.`);
    } else {
      setError(`Incorrect PIN. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? '' : 's'} remaining.`);
    }
  }

  async function handleDigit(digit: string) {
    if (lockedUntil || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      if (!ADMIN_PIN) {
        // No PIN configured — block access entirely
        shake();
        setError('Admin PIN not configured. Set EXPO_PUBLIC_ADMIN_PIN.');
        setTimeout(() => setPin(''), 600);
        return;
      }
      if (newPin === ADMIN_PIN) {
        // Clear lockout on success
        await AsyncStorage.removeItem('cubby_admin_lockout');
        setAttempts(0);
        // Store session with expiry
        await AsyncStorage.setItem('cubby_admin_session', JSON.stringify({
          expiresAt: Date.now() + SESSION_TTL_MS,
        }));
        router.replace('/(admin)/dashboard');
      } else {
        shake();
        await recordFailedAttempt();
        setTimeout(() => setPin(''), 600);
      }
    }
  }

  function handleDelete() {
    if (lockedUntil) return;
    setPin(p => p.slice(0, -1));
    setError('');
  }

  const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  const isLocked = !!lockedUntil;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#2D6A4F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 40px', width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{isLocked ? '🔐' : '🔒'}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Cubby Admin</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: '0 0 36px' }}>
          {isLocked ? `Locked — try again in ${countdown}` : 'Enter your PIN to continue'}
        </p>

        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: 9,
              border: `2px solid ${isLocked ? 'rgba(255,255,255,0.4)' : 'white'}`,
              backgroundColor: i < pin.length ? 'white' : 'transparent',
              transition: 'background-color 0.1s',
            }} />
          ))}
        </div>

        {error && (
          <p style={{
            color: '#FECACA', fontSize: 14, marginBottom: 16, fontWeight: 600,
            margin: '0 0 16px', textAlign: 'center', maxWidth: 260,
          }}>
            {error}
          </p>
        )}

        <div style={{ width: '100%', maxWidth: 280, marginTop: 16 }}>
          {KEYS.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, gap: 20 }}>
              {row.map((key, ki) => (
                <button
                  key={ki}
                  onClick={() => {
                    if (key === '') return;
                    if (key === '⌫') handleDelete();
                    else handleDigit(key);
                  }}
                  disabled={isLocked && key !== ''}
                  style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: key === '' ? 'transparent' : isLocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    cursor: key === '' || isLocked ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: key === '⌫' ? 20 : 24,
                    fontWeight: 600,
                    color: isLocked ? 'rgba(255,255,255,0.3)' : 'white',
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
