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
import { classApi, adminApi, ClassDto, UserDto } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassForm {
  name: string;
  year: string;
  teacherId: string;
}

const EMPTY_FORM: ClassForm = { name: '', year: '', teacherId: '' };

const MOCK_CLASSES: ClassDto[] = [
  { id: 'c1', name: 'Papatyalar', teacherId: 't1', teacherName: 'Ayşe Yılmaz',  studentCount: 22, schoolId: 's1' },
  { id: 'c2', name: 'Güneşler',   teacherId: 't2', teacherName: 'Mehmet Kaya',  studentCount: 19, schoolId: 's1' },
  { id: 'c3', name: 'Yıldızlar',  teacherId: 't3', teacherName: 'Fatma Demir',  studentCount: 21, schoolId: 's1' },
  { id: 'c4', name: 'Kartallar',  teacherId: 't4', teacherName: 'Ali Çelik',    studentCount: 18, schoolId: 's1' },
];

const MOCK_TEACHERS: UserDto[] = [
  { id: 't1', name: 'Ayşe Yılmaz',  role: 'Teacher', email: 'ayse@edu.com',   schoolId: 's1' },
  { id: 't2', name: 'Mehmet Kaya',  role: 'Teacher', email: 'mehmet@edu.com', schoolId: 's1' },
  { id: 't3', name: 'Fatma Demir',  role: 'Teacher', email: 'fatma@edu.com',  schoolId: 's1' },
  { id: 't4', name: 'Ali Çelik',    role: 'Teacher', email: 'ali@edu.com',    schoolId: 's1' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ManageClassesScreen() {
  const [classes,   setClasses]   = useState<ClassDto[]>(MOCK_CLASSES);
  const [teachers,  setTeachers]  = useState<UserDto[]>(MOCK_TEACHERS);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState<ClassForm>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [classRes, teacherRes] = await Promise.all([
        classApi.list(),
        adminApi.teachers(),
      ]);
      setClasses(classRes.data);
      setTeachers(teacherRes.data);
    } catch {
      setClasses(MOCK_CLASSES);
      setTeachers(MOCK_TEACHERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (cls: ClassDto) => {
    setEditingId(cls.id);
    setForm({ name: cls.name, year: '', teacherId: cls.teacherId });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Hata', 'Sınıf adı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await classApi.update(editingId, { name: form.name });
        if (form.teacherId) await classApi.assignTeacher(editingId, form.teacherId);
        setClasses((prev) =>
          prev.map((c) => {
            if (c.id !== editingId) return c;
            const t = teachers.find((x) => x.id === form.teacherId);
            return { ...c, name: form.name, teacherId: form.teacherId || c.teacherId, teacherName: t?.name ?? c.teacherName };
          }),
        );
      } else {
        const { data: newClass } = await classApi.create({ name: form.name });
        if (form.teacherId) {
          await classApi.assignTeacher(newClass.id, form.teacherId);
          const t = teachers.find((x) => x.id === form.teacherId);
          newClass.teacherId   = form.teacherId;
          newClass.teacherName = t?.name ?? '';
        }
        setClasses((prev) => [newClass, ...prev]);
      }
      closeModal();
    } catch {
      // Optimistic fallback for offline / demo
      if (editingId) {
        setClasses((prev) =>
          prev.map((c) => {
            if (c.id !== editingId) return c;
            const t = teachers.find((x) => x.id === form.teacherId);
            return { ...c, name: form.name, teacherId: form.teacherId || c.teacherId, teacherName: t?.name ?? c.teacherName };
          }),
        );
      } else {
        const t = teachers.find((x) => x.id === form.teacherId);
        setClasses((prev) => [
          {
            id: Date.now().toString(),
            name: form.name,
            teacherId: form.teacherId,
            teacherName: t?.name ?? '',
            studentCount: 0,
            schoolId: 's1',
          },
          ...prev,
        ]);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cls: ClassDto) => {
    Alert.alert(
      'Sınıfı Sil',
      `"${cls.name}" sınıfını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try { await classApi.delete(cls.id); } catch { /* silent */ }
            setClasses((prev) => prev.filter((c) => c.id !== cls.id));
          },
        },
      ],
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: ClassDto }) => (
    <View style={styles.card}>
      <View style={styles.cardIconCircle}>
        <Text style={styles.cardIconText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardTeacher} numberOfLines={1}>
          {item.teacherName || 'Öğretmen atanmadı'}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="people" size={12} color={Colors.PRIMARY} />
          <Text style={styles.cardStudentCount}>{item.studentCount} öğrenci</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={18} color={Colors.PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color={Colors.ERROR} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const selectedTeacher = teachers.find((t) => t.id === form.teacherId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sınıf Yönetimi</Text>
        <Text style={styles.headerCount}>{classes.length} sınıf</Text>
      </View>

      {/* ── List ────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={56} color={Colors.BORDER} />
              <Text style={styles.emptyText}>Henüz sınıf eklenmedi</Text>
            </View>
          }
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={Colors.WHITE} />
      </TouchableOpacity>

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} activeOpacity={1} />
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Sınıfı Düzenle' : 'Yeni Sınıf Ekle'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.inputLabel}>Sınıf Adı *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Örn. Papatyalar"
                placeholderTextColor={Colors.TEXT + '55'}
              />

              {/* Year */}
              <Text style={styles.inputLabel}>Eğitim Yılı</Text>
              <TextInput
                style={styles.input}
                value={form.year}
                onChangeText={(v) => setForm((f) => ({ ...f, year: v }))}
                placeholder="Örn. 2025-2026"
                placeholderTextColor={Colors.TEXT + '55'}
              />

              {/* Teacher picker */}
              <Text style={styles.inputLabel}>Öğretmen</Text>
              <View style={styles.pickerContainer}>
                {teachers.map((teacher) => (
                  <TouchableOpacity
                    key={teacher.id}
                    style={[
                      styles.pickerItem,
                      form.teacherId === teacher.id && styles.pickerItemSelected,
                    ]}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        teacherId: f.teacherId === teacher.id ? '' : teacher.id,
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerAvatar}>
                      <Text style={styles.pickerAvatarText}>{teacher.name.charAt(0)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.pickerItemLabel,
                        form.teacherId === teacher.id && styles.pickerItemLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {teacher.name}
                    </Text>
                    {form.teacherId === teacher.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}
                {teachers.length === 0 && (
                  <Text style={styles.pickerEmpty}>Öğretmen bulunamadı</Text>
                )}
              </View>

              {selectedTeacher && (
                <Text style={styles.selectionHint}>Seçili: {selectedTeacher.name}</Text>
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Güncelle' : 'Ekle'}</Text>
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
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.TEXT },
  headerCount:  { fontSize: 13, color: Colors.TEXT, opacity: 0.45, fontWeight: '500' },

  loader: { marginTop: 60 },

  listContent: { paddingHorizontal: 22, paddingBottom: 100 },
  separator:   { height: 10 },

  // Card
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIconText:     { fontSize: 20, fontWeight: '800', color: Colors.PRIMARY },
  cardInfo:         { flex: 1 },
  cardName:         { fontSize: 16, fontWeight: '700', color: Colors.TEXT, marginBottom: 3 },
  cardTeacher:      { fontSize: 13, color: Colors.TEXT, opacity: 0.55, marginBottom: 6 },
  cardMeta:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStudentCount: { fontSize: 12, color: Colors.PRIMARY, fontWeight: '600' },
  cardActions:      { flexDirection: 'row', gap: 8, marginLeft: 10 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.PRIMARY + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.ERROR + '15',
    alignItems: 'center', justifyContent: 'center',
  },

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
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  modalTitle:  { fontSize: 19, fontWeight: '800', color: Colors.TEXT },
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

  // Teacher picker list
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
  pickerItemSelected:      { backgroundColor: Colors.PRIMARY + '12' },
  pickerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerAvatarText:        { fontSize: 14, fontWeight: '800', color: Colors.PRIMARY },
  pickerItemLabel:         { flex: 1, fontSize: 14, color: Colors.TEXT, fontWeight: '500' },
  pickerItemLabelSelected: { color: Colors.PRIMARY, fontWeight: '700' },
  pickerEmpty: { padding: 14, color: Colors.TEXT, opacity: 0.4, textAlign: 'center' },
  selectionHint: { marginTop: 8, fontSize: 12, color: Colors.PRIMARY, fontWeight: '600' },

  // Save button
  saveBtn: {
    marginTop: 24, backgroundColor: Colors.PRIMARY,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText:     { color: Colors.WHITE, fontSize: 16, fontWeight: '800' },
});
