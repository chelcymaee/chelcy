import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../src/constants/colors';

type Step = 'intro' | 'id' | 'selfie' | 'submitted';

export default function Verification() {
  const [step, setStep] = useState<Step>('intro');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);

  async function pickId() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled) {
      setIdPhoto(result.assets[0].uri);
    }
  }

  async function takeSelfie() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) {
      setSelfiePhoto(result.assets[0].uri);
    }
  }

  if (step === 'submitted') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successScreen}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Verification submitted!</Text>
          <Text style={styles.successText}>
            We're reviewing your documents. This usually takes 24–48 hours.
            You'll receive a notification once your blue tick is confirmed.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Back to profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/(traveller)/profile')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Get verified ✅</Text>
        <Text style={styles.sub}>
          Verified profiles get a blue tick and earn significantly more trust from hosts and travellers.
        </Text>

        {/* Step indicators */}
        <View style={styles.steps}>
          {['ID document', 'Selfie', 'Submit'].map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, (step === 'id' && i === 0) || (step === 'selfie' && i <= 1) ? styles.stepDotActive : {}]}>
                <Text style={styles.stepDotText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{s}</Text>
            </View>
          ))}
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
            <TouchableOpacity style={[styles.photoBox, idPhoto && styles.photoBoxFilled]} onPress={pickId}>
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
              <TouchableOpacity style={styles.btn} onPress={() => setStep('selfie')}>
                <Text style={styles.btnText}>Next — Take selfie →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 'selfie' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 2 — Take a selfie</Text>
            <Text style={styles.stepSub}>Look straight at the camera in good lighting. Remove glasses if you wear them.</Text>
            <TouchableOpacity style={[styles.photoBox, selfiePhoto && styles.photoBoxFilled]} onPress={takeSelfie}>
              {selfiePhoto ? (
                <Image source={{ uri: selfiePhoto }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoBoxEmoji}>🤳</Text>
                  <Text style={styles.photoBoxText}>Tap to take selfie</Text>
                </>
              )}
            </TouchableOpacity>
            {selfiePhoto && (
              <TouchableOpacity style={styles.btn} onPress={() => setStep('submitted')}>
                <Text style={styles.btnText}>Submit for verification →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 20 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  heading: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  stepLabel: { fontSize: 11, color: Colors.textSecondary },
  section: { gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  stepSub: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  requirementItem: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  requirementEmoji: { fontSize: 24, width: 32 },
  requirementText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  trustNote: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F0F9FF',
    borderRadius: 12, padding: 14,
  },
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
  btn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
