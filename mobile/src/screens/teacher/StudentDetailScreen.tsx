import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import { studentApi, StudentDto, BadgeAwardDto } from '@/api/client';
import { useObservationStore } from '@/store/observationStore';
import { useState } from 'react';

interface Props {
  route?: { params?: { studentId: string } };
  navigation?: { goBack: () => void; navigate: (screen: string, params?: object) => void };
}

export default function StudentDetailScreen({ route, navigation }: Props) {
  const studentId = route?.params?.studentId ?? '';
  const { observations, fetchObservations } = useObservationStore();

  const [student, setStudent] = useState<StudentDto | null>(null);
  const [badges, setBadges] = useState<BadgeAwardDto[]>([]);
  const [loading, setLoading] = useState(true);

  const studentObs = observations[studentId] ?? [];

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      studentApi.get(studentId),
      import('../../../src/api/client').then((m) => m.badgeApi.studentBadges(studentId)),
      fetchObservations(studentId),
    ]).then(([studRes, badgeRes]) => {
      setStudent(studRes.data as unknown as StudentDto);
      setBadges(badgeRes.data as unknown as BadgeAwardDto[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT} />
        </TouchableOpacity>
        <Text style={styles.title}>{student?.name ?? 'Öğrenci'}</Text>
        <TouchableOpacity
          style={styles.addObsBtn}
          onPress={() => navigation?.navigate('ObservationAdd', { studentId })}
        >
          <Ionicons name="add-circle" size={28} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profil Kartı */}
        <View style={styles.profileCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{student?.name?.charAt(0) ?? '?'}</Text>
          </View>
          <Text style={styles.studentName}>{student?.name}</Text>
          <Text style={styles.studentClass}>{student?.className}</Text>

          <View style={styles.infoRow}>
            {student?.birthDate && (
              <View style={styles.infoChip}>
                <Ionicons name="calendar-outline" size={14} color={Colors.TEXT_MUTED} />
                <Text style={styles.infoChipText}>{new Date(student.birthDate).toLocaleDateString('tr-TR')}</Text>
              </View>
            )}
            <View style={styles.infoChip}>
              <Ionicons name="ribbon-outline" size={14} color={Colors.ACCENT} />
              <Text style={styles.infoChipText}>{badges.length} rozet</Text>
            </View>
          </View>
        </View>

        {/* Veliler */}
        {(student as any)?.parents?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veliler</Text>
            {(student as any).parents.map((p: { id: string; fullName: string; phone?: string }) => (
              <View key={p.id} style={styles.parentRow}>
                <Ionicons name="person-outline" size={18} color={Colors.TEXT_MUTED} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.parentName}>{p.fullName}</Text>
                  {p.phone && <Text style={styles.parentPhone}>{p.phone}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Rozetler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rozetler</Text>
          {badges.length === 0 ? (
            <Text style={styles.emptyText}>Henüz rozet yok</Text>
          ) : (
            <View style={styles.badgeGrid}>
              {badges.map((b) => (
                <View key={b.id} style={styles.badgeItem}>
                  <View style={styles.badgeIcon}>
                    <Ionicons name="ribbon" size={22} color={Colors.ACCENT} />
                  </View>
                  <Text style={styles.badgeName}>{b.badgeName}</Text>
                  <Text style={styles.badgeDate}>
                    {new Date(b.awardedAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Gözlemler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Olumlu Gözlemler</Text>
          {studentObs.length === 0 ? (
            <Text style={styles.emptyText}>Henüz gözlem yok</Text>
          ) : (
            studentObs.map((obs) => (
              <View key={obs.id} style={styles.obsCard}>
                <View style={styles.obsDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.obsNote}>{obs.note}</Text>
                  <Text style={styles.obsMeta}>
                    {obs.teacherName} · {new Date(obs.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.TEXT },
  addObsBtn: { padding: 4 },
  content: { paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bigAvatarText: { fontSize: 28, fontWeight: '800', color: Colors.PRIMARY },
  studentName: { fontSize: 20, fontWeight: '700', color: Colors.TEXT },
  studentClass: { fontSize: 14, color: Colors.TEXT_MUTED, marginTop: 4 },
  infoRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  infoChipText: { fontSize: 13, color: Colors.TEXT_MUTED },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TEXT,
    marginBottom: 12,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  parentName: { fontSize: 14, fontWeight: '600', color: Colors.TEXT },
  parentPhone: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: {
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    width: '46%',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: { fontSize: 13, fontWeight: '600', color: Colors.TEXT, textAlign: 'center' },
  badgeDate: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 4 },
  obsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
  },
  obsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.PRIMARY,
    marginTop: 6,
  },
  obsNote: { fontSize: 14, color: Colors.TEXT, lineHeight: 20 },
  obsMeta: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 6 },
  emptyText: { fontSize: 14, color: Colors.TEXT_MUTED, fontStyle: 'italic' },
});
