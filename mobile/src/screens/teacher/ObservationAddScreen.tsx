import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import { studentApi, badgeApi, StudentDto, BadgeDto } from '@/api/client';
import { useObservationStore } from '@/store/observationStore';

interface Props {
  navigation?: { goBack: () => void };
}

export default function ObservationAddScreen({ navigation }: Props) {
  const { addObservation, isLoading } = useObservationStore();

  const [students, setStudents] = useState<StudentDto[]>([]);
  const [badges, setBadges] = useState<BadgeDto[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<BadgeDto | null>(null);
  const [awardNote, setAwardNote] = useState('');
  const [step, setStep] = useState<'student' | 'note'>('student');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      studentApi.list(),
      badgeApi.list(),
    ]).then(([studRes, badgeRes]) => {
      setStudents(studRes.data as unknown as StudentDto[]);
      setBadges(badgeRes.data as unknown as BadgeDto[]);
    }).catch(() => {
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    }).finally(() => setLoadingData(false));
  }, []);

  const handleSave = async () => {
    if (!selectedStudent || !title.trim() || !note.trim()) {
      Alert.alert('Uyarı', 'Öğrenci, başlık ve gözlem notu zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await addObservation(selectedStudent.id, title.trim(), note.trim());
      if (selectedBadge) {
        await badgeApi.award({
          badgeId: selectedBadge.id,
          studentId: selectedStudent.id,
          note: awardNote || undefined,
        });
      }
      Alert.alert('Başarılı', 'Gözlem kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation?.goBack() },
      ]);
    } catch {
      Alert.alert('Hata', 'Gözlem kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: StudentDto }) => (
    <TouchableOpacity
      style={[styles.studentCard, selectedStudent?.id === item.id && styles.studentCardActive]}
      onPress={() => {
        setSelectedStudent(item);
        setStep('note');
      }}
      activeOpacity={0.8}
    >
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>{item.name?.charAt(0) ?? '?'}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={[styles.studentName, selectedStudent?.id === item.id && styles.studentNameActive]}>
          {item.name}
        </Text>
        <Text style={styles.studentClass}>{item.className}</Text>
      </View>
      {selectedStudent?.id === item.id && (
        <Ionicons name="checkmark-circle" size={22} color={Colors.PRIMARY} />
      )}
    </TouchableOpacity>
  );

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color={Colors.TEXT} />
          </TouchableOpacity>
          <Text style={styles.title}>Olumlu Gözlem</Text>
        </View>

        {step === 'student' ? (
          <>
            <Text style={styles.sectionLabel}>Öğrenci Seç</Text>
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              renderItem={renderStudent}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Sınıfta öğrenci bulunamadı.</Text>
              }
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.noteContent} keyboardShouldPersistTaps="handled">
            {/* Seçili öğrenci */}
            <TouchableOpacity style={styles.selectedStudentRow} onPress={() => setStep('student')}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{selectedStudent?.name?.charAt(0) ?? '?'}</Text>
              </View>
              <Text style={styles.selectedStudentName}>{selectedStudent?.name}</Text>
              <Ionicons name="pencil-outline" size={16} color={Colors.TEXT_MUTED} />
            </TouchableOpacity>

            {/* Gözlem başlığı */}
            <Text style={styles.sectionLabel}>Gözlem Başlığı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Arkadaşlarıyla harika paylaştı..."
              placeholderTextColor={Colors.TEXT_MUTED}
              value={title}
              onChangeText={setTitle}
            />

            {/* Gözlem notu */}
            <Text style={styles.sectionLabel}>Olumlu Gözlem Notu *</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Öğrencinin bugün gösterdiği olumlu davranışı veya başarısını yazın..."
              placeholderTextColor={Colors.TEXT_MUTED}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Rozet ver (opsiyonel) */}
            <Text style={styles.sectionLabel}>Rozet Ver (opsiyonel)</Text>
            <View style={styles.badgeRow}>
              <TouchableOpacity
                style={[styles.badgeChip, !selectedBadge && styles.badgeChipActive]}
                onPress={() => setSelectedBadge(null)}
              >
                <Text style={[styles.badgeChipText, !selectedBadge && styles.badgeChipTextActive]}>Yok</Text>
              </TouchableOpacity>
              {badges.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.badgeChip, selectedBadge?.id === b.id && styles.badgeChipActive]}
                  onPress={() => setSelectedBadge(b)}
                >
                  <Text style={[styles.badgeChipText, selectedBadge?.id === b.id && styles.badgeChipTextActive]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedBadge && (
              <>
                <Text style={styles.sectionLabel}>Rozet Notu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rozet için kısa not..."
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={awardNote}
                  onChangeText={setAwardNote}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, (saving || isLoading) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || isLoading}
            >
              {saving || isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Gözlemi Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backIcon: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.TEXT },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.TEXT_MUTED,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
  },
  studentCardActive: { borderColor: Colors.PRIMARY, backgroundColor: Colors.INFO_LIGHT },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.PRIMARY },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: Colors.TEXT },
  studentNameActive: { color: Colors.PRIMARY },
  studentClass: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  emptyText: { textAlign: 'center', color: Colors.TEXT_MUTED, marginTop: 40 },
  noteContent: { paddingHorizontal: 20, paddingBottom: 40 },
  selectedStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.INFO_LIGHT,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    gap: 10,
  },
  selectedStudentName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.PRIMARY },
  textarea: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.WHITE,
    minHeight: 110,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  badgeChipActive: { borderColor: Colors.ACCENT, backgroundColor: Colors.ACCENT_LIGHT },
  badgeChipText: { fontSize: 13, color: Colors.TEXT_MUTED },
  badgeChipTextActive: { color: Colors.TEXT, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.WHITE,
  },
  saveBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
