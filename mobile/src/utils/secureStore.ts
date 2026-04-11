import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();

function canUseWebStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getItemAsync(key: string) {
  if (Platform.OS === 'web') {
    if (canUseWebStorage()) {
      return window.localStorage.getItem(key);
    }

    return memoryStore.get(key) ?? null;
  }

  return ExpoSecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (canUseWebStorage()) {
      window.localStorage.setItem(key, value);
      return;
    }

    memoryStore.set(key, value);
    return;
  }

  await ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string) {
  if (Platform.OS === 'web') {
    if (canUseWebStorage()) {
      window.localStorage.removeItem(key);
      return;
    }

    memoryStore.delete(key);
    return;
  }

  await ExpoSecureStore.deleteItemAsync(key);
}
