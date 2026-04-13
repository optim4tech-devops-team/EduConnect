import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/client';
import Colors from '@/theme/colors';
import { getHomeRouteForRole } from '@/utils/roleRoutes';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleSave = async () => {
    setError('');
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(password);
      // Navigate to home for their role
      const home = getHomeRouteForRole(user?.role);
      router.replace(home as any);
    } catch {
      setError('Şifre değiştirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={40} color={Colors.PRIMARY} />
          </View>

          <Text style={styles.title}>Şifrenizi Belirleyin</Text>
          <Text style={styles.subtitle}>
            İlk girişiniz için geçici şifrenizi yeni bir şifreyle değiştirmeniz gerekmektedir.
          </Text>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.PRIMARY} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Yeni şifre"
              placeholderTextColor={Colors.TEXT_MUTED}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowPw(v => !v)}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.PRIMARY} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Şifreyi tekrar girin"
              placeholderTextColor={Colors.TEXT_MUTED}
              secureTextEntry={!showPw}
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Şifremi Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.BACKGROUND },
  flex:      { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.PRIMARY + '18',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24,
  },

  title: {
    fontSize: 26, fontWeight: '800', color: Colors.TEXT,
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, color: Colors.TEXT_MUTED, textAlign: 'center',
    lineHeight: 20, marginBottom: 32,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.SECONDARY,
    paddingHorizontal: 14, marginBottom: 14, height: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  icon:  { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.TEXT },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.ERROR + '12',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: Colors.ERROR, fontSize: 13, flex: 1 },

  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 16, fontWeight: '700', color: '#fff' },
});
