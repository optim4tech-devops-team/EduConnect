import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, attendanceApi, StudentDto } from '../../api/client';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus | null;
}

const STATUS_CONFIG: { key: AttendanceStatus; label: string; color: string; short: string }[] = [
  { key: 'Present', label: 'Geldi', color: Colors.ACCENT, short: 'G' },
  { key: 'Absent', label: 'Gelmedi', color: Colors.ERROR, short: 'A' },
  { key: 'Late', label: 'Geç', color: Colors.SECONDARY, short: 'G+' },
  { key: 'Excused', label: 'Mazeret', color: Colors.INFO, short: 'M' },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AttendanceScreen() {
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayDisplay = today.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const { data } = await studentApi.list();
      setStudents(data);
      const initial: Record<string, AttendanceStatus | null> = {};
      data.forEach((s) => { initial[s.id] = null; });
      setAttendance(initial);
    } catch {
      Alert.alert('Hata', 'Öğrenciler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const records = Object.entries(attendance)
        .filter(([, s]) => s !== null)
        .map(([studentId, status]) => ({
          studentId,
          status: status as AttendanceStatus,
          date: todayStr,
        }));
      await attendanceApi.save(records);
      Alert.alert('Başarılı', 'Yoklama kaydedildi.');
    } catch {
      Alert.alert('Hata', 'Yoklama kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: StudentDto }) => {
    const current = attendance[item.id];
    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.statusButtons}>
          {STATUS_CONFIG.map((cfg) => (
            <TouchableOpacity
              key={cfg.key}
              style={[
                styles.statusBtn,
                { borderColor: cfg.color },
                current === cfg.key && { backgroundColor: cfg.color },
              ]}
              onPress={() => setStatus(item.id, cfg.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  { color: current === cfg.key ? Colors.WHITE : cfg.color },
                ]}
              >
                {cfg.short}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Yoklama</Text>
        <Text style={styles.date}>{todayDisplay}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.legend}>
              {STATUS_CONFIG.map((cfg) => (
                <View key={cfg.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                  <Text style={styles.legendText}>{cfg.label}</Text>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Öğrenci yok</Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
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
              <Ionicons name="checkmark-circle" size={20} color={Colors.WHITE} />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  date: { fontSize: 13, color: Colors.TEXT, opacity: 0.55, marginTop: 4 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.TEXT, opacity: 0.7 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: Colors.PRIMARY },
  studentName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.TEXT },
  statusButtons: { flexDirection: 'row', gap: 6 },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.TEXT, opacity: 0.4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    padding: 16,
  },
  saveButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '700' },
});
