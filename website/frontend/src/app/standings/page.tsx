/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Trophy, Award, ArrowUpRight, ShieldAlert, Layers } from 'lucide-react';
import { getOptimizedLogoUrl } from '@/lib/logo';

interface League {
  id: number;
  code: string;
  name: string;
  country: string;
  logo_url?: string;
}

interface TeamStanding {
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

interface ZoneRule {
  ranks: number[];
  name: string;
  shortName: string;
  colorBorder: string;
  dotColor: string;
  bgRow: string;
  badgeBg: string;
  badgeText: string;
}

// Konfigurasi Zona Kualifikasi & Degradasi Khusus untuk 11 Liga Top Eropa
// Warna dengan kontras tajam: UCL (Sky Blue), UEL (Amber/Orange), UECL (Emerald), Playoff (Fuchsia), Degradasi (Rose)
const LEAGUE_RULES: Record<string, ZoneRule[]> = {
  // English Premier League (20 tim)
  E0: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [5], name: 'UEFA Europa League (Fase Liga)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [18, 19, 20], name: 'Zona Degradasi ke Championship', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Spanish La Liga (20 tim)
  SP1: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [5], name: 'UEFA Europa League (Fase Liga)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [6], name: 'UEFA Conference League (Play-off)', shortName: 'UECL', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [18, 19, 20], name: 'Zona Degradasi ke Segunda División', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Italian Serie A (20 tim)
  I1: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [5], name: 'UEFA Europa League (Fase Liga)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [6], name: 'UEFA Conference League (Play-off)', shortName: 'UECL', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [18, 19, 20], name: 'Zona Degradasi ke Serie B', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // German Bundesliga (18 tim)
  D1: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [5], name: 'UEFA Europa League (Fase Liga)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [6], name: 'UEFA Conference League (Play-off)', shortName: 'UECL', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [16], name: 'Play-off Degradasi Bundesliga', shortName: 'PO Degradasi', colorBorder: 'border-l-fuchsia-500', dotColor: 'bg-fuchsia-500', bgRow: 'hover:bg-fuchsia-500/[0.08]', badgeBg: 'bg-fuchsia-500/20', badgeText: 'text-fuchsia-300' },
    { ranks: [17, 18], name: 'Zona Degradasi ke 2. Bundesliga', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // French Ligue 1 (18 tim)
  F1: [
    { ranks: [1, 2, 3], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [4], name: 'Kualifikasi UEFA Champions League', shortName: 'Kual. UCL', colorBorder: 'border-l-cyan-400', dotColor: 'bg-cyan-400', bgRow: 'hover:bg-cyan-400/[0.08]', badgeBg: 'bg-cyan-400/20', badgeText: 'text-cyan-300' },
    { ranks: [5], name: 'UEFA Europa League (Fase Liga)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [6], name: 'UEFA Conference League (Play-off)', shortName: 'UECL', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [16], name: 'Play-off Degradasi Ligue 1', shortName: 'PO Degradasi', colorBorder: 'border-l-fuchsia-500', dotColor: 'bg-fuchsia-500', bgRow: 'hover:bg-fuchsia-500/[0.08]', badgeBg: 'bg-fuchsia-500/20', badgeText: 'text-fuchsia-300' },
    { ranks: [17, 18], name: 'Zona Degradasi ke Ligue 2', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Dutch Eredivisie (18 tim)
  N1: [
    { ranks: [1, 2], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [3], name: 'Kualifikasi UEFA Champions League', shortName: 'Kual. UCL', colorBorder: 'border-l-cyan-400', dotColor: 'bg-cyan-400', bgRow: 'hover:bg-cyan-400/[0.08]', badgeBg: 'bg-cyan-400/20', badgeText: 'text-cyan-300' },
    { ranks: [4], name: 'Kualifikasi UEFA Europa League', shortName: 'Kual. UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [5, 6, 7, 8], name: 'Play-off Tiket Kompetisi Eropa', shortName: 'PO Eropa', colorBorder: 'border-l-fuchsia-500', dotColor: 'bg-fuchsia-500', bgRow: 'hover:bg-fuchsia-500/[0.08]', badgeBg: 'bg-fuchsia-500/20', badgeText: 'text-fuchsia-300' },
    { ranks: [16], name: 'Play-off Degradasi Eredivisie', shortName: 'PO Degradasi', colorBorder: 'border-l-fuchsia-500', dotColor: 'bg-fuchsia-500', bgRow: 'hover:bg-fuchsia-500/[0.08]', badgeBg: 'bg-fuchsia-500/20', badgeText: 'text-fuchsia-300' },
    { ranks: [17, 18], name: 'Zona Degradasi ke Eerste Divisie', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Portuguese Primeira Liga (18 tim)
  P1: [
    { ranks: [1, 2], name: 'UEFA Champions League (Fase Liga)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [3], name: 'Kualifikasi UEFA Champions League', shortName: 'Kual. UCL', colorBorder: 'border-l-cyan-400', dotColor: 'bg-cyan-400', bgRow: 'hover:bg-cyan-400/[0.08]', badgeBg: 'bg-cyan-400/20', badgeText: 'text-cyan-300' },
    { ranks: [4], name: 'UEFA Europa League (Kualifikasi)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [5], name: 'UEFA Conference League (Kualifikasi)', shortName: 'UECL', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [16], name: 'Play-off Degradasi Primeira Liga', shortName: 'PO Degradasi', colorBorder: 'border-l-fuchsia-500', dotColor: 'bg-fuchsia-500', bgRow: 'hover:bg-fuchsia-500/[0.08]', badgeBg: 'bg-fuchsia-500/20', badgeText: 'text-fuchsia-300' },
    { ranks: [17, 18], name: 'Zona Degradasi ke Liga Portugal 2', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Belgian Jupiler Pro League (16 tim)
  B1: [
    { ranks: [1, 2, 3, 4, 5, 6], name: 'Champions\' Play-offs (Juara & Tiket Eropa)', shortName: 'Championship PO', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [7, 8, 9, 10, 11, 12], name: 'Europe Play-offs (Tiket Conference League)', shortName: 'Europe PO', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [13, 14, 15, 16], name: 'Relegation Play-offs (Play-off Degradasi)', shortName: 'Relegation PO', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Turkish Süper Lig (19 tim)
  T1: [
    { ranks: [1, 2], name: 'UEFA Champions League (Kualifikasi)', shortName: 'UCL', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [3], name: 'UEFA Europa League (Kualifikasi)', shortName: 'UEL', colorBorder: 'border-l-amber-500', dotColor: 'bg-amber-500', bgRow: 'hover:bg-amber-500/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-400' },
    { ranks: [4], name: 'UEFA Conference League (Kualifikasi)', shortName: 'UECL', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [16, 17, 18, 19], name: 'Zona Degradasi ke TFF 1. Lig', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // Greek Super League (14 tim)
  G1: [
    { ranks: [1, 2, 3, 4], name: 'Championship Play-offs (Juara & Eropa)', shortName: 'Championship PO', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [5, 6, 7, 8], name: 'Europe Play-offs (Tiket Conference League)', shortName: 'Europe PO', colorBorder: 'border-l-emerald-500', dotColor: 'bg-emerald-500', bgRow: 'hover:bg-emerald-500/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400' },
    { ranks: [9, 10, 11, 12, 13, 14], name: 'Relegation Round (Degradasi)', shortName: 'Relegation', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400', bgRow: 'hover:bg-rose-500/[0.08]' },
  ],
  // Scottish Premiership (12 tim)
  SC0: [
    { ranks: [1, 2, 3, 4, 5, 6], name: 'Championship Group (Top 6 / Jalur Juara & Eropa)', shortName: 'Championship', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [7, 8, 9, 10], name: 'Relegation Group (Posisi Aman)', shortName: 'Aman', colorBorder: 'border-l-slate-700', dotColor: 'bg-slate-600', bgRow: 'hover:bg-slate-700/[0.08]', badgeBg: 'bg-slate-800', badgeText: 'text-slate-400' },
    { ranks: [11], name: 'Play-off Degradasi Premiership', shortName: 'PO Degradasi', colorBorder: 'border-l-fuchsia-500', dotColor: 'bg-fuchsia-500', bgRow: 'hover:bg-fuchsia-500/[0.08]', badgeBg: 'bg-fuchsia-500/20', badgeText: 'text-fuchsia-300' },
    { ranks: [12], name: 'Zona Degradasi ke Championship Skotlandia', shortName: 'Degradasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
};



export default function StandingsPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);

  const generateSeasons = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startYear = 2021;
    const latestStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;

    const seasons = [];
    for (let y = latestStartYear; y >= startYear; y--) {
      const y1 = y.toString().slice(-2);
      const y2 = (y + 1).toString().slice(-2);
      seasons.push(`${y1}/${y2}`);
    }
    return seasons;
  };

  const [availableSeasons] = useState<string[]>(generateSeasons());
  const [selectedSeason, setSelectedSeason] = useState<string>(availableSeasons[0]);
  const [selectedLeague, setSelectedLeague] = useState<string>('E0');

  useEffect(() => {
    api.get('/leagues/')
      .then((res) => {
        const data = res.data.results || res.data;
        setLeagues(data);
        if (data.length > 0 && !selectedLeague) setSelectedLeague(data[0].code);
      })
      .catch((err) => console.error("Gagal memuat liga:", err));
  }, []);

  useEffect(() => {
    if (!selectedLeague || !selectedSeason) return;

    setLoading(true);
    api.get('/standings/', { params: { league: selectedLeague, season: selectedSeason } })
      .then((res) => {
        setStandings(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat klasemen:", err);
        setLoading(false);
      });
  }, [selectedLeague, selectedSeason]);

  const activeRules = LEAGUE_RULES[selectedLeague] || [];

  const getRankZone = (rank: number): ZoneRule | null => {
    for (const rule of activeRules) {
      if (rule.ranks.includes(rank)) return rule;
    }
    return null;
  };


  const currentLeagueObj = leagues.find(l => l.code === selectedLeague);

  return (
    <div className="max-w-6xl mx-auto pt-6 pb-16 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          {currentLeagueObj?.logo_url && (
            <img 
              src={getOptimizedLogoUrl(currentLeagueObj.logo_url)} 
              alt={currentLeagueObj.name} 
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="w-10 h-10 object-contain shrink-0 filter drop-shadow-md" 
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Klasemen Liga {currentLeagueObj ? `– ${currentLeagueObj.name}` : ''}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Data klasemen resmi dengan pemetaan zona UEFA, tiket kompetisi Eropa, batas degradasi, serta status tim promosi.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-sm">
            <label htmlFor="league-filter" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer">Liga</label>
            <select
              id="league-filter"
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {leagues.map(l => (
                <option key={l.code} value={l.code}>{l.name} ({l.country})</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-sm">
            <label htmlFor="season-filter" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer">Musim</label>
            <select
              id="season-filter"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {availableSeasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Standings Table Card */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="overflow-x-auto p-4 animate-pulse">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3.5 text-center w-14">#</th>
                  <th className="px-4 py-3.5 font-semibold text-white">Klub</th>
                  <th className="px-4 py-3.5 text-center">Main</th>
                  <th className="px-4 py-3.5 text-center">M</th>
                  <th className="px-4 py-3.5 text-center">S</th>
                  <th className="px-4 py-3.5 text-center">K</th>
                  <th className="px-4 py-3.5 text-center hidden sm:table-cell">GM</th>
                  <th className="px-4 py-3.5 text-center hidden sm:table-cell">GK</th>
                  <th className="px-4 py-3.5 text-center">SG</th>
                  <th className="px-4 py-3.5 text-center font-bold text-white">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {Array(18).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-36 bg-slate-700 rounded"></div></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell"><div className="h-4 w-5 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-7 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-6 bg-slate-700 rounded mx-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-20 px-4">
            <ShieldAlert size={36} className="mx-auto text-slate-500 mb-3" />
            <p className="text-white font-semibold">Tidak Ada Data Klasemen</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Belum ada riwayat hasil pertandingan yang tercatat untuk {currentLeagueObj?.name || 'liga ini'} pada musim {selectedSeason}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[11px] font-mono uppercase bg-slate-900/90 text-slate-400 border-b border-slate-700/80 sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-3.5 text-center w-12 sm:w-14">Pos</th>
                  <th className="px-3 sm:px-4 py-3.5 font-bold text-white">Klub</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center font-medium" title="Pertandingan Dimainkan">Main</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center font-medium" title="Menang">M</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center font-medium" title="Seri">S</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center font-medium" title="Kalah">K</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center hidden md:table-cell font-medium" title="Gol Memasukkan">GM</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center hidden md:table-cell font-medium" title="Gol Kemasukan">GK</th>
                  <th className="px-2 sm:px-3 py-3.5 text-center font-medium" title="Selisih Gol">SG</th>
                  <th className="px-3 sm:px-4 py-3.5 text-center font-extrabold text-white text-base bg-slate-900/60" title="Total Poin">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {standings.map((team) => {
                  const zone = getRankZone(team.rank);

                  return (
                    <tr 
                      key={team.team} 
                      className={`transition-colors duration-150 ${zone?.colorBorder ? `border-l-4 ${zone.colorBorder}` : 'border-l-4 border-l-transparent'} ${zone?.bgRow || 'hover:bg-slate-800/40'}`}
                    >
                      {/* Rank Column */}
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-xs font-bold ${
                          zone ? `${zone.badgeBg} ${zone.badgeText}` : 'text-slate-400 bg-slate-800/60'
                        }`}>
                          {team.rank}
                        </span>
                      </td>

                      {/* Team Name & Status (Teks berwarna polos tanpa icon / box) */}
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <img 
                            src={getOptimizedLogoUrl(team.logo)} 
                            alt="" 
                            onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }} 
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0 filter drop-shadow-sm" 
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs sm:text-sm block truncate hover:text-emerald-400 transition-colors">
                              {team.team}
                            </span>
                            
                            {/* Status: Juara Bertahan / Top 3 Musim Lalu / Promosi (Teks Berwarna Polos) */}
                            {team.honor && (
                              <span className={`text-[10px] font-semibold block leading-tight mt-0.5 ${
                                team.honor === 'Juara Bertahan'
                                  ? 'text-amber-400'
                                  : team.honor === 'Top 3 Musim Lalu'
                                    ? 'text-sky-400'
                                    : 'text-emerald-400'
                              }`}>
                                {team.honor}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono">{team.p}</td>
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono text-emerald-400 font-semibold">{team.w}</td>
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono text-slate-300">{team.d}</td>
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono text-rose-400">{team.l}</td>
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono text-slate-400 hidden md:table-cell">{team.gf}</td>
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono text-slate-400 hidden md:table-cell">{team.ga}</td>
                      <td className="px-2 sm:px-3 py-3 text-center text-xs font-mono font-medium">
                        <span className={team.gd > 0 ? 'text-emerald-400' : team.gd < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {team.gd > 0 ? `+${team.gd}` : team.gd}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center font-extrabold text-white text-sm sm:text-base font-mono bg-slate-900/30">
                        {team.pts}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Zone Legend (Keterangan Bersih Tanpa Box Berat) */}
      {activeRules.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-300 space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Zona Klasemen:</span>
            {activeRules.map((rule, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${rule.dotColor}`} />
                <span className="text-slate-200">{rule.name}</span>
                <span className="text-slate-400 font-mono text-[10px]">(Pos: {rule.ranks.join(', ')})</span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Status Tim:</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-amber-400 font-semibold">Juara Bertahan</span>
              <span className="text-slate-400">– Peringkat 1 musim lalu</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-sky-400 font-semibold">Top 3 Musim Lalu</span>
              <span className="text-slate-400">– Peringkat 2 &amp; 3 musim lalu</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">Promosi</span>
              <span className="text-slate-400">– Tim baru dari divisi bawah musim ini</span>
            </span>
          </div>
        </div>
      )}

    </div>
  );
}