import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { platformApi, PlatformSchoolDto, CreatePlatformSchoolDto } from '../../api/client';

const PLATFORM_SCHOOL_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:  { label: 'Starter',  color: '#6B7280' },
  basic:    { label: 'Basic',    color: Colors.INFO },
  standard: { label: 'Standard', color: Colors.PRIMARY },
  premium:  { label: 'Premium',  color: '#7C3AED' },
};

const PLANS = ['starter', 'basic', 'standard', 'premium'];

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
    if (!name.trim())       { setError('Okul adı zorunludur.'); return; }
    if (!adminName.trim())  { setError('Yönetici adı soyadı zorunludur.'); return; }
    if (!adminPhone.trim()) { setError('Yönetici telefon numarası zorunludur.'); return; }
    if (!adminEmail.trim()) { setError('Yönetici e-posta adresi zorunludur.'); return; }

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
        primaryAdmin: {
          fullName: adminName.trim(),
          phone: adminPhone.trim(),
          email: adminEmail.trim(),
        },
      };
      await platformApi.createSchool(payload);
      reset();
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.errors?.request?.[0];
      setError(msg ?? 'Okul oluşturulurken hata oluştu.');
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
              <TextInput style={modal.input} placeholder="Okul adı *" placeholderTextColor={Colors.TEXT_MUTED}
                value={name} onChangeText={setName} />
            </View>
            <View style={modal.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Telefon" placeholderTextColor={Colors.TEXT_MUTED}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            <View style={modal.inputRow}>
              <Ionicons name="location-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Adres" placeholderTextColor={Colors.TEXT_MUTED}
                value={address} onChangeText={setAddress} />
            </View>

            <Text style={modal.section}>Plan</Text>
            <View style={modal.planRow}>
              {PLANS.map((p) => (
                <TouchableOpacity key={p} style={[modal.planOption, plan === p && modal.planOptionActive]} onPress={() => setPlan(p)}>
                  <Text style={[modal.planOptionText, plan === p && modal.planOptionTextActive]}>{PLAN_LABELS[p]?.label ?? p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={modal.row2}>
              <View style={[modal.inputRow, { flex: 1, marginRight: 8 }]}>
                <Ionicons name="people-outline" size={16} color={Colors.PRIMARY} style={modal.icon} />
                <TextInput style={modal.input} placeholder="Max Öğrenci" placeholderTextColor={Colors.TEXT_MUTED}
                  value={maxStudents} onChangeText={setMaxStudents} keyboardType="number-pad" />
              </View>
              <View style={[modal.inputRow, { flex: 1 }]}>
                <Ionicons name="school-outline" size={16} color={Colors.PRIMARY} style={modal.icon} />
                <TextInput style={modal.input} placeholder="Max Öğretmen" placeholderTextColor={Colors.TEXT_MUTED}
                  value={maxTeachers} onChangeText={setMaxTeachers} keyboardType="number-pad" />
              </View>
            </View>

            <Text style={modal.section}>Okul Yöneticisi <Text style={modal.required}>*</Text></Text>
            <Text style={modal.sectionHint}>Giriş bilgileri yöneticinin e-posta adresine gönderilecektir.</Text>

            <View style={modal.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Ad Soyad *" placeholderTextColor={Colors.TEXT_MUTED}
                value={adminName} onChangeText={setAdminName} />
            </View>
            <View style={modal.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Telefon *" placeholderTextColor={Colors.TEXT_MUTED}
                value={adminPhone} onChangeText={setAdminPhone} keyboardType="phone-pad" />
            </View>
            <View style={modal.inputRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="E-posta *" placeholderTextColor={Colors.TEXT_MUTED}
                value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" />
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
            <TouchableOpacity style={[modal.saveBtn, saving && modal.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.saveText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit School Modal ─────────────────────────────────────────────────────────
interface EditSchoolModalProps {
  school: PlatformSchoolDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditSchoolModal({ school, onClose, onSaved }: EditSchoolModalProps) {
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [plan, setPlan]           = useState('starter');
  const [maxStudents, setMaxStudents] = useState('200');
  const [maxTeachers, setMaxTeachers] = useState('20');
  const [isActive, setIsActive]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (school) {
      setName(school.name);
      setPhone(school.phone ?? '');
      setAddress(school.address ?? '');
      setPlan(school.plan ?? 'starter');
      setMaxStudents(String(school.maxStudents));
      setMaxTeachers(String(school.maxTeachers));
      setIsActive(school.isActive);
      setError('');
    }
  }, [school]);

  const handleSave = async () => {
    if (!school) return;
    if (!name.trim()) { setError('Okul adı zorunludur.'); return; }

    setSaving(true);
    setError('');
    try {
      await platformApi.updateSchool(school.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        plan,
        maxStudents: Number(maxStudents) || 200,
        maxTeachers: Number(maxTeachers) || 20,
        isActive,
      });
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg ?? 'Güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const visible = school !== null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <TouchableOpacity style={modal.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Okul Düzenle</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.TEXT} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={modal.section}>Okul Bilgileri</Text>

            <View style={modal.inputRow}>
              <Ionicons name="business-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Okul adı *" placeholderTextColor={Colors.TEXT_MUTED}
                value={name} onChangeText={setName} />
            </View>
            <View style={modal.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Telefon" placeholderTextColor={Colors.TEXT_MUTED}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            <View style={modal.inputRow}>
              <Ionicons name="location-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
              <TextInput style={modal.input} placeholder="Adres" placeholderTextColor={Colors.TEXT_MUTED}
                value={address} onChangeText={setAddress} />
            </View>

            <Text style={modal.section}>Plan</Text>
            <View style={modal.planRow}>
              {PLANS.map((p) => (
                <TouchableOpacity key={p} style={[modal.planOption, plan === p && modal.planOptionActive]} onPress={() => setPlan(p)}>
                  <Text style={[modal.planOptionText, plan === p && modal.planOptionTextActive]}>{PLAN_LABELS[p]?.label ?? p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={modal.row2}>
              <View style={[modal.inputRow, { flex: 1, marginRight: 8 }]}>
                <Ionicons name="people-outline" size={16} color={Colors.PRIMARY} style={modal.icon} />
                <TextInput style={modal.input} placeholder="Max Öğrenci" placeholderTextColor={Colors.TEXT_MUTED}
                  value={maxStudents} onChangeText={setMaxStudents} keyboardType="number-pad" />
              </View>
              <View style={[modal.inputRow, { flex: 1 }]}>
                <Ionicons name="school-outline" size={16} color={Colors.PRIMARY} style={modal.icon} />
                <TextInput style={modal.input} placeholder="Max Öğretmen" placeholderTextColor={Colors.TEXT_MUTED}
                  value={maxTeachers} onChangeText={setMaxTeachers} keyboardType="number-pad" />
              </View>
            </View>

            <View style={modal.switchRow}>
              <View>
                <Text style={modal.switchLabel}>Okul Durumu</Text>
                <Text style={modal.switchHint}>{isActive ? 'Aktif — giriş yapılabilir' : 'Pasif — giriş engellendi'}</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: Colors.ERROR + '55', true: Colors.ACCENT + '88' }}
                thumbColor={isActive ? Colors.ACCENT : Colors.ERROR}
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
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={modal.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modal.saveBtn, saving && modal.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.saveText}>Güncelle</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Assign Admin Modal ────────────────────────────────────────────────────────
interface AssignAdminModalProps {
  school: PlatformSchoolDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function AssignAdminModal({ school, onClose, onSaved }: AssignAdminModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (school) {
      setFullName(school.primaryAdminName ?? '');
      setPhone(school.primaryAdminPhone ?? '');
      setEmail('');
      setError('');
    }
  }, [school]);

  const handleSave = async () => {
    if (!school) return;
    if (!fullName.trim()) { setError('Ad soyad zorunludur.'); return; }
    if (!phone.trim())    { setError('Telefon zorunludur.'); return; }
    if (!email.trim())    { setError('E-posta zorunludur.'); return; }

    setSaving(true);
    setError('');
    try {
      await platformApi.assignAdmin(school.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg ?? 'Yönetici atanırken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const visible = school !== null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <TouchableOpacity style={modal.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[modal.sheet, { maxHeight: '55%' }]}>
          <View style={modal.header}>
            <View>
              <Text style={modal.title}>Yönetici Ata</Text>
              {school?.name ? <Text style={modal.subtitle}>{school.name}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.TEXT} />
            </TouchableOpacity>
          </View>

          {school?.primaryAdminName && (
            <View style={modal.currentAdmin}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.INFO} />
              <Text style={modal.currentAdminText}>
                Mevcut: <Text style={{ fontWeight: '700' }}>{school.primaryAdminName}</Text>
                {school.primaryAdminPhone ? `  ${school.primaryAdminPhone}` : ''}
              </Text>
            </View>
          )}

          <Text style={modal.sectionHint}>Yeni yönetici bilgilerini girin. Giriş bilgileri e-posta ve SMS ile gönderilecektir.</Text>

          <View style={modal.inputRow}>
            <Ionicons name="person-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
            <TextInput style={modal.input} placeholder="Ad Soyad *" placeholderTextColor={Colors.TEXT_MUTED}
              value={fullName} onChangeText={setFullName} />
          </View>
          <View style={modal.inputRow}>
            <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
            <TextInput style={modal.input} placeholder="Telefon *" placeholderTextColor={Colors.TEXT_MUTED}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <View style={modal.inputRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.PRIMARY} style={modal.icon} />
            <TextInput style={modal.input} placeholder="E-posta *" placeholderTextColor={Colors.TEXT_MUTED}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          {!!error && (
            <View style={modal.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.ERROR} />
              <Text style={modal.errorText}>{error}</Text>
            </View>
          )}

          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={modal.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modal.saveBtn, saving && modal.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.saveText}>Ata</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PlatformDashboard() {
  const [schools, setSchools]         = useState<PlatformSchoolDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search,  setSearch]          = useState('');
  const [showNewModal, setShowNewModal]     = useState(false);
  const [editSchool, setEditSchool]         = useState<PlatformSchoolDto | null>(null);
  const [assignSchool, setAssignSchool]     = useState<PlatformSchoolDto | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    loadSchools();
    // Component unmount olduğunda çalışan timeout'u temizle
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [loadSchools]);

  const handleSearch = (text: string) => {
    setSearch(text);
    // Önceki timeout'u temizle
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    // Kullanıcı yazmayı bıraktıktan 400ms sonra API çağrısı yap
    searchDebounce.current = setTimeout(() => {
      loadSchools(text);
    }, 400);
  };

  const handleDelete = (school: PlatformSchoolDto) => {
    Alert.alert(
      'Okulu Sil',
      `"${school.name}" okulunu ve okul yöneticisini kalıcı olarak silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(school.id);
            try {
              await platformApi.deleteSchool(school.id);
              loadSchools(search || undefined);
            } catch (err: any) {
              const msg = err?.response?.data?.message ?? 'Silme işlemi başarısız.';
              Alert.alert('Hata', msg);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const activeCount   = schools.filter((s) => s.isActive).length;
  const inactiveCount = schools.length - activeCount;
  const totalStudents = schools.reduce((s, sc) => s + sc.studentCount, 0);

  const renderSchool = ({ item }: { item: PlatformSchoolDto }) => {
    const isDeleting = deletingId === item.id;
    const isProtectedSchool = item.id.toLowerCase() === PLATFORM_SCHOOL_ID;
    return (
      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLogoCircle}>
            <Text style={styles.cardLogoText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.primaryAdminName
              ? <Text style={styles.cardAdmin}>{item.primaryAdminName}</Text>
              : <Text style={styles.cardAdminMuted}>Yönetici atanmamış</Text>}
            {item.phone ? <Text style={styles.cardPhone}>{item.phone}</Text> : null}
          </View>
          <View style={styles.cardRight}>
            <PlanBadge plan={item.plan} />
            <View style={[styles.statusDot, { backgroundColor: item.isActive ? Colors.ACCENT : Colors.ERROR }]} />
          </View>
        </View>

        {/* Stats */}
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

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setEditSchool(item)}
          >
            <Ionicons name="create-outline" size={15} color={Colors.PRIMARY} />
            <Text style={styles.actionBtnText}>Düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setAssignSchool(item)}
          >
            <Ionicons name="person-add-outline" size={15} color={Colors.INFO} />
            <Text style={[styles.actionBtnText, { color: Colors.INFO }]}>Yönet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => handleDelete(item)}
            disabled={isDeleting || isProtectedSchool}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color={Colors.ERROR} />
              : <>
                  <Ionicons name="trash-outline" size={15} color={Colors.ERROR} />
                  <Text style={[styles.actionBtnText, { color: Colors.ERROR, opacity: isProtectedSchool ? 0.45 : 1 }]}>
                    {isProtectedSchool ? 'Kilitli' : 'Sil'}
                  </Text>
                </>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../assets/notio-mark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerLabel}>Platform Yönetimi</Text>
            <Text style={styles.headerTitle}>Okullar</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewModal(true)}>
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
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => { setShowNewModal(false); loadSchools(); }}
      />

      <EditSchoolModal
        school={editSchool}
        onClose={() => setEditSchool(null)}
        onSaved={() => { setEditSchool(null); loadSchools(); }}
      />

      <AssignAdminModal
        school={assignSchool}
        onClose={() => setAssignSchool(null)}
        onSaved={() => { setAssignSchool(null); loadSchools(); }}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 8 },
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

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
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
    marginHorizontal: 20, marginBottom: 14, paddingHorizontal: 12,
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
  cardPhone: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },

  planBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  cardStats: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER, paddingTop: 10, marginBottom: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: '500' },

  cardActions: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.BORDER, paddingTop: 10,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.PRIMARY + '40',
    backgroundColor: Colors.PRIMARY + '08',
  },
  actionBtnDanger: {
    borderColor: Colors.ERROR + '40',
    backgroundColor: Colors.ERROR + '08',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: Colors.PRIMARY },

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.TEXT },
  subtitle: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', color: Colors.TEXT_MUTED, marginBottom: 4, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  required: { color: Colors.ERROR },
  sectionHint: { fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 10, fontStyle: 'italic' },

  currentAdmin: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.INFO + '12', borderRadius: 8, padding: 10, marginBottom: 10,
  },
  currentAdminText: { fontSize: 13, color: Colors.INFO, flex: 1 },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.BACKGROUND, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.SECONDARY,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.TEXT },
  switchHint: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.BACKGROUND, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.SECONDARY,
    paddingHorizontal: 12, marginBottom: 10, height: 48,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.TEXT },
  row2: { flexDirection: 'row' },

  planRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  planOption: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.SECONDARY, alignItems: 'center',
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
