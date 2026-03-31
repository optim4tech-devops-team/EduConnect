import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../theme/colors';
import { messageApi, ConversationDto } from '../../api/client';

const MOCK: ConversationDto[] = [
  { id: '1', participantId: 'u1', participantName: 'Ayşe Öğretmen', participantRole: 'Teacher', lastMessage: 'Ali bugün çok güzel bir resim çizdi!', lastMessageAt: '10:32', unreadCount: 2 },
  { id: '2', participantId: 'u2', participantName: 'Fatma Öğretmen', participantRole: 'Teacher', lastMessage: 'Haftalık ödevi teslim ettiniz mi?', lastMessageAt: 'Dün', unreadCount: 0 },
  { id: '3', participantId: 'u3', participantName: 'Mehmet Veli', participantRole: 'Parent', lastMessage: 'Teşekkür ederim bilgi için.', lastMessageAt: 'Pzt', unreadCount: 0 },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  Teacher: Colors.PRIMARY,
  Parent: Colors.INFO,
  Admin: '#9B89CC',
};

const ROLE_LABELS: Record<string, string> = {
  Teacher: 'Öğretmen',
  Parent: 'Veli',
  Admin: 'Yönetici',
};

export default function MessagesScreen() {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<ConversationDto[]>(MOCK);
  const [newChatModal, setNewChatModal] = useState(false);

  useEffect(() => {
    messageApi.conversations()
      .then(r => { if (r.data?.length) setConversations(r.data); })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesajlar</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{conversations.reduce((s, c) => s + c.unreadCount, 0)}</Text>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, item.unreadCount > 0 && styles.unread]}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, otherUserName: item.participantName })}
          >
            <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[item.participantRole] ?? Colors.PRIMARY }]}>
              <Text style={styles.avatarText}>{getInitials(item.participantName)}</Text>
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemTop}>
                <Text style={styles.name}>{item.participantName}</Text>
                <Text style={styles.time}>{item.lastMessageAt ?? ''}</Text>
              </View>
              <View style={styles.itemBottom}>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage ?? ''}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rolePill}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.participantRole] ?? Colors.PRIMARY }]}>
                  {ROLE_LABELS[item.participantRole] ?? item.participantRole}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.BORDER, marginLeft: 72 }} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setNewChatModal(true)}>
        <Ionicons name="create-outline" size={24} color={Colors.WHITE} />
      </TouchableOpacity>

      <Modal visible={newChatModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Yeni Mesaj</Text>
            <Text style={styles.modalSub}>Mesaj göndermek istediğiniz kişiyi seçin</Text>
            {MOCK.map(c => (
              <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => {
                setNewChatModal(false);
                navigation.navigate('Chat', { conversationId: c.id, otherUserName: c.participantName });
              }}>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[c.participantRole] ?? Colors.PRIMARY }]}>
                  <Text style={styles.avatarText}>{getInitials(c.participantName)}</Text>
                </View>
                <Text style={styles.name}>{c.participantName}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setNewChatModal(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, gap: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.TEXT },
  badge: { backgroundColor: Colors.PRIMARY, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: Colors.WHITE, fontSize: 12, fontWeight: 'bold' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.WHITE, paddingVertical: 12, paddingHorizontal: 16 },
  unread: { backgroundColor: '#FFF3EC' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: Colors.WHITE, fontWeight: 'bold', fontSize: 15 },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: 'bold', fontSize: 15, color: Colors.TEXT },
  time: { fontSize: 12, color: '#aaa' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  preview: { flex: 1, fontSize: 13, color: '#888' },
  unreadBadge: { backgroundColor: Colors.PRIMARY, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 6 },
  unreadText: { color: Colors.WHITE, fontSize: 11, fontWeight: 'bold' },
  rolePill: { marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.PRIMARY, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.PRIMARY, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.TEXT, marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  closeBtn: { marginTop: 16, alignItems: 'center', padding: 12 },
  closeBtnText: { color: Colors.PRIMARY, fontWeight: '600', fontSize: 15 },
});
