import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import Btn from '../../src/components/Btn';
import Banner from '../../src/components/Banner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email) {
      setErrorMsg('Please enter your email address');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Linking.createURL('reset-password'),
        });
        if (error) { setErrorMsg(error.message); return; }
      }
      setSent(true);
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
        <TouchableOpacity style={styles.back} onPress={() => router.replace('/(auth)/login')}
          // @ts-ignore
          onClick={() => router.replace('/(auth)/login')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <Text style={styles.logoIcon}>🧳</Text>
          <Text style={styles.logoName}>cubby</Text>
        </View>

        {sent ? (
          <>
            <Text style={styles.heading}>Check your email</Text>
            <Text style={styles.subheading}>
              If an account exists for {email}, we've sent a link to reset your password.
            </Text>
            <Btn label="Back to sign in" onPress={() => router.replace('/(auth)/login')} style={styles.btn} />
          </>
        ) : (
          <>
            <Text style={styles.heading}>Forgot password?</Text>
            <Text style={styles.subheading}>Enter your email and we'll send you a reset link.</Text>

            {!!errorMsg && <Banner message={errorMsg} variant="error" />}

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Btn
                label={loading ? 'Sending…' : 'Send reset link'}
                onPress={handleSend}
                loading={loading}
                style={styles.btn}
              />
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: Colors.textSecondary, fontSize: 15 },
  footerLink: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
