import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, appFetch, Fixture, ParlayTicket } from './api';

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

/**
 * Sinkronisasi otomatis notifikasi dinamis berbasis data riil pertandingan & tiket parlay.
 * Menghasilkan pemberitahuan dinamis untuk:
 * 1. Sinyal Value Bet yang terdeteksi pada jadwal mendatang
 * 2. Big Match kickoff reminder hari ini
 * 3. Tiket Parlay yang berstatus WON (Menang)
 * Deduplikasi berbasis ID deterministik memastikan tidak ada notifikasi yang terduplikasi.
 */
export const syncDynamicNotifications = async (
  fixtures?: Fixture[],
  parlays?: ParlayTicket[]
): Promise<AppNotification[]> => {
  try {
    const current = await getNotifications();
    const existingIds = new Set(current.map((n) => n.id));
    const newItems: AppNotification[] = [];

    // 1. Sinyal Value Bet dari data Fixtures mendatang
    if (fixtures && fixtures.length > 0) {
      const valueMatches = fixtures.filter((f) => f.has_value_bet || f.has_value_bet_ou);
      valueMatches.slice(0, 3).forEach((f) => {
        const id = `dyn-valbet-${f.id}`;
        if (!existingIds.has(id)) {
          const market = f.has_value_bet ? '1X2' : 'Over/Under 2.5';
          newItems.push({
            id,
            title: 'Sinyal Value Bet AI Terdeteksi ⚡',
            message: `${f.home_team_name} vs ${f.away_team_name} (${f.league_name}): Model mendeteksi probabilitas keunggulan pada pasaran ${market}.`,
            timestamp: Date.now() - 1000 * 60 * 10,
            timeLabel: 'Baru saja',
            type: 'value_bet',
            isRead: false,
          });
          existingIds.add(id);
        }
      });

      // 2. Big Match Kickoff Reminder untuk laga Top 5 liga Eropa
      const top5Matches = fixtures.filter((f) =>
        /bundes|premier|epl|la liga|laliga|serie a|ligue 1/i.test(f.league_name) &&
        !/scottish/i.test(f.league_name)
      );
      if (top5Matches.length > 0) {
        const bigMatch = top5Matches[0];
        const id = `dyn-kickoff-${bigMatch.id}`;
        if (!existingIds.has(id)) {
          newItems.push({
            id,
            title: `Kick-off Laga Pilihan: ${bigMatch.home_team_name} vs ${bigMatch.away_team_name} ⚽`,
            message: `Laga seru ${bigMatch.league_name} dijadwalkan bertanding. Periksa kalkulasi probabilitas AI sebelum peluit dibunyikan.`,
            timestamp: Date.now() - 1000 * 60 * 45,
            timeLabel: 'Hari ini',
            type: 'match',
            isRead: false,
          });
          existingIds.add(id);
        }
      }
    }

    // 3. Notifikasi Tiket Parlay Menang (WON)
    if (parlays && parlays.length > 0) {
      const wonParlays = parlays.filter((p) => p.is_won === true);
      wonParlays.slice(0, 2).forEach((p) => {
        const id = `dyn-parlay-won-${p.ticket_id}`;
        if (!existingIds.has(id)) {
          newItems.push({
            id,
            title: 'Tiket Parlay Tembus! (WON) 🎯',
            message: `Tiket Parlay #${p.ticket_id} berhasil tembus menang dengan total akumulasi odds ${p.total_odds?.toFixed(2)}x!`,
            timestamp: new Date(p.date).getTime(),
            timeLabel: 'Hari ini',
            type: 'parlay',
            isRead: false,
          });
          existingIds.add(id);
        }
      });
    }

    if (newItems.length > 0) {
      const merged = [...newItems, ...current].sort((a, b) => b.timestamp - a.timestamp);
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(merged));
      return merged;
    }

    return current;
  } catch (err) {
    console.warn('Gagal sinkronisasi notifikasi dinamis:', err);
    return getNotifications();
  }
};

/**
 * Sinkronisasi notifikasi siaran manual (Broadcast) dari server Django Admin
 */
export const fetchRemoteBroadcasts = async (): Promise<AppNotification[]> => {
  try {
    const res = await appFetch(`${BASE_URL}/broadcasts/`);
    if (!res.ok) return getNotifications();
    const data = await res.json();
    const rawList: any[] = data.results || data || [];

    const current = await getNotifications();
    const readMap = new Map(current.map((n) => [n.id, n.isRead]));

    const remoteNotifs: AppNotification[] = rawList.map((item) => {
      const id = `remote-broadcast-${item.id}`;
      const isRead = readMap.has(id) ? (readMap.get(id) as boolean) : false;
      const ts = item.created_at ? new Date(item.created_at).getTime() : Date.now();
      return {
        id,
        title: item.title,
        message: item.message,
        timestamp: ts,
        timeLabel: formatNotificationTime(ts),
        type: item.notif_type || 'system',
        isRead,
      };
    });

    // Gabungkan notifikasi broadcast server dengan notifikasi lokal/dinamis
    const localOnly = current.filter((n) => !n.id.startsWith('remote-broadcast-'));
    const merged = [...remoteNotifs, ...localOnly].sort((a, b) => b.timestamp - a.timestamp);

    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Gagal memuat broadcast notifikasi remote:', err);
    return getNotifications();
  }
};

/**
 * Buat broadcast notifikasi manual (khusus Admin / Staff)
 */
export const createRemoteBroadcast = async (payload: {
  title: string;
  message: string;
  notif_type: 'system' | 'match' | 'value_bet' | 'parlay';
  admin_email?: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await appFetch(`${BASE_URL}/broadcasts/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetchRemoteBroadcasts();
      return {
        success: true,
        message: 'Siaran notifikasi berhasil diterbitkan ke seluruh pengguna aplikasi.',
      };
    } else {
      const data = await res.json();
      return {
        success: false,
        message: data.error || 'Gagal menerbitkan siaran notifikasi.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan jaringan saat mengirim siaran.',
    };
  }
};

