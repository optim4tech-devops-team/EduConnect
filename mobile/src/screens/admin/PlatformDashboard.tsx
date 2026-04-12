import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { platformApi, PlatformSchoolDto, CreatePlatformSchoolDto } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:  { label: 'Starter',  color: '#6B7280' },
  basic:    { label: 'Basic',    color: Colors.INFO },
  standard: { label: 'Standard', color: Colors.PRIMARY },
  premium:  { label: 'Premium',  color: '#7C3AED' },
};

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_LABELS[plan?.toLowerCase()] ?? { label: plan, color: Colors.BORDER };
  return (
    <View style={[styles.planBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
      <Text style={[styles.planBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── New School Modal ──────────────────────────────────────────────────────────
interface NewSchoolModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PLANS = ['starter', 'basic', 'standard', 'premium'];

function NewSchoolModal({ visible, onClose, onCreated }: NewSchoolModalProps) {
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [plan, setPlan]           = useState('starter');
  const [maxStudents, setMaxStudents] = useState('200');
  const [maxTeachers, setMaxTeachers] = useState('20');
  const [adminName, setAdminName]   = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const reset = () => {
    setName(''); setPhone(''); setAddress('');
    setPlan('starter'); setMaxStudents('200'); setMaxTeachers('20');
    setAdminName(''); setAdminPhone(''); setAdminEmail('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!name.trim()) { setError('Okul adı zorunludur.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: CreatePlatformSchoolDto = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        plan,
        maxStudents: Number(maxStudents) || 200,
        maxTeachers: Number(maxTeachers) || 20,
        isActive: true,
        primaryAdmin: adminName.trim() && adminPhone.trim()
          ? { fullName: adminName.trim(), phone: adminPhone.trim(), email: adminEmail.trim() || undefined }
          : undefined,
      };
      await platformApi.createSchool(payload);
      reset();
      onCreated();
    } catch {
      setError('Okul oluşturulurken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <TouchableOpacity style={modal.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Yeni Okul Ekle</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.TEXT} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={modal.section}>Okul Bilgileri</Text>

            <View style={modal.inputRow}>
              <Ionicons name="business-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput
                style={modal.input}
                placeholder="Okul adı *"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={modal.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput
                style={modal.input}
                placeholder="Telefon"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={modal.inputRow}>
              <Ionicons name="location-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput
                style={modal.input}
                placeholder="Adres"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Text style={modal.section}>Plan</Text>
            <View style={modal.planRow}>
              {PLANS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[modal.planOption, plan === p && modal.planOptionActive]}
                  onPress={() => setPlan(p)}
                >
                  <Text style={[modal.planOptionText, plan === p && modal.planOptionTextActive]}>
                    {PLAN_LABELS[p]?.label ?? p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={modal.row2}>
              <View style={[modal.inputRow, { flex: 1, marginRight: 8 }]}>
                <Ionicons name="people-outline" size={16} color={Colors.PRIMARY} style={modal.icon} />
                <TextInput
                  style={modal.input}
                  placeholder="Max Öğrenci"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={maxStudents}
                  onChangeText={setMaxStudents}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[modal.inputRow, { flex: 1 }]}>
                <Ionicons name="school-outline" size={16} color={Colors.PRIMARY} style={modal.icon} />
                <TextInput
                  style={modal.input}
                  placeholder="Max Öğretmen"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={maxTeachers}
                  onChangeText={setMaxTeachers}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={modal.section}>Okul Yöneticisi (Opsiyonel)</Text>

            <View style={modal.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput
                style={modal.input}
                placeholder="Ad Soyad"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={adminName}
                onChangeText={setAdminName}
              />
            </View>

            <View style={modal.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput
                style={modal.input}
                placeholder="Telefon"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={adminPhone}
                onChangeText={setAdminPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={modal.inputRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput
                style={modal.input}
                placeholder="E-posta"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={adminEmail}
                onChangeText={setAdminEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {!!error && (
              <View style={modal.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.ERROR} />
                <Text style={modal.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={handleClose} disabled={saving}>
              <Text style={modal.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.saveBtn, saving && modal.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={modal.saveText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PlatformDashboard() {
  const { user } = useAuthStore();
  const [schools, setSchools]       = useState<PlatformSchoolDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search,  setSearch]        = useState('');
  const [showModal, setShowModal]   = useState(false);

  const loadSchools = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const { data } = await platformApi.listSchools(q || undefined);
      setSchools(data);
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const handleSearch = (text: string) => {
    setSearch(text);
    loadSchools(text);
  };

  const activeCount   = schools.filter((s) => s.isActive).length;
  const inactiveCount = schools.length - activeCount;
  const totalStudents = schools.reduce((s, sc) => s + sc.studentCount, 0);

  const renderSchool = ({ item }: { item: PlatformSchoolDto }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLogoCircle}>
          <Text style={styles.cardLogoText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {item.primaryAdminName
            ? <Text style={styles.cardAdmin}>{item.primaryAdminName}</Text>
            : <Text style={styles.cardAdminMuted}>Yönetici atanmamış</Text>}
        </View>
        <View style={styles.cardRight}>
          <PlanBadge plan={item.plan} />
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? Colors.ACCENT : Colors.ERROR }]} />
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Ionicons name="school-outline" size={14} color={Colors.TEXT_MUTED} />
          <Text style={styles.statText}>{item.classCount} sınıf</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={14} color={Colors.TEXT_MUTED} />
          <Text style={styles.statText}>{item.studentCount} öğrenci</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="person-outline" size={14} color={Colors.TEXT_MUTED} />
          <Text style={styles.statText}>{item.teacherCount} öğretmen</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Platform Yönetimi</Text>
          <Text style={styles.headerTitle}>Okullar</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Yeni Okul</Text>
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{schools.length}</Text>
          <Text style={styles.summaryLabel}>Toplam</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.ACCENT }]}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Aktif</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.ERROR }]}>{inactiveCount}</Text>
          <Text style={styles.summaryLabel}>Pasif</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.INFO }]}>{totalStudents}</Text>
          <Text style={styles.summaryLabel}>Öğrenci</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={Colors.TEXT_MUTED} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Okul ara..."
          placeholderTextColor={Colors.TEXT_MUTED}
          value={search}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={Colors.PRIMARY} size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(item) => item.id}
          renderItem={renderSchool}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={52} color={Colors.BORDER} />
              <Text style={styles.emptyText}>
                {search ? 'Arama sonucu bulunamadı' : 'Henüz okul yok'}
              </Text>
            </View>
          }
        />
      )}

      <NewSchoolModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); loadSchools(); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerLabel: { fontSize: 11, color: Colors.TEXT_MUTED, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.TEXT, marginTop: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.PRIMARY, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 14,
  },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.TEXT },
  summaryLabel: { fontSize: 11, color: Colors.TEXT_MUTED, fontWeight: '600', marginTop: 2 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 20, marginBottom: 14,
    paddingHorizontal: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: Colors.TEXT },

  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  loader: { marginTop: 60 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardLogoCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardLogoText: { fontSize: 20, fontWeight: '800', color: Colors.PRIMARY },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.TEXT },
  cardAdmin: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  cardAdminMuted: { fontSize: 12, color: Colors.ERROR + '99', marginTop: 2, fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end', gap: 6 },

  planBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  planBadgeText: { fontSize: 11, fontWeight: '700' },

  statusDot: { width: 8, height: 8, borderRadius: 4 },

  cardStats: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER, paddingTop: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 12, fontSize: 15, color: Colors.TEXT_MUTED, fontWeight: '500' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.TEXT },
  section: { fontSize: 12, fontWeight: '700', color: Colors.TEXT_MUTED, marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.BACKGROUND, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.SECONDARY,
    paddingHorizontal: 12, marginBottom: 10,
    height: 48,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.TEXT },
  row2: { flexDirection: 'row' },

  planRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  planOption: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.SECONDARY,
    alignItems: 'center',
  },
  planOptionActive: { borderColor: Colors.PRIMARY, backgroundColor: Colors.PRIMARY + '15' },
  planOptionText: { fontSize: 12, fontWeight: '600', color: Colors.TEXT_MUTED },
  planOptionTextActive: { color: Colors.PRIMARY },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.ERROR + '12', borderRadius: 8, padding: 10, marginBottom: 8,
  },
  errorText: { color: Colors.ERROR, fontSize: 13, flex: 1 },

  footer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.SECONDARY, alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.TEXT_MUTED },
  saveBtn: {
    flex: 2, height: 50, borderRadius: 14,
    backgroundColor: Colors.PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
