import * as WebBrowser from 'expo-web-browser';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { syncGoogleAccount, UserSession } from './auth';

// Menutup sesi auth browser jika selesai
WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CONFIG = {
  // Android Client ID (dari client L1prediksikan Mobile)
  androidClientId: '1074921761810-iaubtmm76ghmv9dq3vhmeegfi80co25a.apps.googleusercontent.com',
  // Web Client ID (dari client Web application l1 Prediksi-kan _ final)
  webClientId: '1074921761810-lmvmtrvsp61fs7rikp1tuj023rgg2lpe.apps.googleusercontent.com',
  // Package name Android
  androidPackageName: 'id.prediksikan.app',
};

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
}

export interface GoogleSignInResult {
  success: boolean;
  cancelled?: boolean;
  email?: string;
  name?: string;
  photo?: string;
  message?: string;
  session?: UserSession;
  requiresFallback?: boolean;
}

let isConfigured = false;

/**
 * Memeriksa apakah aplikasi sedang berjalan di dalam lingkungan Expo Go (local development).
 */
export const isRunningInExpoGo = (): boolean => {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as any).appOwnership === 'expo' ||
    Boolean((Constants as any).expoVersion)
  );
};

/**
 * Memeriksa apakah modul native biner 'RNGoogleSignin' tersedia pada runtime saat ini.
 * Sangat penting untuk mencegah Invariant Violation crash saat dijalankan di Expo Go.
 */
export const isNativeGoogleSignInAvailable = (): boolean => {
  // Jika sedang berjalan di Expo Go, modul biner native pasti tidak tersedia
  if (isRunningInExpoGo()) {
    return false;
  }

  try {
    const hasTurbo = TurboModuleRegistry?.get ? TurboModuleRegistry.get('RNGoogleSignin') != null : false;
    const hasBridge = NativeModules?.RNGoogleSignin != null;
    return hasTurbo || hasBridge;
  } catch (_) {
    return false;
  }
};

/**
 * Inisialisasi konfigurasi modul native Google Sign-In dengan aman.
 */
export const configureNativeGoogleSignIn = () => {
  if (isConfigured) return;
  if (!isNativeGoogleSignInAvailable()) return;

  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: GOOGLE_CONFIG.webClientId,
      offlineAccess: false,
    });
    isConfigured = true;
  } catch (err) {
    console.warn('Native Google Sign-In tidak dapat diinisialisasi:', err);
  }
};

/**
 * Autentikasi Cepat dengan Google Sign-In Native (Google Play Services)
 * Memunculkan One-Tap Account Picker bawaan Android tanpa perlu mengetik email
 */
export const signInWithNativeGoogle = async (): Promise<GoogleSignInResult> => {
  // Cek apakah modul native tersedia
  if (!isNativeGoogleSignInAvailable()) {
    return {
      success: false,
      requiresFallback: true,
      message: 'Native Google Sign-In memerlukan build standalone Android.',
    };
  }

  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');

    configureNativeGoogleSignIn();

    // Pastikan Google Play Services tersedia dan mutakhir di HP Android
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign out sesi lokal sebelumnya agar Android SELALU menampilkan dialog pemilih akun (Account Picker)
    try {
      await GoogleSignin.signOut();
    } catch (_) {
      // Abaikan jika belum ada sesi aktif
    }

    // Panggil dialog pemilih akun Google bawaan Android (Account Picker Bottom Sheet)
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      return {
        success: false,
        cancelled: true,
        message: 'Pemilihan akun Google dibatalkan.',
      };
    }

    if (response.type === 'success' && response.data?.user) {
      const gUser = response.data.user;
      const email = gUser.email;
      const name = gUser.name || email.split('@')[0];
      const photo = gUser.photo || undefined;

      // Sinkronkan ke database backend L1Prediksikan
      const syncResult = await syncGoogleAccount(name, email, photo);

      if (syncResult.success && syncResult.session) {
        return {
          success: true,
          email,
          name,
          photo,
          session: syncResult.session,
          message: 'Berhasil masuk dengan Akun Google!',
        };
      } else {
        return {
          success: false,
          message: syncResult.message || 'Gagal menyinkronkan data akun ke server.',
        };
      }
    }

    return {
      success: false,
      message: 'Tidak ada data akun Google yang diterima.',
    };
  } catch (error: any) {
    let isCancelled = false;
    let isPlayServicesMissing = false;

    try {
      const { statusCodes } = require('@react-native-google-signin/google-signin');
      if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
        isCancelled = true;
      } else if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        isPlayServicesMissing = true;
      }
    } catch (_) {}

    if (isCancelled) {
      return { success: false, cancelled: true, message: 'Pemilihan akun dibatalkan.' };
    }

    if (isPlayServicesMissing) {
      return {
        success: false,
        requiresFallback: true,
        message: 'Google Play Services tidak tersedia di perangkat ini.',
      };
    }

    console.error('Native Google Sign-In Error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menghubungkan ke Akun Google.',
    };
  }
};

/**
 * Mengambil profil data user dari Google UserInfo API menggunakan access token OAuth (fallback)
 */
export const fetchGoogleUserProfile = async (accessToken: string): Promise<GoogleUserInfo | null> => {
  try {
    const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        email: data.email,
        name: data.name || data.email.split('@')[0],
        picture: data.picture,
        verified_email: data.verified_email,
      };
    }
    return null;
  } catch (error) {
    console.error('Gagal mengambil data user Google:', error);
    return null;
  }
};
