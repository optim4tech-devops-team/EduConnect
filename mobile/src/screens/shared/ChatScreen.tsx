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
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Colors from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useSignalR } from '../../hooks/useSignalR';
import { MessageDto } from '../../api/client';

// ─── Typing dots animation ────────────────────────────────────────────────────
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4, gap: 2 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 4, height: 4, borderRadius: 2,
            backgroundColor: Colors.PRIMARY,
            opacity: dot,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const { conversationId = '', otherUserName = '' } = useLocalSearchParams<{ conversationId: string; otherUserName: string }>();

  const { user }           = useAuthStore();
  const { messages: allMessages, fetchMessages, addIncomingMessage, markRead, setActiveConversation } = useMessageStore();
  const flatListRef        = useRef<FlatList<MessageDto>>(null);

  const [inputText,   setInputText]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [isTyping,    setIsTyping]    = useState(false); // karşı taraf yazıyor mu
  const [typingLabel, setTypingLabel] = useState('');

  // typing göstergesi 3 saniye sonra otomatik kapanır
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // kendi typing olaylarını debounce et (her karakter için istek gitmesin)
  const myTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── SignalR ──────────────────────────────────────────────────────────────
  const { isConnected, sendMessage: signalRSend, sendTyping } = useSignalR({
    onReceiveMessage: useCallback(
      (msg: MessageDto) => {
        if (msg.conversationId === conversationId) {
          addIncomingMessage(msg);
          // Karşı taraf mesaj gönderince "yazıyor" göstergesini kapat
          setIsTyping(false);
          setTypingLabel('');
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        }
      },
      [conversationId, addIncomingMessage],
    ),
    onTyping: useCallback(
      (convId: string, senderName: string) => {
        if (convId !== conversationId) return;
        const nextLabel = senderName || String(otherUserName || 'Karşı taraf');
        if (nextLabel === user?.name) return;
        setTypingLabel(nextLabel);
        setIsTyping(true);
        // 3 saniye sonra otomatik kapat
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingLabel('');
        }, 3000);
      },
      [conversationId, otherUserName, user?.name],
    ),
  });

  // cleanup timers
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
      setActiveConversation(null);
    };
  }, [setActiveConversation]);

  // ── Load history ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchMessages(conversationId);
      } finally {
        setLoading(false);
      }
    };
    setActiveConversation(conversationId);
    load();
    markRead(conversationId);
  }, [conversationId, fetchMessages, markRead, setActiveConversation]);

  const storeMessages = allMessages[conversationId] ?? [];
  const displayMessages: MessageDto[] = storeMessages;

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);
    const clientMessageId = `client-${Date.now()}`;

    // Optimistic message
    const optimistic: MessageDto = {
      id: clientMessageId,
      conversationId,
      senderId:   user?.id ?? 'me',
      senderName: user?.name ?? 'Ben',
      senderRole: user?.role ?? undefined,
      senderLabel: user?.role === 'Teacher' ? 'Öğretmen' : user?.role === 'Parent' ? 'Veli' : user?.name ?? 'Ben',
      clientMessageId,
      content:    text,
      sentAt:     new Date().toISOString(),
      isRead:     false,
    };
    addIncomingMessage(optimistic);

    try {
      await signalRSend(conversationId, text, clientMessageId);
      setIsTyping(false);
      setTypingLabel('');
    } catch (error) {
      Alert.alert(
        'Mesaj gönderilemedi',
        error instanceof Error ? error.message : 'Bağlantıyı kontrol edip tekrar deneyin.'
      );
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
            {isTyping ? (
              <>
                <TypingDots />
                <Text style={[styles.statusText, { color: Colors.PRIMARY }]}>
                  {typingLabel || String(otherUserName || 'Karşı taraf')} yazıyor...
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? Colors.SUCCESS : Colors.BORDER }]} />
                <Text style={styles.statusText}>{isConnected ? 'Çevrimiçi' : 'Bağlanıyor...'}</Text>
              </>
            )}
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
            onChangeText={(text) => {
              setInputText(text);
              // Debounce: her 2 saniyede bir "SendTyping" gönder
              if (myTypingTimerRef.current) return;
              sendTyping(conversationId).catch(() => {});
              myTypingTimerRef.current = setTimeout(() => {
                myTypingTimerRef.current = null;
              }, 2000);
            }}
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
