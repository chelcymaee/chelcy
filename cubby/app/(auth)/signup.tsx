import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import Btn from '../../src/components/Btn';
import Banner from '../../src/components/Banner';

type Role = 'traveller' | 'host' | 'both' | 'runner';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('traveller');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSignup() {
    if (!fullName || !email || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        });
        if (error) { setErrorMsg(error.message); return; }

        const user = data.user;
        console.log('[signup] auth.signUp result:', { userId: user?.id, hasSession: !!data.session });

        if (!user) {
          setErrorMsg('Signup failed — no user returned. Please try again.');
          return;
        }

        if (data.session) {
          // Session is active (email confirmation disabled) — insert profile now.
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(
              { id: user.id, email, full_name: fullName, role },
              { onConflict: 'id', ignoreDuplicates: true },
            );
          if (upsertError) {
            console.error('[signup] profile upsert failed:', upsertError);
            // Non-fatal: the DB trigger will create the row. Log and continue.
          } else {
            console.log('[signup] profile upsert succeeded for', user.id);
          }
        } else {
          // No session yet — email confirmation is enabled in Supabase.
          // The on_auth_user_created DB trigger will create the profile row.
          console.log('[signup] no session — email confirmation required. Trigger will create profile.');
          setErrorMsg('');
          setLoading(false);
          Alert.alert('Account created!', 'Please check your email and confirm your address before signing in.');
          return;
        }
      } else {
        // Local auth — save account to device
        const existing = await AsyncStorage.getItem('cubby_local_user');
        if (existing && JSON.parse(existing).email === email) {
          setErrorMsg('An account with this email already exists. Please sign in.');
          return;
        }
        const user = { email, password, fullName, role, id: Date.now().toString() };
        await AsyncStorage.setItem('cubby_local_user', JSON.stringify(user));
        await AsyncStorage.setItem('cubby_session', JSON.stringify(user));
        await AsyncStorage.setItem('cubby_traveller_profile', JSON.stringify({ name: fullName, avatarUri: null }));
      }
      if (role === 'host' || role === 'both') router.replace('/(host)/bank-details');
      else if (role === 'runner') router.replace('/(runner)/dashboard');
      else router.replace('/(traveller)/explore');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const roleOptions: { value: Role; label: string; emoji: string; desc: string }[] = [
    { value: 'traveller', emoji: '🧳', label: 'Traveller', desc: 'I need to store my bags' },
    { value: 'host', emoji: '🏠', label: 'Host', desc: 'I want to earn by storing bags' },
    { value: 'both', emoji: '✌️', label: 'Both', desc: 'I travel and host' },
    { value: 'runner', emoji: '🚗', label: 'Bag Runner', desc: 'I pick up & deliver bags' },
  ];

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

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Join Cubby — it only takes a minute</Text>

        {!!errorMsg && <Banner message={errorMsg} variant="error" />}

        {/* Role picker */}
        <Text style={styles.label}>I am a…</Text>
        <View style={styles.roleRow}>
          {roleOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.roleCard, role === opt.value && styles.roleCardActive]}
              onPress={() => setRole(opt.value)}
              activeOpacity={0.8}
              // @ts-ignore
              onClick={() => setRole(opt.value)}
            >
              <Text style={styles.roleEmoji}>{opt.emoji}</Text>
              <Text style={[styles.roleLabel, role === opt.value && styles.roleLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.roleDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Choose a strong password"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
          />

          <Btn
            label={loading ? 'Creating account…' : 'Create account'}
            onPress={handleSignup}
            loading={loading}
            style={styles.btn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By signing up you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/(traveller)/terms')}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/(traveller)/privacy')}>
            Privacy Policy
          </Text>
          .
        </Text>
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
  subheading: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: '#EFF5F3' },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { fontSize: 10, color: Colors.textLight, textAlign: 'center', marginTop: 2 },
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: Colors.textSecondary, fontSize: 15 },
  footerLink: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  terms: { textAlign: 'center', color: Colors.textLight, fontSize: 12, marginTop: 16, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: '600' },
});
