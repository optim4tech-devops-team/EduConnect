import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';
import { useComplianceStore } from '@/store/complianceStore';
import type { ComplianceAudience } from '@/api/client';

type DraftForm = {
  title: string;
  audience: ComplianceAudience;
  content: string;
  isRequired: boolean;
  requireOnLogin: boolean;
  isActive: boolean;
};

const EMPTY_FORM: DraftForm = {
  title: '',
  audience: 'parent',
  content: '',
  isRequired: true,
  requireOnLogin: true,
  isActive: true,
};

const AUDIENCE_OPTIONS: Array<{ value: ComplianceAudience; label: string }> = [
  { value: 'parent', label: 'Veli' },
  { value: 'teacher', label: 'Öğretmen' },
  { value: 'all', label: 'Tüm Roller' },
];

function formatAudienceLabel(audience: ComplianceAudience) {
  return AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label ?? audience;
}

function formatDateLabel(value?: string) {
  if (!value) return 'Taslak';

  try {
    return new Date(value).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Taslak';
  }
}

function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: Colors.PRIMARY_LIGHT, false: Colors.BORDER }}
        thumbColor={value ? Colors.PRIMARY : Colors.WHITE}
      />
    </View>
  );
}

export default function ComplianceManagementScreen() {
  const { user } = useAuthStore();
  const {
    documents,
    isManaging,
    source,
    loadAdminDocuments,
    createDocument,
  } = useComplianceStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);

  useEffect(() => {
    loadAdminDocuments(user);
  }, [loadAdminDocuments, user]);

  const activeDocuments = useMemo(
    () => documents.filter((document) => document.isActive),
    [documents],
  );

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık zorunludur.');
      return;
    }

    if (!form.content.trim()) {
      Alert.alert('Eksik bilgi', 'Metin içeriği zorunludur.');
      return;
    }

    await createDocument(user, {
      kind: 'kvkk',
      audience: form.audience,
      title: form.title,
      content: form.content,
      isRequired: form.isRequired,
      requireOnLogin: form.requireOnLogin,
      isActive: form.isActive,
    });

    setForm(EMPTY_FORM);
    setModalOpen(false);
    Alert.alert('Hazır', 'Okul yönetimi için yeni KVKK / aydınlatma metni kaydedildi.');
  };

  return (
    <SafeAreaView testID="screen-admin-compliance" style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>KVKK ve Belgeler</Text>
          <Text style={styles.headerSubtitle}>
            Okul yönetimi tarafından yüklenen metinler ilk girişte öğretmen ve veliye zorunlu olarak gösterilir.
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalOpen(true)} activeOpacity={0.84}>
          <Ionicons name="add" size={20} color={Colors.WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.PRIMARY} />
            <Text style={styles.heroBadgeText}>
              Kaynak: {source === 'api' ? 'API' : source === 'local' ? 'Demo okul verisi' : 'Hazırlanıyor'}
            </Text>
          </View>
          <Text style={styles.heroTitle}>Küçük Sıralar Anaokulları için yüklenen metinler</Text>
          <Text style={styles.heroBody}>
            Bu alan; okul bazlı aydınlatma, KVKK ve dijital belge akışlarının merkezi olarak kullanılacak.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{documents.length}</Text>
              <Text style={styles.heroStatLabel}>Toplam metin</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeDocuments.length}</Text>
              <Text style={styles.heroStatLabel}>Aktif sürüm</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Yüklü Metinler</Text>

        {isManaging ? (
          <ActivityIndicator color={Colors.PRIMARY} style={styles.loader} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={42} color={Colors.BORDER} />
            <Text style={styles.emptyTitle}>Henüz metin yüklenmedi</Text>
            <Text style={styles.emptyBody}>
              Buradan veli ve öğretmen için yeni bir KVKK / aydınlatma metni oluşturabilirsiniz.
            </Text>
          </View>
        ) : (
          documents.map((document) => (
            <View key={document.id} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentHeaderCopy}>
                  <Text style={styles.documentTitle}>{document.title}</Text>
                  <Text style={styles.documentMeta}>
                    {formatAudienceLabel(document.audience)} · Sürüm {document.version} · {formatDateLabel(document.publishedAt ?? document.createdAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: document.isActive ? Colors.INFO_LIGHT : Colors.LIGHT_GRAY },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: document.isActive ? Colors.PRIMARY : Colors.TEXT_MUTED },
                    ]}
                  >
                    {document.isActive ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>

              <Text style={styles.documentBody} numberOfLines={5}>
                {document.content}
              </Text>

              <View style={styles.documentFooter}>
                <View style={styles.documentMetric}>
                  <Ionicons name="people-outline" size={14} color={Colors.PRIMARY} />
                  <Text style={styles.documentMetricText}>{document.acceptedCount} onay</Text>
                </View>
                <View style={styles.documentMetric}>
                  <Ionicons name="person-circle-outline" size={14} color={Colors.ACCENT} />
                  <Text style={styles.documentMetricText}>{document.createdByName}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni KVKK Metni</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Başlık</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(title) => setForm((current) => ({ ...current, title }))}
                placeholder="Veli ve Öğrenci KVKK Aydınlatma Metni"
                placeholderTextColor={Colors.TEXT_MUTED}
              />

              <Text style={styles.inputLabel}>Hedef Kitle</Text>
              <View style={styles.audienceRow}>
                {AUDIENCE_OPTIONS.map((option) => {
                  const isSelected = form.audience === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.audienceChip, isSelected && styles.audienceChipActive]}
                      activeOpacity={0.84}
                      onPress={() => setForm((current) => ({ ...current, audience: option.value }))}
                    >
                      <Text style={[styles.audienceChipText, isSelected && styles.audienceChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Metin</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.content}
                onChangeText={(content) => setForm((current) => ({ ...current, content }))}
                placeholder="Okul yönetiminin yüklediği KVKK ve aydınlatma metni..."
                placeholderTextColor={Colors.TEXT_MUTED}
                multiline
                textAlignVertical="top"
              />

              <SettingRow
                title="Zorunlu"
                subtitle="Bu metin ilgili kullanıcı için zorunlu onay olarak gösterilir."
                value={form.isRequired}
                onValueChange={(isRequired) => setForm((current) => ({ ...current, isRequired }))}
              />
              <SettingRow
                title="İlk girişte sor"
                subtitle="Öğretmen veya veli ilk login sonrası bu metni onaylamadan ilerleyemez."
                value={form.requireOnLogin}
                onValueChange={(requireOnLogin) => setForm((current) => ({ ...current, requireOnLogin }))}
              />
              <SettingRow
                title="Aktif yap"
                subtitle="Aynı hedef kitlede önceki aktif sürümü pasifleştirir."
                value={form.isActive}
                onValueChange={(isActive) => setForm((current) => ({ ...current, isActive }))}
              />

              <TouchableOpacity style={styles.submitButton} activeOpacity={0.88} onPress={handleSubmit}>
                <Ionicons name="save-outline" size={18} color={Colors.WHITE} />
                <Text style={styles.submitButtonText}>Metni Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerTitle: {
    color: Colors.TEXT,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 36,
    gap: 16,
  },
  heroCard: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.INFO_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: Colors.PRIMARY,
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    color: Colors.TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  heroBody: {
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStat: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 18,
    padding: 14,
  },
  heroStatValue: {
    color: Colors.TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: Colors.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  loader: {
    marginTop: 20,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    backgroundColor: Colors.WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  emptyTitle: {
    color: Colors.TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyBody: {
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 18,
    gap: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  documentHeaderCopy: {
    flex: 1,
  },
  documentTitle: {
    color: Colors.TEXT,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  documentMeta: {
    color: Colors.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  documentBody: {
    color: Colors.TEXT,
    fontSize: 14,
    lineHeight: 21,
  },
  documentFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  documentMetricText: {
    color: Colors.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.32)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: Colors.TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  inputLabel: {
    color: Colors.TEXT,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.TEXT,
    fontSize: 15,
    backgroundColor: Colors.WHITE,
  },
  textArea: {
    minHeight: 170,
  },
  audienceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  audienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  audienceChipActive: {
    backgroundColor: Colors.INFO_LIGHT,
    borderColor: Colors.PRIMARY_LIGHT,
  },
  audienceChipText: {
    color: Colors.TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  audienceChipTextActive: {
    color: Colors.PRIMARY,
  },
  settingRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    color: Colors.TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  settingSubtitle: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  submitButtonText: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
});
