import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, UserDto } from '@/api/client';

// Shape returned by the backend login/refresh endpoints (flat, not nested)
interface FlatAuthResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  schoolId: string;
}

function mapToUserDto(flat: FlatAuthResponse, email: string): UserDto {
  return {
    id: flat.userId,
    name: flat.fullName,
    role: flat.role as UserDto['role'],
    avatarUrl: flat.avatarUrl,
    schoolId: flat.schoolId,
    email,
  };
}

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
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

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (authApi.login({ email, password }) as Promise<{ data: any }>);

      const flat = data as FlatAuthResponse;
      const user = mapToUserDto(flat, email);

      await Promise.all([
        SecureStore.setItemAsync('accessToken', flat.accessToken),
        SecureStore.setItemAsync('refreshToken', flat.refreshToken),
        SecureStore.setItemAsync('user', JSON.stringify(user)),
      ]);

      set({ user, accessToken: flat.accessToken, isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore API error on logout
    } finally {
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('refreshToken'),
        SecureStore.deleteItemAsync('user'),
      ]);
      set({ user: null, accessToken: null });
    }
  },

  setTokens: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('accessToken', access);
    await SecureStore.setItemAsync('refreshToken', refresh);
    set({ accessToken: access });
  },

  clearError: () => set({ error: null }),
}));
