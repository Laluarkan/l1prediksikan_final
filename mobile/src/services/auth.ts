import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSession {
  username?: string;
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
  username: string;
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
const BACKEND_BASE_URL = 'https://l1prediksi-api.onrender.com/api';
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
 * Validasi Live: Memeriksa apakah email sudah terdaftar di database server.
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `${BACKEND_BASE_URL}/check-email/?email=${encodeURIComponent(cleanEmail)}`,
      {
        method: 'GET',
        headers: {
          'X-Sync-Secret': SYNC_SECRET_KEY,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data.exists === true;
    }
  } catch (err) {
    // Abaikan jika network timeout / offline
  }

  // Fallback: periksa daftar user di cache lokal jika server tidak merespons
  try {
    const localUsers = await getRegisteredUsers();
    return localUsers.some((u) => u.email.toLowerCase() === cleanEmail);
  } catch {
    return false;
  }
};

/**
 * Mendaftarkan akun baru ke backend Django & Database Neon PostgreSQL.
 * Input: username, email, password (terenkripsi di database server).
 */
export const registerAccount = async (
  username: string,
  email: string,
  password: string
): Promise<AuthResult> => {
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/sync-user/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': SYNC_SECRET_KEY,
      },
      body: JSON.stringify({
        username: cleanUsername,
        email: cleanEmail,
        password: password,
        name: cleanUsername,
        is_register: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.detail || 'Pendaftaran gagal. Silakan coba lagi.',
      };
    }

    const session: UserSession = {
      username: data.username || cleanUsername,
      name: data.username || cleanUsername,
      email: cleanEmail,
      isGuest: false,
      userId: data.user_id,
      isStaff: data.is_staff ?? false,
      accessToken: data.access,
      refreshToken: data.refresh,
      provider: 'email',
    };

    await saveUserSession(session);

    // Simpan ke cache lokal
    try {
      const existingUsers = await getRegisteredUsers();
      const updatedList = [
        ...existingUsers.filter((u) => u.email.toLowerCase() !== cleanEmail),
        {
          username: cleanUsername,
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

    return {
      success: true,
      message: 'Akun Anda berhasil didaftarkan!',
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
 * Masuk ke akun menggunakan Alamat Email dan Password.
 */
export const loginAccount = async (
  email: string,
  password?: string
): Promise<AuthResult> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const localUsers = await getRegisteredUsers();
    const matchedUser = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const fallbackUsername = matchedUser?.username || cleanEmail.split('@')[0];

    const response = await fetch(`${BACKEND_BASE_URL}/sync-user/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': SYNC_SECRET_KEY,
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
        name: fallbackUsername,
        username: fallbackUsername,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.detail || 'Email atau password tidak dapat diverifikasi oleh server.',
      };
    }

    const session: UserSession = {
      username: data.username || fallbackUsername,
      name: data.username || fallbackUsername,
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
 * Sesuai ketentuan: jika login menggunakan akun google, password TIDAK disertakan.
 */
export const syncGoogleAccount = async (
  name: string,
  email: string
): Promise<AuthResult> => {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/sync-user/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': SYNC_SECRET_KEY,
      },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        // Password TIDAK disertakan
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
      username: data.username || cleanEmail.split('@')[0],
      name: cleanName || cleanEmail.split('@')[0],
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
