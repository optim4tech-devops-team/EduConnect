import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Colors from '../../theme/colors';
import { messageApi, adminApi, ConversationDto, UserDto } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(isoOrLabel: string | undefined): string {
  if (!isoOrLabel) return '';
  // If it's not ISO format return as-is (e.g. 'Dün', 'Pzt')
  if (!/^\d{4}/.test(isoOrLabel)) return isoOrLabel;
  const diff = Date.now() - new Date(isoOrLabel).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  if (hrs < 48) return 'Dün';
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(isoOrLabel).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const ROLE_COLORS: Record<string, string> = {
  Teacher:       Colors.PRIMARY,
  Parent:        Colors.AMBER_400,
  Admin:         Colors.INFO,
  SchoolAdmin:   Colors.INFO,
  PlatformAdmin: Colors.TEAL_700,
};

const ROLE_LABELS: Record<string, string> = {
  Teacher:       'Öğretmen',
  Parent:        'Veli',
  Admin:         'Yönetici',
  SchoolAdmin:   'Okul Yöneticisi',
  PlatformAdmin: 'Platform Admin',
};

type NavProp = NativeStackNavigationProp<Record<string, object | undefined>>;

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_CONVERSATIONS: ConversationDto[] = [
  {
    id: 'cv1', participantId: 'u1', participantName: 'Ayşe Yılmaz',
    participantRole: 'Teacher',
    lastMessage: 'Ali bugün çok güzel bir resim çizdi!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    unreadCount: 2,
  },
  {
    id: 'cv2', participantId: 'u2', participantName: 'Fatma Demir',
    participantRole: 'Teacher',
    lastMessage: 'Haftalık ödevi teslim ettiniz mi?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    unreadCount: 0,
  },
  {
    id: 'cv3', participantId: 'u3', participantName: 'Mehmet Veli',
    participantRole: 'Parent',
    lastMessage: 'Teşekkür ederim bilgi için.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    unreadCount: 0,
  },
  {
    id: 'cv4', participantId: 'u4', participantName: 'Zeynep Çelik',
    participantRole: 'Parent',
    lastMessage: 'Toplantıya katılacak mısınız?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unreadCount: 1,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const navigation = useNavigation<NavProp>();

  const [conversations, setConversations] = useState<ConversationDto[]>(MOCK_CONVERSATIONS);
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [users,         setUsers]         = useState<UserDto[]>([]);
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [starting,      setStarting]      = useState<string | null>(null);

  // Load conversations
  useEffect(() => {
    messageApi
      .conversations()
      .then((r) => {
        if (r.data?.length) setConversations(r.data);
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  // Load user list for "new conversation" modal
  const openNewConversation = useCallback(async () => {
    setModalOpen(true);
    setLoadingUsers(true);
    try {
      const { data } = await adminApi.teachers();
      setUsers(data);
    } catch {
      // Use participants from existing conversations as fallback user list
      const participantUsers: UserDto[] = conversations.map((c) => ({
        id: c.participantId,
        name: c.participantName,
        email: '',
        role: c.participantRole as UserDto['role'],
        schoolId: 's1',
      }));
      setUsers(participantUsers);
    } finally {
      setLoadingUsers(false);
    }
  }, [conversations]);

  const startConversation = async (user: UserDto) => {
    setStarting(user.id);
    try {
      const { data: conv } = await messageApi.startConversation(user.id);
      setConversations((prev) => {
        if (prev.find((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setModalOpen(false);
      navigation.navigate('Chat' as never, {
        conversationId: conv.id,
        otherUserName:  user.name,
      } as never);
    } catch {
      // Optimistic: navigate with generated id
      const fakeId = `new-${user.id}`;
      setModalOpen(false);
      navigation.navigate('Chat' as never, {
        conversationId: fakeId,
        otherUserName:  user.name,
      } as never);
    } finally {
      setStarting(null);
    }
  };

  // ── Render conversation item ──────────────────────────────────────────
  const renderItem = ({ item }: { item: ConversationDto }) => {
    const avatarColor = ROLE_COLORS[item.participantRole] ?? Colors.PRIMARY;
    const preview = item.lastMessage
      ? item.lastMessage.length > 40
        ? item.lastMessage.slice(0, 40) + '…'
        : item.lastMessage
      : '';

    return (
      <TouchableOpacity
        style={[styles.item, item.unreadCount > 0 && styles.itemUnread]}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('Chat' as never, {
            conversationId: item.id,
            otherUserName:  item.participantName,
          } as never)
        }
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(item.participantName)}</Text>
        </View>

        {/* Body */}
        <View style={styles.itemBody}>
          {/* Top row: name + time */}
          <View style={styles.itemTopRow}>
            <Text style={[styles.itemName, item.unreadCount > 0 && styles.itemNameBold]}>
              {item.participantName}
            </Text>
            <Text style={styles.itemTime}>{relativeTime(item.lastMessageAt)}</Text>
          </View>

          {/* Role label */}
          <Text style={[styles.roleLabel, { color: avatarColor }]}>
            {ROLE_LABELS[item.participantRole] ?? item.participantRole}
          </Text>

          {/* Bottom row: preview + unread badge */}
          <View style={styles.itemBottomRow}>
            <Text style={[styles.preview, item.unreadCount > 0 && styles.previewBold]} numberOfLines={1}>
              {preview || 'Henüz mesaj yok'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mesajlar</Text>
          {totalUnread > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>{totalUnread}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── List ────────────────────────────────────────────────────── */}
      {loadingConvs ? (
        <ActivityIndicator color={Colors.PRIMARY} size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={56} color={Colors.BORDER} />
              <Text style={styles.emptyText}>Henüz konuşma yok</Text>
            </View>
          }
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={openNewConversation} activeOpacity={0.85}>
        <Ionicons name="create-outline" size={26} color={Colors.WHITE} />
      </TouchableOpacity>

      {/* ── New Conversation Modal ───────────────────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Mesaj</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Mesaj göndermek istediğiniz kişiyi seçin</Text>

            {loadingUsers ? (
              <ActivityIndicator color={Colors.PRIMARY} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {users.map((user) => {
                  const avatarColor = ROLE_COLORS[user.role] ?? Colors.PRIMARY;
                  const isStarting  = starting === user.id;
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userItem}
                      activeOpacity={0.75}
                      onPress={() => startConversation(user)}
                      disabled={!!starting}
                    >
                      <View style={[styles.userAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.userAvatarText}>{getInitials(user.name)}</Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={[styles.userRole, { color: avatarColor }]}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Text>
                      </View>
                      {isStarting ? (
                        <ActivityIndicator color={Colors.PRIMARY} size="small" />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={Colors.BORDER} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                {users.length === 0 && (
                  <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.BACKGROUND },

  header: {
    paddingHorizontal: 22, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.TEXT },
  totalUnreadBadge: {
    backgroundColor: Colors.PRIMARY, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
    minWidth: 22, alignItems: 'center',
  },
  totalUnreadText: { color: Colors.WHITE, fontSize: 12, fontWeight: '800' },

  loader: { marginTop: 60 },

  listContent: { paddingBottom: 100 },
  separator: { height: 1, backgroundColor: Colors.BORDER, marginLeft: 82 },

  // Conversation item
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 22,
    backgroundColor: Colors.WHITE,
  },
  itemUnread: { backgroundColor: Colors.AMBER_100 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: Colors.WHITE, fontWeight: '800', fontSize: 16 },
  itemBody:   { flex: 1 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName:   { fontSize: 15, fontWeight: '600', color: Colors.TEXT },
  itemNameBold: { fontWeight: '800' },
  itemTime:   { fontSize: 11, color: Colors.TEXT, opacity: 0.4 },
  roleLabel:  { fontSize: 11, fontWeight: '600', marginTop: 1, marginBottom: 4 },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center' },
  preview:    { flex: 1, fontSize: 13, color: Colors.TEXT, opacity: 0.5 },
  previewBold: { opacity: 0.85, fontWeight: '600', color: Colors.TEXT },
  unreadBadge: {
    backgroundColor: Colors.PRIMARY, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8,
  },
  unreadBadgeText: { color: Colors.WHITE, fontSize: 11, fontWeight: '800' },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 26,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: {
    marginTop: 14, fontSize: 16,
    color: Colors.TEXT, opacity: 0.4, fontWeight: '500', textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: Colors.TEXT },
  modalSub:   { fontSize: 13, color: Colors.TEXT, opacity: 0.5, marginBottom: 18 },

  // User picker item
  userItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: Colors.WHITE, fontWeight: '800', fontSize: 15 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.TEXT },
  userRole: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
