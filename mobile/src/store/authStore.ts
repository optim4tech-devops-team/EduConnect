import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authApi, AuthResponse, UserDto, LookupResponse } from '@/api/client';
import { normalizePhoneNumber } from '@/utils/phone';

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return storage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return storage.setItem(key, value);
  },
  deleteItem: async (key: string) => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    return storage.deleteItem(key);
  },
};

function mapToUserDto(flat: AuthResponse, phoneNumber: string): UserDto {
  return {
    id: flat.userId,
    name: flat.fullName,
    role: flat.role as UserDto['role'],
    avatarUrl: flat.avatarUrl,
    schoolId: flat.schoolId,
    email: flat.email,
    phone: flat.phone ?? phoneNumber,
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
        storage.getItem('accessToken'),
        storage.getItem('user'),
      ]);

      if (accessToken && userJson) {
        const user: UserDto = JSON.parse(userJson);
        set({ user, accessToken, isLoading: false, isInitialized: true });
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch {
      await storage.deleteItem('accessToken');
      await storage.deleteItem('refreshToken');
      await storage.deleteItem('user');
      set({ isLoading: false, isInitialized: true, user: null, accessToken: null });
    }
  },

  lookup: async (phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const { data } = await authApi.lookup(normalizedPhone);
      set({ schoolInfo: data, isLoading: false });
      return data;
    } catch {
      set({ isLoading: false, error: 'Telefon numarasi bulunamadi.' });
      throw new Error('Telefon numarasi bulunamadi.');
    }
  },

  sendOtp: async (phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      await authApi.sendOtp(normalizedPhone);
      set({ isLoading: false });
    } catch {
      set({ isLoading: false, error: 'SMS dogrulama kodu gonderilemedi.' });
      throw new Error('SMS dogrulama kodu gonderilemedi.');
    }
  },

  verifyOtp: async (phoneNumber: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const { data } = await authApi.verifyOtp(normalizedPhone, code);
      const user = mapToUserDto(data, normalizedPhone);

      await Promise.all([
        storage.setItem('accessToken', data.accessToken),
        storage.setItem('refreshToken', data.refreshToken),
        storage.setItem('user', JSON.stringify(user)),
      ]);

      set({ user, accessToken: data.accessToken, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Gecersiz veya suresi dolmus kod.' });
      throw new Error('Gecersiz veya suresi dolmus kod.');
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      await Promise.all([
        storage.deleteItem('accessToken'),
        storage.deleteItem('refreshToken'),
        storage.deleteItem('user'),
      ]);
      set({ user: null, accessToken: null, schoolInfo: null });
    }
  },

  setTokens: async (access: string, refresh: string) => {
    await storage.setItem('accessToken', access);
    await storage.setItem('refreshToken', refresh);
    set({ accessToken: access });
  },

  clearError: () => set({ error: null }),
}));
