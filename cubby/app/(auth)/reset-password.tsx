import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import Btn from '../../src/components/Btn';
import Banner from '../../src/components/Banner';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPassword() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [done, setDone] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function friendlyCodeError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('expired')) return 'This code has expired. Request a new one below.';
    if (m.includes('invalid') || m.includes('not found')) return 'That code isn\'t valid — check for typos, or request a new one below.';
    return 'We couldn\'t verify that code. Request a new one below.';
  }

  async function handleVerify() {
    if (verifying) return;
    if (!email) {
      setCodeError('No email on file for this reset — please request a new code.');
      return;
    }
    if (code.length !== 6) {
      setCodeError('Enter the 6-digit code from your email.');
      return;
    }
    setCodeError('');
    setVerifying(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
        if (error) { setCodeError(friendlyCodeError(error.message)); return; }
      }
      setVerified(true);
    } catch (err: any) {
      setCodeError(friendlyCodeError(err?.message ?? ''));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resending || resendCooldown > 0 || !email) return;
    setResending(true);
    setResendMsg('');
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.resetPasswordForEmail(email);
      }
      setResendMsg('A new code is on its way.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  }

  async function handleReset() {
    if (updating) return;
    if (!password || password.length < 6) {
      setUpdateError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setUpdateError('Passwords do not match');
      return;
    }
    setUpdateError('');
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setUpdateError(error.message); return; }
      await supabase.auth.signOut();
      setDone(true);
    } catch (err: any) {
      setUpdateError(err?.message ?? 'Something went wrong');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <Text style={styles.logoIcon}>🧳</Text>
          <Text style={styles.logoName}>cubby</Text>
        </View>

        {done ? (
          <>
            <Text style={styles.heading}>Password updated</Text>
            <Text style={styles.subheading}>Your password has been changed. Sign in with your new password.</Text>
            <Btn label="Back to sign in" onPress={() => router.replace('/(auth)/login')} style={styles.btn} />
          </>
        ) : !email ? (
          <>
            <Text style={styles.heading}>Link expired</Text>
            <Text style={styles.subheading}>
              This reset session is invalid or has expired. Request a new one to continue.
            </Text>
            <Btn label="Request new code" onPress={() => router.replace('/(auth)/forgot-password')} style={styles.btn} />
          </>
        ) : !verified ? (
          <>
            <Text style={styles.heading}>Enter your code</Text>
            <Text style={styles.subheading}>
              If an account exists for {email}, we've sent a 6-digit code. Enter it below.
            </Text>

            {!!codeError && <Banner message={codeError} variant="error" />}
            {!!resendMsg && <Banner message={resendMsg} variant="success" />}

            <View style={styles.form}>
              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                editable={!verifying}
              />

              <Btn
                label={verifying ? 'Verifying…' : 'Verify code'}
                onPress={handleVerify}
                loading={verifying}
                style={styles.btn}
              />

              <TouchableOpacity
                style={styles.resend}
                onPress={handleResend}
                disabled={resending || resendCooldown > 0}
                // @ts-ignore
                onClick={handleResend}
              >
                <Text style={[styles.resendText, (resending || resendCooldown > 0) && styles.resendTextDisabled]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : resending ? 'Sending…' : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.subheading}>Choose a new password for your account.</Text>

            {!!updateError && <Banner message={updateError} variant="error" />}

            <View style={styles.form}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a strong password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                editable={!updating}
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                editable={!updating}
              />

              <Btn
                label={updating ? 'Updating…' : 'Update password'}
                onPress={handleReset}
                loading={updating}
                style={styles.btn}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 60 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  logoIcon: { fontSize: 28 },
  logoName: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  heading: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subheading: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  btn: { marginTop: 24 },
  resend: { marginTop: 16, alignItems: 'center' },
  resendText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  resendTextDisabled: { color: Colors.textLight },
});
