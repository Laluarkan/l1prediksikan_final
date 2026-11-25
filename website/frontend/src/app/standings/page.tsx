/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/axios';
import { Trophy, Award, ArrowUpRight, ShieldAlert, Layers, GitBranch } from 'lucide-react';
import { getOptimizedLogoUrl, getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

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
  // UEFA Champions League (36 tim - Swiss Model League Phase)
  UCL: [
    { ranks: [1, 2, 3, 4, 5, 6, 7, 8], name: 'Lolos Otomatis Babak 16 Besar (Round of 16)', shortName: '16 Besar', colorBorder: 'border-l-emerald-400', dotColor: 'bg-emerald-400', bgRow: 'hover:bg-emerald-400/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300' },
    { ranks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], name: 'Play-off Babak Gugur (Knockout Round Play-offs)', shortName: 'Play-off', colorBorder: 'border-l-sky-400', dotColor: 'bg-sky-400', bgRow: 'hover:bg-sky-400/[0.08]', badgeBg: 'bg-sky-400/20', badgeText: 'text-sky-300' },
    { ranks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], name: 'Tereliminasi dari Kompetisi Eropa', shortName: 'Eliminasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // UEFA Europa League (36 tim - Swiss Model League Phase)
  UEL: [
    { ranks: [1, 2, 3, 4, 5, 6, 7, 8], name: 'Lolos Otomatis Babak 16 Besar (Round of 16)', shortName: '16 Besar', colorBorder: 'border-l-emerald-400', dotColor: 'bg-emerald-400', bgRow: 'hover:bg-emerald-400/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300' },
    { ranks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], name: 'Play-off Babak Gugur (Knockout Round Play-offs)', shortName: 'Play-off', colorBorder: 'border-l-amber-400', dotColor: 'bg-amber-400', bgRow: 'hover:bg-amber-400/[0.08]', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300' },
    { ranks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], name: 'Tereliminasi dari Kompetisi Eropa', shortName: 'Eliminasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
  // UEFA Conference League (36 tim - Swiss Model League Phase)
  UECL: [
    { ranks: [1, 2, 3, 4, 5, 6, 7, 8], name: 'Lolos Otomatis Babak 16 Besar (Round of 16)', shortName: '16 Besar', colorBorder: 'border-l-emerald-400', dotColor: 'bg-emerald-400', bgRow: 'hover:bg-emerald-400/[0.08]', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300' },
    { ranks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], name: 'Play-off Babak Gugur (Knockout Round Play-offs)', shortName: 'Play-off', colorBorder: 'border-l-teal-400', dotColor: 'bg-teal-400', bgRow: 'hover:bg-teal-400/[0.08]', badgeBg: 'bg-teal-500/20', badgeText: 'text-teal-300' },
    { ranks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], name: 'Tereliminasi dari Kompetisi Eropa', shortName: 'Eliminasi', colorBorder: 'border-l-rose-500', dotColor: 'bg-rose-500', bgRow: 'hover:bg-rose-500/[0.08]', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-400' },
  ],
};

const UEFA_CODES = new Set(['UCL', 'UEL', 'UECL']);



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
  const [uefaViewMode, setUefaViewMode] = useState<'table' | 'bracket'>('table');
  const isUefaLeague = UEFA_CODES.has(selectedLeague);

  // Reset ke tab tabel saat berpindah ke liga domestik
  useEffect(() => {
    if (!UEFA_CODES.has(selectedLeague)) {
      setUefaViewMode('table');
    }
  }, [selectedLeague]);

  // Pembentukan Bagan Babak Gugur UEFA (Knockout Bracket) dari Klasemen 36 Tim
  const knockoutBracket = useMemo(() => {
    if (!isUefaLeague || standings.length < 24) return null;
    const byRank: Record<number, TeamStanding> = {};
    standings.forEach((t) => {
      byRank[t.rank] = t;
    });

    const playoffPairs = [
      { id: 'PO-1', label: 'Play-off 1', seedA: 9, seedB: 24, teamA: byRank[9], teamB: byRank[24] },
      { id: 'PO-2', label: 'Play-off 2', seedA: 10, seedB: 23, teamA: byRank[10], teamB: byRank[23] },
      { id: 'PO-3', label: 'Play-off 3', seedA: 11, seedB: 22, teamA: byRank[11], teamB: byRank[22] },
      { id: 'PO-4', label: 'Play-off 4', seedA: 12, seedB: 21, teamA: byRank[12], teamB: byRank[21] },
      { id: 'PO-5', label: 'Play-off 5', seedA: 13, seedB: 20, teamA: byRank[13], teamB: byRank[20] },
      { id: 'PO-6', label: 'Play-off 6', seedA: 14, seedB: 19, teamA: byRank[14], teamB: byRank[19] },
      { id: 'PO-7', label: 'Play-off 7', seedA: 15, seedB: 18, teamA: byRank[15], teamB: byRank[18] },
      { id: 'PO-8', label: 'Play-off 8', seedA: 16, seedB: 17, teamA: byRank[16], teamB: byRank[17] },
    ];

    const r16Pairs = [
      { id: 'R16-1', label: '16 Besar 1', seedTop: 1, topTeam: byRank[1], challenger: byRank[16], challengerAlt: byRank[17], poLabel: 'Pemenang PO-8 (#16/#17)' },
      { id: 'R16-2', label: '16 Besar 2', seedTop: 8, topTeam: byRank[8], challenger: byRank[9], challengerAlt: byRank[24], poLabel: 'Pemenang PO-1 (#9/#24)' },
      { id: 'R16-3', label: '16 Besar 3', seedTop: 4, topTeam: byRank[4], challenger: byRank[13], challengerAlt: byRank[20], poLabel: 'Pemenang PO-5 (#13/#20)' },
      { id: 'R16-4', label: '16 Besar 4', seedTop: 5, topTeam: byRank[5], challenger: byRank[12], challengerAlt: byRank[21], poLabel: 'Pemenang PO-4 (#12/#21)' },
      { id: 'R16-5', label: '16 Besar 5', seedTop: 2, topTeam: byRank[2], challenger: byRank[15], challengerAlt: byRank[18], poLabel: 'Pemenang PO-7 (#15/#18)' },
      { id: 'R16-6', label: '16 Besar 6', seedTop: 7, topTeam: byRank[7], challenger: byRank[10], challengerAlt: byRank[23], poLabel: 'Pemenang PO-2 (#10/#23)' },
      { id: 'R16-7', label: '16 Besar 7', seedTop: 3, topTeam: byRank[3], challenger: byRank[14], challengerAlt: byRank[19], poLabel: 'Pemenang PO-6 (#14/#19)' },
      { id: 'R16-8', label: '16 Besar 8', seedTop: 6, topTeam: byRank[6], challenger: byRank[11], challengerAlt: byRank[22], poLabel: 'Pemenang PO-3 (#11/#22)' },
    ];

    const qfPairs = [
      { id: 'QF-1', label: 'Perempat Final 1', side: 'Jalur Kiri Atas', teamA: byRank[1], teamB: byRank[8], descA: 'Unggulan #1 / R16-1', descB: 'Unggulan #8 / R16-2' },
      { id: 'QF-2', label: 'Perempat Final 2', side: 'Jalur Kiri Bawah', teamA: byRank[4], teamB: byRank[5], descA: 'Unggulan #4 / R16-3', descB: 'Unggulan #5 / R16-4' },
      { id: 'QF-3', label: 'Perempat Final 3', side: 'Jalur Kanan Atas', teamA: byRank[2], teamB: byRank[7], descA: 'Unggulan #2 / R16-5', descB: 'Unggulan #7 / R16-6' },
      { id: 'QF-4', label: 'Perempat Final 4', side: 'Jalur Kanan Bawah', teamA: byRank[3], teamB: byRank[6], descA: 'Unggulan #3 / R16-7', descB: 'Unggulan #6 / R16-8' },
    ];

    const sfPairs = [
      { id: 'SF-1', label: 'Semifinal 1 (Blok Kiri)', teamA: byRank[1], teamB: byRank[4], descA: 'Pemenang QF-1 (#1/#8)', descB: 'Pemenang QF-2 (#4/#5)' },
      { id: 'SF-2', label: 'Semifinal 2 (Blok Kanan)', teamA: byRank[2], teamB: byRank[3], descA: 'Pemenang QF-3 (#2/#7)', descB: 'Pemenang QF-4 (#3/#6)' },
    ];

    const finalMatch = {
      id: 'FINAL',
      label: 'Grand Final UEFA',
      teamA: byRank[1],
      teamB: byRank[2],
      descA: 'Juara Bagan Kiri (SF-1)',
      descB: 'Juara Bagan Kanan (SF-2)',
    };

    return { playoffPairs, r16Pairs, qfPairs, sfPairs, finalMatch };
  }, [isUefaLeague, standings]);

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
  const maxOfficialRank = activeRules.length > 0 ? Math.max(...activeRules.flatMap((r) => r.ranks)) : undefined;
  const displayedStandings = maxOfficialRank && standings.length > maxOfficialRank ? standings.slice(0, maxOfficialRank) : standings;

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
          <img 
            src={getLeagueLogoUrl(selectedLeague, currentLeagueObj?.name, currentLeagueObj?.logo_url)} 
            alt={currentLeagueObj?.name || 'Liga'} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="w-10 h-10 object-contain shrink-0 filter drop-shadow-md" 
          />
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
            <img 
              src={getLeagueLogoUrl(selectedLeague, currentLeagueObj?.name, currentLeagueObj?.logo_url)}
              alt=""
              className="w-4 h-4 object-contain shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
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

      {/* Mode Selector: Fase Liga (36 Tim) vs Bagan Babak Gugur (Khusus UCL, UEL, UECL) */}
      {isUefaLeague && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUefaViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                uefaViewMode === 'table'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Layers size={14} />
              <span>Fase Liga (36 Tim)</span>
            </button>
            <button
              onClick={() => setUefaViewMode('bracket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                uefaViewMode === 'bracket'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <GitBranch size={14} />
              <span>Bagan Babak Gugur (Knockout Bracket)</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {uefaViewMode === 'table'
              ? 'Pos 1–8 Lolos 16 Besar • Pos 9–24 Play-off • Pos 25–36 Eliminasi'
              : 'Proyeksi Bagan Gugur Resmi Berdasarkan Peringkat Seeding UEFA (Pos 1–24)'}
          </span>
        </div>
      )}

      {/* TAMPILAN BAGAN BABAK GUGUR (KNOCKOUT BRACKET) KHUSUS UEFA */}
      {isUefaLeague && uefaViewMode === 'bracket' && knockoutBracket ? (
        <div className="space-y-8">
          {/* 1. Babak Play-off Fase Gugur (Peringkat 9 - 24) */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Tahap 1 Fase Gugur
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Play-off Babak Gugur (Peringkat 9 – 24 Klasemen)
                </h2>
              </div>
              <span className="text-xs text-slate-400">8 Pemenang melaju ke Babak 16 Besar menantang Unggulan #1–#8</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {knockoutBracket.playoffPairs.map((po) => (
                <div key={po.id} className="bg-slate-950/80 border border-slate-800 hover:border-sky-500/40 rounded-xl p-3.5 transition-all space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
                    <span className="font-bold text-sky-400">{po.label}</span>
                    <span>Seed #{po.seedA} vs #{po.seedB}</span>
                  </div>
                  {[
                    { t: po.teamA, seed: po.seedA, highlight: true },
                    { t: po.teamB, seed: po.seedB, highlight: false },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                          row.highlight ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {row.seed}
                        </span>
                        <img
                          src={getTeamLogoUrl(row.t?.team, row.t?.logo)}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                          onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                        />
                        <span className="text-xs font-bold text-white truncate">{row.t?.team || `Peringkat #${row.seed}`}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">{row.t?.pts ?? 0} pts</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Babak 16 Besar (Round of 16 - Unggulan #1-#8 vs Pemenang Play-off) */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Tahap 2 Fase Gugur
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Babak 16 Besar (Round of 16 • Unggulan #1–#8 Otomatis Lolos)
                </h2>
              </div>
              <span className="text-xs text-slate-400">8 Tim teratas Fase Liga langsung menunggu di 16 Besar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {knockoutBracket.r16Pairs.map((r16) => (
                <div key={r16.id} className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3.5 transition-all space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
                    <span className="font-bold text-emerald-400">{r16.label}</span>
                    <span>Unggulan #{r16.seedTop}</span>
                  </div>
                  {/* Tim Unggulan Top 8 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-300">
                        {r16.seedTop}
                      </span>
                      <img
                        src={getTeamLogoUrl(r16.topTeam?.team, r16.topTeam?.logo)}
                        alt=""
                        className="w-4 h-4 object-contain shrink-0"
                        onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                      />
                      <span className="text-xs font-bold text-white truncate">{r16.topTeam?.team}</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">{r16.topTeam?.pts ?? 0} pts</span>
                  </div>
                  {/* Penantang dari Playoff */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 bg-sky-500/15 text-sky-300">
                        PO
                      </span>
                      <img
                        src={getTeamLogoUrl(r16.challenger?.team, r16.challenger?.logo)}
                        alt=""
                        className="w-4 h-4 object-contain shrink-0"
                        onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 block truncate">
                          {r16.challenger?.team} / {r16.challengerAlt?.team}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">{r16.poLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Perempat Final, Semifinal & Grand Final */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Perempat Final */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="pb-3 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Tahap 3</span>
                <h3 className="text-base font-extrabold text-white">Perempat Final (Quarter-Finals)</h3>
              </div>
              {knockoutBracket.qfPairs.map((qf) => (
                <div key={qf.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-amber-400">
                    <span className="font-bold">{qf.label}</span>
                    <span className="text-slate-400">{qf.side}</span>
                  </div>
                  {[
                    { t: qf.teamA, desc: qf.descA },
                    { t: qf.teamB, desc: qf.descB },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getTeamLogoUrl(item.t?.team, item.t?.logo)}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                          onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                        />
                        <span className="text-xs font-bold text-white truncate">{item.t?.team}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Semifinal */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="pb-3 border-b border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Tahap 4</span>
                  <h3 className="text-base font-extrabold text-white">Semifinal (Semi-Finals)</h3>
                </div>
                {knockoutBracket.sfPairs.map((sf) => (
                  <div key={sf.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="text-[10px] font-mono font-bold text-purple-400 border-b border-slate-800 pb-1.5">
                      {sf.label}
                    </div>
                    {[
                      { t: sf.teamA, desc: sf.descA },
                      { t: sf.teamB, desc: sf.descB },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getTeamLogoUrl(item.t?.team, item.t?.logo)}
                            alt=""
                            className="w-5 h-5 object-contain shrink-0"
                            onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                          />
                          <span className="text-xs font-bold text-white truncate">{item.t?.team}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 text-[11px] text-slate-400">
                Format 2 Leg (Kandang &amp; Tandang). Unggulan teratas diproyeksikan dari peringkat klasemen Fase Liga saat ini.
              </div>
            </div>

            {/* Grand Final */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Partai Puncak</span>
                    <h3 className="text-base font-extrabold text-white">Grand Final {currentLeagueObj?.name}</h3>
                  </div>
                  <Trophy size={22} className="text-amber-400" />
                </div>

                <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-5 space-y-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Proyeksi Finalis Unggulan Teratas
                  </span>

                  <div className="flex items-center justify-around gap-3 py-2">
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      <img
                        src={getTeamLogoUrl(knockoutBracket.finalMatch.teamA?.team, knockoutBracket.finalMatch.teamA?.logo)}
                        alt=""
                        className="w-12 h-12 object-contain"
                        onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                      />
                      <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                        {knockoutBracket.finalMatch.teamA?.team}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Unggulan #{knockoutBracket.finalMatch.teamA?.rank} ({knockoutBracket.finalMatch.teamA?.pts} pts)
                      </span>
                    </div>

                    <div className="text-xs font-mono font-black text-slate-500 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                      VS
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      <img
                        src={getTeamLogoUrl(knockoutBracket.finalMatch.teamB?.team, knockoutBracket.finalMatch.teamB?.logo)}
                        alt=""
                        className="w-12 h-12 object-contain"
                        onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                      />
                      <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-full">
                        {knockoutBracket.finalMatch.teamB?.team}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Unggulan #{knockoutBracket.finalMatch.teamB?.rank} ({knockoutBracket.finalMatch.teamB?.pts} pts)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Sistem Seeding: Swiss Model UEFA</span>
                <span className="text-emerald-400 font-bold">Real-Time Projection</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
      /* Standings Table Card */
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
                {displayedStandings.map((team) => {
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
                            src={getTeamLogoUrl(team.team, team.logo)} 
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
      )}

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