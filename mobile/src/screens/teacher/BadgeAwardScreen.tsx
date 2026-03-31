import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, badgeApi, StudentDto, BadgeDto } from '../../api/client';

export default function BadgeAwardScreen() {
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [badges, setBadges] = useState<BadgeDto[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDto | null>(null);
  const [note, setNote] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [studRes, badgeRes] = await Promise.all([
        studentApi.list(),
        badgeApi.list(),
      ]);
      setStudents(studRes.data);
      setBadges(badgeRes.data);
    } catch {
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAward = async () => {
    if (!selectedStudent || !selectedBadge) {
      Alert.alert('Uyarı', 'Lütfen öğrenci ve rozet seçin.');
      return;
    }
    try {
      setIsAwarding(true);
      await badgeApi.award({
        badgeId: selectedBadge.id,
        studentId: selectedStudent.id,
        note: note.trim() || undefined,
      });
      Alert.alert('Başarılı', `${selectedStudent.name} öğrencisine "${selectedBadge.name}" rozeti verildi!`, [
        {
          text: 'Tamam',
          onPress: () => {
            setSelectedStudent(null);
            setSelectedBadge(null);
            setNote('');
          },
        },
      ]);
    } catch {
      Alert.alert('Hata', 'Rozet verilemedi.');
    } finally {
      setIsAwarding(false);
    }
  };

  const BADGE_ICONS = ['🌟', '🏆', '🎯', '💡', '🎨', '🌈', '🦋', '🚀', '❤️', '👑'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Rozet Ver</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Student picker */}
          <Text style={styles.label}>Öğrenci Seçin</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStudentPicker(!showStudentPicker)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pickerText, !selectedStudent && { color: '#B0B0B0' }]}>
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
                  style={[styles.dropdownItem, selectedStudent?.id === s.id && styles.dropdownItemActive]}
                  onPress={() => { setSelectedStudent(s); setShowStudentPicker(false); }}
                >
                  <Text style={[styles.dropdownText, selectedStudent?.id === s.id && { color: Colors.PRIMARY, fontWeight: '700' }]}>
                    {s.name}
                  </Text>
                  {selectedStudent?.id === s.id && <Ionicons name="checkmark" size={16} color={Colors.PRIMARY} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Badge grid */}
          <Text style={styles.label}>Rozet Seçin</Text>
          {badges.length === 0 ? (
            <View style={styles.emptyBadge}>
              <Text style={styles.emptyText}>Henüz rozet tanımlanmamış</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={badges}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.badgeItem,
                    selectedBadge?.id === item.id && styles.badgeItemSelected,
                    { backgroundColor: item.color ? item.color + '22' : Colors.SECONDARY + '44' },
                  ]}
                  onPress={() => setSelectedBadge(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.badgeEmoji}>
                    {BADGE_ICONS[index % BADGE_ICONS.length]}
                  </Text>
                  <Text style={styles.badgeName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {selectedBadge?.id === item.id && (
                    <View style={styles.badgeCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.PRIMARY} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              style={styles.badgeList}
            />
          )}

          {/* Note */}
          <Text style={styles.label}>Not (İsteğe Bağlı)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Neden bu rozeti hak etti?"
            placeholderTextColor="#B0B0B0"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Preview */}
          {selectedStudent && selectedBadge && (
            <View style={styles.preview}>
              <Text style={styles.previewText}>
                <Text style={{ fontWeight: '700', color: Colors.PRIMARY }}>{selectedStudent.name}</Text>
                {' → '}
                <Text style={{ fontWeight: '700', color: Colors.INFO }}>{selectedBadge.name}</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.awardButton,
              (!selectedStudent || !selectedBadge || isAwarding) && { opacity: 0.5 },
            ]}
            onPress={handleAward}
            disabled={!selectedStudent || !selectedBadge || isAwarding}
            activeOpacity={0.85}
          >
            {isAwarding ? (
              <ActivityIndicator color={Colors.WHITE} size="small" />
            ) : (
              <>
                <Ionicons name="star" size={20} color={Colors.WHITE} />
                <Text style={styles.awardButtonText}>Rozet Ver</Text>
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
  scroll: { paddingHorizontal: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.TEXT,
    opacity: 0.65,
    marginBottom: 8,
    marginTop: 20,
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
  badgeList: { marginBottom: 4 },
  badgeItem: {
    width: 90,
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  badgeItemSelected: { borderColor: Colors.PRIMARY },
  badgeEmoji: { fontSize: 32, marginBottom: 6 },
  badgeName: { fontSize: 11, color: Colors.TEXT, textAlign: 'center', fontWeight: '600' },
  badgeCheck: { position: 'absolute', top: 4, right: 4 },
  emptyBadge: { padding: 20, alignItems: 'center' },
  emptyText: { color: Colors.TEXT, opacity: 0.4 },
  input: {
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.TEXT,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  preview: {
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: 'center',
  },
  previewText: { fontSize: 15, color: Colors.TEXT },
  awardButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  awardButtonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '700' },
});
