/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  ChevronDown, 
  ChevronUp, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  SlidersHorizontal, 
  X, 
  History, 
  Check 
} from 'lucide-react';
import { getOptimizedLogoUrl, getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

interface League {
  id: number;
  code: string;
  name: string;
  country: string;
  logo_url?: string;
}

interface MatchHistory {
  id: number;
  date: string;
  home_team_name: string;
  away_team_name: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  league_name: string;
  league_code?: string | null;
  league_logo?: string | null;
  fthg: number | null;
  ftag: number | null;
  ftr: string | null;
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
  is_won_ftr: boolean | null;
  rl_pick_ou: string;
  rl_action_ou: string;
  rl_stake_ou: number;
  is_won_ou: boolean | null;
  extended_features: any;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [bankroll, setBankroll] = useState<number>(500000);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('ALL');
  const [filterFtr, setFilterFtr] = useState(false);
  const [filterOu, setFilterOu] = useState(false);
  const [filterResult, setFilterResult] = useState('ALL');
  
  // UI & Pagination
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Load League List
  useEffect(() => {
    api.get('/leagues/')
      .then((res) => setLeagues(res.data.results || res.data))
      .catch((err) => console.error("Gagal memuat liga:", err));
  }, []);

  // Fetch History Reactively whenever filters change
  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {
      page: currentPage,
      page_size: itemsPerPage,
      ordering: '-date',
    };

    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (selectedLeagues.length > 0) params.leagues = selectedLeagues.join(',');
    if (selectedSeason !== 'ALL') params.season = selectedSeason;
    if (filterResult !== 'ALL') params.filter_result = filterResult;
    if (filterFtr) params.filter_ftr = 'true';
    if (filterOu) params.filter_ou = 'true';
    
    api.get('/history/', { params })
      .then((res) => {
        if (res.data && res.data.results) {
          setHistory(res.data.results);
          setTotalItems(res.data.count || 0);
        } else if (Array.isArray(res.data)) {
          setHistory(res.data);
          setTotalItems(res.data.length);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat histori:", err);
        setLoading(false);
      });
  }, [currentPage, selectedLeagues, selectedSeason, filterResult, filterFtr, filterOu, searchTerm]);

  // Reset page when filter criteria change
  const handleFilterChange = (updater: () => void) => {
    updater();
    setCurrentPage(1);
  };

  const toggleLeague = (code: string) => {
    handleFilterChange(() => {
      setSelectedLeagues((prev) => 
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      );
    });
  };

  const selectAllLeagues = () => {
    handleFilterChange(() => setSelectedLeagues([]));
  };

  const toggleMatch = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentHistory = history;

  const activeFilterCount = (selectedLeagues.length > 0 ? 1 : 0) + 
    (selectedSeason !== 'ALL' ? 1 : 0) + 
    (filterResult !== 'ALL' ? 1 : 0) + 
    (filterFtr ? 1 : 0) + 
    (filterOu ? 1 : 0) + 
    (searchTerm ? 1 : 0);

  const availableSeasons = ['ALL', '26/27', '25/26', '24/25', '23/24', '22/23', '21/22', '20/21'];

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-16 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <History size={13} />
            <span>Arsip Hasil &amp; Validasi Model</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Riwayat Pertandingan &amp; Hasil
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Evaluasi performa taruhan dan hasil pertandingan aktual yang telah diproses oleh model.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            {totalItems.toLocaleString('id-ID')} Total Data
          </span>
        </div>
      </div>

      {/* ================= COMPACT MOBILE FILTER BAR (Requirement 4) ================= */}
      {/* Keeps data immediately visible on mobile without long scroll */}
      <div className="lg:hidden mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
              placeholder="Cari tim sepak bola..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => handleFilterChange(() => setSearchTerm(''))} 
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
          <label htmlFor="mobile-history-league-select" className="sr-only">Pilih Liga</label>
          <select
            id="mobile-history-league-select"
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

        {/* Collapsible Mobile Details */}
        {isMobileFilterOpen && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3.5 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Pengaturan Lanjutan</span>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Musim</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => handleFilterChange(() => setSelectedSeason(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {availableSeasons.map(s => (
                    <option key={s} value={s}>{s === 'ALL' ? 'Semua Musim' : `Musim ${s}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status Hasil</label>
                <select
                  value={filterResult}
                  onChange={(e) => handleFilterChange(() => setFilterResult(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Hasil</option>
                  <option value="WON">Menang (Won)</option>
                  <option value="LOST">Kalah (Lost)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Bankroll Simulasi (Rp)</label>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={filterFtr}
                  onChange={(e) => handleFilterChange(() => setFilterFtr(e.target.checked))}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span>Hanya Tampilkan Rekomendasi FTR</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={filterOu}
                  onChange={(e) => handleFilterChange(() => setFilterOu(e.target.checked))}
                  className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0"
                />
                <span>Hanya Tampilkan Rekomendasi Over/Under</span>
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
              <span>Simulasi Bankroll</span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-Time</span>
            </h2>
            <div>
              <label htmlFor="history-bankroll-input" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Bankroll Simulasi (Rp)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-semibold">Rp</span>
                <input
                  id="history-bankroll-input"
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Filter Data & Multi-League Selection */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Filter Riwayat</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    handleFilterChange(() => {
                      setSearchTerm('');
                      setSelectedLeagues([]);
                      setSelectedSeason('ALL');
                      setFilterResult('ALL');
                      setFilterFtr(false);
                      setFilterOu(false);
                    });
                  }}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Reset Semua
                </button>
              )}
            </div>

            {/* Cari Tim */}
            <div>
              <label htmlFor="history-search-input" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cari Tim</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="history-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ketik nama klub..."
                />
              </div>
            </div>

            {/* Musim Dropdown */}
            <div>
              <label htmlFor="history-season-select" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Musim</label>
              <select
                id="history-season-select"
                value={selectedSeason}
                onChange={(e) => handleFilterChange(() => setSelectedSeason(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {availableSeasons.map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'Semua Musim' : `Musim ${s}`}</option>
                ))}
              </select>
            </div>

            {/* Status Hasil */}
            <div>
              <label htmlFor="history-result-select" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status Hasil</label>
              <select
                id="history-result-select"
                value={filterResult}
                onChange={(e) => handleFilterChange(() => setFilterResult(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">Semua Hasil</option>
                <option value="WON">Menang (Won)</option>
                <option value="LOST">Kalah (Lost)</option>
              </select>
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

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-900/60">
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

            {/* Checkboxes FTR & OU */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={filterFtr}
                  onChange={(e) => handleFilterChange(() => setFilterFtr(e.target.checked))}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Rekomendasi FTR Aktif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={filterOu}
                  onChange={(e) => handleFilterChange(() => setFilterOu(e.target.checked))}
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
              Mengambil arsip histori pertandingan...
            </div>
          ) : currentHistory.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-850 border border-slate-800 rounded-2xl">
              <p className="text-white font-semibold">Tidak Ada Data Riwayat yang Cocok</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Silakan sesuaikan kembali kriteria filter musim, status hasil, atau nama klub pencarian Anda.
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
              {currentHistory.map((match) => {
                const stakeFtrAmount = match.rl_stake_ftr * bankroll;
                const ftrOdds = match.rl_pick_ftr === 'H' ? match.avg_h : match.rl_pick_ftr === 'D' ? match.avg_d : match.avg_a;
                let ftrResultAmount = null;
                if (match.is_won_ftr === true) ftrResultAmount = stakeFtrAmount * ftrOdds;
                else if (match.is_won_ftr === false) ftrResultAmount = -stakeFtrAmount;
                
                const stakeOuAmount = match.rl_stake_ou * bankroll;
                const ouOdds = match.rl_pick_ou === 'Over 2.5' ? match.avg_over_25 : match.avg_under_25;
                let ouResultAmount = null;
                if (match.is_won_ou === true) ouResultAmount = stakeOuAmount * ouOdds;
                else if (match.is_won_ou === false) ouResultAmount = -stakeOuAmount;
                
                const isExpanded = expandedId === match.id;
                const ext = match.extended_features || {};

                const ftrProbs = [
                  { label: 'Home', code: 'H', value: match.prob_ftr_h },
                  { label: 'Draw', code: 'D', value: match.prob_ftr_d },
                  { label: 'Away', code: 'A', value: match.prob_ftr_a }
                ];
                const mlFtrPick = ftrProbs.reduce((max, p) => p.value > max.value ? p : max, ftrProbs[0]);

                const ouProbs = [
                  { label: 'Over 2.5', value: match.prob_ou25_over },
                  { label: 'Under 2.5', value: match.prob_ou25_under }
                ];
                const mlOuPick = ouProbs.reduce((max, p) => p.value > max.value ? p : max, ouProbs[0]);

                // Evaluasi status Menang/Kalah untuk semua prediksi ML
                const actualFtr = match.ftr || ((match.fthg !== null && match.ftag !== null) 
                  ? (match.fthg > match.ftag ? 'H' : match.fthg < match.ftag ? 'A' : 'D') 
                  : null);
                const isMlFtrWon = actualFtr ? mlFtrPick.code === actualFtr : null;

                const totalGoals = (match.fthg !== null && match.ftag !== null) ? (match.fthg + match.ftag) : null;
                const isMlOuWon = totalGoals !== null ? (mlOuPick.label === (totalGoals > 2.5 ? 'Over 2.5' : 'Under 2.5')) : null;

                return (
                  <div 
                    key={match.id} 
                    className={`bg-slate-900/80 border ${isExpanded ? 'border-emerald-500/50' : 'border-slate-800/80'} rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-700/80`}
                  >
                    {/* Header Bar */}
                    <button 
                      onClick={() => toggleMatch(match.id)}
                      className="w-full text-left bg-slate-900/80 px-4 sm:px-5 py-2.5 border-b border-slate-800/60 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                        <span className="text-[11px] text-slate-300 font-medium truncate flex items-center gap-1.5">
                          {new Date(match.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA
                          <span className="ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 rounded-md text-slate-300 font-semibold border border-slate-700">
                            <img 
                              src={getLeagueLogoUrl(match.league_code, match.league_name, match.league_logo, match.home_team_name)} 
                              alt="" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-3.5 h-3.5 object-contain shrink-0" 
                            />
                            {match.league_name || "Liga Eropa"}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-semibold font-mono">
                          FT {match.fthg ?? 0} - {match.ftag ?? 0}
                        </span>
                      </div>
                    </button>

                    {/* Match Card Body */}
                    <div 
                      onClick={() => toggleMatch(match.id)}
                      className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_1.5fr] gap-5 items-center cursor-pointer hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Left: Teams & Final Scores */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center pr-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <img 
                              src={getTeamLogoUrl(match.home_team_name, match.home_team_logo)} 
                              alt="" 
                              onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                              className="w-6 h-6 object-contain shrink-0" 
                            />
                            <span className="font-bold text-white text-sm truncate">{match.home_team_name}</span>
                          </div>
                          <span className="text-base text-emerald-400 font-mono font-extrabold">{match.fthg !== null ? match.fthg : '-'}</span>
                        </div>

                        <div className="flex justify-between items-center pr-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <img 
                              src={getTeamLogoUrl(match.away_team_name, match.away_team_logo)} 
                              alt="" 
                              onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                              className="w-6 h-6 object-contain shrink-0" 
                            />
                            <span className="font-bold text-white text-sm truncate">{match.away_team_name}</span>
                          </div>
                          <span className="text-base text-emerald-400 font-mono font-extrabold">{match.ftag !== null ? match.ftag : '-'}</span>
                        </div>
                      </div>

                      {/* Middle: Odds Akhir */}
                      <div className="grid grid-cols-2 gap-3 border-y lg:border-y-0 lg:border-x border-slate-800 py-3 lg:py-0 lg:px-5">
                        <div className="space-y-1 text-xs">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">1X2 Odds Akhir</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Home:</span>
                              <span className="font-mono text-white font-semibold">{match.avg_h?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Draw:</span>
                              <span className="font-mono text-white font-semibold">{match.avg_d?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Away:</span>
                              <span className="font-mono text-white font-semibold">{match.avg_a?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">O/U 2.5 Odds</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Over:</span>
                              <span className="font-mono text-white font-semibold">{match.avg_over_25?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Under:</span>
                              <span className="font-mono text-white font-semibold">{match.avg_under_25?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Evaluasi Taruhan & Return */}
                      <div className="space-y-2.5">
                        {match.rl_stake_ftr > 0 ? (
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi FTR</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-blue-400">
                                  {match.rl_pick_ftr === 'H' ? 'Home' : match.rl_pick_ftr === 'D' ? 'Draw' : 'Away'}
                                </span>
                                {match.is_won_ftr === true && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                    MENANG
                                  </span>
                                )}
                                {match.is_won_ftr === false && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">
                                    KALAH
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {ftrResultAmount !== null && (
                                <span className={`text-xs font-bold font-mono ${match.is_won_ftr ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {match.is_won_ftr ? '+' : ''}{formatCurrency(ftrResultAmount)}
                                </span>
                              )}
                              <span className="block text-[10px] text-slate-400 font-mono">Modal {formatCurrency(stakeFtrAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-xs">
                            <div>
                              <span className="block text-[10px] text-slate-400">Prediksi FTR: <strong className="text-white font-semibold">{mlFtrPick.label}</strong></span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isMlFtrWon === true && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                    MENANG
                                  </span>
                                )}
                                {isMlFtrWon === false && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">
                                    KALAH
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Skip Bet</span>
                          </div>
                        )}

                        {match.rl_stake_ou > 0 ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi O/U</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-purple-400">{match.rl_pick_ou}</span>
                                {match.is_won_ou === true && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                    MENANG
                                  </span>
                                )}
                                {match.is_won_ou === false && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">
                                    KALAH
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {ouResultAmount !== null && (
                                <span className={`text-xs font-bold font-mono ${match.is_won_ou ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {match.is_won_ou ? '+' : ''}{formatCurrency(ouResultAmount)}
                                </span>
                              )}
                              <span className="block text-[10px] text-slate-400 font-mono">Modal {formatCurrency(stakeOuAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="block text-[10px] text-slate-400">Prediksi O/U: <strong className="text-white font-semibold">{mlOuPick.label}</strong></span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isMlOuWon === true && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                    MENANG
                                  </span>
                                )}
                                {isMlOuWon === false && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">
                                    KALAH
                                  </span>
                                )}
                              </div>
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
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Statistik Pertandingan</h3>
                        </div>

                        <div className="grid grid-cols-[1.5fr_2fr_1.5fr] text-xs text-center border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                          <div className="p-2 font-bold text-white bg-slate-900 truncate">{match.home_team_name}</div>
                          <div className="p-2 font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-900/80">Parameter</div>
                          <div className="p-2 font-bold text-white bg-slate-900 truncate">{match.away_team_name}</div>

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

    </div>
  );
}