/**
 * logo.ts:
 * Utilitas pemuatan logo klub & liga sepak bola untuk aplikasi mobile React Native / Expo.
 * Merujuk ke static CDN berkecepatan tinggi: https://www.l1prediksikan.my.id/logos/
 */

import teamLeagueMapRaw from './teamLeagueMap.json';

const teamLeagueMap: Record<string, string> = teamLeagueMapRaw as Record<string, string>;

export const CDN_BASE_URL = 'https://www.l1prediksikan.my.id';

export function slugifyTeamName(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const LEAGUE_LOGO_MAP: Record<string, string> = {
  'E0': `${CDN_BASE_URL}/logos/leagues/E0.png`,
  'SP1': `${CDN_BASE_URL}/logos/leagues/SP1.png`,
  'I1': `${CDN_BASE_URL}/logos/leagues/I1.png`,
  'D1': `${CDN_BASE_URL}/logos/leagues/D1.png`,
  'F1': `${CDN_BASE_URL}/logos/leagues/F1.png`,
  'N1': `${CDN_BASE_URL}/logos/leagues/N1.png`,
  'P1': `${CDN_BASE_URL}/logos/leagues/P1.png`,
  'B1': `${CDN_BASE_URL}/logos/leagues/B1.png`,
  'T1': `${CDN_BASE_URL}/logos/leagues/T1.png`,
  'G1': `${CDN_BASE_URL}/logos/leagues/G1.png`,
  'SC0': `${CDN_BASE_URL}/logos/leagues/SC0.png`,
};

export const LEAGUE_NAME_TO_CODE: Record<string, string> = {
  'premier league': 'E0',
  'epl': 'E0',
  'english premier league': 'E0',
  'la liga': 'SP1',
  'laliga': 'SP1',
  'spanish la liga': 'SP1',
  'serie a': 'I1',
  'italian serie a': 'I1',
  'bundesliga': 'D1',
  'german bundesliga': 'D1',
  'ligue 1': 'F1',
  'french ligue 1': 'F1',
  'eredivisie': 'N1',
  'dutch eredivisie': 'N1',
  'primeira liga': 'P1',
  'liga portugal': 'P1',
  'portuguese primeira liga': 'P1',
  'jupiler pro league': 'B1',
  'belgian pro league': 'B1',
  'belgian jupiler pro league': 'B1',
  'süper lig': 'T1',
  'super lig': 'T1',
  'turkish süper lig': 'T1',
  'turkish super lig': 'T1',
  'super league': 'G1',
  'super league greece': 'G1',
  'greek super league': 'G1',
  'scottish premiership': 'SC0',
  'premiership': 'SC0',
};

/**
 * Mendapatkan kode liga dari nama tim (menggunakan database pemetaan 284 klub)
 */
export function getTeamLeagueCode(teamName?: string | null): string | null {
  if (!teamName) return null;
  const key = teamName.toLowerCase().trim();
  if (teamLeagueMap[key]) {
    return teamLeagueMap[key];
  }
  for (const [name, code] of Object.entries(teamLeagueMap)) {
    if (key.includes(name) || name.includes(key)) {
      return code;
    }
  }
  return null;
}

/**
 * Mengidentifikasi kode liga resmi (E0, SP1, D1, dll) dari string kode atau nama liga apapun
 */
export function resolveLeagueCode(identifier?: string | null): string | null {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (LEAGUE_LOGO_MAP[upper]) {
    return upper;
  }

  const norm = trimmed.toLowerCase();
  if (LEAGUE_NAME_TO_CODE[norm]) {
    return LEAGUE_NAME_TO_CODE[norm];
  }

  for (const [key, code] of Object.entries(LEAGUE_NAME_TO_CODE)) {
    if (norm.includes(key) || key.includes(norm)) {
      return code;
    }
  }

  // Deteksi kata kunci umum nama liga
  if (norm.includes('premier') || norm.includes('epl') || norm.includes('inggris') || norm.includes('english')) return 'E0';
  if (norm.includes('la liga') || norm.includes('laliga') || norm.includes('spanyol') || norm.includes('spain')) return 'SP1';
  if (norm.includes('serie a') || norm.includes('ital')) return 'I1';
  if (norm.includes('bundesliga') || norm.includes('jerman') || norm.includes('german')) return 'D1';
  if (norm.includes('ligue 1') || norm.includes('prancis') || norm.includes('french')) return 'F1';
  if (norm.includes('eredivisie') || norm.includes('belanda') || norm.includes('dutch') || norm.includes('holland')) return 'N1';
  if (norm.includes('primeira') || norm.includes('portugal') || norm.includes('portuguese')) return 'P1';
  if (norm.includes('jupiler') || norm.includes('belgia') || norm.includes('belgian')) return 'B1';
  if (norm.includes('süper') || norm.includes('super lig') || norm.includes('turki') || norm.includes('turkish')) return 'T1';
  if (norm.includes('super league') || norm.includes('yunani') || norm.includes('greek')) return 'G1';
  if (norm.includes('scottish') || norm.includes('skotlandia') || norm.includes('premiership')) return 'SC0';

  return null;
}

/**
 * Mendapatkan URL logo liga yang optimal (mencegah fallback keliru ke E0)
 */
export function getLeagueLogoUrl(
  leagueCodeOrName?: string | null,
  leagueNameFallback?: string | null,
  rawUrl?: string | null,
  teamNameFallback?: string | null
): string {
  if (rawUrl) {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    if (rawUrl.startsWith('/logos/')) {
      return `${CDN_BASE_URL}${rawUrl}`;
    }
  }

  // 1. Cek parameter pertama (bisa kode resmi 2-3 huruf atau nama liga)
  const code1 = resolveLeagueCode(leagueCodeOrName);
  if (code1 && LEAGUE_LOGO_MAP[code1]) {
    return LEAGUE_LOGO_MAP[code1];
  }

  // 2. Cek parameter kedua jika disediakan
  const code2 = resolveLeagueCode(leagueNameFallback);
  if (code2 && LEAGUE_LOGO_MAP[code2]) {
    return LEAGUE_LOGO_MAP[code2];
  }

  // 3. Fallback berdasarkan klub jika ada
  if (teamNameFallback) {
    const codeFromTeam = getTeamLeagueCode(teamNameFallback);
    if (codeFromTeam && LEAGUE_LOGO_MAP[codeFromTeam]) {
      return LEAGUE_LOGO_MAP[codeFromTeam];
    }
  }

  return `${CDN_BASE_URL}/logos/leagues/E0.png`;
}

/**
 * Mendapatkan URL logo tim yang optimal (100% 284 klub terpetakan)
 */
export function getTeamLogoUrl(
  teamName?: string | null,
  rawUrl?: string | null
): string {
  if (rawUrl) {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    if (rawUrl.startsWith('/logos/')) {
      return `${CDN_BASE_URL}${rawUrl}`;
    }
  }
  if (teamName) {
    const slug = slugifyTeamName(teamName);
    if (slug) {
      return `${CDN_BASE_URL}/logos/teams/${slug}.png`;
    }
  }
  return `${CDN_BASE_URL}/logos/teams/arsenal.png`;
}

export function getOptimizedLogoUrl(
  url?: string | null,
  fallbackName?: string | null
): string {
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/logos/')) {
      return `${CDN_BASE_URL}${url}`;
    }
  }
  if (fallbackName) {
    return getTeamLogoUrl(fallbackName, url);
  }
  return url || `${CDN_BASE_URL}/logos/teams/arsenal.png`;
}
