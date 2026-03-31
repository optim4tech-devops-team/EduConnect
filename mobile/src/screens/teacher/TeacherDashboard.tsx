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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Colors from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { usePostStore } from '../../store/postStore';
import { notificationApi, classApi, ClassDto, PostDto } from '../../api/client';

type TeacherNavProp = NativeStackNavigationProp<Record<string, undefined>>;

interface QuickAction {
  key: string;
  label: string;
  emoji: string;
  bgColor: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'photo',
    label: 'Fotoğraf Paylaş',
    emoji: '📷',
    bgColor: Colors.PRIMARY + '1A',
    route: 'PostCreate',
  },
  {
    key: 'assignment',
    label: 'Ödev Ver',
    emoji: '📝',
    bgColor: Colors.INFO + '1A',
    route: 'AssignmentCreate',
  },
  {
    key: 'attendance',
    label: 'Yoklama',
    emoji: '✅',
    bgColor: Colors.ACCENT + '1A',
    route: 'Attendance',
  },
  {
    key: 'announce',
    label: 'Duyuru',
    emoji: '📢',
    bgColor: Colors.SECONDARY + '55',
    route: 'Announcements',
  },
];

const MOCK_ACTIVITIES: PostDto[] = [
  {
    id: '1',
    mediaUrl: '',
    caption: 'Resim etkinliği paylaşıldı',
    classId: 'c1',
    className: 'Papatyalar',
    authorId: 'u1',
    authorName: 'Ayşe Öğretmen',
    publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    mediaUrl: '',
    caption: 'Müzik dersi fotoğrafları',
    classId: 'c1',
    className: 'Papatyalar',
    authorId: 'u1',
    authorName: 'Ayşe Öğretmen',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    mediaUrl: '',
    caption: 'Matematik oyunu etkinliği',
    classId: 'c1',
    className: 'Papatyalar',
    authorId: 'u1',
    authorName: 'Ayşe Öğretmen',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    isPublished: false,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    mediaUrl: '',
    caption: 'Dış mekan oyunları',
    classId: 'c1',
    className: 'Papatyalar',
    authorId: 'u1',
    authorName: 'Ayşe Öğretmen',
    publishedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    mediaUrl: '',
    caption: 'Boyama etkinliği tamamlandı',
    classId: 'c1',
    className: 'Papatyalar',
    authorId: 'u1',
    authorName: 'Ayşe Öğretmen',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date().toISOString(),
  },
];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

export default function TeacherDashboard() {
  const navigation = useNavigation<TeacherNavProp>();
  const { user } = useAuthStore();
  const { posts, fetchPosts, isLoading } = usePostStore();

  const [notifCount, setNotifCount] = useState<number>(0);
  const [classInfo, setClassInfo] = useState<ClassDto | null>(null);

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const loadData = useCallback(async () => {
    try {
      const [notifRes, classRes] = await Promise.all([
        notificationApi.list(),
        classApi.list(),
      ]);
      setNotifCount(notifRes.data.filter((n) => !n.isRead).length);
      if (classRes.data.length > 0) setClassInfo(classRes.data[0]);
    } catch {
      // Fallback to mock when API is unavailable
      setNotifCount(3);
      setClassInfo({
        id: 'c1',
        name: 'Papatyalar',
        teacherId: 'u1',
        teacherName: user?.name ?? 'Öğretmen',
        studentCount: 18,
        schoolId: 's1',
      });
    }
  }, [user?.name]);

  useEffect(() => {
    fetchPosts();
    loadData();
  }, [fetchPosts, loadData]);

  const displayedActivities: PostDto[] =
    posts.length > 0 ? posts.slice(0, 5) : MOCK_ACTIVITIES;

  const renderActivityItem = ({ item }: { item: PostDto }) => (
    <View style={styles.activityItem}>
      <View
        style={[
          styles.activityDot,
          item.isPublished ? styles.activityDotPublished : styles.activityDotDraft,
        ]}
      />
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={1}>
          {item.caption ?? 'Fotoğraf paylaşıldı'}
        </Text>
        <Text style={styles.activityTime}>
          {item.publishedAt ? timeAgo(item.publishedAt) : '—'}
        </Text>
      </View>
      {item.isPublished ? (
        <View style={styles.publishedBadge}>
          <Text style={styles.publishedBadgeText}>Yayında</Text>
        </View>
      ) : (
        <View style={styles.draftBadge}>
          <Text style={styles.draftBadgeText}>Taslak</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Merhaba</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name ?? 'Öğretmen'} Öğretmen 👋
          </Text>
        </View>

        <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
          <Ionicons name="bell-outline" size={24} color={Colors.TEXT} />
          {notifCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {notifCount > 99 ? '99+' : notifCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Orange Class Info Card ──────────────────────────────────── */}
        <View style={styles.classCard}>
          <View style={styles.classCardInner}>
            <View style={styles.classCardLeft}>
              <Text style={styles.classCardLabel}>SINIF</Text>
              <Text style={styles.classCardName}>
                {classInfo?.name ?? 'Papatyalar'}
              </Text>
              <View style={styles.classCardMetaRow}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.classCardStudentCount}>
                  {classInfo?.studentCount ?? 0} öğrenci
                </Text>
              </View>
            </View>
            <View style={styles.classCardRight}>
              <View style={styles.classCardDateBox}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.classCardDate}>{today}</Text>
              </View>
            </View>
          </View>
          {/* Decorative circles */}
          <View style={styles.cardDecorCircle1} />
          <View style={styles.cardDecorCircle2} />
        </View>

        {/* ── Quick Actions 2×2 Grid ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickAction}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(action.route as never)}
            >
              <View
                style={[styles.quickIconCircle, { backgroundColor: action.bgColor }]}
              >
                <Text style={styles.quickEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activities ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllLink}>Tümünü gör</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator
            color={Colors.PRIMARY}
            style={styles.loader}
            size="large"
          />
        ) : displayedActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={Colors.BORDER} />
            <Text style={styles.emptyText}>Henüz aktivite yok</Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            <FlatList
              data={displayedActivities}
              keyExtractor={(item) => item.id}
              renderItem={renderActivityItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={styles.activitySeparator} />
              )}
            />
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 13,
    color: Colors.TEXT,
    opacity: 0.5,
    fontWeight: '500',
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
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.ERROR,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.BACKGROUND,
  },
  notifBadgeText: {
    color: Colors.WHITE,
    fontSize: 9,
    fontWeight: '800',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },

  // Class Card
  classCard: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 22,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 10,
  },
  classCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 22,
  },
  classCardLeft: {
    flex: 1,
  },
  classCardLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  classCardName: {
    color: Colors.WHITE,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  classCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classCardStudentCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  classCardRight: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  classCardDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  classCardDate: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 100,
  },
  cardDecorCircle1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -35,
    right: -25,
  },
  cardDecorCircle2: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 22,
    right: 65,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.TEXT,
    marginBottom: 14,
  },
  seeAllLink: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontWeight: '600',
  },

  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  quickAction: {
    width: '47%',
    backgroundColor: Colors.WHITE,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickEmoji: {
    fontSize: 26,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.TEXT,
    textAlign: 'center',
  },

  // Activity
  activityCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityDotPublished: {
    backgroundColor: Colors.PRIMARY,
  },
  activityDotDraft: {
    backgroundColor: Colors.SECONDARY,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.TEXT,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.TEXT,
    opacity: 0.45,
    marginTop: 3,
  },
  publishedBadge: {
    backgroundColor: Colors.ACCENT + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  publishedBadgeText: {
    fontSize: 11,
    color: Colors.ACCENT,
    fontWeight: '700',
  },
  draftBadge: {
    backgroundColor: Colors.SECONDARY + '55',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  draftBadgeText: {
    fontSize: 11,
    color: '#B8860B',
    fontWeight: '700',
  },
  activitySeparator: {
    height: 1,
    backgroundColor: Colors.BORDER,
  },

  // Misc
  loader: {
    marginVertical: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: Colors.TEXT,
    opacity: 0.4,
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  bottomPad: {
    height: 16,
  },
});
