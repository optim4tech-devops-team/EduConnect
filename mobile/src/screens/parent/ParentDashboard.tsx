import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import {
  studentApi,
  notificationApi,
  assignmentApi,
  postApi,
  attendanceApi,
  badgeApi,
  announcementApi,
  StudentDto,
  AssignmentDto,
  PostDto,
  AttendanceDto,
  BadgeAwardDto,
  AnnouncementDto,
} from '../../api/client';

const ATTENDANCE_COLOR: Record<string, string> = {
  Present: Colors.ACCENT,
  Absent: Colors.ERROR,
  Late: Colors.SECONDARY,
  Excused: Colors.INFO,
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const [child, setChild] = useState<StudentDto | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState<AssignmentDto[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<PostDto[]>([]);
  const [attendance, setAttendance] = useState<AttendanceDto[]>([]);
  const [badges, setBadges] = useState<BadgeAwardDto[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [childRes, notifRes, assignRes] = await Promise.all([
        studentApi.myChildren(),
        notificationApi.list(),
        assignmentApi.myChildren(),
      ]);

      const firstChild = childRes.data[0] ?? null;
      setChild(firstChild);
      setNotifCount(notifRes.data.filter((n) => !n.isRead).length);
      setPendingAssignments(assignRes.data.filter((a) => a.status === 'Pending'));

      if (firstChild) {
        const month = new Date().toISOString().slice(0, 7);
        const [photoRes, attRes, badgeRes, announceRes] = await Promise.all([
          postApi.childPosts(firstChild.id),
          attendanceApi.studentSummary(firstChild.id, month),
          badgeApi.studentBadges(firstChild.id),
          announcementApi.list(),
        ]);
        setRecentPhotos(photoRes.data.slice(0, 9));
        setAttendance(attRes.data);
        setBadges(badgeRes.data);
        setAnnouncements(announceRes.data.slice(0, 2));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.PARENT_PINK} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.userName}>{user?.name ?? 'Veli'} 💝</Text>
        </View>
        <TouchableOpacity style={styles.bellButton}>
          <Ionicons name="notifications-outline" size={24} color={Colors.TEXT} />
          {notifCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Child profile card */}
        {child && (
          <View style={styles.childCard}>
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>{getInitials(child.name)}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childClass}>{child.className}</Text>
              <Text style={styles.childTeacher}>{child.parentName}</Text>
            </View>
            <Ionicons name="heart" size={28} color={Colors.PARENT_PINK} />
          </View>
        )}

        {/* Pending assignments */}
        {pendingAssignments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bekleyen Ödevler</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingAssignments.length}</Text>
              </View>
            </View>
            {pendingAssignments.slice(0, 2).map((a) => {
              const isOverdue = new Date(a.dueDate) < new Date();
              return (
                <View key={a.id} style={styles.assignmentItem}>
                  <Ionicons name="book-outline" size={18} color={Colors.INFO} />
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentTitle}>{a.title}</Text>
                    <Text style={[styles.assignmentDue, isOverdue && { color: Colors.ERROR }]}>
                      {isOverdue ? 'Süresi geçti' : `Son: ${new Date(a.dueDate).toLocaleDateString('tr-TR')}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son Fotoğraflar</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Tümü →</Text>
            </TouchableOpacity>
          </View>
          {recentPhotos.length === 0 ? (
            <Text style={styles.emptySmall}>Henüz fotoğraf yok</Text>
          ) : (
            <View style={styles.photoGrid}>
              {recentPhotos.slice(0, 6).map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo.thumbnailUrl ?? photo.mediaUrl }}
                    style={styles.photoImage}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Attendance summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bu Ay Devam Durumu</Text>
          <View style={styles.attendanceRow}>
            {attendance.slice(0, 20).map((a) => (
              <View
                key={a.id}
                style={[
                  styles.attendanceDot,
                  { backgroundColor: ATTENDANCE_COLOR[a.status] ?? Colors.BORDER },
                ]}
              />
            ))}
            {attendance.length === 0 && (
              <Text style={styles.emptySmall}>Devamsızlık kaydı yok</Text>
            )}
          </View>
          <View style={styles.attendanceLegend}>
            {Object.entries(ATTENDANCE_COLOR).map(([key, color]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>
                  {key === 'Present' ? 'Geldi' : key === 'Absent' ? 'Gelmedi' : key === 'Late' ? 'Geç' : 'Mazeret'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Rozetler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {badges.slice(0, 5).map((b) => (
                <View key={b.id} style={styles.badgeChip}>
                  <Text style={styles.badgeEmoji}>⭐</Text>
                  <Text style={styles.badgeChipText}>{b.badgeName}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duyurular</Text>
            {announcements.map((a) => (
              <View key={a.id} style={styles.announcementItem}>
                <Ionicons name="megaphone-outline" size={18} color={Colors.PRIMARY} />
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle}>{a.title}</Text>
                  <Text style={styles.announcementBody} numberOfLines={2}>{a.content}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.BACKGROUND },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: Colors.TEXT, opacity: 0.6 },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.TEXT },
  bellButton: { position: 'relative', padding: 6 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.ERROR,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: Colors.WHITE, fontSize: 10, fontWeight: '700' },
  scroll: { paddingHorizontal: 20 },
  childCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.PARENT_PINK + '66',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.PARENT_PINK + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  childAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.PARENT_PINK },
  childInfo: { flex: 1 },
  childName: { fontSize: 18, fontWeight: '800', color: Colors.TEXT },
  childClass: { fontSize: 13, color: Colors.PRIMARY, fontWeight: '600', marginTop: 2 },
  childTeacher: { fontSize: 12, color: Colors.TEXT, opacity: 0.55, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.TEXT },
  countBadge: {
    backgroundColor: Colors.INFO,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: { color: Colors.WHITE, fontSize: 12, fontWeight: '700' },
  seeAll: { fontSize: 14, color: Colors.PRIMARY, fontWeight: '600' },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.INFO,
  },
  assignmentInfo: { flex: 1 },
  assignmentTitle: { fontSize: 14, fontWeight: '600', color: Colors.TEXT },
  assignmentDue: { fontSize: 12, color: Colors.TEXT, opacity: 0.55, marginTop: 2 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoItem: { width: '31%', aspectRatio: 1 },
  photoImage: { width: '100%', height: '100%', borderRadius: 10 },
  emptySmall: { fontSize: 13, color: Colors.TEXT, opacity: 0.4 },
  attendanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  attendanceDot: { width: 14, height: 14, borderRadius: 7 },
  attendanceLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.TEXT, opacity: 0.7 },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.SECONDARY + '55',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 5,
  },
  badgeEmoji: { fontSize: 14 },
  badgeChipText: { fontSize: 13, fontWeight: '600', color: Colors.TEXT },
  announcementItem: {
    flexDirection: 'row',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  announcementContent: { flex: 1 },
  announcementTitle: { fontSize: 14, fontWeight: '700', color: Colors.TEXT, marginBottom: 4 },
  announcementBody: { fontSize: 13, color: Colors.TEXT, opacity: 0.6, lineHeight: 18 },
});
