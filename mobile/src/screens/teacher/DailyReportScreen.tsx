import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, dailyReportApi, StudentDto } from '../../api/client';

type Mood = 'Happy' | 'Neutral' | 'Sad';

const MOODS: { key: Mood; emoji: string; label: string; color: string }[] = [
  { key: 'Happy', emoji: '😊', label: 'Mutlu', color: Colors.ACCENT },
  { key: 'Neutral', emoji: '😐', label: 'Normal', color: Colors.SECONDARY },
  { key: 'Sad', emoji: '😢', label: 'Üzgün', color: Colors.INFO },
];

export default function DailyReportScreen() {
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);
  const [meals, setMeals] = useState('');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [activities, setActivities] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const { data } = await studentApi.list();
      setStudents(data);
    } catch {
      Alert.alert('Hata', 'Öğrenciler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      Alert.alert('Uyarı', 'Lütfen bir öğrenci seçin.');
      return;
    }
    if (!mood) {
      Alert.alert('Uyarı', 'Lütfen ruh halini seçin.');
      return;
    }
    try {
      setIsSaving(true);
      await dailyReportApi.create({
        studentId: selectedStudent.id,
        mood,
        meals: meals.trim() || undefined,
        sleepMinutes: sleepMinutes ? parseInt(sleepMinutes, 10) : undefined,
        activities: activities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        notes: notes.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Başarılı', 'Günlük rapor kaydedildi.', [
        {
          text: 'Tamam',
          onPress: () => {
            setSelectedStudent(null);
            setMood(null);
            setMeals('');
            setSleepMinutes('');
            setActivities('');
            setNotes('');
          },
        },
      ]);
    } catch {
      Alert.alert('Hata', 'Rapor kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Günlük Rapor</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Student picker */}
          <Text style={styles.label}>Öğrenci</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStudentPicker(!showStudentPicker)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.pickerText, !selectedStudent && { color: '#B0B0B0' }]}
            >
              {selectedStudent ? selectedStudent.name : 'Öğrenci seçin...'}
            </Text>
            <Ionicons
              name={showStudentPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.TEXT}
              style={{ opacity: 0.5 }}
            />
          </TouchableOpacity>
          {showStudentPicker && (
            <View style={styles.dropdown}>
              {students.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.dropdownItem,
                    selectedStudent?.id === s.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedStudent(s);
                    setShowStudentPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      selectedStudent?.id === s.id && { color: Colors.PRIMARY, fontWeight: '700' },
                    ]}
                  >
                    {s.name}
                  </Text>
                  {selectedStudent?.id === s.id && (
                    <Ionicons name="checkmark" size={16} color={Colors.PRIMARY} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Mood */}
          <Text style={styles.label}>Ruh Hali</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.moodButton,
                  mood === m.key && { borderColor: m.color, backgroundColor: m.color + '22' },
                ]}
                onPress={() => setMood(m.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, mood === m.key && { color: m.color, fontWeight: '700' }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Meals */}
          <Text style={styles.label}>Yemek</Text>
          <TextInput
            style={styles.input}
            placeholder="Bugün ne yedi? (örn: Makarna, ayran)"
            placeholderTextColor="#B0B0B0"
            value={meals}
            onChangeText={setMeals}
          />

          {/* Sleep */}
          <Text style={styles.label}>Uyku Süresi (dakika)</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 90"
            placeholderTextColor="#B0B0B0"
            value={sleepMinutes}
            onChangeText={setSleepMinutes}
            keyboardType="numeric"
          />

          {/* Activities */}
          <Text style={styles.label}>Aktiviteler (virgülle ayırın)</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Boyama, Blok oyunu, Dış mekan"
            placeholderTextColor="#B0B0B0"
            value={activities}
            onChangeText={setActivities}
          />

          {/* Notes */}
          <Text style={styles.label}>Notlar</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Öğretmen notu..."
            placeholderTextColor="#B0B0B0"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.WHITE} size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={Colors.WHITE} />
                <Text style={styles.saveButtonText}>Raporu Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  date: { fontSize: 13, color: Colors.TEXT, opacity: 0.55, marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.TEXT,
    opacity: 0.65,
    marginBottom: 8,
    marginTop: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  pickerText: { fontSize: 15, color: Colors.TEXT },
  dropdown: {
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  dropdownItemActive: { backgroundColor: Colors.PRIMARY + '11' },
  dropdownText: { fontSize: 15, color: Colors.TEXT },
  moodRow: { flexDirection: 'row', gap: 12 },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  moodEmoji: { fontSize: 28, marginBottom: 6 },
  moodLabel: { fontSize: 13, color: Colors.TEXT, opacity: 0.7 },
  input: {
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.TEXT,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '700' },
});
