/**
 * Utilitas Zona Waktu Terpusat: WITA (Waktu Indonesia Tengah / UTC+8)
 * 
 * Memastikan seluruh tanggal dan jam pertandingan dihitung dan ditampilkan
 * secara konsisten berdasarkan zona waktu WITA (UTC+8).
 * 
 * Masalah sebelumnya: String split pada ISO UTC '2026-10-16T19:00:00Z' menghasilkan '2026-10-16',
 * padahal di WITA (UTC+8) sudah masuk jam 03:00 WITA tanggal 17 Oktober 2026.
 */

const WITA_OFFSET_HOURS = 8;
const WITA_OFFSET_MS = WITA_OFFSET_HOURS * 60 * 60 * 1000;

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_NAMES_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];
const MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Mengubah ISO string atau Date menjadi representasi waktu UTC+8 (WITA)
 */
export const toWitaDate = (dateInput?: string | Date | null): Date => {
  if (!dateInput) return new Date();

  let utcTime: number;

  if (typeof dateInput === 'string') {
    let normalized = dateInput.trim();
    // Jika tidak memiliki indikator zona waktu Z / offset, asumsikan string database disimpan dalam UTC
    if (
      !normalized.endsWith('Z') &&
      !normalized.includes('+') &&
      !normalized.match(/-\d{2}:\d{2}$/)
    ) {
      normalized = normalized.replace(' ', 'T') + 'Z';
    }
    const parsed = new Date(normalized);
    utcTime = isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
  } else {
    utcTime = dateInput.getTime();
  }

  // Waktu WITA = waktu UTC + 8 jam
  return new Date(utcTime + WITA_OFFSET_MS);
};

/**
 * Mendapatkan tanggal hari ini dalam zona waktu WITA
 */
export const getTodayWitaDate = (): Date => {
  const now = new Date();
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utcNow + WITA_OFFSET_MS);
};

/**
 * Mendapatkan key tanggal 'YYYY-MM-DD' sesuai tanggal di WITA
 * Contoh: '2026-10-16T19:00:00Z' -> '2026-10-17'
 */
export const getWitaDateKey = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  const d = toWitaDate(dateInput);
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Format jam bermain dalam WITA (e.g. '03:00 WITA')
 */
export const formatWitaTime = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    const d = toWitaDate(dateInput);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m} WITA`;
  } catch {
    return '-';
  }
};

/**
 * Format ringkas tanggal dan jam kickoff dalam WITA (e.g. 'Sab, 17 Okt • 03:00 WITA')
 */
export const formatWitaKickoff = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    const d = toWitaDate(dateInput);
    const day = DAY_NAMES[d.getUTCDay()];
    const dateNum = d.getUTCDate();
    const month = MONTH_NAMES[d.getUTCMonth()];
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return `${day}, ${dateNum} ${month} • ${h}:${m} WITA`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : '-';
  }
};

/**
 * Format tanggal lengkap untuk header atau modal (e.g. 'Sabtu, 17 Oktober 2026')
 */
export const formatWitaFullDate = (dateKeyOrInput?: string | Date | null): string => {
  if (!dateKeyOrInput) return '-';
  try {
    // Jika input berupa key 'YYYY-MM-DD'
    if (typeof dateKeyOrInput === 'string' && dateKeyOrInput.length === 10 && dateKeyOrInput.includes('-')) {
      const parts = dateKeyOrInput.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const tempDate = new Date(Date.UTC(y, m, day));
      return `${DAY_NAMES_FULL[tempDate.getUTCDay()]}, ${day} ${MONTH_NAMES_FULL[m]} ${y}`;
    }

    const d = toWitaDate(dateKeyOrInput);
    const dayName = DAY_NAMES_FULL[d.getUTCDay()];
    const dateNum = d.getUTCDate();
    const monthName = MONTH_NAMES_FULL[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  } catch {
    return typeof dateKeyOrInput === 'string' ? dateKeyOrInput : '-';
  }
};

/**
 * Format tanggal pendek untuk switcher (e.g. 'Sab, 17 Okt')
 */
export const formatWitaShortDate = (dateKey: string): string => {
  try {
    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const tempDate = new Date(Date.UTC(y, m, day));
      return `${DAY_NAMES[tempDate.getUTCDay()]}, ${day} ${MONTH_NAMES[m]}`;
    }
    return dateKey;
  } catch {
    return dateKey;
  }
};

/**
 * Mendapatkan label relatif: 'Hari Ini', 'Besok', 'Kemarin', atau null
 */
export const getWitaRelativeLabel = (dateKey: string): string | null => {
  const todayKey = getWitaDateKey(getTodayWitaDate());
  if (dateKey === todayKey) return 'Hari Ini';

  const tomorrow = getTodayWitaDate();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (dateKey === getWitaDateKey(tomorrow)) return 'Besok';

  const yesterday = getTodayWitaDate();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (dateKey === getWitaDateKey(yesterday)) return 'Kemarin';

  return null;
};
