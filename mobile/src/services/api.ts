export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://l1prediksi-api.onrender.com/api';
export const APP_CLIENT_KEY = process.env.EXPO_PUBLIC_CLIENT_KEY || process.env.EXPO_PUBLIC_SYNC_SECRET || '';


import { getUserSession, saveUserSession } from './auth';

/**
 * appFetch: Custom fetch wrapper yang secara otomatis menyertakan header autentikasi klien resmi
 * (X-App-Client-Key & X-Sync-Secret) dan Bearer token jika pengguna telah login.
 * Menangani token kedaluwarsa (HTTP 401) secara cerdas agar data publik tetap termuat 100%.
 */
export const appFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const customHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-App-Client-Key': APP_CLIENT_KEY,
    'X-Sync-Secret': APP_CLIENT_KEY,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  let tokenSent: string | undefined;
  try {
    const session = await getUserSession();
    if (session?.accessToken) {
      tokenSent = session.accessToken;
      customHeaders['Authorization'] = `Bearer ${session.accessToken}`;
    }
  } catch {}

  let res = await fetch(url, {
    ...options,
    headers: {
      ...customHeaders,
      ...(options.headers || {}),
    },
  });

  // Jika server mengembalikan 401 karena token user kedaluwarsa atau tidak valid
  if (res.status === 401 && tokenSent) {
    let refreshed = false;
    try {
      const session = await getUserSession();
      if (session?.refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Client-Key': APP_CLIENT_KEY,
          },
          body: JSON.stringify({ refresh: session.refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.access) {
            session.accessToken = refreshData.access;
            await saveUserSession(session);
            refreshed = true;
            customHeaders['Authorization'] = `Bearer ${refreshData.access}`;
            res = await fetch(url, {
              ...options,
              headers: {
                ...customHeaders,
                ...(options.headers || {}),
              },
            });
          }
        }
      }
    } catch {}

    // Jika refresh gagal (misal token benar-benar kedaluwarsa), ulangi request TANPA token agar data publik tetap muncul
    if (!refreshed && res.status === 401) {
      delete customHeaders['Authorization'];
      const headersWithoutAuth = { ...customHeaders, ...(options.headers || {}) };
      delete (headersWithoutAuth as any)['Authorization'];
      res = await fetch(url, {
        ...options,
        headers: headersWithoutAuth,
      });

      // Bersihkan token yang kedaluwarsa dari sesi agar request berikutnya tidak terkena 401 lagi
      try {
        const session = await getUserSession();
        if (session && session.accessToken === tokenSent) {
          delete session.accessToken;
          delete session.refreshToken;
          await saveUserSession(session);
        }
      } catch {}
    }
  }

  return res;
};

export interface League {
  id: number;
  code: string;
  name: string;
  country?: string;
  logo_url?: string | null;
}

export interface TeamStanding {
  rank: number;
  team: string;
  logo: string | null;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  honor?: 'Juara Bertahan' | 'Top 3 Musim Lalu' | 'Promosi' | string | null;
}

export interface Fixture {
  id: number;
  league_name: string;
  league_code?: string;
  league_logo?: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_logo?: string | null;
  away_team_logo?: string | null;
  date: string;
  fthg?: number | null;
  ftag?: number | null;
  avg_h: number;
  avg_d: number;
  avg_a: number;
  avg_over_25?: number;
  avg_under_25?: number;
  prob_ftr_h: number;
  prob_ftr_d: number;
  prob_ftr_a: number;
  prob_ou25_over?: number;
  prob_ou25_under?: number;
  rl_pick_ftr?: string;
  rl_action_ftr?: string;
  rl_stake_ftr?: number;
  rl_pick_ou?: string;
  rl_action_ou?: string;
  rl_stake_ou?: number;
  rl_stake?: number;
  rl_action?: string;
  rl_pick?: string;
  has_value_bet?: boolean;
  has_value_bet_ou?: boolean;
  extended_features?: Record<string, any>;
}

export interface PerformanceData {
  ftr: {
    wins: number;
    losses: number;
    unit_profit: number;
    unit_stake: number;
  };
  ou: {
    wins: number;
    losses: number;
    unit_profit: number;
    unit_stake: number;
  };
  parlay: {
    wins: number;
    losses: number;
    unit_profit: number;
    unit_stake: number;
  };
}

export const fetchLeagues = async (): Promise<League[]> => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await appFetch(`${BASE_URL}/leagues/`);
      if (!response.ok) {
        if (attempt === 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.results || data || [];
    } catch (error) {
      if (attempt === 2) {
        console.warn('Leagues unavailable:', error);
        return [];
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return [];
};

export const fetchStandings = async (
  leagueCode: string,
  season: string
): Promise<TeamStanding[]> => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await appFetch(
        `${BASE_URL}/standings/?league=${encodeURIComponent(leagueCode)}&season=${encodeURIComponent(season)}`
      );
      if (!response.ok) {
        if (attempt === 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (attempt === 2) {
        console.warn('Standings unavailable:', error);
        return [];
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return [];
};

export const fetchUpcomingFixtures = async (params?: {
  league?: string;
  search?: string;
}): Promise<Fixture[]> => {
  const query = new URLSearchParams();
  query.append('page_size', '100');
  query.append('ordering', 'date');
  if (params?.league) query.append('league__code', params.league);
  if (params?.search) query.append('search', params.search);

  const url = `${BASE_URL}/fixtures/?${query.toString()}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await appFetch(url);
      if (!response.ok) {
        if (attempt === 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.results || data || [];
    } catch (error) {
      if (attempt === 2) {
        console.warn('Fixtures unavailable:', error);
        return [];
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return [];
};

export const getCurrentSeason = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec (7 = Aug)
  
  // Jika bulan Agustus (7) atau setelahnya, masuk musim tahun_ini/tahun_depan (misal: 26/27)
  if (month >= 7) {
    return `${year.toString().slice(-2)}/${(year + 1).toString().slice(-2)}`;
  }
  // Jika sebelum Agustus, masuk musim tahun_lalu/tahun_ini (misal: 25/26)
  return `${(year - 1).toString().slice(-2)}/${year.toString().slice(-2)}`;
};

export const fetchPerformanceMetrics = async (
  season?: string
): Promise<PerformanceData | null> => {
  const url = season
    ? `${BASE_URL}/performance/?season=${encodeURIComponent(season)}`
    : `${BASE_URL}/performance/`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await appFetch(url);
      if (!response.ok) {
        if (attempt === 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt === 2) {
        console.warn('Performance unavailable:', error);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
};

export interface MatchHistory {
  id: number;
  date: string;
  home_team_name: string;
  away_team_name: string;
  home_team_logo?: string | null;
  away_team_logo?: string | null;
  league_name: string;
  league_code?: string;
  league_logo?: string | null;
  fthg: number | null;
  ftag: number | null;
  ftr: string | null;
  avg_h: number;
  avg_d: number;
  avg_a: number;
  avg_over_25?: number;
  avg_under_25?: number;
  prob_ftr_h: number;
  prob_ftr_d: number;
  prob_ftr_a: number;
  prob_ou25_over?: number;
  prob_ou25_under?: number;
  rl_pick_ftr?: string;
  rl_action_ftr?: string;
  rl_stake_ftr?: number;
  is_won_ftr?: boolean | null;
  rl_pick_ou?: string;
  rl_action_ou?: string;
  rl_stake_ou?: number;
  is_won_ou?: boolean | null;
  has_value_bet?: boolean;
  has_value_bet_ou?: boolean;
  extended_features?: Record<string, any>;
}

export interface HistoryResponse {
  results: MatchHistory[];
  count: number;
}

export const fetchMatchHistory = async (params?: {
  page?: number;
  page_size?: number;
  league?: string;
  season?: string;
  search?: string;
  filter_result?: string;
}): Promise<HistoryResponse> => {
  const query = new URLSearchParams();
  query.append('page', String(params?.page || 1));
  query.append('page_size', String(params?.page_size || 20));
  query.append('ordering', '-date');
  if (params?.season && params.season !== 'ALL') query.append('season', params.season);
  if (params?.league) query.append('league__code', params.league);
  if (params?.search) query.append('search', params.search);
  if (params?.filter_result && params.filter_result !== 'ALL') {
    const resVal =
      params.filter_result === 'WIN'
        ? 'WON'
        : params.filter_result === 'LOSE'
        ? 'LOST'
        : params.filter_result;
    query.append('filter_result', resVal);
  }

  const url = `${BASE_URL}/history/?${query.toString()}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await appFetch(url);
      if (!response.ok) {
        if (attempt === 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return {
        results: data.results || (Array.isArray(data) ? data : []),
        count: data.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      if (attempt === 2) {
        console.warn('History unavailable:', error);
        return { results: [], count: 0 };
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return { results: [], count: 0 };
};

// ================= PARLAY TICKETS (AI RECOMENDATIONS) =================
export interface ParlayLeg {
  match: string;
  pick: string;
  odds: number;
  date?: string;
  is_won?: boolean | null;
}

export interface ParlayTicket {
  id: number;
  ticket_id: string;
  date: string;
  total_odds: number;
  total_prob: number;
  is_won: boolean | null;
  is_historical: boolean;
  legs_details?: ParlayLeg[];
}

export const fetchParlayTickets = async (params?: {
  is_historical?: boolean;
  search?: string;
  season?: string;
  filter_result?: string;
  page_size?: number;
}): Promise<ParlayTicket[]> => {
  const query = new URLSearchParams();
  query.append('ordering', '-date');
  if (params?.is_historical !== undefined) {
    query.append('is_historical', params.is_historical ? 'true' : 'false');
  }
  query.append('page_size', String(params?.page_size || 100));
  if (params?.search) query.append('search', params.search);
  if (params?.season && params.season !== 'ALL') query.append('season', params.season);
  if (params?.filter_result && params.filter_result !== 'ALL') {
    query.append('filter_result', params.filter_result);
  }

  const url = `${BASE_URL}/parlays/?${query.toString()}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await appFetch(url);
      if (!response.ok) {
        if (attempt === 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data && data.results) return data.results;
      if (Array.isArray(data)) return data;
      return [];
    } catch (error) {
      if (attempt === 2) {
        console.warn('Parlays unavailable:', error);
        return [];
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return [];
};

// ================= SERVER HEALTH & CONNECTIVITY =================
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await appFetch('https://l1prediksi-api.onrender.com/health/', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
};

// ================= SAVED MATCHES (FAVORITES) =================
export interface SavedMatchItem {
  id: number;
  fixture: Fixture;
  saved_at: string;
}

export const fetchSavedMatches = async (): Promise<SavedMatchItem[]> => {
  try {
    const res = await appFetch(`${BASE_URL}/saved-matches/`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch (err) {
    console.error('Error fetching saved matches:', err);
    return [];
  }
};

export const toggleSavedMatch = async (
  fixtureId: number
): Promise<{ status: string; is_saved: boolean }> => {
  const res = await appFetch(`${BASE_URL}/saved-matches/toggle/`, {
    method: 'POST',
    body: JSON.stringify({ fixture_id: fixtureId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to toggle favorite: ${res.status}`);
  }
  return await res.json();
};

export const fetchSavedMatchIds = async (): Promise<number[]> => {
  try {
    const res = await appFetch(`${BASE_URL}/saved-matches/ids/`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.saved_fixture_ids || [];
  } catch {
    return [];
  }
};

// ================= FEATURE SUGGESTIONS & ROADMAP =================
export interface FeatureSuggestionItem {
  id: number;
  title: string;
  category: string;
  description: string;
  icon: string;
  created_by?: number | null;
  created_by_username: string;
  votes_count: number;
  has_voted: boolean;
  created_at: string;
}

export const fetchFeatureSuggestions = async (): Promise<FeatureSuggestionItem[]> => {
  try {
    const res = await appFetch(`${BASE_URL}/features/`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch (err) {
    console.error('Error fetching feature suggestions:', err);
    return [];
  }
};

export const voteFeatureSuggestion = async (
  featureId: number
): Promise<{ status: string; votes_count: number; has_voted: boolean }> => {
  const res = await appFetch(`${BASE_URL}/features/${featureId}/vote/`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to vote feature: ${res.status}`);
  }
  return await res.json();
};

export const createFeatureSuggestion = async (data: {
  title: string;
  category: string;
  description: string;
  icon?: string;
}): Promise<FeatureSuggestionItem> => {
  const res = await appFetch(`${BASE_URL}/features/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.error || 'Gagal mengirim saran fitur');
  }
  return await res.json();
};

export interface AppVersionInfo {
  latest_version: string;
  latest_build: number;
  update_url: string;
  release_notes?: string;
  is_critical?: boolean;
}

/**
 * checkAppVersion:
 * Memeriksa versi rilis terbaru dari server backend Prediksikan.
 * Digunakan untuk menampilkan banner pembaruan in-app ke pengguna jika ada rilis baru di APKPure.
 */
export const checkAppVersion = async (): Promise<AppVersionInfo | null> => {
  try {
    const res = await appFetch(`${BASE_URL}/app-version/`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};



