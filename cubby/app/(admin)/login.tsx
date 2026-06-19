import { useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CORRECT_PIN = '2604';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#2D6A4F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 40px', width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Cubby Admin</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: '0 0 36px' }}>Enter your PIN to continue</p>

        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: 9,
              border: '2px solid white',
              backgroundColor: i < pin.length ? 'white' : 'transparent',
              transition: 'background-color 0.1s',
            }} />
          ))}
        </div>

        {error && <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 16, fontWeight: 600, margin: '0 0 16px' }}>{error}</p>}

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
                  style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: key === '' ? 'transparent' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    cursor: key === '' ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: key === '⌫' ? 20 : 24,
                    fontWeight: 600,
                    color: 'white',
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
