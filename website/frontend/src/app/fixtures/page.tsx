/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { 
  ChevronDown, 
  ChevronUp, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  SlidersHorizontal, 
  Search, 
  X, 
  Calendar,
  Sparkles,
  Check,
  LogIn
} from 'lucide-react';
import { getOptimizedLogoUrl, getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

interface League {
  id: number;
  code: string;
  name: string;
  country: string;
  logo_url?: string;
}

interface Fixture {
  id: number;
  date: string;
  home_team_name: string;
  home_team_logo?: string;
  away_team_name: string;
  away_team_logo?: string;
  league_name: string;
  league_code?: string;
  league_logo?: string;
  avg_h: number;
  avg_d: number;
  avg_a: number;
  avg_over_25: number;
  avg_under_25: number;
  prob_ftr_h: number;
  prob_ftr_d: number;
  prob_ftr_a: number;
  prob_ou25_over: number;
  prob_ou25_under: number;
  rl_pick_ftr: string;
  rl_action_ftr: string;
  rl_stake_ftr: number;
  rl_pick_ou: string;
  rl_action_ou: string;
  rl_stake_ou: number;
  extended_features: any;
}

export default function FixturesPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pengaturan Modal & Filter
  const [bankroll, setBankroll] = useState<number>(500000);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [filterFtr, setFilterFtr] = useState(false);
  const [filterOu, setFilterOu] = useState(false);
  const [minOdds, setMinOdds] = useState<number>(1.0);
  
  // UI State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savedFixtureIds, setSavedFixtureIds] = useState<number[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load League List
  useEffect(() => {
    api.get('/leagues/')
      .then((res) => setLeagues(res.data.results || res.data))
      .catch((err) => console.error("Gagal memuat liga:", err));
  }, []);

  // Load User Saved Matches if logged in
  useEffect(() => {
    if (authStatus === 'authenticated') {
      api.get('/saved-matches/ids/')
        .then((res) => {
          if (res.data && Array.isArray(res.data.saved_fixture_ids)) {
            setSavedFixtureIds(res.data.saved_fixture_ids);
          }
        })
        .catch((err) => console.error("Gagal memuat bookmark:", err));
    }
  }, [authStatus]);

  // Fetch Fixtures Reactively whenever selected leagues change
  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {
      is_processed: true,
      page_size: 1000,
      ordering: 'date',
    };

    if (selectedLeagues.length > 0) {
      params.leagues = selectedLeagues.join(',');
    }

    api.get('/fixtures/', { params })
      .then((res) => {
        if (res.data && res.data.results) {
          setFixtures(res.data.results);
        } else if (Array.isArray(res.data)) {
          setFixtures(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat jadwal:", err);
        setLoading(false);
      });
  }, [selectedLeagues]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLeagues, filterFtr, filterOu, minOdds]);

  // Handle Multi-Select League Toggle
  const toggleLeague = (code: string) => {
    setSelectedLeagues((prev) => 
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAllLeagues = () => {
    setSelectedLeagues([]);
  };

  // Toggle Bookmark Match
  const toggleSaveMatch = async (e: React.MouseEvent, fixtureId: number) => {
    e.stopPropagation();
    if (authStatus !== 'authenticated') {
      setShowLoginModal(true);
      return;
    }

    setSavingId(fixtureId);
    const isCurrentlySaved = savedFixtureIds.includes(fixtureId);

    // Optimistic UI update immediately without any bottom popup
    setSavedFixtureIds((prev) =>
      isCurrentlySaved ? prev.filter((id) => id !== fixtureId) : [...prev, fixtureId]
    );

    try {
      await api.post('/saved-matches/toggle/', { fixture_id: fixtureId });
    } catch (err: any) {
      // Revert on error
      setSavedFixtureIds((prev) =>
        isCurrentlySaved ? [...prev, fixtureId] : prev.filter((id) => id !== fixtureId)
      );
    } finally {
      setSavingId(null);
    }
  };

  const toggleMatch = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  // Client-side Reactive Filter
  const displayedFixtures = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const now = new Date().getTime();

    return fixtures.filter((f) => {
      const fixtureDate = new Date(f.date).getTime();
      if (fixtureDate < now) return false;

      // Filter nama tim
      if (cleanSearch) {
        const homeMatch = f.home_team_name?.toLowerCase().includes(cleanSearch);
        const awayMatch = f.away_team_name?.toLowerCase().includes(cleanSearch);
        const leagueMatch = f.league_name?.toLowerCase().includes(cleanSearch);
        if (!homeMatch && !awayMatch && !leagueMatch) return false;
      }

      let ftrOdds = 0;
      if (f.rl_pick_ftr === 'H') ftrOdds = f.avg_h;
      else if (f.rl_pick_ftr === 'D') ftrOdds = f.avg_d;
      else if (f.rl_pick_ftr === 'A') ftrOdds = f.avg_a;

      let ouOdds = 0;
      if (f.rl_pick_ou === 'Over 2.5') ouOdds = f.avg_over_25;
      else if (f.rl_pick_ou === 'Under 2.5') ouOdds = f.avg_under_25;

      const ftrValid = (f.rl_stake_ftr > 0) && (ftrOdds >= minOdds);
      const ouValid = (f.rl_stake_ou > 0) && (ouOdds >= minOdds);

      if (filterFtr && filterOu) {
        if (!ftrValid || !ouValid) return false;
      } else if (filterFtr) {
        if (!ftrValid) return false;
      } else if (filterOu) {
        if (!ouValid) return false;
      }

      return true;
    });
  }, [fixtures, searchTerm, filterFtr, filterOu, minOdds]);

  const totalPages = Math.ceil(displayedFixtures.length / itemsPerPage);
  const currentFixtures = displayedFixtures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeFilterCount = (selectedLeagues.length > 0 ? 1 : 0) + 
    (filterFtr ? 1 : 0) + 
    (filterOu ? 1 : 0) + 
    (minOdds > 1.0 ? 1 : 0) + 
    (searchTerm ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-16 px-4 sm:px-6">
      

      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Jadwal Pertandingan &amp; Prediksi
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Analisis odds multi-bandar, rekomendasi matematis Fractional Kelly, dan indikator Expected Value (EV).
          </p>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            {displayedFixtures.length} Laga Tersedia
          </span>
        </div>
      </div>

      {/* ================= COMPACT MOBILE FILTER BAR (Requirement 4) ================= */}
      {/* On mobile screens, this compact bar stays at top, keeping matches immediately visible */}
      <div className="lg:hidden mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tim sepak bola..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              activeFilterCount > 0 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile League Selector Dropdown with Full League Name */}
        <div className="relative">
          <label htmlFor="mobile-league-select" className="sr-only">Pilih Liga</label>
          <select
            id="mobile-league-select"
            value={selectedLeagues.length === 1 ? selectedLeagues[0] : (selectedLeagues.length === 0 ? '' : 'custom')}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                selectAllLeagues();
              } else {
                setSelectedLeagues([val]);
              }
            }}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="">Semua Liga (Tampilkan Semua)</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.code}>
                {l.name} ({l.country})
              </option>
            ))}
          </select>
        </div>

        {/* Collapsible Mobile Details (Modal / Bankroll / Checkboxes) */}
        {isMobileFilterOpen && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Pengaturan Lanjutan</span>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Bankroll Simulasi (Rp)</label>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Min. Odds Rekomendasi: <span className="text-emerald-400 font-mono font-bold">{minOdds.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="3.5"
                step="0.1"
                value={minOdds}
                onChange={(e) => setMinOdds(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={filterFtr}
                  onChange={(e) => setFilterFtr(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <span>Hanya Tampilkan Rekomendasi 1X2 (FTR)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={filterOu}
                  onChange={(e) => setFilterOu(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <span>Hanya Tampilkan Rekomendasi Over/Under 2.5</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ================= MAIN CONTENT GRID (DESKTOP SIDEBAR + MATCH LIST) ================= */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Desktop Sidebar Filter (Hidden on Mobile) */}
        <div className="hidden lg:block w-72 flex-shrink-0 space-y-4">
          
          {/* Card 1: Bankroll Input */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Pengaturan Modal</span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-Time</span>
            </h2>
            <div>
              <label htmlFor="desktop-bankroll-input" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Bankroll Simulasi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-semibold">Rp</span>
                <input
                  id="desktop-bankroll-input"
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Filter Data & Multi-League Selection */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Filter Pertandingan</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLeagues([]);
                    setFilterFtr(false);
                    setFilterOu(false);
                    setMinOdds(1.0);
                  }}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Reset Semua
                </button>
              )}
            </div>

            {/* Cari Tim */}
            <div>
              <label htmlFor="desktop-search-input" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cari Tim</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="desktop-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ketik nama klub..."
                />
              </div>
            </div>

            {/* Multi-League Checkboxes */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pilih Liga ({selectedLeagues.length === 0 ? 'Semua' : selectedLeagues.length})
                </label>
                {selectedLeagues.length > 0 && (
                  <button 
                    onClick={selectAllLeagues}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Pilih Semua
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-900/60">
                {leagues.map((l) => {
                  const checked = selectedLeagues.includes(l.code);
                  return (
                    <label 
                      key={l.id} 
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        checked ? 'bg-emerald-500/10 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLeague(l.code)}
                          className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5 shrink-0"
                        />
                        <img 
                          src={getLeagueLogoUrl(l.code, l.name, l.logo_url)}
                          alt="" 
                          className="w-4 h-4 object-contain shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span className="truncate">{l.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">{l.code}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Min Odds Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Min. Odds</label>
                <span className="font-mono text-emerald-400 text-xs font-bold">{minOdds.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={minOdds}
                onChange={(e) => setMinOdds(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Checkboxes FTR & OU */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={filterFtr}
                  onChange={(e) => setFilterFtr(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Rekomendasi FTR Aktif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={filterOu}
                  onChange={(e) => setFilterOu(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Rekomendasi O/U Aktif</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center pt-1">
              Data tersaring secara otomatis saat filter diubah.
            </p>
          </div>
        </div>

        {/* ================= MATCH LIST COLUMN ================= */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-16 text-sm text-slate-400 bg-slate-850/60 border border-slate-800 rounded-2xl animate-pulse">
              Menghubungkan ke database jadwal pertandingan...
            </div>
          ) : currentFixtures.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-850 border border-slate-800 rounded-2xl">
              <p className="text-white font-semibold">Tidak Ada Pertandingan yang Cocok</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Silakan sesuaikan kembali kriteria pencarian nama tim, filter liga, atau batas minimum odds Anda.
              </p>
            </div>
          ) : (
            <>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-xl shadow-sm">
                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors text-xs font-semibold px-2 py-1"
                  >
                    <ChevronLeft size={15} /> Prev
                  </button>
                  <span className="text-slate-400 text-xs font-medium">
                    Halaman <span className="text-white font-bold">{currentPage}</span> dari {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors text-xs font-semibold px-2 py-1"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Match Cards */}
              {currentFixtures.map((fixture) => {
                const stakeFtrAmount = fixture.rl_stake_ftr * bankroll;
                const stakeOuAmount = fixture.rl_stake_ou * bankroll;
                const isExpanded = expandedId === fixture.id;
                const isSaved = savedFixtureIds.includes(fixture.id);
                const ext = fixture.extended_features || {};

                const ftrProbs = [
                  { label: 'Home', value: fixture.prob_ftr_h },
                  { label: 'Draw', value: fixture.prob_ftr_d },
                  { label: 'Away', value: fixture.prob_ftr_a }
                ];
                const mlFtrPick = ftrProbs.reduce((max, p) => p.value > max.value ? p : max, ftrProbs[0]);

                const ouProbs = [
                  { label: 'Over 2.5', value: fixture.prob_ou25_over },
                  { label: 'Under 2.5', value: fixture.prob_ou25_under }
                ];
                const mlOuPick = ouProbs.reduce((max, p) => p.value > max.value ? p : max, ouProbs[0]);

                return (
                  <div 
                    key={fixture.id} 
                    className={`bg-slate-900/80 border ${isExpanded ? 'border-emerald-500/50' : 'border-slate-800/80'} rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-700/80`}
                  >
                    {/* Match Card Header Bar */}
                    <div className="w-full bg-slate-950/60 px-4 sm:px-5 py-2.5 border-b border-slate-800/60 flex items-center justify-between gap-2">
                      
                      <div 
                        onClick={() => toggleMatch(fixture.id)} 
                        className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                        <span className="text-[11px] text-slate-300 font-medium truncate flex items-center gap-1.5">
                          {new Date(fixture.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA
                          <span className="ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 rounded-md text-emerald-400 font-semibold border border-slate-700">
                            <img 
                              src={getLeagueLogoUrl(fixture.league_code, fixture.league_name, fixture.league_logo, fixture.home_team_name)} 
                              alt="" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-3.5 h-3.5 object-contain shrink-0" 
                            />
                            {fixture.league_name || "Liga Eropa"}
                          </span>
                        </span>
                      </div>

                      {/* Header Right: Badges & Bookmark Star */}
                      <div className="flex items-center gap-2 shrink-0">
                        {fixture.rl_stake_ftr > 0 && (
                          <span className="hidden sm:inline-block bg-blue-900/30 border border-blue-800/50 text-blue-300 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            Value Bet FTR
                          </span>
                        )}
                        {fixture.rl_stake_ou > 0 && (
                          <span className="hidden sm:inline-block bg-purple-900/30 border border-purple-800/50 text-purple-300 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            Value Bet OU
                          </span>
                        )}

                        {/* Bookmark Button (Requirement 6) */}
                        <button
                          onClick={(e) => toggleSaveMatch(e, fixture.id)}
                          disabled={savingId === fixture.id}
                          title={isSaved ? "Hapus dari Match Favorit" : "Simpan ke Match Favorit"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isSaved 
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30' 
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-400 hover:border-slate-600'
                          }`}
                        >
                          <Star 
                            size={15} 
                            className={isSaved ? "fill-amber-400 text-amber-400" : "text-current"} 
                          />
                        </button>
                      </div>

                    </div>

                    {/* Match Card Body */}
                    <div 
                      onClick={() => toggleMatch(fixture.id)}
                      className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_1.5fr] gap-5 items-center cursor-pointer hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Left: Teams */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getTeamLogoUrl(fixture.home_team_name, fixture.home_team_logo)} 
                            alt="" 
                            onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                            className="w-6 h-6 object-contain shrink-0" 
                          />
                          <span className="font-bold text-white text-sm truncate">{fixture.home_team_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <img 
                            src={getTeamLogoUrl(fixture.away_team_name, fixture.away_team_logo)} 
                            alt="" 
                            onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                            className="w-6 h-6 object-contain shrink-0" 
                          />
                          <span className="font-bold text-white text-sm truncate">{fixture.away_team_name}</span>
                        </div>
                      </div>

                      {/* Middle: Odds & Probabilities */}
                      <div className="grid grid-cols-2 gap-3 border-y lg:border-y-0 lg:border-x border-slate-800 py-3 lg:py-0 lg:px-5">
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">1X2 Odds &amp; Peluang</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">H ({fixture.avg_h?.toFixed(2)}):</span>
                              <span className="font-mono text-white font-semibold">{(fixture.prob_ftr_h * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">D ({fixture.avg_d?.toFixed(2)}):</span>
                              <span className="font-mono text-white font-semibold">{(fixture.prob_ftr_d * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">A ({fixture.avg_a?.toFixed(2)}):</span>
                              <span className="font-mono text-white font-semibold">{(fixture.prob_ftr_a * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">O/U 2.5 Peluang</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Over ({fixture.avg_over_25?.toFixed(2)}):</span>
                              <span className="font-mono text-white font-semibold">{(fixture.prob_ou25_over * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Under ({fixture.avg_under_25?.toFixed(2)}):</span>
                              <span className="font-mono text-white font-semibold">{(fixture.prob_ou25_under * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: RL Recommendation & Stake */}
                      <div className="space-y-2.5">
                        {fixture.rl_stake_ftr > 0 ? (
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi FTR</span>
                              <span className="text-xs font-extrabold text-blue-400">
                                {fixture.rl_pick_ftr === 'H' ? 'Home' : fixture.rl_pick_ftr === 'D' ? 'Draw' : 'Away'} ({fixture.rl_action_ftr})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-slate-400">Saran Bet</span>
                              <span className="text-xs font-bold text-white font-mono">{formatCurrency(stakeFtrAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <div>
                              <span className="block text-[10px] text-slate-400">Prediksi ML (FTR)</span>
                              <span className="text-xs font-bold text-slate-300">{mlFtrPick.label} ({(mlFtrPick.value * 100).toFixed(0)}%)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Skip Bet</span>
                          </div>
                        )}

                        {fixture.rl_stake_ou > 0 ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi O/U</span>
                              <span className="text-xs font-extrabold text-purple-400">
                                {fixture.rl_pick_ou} ({fixture.rl_action_ou})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-slate-400">Saran Bet</span>
                              <span className="text-xs font-bold text-white font-mono">{formatCurrency(stakeOuAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="block text-[10px] text-slate-400">Prediksi ML (O/U)</span>
                              <span className="text-xs font-bold text-slate-300">{mlOuPick.label} ({(mlOuPick.value * 100).toFixed(0)}%)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Skip Bet</span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Extended Details Drawer */}
                    {isExpanded && (
                      <div className="bg-slate-900/90 border-t border-slate-800 p-4 sm:p-5 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart2 size={15} className="text-emerald-400" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Statistik Analitik &amp; Head-to-Head</h3>
                        </div>

                        <div className="grid grid-cols-[1.5fr_2fr_1.5fr] text-xs text-center border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                          <div className="p-2 font-bold text-white bg-slate-900 truncate flex items-center justify-center gap-1.5">
                            <img 
                              src={getTeamLogoUrl(fixture.home_team_name, fixture.home_team_logo)}
                              alt="" 
                              className="w-4 h-4 object-contain shrink-0"
                              onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                            />
                            <span className="truncate">{fixture.home_team_name}</span>
                          </div>
                          <div className="p-2 font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-900/80">Parameter</div>
                          <div className="p-2 font-bold text-white bg-slate-900 truncate flex items-center justify-center gap-1.5">
                            <img 
                              src={getTeamLogoUrl(fixture.away_team_name, fixture.away_team_logo)}
                              alt="" 
                              className="w-4 h-4 object-contain shrink-0"
                              onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                            />
                            <span className="truncate">{fixture.away_team_name}</span>
                          </div>

                          <div className="p-2 border-t border-slate-800 text-blue-400 font-mono">
                            {ext.elo_home != null && !isNaN(Number(ext.elo_home)) ? Math.round(Number(ext.elo_home)) : '-'}
                          </div>
                          <div className="p-2 border-t border-slate-800 text-slate-400 text-[11px]">Rating Elo</div>
                          <div className="p-2 border-t border-slate-800 text-blue-400 font-mono">
                            {ext.elo_away != null && !isNaN(Number(ext.elo_away)) ? Math.round(Number(ext.elo_away)) : '-'}
                          </div>

                          <div className="p-2 border-t border-slate-800 text-white font-mono">
                            {ext.home_league_pos != null && !isNaN(Number(ext.home_league_pos)) ? `#${Math.round(Number(ext.home_league_pos))}` : '-'}
                          </div>
                          <div className="p-2 border-t border-slate-800 text-slate-400 text-[11px]">Peringkat Klasemen</div>
                          <div className="p-2 border-t border-slate-800 text-white font-mono">
                            {ext.away_league_pos != null && !isNaN(Number(ext.away_league_pos)) ? `#${Math.round(Number(ext.away_league_pos))}` : '-'}
                          </div>

                          <div className="p-2 border-t border-slate-800 text-emerald-400 font-mono">
                            {ext.home_ppg != null && !isNaN(Number(ext.home_ppg)) ? Number(ext.home_ppg).toFixed(2) : '-'}
                          </div>
                          <div className="p-2 border-t border-slate-800 text-slate-400 text-[11px]">Poin Per Laga (PPG)</div>
                          <div className="p-2 border-t border-slate-800 text-emerald-400 font-mono">
                            {ext.away_ppg != null && !isNaN(Number(ext.away_ppg)) ? Number(ext.away_ppg).toFixed(2) : '-'}
                          </div>

                          <div className="p-2 border-t border-slate-800 text-white font-mono">
                            {ext.home_avg_scored != null && !isNaN(Number(ext.home_avg_scored)) ? Number(ext.home_avg_scored).toFixed(2) : '-'}
                          </div>
                          <div className="p-2 border-t border-slate-800 text-slate-400 text-[11px]">Rata-rata Gol Cetak</div>
                          <div className="p-2 border-t border-slate-800 text-white font-mono">
                            {ext.away_avg_scored != null && !isNaN(Number(ext.away_avg_scored)) ? Number(ext.away_avg_scored).toFixed(2) : '-'}
                          </div>
                        </div>

                        {(ext.h2h_home_wins != null || ext.h2h_draws != null || ext.h2h_away_wins != null) && (
                          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-around text-center text-xs">
                            <div>
                              <span className="block text-lg font-bold text-blue-400">{Math.round(Number(ext.h2h_home_wins || 0))}</span>
                              <span className="text-[10px] text-slate-400">Home Wins</span>
                            </div>
                            <div>
                              <span className="block text-lg font-bold text-slate-300">{Math.round(Number(ext.h2h_draws || 0))}</span>
                              <span className="text-[10px] text-slate-400">Draws</span>
                            </div>
                            <div>
                              <span className="block text-lg font-bold text-purple-400">{Math.round(Number(ext.h2h_away_wins || 0))}</span>
                              <span className="text-[10px] text-slate-400">Away Wins</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Star size={24} className="fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Login Diperlukan</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Silakan masuk ke akun Anda terlebih dahulu untuk dapat menyimpan pertandingan ke daftar favorit.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  router.push('/login');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <LogIn size={14} />
                <span>Masuk Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}