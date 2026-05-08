import React, { useCallback, useState, useEffect } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, classApi, StudentDto, ClassDto } from '../../api/client';

interface StudentForm {
  fullName: string;
  birthDate: string;
  classId: string;
  notes: string;
}

const EMPTY_FORM: StudentForm = { fullName: '', birthDate: '', classId: '', notes: '' };

export default function ManageStudentsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const isWeb = Platform.OS === 'web';
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterClassId, setFilterClassId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studRes, classRes] = await Promise.all([
        studentApi.list(filterClassId || undefined),
        classApi.list(),
      ]);
      setStudents(
        (studRes.data as any[]).map((item) => ({
          ...item,
          name: item.name ?? item.fullName ?? '',
        })) as StudentDto[],
      );
      setClasses(classRes.data as unknown as ClassDto[]);
    } catch {
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [filterClassId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Uyarı', 'Öğrenci adı zorunludur.');
      return;
    }
    if (!form.classId) {
      Alert.alert('Uyarı', 'Lütfen öğrenci için bir sınıf seçin.');
      return;
    }
    setSaving(true);
    try {
      await studentApi.create({
        fullName: form.fullName.trim(),
        classId: form.classId,
        birthDate: form.birthDate || undefined,
        notes: form.notes || undefined,
      } as Partial<StudentDto>);
      setModalVisible(false);
      setForm(EMPTY_FORM);
      await load();
      Alert.alert('Başarılı', 'Öğrenci kaydı oluşturuldu.');
    } catch {
      Alert.alert('Hata', 'Öğrenci kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: StudentDto }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.charAt(0) ?? '?'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentMeta}>{item.className ?? '—'}</Text>
      </View>
      <View style={styles.badgeChip}>
        <Ionicons name="ribbon-outline" size={14} color={Colors.ACCENT} />
        <Text style={styles.badgeCount}>{item.badgeCount ?? 0}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={[styles.contentShell, isWide && styles.contentShellWide]}>
        <View style={styles.header}>
          <Text style={styles.title}>Öğrenciler</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setForm({ ...EMPTY_FORM, classId: filterClassId || '' });
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterClassId && styles.filterChipActive]}
            onPress={() => setFilterClassId('')}
          >
            <Text style={[styles.filterChipText, !filterClassId && styles.filterChipTextActive]}>Tümü</Text>
          </TouchableOpacity>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.filterChip, filterClassId === c.id && styles.filterChipActive]}
              onPress={() => setFilterClassId(c.id)}
            >
              <Text style={[styles.filterChipText, filterClassId === c.id && styles.filterChipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            renderItem={renderStudent}
            contentContainerStyle={[styles.list, isWide && styles.listWide]}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={Colors.BORDER} />
                <Text style={styles.emptyText}>Henüz öğrenci yok</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalCard, isWeb && styles.modalCardWeb]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Öğrenci</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Ad Soyad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Öğrenci adı"
              placeholderTextColor={Colors.TEXT_MUTED}
              value={form.fullName}
              onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
            />

            <Text style={styles.label}>Doğum Tarihi</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.TEXT_MUTED}
              value={form.birthDate}
              onChangeText={(v) => setForm((f) => ({ ...f, birthDate: v }))}
            />

            <Text style={styles.label}>Sınıf</Text>
            <View style={styles.pickerRow}>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.classChip, form.classId === c.id && styles.classChipActive]}
                  onPress={() => setForm((f) => ({ ...f, classId: c.id }))}
                >
                  <Text style={[styles.classChipText, form.classId === c.id && styles.classChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {classes.length === 0 && (
                <Text style={styles.emptyPickerText}>Önce bir sınıf oluşturun.</Text>
              )}
            </View>

            <Text style={styles.label}>Not</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Alerji, sağlık notları..."
              placeholderTextColor={Colors.TEXT_MUTED}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setForm(EMPTY_FORM); }}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!form.fullName.trim() || !form.classId || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving || !form.fullName.trim() || !form.classId}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  contentShell: {
    flex: 1,
    width: '100%',
  },
  contentShellWide: {
    maxWidth: 1160,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  addBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  filterChipActive: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  filterChipText: { fontSize: 13, color: Colors.TEXT_MUTED },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  listWide: { paddingHorizontal: 0, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.PRIMARY },
  cardInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: Colors.TEXT },
  studentMeta: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  badgeCount: { fontSize: 13, color: Colors.ACCENT, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.TEXT_MUTED },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  overlayWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalCardWeb: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '85%',
    borderRadius: 28,
    paddingBottom: 24,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.BACKGROUND,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.TEXT },
  label: { fontSize: 13, fontWeight: '600', color: Colors.TEXT_MUTED, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.BACKGROUND,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.LIGHT_GRAY,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  classChipActive: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  classChipText: { fontSize: 13, color: Colors.TEXT_MUTED },
  classChipTextActive: { color: '#fff', fontWeight: '600' },
  emptyPickerText: { fontSize: 13, color: Colors.TEXT_MUTED, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: Colors.TEXT_MUTED, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
