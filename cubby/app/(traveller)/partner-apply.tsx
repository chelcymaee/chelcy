import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

const BUSINESS_TYPES = [
  { label: '☕ Café', value: 'cafe' },
  { label: '🏨 Hotel', value: 'hotel' },
  { label: '🛏️ Hostel', value: 'hostel' },
  { label: '🔑 Airbnb / Guesthouse', value: 'airbnb' },
  { label: '🗺️ Tour Operator', value: 'tour_operator' },
  { label: '🍽️ Restaurant', value: 'restaurant' },
  { label: '🛍️ Retail Shop', value: 'retail' },
  { label: '🏠 Home Host', value: 'home' },
  { label: '📦 Other', value: 'other' },
];

type Field = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  location: string;
  capacity: string;
  hours: string;
  message: string;
};

const EMPTY: Field = {
  name: '', email: '', phone: '', businessName: '',
  businessType: '', location: '', capacity: '', hours: '', message: '',
};

export default function PartnerApply() {
  const [fields, setFields] = useState<Field>(EMPTY);
  const [errors, setErrors] = useState<Partial<Field>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  function set(key: keyof Field, value: string) {
    setFields(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  }

  function validate(): boolean {
    const e: Partial<Field> = {};
    if (!fields.name.trim()) e.name = 'Full name is required';
    if (!fields.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) e.email = 'Enter a valid email';
    if (!fields.businessName.trim()) e.businessName = 'Business name is required';
    if (!fields.businessType) e.businessType = 'Select a business type';
    if (!fields.location.trim()) e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const payload = {
        name: fields.name.trim(),
        email: fields.email.trim().toLowerCase(),
        phone: fields.phone.trim() || null,
        business_name: fields.businessName.trim(),
        business_type: fields.businessType,
        location: fields.location.trim(),
        storage_capacity: fields.capacity ? parseInt(fields.capacity, 10) : null,
        available_hours: fields.hours.trim() || null,
        message: fields.message.trim() || null,
        status: 'pending',
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('partner_applications').insert(payload);
        if (error) {
          setServerError('Could not submit application. Please try again.');
          return;
        }
      }
      // In demo mode we just show success without hitting Supabase
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.successOuter}>
          <View style={s.successCard}>
            <Text style={s.successEmoji}>🎉</Text>
            <Text style={s.successTitle}>Application submitted!</Text>
            <Text style={s.successBody}>
              Thanks, <Text style={s.bold}>{fields.name.split(' ')[0]}</Text>! We've received your partner application and will be in touch within 2–3 business days.
            </Text>
            <View style={s.successSteps}>
              {[
                { n: '1', t: 'We review your application' },
                { n: '2', t: 'A Cubby team member contacts you' },
                { n: '3', t: 'You get listed and start earning' },
              ].map(step => (
                <View key={step.n} style={s.step}>
                  <View style={s.stepCircle}><Text style={s.stepNum}>{step.n}</Text></View>
                  <Text style={s.stepText}>{step.t}</Text>
                </View>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => router.replace('/(traveller)/explore')}
            // @ts-ignore
            onClick={() => router.replace('/(traveller)/explore')}
          >
            <Text style={s.doneBtnText}>Back to explore</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <TouchableOpacity
            style={s.back}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(traveller)/explore')}
            // @ts-ignore
            onClick={() => router.canGoBack() ? router.back() : router.replace('/(traveller)/explore')}
          >
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.emoji}>🤝</Text>
          <Text style={s.heading}>Become a Cubby Partner</Text>
          <Text style={s.sub}>
            Earn money by storing travellers' bags at your venue. Fill in the form below and our team will be in touch.
          </Text>

          <View style={s.benefitsRow}>
            {['💰 Earn extra income', '📦 Easy to manage', '🏆 Join 50+ partners'].map(b => (
              <View key={b} style={s.benefitChip}>
                <Text style={s.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {!!serverError && (
            <View style={s.errorBanner}>
              <Text style={s.errorBannerText}>⚠️ {serverError}</Text>
            </View>
          )}

          {/* ── Contact details ─────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Your details</Text>

          <Field
            label="Full name *"
            value={fields.name}
            onChangeText={v => set('name', v)}
            placeholder="Jane Smith"
            error={errors.name}
            autoCapitalize="words"
          />
          <Field
            label="Email address *"
            value={fields.email}
            onChangeText={v => set('email', v)}
            placeholder="jane@yourbusiness.co.za"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone number"
            value={fields.phone}
            onChangeText={v => set('phone', v)}
            placeholder="+27 81 234 5678"
            keyboardType="phone-pad"
          />

          {/* ── Business details ─────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Your business</Text>

          <Field
            label="Business name *"
            value={fields.businessName}
            onChangeText={v => set('businessName', v)}
            placeholder="Cape Corner Café"
            error={errors.businessName}
            autoCapitalize="words"
          />

          <Text style={s.fieldLabel}>Business type *</Text>
          <View style={s.typeGrid}>
            {BUSINESS_TYPES.map(bt => (
              <TouchableOpacity
                key={bt.value}
                style={[s.typeChip, fields.businessType === bt.value && s.typeChipActive]}
                onPress={() => set('businessType', bt.value)}
                // @ts-ignore
                onClick={() => set('businessType', bt.value)}
              >
                <Text style={[s.typeChipText, fields.businessType === bt.value && s.typeChipTextActive]}>
                  {bt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!errors.businessType && <Text style={s.fieldError}>{errors.businessType}</Text>}

          <Field
            label="Location / Address *"
            value={fields.location}
            onChangeText={v => set('location', v)}
            placeholder="123 Long Street, Cape Town"
            error={errors.location}
            autoCapitalize="words"
          />
          <Field
            label="Storage capacity (bags)"
            value={fields.capacity}
            onChangeText={v => set('capacity', v.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 20"
            keyboardType="number-pad"
            hint="Approximate number of bags you can store at a time"
          />
          <Field
            label="Available hours"
            value={fields.hours}
            onChangeText={v => set('hours', v)}
            placeholder="e.g. Mon–Sat 8am–6pm"
            autoCapitalize="none"
          />

          {/* ── Message ──────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Tell us more</Text>

          <Text style={s.fieldLabel}>Short message</Text>
          <TextInput
            style={s.textarea}
            value={fields.message}
            onChangeText={v => set('message', v)}
            placeholder="Tell us a bit about your venue and why you'd like to join Cubby…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={s.trustNote}>
            <Text style={s.trustIcon}>🔒</Text>
            <Text style={s.trustText}>
              Your details are only used to process your partner application and will never be shared with third parties.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            // @ts-ignore
            onClick={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Submit application →</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Field sub-component ──────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, error, hint,
  keyboardType, autoCapitalize, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; error?: string; hint?: string;
  keyboardType?: any; autoCapitalize?: any; multiline?: boolean;
}) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, !!error && s.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
      {!!hint && <Text style={s.fieldHint}>{hint}</Text>}
      {!!error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingTop: 12 },

  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },

  emoji: { fontSize: 48, marginBottom: 12 },
  heading: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8 },
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 16 },

  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  benefitChip: {
    backgroundColor: '#FFF0F0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FFD0D0',
  },
  benefitText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  errorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBannerText: { fontSize: 14, color: '#B91C1C', fontWeight: '600' },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 24, marginBottom: 12,
  },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '600' },
  input: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: '#FFF0F0', borderColor: Colors.primary },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary },

  textarea: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.textPrimary,
    minHeight: 100,
  },

  trustNote: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F0FFF4',
    borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 24,
  },
  trustIcon: { fontSize: 18 },
  trustText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  submitBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // ── Success screen ──
  successOuter: {
    flex: 1, padding: 24, paddingTop: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  successCard: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 28,
    width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, marginBottom: 20,
  },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  successBody: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  successSteps: { width: '100%', gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '800', color: '#fff' },
  stepText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  doneBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', width: '100%',
  },
  doneBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
