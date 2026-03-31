import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { adminApi, classApi, UserDto, ClassDto } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Avatar background colors cycling by index
const AVATAR_COLORS = [
  Colors.PRIMARY,
  Colors.INFO,
  Colors.ACCENT,
  '#FF85A1',
  Colors.SECONDARY,
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeacherForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  classId: string;
}

const EMPTY_FORM: TeacherForm = { name: '', email: '', phone: '', password: '', classId: '' };

interface TeacherItem extends UserDto {
  assignedClassName?: string;
}

const MOCK_TEACHERS: TeacherItem[] = [
  { id: 't1', name: 'Ayşe Yılmaz',  email: 'ayse@edu.com',   phone: '0532 111 11 11', role: 'Teacher', schoolId: 's1', assignedClassName: 'Papatyalar' },
  { id: 't2', name: 'Mehmet Kaya',  email: 'mehmet@edu.com', phone: '0533 222 22 22', role: 'Teacher', schoolId: 's1', assignedClassName: 'Güneşler'   },
  { id: 't3', name: 'Fatma Demir',  email: 'fatma@edu.com',  phone: '0534 333 33 33', role: 'Teacher', schoolId: 's1', assignedClassName: 'Yıldızlar'  },
  { id: 't4', name: 'Ali Çelik',    email: 'ali@edu.com',    phone: '0535 444 44 44', role: 'Teacher', schoolId: 's1', assignedClassName: ''           },
];

const MOCK_CLASSES: ClassDto[] = [
  { id: 'c1', name: 'Papatyalar', teacherId: 't1', teacherName: 'Ayşe Yılmaz', studentCount: 22, schoolId: 's1' },
  { id: 'c2', name: 'Güneşler',   teacherId: 't2', teacherName: 'Mehmet Kaya', studentCount: 19, schoolId: 's1' },
  { id: 'c3', name: 'Yıldızlar',  teacherId: 't3', teacherName: 'Fatma Demir', studentCount: 21, schoolId: 's1' },
  { id: 'c4', name: 'Kartallar',  teacherId: '',   teacherName: '',             studentCount: 18, schoolId: 's1' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ManageTeachersScreen() {
  const [teachers,  setTeachers]  = useState<TeacherItem[]>(MOCK_TEACHERS);
  const [classes,   setClasses]   = useState<ClassDto[]>(MOCK_CLASSES);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form,      setForm]      = useState<TeacherForm>(EMPTY_FORM);
  const [showPass,  setShowPass]  = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherRes, classRes] = await Promise.all([
        adminApi.teachers(),
        classApi.list(),
      ]);
      // Merge class assignment into teacher records
      const enriched: TeacherItem[] = teacherRes.data.map((t) => {
        const cls = classRes.data.find((c) => c.teacherId === t.id);
        return { ...t, assignedClassName: cls?.name ?? '' };
      });
      setTeachers(enriched);
      setClasses(classRes.data);
    } catch {
      setTeachers(MOCK_TEACHERS);
      setClasses(MOCK_CLASSES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setShowPass(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim())  { Alert.alert('Hata', 'Ad Soyad zorunludur.'); return; }
    if (!form.email.trim()) { Alert.alert('Hata', 'E-posta zorunludur.'); return; }
    if (!form.password.trim()) { Alert.alert('Hata', 'Şifre zorunludur.'); return; }

    setSaving(true);
    try {
      const { data: newUser } = await adminApi.createTeacher({
        name:     form.name,
        email:    form.email,
        phone:    form.phone,
        password: form.password,
        role:     'Teacher',
        schoolId: 's1',
      });
      const cls = classes.find((c) => c.id === form.classId);
      if (form.classId) await classApi.assignTeacher(form.classId, newUser.id);
      setTeachers((prev) => [{ ...newUser, assignedClassName: cls?.name ?? '' }, ...prev]);
      closeModal();
      Alert.alert('Başarılı', 'Öğretmen hesabı oluşturuldu.');
    } catch {
      // Optimistic fallback
      const cls = classes.find((c) => c.id === form.classId);
      const optimistic: TeacherItem = {
        id: Date.now().toString(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: 'Teacher',
        schoolId: 's1',
        assignedClassName: cls?.name ?? '',
      };
      setTeachers((prev) => [optimistic, ...prev]);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const renderTeacher = ({ item, index }: { item: TeacherItem; index: number }) => {
    const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <View style={styles.card}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
          {item.assignedClassName ? (
            <View style={styles.classBadge}>
              <Ionicons name="school" size={11} color={Colors.PRIMARY} />
              <Text style={styles.classBadgeText}>{item.assignedClassName}</Text>
            </View>
          ) : (
            <Text style={styles.noClass}>Sınıf atanmadı</Text>
          )}
        </View>
        {/* More */}
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.TEXT + '60'} />
        </TouchableOpacity>
      </View>
    );
  };

  const selectedClass = classes.find((c) => c.id === form.classId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Öğretmenler</Text>
        <Text style={styles.headerCount}>{teachers.length} öğretmen</Text>
      </View>

      {/* ── List ────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => item.id}
          renderItem={renderTeacher}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={Colors.BORDER} />
              <Text style={styles.emptyText}>Henüz öğretmen eklenmedi</Text>
            </View>
          }
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={Colors.WHITE} />
      </TouchableOpacity>

      {/* ── Add Modal ────────────────────────────────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} activeOpacity={1} />
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Öğretmen Ekle</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Full Name */}
              <Text style={styles.inputLabel}>Ad Soyad *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Ayşe Yılmaz"
                placeholderTextColor={Colors.TEXT + '55'}
              />

              {/* Email */}
              <Text style={styles.inputLabel}>E-posta *</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="ayse@okul.com"
                placeholderTextColor={Colors.TEXT + '55'}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="0532 000 00 00"
                placeholderTextColor={Colors.TEXT + '55'}
                keyboardType="phone-pad"
              />

              {/* Password */}
              <Text style={styles.inputLabel}>Şifre *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={form.password}
                  onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.TEXT + '55'}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass((s) => !s)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.TEXT + '80'}
                  />
                </TouchableOpacity>
              </View>

              {/* Class Picker */}
              <Text style={styles.inputLabel}>Sınıf Ata</Text>
              <View style={styles.pickerContainer}>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[
                      styles.pickerItem,
                      form.classId === cls.id && styles.pickerItemSelected,
                    ]}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        classId: f.classId === cls.id ? '' : cls.id,
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerIconCircle}>
                      <Text style={styles.pickerIconText}>{cls.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pickerLabel,
                          form.classId === cls.id && styles.pickerLabelSelected,
                        ]}
                      >
                        {cls.name}
                      </Text>
                      <Text style={styles.pickerSub}>{cls.studentCount} öğrenci</Text>
                    </View>
                    {form.classId === cls.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}
                {classes.length === 0 && (
                  <Text style={styles.pickerEmpty}>Sınıf bulunamadı</Text>
                )}
              </View>

              {selectedClass && (
                <Text style={styles.selectionHint}>Seçili sınıf: {selectedClass.name}</Text>
              )}

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.WHITE} />
                ) : (
                  <Text style={styles.saveBtnText}>Öğretmen Ekle</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.BACKGROUND },

  header: {
    paddingHorizontal: 22, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.TEXT },
  headerCount: { fontSize: 13, color: Colors.TEXT, opacity: 0.45, fontWeight: '500' },

  loader: { marginTop: 60 },

  listContent: { paddingHorizontal: 22, paddingBottom: 100 },
  separator:   { height: 10 },

  // Card
  card: {
    backgroundColor: Colors.WHITE, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: Colors.WHITE, fontWeight: '800', fontSize: 17 },
  cardInfo:   { flex: 1 },
  cardName:   { fontSize: 15, fontWeight: '700', color: Colors.TEXT, marginBottom: 3 },
  cardEmail:  { fontSize: 13, color: Colors.TEXT, opacity: 0.5, marginBottom: 5 },
  classBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.PRIMARY + '18',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  classBadgeText: { fontSize: 12, color: Colors.PRIMARY, fontWeight: '600' },
  noClass:        { fontSize: 12, color: Colors.TEXT, opacity: 0.35, fontStyle: 'italic' },
  moreBtn:        { padding: 8 },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 26,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: {
    marginTop: 14, fontSize: 16,
    color: Colors.TEXT, opacity: 0.4, fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: Colors.TEXT },
  inputLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.TEXT,
    opacity: 0.65, marginBottom: 6, marginTop: 14,
  },
  input: {
    height: 50, borderWidth: 1.5, borderColor: Colors.BORDER,
    borderRadius: 14, paddingHorizontal: 16,
    fontSize: 15, color: Colors.TEXT,
    backgroundColor: Colors.BACKGROUND,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.BORDER,
    borderRadius: 14, backgroundColor: Colors.BACKGROUND,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1, height: 50, paddingHorizontal: 16,
    fontSize: 15, color: Colors.TEXT,
  },
  eyeBtn: { paddingHorizontal: 14, justifyContent: 'center', height: 50 },

  // Class picker
  pickerContainer: {
    borderWidth: 1.5, borderColor: Colors.BORDER,
    borderRadius: 14, overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    backgroundColor: Colors.WHITE,
    borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
  },
  pickerItemSelected: { backgroundColor: Colors.PRIMARY + '12' },
  pickerIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerIconText:      { fontSize: 14, fontWeight: '800', color: Colors.PRIMARY },
  pickerLabel:         { fontSize: 14, color: Colors.TEXT, fontWeight: '600' },
  pickerLabelSelected: { color: Colors.PRIMARY, fontWeight: '700' },
  pickerSub:           { fontSize: 11, color: Colors.TEXT, opacity: 0.45, marginTop: 1 },
  pickerEmpty: { padding: 14, color: Colors.TEXT, opacity: 0.4, textAlign: 'center' },
  selectionHint: { marginTop: 8, fontSize: 12, color: Colors.PRIMARY, fontWeight: '600' },

  // Save
  saveBtn: {
    marginTop: 24, backgroundColor: Colors.PRIMARY,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: Colors.WHITE, fontSize: 16, fontWeight: '800' },
});
