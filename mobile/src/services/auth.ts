import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSession {
  name: string;
  email: string;
  isGuest: boolean;
  userId?: number;
  isStaff?: boolean;
  accessToken?: string;
  refreshToken?: string;
  avatarUrl?: string;
  provider?: 'email' | 'google' | 'guest';
}

export interface UserAccount {
  name: string;
  email: string;
  userId?: number;
  createdAt: string;
}

const STORAGE_KEYS = {
  HAS_SEEN_ONBOARDING: '@prediksikan_has_seen_onboarding',
  USER_SESSION: '@prediksikan_user_session',
  REGISTERED_USERS: '@prediksikan_registered_users',
};

// URL API Sinkronisasi Backend Django (Render + Neon PostgreSQL)
const BACKEND_SYNC_URL = 'https://l1prediksi-api.onrender.com/api/sync-user/';
const SYNC_SECRET_KEY = 'Laluarkan123@';

// ================= ONBOARDING STATE =================
export const getHasSeenOnboarding = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
    return val === 'true';
  } catch {
    return false;
  }
};

export const setHasSeenOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
  } catch (err) {
    console.error('Failed to save onboarding state:', err);
  }
};

export const resetOnboardingState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
  } catch (err) {
    console.error('Failed to reset onboarding state:', err);
  }
};

// ================= USER SESSION =================
export const getUserSession = async (): Promise<UserSession | null> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const saveUserSession = async (session: UserSession): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
};

export const clearUserSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  } catch (err) {
    console.error('Failed to clear user session:', err);
  }
};

// ================= REGISTER & LOGIN LOGIC =================
export const getRegisteredUsers = async (): Promise<UserAccount[]> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
};

export interface AuthResult {
  success: boolean;
  message?: string;
  session?: UserSession;
}

/**
 * Mendaftarkan akun baru:
 * Mengirim data Nama Lengkap & Email ke backend Django & Database Neon PostgreSQL.
 * Sesuai arsitektur web L1 Prediksi-Kan tanpa password rumit.
 */
export const registerAccount = async (
  name: string,
  email: string
): Promise<AuthResult> => {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Kirim request registrasi langsung ke backend Django (Render)
    const response = await fetch(BACKEND_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': SYNC_SECRET_KEY,
      },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.detail || 'Gagal mendaftarkan akun ke server. Silakan coba lagi.',
      };
    }

    // 2. Format sesi login dari data database
    const session: UserSession = {
      name: cleanName,
      email: cleanEmail,
      isGuest: false,
      userId: data.user_id,
      isStaff: data.is_staff ?? false,
      accessToken: data.access,
      refreshToken: data.refresh,
      provider: 'email',
    };

    // 3. Simpan sesi aktif ke AsyncStorage
    await saveUserSession(session);

    // 4. Update cache daftar user lokal
    try {
      const existingUsers = await getRegisteredUsers();
      const updatedList = [
        ...existingUsers.filter((u) => u.email.toLowerCase() !== cleanEmail),
        {
          name: cleanName,
          email: cleanEmail,
          userId: data.user_id,
          createdAt: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(
        STORAGE_KEYS.REGISTERED_USERS,
        JSON.stringify(updatedList)
      );
    } catch (e) {
      console.warn('Gagal mengupdate cache user lokal:', e);
    }

    const message = response.status === 201
      ? 'Akun berhasil didaftarkan dan tersimpan di database server!'
      : 'Akun Anda sudah terdaftar dan berhasil disinkronisasi!';

    return {
      success: true,
      message,
      session,
    };
  } catch (error) {
    console.error('Error during registration to backend:', error);
    return {
      success: false,
      message: 'Tidak dapat terhubung ke server database. Periksa koneksi internet Anda.',
    };
  }
};

/**
 * Masuk ke akun menggunakan Alamat Email yang terdaftar di database server.
 */
export const loginAccount = async (email: string): Promise<AuthResult> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // Cek apakah ada nama tersimpan di cache lokal
    const localUsers = await getRegisteredUsers();
    const matchedUser = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const fallbackName = matchedUser?.name || cleanEmail.split('@')[0];

    // Sinkronisasi/Verifikasi dengan database backend
    const response = await fetch(BACKEND_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': SYNC_SECRET_KEY,
      },
      body: JSON.stringify({
        email: cleanEmail,
        name: fallbackName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.detail || 'Email tidak dapat diverifikasi oleh server.',
      };
    }

    const session: UserSession = {
      name: fallbackName,
      email: cleanEmail,
      isGuest: false,
      userId: data.user_id,
      isStaff: data.is_staff ?? false,
      accessToken: data.access,
      refreshToken: data.refresh,
      provider: 'email',
    };

    await saveUserSession(session);

    return {
      success: true,
      message: 'Berhasil masuk ke akun!',
      session,
    };
  } catch (error) {
    console.error('Error during login to backend:', error);
    return {
      success: false,
      message: 'Gagal menghubungi server. Periksa jaringan internet Anda.',
    };
  }
};

/**
 * Autentikasi Cepat dengan Google (Gmail)
 * Terhubung langsung ke database backend via SyncUserView
 */
export const syncGoogleAccount = async (
  name: string,
  email: string
): Promise<AuthResult> => {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await fetch(BACKEND_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': SYNC_SECRET_KEY,
      },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Sinkronisasi akun Google ke server gagal.',
      };
    }

    const session: UserSession = {
      name: cleanName,
      email: cleanEmail,
      isGuest: false,
      userId: data.user_id,
      isStaff: data.is_staff ?? false,
      accessToken: data.access,
      refreshToken: data.refresh,
      provider: 'google',
    };

    await saveUserSession(session);

    return {
      success: true,
      message: 'Berhasil masuk dengan Akun Google!',
      session,
    };
  } catch (error) {
    console.error('Error during Google sync:', error);
    return {
      success: false,
      message: 'Gagal menghubungkan akun Google ke database.',
    };
  }
};
