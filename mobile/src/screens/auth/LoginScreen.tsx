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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { isValidTurkishPhoneNumber, normalizePhoneNumber } from '@/utils/phone';
import { getHomeRouteForRole } from '@/utils/roleRoutes';
import Colors from '@/theme/colors';

type Step = 'phone' | 'password' | 'otp';

const isWeb = Platform.OS === 'web';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fixtureRole?: string | string[]; redirect?: string | string[] }>();
  const { lookup, loginByPhone, sendOtp, verifyOtp, loginWithTestFixtureKey, loginWithPassword, schoolInfo, isLoading, error, clearError } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Web'de platform admin toggle başlangıçta kapalı; mobilde hiç gösterilmez
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const otpRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const didAutoLoginRef = useRef(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const fixtureRole = Array.isArray(params.fixtureRole)
      ? params.fixtureRole[0]
      : params.fixtureRole;

    if (didAutoLoginRef.current || !fixtureRole) {
      return;
    }

    if (fixtureRole !== 'parent' && fixtureRole !== 'teacher') {
      return;
    }

    didAutoLoginRef.current = true;
    handleFixtureLogin(fixtureRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.fixtureRole]);

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
      if (isWeb) {
        // Web: okul yöneticisi → telefon + şifre
        animateStep(() => setStep('password'));
        setTimeout(() => passwordRef.current?.focus(), 400);
      } else {
        // Mobil: öğretmen / veli → OTP
        animateStep(() => setStep('otp'));
        await sendOtp(normalizedPhone);
        setCountdown(60);
        setTimeout(() => otpRef.current?.focus(), 400);
      }
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

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    clearError();
    try {
      await verifyOtp(normalizePhoneNumber(phoneNumber), otp.trim());
    } catch {
      // error set by store
    }
  };

  const handlePhonePasswordLogin = async () => {
    if (!phonePassword) return;
    clearError();
    try {
      await loginByPhone(phoneNumber, phonePassword);
    } catch {
      // error set by store
    }
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) return;
    clearError();
    try {
      await loginWithPassword(email.trim(), password);
    } catch {
      // error set by store
    }
  };

  const handleFixtureLogin = async (role: 'parent' | 'teacher') => {
    clearError();
    const redirectTarget = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
    try {
      if (role === 'parent') {
        await loginWithTestFixtureKey('parent');
        router.replace((redirectTarget as any) || getHomeRouteForRole('Parent'));
        return;
      }

      await loginWithTestFixtureKey('teacher');
      router.replace((redirectTarget as any) || getHomeRouteForRole('Teacher'));
    } catch {
      // error set by store
    }
  };

  return (
    <LinearGradient
      colors={[Colors.GRADIENT_START, Colors.GRADIENT_END, Colors.TEAL_600]}
      style={[styles.container, Platform.OS === 'web' && { minHeight: '100vh' as any }]}
    >
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.keyboardView,
          Platform.OS === 'web' && { height: '100%' as any, maxWidth: 480, alignSelf: 'center' as any, width: '100%' },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logoFrame}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.appLogo}
            />
          </View>
          <Text style={styles.appName}>Notio</Text>
          <Text style={styles.tagline}>
            {step === 'phone' ? 'Onun dünyasına bir pencere.' : step === 'password' ? 'Şifrenizi girin' : 'SMS kodunuzu girin'}
          </Text>
          {schoolInfo?.schoolLogoUrl ? (
            <View style={styles.schoolBadge}>
              <Image source={{ uri: schoolInfo.schoolLogoUrl }} style={styles.schoolLogo} />
              <Text style={styles.schoolBadgeText}>{schoolInfo.schoolName}</Text>
            </View>
          ) : null}
        </View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {showAdminLogin ? (
            <>
              <Text style={styles.cardTitle}>Platform Girişi</Text>
              <Text style={styles.cardSubtitle}>E-posta ve şifrenizi girin</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@notioedu.com"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.ERROR} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
                onPress={handlePasswordLogin}
                disabled={isLoading || !email || !password}
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

              <TouchableOpacity
                style={styles.switchLoginRow}
                onPress={() => { setShowAdminLogin(false); clearError(); }}
              >
                <Ionicons name="arrow-back-outline" size={15} color={Colors.TEXT_MUTED} />
                <Text style={styles.switchLoginText}>Telefon ile giriş</Text>
              </TouchableOpacity>
            </>
          ) : step === 'phone' ? (
            <>
              <Text style={styles.cardTitle}>Giriş Yap</Text>
              <Text style={styles.cardSubtitle}>Kayıtlı telefon numaranızı girin</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0532 000 00 00"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleLookup}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.ERROR} />
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

              {/* Platform admin toggle — sadece web'de */}
              {isWeb ? (
                <TouchableOpacity
                  style={styles.switchLoginRow}
                  onPress={() => { setShowAdminLogin(true); clearError(); }}
                >
                  <Text style={styles.switchLoginText}>Platform Yöneticisi misiniz?</Text>
                  <Ionicons name="arrow-forward-outline" size={15} color={Colors.TEXT_MUTED} />
                </TouchableOpacity>
              ) : (
                /* Mobil test girişleri — sadece native */
                <View style={styles.quickAccessSection}>
                  <Text style={styles.quickAccessTitle}>Geçici test girişleri</Text>
                  <View style={styles.quickAccessRow}>
                    <TouchableOpacity
                      style={[styles.quickAccessButton, isLoading && styles.quickAccessButtonDisabled]}
                      onPress={() => handleFixtureLogin('parent')}
                      disabled={isLoading}
                    >
                      <Ionicons name="people-outline" size={18} color={Colors.PRIMARY} />
                      <Text style={styles.quickAccessButtonText}>Veli</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickAccessButton, isLoading && styles.quickAccessButtonDisabled]}
                      onPress={() => handleFixtureLogin('teacher')}
                      disabled={isLoading}
                    >
                      <Ionicons name="school-outline" size={18} color={Colors.PRIMARY} />
                      <Text style={styles.quickAccessButtonText}>Öğretmen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          ) : step === 'password' ? (
            /* ── Web: Şifre adımı ── */
            <>
              <Text style={styles.cardTitle}>Şifre Girin</Text>
              <Text style={styles.cardSubtitle}>
                <Text style={styles.maskedId}>{schoolInfo?.maskedIdentifier ?? normalizePhoneNumber(phoneNumber)}</Text>
                {'\n'}hesabınızın şifresini girin
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={phonePassword}
                  onChangeText={setPhonePassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handlePhonePasswordLogin}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.ERROR} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (isLoading || !phonePassword) && styles.buttonDisabled]}
                onPress={handlePhonePasswordLogin}
                disabled={isLoading || !phonePassword}
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
                <TouchableOpacity onPress={() => { setStep('phone'); clearError(); setPhonePassword(''); }}>
                  <Text style={styles.backText}>← Telefonu değiştir</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* ── Mobil: OTP adımı ── */
            <>
              <Text style={styles.cardTitle}>Doğrulama Kodu</Text>
              <Text style={styles.cardSubtitle}>
                <Text style={styles.maskedId}>{schoolInfo?.maskedIdentifier ?? normalizePhoneNumber(phoneNumber)}</Text>
                {'\n'}numarasına gönderilen 6 haneli kodu girin
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  ref={otpRef}
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.ERROR} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (isLoading || otp.length !== 6) && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
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
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleTopRight: { width: 220, height: 220, top: -70, right: -70 },
  circleBottomLeft: { width: 160, height: 160, bottom: 80, left: -55 },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoFrame: {
    width: 108,
    height: 108,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  schoolLogo: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#fff' },
  appLogo: { width: 88, height: 88, borderRadius: 28 },
  appName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1.2 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.80)', marginTop: 6 },
  schoolBadge: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schoolBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
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
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.TEXT, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: Colors.TEXT_MUTED, marginBottom: 24, lineHeight: 20 },
  maskedId: { fontWeight: '700', color: Colors.PRIMARY },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.SECONDARY,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: Colors.TEXT },
  otpInput: { letterSpacing: 6, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ERROR + '12',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  errorText: { color: Colors.ERROR, fontSize: 13, flex: 1 },
  button: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  resendText: { color: Colors.PRIMARY, fontSize: 14, fontWeight: '600' },
  resendDisabled: { color: Colors.SLATE_300 },
  backText: { color: Colors.TEXT_MUTED, fontSize: 14 },
  switchLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.SECONDARY,
  },
  switchLoginText: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  quickAccessSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.SECONDARY,
  },
  quickAccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.TEXT_MUTED,
    marginBottom: 12,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAccessButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.SECONDARY,
    backgroundColor: Colors.BACKGROUND,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  quickAccessButtonDisabled: {
    opacity: 0.55,
  },
  quickAccessButtonText: {
    color: Colors.PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
});
