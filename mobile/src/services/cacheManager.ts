import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

// Kunci penting yang TIDAK boleh dihapus saat membersihkan cache (sesi login & preferensi penting)
const PRESERVED_STORAGE_KEYS = new Set([
  '@prediksikan_session_user',
  '@prediksikan_token_encrypted',
  '@prediksikan_has_seen_onboarding',
  '@prediksikan_registered_users',
  'theme_preference',
]);

/**
 * Membersihkan seluruh cache lokal aplikasi:
 * 1. Menghapus seluruh data sementara di AsyncStorage (fixtures, standings, parlay, history, temp data)
 *    namun tetap mempertahankan sesi login pengguna dan preferensi tema.
 * 2. Membersihkan cache memori dan disk gambar (React Native Image cache) untuk klub & logo.
 * 3. Mengembalikan jumlah item storage yang dibersihkan.
 */
export async function clearAllAppCache(): Promise<{ clearedKeysCount: number }> {
  let clearedCount = 0;
  try {
    // 1. Bersihkan AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter((k) => !PRESERVED_STORAGE_KEYS.has(k));

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      clearedCount = keysToRemove.length;
    }

    // 2. Bersihkan Memory & Disk Image Cache (Native Android & iOS)
    try {
      const imageModule = Image as any;
      if (typeof imageModule.clearMemoryCache === 'function') {
        imageModule.clearMemoryCache();
      }
      if (typeof imageModule.clearDiskCache === 'function') {
        await imageModule.clearDiskCache();
      }
    } catch (imgErr) {
      console.warn('Image cache clean warning:', imgErr);
    }
  } catch (err) {
    console.error('Error in clearAllAppCache:', err);
    throw err;
  }

  return { clearedKeysCount: clearedCount };
}
