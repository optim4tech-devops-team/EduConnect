import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  getItem: (key: string): Promise<string | null> =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.getItem(key))
      : SecureStore.getItemAsync(key),

  setItem: (key: string, value: string): Promise<void> =>
    Platform.OS === 'web'
      ? (localStorage.setItem(key, value), Promise.resolve())
      : SecureStore.setItemAsync(key, value),

  deleteItem: (key: string): Promise<void> =>
    Platform.OS === 'web'
      ? (localStorage.removeItem(key), Promise.resolve())
      : SecureStore.deleteItemAsync(key),
};
