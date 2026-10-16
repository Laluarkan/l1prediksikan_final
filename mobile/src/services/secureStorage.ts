import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Storage Service Terenkripsi (Android Keystore / iOS Keychain)
 * 
 * Mengamankan token autentikasi (JWT Access & Refresh Token) menggunakan
 * chip hardware keamanan bawaan perangkat (Secure Enclave / Keystore).
 * Jika berada di platform web atau runtime yang tidak mendukung hardware encryption,
 * fungsi otomatis fallback ke AsyncStorage secara aman tanpa crash.
 */

let isSecureStoreAvailable: boolean | null = null;

const checkAvailability = async (): Promise<boolean> => {
  if (isSecureStoreAvailable !== null) return isSecureStoreAvailable;
  if (Platform.OS === 'web') {
    isSecureStoreAvailable = false;
    return false;
  }
  try {
    isSecureStoreAvailable = await SecureStore.isAvailableAsync();
    return isSecureStoreAvailable;
  } catch {
    isSecureStoreAvailable = false;
    return false;
  }
};

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    const available = await checkAvailability();
    if (available) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`[SecureStore] Error saving key ${key}, falling back to AsyncStorage:`, error);
    await AsyncStorage.setItem(key, value);
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    const available = await checkAvailability();
    if (available) {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) return val;
    }
    // Fallback atau cek AsyncStorage (migrasi dari versi lama)
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[SecureStore] Error reading key ${key}, falling back to AsyncStorage:`, error);
    return await AsyncStorage.getItem(key);
  }
};

export const deleteSecureItem = async (key: string): Promise<void> => {
  try {
    const available = await checkAvailability();
    if (available) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Ignore error
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore error
  }
};
