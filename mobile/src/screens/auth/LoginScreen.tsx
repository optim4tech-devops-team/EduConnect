import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { isValidTurkishPhoneNumber, normalizePhoneNumber } from '@/utils/phone';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const { lookup, sendOtp, verifyOtp, schoolInfo, isLoading, error, clearError } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const animateStep = (fn: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setTimeout(fn, 150);
  };

  const handleLookup = async () => {
    if (!isValidTurkishPhoneNumber(phoneNumber)) return;

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    clearError();
    try {
      await lookup(normalizedPhone);
      animateStep(() => setStep('otp'));
      await sendOtp(normalizedPhone);
      setCountdown(60);
      setTimeout(() => otpRef.current?.focus(), 400);
    } catch {
      // error set by store
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await sendOtp(normalizePhoneNumber(phoneNumber));
      setCountdown(60);
      setOtp('');
    } catch {
      // error set by store
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    clearError();
    try {
      await verifyOtp(normalizePhoneNumber(phoneNumber), otp.trim());
    } catch {
      // error set by store
    }
  };

  return (
    <LinearGradient colors={['#FF6B35', '#FF8C42', '#FFB347']} style={styles.container}>
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header / Logo */}
        <View style={styles.header}>
          {schoolInfo?.schoolLogoUrl ? (
            <Image source={{ uri: schoolInfo.schoolLogoUrl }} style={styles.schoolLogo} />
          ) : (
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={40} color="#FF8C42" />
            </View>
          )}
          <Text style={styles.appName}>
            {schoolInfo?.schoolName ?? 'EduLink'}
          </Text>
          <Text style={styles.tagline}>
            {step === 'phone' ? 'Hos geldiniz' : 'SMS kodunuzu girin'}
          </Text>
        </View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {step === 'phone' ? (
            <>
              <Text style={styles.cardTitle}>Giriş Yap</Text>
              <Text style={styles.cardSubtitle}>
                Kayitli telefon numaranizi girin
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#FF8C42" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0532 000 00 00"
                  placeholderTextColor="#bbb"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleLookup}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#e53e3e" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (!isValidTurkishPhoneNumber(phoneNumber) || isLoading) && styles.buttonDisabled]}
                onPress={handleLookup}
                disabled={isLoading || !isValidTurkishPhoneNumber(phoneNumber)}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Devam Et</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Doğrulama Kodu</Text>
              <Text style={styles.cardSubtitle}>
                <Text style={styles.maskedId}>{schoolInfo?.maskedIdentifier ?? normalizePhoneNumber(phoneNumber)}</Text>
                {'\n'}numarasina gonderilen 6 haneli kodu girin
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={20} color="#FF8C42" style={styles.inputIcon} />
                <TextInput
                  ref={otpRef}
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  placeholderTextColor="#bbb"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#e53e3e" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (isLoading || otp.length !== 6) && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Giriş Yap</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
                  <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                    {countdown > 0 ? `Tekrar gönder (${countdown}s)` : 'Tekrar gönder'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStep('phone'); clearError(); setOtp(''); }}>
                  <Text style={styles.backText}>Değiştir</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circleTopRight: { width: 200, height: 200, top: -60, right: -60 },
  circleBottomLeft: { width: 150, height: 150, bottom: 80, left: -50 },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  schoolLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  maskedId: { fontWeight: '700', color: '#FF8C42' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1a1a2e',
  },
  otpInput: { letterSpacing: 6, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  errorText: { color: '#e53e3e', fontSize: 13, flex: 1 },
  button: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  resendText: { color: '#FF8C42', fontSize: 14, fontWeight: '600' },
  resendDisabled: { color: '#aaa' },
  backText: { color: '#666', fontSize: 14 },
});
