import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../theme/colors';
import { notificationApi, NotificationDto } from '../../api/client';

// ─── Icon mapping ─────────────────────────────────────────────────────────────
const NOTIFICATION_ICONS: Record<NotificationDto['type'], string> = {
  Photo:        '📸',
  Assignment:   '📝',
  Attendance:   '✅',
  Badge:        '🏅',
  Announcement: '📢',
  Message:      '💬',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  if (hrs < 48) return 'Dün';
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(isoDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: NotificationDto[] = [
  {
    id: 'n1', type: 'Photo', title: 'Yeni Fotoğraf Paylaşıldı',
    body: 'Ayşe Öğretmen "Papatyalar" sınıfından yeni fotoğraflar ekledi.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'n2', type: 'Badge', title: 'Rozet Kazandı!',
    body: 'Ali Yılmaz "Süper Kahraman" rozetini kazandı. Tebrikler!',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'n3', type: 'Attendance', title: 'Devamsızlık Bildirimi',
    body: 'Çocuğunuz bugün okula gelmedi. Lütfen durumu kontrol edin.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'n4', type: 'Assignment', title: 'Yeni Ödev Verildi',
    body: 'Matematik ödevi cuma gününe kadar teslim edilmelidir.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'n5', type: 'Announcement', title: 'Okul Duyurusu',
    body: 'Önümüzdeki hafta veli toplantısı düzenlenecektir.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'n6', type: 'Message', title: 'Yeni Mesaj',
    body: 'Ayşe Öğretmen size bir mesaj gönderdi.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'n7', type: 'Photo', title: 'Sanat Etkinliği',
    body: 'Bugünkü sanat etkinliğinden 12 yeni fotoğraf eklendi.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<NotificationDto[]>(MOCK_NOTIFICATIONS);
  const [loading,       setLoading]       = useState(true);
  const [markingAll,    setMarkingAll]    = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationApi.list();
      if (data?.length) setNotifications(data);
    } catch {
      // Keep mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // ── Mark single as read ───────────────────────────────────────────────────
  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await notificationApi.markRead(id);
    } catch {
      // Optimistic was already applied; silent
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = async () => {
    const hasUnread = notifications.some((n) => !n.isRead);
    if (!hasUnread) return;

    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      // Optimistic already applied
    } finally {
      setMarkingAll(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: NotificationDto }) => {
    const icon = NOTIFICATION_ICONS[item.type] ?? '🔔';
    return (
      <TouchableOpacity
        style={[styles.item, item.isRead ? styles.itemRead : styles.itemUnread]}
        activeOpacity={0.75}
        onPress={() => markRead(item.id)}
      >
        {/* Icon circle */}
        <View style={[styles.iconCircle, !item.isRead && styles.iconCircleUnread]}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
        </View>

        {/* Timestamp + unread dot */}
        <View style={styles.itemRight}>
          <Text style={styles.itemTime}>{relativeTime(item.createdAt)}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            disabled={markingAll}
            activeOpacity={0.7}
          >
            {markingAll ? (
              <ActivityIndicator color={Colors.PRIMARY} size="small" />
            ) : (
              <Text style={styles.markAllText}>Tümünü Oku</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── List ────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color={Colors.PRIMARY} size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyText}>Henüz bildirim yok</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.BACKGROUND },

  header: {
    paddingHorizontal: 22, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.TEXT },
  countBadge: {
    backgroundColor: Colors.PRIMARY, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
    minWidth: 22, alignItems: 'center',
  },
  countBadgeText: { color: Colors.WHITE, fontSize: 12, fontWeight: '800' },
  markAllBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.PRIMARY,
    minWidth: 44, alignItems: 'center',
  },
  markAllText: { color: Colors.PRIMARY, fontSize: 13, fontWeight: '700' },

  loader: { marginTop: 60 },

  listContent: { paddingBottom: 32 },
  separator: { height: 1, backgroundColor: Colors.BORDER },

  // Item
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 22, paddingVertical: 16,
  },
  itemRead:   { backgroundColor: '#F5F5F5' },
  itemUnread: { backgroundColor: Colors.WHITE },

  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.BORDER + '60',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleUnread: { backgroundColor: Colors.SECONDARY + '50' },
  iconEmoji: { fontSize: 22 },

  itemContent: { flex: 1, paddingRight: 8 },
  itemTitle: {
    fontSize: 14, fontWeight: '600', color: Colors.TEXT,
    marginBottom: 4, opacity: 0.7,
  },
  itemTitleUnread: { fontWeight: '800', opacity: 1 },
  itemBody: { fontSize: 13, color: Colors.TEXT, opacity: 0.55, lineHeight: 18 },

  itemRight: { alignItems: 'flex-end', gap: 6 },
  itemTime:  { fontSize: 11, color: Colors.TEXT, opacity: 0.4, textAlign: 'right' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.PRIMARY,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText: {
    fontSize: 16, color: Colors.TEXT,
    opacity: 0.4, fontWeight: '500',
  },
});
