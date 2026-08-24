/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';

interface ParlayLeg {
  match: string;
  pick: string;
  odds: number;
  date?: string;
  is_won?: boolean | null;
}

interface ParlayTicket {
  id: number;
  ticket_id: string;
  date: string;
  total_odds: number;
  total_prob: number;
  is_won: boolean | null;
  is_historical: boolean;
  legs_details?: ParlayLeg[]; 
}

export default function ParlaysPage() {
  const { status } = useSession();
  
  const [tickets, setTickets] = useState<ParlayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [ticketStake, setTicketStake] = useState<number>(10000); 
  const [searchTerm, setSearchTerm] = useState('');
  const [triggerFetch, setTriggerFetch] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (status !== "authenticated") return;

    setLoading(true);
    const params: Record<string, any> = {
      ordering: '-date',
      is_historical: false 
    };
    
    if (searchTerm) params.search = searchTerm;
    
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
  }, [triggerFetch, status]);

  const applyFilters = () => {
    setTriggerFetch((prev) => prev + 1);
    setExpandedId(null); 
    setCurrentPage(1); 
  };

  const toggleTicket = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  if (status === "loading") {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-400 font-medium">Memeriksa otorisasi sesi...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="bg-slate-800 border border-slate-700 p-8 md:p-10 rounded-2xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent z-0"></div>
          <div className="relative z-10">
            <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner">
              <Lock className="text-blue-500" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Akses Eksklusif</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Rekomendasi kombinasi tiket Upcoming Parlay dengan probabilitas kemenangan tinggi ini khusus untuk pengguna terdaftar.
            </p>
            <button
              onClick={() => signIn('google')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mengubah urutan menjadi Descending (Terbaru ke Terlama)
  const displayedTickets = [...tickets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(displayedTickets.length / itemsPerPage);
  const currentTickets = displayedTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Upcoming Parlay Tickets</h1>
        <p className="text-slate-400 text-sm mt-1">Kombinasi value bet probabilitas tinggi jadwal mendatang untuk memaksimalkan potensi return.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4">Pengaturan Taruhan</h2>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nilai Bet per Tiket (Rp)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium">Rp</span>
                <input
                  type="number"
                  value={ticketStake}
                  onChange={(e) => setTicketStake(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white text-sm font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Taruhan parlay memiliki variansi tinggi. Direkomendasikan menggunakan persentase kecil dari total bankroll.</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4">Filter Data</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cari ID Tiket</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Ketik ID Tiket..."
                />
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
            <div className="text-center py-12 text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-xl">Memuat data tiket parlay...</div>
          ) : currentTickets.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-xl">Tidak ada tiket parlay pertandingan mendatang yang ditemukan.</div>
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

              {currentTickets.map((ticket) => {
                const payout = ticketStake * ticket.total_odds;
                const isExpanded = expandedId === ticket.id;

                return (
                  <div key={ticket.id} className={`bg-slate-800 border ${isExpanded ? 'border-blue-500/50' : 'border-slate-700'} rounded-xl overflow-hidden shadow-sm transition-colors`}>
                    <div 
                      onClick={() => toggleTicket(ticket.id)}
                      className="bg-slate-800/60 px-5 py-3 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-slate-400">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white font-mono font-bold">{ticket.ticket_id || `PRL-${ticket.id}`}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(ticket.date).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Makassar' })} WITA
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="bg-amber-900/40 border border-amber-700 text-amber-400 text-[10px] px-2.5 py-1 rounded font-semibold tracking-wide">UPCOMING</span>
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 items-center">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Odds</span>
                          <span className="text-2xl font-mono font-bold text-white">{ticket.total_odds?.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
                          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Probabilitas Win</span>
                          <span className="text-2xl font-mono font-bold text-blue-400">{(ticket.total_prob * 100).toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="space-y-3 pl-0 md:pl-6 md:border-l border-slate-700/50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Nilai Taruhan:</span>
                          <span className="text-sm font-semibold text-white">{formatCurrency(ticketStake)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Potensi Payout:</span>
                          <span className="text-sm font-bold text-emerald-400">{formatCurrency(payout)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="bg-slate-900/80 border-t border-slate-700 p-5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Rincian Pertandingan dalam Tiket</h4>
                        
                        {ticket.legs_details && ticket.legs_details.length > 0 ? (
                          <div className="space-y-3">
                            {ticket.legs_details.map((leg, idx) => {
                              
                              let statusBadge = null;
                              // Jika nilainya bukan null/undefined
                              if (leg.is_won === true) {
                                statusBadge = <span className="text-[9px] bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-700/50 font-bold ml-3">MENANG</span>;
                              } else if (leg.is_won === false) {
                                statusBadge = <span className="text-[9px] bg-rose-900/50 text-rose-400 px-2 py-0.5 rounded border border-rose-700/50 font-bold ml-3">KALAH</span>;
                              } else if (leg.date) {
                                const matchTime = new Date(leg.date).getTime();
                                const now = new Date().getTime();
                                if (matchTime < now) {
                                  statusBadge = <span className="text-[9px] bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded border border-blue-700/50 font-bold ml-3 animate-pulse">DIMAINKAN</span>;
                                }
                              }

                              return (
                                <div key={idx} className="flex justify-between items-center bg-slate-800/50 border border-slate-700 rounded p-3">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-1.5">
                                      <span className="text-xs font-bold text-white block">
                                        {leg.match}
                                      </span>
                                      {statusBadge}
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">Pick: {leg.pick}</span>
                                      {leg.date && (
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          {new Date(leg.date).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-mono text-white bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                      {leg.odds?.toFixed(2) || '-'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Detail pertandingan spesifik tidak tersedia dari API.</p>
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