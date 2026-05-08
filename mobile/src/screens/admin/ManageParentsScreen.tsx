import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { parentApi, studentApi, ParentDto, StudentDto } from '../../api/client';

export default function ManageParentsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const isWeb = Platform.OS === 'web';
  const [parents, setParents] = useState<ParentDto[]>([]);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    studentId: '',
    relationship: 'Veli',
    isPrimaryContact: true,
    canPickup: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [parentRes, studentRes] = await Promise.all([
        parentApi.list(),
        studentApi.list(),
      ]);
      setParents(parentRes.data);
      setStudents(studentRes.data as unknown as StudentDto[]);
    } catch {
      setParents([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Hata', 'Ad Soyad zorunludur.');
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert('Hata', 'Telefon zorunludur.');
      return;
    }

    setSaving(true);
    try {
      await parentApi.create({
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        students: form.studentId ? [{
          studentId: form.studentId,
          relationship: form.relationship.trim() || undefined,
          isPrimaryContact: form.isPrimaryContact,
          canPickup: form.canPickup,
        }] : undefined,
      });
      setModalVisible(false);
      setForm({
        fullName: '',
        email: '',
        phone: '',
        studentId: '',
        relationship: 'Veli',
        isPrimaryContact: true,
        canPickup: true,
      });
      await load();
      Alert.alert('Başarılı', 'Veli hesabı oluşturuldu.');
    } catch {
      Alert.alert('Hata', 'Veli oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  const renderParent = ({ item }: { item: ParentDto }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.fullName?.charAt(0) ?? '?'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.parentName}>{item.fullName}</Text>
        <Text style={styles.parentMeta}>{item.phone ?? item.email ?? '—'}</Text>
        <Text style={styles.parentChildren}>
          {item.students.length > 0
            ? item.students.map((student) => student.studentName).join(', ')
            : 'Henüz öğrenci bağlanmadı'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => Alert.alert('Öğrenci Bağla', 'Bu özellik yakında aktif olacak.')}
      >
        <Ionicons name="link-outline" size={18} color={Colors.PRIMARY} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={[styles.contentShell, isWide && styles.contentShellWide]}>
        <View style={styles.header}>
          <Text style={styles.title}>Veliler</Text>
          <View style={styles.headerActions}>
            <Text style={styles.count}>{parents.length} veli</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={20} color={Colors.WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={parents}
            keyExtractor={(item) => item.id}
            renderItem={renderParent}
            contentContainerStyle={[styles.list, isWide && styles.listWide]}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={Colors.BORDER} />
                <Text style={styles.emptyText}>Henüz veli kaydı yok</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalCard, isWeb && styles.modalCardWeb]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Veli</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Ad Soyad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Veli adı"
              placeholderTextColor={Colors.TEXT_MUTED}
              value={form.fullName}
              onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
            />

            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="veli@okul.com"
              placeholderTextColor={Colors.TEXT_MUTED}
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Telefon *</Text>
            <TextInput
              style={styles.input}
              placeholder="0532 000 00 00"
              placeholderTextColor={Colors.TEXT_MUTED}
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Öğrenci Bağla</Text>
            <View style={styles.pickerRow}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[styles.studentChip, form.studentId === student.id && styles.studentChipActive]}
                  onPress={() => setForm((f) => ({ ...f, studentId: f.studentId === student.id ? '' : student.id }))}
                >
                  <Text style={[styles.studentChipText, form.studentId === student.id && styles.studentChipTextActive]}>
                    {student.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {students.length === 0 ? <Text style={styles.emptyHelperText}>Önce bir öğrenci oluşturun.</Text> : null}
            </View>

            {form.studentId ? (
              <>
                <Text style={styles.label}>Yakınlık</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Anne, Baba, Vasi"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={form.relationship}
                  onChangeText={(v) => setForm((f) => ({ ...f, relationship: v }))}
                />

                <View style={styles.flagRow}>
                  <TouchableOpacity
                    style={[styles.flagChip, form.isPrimaryContact && styles.flagChipActive]}
                    onPress={() => setForm((f) => ({ ...f, isPrimaryContact: !f.isPrimaryContact }))}
                  >
                    <Ionicons
                      name={form.isPrimaryContact ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={form.isPrimaryContact ? Colors.WHITE : Colors.PRIMARY}
                    />
                    <Text style={[styles.flagChipText, form.isPrimaryContact && styles.flagChipTextActive]}>
                      Birincil İletişim
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.flagChip, form.canPickup && styles.flagChipActive]}
                    onPress={() => setForm((f) => ({ ...f, canPickup: !f.canPickup }))}
                  >
                    <Ionicons
                      name={form.canPickup ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={form.canPickup ? Colors.WHITE : Colors.PRIMARY}
                    />
                    <Text style={[styles.flagChipText, form.canPickup && styles.flagChipTextActive]}>
                      Teslim Alabilir
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setForm({
                    fullName: '',
                    email: '',
                    phone: '',
                    studentId: '',
                    relationship: 'Veli',
                    isPrimaryContact: true,
                    canPickup: true,
                  });
                }}
              >
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.WHITE} size="small" /> : <Text style={styles.saveText}>Kaydet</Text>}
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
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  count: { fontSize: 14, color: Colors.TEXT_MUTED },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    backgroundColor: Colors.INFO_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.INFO },
  cardInfo: { flex: 1 },
  parentName: { fontSize: 15, fontWeight: '600', color: Colors.TEXT },
  parentMeta: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  parentChildren: { fontSize: 12, color: Colors.PRIMARY, marginTop: 4, fontWeight: '600' },
  linkBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.PRIMARY_LIGHT,
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.TEXT_MUTED },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  overlayWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
  },
  modalCardWeb: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '85%',
    borderRadius: 28,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.BACKGROUND,
  },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  label: { fontSize: 14, fontWeight: '700', color: Colors.TEXT },
  input: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.WHITE,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  studentChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  studentChipActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  studentChipText: {
    color: Colors.TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  studentChipTextActive: {
    color: Colors.WHITE,
  },
  emptyHelperText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    fontStyle: 'italic',
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.WHITE,
  },
  flagChipActive: {
    backgroundColor: Colors.PRIMARY,
  },
  flagChipText: {
    color: Colors.PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  flagChipTextActive: {
    color: Colors.WHITE,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: Colors.TEXT, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: Colors.WHITE, fontWeight: '700' },
});
