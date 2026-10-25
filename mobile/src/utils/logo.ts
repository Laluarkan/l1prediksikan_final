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
 * Mendapatkan URL logo liga yang optimal
 */
export function getLeagueLogoUrl(
  leagueCode?: string | null,
  leagueName?: string | null,
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
  if (leagueCode) {
    const code = leagueCode.trim().toUpperCase();
    if (LEAGUE_LOGO_MAP[code]) {
      return LEAGUE_LOGO_MAP[code];
    }
  }
  if (leagueName) {
    const norm = leagueName.trim().toLowerCase();
    const mappedCode = LEAGUE_NAME_TO_CODE[norm];
    if (mappedCode && LEAGUE_LOGO_MAP[mappedCode]) {
      return LEAGUE_LOGO_MAP[mappedCode];
    }
    for (const [key, code] of Object.entries(LEAGUE_NAME_TO_CODE)) {
      if (norm.includes(key) || key.includes(norm)) {
        return LEAGUE_LOGO_MAP[code];
      }
    }
  }
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
