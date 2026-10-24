/**
 * logo.ts:
 * Utilitas cerdas untuk pemuatan logo klub & liga sepak bola super cepat (sub-10ms)
 * dengan aset lokal resolusi tinggi yang disimpan di /logos/leagues/ dan /logos/teams/.
 * Memiliki fallback otomatis berbasis nama tim/liga sehingga tampilan tidak pernah kosong/blank
 * bahkan jika backend atau cache Redis belum sempat terbarui.
 */

import teamLeagueMapRaw from './teamLeagueMap.json';

const teamLeagueMap: Record<string, string> = teamLeagueMapRaw as Record<string, string>;

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
  'E0': '/logos/leagues/E0.png',
  'SP1': '/logos/leagues/SP1.png',
  'I1': '/logos/leagues/I1.png',
  'D1': '/logos/leagues/D1.png',
  'F1': '/logos/leagues/F1.png',
  'N1': '/logos/leagues/N1.png',
  'P1': '/logos/leagues/P1.png',
  'B1': '/logos/leagues/B1.png',
  'T1': '/logos/leagues/T1.png',
  'G1': '/logos/leagues/G1.png',
  'SC0': '/logos/leagues/SC0.png',
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
  // Coba pencarian parsial jika nama klub sedikit berbeda
  for (const [name, code] of Object.entries(teamLeagueMap)) {
    if (key.includes(name) || name.includes(key)) {
      return code;
    }
  }
  return null;
}

/**
 * Mendapatkan URL logo liga yang optimal (dari URL asli jika ada /logos/, atau dari kode / nama liga, atau nama klub)
 */
export function getLeagueLogoUrl(
  leagueCode?: string | null,
  leagueName?: string | null,
  rawUrl?: string | null,
  teamNameFallback?: string | null
): string {
  if (rawUrl && rawUrl.includes('/logos/')) {
    const idx = rawUrl.indexOf('/logos/');
    return rawUrl.substring(idx);
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
    // Partial search
    for (const [key, code] of Object.entries(LEAGUE_NAME_TO_CODE)) {
      if (norm.includes(key) || key.includes(norm)) {
        return LEAGUE_LOGO_MAP[code];
      }
    }
  }
  // Jika kode liga tidak ada, cari dari tim
  if (teamNameFallback) {
    const codeFromTeam = getTeamLeagueCode(teamNameFallback);
    if (codeFromTeam && LEAGUE_LOGO_MAP[codeFromTeam]) {
      return LEAGUE_LOGO_MAP[codeFromTeam];
    }
  }
  return '/default-logo.svg';
}

/**
 * Mendapatkan URL logo tim yang optimal
 * Jika URL dari API ada dan berisi /logos/, langsung gunakan path relatif.
 * Jika URL kosong/null/shield, buat path dari slug nama klub (cth: "Bayern Munich" -> "/logos/teams/bayern-munich.png").
 */
export function getTeamLogoUrl(
  teamName?: string | null,
  rawUrl?: string | null
): string {
  if (rawUrl && rawUrl.includes('/logos/')) {
    const idx = rawUrl.indexOf('/logos/');
    return rawUrl.substring(idx);
  }
  if (teamName) {
    const slug = slugifyTeamName(teamName);
    if (slug) {
      return `/logos/teams/${slug}.png`;
    }
  }
  return '/default-logo.svg';
}

/**
 * Kompatibilitas mundur dengan fungsi lama getOptimizedLogoUrl
 */
export function getOptimizedLogoUrl(
  url?: string | null,
  fallbackName?: string | null
): string {
  if (url && url.includes('/logos/')) {
    const idx = url.indexOf('/logos/');
    return url.substring(idx);
  }
  if (fallbackName) {
    return getTeamLogoUrl(fallbackName, url);
  }
  return url || '/default-logo.svg';
}
