import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, AuthResponse, UserDto, LookupResponse } from '@/api/client';
import { normalizePhoneNumber } from '@/utils/phone';

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
        SecureStore.setItemAsync('accessToken', data.accessToken),
        SecureStore.setItemAsync('refreshToken', data.refreshToken),
        SecureStore.setItemAsync('user', JSON.stringify(user)),
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
