import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { adminApi, classApi, ClassDto, AdminStatsDto } from '../../api/client';

interface StatCard {
  key: string;
  label: string;
  value: number;
  emoji: string;
}

interface QuickAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'addClass',    label: 'Sınıf Ekle',     icon: 'add-circle-outline',  route: '/(admin)/classes'   },
  { key: 'addStudent',  label: 'Öğrenci Ekle',   icon: 'people-outline',      route: '/(admin)/classes'   },
  { key: 'addTeacher',  label: 'Öğretmen Ekle',  icon: 'person-add-outline',  route: '/(admin)/teachers'  },
  { key: 'parents',     label: 'Veliler',         icon: 'heart-outline',       route: '/(admin)/classes'   },
];

const MOCK_STATS: AdminStatsDto = {
  classCount:   6,
  teacherCount: 8,
  studentCount: 124,
  parentCount:  98,
};

const MOCK_CLASSES: ClassDto[] = [
  { id: 'c1', name: 'Papatyalar', teacherId: 't1', teacherName: 'Ayşe Yılmaz',  studentCount: 22, schoolId: 's1' },
  { id: 'c2', name: 'Güneşler',   teacherId: 't2', teacherName: 'Mehmet Kaya',  studentCount: 19, schoolId: 's1' },
  { id: 'c3', name: 'Yıldızlar',  teacherId: 't3', teacherName: 'Fatma Demir',  studentCount: 21, schoolId: 's1' },
  { id: 'c4', name: 'Kartallar',  teacherId: 't4', teacherName: 'Ali Çelik',    studentCount: 18, schoolId: 's1' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [stats,   setStats]   = useState<AdminStatsDto>(MOCK_STATS);
  const [classes, setClasses] = useState<ClassDto[]>(MOCK_CLASSES);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, classesRes] = await Promise.all([
        adminApi.stats(),
        classApi.list(),
      ]);
      setStats(statsRes.data);
      setClasses(classesRes.data);
    } catch {
      setStats(MOCK_STATS);
      setClasses(MOCK_CLASSES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const statCards: StatCard[] = [
    { key: 'class',   label: 'Sınıf',     value: stats.classCount,   emoji: '🏫' },
    { key: 'teacher', label: 'Öğretmen',  value: stats.teacherCount, emoji: '👩‍🏫' },
    { key: 'student', label: 'Öğrenci',   value: stats.studentCount, emoji: '👧' },
  ];

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{item.emoji}</Text>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );

  const renderClassItem = ({ item }: { item: ClassDto }) => (
    <TouchableOpacity
      style={styles.classItem}
      activeOpacity={0.75}
      onPress={() => router.push('/(admin)/classes' as any)}
    >
      <View style={styles.classIconCircle}>
        <Text style={styles.classIconText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.classInfo}>
        <Text style={styles.className}>{item.name}</Text>
        <Text style={styles.classTeacher}>{item.teacherName}</Text>
      </View>
      <View style={styles.classStudentBadge}>
        <Ionicons name="people" size={13} color={Colors.PRIMARY} />
        <Text style={styles.classStudentCount}>{item.studentCount}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.BORDER} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Yönetici Paneli</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name ?? 'Admin'} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          activeOpacity={0.7}
        >
          <Ionicons name="bell-outline" size={22} color={Colors.TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Banner Card ─────────────────────────────────────────── */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTextBlock}>
            <Text style={styles.bannerTitle}>notio Yönetimi</Text>
            <Text style={styles.bannerSub}>
              Okul genelinde {stats.classCount} sınıf, {stats.studentCount} öğrenci kayıtlı.
            </Text>
          </View>
          <Text style={styles.bannerEmoji}>🏫</Text>
          <View style={styles.bannerCircle1} />
          <View style={styles.bannerCircle2} />
        </View>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Genel Durum</Text>
        {loading ? (
          <ActivityIndicator color={Colors.PRIMARY} style={styles.loader} />
        ) : (
          <FlatList
            data={statCards}
            keyExtractor={(item) => item.key}
            renderItem={renderStatCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
            scrollEnabled={false}
          />
        )}

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.actionButton}
              activeOpacity={0.75}
              onPress={() => router.push(action.route as any)}
            >
              <Ionicons name={action.icon} size={20} color={Colors.PRIMARY} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Classes List ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sınıflar</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/classes' as any)}>
            <Text style={styles.seeAll}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.PRIMARY} style={styles.loader} />
        ) : classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={Colors.BORDER} />
            <Text style={styles.emptyText}>Henüz sınıf yok</Text>
          </View>
        ) : (
          <View style={styles.classListCard}>
            <FlatList
              data={classes.slice(0, 6)}
              keyExtractor={(item) => item.id}
              renderItem={renderClassItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  greeting: {
    fontSize: 12,
    color: Colors.TEXT,
    opacity: 0.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.TEXT,
    marginTop: 2,
  },
  bellButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },

  // Banner
  bannerCard: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  bannerTextBlock: {
    flex: 1,
  },
  bannerTitle: {
    color: Colors.WHITE,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  bannerEmoji: {
    fontSize: 42,
    marginLeft: 8,
  },
  bannerCircle1: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -30,
    right: -20,
  },
  bannerCircle2: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -15,
    right: 70,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.TEXT,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontWeight: '600',
    marginBottom: 14,
  },

  // Stats
  statsRow: {
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: 110,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: Colors.TEAL_100,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.SLATE_700,
    opacity: 0.85,
    marginTop: 3,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.WHITE,
    gap: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.PRIMARY,
    textAlign: 'center',
  },

  // Class list
  classListCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  classIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.PRIMARY,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TEXT,
  },
  classTeacher: {
    fontSize: 12,
    color: Colors.TEXT,
    opacity: 0.5,
    marginTop: 2,
  },
  classStudentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.PRIMARY + '15',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classStudentCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.PRIMARY,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.BORDER,
  },
  loader: {
    marginVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.TEXT,
    opacity: 0.4,
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
});
