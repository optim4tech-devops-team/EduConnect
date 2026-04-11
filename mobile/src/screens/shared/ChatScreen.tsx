import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Colors from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useSignalR } from '../../hooks/useSignalR';
import { MessageDto } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─── Mock messages for demo ───────────────────────────────────────────────────
function buildMockMessages(conversationId: string, myId: string): MessageDto[] {
  const now = Date.now();
  return [
    {
      id: 'm1', conversationId, senderId: 'other',
      senderName: 'Karşı Taraf', content: 'Merhaba! Nasılsınız?',
      sentAt: new Date(now - 1000 * 60 * 10).toISOString(), isRead: true,
    },
    {
      id: 'm2', conversationId, senderId: myId,
      senderName: 'Ben', content: 'İyiyim, teşekkür ederim. Siz nasılsınız?',
      sentAt: new Date(now - 1000 * 60 * 9).toISOString(), isRead: true,
    },
    {
      id: 'm3', conversationId, senderId: 'other',
      senderName: 'Karşı Taraf', content: 'Çok iyiyim. Ali bugün çok güzel bir resim çizdi!',
      sentAt: new Date(now - 1000 * 60 * 8).toISOString(), isRead: true,
    },
    {
      id: 'm4', conversationId, senderId: myId,
      senderName: 'Ben', content: 'Vay canına! Harika, tebrikler Ali\'ye 🎉',
      sentAt: new Date(now - 1000 * 60 * 7).toISOString(), isRead: true,
    },
    {
      id: 'm5', conversationId, senderId: 'other',
      senderName: 'Karşı Taraf', content: 'Bu hafta toplantıya katılacak mısınız?',
      sentAt: new Date(now - 1000 * 60 * 2).toISOString(), isRead: false,
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const { conversationId = '', otherUserName = '' } = useLocalSearchParams<{ conversationId: string; otherUserName: string }>();

  const { user }           = useAuthStore();
  const { messages: allMessages, fetchMessages, addIncomingMessage, markRead } = useMessageStore();
  const flatListRef        = useRef<FlatList<MessageDto>>(null);

  const [inputText, setInputText] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [localMsgs, setLocalMsgs] = useState<MessageDto[]>([]);

  // ── SignalR ──────────────────────────────────────────────────────────────
  const { isConnected, sendMessage: signalRSend } = useSignalR({
    onReceiveMessage: useCallback(
      (msg: MessageDto) => {
        if (msg.conversationId === conversationId) {
          addIncomingMessage(msg);
        }
      },
      [conversationId, addIncomingMessage],
    ),
  });

  // ── Load history ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchMessages(conversationId);
      } catch {
        // Use mock data as fallback
        const mock = buildMockMessages(conversationId, user?.id ?? 'me');
        setLocalMsgs(mock);
      } finally {
        setLoading(false);
      }
    };
    load();
    markRead(conversationId);
  }, [conversationId, fetchMessages, markRead, user?.id]);

  // Merge store messages + local optimistic messages
  const storeMessages = allMessages[conversationId] ?? [];
  const displayMessages: MessageDto[] =
    storeMessages.length > 0 ? storeMessages : localMsgs;

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);

    // Optimistic message
    const optimistic: MessageDto = {
      id: `opt-${Date.now()}`,
      conversationId,
      senderId:   user?.id ?? 'me',
      senderName: user?.name ?? 'Ben',
      content:    text,
      sentAt:     new Date().toISOString(),
      isRead:     false,
    };
    addIncomingMessage(optimistic);
    // Also add to local fallback list
    setLocalMsgs((prev) => [...prev, optimistic]);

    try {
      await signalRSend(conversationId, text);
    } catch {
      // Message was added optimistically; show silently
    } finally {
      setSending(false);
    }
  };

  // ── Render message ────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: MessageDto }) => {
    const isMine = item.senderId === user?.id || item.senderId === 'me';
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
            {item.content}
          </Text>
        </View>
        <Text style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}>
          {formatTime(item.sentAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.WHITE} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.TEXT} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? Colors.ACCENT : Colors.BORDER }]} />
            <Text style={styles.statusText}>{isConnected ? 'Çevrimiçi' : 'Bağlanıyor...'}</Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <ActivityIndicator color={Colors.PRIMARY} size="large" style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...displayMessages].reverse()}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={48} color={Colors.BORDER} />
                <Text style={styles.emptyText}>Henüz mesaj yok{'\n'}İlk mesajı siz gönderin!</Text>
              </View>
            }
          />
        )}

        {/* ── Input Row ────────────────────────────────────────────── */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Mesaj yazın..."
            placeholderTextColor={Colors.TEXT + '55'}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={Colors.WHITE} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={Colors.WHITE} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.BACKGROUND },
  flex:     { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: Colors.WHITE,
    borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName:   { fontSize: 16, fontWeight: '700', color: Colors.TEXT },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot:    { width: 7, height: 7, borderRadius: 3.5 },
  statusText:   { fontSize: 11, color: Colors.TEXT, opacity: 0.5 },
  headerRight:  { width: 40 },

  loader:      { flex: 1, marginTop: 60 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },

  // Message row
  msgRow: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  msgRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // Bubble
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleMine: {
    backgroundColor: Colors.PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  bubbleTextMine:   { color: Colors.WHITE, fontSize: 15, lineHeight: 21 },
  bubbleTextTheirs: { color: Colors.TEXT,  fontSize: 15, lineHeight: 21 },

  // Time
  msgTime:      { fontSize: 11, marginTop: 4, opacity: 0.5 },
  msgTimeMine:  { color: Colors.TEXT, textAlign: 'right' },
  msgTimeTheirs:{ color: Colors.TEXT, textAlign: 'left' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: {
    marginTop: 14, fontSize: 15,
    color: Colors.TEXT, opacity: 0.4,
    fontWeight: '500', textAlign: 'center', lineHeight: 22,
  },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.WHITE,
    borderTopWidth: 1, borderTopColor: Colors.BORDER,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44, maxHeight: 120,
    borderWidth: 1.5, borderColor: Colors.BORDER,
    borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: Colors.TEXT,
    backgroundColor: Colors.BACKGROUND,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.PRIMARY + '60',
    shadowOpacity: 0,
    elevation: 0,
  },
});
