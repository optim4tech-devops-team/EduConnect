import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { storage } from '@/utils/storage';
import { MessageDto, NotificationDto } from '../api/client';

const HUB_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(
  '/api',
  '/hubs/chat'
);

interface UseSignalROptions {
  onReceiveMessage?: (message: MessageDto) => void;
  onNewNotification?: (notification: NotificationDto) => void;
  onTyping?: (conversationId: string, senderName: string) => void;
}

interface UseSignalRReturn {
  isConnected: boolean;
  sendMessage: (conversationId: string, content: string, clientMessageId?: string) => Promise<void>;
  sendTyping: (conversationId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useSignalR(options: UseSignalROptions = {}): UseSignalRReturn {
  const { onReceiveMessage, onNewNotification, onTyping } = options;
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs so callbacks are always current without re-connecting
  const onReceiveMessageRef = useRef(onReceiveMessage);
  const onNewNotificationRef = useRef(onNewNotification);
  const onTypingRef = useRef(onTyping);
  useEffect(() => { onReceiveMessageRef.current = onReceiveMessage; }, [onReceiveMessage]);
  useEffect(() => { onNewNotificationRef.current = onNewNotification; }, [onNewNotification]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      try {
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(HUB_URL, {
            accessTokenFactory: async () => {
              const t = await storage.getItem('accessToken');
              return t ?? '';
            },
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(signalR.LogLevel.None)
          .build();

        connection.on('ReceiveMessage', (message: MessageDto) => {
          if (!isMounted) return;
          // Normalise createdAt → sentAt
          const msg = {
            ...message,
            senderLabel: message.senderLabel ?? message.senderName,
            sentAt: message.sentAt ?? (message as any).createdAt ?? new Date().toISOString(),
          };
          onReceiveMessageRef.current?.(msg);
        });

        connection.on('NewNotification', (notification: NotificationDto) => {
          if (isMounted) onNewNotificationRef.current?.(notification);
        });

        connection.on('UserTyping', (payload: { conversationId: string; senderName?: string; senderLabel?: string } | string, senderName?: string) => {
          if (!isMounted) return;
          if (typeof payload === 'string') {
            onTypingRef.current?.(payload, senderName ?? '');
            return;
          }
          onTypingRef.current?.(payload.conversationId, payload.senderLabel ?? payload.senderName ?? senderName ?? '');
        });

        connection.onreconnecting(() => {
          if (isMounted) setIsConnected(false);
        });

        connection.onreconnected(() => {
          if (isMounted) setIsConnected(true);
        });

        connection.onclose(() => {
          if (isMounted) setIsConnected(false);
        });

        await connection.start();

        if (isMounted) {
          connectionRef.current = connection;
          setIsConnected(true);
        } else {
          await connection.stop();
        }
      } catch (err) {
        if (isMounted) {
          setIsConnected(false);
          // Retry after 5 seconds on initial connection failure
          setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, content: string, clientMessageId?: string) => {
      const connection = connectionRef.current;
      if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR bağlantısı yok.');
      }
      await connection.invoke('SendMessage', conversationId, content, clientMessageId ?? null);
    },
    []
  );

  const sendTyping = useCallback(async (conversationId: string) => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
    await connection.invoke('SendTyping', conversationId);
  }, []);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { isConnected, sendMessage, sendTyping, disconnect };
}
