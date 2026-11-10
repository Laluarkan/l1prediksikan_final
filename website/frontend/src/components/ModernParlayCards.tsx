'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { getTeamLogoUrl } from '@/lib/logo';
import { Copy, Check, ChevronRight, TrendingUp, ShieldCheck } from 'lucide-react';

interface ParlayLeg {
  match?: string;
  match_name?: string;
  home_team?: string;
  away_team?: string;
  home_team_logo?: string;
  away_team_logo?: string;
  pick: string;
  odds: number;
  prob?: number;
  market_type?: string;
  edge?: number;
}

interface ParlayTicket {
  id: number;
  ticket_id: string;
  date: string;
  total_odds: number;
  total_prob: number;
  legs_count: number;
  legs_details: ParlayLeg[];
}

interface ModernParlayCardsProps {
  tickets: ParlayTicket[];
}

export default function ModernParlayCards({ tickets }: ModernParlayCardsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (ticketId: string) => {
    navigator.clipboard.writeText(ticketId);
    setCopiedId(ticketId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!tickets || tickets.length === 0) return null;

  return (
    <div className="space-y-8 my-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
            Paket Tiket Akumulator AI Pekan Ini
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Disusun otomatis melalui optimasi matematika model Reinforcement Learning
          </p>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
          {tickets.length} Paket Pilihan
        </span>
      </div>

      <div className="space-y-6">
        {tickets.map((ticket, tIdx) => {
          const odds = typeof ticket.total_odds === 'number' ? ticket.total_odds.toFixed(2) : ticket.total_odds;
          const prob = typeof ticket.total_prob === 'number' ? (ticket.total_prob * 100).toFixed(1) : '-';
          const legs = ticket.legs_details || [];

          return (
            <div 
              key={ticket.id || tIdx} 
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden"
            >
              {/* HEADER TIKET */}
              <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    #{tIdx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base tracking-tight">
                        Paket Parlay Akumulator #{tIdx + 1}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
                        {ticket.legs_count || legs.length} Laga
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-300">Kode: {ticket.ticket_id}</span>
                      <button
                        onClick={() => handleCopy(ticket.ticket_id)}
                        className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
                        title="Salin Kode Tiket"
                      >
                        {copiedId === ticket.ticket_id ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
                            <Check className="w-3 h-3" /> Tersalin
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 hover:underline">
                            <Copy className="w-3 h-3" /> Salin
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ODDS & WIN PROBABILITY PILLS */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-1.5 text-right font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-amber-300 block font-sans font-semibold">Total Odds</span>
                    <span className="text-base font-black text-amber-400">x{odds}</span>
                  </div>
                  <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-3 py-1.5 text-right font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block font-sans font-semibold">Probabilitas AI</span>
                    <span className="text-base font-black text-emerald-400">{prob}%</span>
                  </div>
                </div>
              </div>

              {/* DAFTAR PERTANDINGAN (LEGS ROW MODERN) */}
              <div className="divide-y divide-slate-100 bg-white">
                {legs.map((leg, lIdx) => {
                  const matchName = leg.match_name || leg.match || 'Pertandingan';
                  const parts = matchName.split(/\s+vs\s+/i);
                  const homeTeam = leg.home_team || (parts.length > 0 ? parts[0].trim() : '');
                  const awayTeam = leg.away_team || (parts.length > 1 ? parts[1].trim() : '');
                  const homeLogo = getTeamLogoUrl(homeTeam, leg.home_team_logo);
                  const awayLogo = getTeamLogoUrl(awayTeam, leg.away_team_logo);
                  const legOdds = typeof leg.odds === 'number' ? leg.odds.toFixed(2) : leg.odds;
                  const edgePct = typeof leg.edge === 'number' ? `+${(leg.edge * 100).toFixed(1)}%` : null;

                  return (
                    <div 
                      key={lIdx}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                    >
                      {/* Left: Leg Number & Teams with Logos */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {lIdx + 1}
                        </div>

                        <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                          {/* Home Team */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <SafeImage 
                              src={homeLogo} 
                              alt={homeTeam} 
                              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                            />
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {homeTeam}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold text-slate-400 uppercase px-1">
                            vs
                          </span>

                          {/* Away Team */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <SafeImage 
                              src={awayLogo} 
                              alt={awayTeam} 
                              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                            />
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {awayTeam}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Market, AI Pick, Odds */}
                      <div className="flex items-center justify-between md:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded font-medium border border-slate-200">
                          {leg.market_type || 'Hasil Akhir / Total Gol'}
                        </span>

                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] uppercase font-bold text-emerald-700">Rekomendasi AI:</span>
                          <span className="font-mono font-extrabold text-emerald-900 text-xs sm:text-sm">
                            {leg.pick}
                          </span>
                        </div>

                        <div className="font-mono text-xs text-right pl-2 border-l border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-sans">Odds</span>
                          <span className="font-bold text-slate-800">{legOdds}</span>
                        </div>

                        {edgePct && (
                          <span className="hidden sm:inline-block text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono" title="Value Edge">
                            {edgePct}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FOOTER KARTU TIKET */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Telah lolos verifikasi kriteria matematis Kelly Criterion & ELO
                </span>
                <Link
                  href="/parlays"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold ml-auto text-xs"
                >
                  <span>Buka Tiket #{tIdx + 1} di Match Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

