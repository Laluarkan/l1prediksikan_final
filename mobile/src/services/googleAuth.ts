import * as WebBrowser from 'expo-web-browser';
import { syncGoogleAccount, UserSession } from './auth';

// Menutup sesi auth browser jika selesai
WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CONFIG = {
  // Web Client ID dari Google Cloud Console
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

/**
 * Mengambil profil data user dari Google UserInfo API menggunakan access token OAuth
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
