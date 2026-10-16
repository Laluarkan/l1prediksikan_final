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

// SecureStore Android/iOS hanya mengizinkan karakter alfanumerik, '.', '-', dan '_' (tidak boleh '@')
const sanitizeKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
};

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
  const secureKey = sanitizeKey(key);
  try {
    const available = await checkAvailability();
    if (available) {
      await SecureStore.setItemAsync(secureKey, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`[SecureStore] Error saving key ${secureKey}, falling back to AsyncStorage:`, error);
    await AsyncStorage.setItem(key, value);
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  const secureKey = sanitizeKey(key);
  try {
    const available = await checkAvailability();
    if (available) {
      const val = await SecureStore.getItemAsync(secureKey);
      if (val !== null) return val;
    }
    // Fallback atau migrasi dari versi lama AsyncStorage
    const asyncVal = await AsyncStorage.getItem(key);
    if (asyncVal !== null) return asyncVal;
    return await AsyncStorage.getItem(secureKey);
  } catch (error) {
    console.warn(`[SecureStore] Error reading key ${secureKey}, falling back to AsyncStorage:`, error);
    return await AsyncStorage.getItem(key);
  }
};

export const deleteSecureItem = async (key: string): Promise<void> => {
  const secureKey = sanitizeKey(key);
  try {
    const available = await checkAvailability();
    if (available) {
      await SecureStore.deleteItemAsync(secureKey);
    }
  } catch {
    // Ignore error
  }
  try {
    await AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(secureKey);
  } catch {
    // Ignore error
  }
};
