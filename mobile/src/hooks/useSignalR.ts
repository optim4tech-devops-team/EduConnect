import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import { MessageDto, NotificationDto } from '../api/client';

const HUB_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(
  '/api',
  '/hubs/chat'
);

interface UseSignalROptions {
  onReceiveMessage?: (message: MessageDto) => void;
  onNewNotification?: (notification: NotificationDto) => void;
}

interface UseSignalRReturn {
  isConnected: boolean;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useSignalR(options: UseSignalROptions = {}): UseSignalRReturn {
  const { onReceiveMessage, onNewNotification } = options;
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(HUB_URL, {
            accessTokenFactory: async () => {
              const t = await SecureStore.getItemAsync('accessToken');
              return t ?? '';
            },
            transport: signalR.HttpTransportType.WebSockets,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        connection.on('ReceiveMessage', (message: MessageDto) => {
          if (isMounted && onReceiveMessage) {
            onReceiveMessage(message);
          }
        });

        connection.on('NewNotification', (notification: NotificationDto) => {
          if (isMounted && onNewNotification) {
            onNewNotification(notification);
          }
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
    async (conversationId: string, content: string) => {
      const connection = connectionRef.current;
      if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR bağlantısı yok.');
      }
      await connection.invoke('SendMessage', conversationId, content);
    },
    []
  );

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { isConnected, sendMessage, disconnect };
}
