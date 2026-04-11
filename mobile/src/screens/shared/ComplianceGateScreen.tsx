import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import type { PendingComplianceDocumentDto, UserDto } from '@/api/client';
import { getSchoolBranding } from '@/branding/schools';

interface ComplianceGateScreenProps {
  user: UserDto;
  schoolName?: string | null;
  documents: PendingComplianceDocumentDto[];
  isSubmitting?: boolean;
  onAccept: (documentId: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

function formatAudienceLabel(role: UserDto['role']) {
  return role === 'Teacher' ? 'Öğretmen' : 'Veli';
}

function formatDateLabel(value?: string) {
  if (!value) return 'Yeni sürüm';

  try {
    return new Date(value).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Yeni sürüm';
  }
}

export default function ComplianceGateScreen({
  user,
  schoolName,
  documents,
  isSubmitting = false,
  onAccept,
  onLogout,
}: ComplianceGateScreenProps) {
  const document = documents[0];
  const resolvedSchool = getSchoolBranding(user.schoolId, schoolName);

  if (!document) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.PRIMARY} />
            <Text style={styles.headerBadgeText}>Zorunlu onay</Text>
          </View>
        </View>

        <View style={styles.headerCopy}>
          <Text style={styles.title}>Devam etmeden önce metni onaylayın</Text>
          <Text style={styles.subtitle}>
            {resolvedSchool.name}, hesabınız için zorunlu bir KVKK ve aydınlatma metni paylaştı.
          </Text>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressChip}>
            <Ionicons name="business-outline" size={14} color={Colors.PRIMARY} />
            <Text style={styles.progressText}>{resolvedSchool.name}</Text>
          </View>
          <View style={styles.progressChip}>
            <Ionicons name="person-outline" size={14} color={Colors.ACCENT} />
            <Text style={styles.progressText}>{formatAudienceLabel(user.role)}</Text>
          </View>
          <View style={styles.progressChip}>
            <Ionicons name="document-text-outline" size={14} color={Colors.PRIMARY} />
            <Text style={styles.progressText}>{documents.length} belge bekliyor</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{document.title}</Text>
              <Text style={styles.cardMeta}>
                Sürüm {document.version} · {formatDateLabel(document.publishedAt ?? document.createdAt)}
              </Text>
            </View>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Zorunlu</Text>
            </View>
          </View>

          <View style={styles.noticeBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.PRIMARY} />
            <Text style={styles.noticeText}>
              Bu metin okul yönetimi tarafından sisteme yüklenmiştir. Onay kaydınız zaman bilgisiyle birlikte tutulur.
            </Text>
          </View>

          <Text style={styles.bodyText}>{document.content}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptButton, isSubmitting && styles.acceptButtonDisabled]}
          activeOpacity={0.88}
          disabled={isSubmitting}
          onPress={() => onAccept(document.id)}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.WHITE} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.WHITE} />
              <Text style={styles.acceptButtonText}>Okudum ve Onaylıyorum</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.82}
          disabled={isSubmitting}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.TEXT_MUTED} />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerTopRow: {
    marginBottom: 14,
  },
  headerCopy: {
    gap: 6,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.INFO_LIGHT,
  },
  headerBadgeText: {
    color: Colors.PRIMARY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  title: {
    color: Colors.TEXT,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 37,
    maxWidth: 320,
  },
  subtitle: {
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 330,
  },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  progressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressText: {
    color: Colors.TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.TEXT,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  cardMeta: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  requiredBadge: {
    backgroundColor: Colors.ACCENT_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  requiredBadgeText: {
    color: Colors.AMBER_600,
    fontSize: 12,
    fontWeight: '800',
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.INFO_LIGHT,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    color: Colors.TEXT,
    fontSize: 13,
    lineHeight: 19,
  },
  bodyText: {
    color: Colors.TEXT,
    fontSize: 14,
    lineHeight: 23,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    paddingTop: 10,
    gap: 12,
  },
  acceptButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  logoutButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutButtonText: {
    color: Colors.TEXT_MUTED,
    fontSize: 15,
    fontWeight: '700',
  },
});
