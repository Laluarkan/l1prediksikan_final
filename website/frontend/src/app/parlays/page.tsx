/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import api from '@/lib/axios';
import { 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  SlidersHorizontal,
  X 
} from 'lucide-react';
import { getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

interface ParlayLeg {
  match?: string;
  match_name?: string;
  home_team?: string;
  away_team?: string;
  home_team_logo?: string;
  away_team_logo?: string;
  league?: string;
  league_code?: string;
  league_name?: string;
  league_logo?: string;
  pick: string;
  odds: number;
  prob?: number;
  market_type?: string;
}

interface ParlayTicket {
  id: number;
  ticket_id: string;
  date: string;
  total_odds: number;
  total_prob: number;
  legs_count: number;
  is_won: boolean | null;
  legs_details: ParlayLeg[];
}

export default function ParlaysPage() {
  const { status } = useSession();
  const [tickets, setTickets] = useState<ParlayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [ticketStake, setTicketStake] = useState<number>(50000);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (status !== 'authenticated') return;
    
    setLoading(true);
    const params: Record<string, any> = {
      is_historical: false,
      page_size: 1000,
    };
    
    api.get('/parlays/', { params })
      .then((res) => {
        if (res.data && res.data.results) {
          setTickets(res.data.results);
        } else if (Array.isArray(res.data)) {
          setTickets(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [status]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const toggleTicket = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  // Client-side instant filtering & sorting (descending)
  const displayedTickets = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const cleanSearch = searchTerm.trim().toLowerCase();
    
    if (!cleanSearch) return sorted;

    return sorted.filter(ticket => {
      const matchId = ticket.ticket_id?.toLowerCase().includes(cleanSearch);
      const matchLeg = ticket.legs_details?.some(leg => 
        leg.match_name?.toLowerCase().includes(cleanSearch) || 
        leg.pick?.toLowerCase().includes(cleanSearch)
      );
      return matchId || matchLeg;
    });
  }, [tickets, searchTerm]);

  const totalPages = Math.ceil(displayedTickets.length / itemsPerPage);
  const currentTickets = displayedTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-400 font-medium">
        Memeriksa otorisasi sesi...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="bg-slate-900/90 border border-slate-800/80 p-8 md:p-10 rounded-3xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner">
              <Lock className="text-emerald-400" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Akses Khusus Member</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Rekomendasi kombinasi tiket Parlay AI dengan probabilitas matematis tinggi ini eksklusif untuk pengguna terdaftar.
            </p>
            <button
              onClick={() => signIn('google')}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-16 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tiket Parlay Pertandingan Mendatang
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Kombinasi value bet probabilitas tinggi jadwal mendatang untuk memaksimalkan potensi return.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            {displayedTickets.length} Tiket Tersedia
          </span>
        </div>
      </div>

      {/* ================= COMPACT MOBILE FILTER BAR (Requirement 4) ================= */}
      <div className="lg:hidden mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari ID tiket atau nama klub..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border bg-slate-800 border-slate-700 text-slate-300"
          >
            <SlidersHorizontal size={14} />
            <span>Modal</span>
          </button>
        </div>

        {isMobileFilterOpen && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Simulasi Nilai Taruhan</span>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nilai Bet per Tiket (Rp)</label>
              <input
                type="number"
                value={ticketStake}
                onChange={(e) => setTicketStake(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Desktop Sidebar Filter (Hidden on Mobile) */}
        <div className="hidden lg:block w-72 flex-shrink-0 space-y-4">
          
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Pengaturan Taruhan</span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-Time</span>
            </h2>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nilai Bet per Tiket (Rp)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-semibold">Rp</span>
                <input
                  type="number"
                  value={ticketStake}
                  onChange={(e) => setTicketStake(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Kalkulasi potensi bayaran (payout) langsung diperbarui otomatis berdasarkan nilai bet ini.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Cari Tiket</h2>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cari ID Tiket / Klub</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ketik ID Tiket..."
                />
              </div>
            </div>
          </div>

        </div>

        {/* Parlay Tickets List */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-16 text-sm text-slate-400 bg-slate-850/60 border border-slate-800 rounded-2xl animate-pulse">
              Memuat data tiket parlay...
            </div>
          ) : currentTickets.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-850 border border-slate-800 rounded-2xl">
              <p className="text-white font-semibold">Tidak Ada Tiket yang Cocok</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Belum ada tiket parlay pertandingan mendatang yang sesuai dengan pencarian Anda.
              </p>
            </div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-xl shadow-sm">
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
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
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors text-xs font-semibold px-2 py-1"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {currentTickets.map((ticket) => {
                const payout = ticketStake * ticket.total_odds;
                const isExpanded = expandedId === ticket.id;

                return (
                  <div 
                    key={ticket.id} 
                    className={`bg-slate-900/80 border ${isExpanded ? 'border-emerald-500/50' : 'border-slate-800/80'} rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-700/80`}
                  >
                    <div 
                      onClick={() => toggleTicket(ticket.id)}
                      className="bg-slate-900/80 px-4 sm:px-5 py-3 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-xs sm:text-sm tracking-wide">{ticket.ticket_id}</span>
                            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                              {ticket.legs_count} Kaki (Legs)
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(ticket.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="block text-[10px] text-slate-400">Total Odds</span>
                          <span className="font-bold text-amber-400 text-sm">{ticket.total_odds.toFixed(2)}</span>
                        </div>
                        <div className="border-l border-slate-800 pl-4">
                          <span className="block text-[10px] text-slate-400">Probabilitas</span>
                          <span className="font-bold text-emerald-400 text-sm">{(ticket.total_prob * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Ringkasan Pertandingan di Tiket:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ticket.legs_details.map((leg, idx) => {
                            const matchName = leg.match_name || leg.match || 'Pertandingan';
                            return (
                              <span key={idx} className="bg-slate-950/60 border border-slate-800/70 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
                                {matchName} <strong className="text-emerald-400 font-mono">({leg.pick})</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                        <span className="block text-[10px] text-slate-400">Estimasi Kemenangan</span>
                        <span className="text-base sm:text-lg font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                          {formatCurrency(payout)}
                        </span>
                        <span className="block text-[10px] text-slate-400">Modal: {formatCurrency(ticketStake)}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-900/90 border-t border-slate-800 p-4 sm:p-5 animate-fadeIn">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Detail Kaki Pertandingan (Legs)</h3>
                        <div className="space-y-2">
                          {ticket.legs_details.map((leg, idx) => {
                            const matchName = leg.match_name || leg.match || 'Pertandingan';
                            const parts = matchName.split(/\s+vs\s+/i);
                            const homeTeam = leg.home_team || (parts.length > 0 ? parts[0].trim() : '');
                            const awayTeam = leg.away_team || (parts.length > 1 ? parts[1].trim() : '');
                            const leagueCode = leg.league_code || leg.league || '';
                            const leagueName = leg.league_name || '';

                            const probVal = typeof leg.prob === 'number' && !isNaN(leg.prob) 
                              ? leg.prob 
                              : (leg.odds && leg.odds > 0 ? (1 / leg.odds) : 0.5);
                            const oddsVal = typeof leg.odds === 'number' && !isNaN(leg.odds) ? leg.odds.toFixed(2) : '-';

                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 gap-3 text-xs">
                                {/* Left side: [Logo Liga] | [Logo Tim Home] Nama vs [Logo Tim Away] Nama */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Logo Liga di kirinya */}
                                  <div className="flex items-center gap-1.5 shrink-0" title={leagueName || leagueCode || 'Liga'}>
                                    <img 
                                      src={getLeagueLogoUrl(leagueCode, leagueName, leg.league_logo, homeTeam)} 
                                      alt="" 
                                      className="w-5 h-5 object-contain shrink-0"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    {leagueCode && (
                                      <span className="text-[10px] font-mono text-slate-400 hidden xs:inline">{leagueCode}</span>
                                    )}
                                  </div>

                                  {/* Batas pemisah vertikal */}
                                  <div className="h-6 w-px bg-slate-700/80 shrink-0" />

                                  {/* Logo dan tim match di samping batas */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <img 
                                        src={getTeamLogoUrl(homeTeam, leg.home_team_logo)} 
                                        alt="" 
                                        className="w-4 h-4 object-contain shrink-0"
                                        onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                                      />
                                      <span className="font-bold text-white truncate max-w-[130px] sm:max-w-[160px]">{homeTeam}</span>
                                    </div>
                                    
                                    <span className="text-[10px] text-slate-500 font-semibold uppercase px-0.5">vs</span>

                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <img 
                                        src={getTeamLogoUrl(awayTeam, leg.away_team_logo)} 
                                        alt="" 
                                        className="w-4 h-4 object-contain shrink-0"
                                        onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                                      />
                                      <span className="font-bold text-white truncate max-w-[130px] sm:max-w-[160px]">{awayTeam}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right side: Pick, Market, Odds, Prob */}
                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                                  <div className="text-left sm:text-right">
                                    <span className="text-[11px] text-slate-400 font-mono block">
                                      Pilihan: <strong className="text-emerald-400">{leg.pick}</strong>
                                    </span>
                                    <span className="text-[10px] text-slate-500">{leg.market_type || 'Over/Under 2.5'}</span>
                                  </div>

                                  <div className="text-right font-mono border-l border-slate-800 pl-3">
                                    <span className="text-slate-400 block text-[10px]">
                                      Odds: <strong className="text-white">{oddsVal}</strong>
                                    </span>
                                    <span className="text-emerald-400 text-[11px]">{(probVal * 100).toFixed(1)}% Est</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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