import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, UserDto, LookupResponse } from '@/api/client';

interface FlatAuthResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  schoolId: string;
}

function mapToUserDto(flat: FlatAuthResponse, identifier: string): UserDto {
  return {
    id: flat.userId,
    name: flat.fullName,
    role: flat.role as UserDto['role'],
    avatarUrl: flat.avatarUrl,
    schoolId: flat.schoolId,
    email: identifier,
  };
}

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  schoolInfo: LookupResponse | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  lookup: (identifier: string) => Promise<LookupResponse>;
  sendOtp: (identifier: string) => Promise<void>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  schoolInfo: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const [accessToken, userJson] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('user'),
      ]);

      if (accessToken && userJson) {
        const user: UserDto = JSON.parse(userJson);
        set({ user, accessToken, isLoading: false, isInitialized: true });
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
      set({ isLoading: false, isInitialized: true, user: null, accessToken: null });
    }
  },

  lookup: async (identifier: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.lookup(identifier);
      set({ schoolInfo: data, isLoading: false });
      return data;
    } catch {
      set({ isLoading: false, error: 'Kullanıcı bulunamadı.' });
      throw new Error('Kullanıcı bulunamadı.');
    }
  },

  sendOtp: async (identifier: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.sendOtp(identifier);
      set({ isLoading: false });
    } catch {
      set({ isLoading: false, error: 'OTP gönderilemedi.' });
      throw new Error('OTP gönderilemedi.');
    }
  },

  verifyOtp: async (identifier: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await authApi.verifyOtp(identifier, code) as { data: any };
      const flat = data as FlatAuthResponse;
      const user = mapToUserDto(flat, identifier);

      await Promise.all([
        SecureStore.setItemAsync('accessToken', flat.accessToken),
        SecureStore.setItemAsync('refreshToken', flat.refreshToken),
        SecureStore.setItemAsync('user', JSON.stringify(user)),
      ]);

      set({ user, accessToken: flat.accessToken, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Geçersiz veya süresi dolmuş kod.' });
      throw new Error('Geçersiz veya süresi dolmuş kod.');
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('refreshToken'),
        SecureStore.deleteItemAsync('user'),
      ]);
      set({ user: null, accessToken: null, schoolInfo: null });
    }
  },

  setTokens: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('accessToken', access);
    await SecureStore.setItemAsync('refreshToken', refresh);
    set({ accessToken: access });
  },

  clearError: () => set({ error: null }),
}));
