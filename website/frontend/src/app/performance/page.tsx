/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  BarChart3, 
  Percent,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface MetricData {
  wins: number;
  losses: number;
  unit_profit: number;
  unit_stake: number;
}

interface PerformanceMetrics {
  ftr: MetricData;
  ou: MetricData;
  parlay: MetricData;
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [bankroll, setBankroll] = useState<number>(500000);
  const [ticketStake, setTicketStake] = useState<number>(50000);

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

  const availableSeasonsList = generateSeasons();
  const [selectedSeason, setSelectedSeason] = useState<string>(availableSeasonsList[0]);

  useEffect(() => {
    setLoading(true);

    api.get('/performance/', { params: { season: selectedSeason } })
      .then((res) => {
        setMetrics(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat data performa dari backend:", err);
        setLoading(false);
      });
  }, [selectedSeason]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const showSkeleton = loading || !metrics;

  let content: React.ReactNode = null;

  if (!showSkeleton && metrics) {
    const ftrProfit = metrics.ftr.unit_profit * bankroll;
    const ftrTotalStake = metrics.ftr.unit_stake * bankroll;
    const ftrROI = ftrTotalStake > 0 ? (ftrProfit / ftrTotalStake) * 100 : 0;

    const ouProfit = metrics.ou.unit_profit * bankroll;
    const ouTotalStake = metrics.ou.unit_stake * bankroll;
    const ouROI = ouTotalStake > 0 ? (ouProfit / ouTotalStake) * 100 : 0;

    const parlayProfit = metrics.parlay.unit_profit * ticketStake;
    const parlayTotalStake = metrics.parlay.unit_stake * ticketStake;
    const parlayROI = parlayTotalStake > 0 ? (parlayProfit / parlayTotalStake) * 100 : 0;

    const totalWins = metrics.ftr.wins + metrics.ou.wins + metrics.parlay.wins;
    const totalLosses = metrics.ftr.losses + metrics.ou.losses + metrics.parlay.losses;
    const totalBets = totalWins + totalLosses;
    const overallWinRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;

    const totalProfit = ftrProfit + ouProfit + parlayProfit;
    const totalTurnover = ftrTotalStake + ouTotalStake + parlayTotalStake;
    const overallROI = totalTurnover > 0 ? (totalProfit / totalTurnover) * 100 : 0;

    const ftrTotal = metrics.ftr.wins + metrics.ftr.losses;
    const ftrWinRate = ftrTotal > 0 ? (metrics.ftr.wins / ftrTotal) * 100 : 0;

    const ouTotal = metrics.ou.wins + metrics.ou.losses;
    const ouWinRate = ouTotal > 0 ? (metrics.ou.wins / ouTotal) * 100 : 0;

    const parlayTotal = metrics.parlay.wins + metrics.parlay.losses;
    const parlayWinRate = parlayTotal > 0 ? (metrics.parlay.wins / parlayTotal) * 100 : 0;

    content = (
      <div className="space-y-6">

        {/* 4 Bento Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Taruhan */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Taruhan Tuntas</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Target size={14} />
                </div>
              </div>
              <div className="text-3xl font-mono font-extrabold text-white tracking-tight">{totalBets}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[10px]">
                <CheckCircle2 size={11} /> {totalWins} Menang
              </span>
              <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md text-[10px]">
                <XCircle size={11} /> {totalLosses} Kalah
              </span>
            </div>
          </div>

          {/* Card 2: Overall Win Rate */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Win Rate</span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Percent size={14} />
                </div>
              </div>
              <div className="text-3xl font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                {overallWinRate.toFixed(1)}%
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-950/80 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(overallWinRate, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                <span>Rasio Kemenangan Model</span>
                <span className="text-white font-mono">{overallWinRate.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Net Profit / Loss */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasil Bersih (Net Profit)</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  totalProfit >= 0 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  <DollarSign size={14} />
                </div>
              </div>
              <div className={`text-2xl font-mono font-extrabold tracking-tight truncate ${
                totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 text-[10px] text-slate-400">
              Akumulasi laba bersih dari simulasi bankroll.
            </div>
          </div>

          {/* Card 4: Return on Investment (ROI) */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Return on Investment (ROI)</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  overallROI >= 0 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className={`text-3xl font-mono font-extrabold ${
                overallROI >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {overallROI >= 0 ? '+' : ''}{overallROI.toFixed(2)}%
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/60 text-[10px] text-slate-400 leading-tight">
              Efisiensi perolehan laba terhadap kapital terpasang.
            </div>
          </div>

        </div>

        {/* Market Breakdown Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Rincian Performa per Kategori Pasar</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* 1X2 / FTR Market */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:border-blue-500/40 transition-all">
              <div className="bg-slate-950/60 px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">Full Time Result (1X2 / FTR)</h3>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-md">
                  {ftrTotal} Taruhan
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-400">Win Rate Pasar</span>
                    <span className="font-mono text-blue-400">{ftrWinRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(ftrWinRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div className="bg-slate-950/40 p-2.5 rounded-xl">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rekor (W-L)</span>
                    <span className="text-sm font-bold text-white font-mono">{metrics.ftr.wins}W - {metrics.ftr.losses}L</span>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-xl">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">ROI Pasar</span>
                    <span className={`text-sm font-bold font-mono ${ftrROI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ftrROI >= 0 ? '+' : ''}{ftrROI.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Estimasi Net Profit</span>
                  <span className={`text-base font-bold font-mono ${ftrProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ftrProfit >= 0 ? '+' : ''}{formatCurrency(ftrProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Over / Under 2.5 Market */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:border-purple-500/40 transition-all">
              <div className="bg-slate-950/60 px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">Over / Under 2.5 Gol</h3>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-md">
                  {ouTotal} Taruhan
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-400">Win Rate Pasar</span>
                    <span className="font-mono text-purple-400">{ouWinRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(ouWinRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div className="bg-slate-950/40 p-2.5 rounded-xl">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rekor (W-L)</span>
                    <span className="text-sm font-bold text-white font-mono">{metrics.ou.wins}W - {metrics.ou.losses}L</span>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-xl">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">ROI Pasar</span>
                    <span className={`text-sm font-bold font-mono ${ouROI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ouROI >= 0 ? '+' : ''}{ouROI.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Estimasi Net Profit</span>
                  <span className={`text-base font-bold font-mono ${ouProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ouProfit >= 0 ? '+' : ''}{formatCurrency(ouProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Parlay Combos Market */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:border-amber-500/40 transition-all">
              <div className="bg-slate-950/60 px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">Tiket Parlay Kombinasi</h3>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md">
                  {parlayTotal} Tiket
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-400">Win Rate Tiket</span>
                    <span className="font-mono text-amber-400">{parlayWinRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-950/80 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(parlayWinRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div className="bg-slate-950/40 p-2.5 rounded-xl">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rekor Tiket</span>
                    <span className="text-sm font-bold text-white font-mono">{metrics.parlay.wins}W - {metrics.parlay.losses}L</span>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-xl">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">ROI Parlay</span>
                    <span className={`text-sm font-bold font-mono ${parlayROI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {parlayROI >= 0 ? '+' : ''}{parlayROI.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Estimasi Net Profit</span>
                  <span className={`text-base font-bold font-mono ${parlayProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {parlayProfit >= 0 ? '+' : ''}{formatCurrency(parlayProfit)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-16 px-4 sm:px-6">

      {/* Page Header Bar */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Performa Model &amp; Evaluasi AI
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Laporan transparansi evaluasi tingkat akurasi (win rate) dan Return on Investment (ROI) agen prediktif.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Season Selector */}
          <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-sm">
            <label htmlFor="season-select" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer">
              Musim
            </label>
            <select
              id="season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Musim</option>
              {availableSeasonsList.map(season => (
                <option key={season} value={season}>Musim {season}</option>
              ))}
            </select>
          </div>

          {/* Bankroll Simulation Input */}
          <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
            <label htmlFor="bankroll-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer">
              Bankroll
            </label>
            <div className="relative">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Rp</span>
              <input
                id="bankroll-input"
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs font-mono font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Parlay Stake Simulation Input */}
          <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
            <label htmlFor="parlay-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer">
              Bet Parlay
            </label>
            <div className="relative">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Rp</span>
              <input
                id="parlay-input"
                type="number"
                value={ticketStake}
                onChange={(e) => setTicketStake(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs font-mono font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Loading Skeleton vs Content */}
      {showSkeleton ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm h-[130px]">
                <div className="h-3 w-28 bg-slate-800 rounded mb-4"></div>
                <div className="h-8 w-24 bg-slate-700 rounded mb-2"></div>
                <div className="h-2 w-36 bg-slate-800/60 rounded"></div>
              </div>
            ))}
          </div>
          <div className="h-4 w-60 bg-slate-800 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm h-[220px]">
                <div className="bg-slate-950/60 px-5 py-4 border-b border-slate-800/60 h-12"></div>
                <div className="p-5 space-y-4">
                  <div className="h-2.5 w-full bg-slate-800 rounded"></div>
                  <div className="h-10 w-full bg-slate-950/40 rounded-xl"></div>
                  <div className="h-12 w-full bg-slate-950/40 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : content}

    </div>
  ); 
}