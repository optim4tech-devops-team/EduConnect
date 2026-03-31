import { create } from 'zustand';
import { messageApi, ConversationDto, MessageDto } from '../api/client';

interface MessageStore {
  conversations: ConversationDto[];
  messages: Record<string, MessageDto[]>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  activeConversationId: string | null;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  sendMediaMessage: (conversationId: string, formData: FormData) => Promise<void>;
  addIncomingMessage: (message: MessageDto) => void;
  markRead: (conversationId: string) => Promise<void>;
  startConversation: (participantId: string) => Promise<ConversationDto>;
  setActiveConversation: (id: string | null) => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  conversations: [],
  messages: {},
  isLoading: false,
  isSending: false,
  error: null,
  activeConversationId: null,

  fetchConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await messageApi.conversations();
      set({ conversations: data, isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Konuşmalar yüklenemedi.';
      set({ isLoading: false, error: message });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await messageApi.messages(conversationId);
      set((state) => ({
        messages: { ...state.messages, [conversationId]: data },
        isLoading: false,
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Mesajlar yüklenemedi.';
      set({ isLoading: false, error: message });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    // Optimistic: handled via SignalR broadcast
    try {
      set({ isSending: true });
      // The actual send goes through SignalR hub; if REST fallback needed:
      // await apiClient.post(`/messages/conversations/${conversationId}`, { content });
      set({ isSending: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Mesaj gönderilemedi.';
      set({ isSending: false, error: message });
      throw new Error(message);
    }
  },

  sendMediaMessage: async (conversationId: string, formData: FormData) => {
    try {
      set({ isSending: true });
      const { data } = await messageApi.sendMedia(conversationId, formData);
      set((state) => ({
        isSending: false,
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] ?? []), data],
        },
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Medya gönderilemedi.';
      set({ isSending: false, error: message });
      throw new Error(message);
    }
  },

  addIncomingMessage: (message: MessageDto) => {
    const conversationId = message.conversationId;
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      // Avoid duplicates
      if (existing.some((m) => m.id === message.id)) return state;
      const updatedConversations = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: message.content,
              lastMessageAt: message.sentAt,
              unreadCount:
                state.activeConversationId === conversationId
                  ? c.unreadCount
                  : c.unreadCount + 1,
            }
          : c
      );
      return {
        messages: { ...state.messages, [conversationId]: [...existing, message] },
        conversations: updatedConversations,
      };
    });
  },

  markRead: async (conversationId: string) => {
    try {
      await messageApi.markRead(conversationId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch {
      // silent
    }
  },

  startConversation: async (participantId: string) => {
    try {
      const { data } = await messageApi.startConversation(participantId);
      set((state) => {
        const exists = state.conversations.find((c) => c.id === data.id);
        if (exists) return state;
        return { conversations: [data, ...state.conversations] };
      });
      return data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Konuşma başlatılamadı.';
      throw new Error(message);
    }
  },

  setActiveConversation: (id: string | null) => set({ activeConversationId: id }),

  clearError: () => set({ error: null }),
}));
