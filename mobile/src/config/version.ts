import Constants from 'expo-constants';

/**
 * Konfigurasi Versi Aplikasi Terpusat (Best Practice)
 *
 * Mengambil informasi versi secara dinamis dari runtime Expo Constants (app.json),
 * sehingga ketika app.json di-update untuk rilis baru ke Google Play / App Store,
 * seluruh tampilan aplikasi (Sidebar, Menu Pengaturan, Info Aplikasi) otomatis ter-update.
 */
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const APP_BUILD_NUMBER =
  Constants.expoConfig?.android?.versionCode ??
  (Constants.expoConfig?.ios?.buildNumber ? parseInt(Constants.expoConfig.ios.buildNumber, 10) : 1);
export const APP_NAME = Constants.expoConfig?.name ?? 'Prediksikan';
export const FULL_VERSION_STRING = `v${APP_VERSION} (Build ${APP_BUILD_NUMBER})`;
