import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  timeLabel: string;
  type: 'match' | 'value_bet' | 'score' | 'parlay' | 'system';
  isRead: boolean;
}

export interface NotificationSettings {
  matchReminder: boolean;
  valueBetAlert: boolean;
  scoreUpdate: boolean;
  weeklyDigest: boolean;
  dndMode: boolean;
}

const STORAGE_KEY_NOTIFS = '@prediksikan_user_notifications';
const STORAGE_KEY_SETTINGS = '@prediksikan_notif_settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  matchReminder: true,
  valueBetAlert: true,
  scoreUpdate: false,
  weeklyDigest: true,
  dndMode: false,
};

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-notif-1',
    title: 'Selamat Datang di Prediksikan! ⚽',
    message: 'Sistem analitik AI siap membantu Anda membaca probabilitas pasar di 11 liga top Eropa sebelum peluit kick-off dibunyikan.',
    timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
    timeLabel: 'Baru saja',
    type: 'system',
    isRead: false,
  },
  {
    id: 'seed-notif-2',
    title: 'Sinyal Value Bet AI Terdeteksi ⚡',
    message: 'Model mendeteksi ketidaksesuaian odds bandar (Expected Value positif) pada laga pilihan pekan ini.',
    timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
    timeLabel: 'Hari ini',
    type: 'value_bet',
    isRead: false,
  },
  {
    id: 'seed-notif-3',
    title: 'Jadwal & Odds Terkini Diperbarui 📅',
    message: 'Seluruh kalkulasi probabilitas dan tren performa tim telah diperbarui ke jadwal terbaru.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    timeLabel: 'Kemarin',
    type: 'match',
    isRead: true,
  },
];

/**
 * Format timestamp ke label waktu yang mudah dibaca
 */
export const formatNotificationTime = (timestamp: number): string => {
  const diffMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Kemarin';
  return `${diffDays} hari lalu`;
};

/**
 * Ambil daftar notifikasi yang tersimpan
 */
export const getNotifications = async (): Promise<AppNotification[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIFS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    const list: AppNotification[] = JSON.parse(raw);
    return list.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.warn('Gagal memuat notifikasi:', err);
    return SEED_NOTIFICATIONS;
  }
};

/**
 * Tambah notifikasi baru
 */
export const addNotification = async (item: {
  title: string;
  message: string;
  type?: AppNotification['type'];
}): Promise<AppNotification[]> => {
  try {
    const current = await getNotifications();
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: item.title,
      message: item.message,
      timestamp: Date.now(),
      timeLabel: 'Baru saja',
      type: item.type || 'system',
      isRead: false,
    };
    const updated = [newNotif, ...current];
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Gagal menambah notifikasi:', err);
    return [];
  }
};

/**
 * Tandai satu notifikasi sebagai sudah dibaca
 */
export const markNotificationAsRead = async (id: string): Promise<AppNotification[]> => {
  try {
    const current = await getNotifications();
    const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Gagal mengubah status notifikasi:', err);
    return [];
  }
};

/**
 * Tandai seluruh notifikasi sebagai sudah dibaca
 */
export const markAllNotificationsAsRead = async (): Promise<AppNotification[]> => {
  try {
    const current = await getNotifications();
    const updated = current.map((n) => ({ ...n, isRead: true }));
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Gagal menandai semua dibaca:', err);
    return [];
  }
};

/**
 * Hapus satu notifikasi
 */
export const deleteNotification = async (id: string): Promise<AppNotification[]> => {
  try {
    const current = await getNotifications();
    const updated = current.filter((n) => n.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Gagal menghapus notifikasi:', err);
    return [];
  }
};

/**
 * Bersihkan seluruh notifikasi
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify([]));
  } catch (err) {
    console.warn('Gagal membersihkan notifikasi:', err);
  }
};

/**
 * Hitung jumlah notifikasi belum dibaca
 */
export const getUnreadNotificationsCount = async (): Promise<number> => {
  try {
    const list = await getNotifications();
    return list.filter((n) => !n.isRead).length;
  } catch {
    return 0;
  }
};

/**
 * Ambil preferensi notifikasi
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Simpan preferensi notifikasi
 */
export const saveNotificationSettings = async (
  settings: NotificationSettings
): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('Gagal menyimpan preferensi notifikasi:', err);
  }
};
