import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

const MOCK_CLASSES = [
  { id: '1', name: 'Papatyalar', teacherName: 'Ayşe Hanım', studentCount: 18 },
  { id: '2', name: 'Yıldızlar', teacherName: 'Fatma Hanım', studentCount: 15 },
  { id: '3', name: 'Güneşler', teacherName: 'Mehmet Bey', studentCount: 20 },
];

const MOCK_TEACHERS = [
  { id: 't1', name: 'Ayşe Hanım' },
  { id: 't2', name: 'Fatma Hanım' },
  { id: 't3', name: 'Mehmet Bey' },
];

export default function ManageClassesScreen() {
  const [classes, setClasses] = useState(MOCK_CLASSES);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<typeof MOCK_CLASSES[0] | null>(null);
  const [className, setClassName] = useState('');
  const [year, setYear] = useState('2025-2026');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherPickerVisible, setTeacherPickerVisible] = useState(false);

  const openAdd = () => {
    setEditTarget(null);
    setClassName('');
    setYear('2025-2026');
    setSelectedTeacher('');
    setModalVisible(true);
  };

  const openEdit = (cls: typeof MOCK_CLASSES[0]) => {
    setEditTarget(cls);
    setClassName(cls.name);
    setSelectedTeacher(cls.teacherName);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!className.trim()) { Alert.alert('Hata', 'Sınıf adı boş olamaz'); return; }
    if (editTarget) {
      setClasses(prev => prev.map(c =>
        c.id === editTarget.id ? { ...c, name: className, teacherName: selectedTeacher } : c
      ));
    } else {
      setClasses(prev => [...prev, {
        id: Date.now().toString(), name: className,
        teacherName: selectedTeacher, studentCount: 0,
      }]);
    }
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sınıf Yönetimi</Text>
        <Text style={styles.count}>{classes.length} sınıf</Text>
      </View>

      <FlatList
        data={classes}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.classIcon}>
              <Text style={styles.classEmoji}>🏫</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardSub}>👩‍🏫 {item.teacherName}</Text>
              <Text style={styles.cardSub}>👧 {item.studentCount} öğrenci</Text>
            </View>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
              <Ionicons name="pencil-outline" size={20} color={Colors.PRIMARY} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={Colors.WHITE} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editTarget ? 'Sınıfı Düzenle' : 'Yeni Sınıf'}</Text>

            <Text style={styles.label}>Sınıf Adı</Text>
            <TextInput
              style={styles.input}
              value={className}
              onChangeText={setClassName}
              placeholder="örn. Papatyalar"
            />

            <Text style={styles.label}>Akademik Yıl</Text>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              placeholder="2025-2026"
            />

            <Text style={styles.label}>Öğretmen</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setTeacherPickerVisible(true)}>
              <Text style={selectedTeacher ? styles.pickerText : styles.pickerPlaceholder}>
                {selectedTeacher || 'Öğretmen seçin...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.TEXT} />
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={teacherPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setTeacherPickerVisible(false)}>
          <View style={styles.pickerModal}>
            {MOCK_TEACHERS.map(t => (
              <TouchableOpacity key={t.id} style={styles.pickerItem} onPress={() => {
                setSelectedTeacher(t.name);
                setTeacherPickerVisible(false);
              }}>
                <Text style={styles.pickerItemText}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.TEXT },
  count: { fontSize: 14, color: Colors.PRIMARY, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.WHITE, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  classIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.SECONDARY + '40', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  classEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: Colors.TEXT },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
  editBtn: { padding: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.PRIMARY, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.PRIMARY, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', backgroundColor: Colors.WHITE, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.TEXT, marginBottom: 16 },
  label: { fontSize: 13, color: '#888', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: Colors.BORDER, borderRadius: 8, padding: 10, fontSize: 15, color: Colors.TEXT },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.BORDER, borderRadius: 8, padding: 10 },
  pickerText: { fontSize: 15, color: Colors.TEXT },
  pickerPlaceholder: { fontSize: 15, color: '#aaa' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.BORDER },
  cancelText: { color: Colors.TEXT },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.PRIMARY },
  saveText: { color: Colors.WHITE, fontWeight: '600' },
  pickerModal: { width: '80%', backgroundColor: Colors.WHITE, borderRadius: 12, overflow: 'hidden' },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  pickerItemText: { fontSize: 15, color: Colors.TEXT },
});
