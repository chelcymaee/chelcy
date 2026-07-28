import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { loginAdmin } from '../../src/lib/admin-auth';

// The PIN comparison, attempt counting, and lockout enforcement all moved
// server-side (verify-admin-pin — see src/lib/admin-auth.ts and
// supabase/functions/_shared/admin-session.ts). This screen no longer
// knows the correct PIN, no longer counts attempts itself, and no longer
// decides when to lock — it only reflects what the server just reported.
// Clearing local state early can't grant an extra attempt or shorten a
// lockout; the next submit still hits the same server-enforced check.

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  // Countdown timer while locked — cosmetic only, driven by the
  // retryAfterSeconds the server returned with its 429.
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setError('');
        clearInterval(tick);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [lockedUntil]);

  async function handleDigit(digit: string) {
    if (lockedUntil || submitting || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      setSubmitting(true);
      const result = await loginAdmin(newPin);
      setSubmitting(false);
      setTimeout(() => setPin(''), 600);

      if (result.ok) {
        router.replace('/(admin)/dashboard');
        return;
      }

      if (result.reason === 'locked') {
        setLockedUntil(Date.now() + result.retryAfterSeconds * 1000);
        setError('Too many attempts. Locked for a while — try again shortly.');
      } else if (result.reason === 'not_configured') {
        setError('Admin PIN not configured on the server. Contact the founder.');
      } else if (result.reason === 'invalid_pin') {
        const remaining = result.attemptsRemaining;
        setError(
          remaining != null
            ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Incorrect PIN.',
        );
      } else {
        setError("Couldn't reach the server. Please try again.");
      }
    }
  }

  function handleDelete() {
    if (lockedUntil || submitting) return;
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
  const disabled = isLocked || submitting;

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

        <div style={{ width: '100%', maxWidth: 280, marginTop: 16, opacity: submitting ? 0.6 : 1 }}>
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
                  disabled={disabled && key !== ''}
                  style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: key === '' ? 'transparent' : disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    cursor: key === '' || disabled ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: key === '⌫' ? 20 : 24,
                    fontWeight: 600,
                    color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
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
