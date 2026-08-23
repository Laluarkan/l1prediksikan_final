/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { ChevronDown, ChevronUp, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';

interface League {
  id: number;
  code: string;
  name: string;
  country: string;
}

interface MatchHistory {
  id: number;
  date: string;
  home_team_name: string;
  away_team_name: string;
  league_name: string;
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
  
  const [bankroll, setBankroll] = useState<number>(1000000);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('');
  const [filterFtr, setFilterFtr] = useState(false);
  const [filterOu, setFilterOu] = useState(false);
  const [filterResult, setFilterResult] = useState('ALL');
  const [triggerFetch, setTriggerFetch] = useState(0);
  
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // State untuk Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api.get('/leagues/')
      .then((res) => setLeagues(res.data.results || res.data))
      .catch((err) => console.error("Gagal memuat liga:", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedLeague) params.league__code = selectedLeague;

    api.get('/history/', { params })
      .then((res) => {
        if (res.data && res.data.results) {
          setHistory(res.data.results);
        } else if (Array.isArray(res.data)) {
          setHistory(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat histori:", err);
        setLoading(false);
      });
  }, [triggerFetch]);

  const applyFilters = () => {
    setTriggerFetch((prev) => prev + 1);
    setExpandedId(null);
    setCurrentPage(1); // Reset ke halaman pertama setiap memfilter
  };

  const toggleMatch = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  // Pastikan data terurut dari yang PALING BARU ke yang terlama
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayedHistory = sortedHistory.filter(h => {
    // LOGIKA MUSIM INI (Mulai dari 1 Juli tahun bersangkutan)
    const matchDate = new Date(h.date).getTime();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 6 = Jul
    
    // Jika bulan saat ini Juli ke atas, maka musim dimulai tahun ini. Jika sebelum Juli, musim dimulai tahun lalu.
    const seasonStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
    const seasonStartDate = new Date(seasonStartYear, 6, 1).getTime(); // 1 Juli Musim Ini

    if (matchDate < seasonStartDate) return false; // Buang data musim lalu

    if (filterFtr && (!h.rl_stake_ftr || h.rl_stake_ftr <= 0)) return false;
    if (filterOu && (!h.rl_stake_ou || h.rl_stake_ou <= 0)) return false;

    if (filterResult !== 'ALL') {
      const ftrValid = h.rl_stake_ftr > 0;
      const ouValid = h.rl_stake_ou > 0;
      
      let isWon = false;
      let isLost = false;

      if (ftrValid) {
        if (h.is_won_ftr === true) isWon = true;
        if (h.is_won_ftr === false) isLost = true;
      }
      if (ouValid) {
        if (h.is_won_ou === true) isWon = true;
        if (h.is_won_ou === false) isLost = true;
      }

      if (filterResult === 'WON' && !isWon) return false;
      if (filterResult === 'LOST' && !isLost) return false;
    }

    return true;
  });

  // Logika Pemotongan Data untuk Paginasi
  const totalPages = Math.ceil(displayedHistory.length / itemsPerPage);
  const currentHistory = displayedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 px-4">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Match History</h1>
        <p className="text-slate-400 text-sm mt-1">Evaluasi performa taruhan dan hasil pertandingan <span className="text-blue-400 font-semibold">Musim Ini</span> yang telah diproses oleh sistem.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4">Pengaturan Modal</h2>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bankroll Simulasi (Rp)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium">Rp</span>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white text-sm font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4">Filter Data</h2>
            <div className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cari Tim</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Ketik nama tim..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Liga</label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">Semua Liga</option>
                  {leagues.map((l) => (
                    <option key={l.id} value={l.code}>{l.name} ({l.country})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status Taruhan</label>
                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="ALL">Semua Hasil</option>
                  <option value="WON">Menang (Won)</option>
                  <option value="LOST">Kalah (Lost)</option>
                </select>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-700/50">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={filterFtr}
                      onChange={(e) => setFilterFtr(e.target.checked)}
                      className="peer w-4 h-4 cursor-pointer appearance-none rounded border border-slate-600 bg-slate-900 checked:bg-blue-600 checked:border-blue-600 transition-all" 
                    />
                    <svg className="absolute w-4 h-4 pointer-events-none hidden peer-checked:block text-white p-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Menampilkan Value Bet FTR</span>
                </label>
                
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={filterOu}
                      onChange={(e) => setFilterOu(e.target.checked)}
                      className="peer w-4 h-4 cursor-pointer appearance-none rounded border border-slate-600 bg-slate-900 checked:bg-purple-600 checked:border-purple-600 transition-all" 
                    />
                    <svg className="absolute w-4 h-4 pointer-events-none hidden peer-checked:block text-white p-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Menampilkan Value Bet O/U</span>
                </label>
              </div>

              <button 
                onClick={applyFilters}
                className="w-full mt-4 bg-slate-700 hover:bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-md transition-colors"
              >
                Terapkan Pencarian API
              </button>
            </div>
          </div>

        </div>

        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-xl">Memuat data histori...</div>
          ) : currentHistory.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-xl">Tidak ada data historis musim ini yang sesuai dengan kriteria filter Anda.</div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-slate-800/80 border border-slate-700 px-5 py-3 rounded-xl mb-6 shadow-sm">
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors text-sm font-semibold"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="text-slate-400 text-xs font-medium tracking-wide">
                    Halaman <span className="text-white font-bold">{currentPage}</span> dari {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors text-sm font-semibold"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}

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

                return (
                  <div key={match.id} className={`bg-slate-800 border ${isExpanded ? 'border-blue-500/50' : 'border-slate-700'} rounded-xl overflow-hidden shadow-sm transition-colors`}>
                    
                    <div 
                      onClick={() => toggleMatch(match.id)}
                      className="bg-slate-800/60 px-5 py-2.5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-slate-400">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(match.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA 
                          <span className="mx-2 px-2 py-0.5 bg-slate-700/50 rounded text-slate-300">{match.league_name || "Liga Eropa"}</span>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-slate-700 border border-slate-600 text-white text-[10px] px-2 py-0.5 rounded font-semibold">Hasil Akhir</span>
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_1.5fr] gap-6 items-center">
                      
                      <div className="space-y-1">
                        <div className="text-base font-bold text-white flex flex-col space-y-2">
                          <div className="flex justify-between items-center pr-4">
                            <span>{match.home_team_name}</span>
                            <span className="text-lg text-emerald-400 font-mono">{match.fthg !== null ? match.fthg : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center pr-4">
                            <span>{match.away_team_name}</span>
                            <span className="text-lg text-emerald-400 font-mono">{match.ftag !== null ? match.ftag : '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-y lg:border-y-0 lg:border-x border-slate-700 py-4 lg:py-0 lg:px-6">
                        <div className="space-y-2">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">1X2 Odds Akhir</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span>Home:</span>
                              <span className="font-mono text-white">{match.avg_h?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Draw:</span>
                              <span className="font-mono text-white">{match.avg_d?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Away:</span>
                              <span className="font-mono text-white">{match.avg_a?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">O/U 2.5 Odds Akhir</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span>Over:</span>
                              <span className="font-mono text-white">{match.avg_over_25?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Under:</span>
                              <span className="font-mono text-white">{match.avg_under_25?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {match.rl_stake_ftr > 0 ? (
                          <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi FTR ({match.rl_pick_ftr})</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-blue-400 font-medium">{match.rl_action_ftr}</span>
                                {match.is_won_ftr === true && <span className="text-[9px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">MENANG</span>}
                                {match.is_won_ftr === false && <span className="text-[9px] bg-rose-900/50 text-rose-400 px-1.5 py-0.5 rounded">KALAH</span>}
                              </div>
                            </div>
                            <div className="flex gap-4 text-right">
                              <div>
                                <span className="block text-[10px] text-slate-500">Saran Bet</span>
                                <span className="text-sm font-bold text-white">{formatCurrency(stakeFtrAmount)}</span>
                              </div>
                              {ftrResultAmount !== null && (
                                <div className="border-l border-slate-700/50 pl-4">
                                  <span className="block text-[10px] text-slate-500">Return</span>
                                  <span className={`text-sm font-bold ${match.is_won_ftr ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {match.is_won_ftr ? '+' : ''}{formatCurrency(ftrResultAmount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 italic pb-2 border-b border-slate-700/50">Skip FTR</div>
                        )}

                        {match.rl_stake_ou > 0 ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi O/U ({match.rl_pick_ou})</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-purple-400 font-medium">{match.rl_action_ou}</span>
                                {match.is_won_ou === true && <span className="text-[9px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">MENANG</span>}
                                {match.is_won_ou === false && <span className="text-[9px] bg-rose-900/50 text-rose-400 px-1.5 py-0.5 rounded">KALAH</span>}
                              </div>
                            </div>
                            <div className="flex gap-4 text-right">
                              <div>
                                <span className="block text-[10px] text-slate-500">Saran Bet</span>
                                <span className="text-sm font-bold text-white">{formatCurrency(stakeOuAmount)}</span>
                              </div>
                              {ouResultAmount !== null && (
                                <div className="border-l border-slate-700/50 pl-4">
                                  <span className="block text-[10px] text-slate-500">Return</span>
                                  <span className={`text-sm font-bold ${match.is_won_ou ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {match.is_won_ou ? '+' : ''}{formatCurrency(ouResultAmount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 italic">Skip O/U</div>
                        )}
                      </div>

                    </div>

                    {/* Dropdown Statistik Lengkap Tim */}
                    {isExpanded && (
                      <div className="bg-slate-900/80 border-t border-slate-700 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart2 size={16} className="text-blue-500" />
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statistik Rata-Rata (Rolling) Pra-Pertandingan</h4>
                        </div>
                        
                        <div className="grid grid-cols-[1fr_2fr_1fr] text-sm text-center">
                          <div className="font-bold text-white bg-slate-800/50 p-2 rounded-l-lg">{match.home_team_name}</div>
                          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest p-2 bg-slate-800/20">Parameter</div>
                          <div className="font-bold text-white bg-slate-800/50 p-2 rounded-r-lg">{match.away_team_name}</div>

                          <div className="p-3 border-b border-slate-700 text-blue-400 font-mono">
                            {ext.elo_home?.toFixed(0) || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Rating Elo</div>
                          <div className="p-3 border-b border-slate-700 text-blue-400 font-mono">
                            {ext.elo_away?.toFixed(0) || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.home_league_pos || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Peringkat Liga</div>
                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.away_league_pos || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.home_points || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Total Poin</div>
                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.away_points || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-emerald-400 font-mono">
                            {ext.home_ppg?.toFixed(2) || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Poin Per Match (PPG)</div>
                          <div className="p-3 border-b border-slate-700 text-emerald-400 font-mono">
                            {ext.away_ppg?.toFixed(2) || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.home_avg_scored?.toFixed(2) || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Avg Gol Dicetak</div>
                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.away_avg_scored?.toFixed(2) || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.home_avg_conceded?.toFixed(2) || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Avg Kebobolan</div>
                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.away_avg_conceded?.toFixed(2) || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.home_gd || '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Selisih Gol (GD)</div>
                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.away_gd || '-'}
                          </div>

                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.home_clean_sheet_rate !== undefined ? `${(ext.home_clean_sheet_rate * 100).toFixed(0)}%` : '-'}
                          </div>
                          <div className="p-3 border-b border-slate-700 text-[11px] text-slate-400 uppercase">Clean Sheet Rate</div>
                          <div className="p-3 border-b border-slate-700 text-white font-mono">
                            {ext.away_clean_sheet_rate !== undefined ? `${(ext.away_clean_sheet_rate * 100).toFixed(0)}%` : '-'}
                          </div>
                          
                          <div className="p-3 text-white font-mono">
                            {ext.home_btts_rate !== undefined ? `${(ext.home_btts_rate * 100).toFixed(0)}%` : '-'}
                          </div>
                          <div className="p-3 text-[11px] text-slate-400 uppercase">BTTS Rate (Both Score)</div>
                          <div className="p-3 text-white font-mono">
                            {ext.away_btts_rate !== undefined ? `${(ext.away_btts_rate * 100).toFixed(0)}%` : '-'}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-700">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Sejarah Head to Head</h4>
                          <div className="flex justify-center gap-8 text-sm font-mono text-white">
                             <div className="text-center">
                               <span className="block text-xl text-blue-400">{ext.h2h_home_wins ?? '-'}</span>
                               <span className="text-[9px] text-slate-500 uppercase tracking-widest">Home Win</span>
                             </div>
                             <div className="text-center">
                               <span className="block text-xl text-slate-300">{ext.h2h_draws ?? '-'}</span>
                               <span className="text-[9px] text-slate-500 uppercase tracking-widest">Draws</span>
                             </div>
                             <div className="text-center">
                               <span className="block text-xl text-purple-400">{ext.h2h_away_wins ?? '-'}</span>
                               <span className="text-[9px] text-slate-500 uppercase tracking-widest">Away Win</span>
                             </div>
                             <div className="text-center border-l border-slate-700 pl-8 ml-4">
                               <span className="block text-xl text-emerald-400">{ext.h2h_avg_goals?.toFixed(1) ?? '-'}</span>
                               <span className="text-[9px] text-slate-500 uppercase tracking-widest">Avg Goals/Match</span>
                             </div>
                          </div>
                        </div>
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