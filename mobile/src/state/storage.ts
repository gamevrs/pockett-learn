import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createJSONStorage } from 'zustand/middleware';

/** Where every persisted store keeps its JSON (settings, progress, the cached catalog, the inbox). */
export const appStorage = createJSONStorage(() => AsyncStorage);

/**
 * Supabase's session storage: the Keychain on iOS, the Keystore-backed store on Android. A session is a few KB
 * and SecureStore warns past 2 KB a value, so it is split into numbered chunks.
 */
const CHUNK = 1800;

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const old = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    for (let i = n; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.setItemAsync(`${key}.n`, String(n));
  },
  async removeItem(key: string): Promise<void> {
    const old = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    for (let i = 0; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};
