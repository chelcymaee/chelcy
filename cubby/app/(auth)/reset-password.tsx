import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import Btn from '../../src/components/Btn';
import Banner from '../../src/components/Banner';

export default function ResetPassword() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setCheckingSession(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasRecoverySession(!!session);
      setCheckingSession(false);
    });
  }, []);

  async function handleReset() {
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setErrorMsg(error.message); return; }
      await supabase.auth.signOut();
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
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

        {checkingSession ? (
          <Text style={styles.subheading}>Checking your reset link…</Text>
        ) : done ? (
          <>
            <Text style={styles.heading}>Password updated</Text>
            <Text style={styles.subheading}>Your password has been changed. Sign in with your new password.</Text>
            <Btn label="Back to sign in" onPress={() => router.replace('/(auth)/login')} style={styles.btn} />
          </>
        ) : !hasRecoverySession ? (
          <>
            <Text style={styles.heading}>Link expired</Text>
            <Text style={styles.subheading}>
              This reset link is invalid or has expired. Request a new one to continue.
            </Text>
            <Btn label="Request new link" onPress={() => router.replace('/(auth)/forgot-password')} style={styles.btn} />
          </>
        ) : (
          <>
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.subheading}>Choose a new password for your account.</Text>

            {!!errorMsg && <Banner message={errorMsg} variant="error" />}

            <View style={styles.form}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a strong password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
              />

              <Btn
                label={loading ? 'Updating…' : 'Update password'}
                onPress={handleReset}
                loading={loading}
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
  },
  btn: { marginTop: 24 },
});
