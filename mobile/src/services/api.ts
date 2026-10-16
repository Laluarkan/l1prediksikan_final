const BASE_URL = 'https://l1prediksi-api.onrender.com/api';

export interface League {
  id: number;
  code: string;
  name: string;
  country?: string;
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
}

export interface Fixture {
  id: number;
  league_name: string;
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
      const response = await fetch(`${BASE_URL}/leagues/`);
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
      const response = await fetch(
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
      const response = await fetch(url);
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
      const response = await fetch(url);
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
      const response = await fetch(url);
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
  page_size?: number;
}): Promise<ParlayTicket[]> => {
  const query = new URLSearchParams();
  query.append('ordering', '-date');
  query.append('is_historical', params?.is_historical ? 'true' : 'false');
  query.append('page_size', String(params?.page_size || 100));
  if (params?.search) query.append('search', params.search);

  const url = `${BASE_URL}/parlays/?${query.toString()}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url);
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
    const res = await fetch('https://l1prediksi-api.onrender.com/health/', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
};

