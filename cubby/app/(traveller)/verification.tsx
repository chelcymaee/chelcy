import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

type Step = 'loading' | 'status' | 'intro' | 'id' | 'selfie' | 'submitting' | 'submitted' | 'error';

export default function Verification() {
  const [step, setStep] = useState<Step>('loading');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [existingStatus, setExistingStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    checkExistingVerification();
  }, []);

  async function checkExistingVerification() {
    if (!isSupabaseConfigured) { setStep('intro'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStep('intro'); return; }

      const { data, error } = await supabase
        .from('verifications')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // Table may not exist yet — treat as no submission
        setStep('intro');
        return;
      }

      if (data) {
        setExistingStatus(data.status);
        setStep('status');
      } else {
        setStep('intro');
      }
    } catch {
      setStep('intro');
    }
  }

  async function pickId() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setIdPhoto(result.assets[0].uri);
  }

  async function takeSelfie() {
    // On web, camera may not be available — fall back to library
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled) setSelfiePhoto(result.assets[0].uri);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setSelfiePhoto(result.assets[0].uri);
  }

  async function submitVerification() {
    if (!idPhoto || !selfiePhoto) return;
    setStep('submitting');
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in. Please sign in and try again.');

      // Upload ID photo. fetch(localUri).blob() is not usable here — this RN
      // Blob implementation throws "Creating blobs from 'ArrayBuffer' and
      // 'ArrayBufferView' are not supported" — same fix as avatar upload
      // (app/(traveller)/profile.tsx) and host listing photos
      // (app/(host)/host-profile.tsx).
      const idPath = `${user.id}/id.jpg`;
      const idArrayBuffer = await new File(idPhoto).arrayBuffer();
      const { error: idErr } = await supabase.storage
        .from('verifications')
        .upload(idPath, idArrayBuffer, { upsert: true, contentType: 'image/jpeg' });
      if (idErr) throw new Error(`ID upload failed: ${idErr.message}`);

      // Generate 7-day signed URL for ID (valid well beyond 24–48h review window)
      const { data: idSigned } = await supabase.storage
        .from('verifications')
        .createSignedUrl(idPath, 7 * 24 * 60 * 60);

      // Upload selfie — same ArrayBuffer approach as the ID photo above.
      const selfiePath = `${user.id}/selfie.jpg`;
      const selfieArrayBuffer = await new File(selfiePhoto).arrayBuffer();
      const { error: selfieErr } = await supabase.storage
        .from('verifications')
        .upload(selfiePath, selfieArrayBuffer, { upsert: true, contentType: 'image/jpeg' });
      if (selfieErr) throw new Error(`Selfie upload failed: ${selfieErr.message}`);

      const { data: selfieSigned } = await supabase.storage
        .from('verifications')
        .createSignedUrl(selfiePath, 7 * 24 * 60 * 60);

      // Upsert verification row (handles re-submission after rejection)
      const { error: upsertErr } = await supabase
        .from('verifications')
        .upsert(
          {
            user_id: user.id,
            id_photo_url: idSigned?.signedUrl ?? idPath,
            selfie_url: selfieSigned?.signedUrl ?? selfiePath,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            reviewed_at: null,
          },
          { onConflict: 'user_id' },
        );
      if (upsertErr) throw new Error(`Submission failed: ${upsertErr.message}`);

      // Create a notification row so the traveller sees it in their feed
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'verification_submitted',
        title: 'Verification submitted',
        body: 'Your documents are under review. You\'ll hear back in 24–48 hours.',
        read_at: null,
      }).select();

      setExistingStatus('pending');
      setStep('submitted');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Something went wrong. Please try again.');
      setStep('error');
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Existing status ────────────────────────────────────────────────────────
  if (step === 'status') {
    const STATUS_CONFIG = {
      pending: {
        emoji: '⏳',
        title: 'Verification in progress',
        text: 'Your documents are under review. This usually takes 24–48 hours. We\'ll notify you once your blue tick is confirmed.',
        color: Colors.warningText,
        bg: Colors.warningBg,
      },
      approved: {
        emoji: '✅',
        title: 'You\'re verified!',
        text: 'Your identity has been confirmed. Your profile now shows the blue verified tick.',
        color: Colors.successText,
        bg: Colors.successBg,
      },
      rejected: {
        emoji: '❌',
        title: 'Verification unsuccessful',
        text: 'We couldn\'t verify your identity with the documents provided. Please try again with a clearer photo of your ID and selfie.',
        color: Colors.error,
        bg: Colors.errorBg,
      },
    };

    const config = STATUS_CONFIG[existingStatus ?? 'pending'];

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner}>
          <TouchableOpacity style={styles.back} onPress={() => router.replace('/(traveller)/profile')}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={[styles.statusCard, { backgroundColor: config.bg, borderColor: config.color + '40' }]}>
            <Text style={styles.statusEmoji}>{config.emoji}</Text>
            <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.statusText}>{config.text}</Text>
          </View>

          {existingStatus === 'rejected' && (
            <TouchableOpacity
              style={[styles.btn, { marginTop: 24 }]}
              onPress={() => { setIdPhoto(null); setSelfiePhoto(null); setStep('intro'); }}
            >
              <Text style={styles.btnText}>Try again →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => router.replace('/(traveller)/profile')}>
            <Text style={styles.btnSecondaryText}>Back to profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────────
  if (step === 'submitted') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centreScreen}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Verification submitted!</Text>
          <Text style={styles.successText}>
            We're reviewing your documents. This usually takes 24–48 hours.
            You'll receive a notification once your blue tick is confirmed.
          </Text>
          <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={() => router.replace('/(traveller)/profile')}>
            <Text style={styles.btnText}>Back to profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centreScreen}>
          <Text style={styles.successEmoji}>⚠️</Text>
          <Text style={[styles.successTitle, { color: Colors.error }]}>Upload failed</Text>
          <Text style={styles.successText}>{errorMsg}</Text>
          <TouchableOpacity
            style={[styles.btn, { marginTop: 8 }]}
            onPress={() => setStep('selfie')}
          >
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => router.replace('/(traveller)/profile')}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Uploading ───────────────────────────────────────────────────────────────
  if (step === 'submitting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centreScreen}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.successTitle, { marginTop: 24 }]}>Uploading documents…</Text>
          <Text style={styles.successText}>Please keep this screen open. This may take a few seconds.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main flow (intro → id → selfie) ────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => router.replace('/(traveller)/profile')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Get verified ✅</Text>
        <Text style={styles.sub}>
          Verified profiles get a blue tick and earn significantly more trust from hosts and travellers.
        </Text>

        {/* Step indicators */}
        <View style={styles.steps}>
          {['ID document', 'Selfie', 'Submit'].map((s, i) => {
            const active =
              (step === 'intro' && i === 0) ||
              (step === 'id' && i === 0) ||
              (step === 'selfie' && i <= 1);
            return (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, active && styles.stepDotActive]}>
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{s}</Text>
              </View>
            );
          })}
        </View>

        {step === 'intro' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you'll need</Text>
            {[
              { emoji: '🪪', text: 'South African ID, passport, or driver\'s licence' },
              { emoji: '🤳', text: 'A clear selfie of your face' },
              { emoji: '⏱️', text: 'Takes about 2 minutes' },
            ].map((item, i) => (
              <View key={i} style={styles.requirementItem}>
                <Text style={styles.requirementEmoji}>{item.emoji}</Text>
                <Text style={styles.requirementText}>{item.text}</Text>
              </View>
            ))}
            <View style={styles.trustNote}>
              <Text style={styles.trustIcon}>🔒</Text>
              <Text style={styles.trustText}>Your documents are encrypted and only used for identity verification. We never share them.</Text>
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => setStep('id')}>
              <Text style={styles.btnText}>Start verification →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'id' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 1 — Upload your ID</Text>
            <Text style={styles.stepSub}>Take a clear photo of your South African ID, passport, or driver's licence.</Text>
            <TouchableOpacity style={[styles.photoBox, idPhoto ? styles.photoBoxFilled : null]} onPress={pickId}>
              {idPhoto ? (
                <Image source={{ uri: idPhoto }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoBoxEmoji}>🪪</Text>
                  <Text style={styles.photoBoxText}>Tap to upload ID document</Text>
                </>
              )}
            </TouchableOpacity>
            {idPhoto && (
              <>
                <TouchableOpacity style={styles.btnSecondary} onPress={pickId}>
                  <Text style={styles.btnSecondaryText}>Choose a different photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={() => setStep('selfie')}>
                  <Text style={styles.btnText}>Next — Take selfie →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {step === 'selfie' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 2 — Take a selfie</Text>
            <Text style={styles.stepSub}>Look straight at the camera in good lighting. Remove glasses if you wear them.</Text>
            <TouchableOpacity style={[styles.photoBox, selfiePhoto ? styles.photoBoxFilled : null]} onPress={takeSelfie}>
              {selfiePhoto ? (
                <Image source={{ uri: selfiePhoto }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoBoxEmoji}>🤳</Text>
                  <Text style={styles.photoBoxText}>
                    {Platform.OS === 'web' ? 'Tap to upload selfie' : 'Tap to take selfie'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {selfiePhoto && (
              <>
                <TouchableOpacity style={styles.btnSecondary} onPress={takeSelfie}>
                  <Text style={styles.btnSecondaryText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={submitVerification}>
                  <Text style={styles.btnText}>Submit for verification →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 20, paddingTop: 20 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  stepLabel: { fontSize: 11, color: Colors.textSecondary },
  section: { gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  stepSub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  requirementItem: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  requirementEmoji: { fontSize: 24, width: 32 },
  requirementText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  trustNote: { flexDirection: 'row', gap: 10, backgroundColor: Colors.infoBg, borderRadius: 12, padding: 14 },
  trustIcon: { fontSize: 18 },
  trustText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  photoBox: {
    height: 180, borderRadius: 16, borderWidth: 2, borderColor: Colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, gap: 8,
  },
  photoBoxFilled: { borderStyle: 'solid', borderColor: Colors.primary, padding: 0, overflow: 'hidden' },
  photoBoxEmoji: { fontSize: 40 },
  photoBoxText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  photoPreview: { width: '100%', height: '100%' },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  btnSecondary: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  centreScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  statusCard: { borderRadius: 20, borderWidth: 1.5, padding: 28, alignItems: 'center', gap: 12, marginTop: 8 },
  statusEmoji: { fontSize: 52 },
  statusTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  statusText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
