import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import type { UserDto } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

// ─── Role chip config ─────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  UserDto['role'],
  { label: string; bg: string; text: string }
> = {
  Admin:         { label: 'Yönetici',       bg: Colors.INFO + '30',       text: Colors.INFO       },
  SchoolAdmin:   { label: 'Okul Yöneticisi', bg: Colors.INFO + '30',      text: Colors.INFO       },
  PlatformAdmin: { label: 'Platform Admin', bg: Colors.TEAL_800 + '40',   text: Colors.TEAL_700   },
  Teacher:       { label: 'Öğretmen',       bg: Colors.PRIMARY + '25',    text: Colors.PRIMARY    },
  Parent:        { label: 'Veli',           bg: Colors.AMBER_400 + '30',  text: Colors.AMBER_600  },
};

// ─── Info row component ───────────────────────────────────────────────────────
interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconCircle}>
        <Ionicons name={icon} size={18} color={Colors.PRIMARY} />
      </View>
      <View style={rowStyles.textBlock}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.PRIMARY + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  label: { fontSize: 11, color: Colors.TEXT, opacity: 0.45, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 15, color: Colors.TEXT, fontWeight: '500' },
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
      router.replace('/login');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (!window.confirm('Oturumunuzu kapatmak istediğinizden emin misiniz?')) {
        return;
      }
      void performLogout();
      return;
    }

    Alert.alert(
      'Çıkış Yap',
      'Oturumunuzu kapatmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            void performLogout();
          },
        },
      ],
    );
  };

  const displayName = user?.name ?? 'Kullanıcı';
  const initials    = getInitials(displayName);
  const roleConfig  = user?.role ? ROLE_CONFIG[user.role] : ROLE_CONFIG.Parent;
  const isPlatformAdmin = user?.role === 'Admin' || user?.role === 'PlatformAdmin';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Avatar Section ───────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={styles.name}>{displayName}</Text>

          {/* Role chip */}
          <View style={[styles.roleChip, { backgroundColor: roleConfig.bg }]}>
            <Text style={[styles.roleChipText, { color: roleConfig.text }]}>
              {roleConfig.label}
            </Text>
          </View>
        </View>

        {/* ── Info Card ────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <InfoRow
            icon="mail-outline"
            label="E-posta"
            value={user?.email ?? ''}
          />
          <InfoRow
            icon="call-outline"
            label="Telefon"
            value={user?.phone ?? ''}
          />
          {!isPlatformAdmin ? (
            <InfoRow
              icon="business-outline"
              label="Okul ID"
              value={user?.schoolId ?? ''}
            />
          ) : null}
          <View style={[rowStyles.row, { borderBottomWidth: 0 }]}>
            <View style={rowStyles.iconCircle}>
              <Ionicons name="person-circle-outline" size={18} color={Colors.PRIMARY} />
            </View>
            <View style={rowStyles.textBlock}>
              <Text style={rowStyles.label}>Rol</Text>
              <Text style={rowStyles.value}>{roleConfig.label}</Text>
            </View>
          </View>
        </View>

        {/* ── App Version Note ─────────────────────────────────────── */}
        <View style={styles.versionRow}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.TEXT + '40'} />
          <Text style={styles.versionText}>EduLink v1.0.0</Text>
        </View>

        <View style={styles.spacer} />

        {/* ── Logout Button ────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          activeOpacity={0.85}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={Colors.WHITE} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={Colors.WHITE} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.BACKGROUND },

  header: {
    paddingHorizontal: 22, paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.TEXT },

  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatarOuter: {
    padding: 4,
    borderRadius: 50,
    backgroundColor: Colors.SECONDARY + '40',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  avatarText: { color: Colors.WHITE, fontSize: 30, fontWeight: '800' },
  name: {
    fontSize: 22, fontWeight: '800', color: Colors.TEXT,
    marginBottom: 10, textAlign: 'center',
  },
  roleChip: {
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  roleChipText: { fontSize: 13, fontWeight: '700' },

  // Info card
  infoCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 20, paddingHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    marginBottom: 16,
  },

  versionRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, justifyContent: 'center', marginBottom: 12,
  },
  versionText: { fontSize: 12, color: Colors.TEXT, opacity: 0.35 },

  spacer: { flex: 1, minHeight: 24 },

  // Logout
  logoutBtn: {
    backgroundColor: Colors.ERROR,
    borderRadius: 18, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    shadowColor: Colors.ERROR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  logoutBtnDisabled: { opacity: 0.65 },
  logoutText: { color: Colors.WHITE, fontSize: 16, fontWeight: '800' },
});
