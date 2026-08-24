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

interface Fixture {
  id: number;
  date: string;
  home_team_name: string;
  away_team_name: string;
  league_name: string;
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
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [bankroll, setBankroll] = useState<number>(100000);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('');
  const [filterFtr, setFilterFtr] = useState(false);
  const [filterOu, setFilterOu] = useState(false);
  const [minOdds, setMinOdds] = useState<number>(1.0);
  const [triggerFetch, setTriggerFetch] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api.get('/leagues/')
      .then((res) => setLeagues(res.data.results || res.data))
      .catch((err) => console.error("Gagal memuat liga:", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {
      is_processed: true 
    };
    if (searchTerm) params.search = searchTerm;
    if (selectedLeague) params.league__code = selectedLeague;
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
  }, [triggerFetch]);

  const applyFilters = () => {
    setTriggerFetch((prev) => prev + 1);
    setExpandedId(null);
    setCurrentPage(1); 
  };

  const toggleMatch = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const displayedFixtures = fixtures.filter(f => {
    const fixtureDate = new Date(f.date).getTime();
    const now = new Date().getTime();
    if (fixtureDate < now) return false;

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

  const totalPages = Math.ceil(displayedFixtures.length / itemsPerPage);
  const currentFixtures = displayedFixtures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Upcoming Fixtures</h1>
        <p className="text-slate-400 text-sm mt-1">Jadwal pertandingan mendatang beserta analisis value bet dan rekomendasi ukuran taruhan agen RL.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4">Pengaturan Modal</h2>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bankroll (Rp)</label>
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
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Minimum Odds Rekomendasi</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  value={minOdds}
                  onChange={(e) => setMinOdds(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
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
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Harus ada Value Bet FTR</span>
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
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Harus ada Value Bet O/U</span>
                </label>
              </div>

              <button 
                onClick={applyFilters}
                className="w-full mt-4 bg-slate-700 hover:bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-md transition-colors"
              >
                Terapkan Pencarian
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-xl">Memuat data dari API...</div>
          ) : currentFixtures.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-xl">Tidak ada jadwal pertandingan yang sesuai dengan kriteria filter Anda.</div>
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

              {currentFixtures.map((fixture) => {
                const stakeFtrAmount = fixture.rl_stake_ftr * bankroll;
                const stakeOuAmount = fixture.rl_stake_ou * bankroll;
                const isExpanded = expandedId === fixture.id;
                const ext = fixture.extended_features || {};

                return (
                  <div key={fixture.id} className={`bg-slate-800 border ${isExpanded ? 'border-blue-500/50' : 'border-slate-700'} rounded-xl overflow-hidden shadow-sm transition-colors`}>
                    <div 
                      onClick={() => toggleMatch(fixture.id)}
                      className="bg-slate-800/60 px-5 py-2.5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-slate-400">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(fixture.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA
                          <span className="mx-2 px-2 py-0.5 bg-slate-700/50 rounded text-slate-300">{fixture.league_name || "Liga Eropa"}</span>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {fixture.rl_stake_ftr > 0 && (
                          <span className="bg-blue-900/30 border border-blue-800/50 text-blue-300 text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide">Value Bet FTR</span>
                        )}
                        {fixture.rl_stake_ou > 0 && (
                          <span className="bg-purple-900/30 border border-purple-800/50 text-purple-300 text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide">Value Bet OU</span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.5fr_2fr_1.5fr] gap-6 items-center">
                      <div className="space-y-1">
                        <div className="text-base font-bold text-white flex flex-col space-y-0.5">
                          <span>{fixture.home_team_name}</span>
                          <span className="text-[11px] text-slate-500 font-normal uppercase tracking-widest">vs</span>
                          <span>{fixture.away_team_name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-y lg:border-y-0 lg:border-x border-slate-700 py-4 lg:py-0 lg:px-6">
                        <div className="space-y-2">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">1X2 Odds & Probabilitas</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span>Home ({fixture.avg_h?.toFixed(2)}):</span>
                              <span className="font-mono text-white">{(fixture.prob_ftr_h * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Draw ({fixture.avg_d?.toFixed(2)}):</span>
                              <span className="font-mono text-white">{(fixture.prob_ftr_d * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Away ({fixture.avg_a?.toFixed(2)}):</span>
                              <span className="font-mono text-white">{(fixture.prob_ftr_a * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">O/U 2.5 Odds & Probabilitas</span>
                          <div className="text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span>Over ({fixture.avg_over_25?.toFixed(2)}):</span>
                              <span className="font-mono text-white">{(fixture.prob_ou25_over * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Under ({fixture.avg_under_25?.toFixed(2)}):</span>
                              <span className="font-mono text-white">{(fixture.prob_ou25_under * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {fixture.rl_stake_ftr > 0 ? (
                          <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi FTR ({fixture.rl_pick_ftr})</span>
                              <span className="text-xs text-blue-400 font-medium">{fixture.rl_action_ftr}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-slate-500">Saran Bet</span>
                              <span className="text-sm font-bold text-white">{formatCurrency(stakeFtrAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 italic pb-2 border-b border-slate-700/50">Tidak ada rekomendasi bet untuk pasar FTR.</div>
                        )}

                        {fixture.rl_stake_ou > 0 ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="block text-[10px] text-slate-400">Rekomendasi O/U ({fixture.rl_pick_ou})</span>
                              <span className="text-xs text-purple-400 font-medium">{fixture.rl_action_ou}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-slate-500">Saran Bet</span>
                              <span className="text-sm font-bold text-white">{formatCurrency(stakeOuAmount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 italic">Tidak ada rekomendasi bet untuk pasar O/U.</div>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-900/80 border-t border-slate-700 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart2 size={16} className="text-blue-500" />
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statistik Analitik & Formasi</h4>
                        </div>
                        
                        <div className="grid grid-cols-[1fr_2fr_1fr] text-sm text-center">
                          <div className="font-bold text-white bg-slate-800/50 p-2 rounded-l-lg">{fixture.home_team_name}</div>
                          <div className="text-slate-500 text-xs font-bold uppercase tracking-widest p-2 bg-slate-800/20">Parameter</div>
                          <div className="font-bold text-white bg-slate-800/50 p-2 rounded-r-lg">{fixture.away_team_name}</div>

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