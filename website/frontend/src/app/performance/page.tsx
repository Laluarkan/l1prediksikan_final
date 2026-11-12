/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/axios';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Percent,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  Layers
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

  // Bankroll & Stake simulation
  const [bankroll, setBankroll] = useState<number>(500000);
  const [ticketStake, setTicketStake] = useState<number>(10000);
  const [showSimModal, setShowSimModal] = useState<boolean>(false);

  // Quick preset options for bankroll
  const bankrollPresets = [
    { label: 'Rp 250rb', value: 250000 },
    { label: 'Rp 500rb', value: 500000 },
    { label: 'Rp 1 Juta', value: 1000000 },
    { label: 'Rp 2.5 Juta', value: 2500000 },
  ];

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

  const availableSeasonsList = useMemo(() => generateSeasons(), []);
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
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const showSkeleton = loading || !metrics;

  // Computed metrics
  const stats = useMemo(() => {
    if (!metrics) return null;

    const ftrProfit = metrics.ftr.unit_profit * bankroll;
    const ftrTotalStake = metrics.ftr.unit_stake * bankroll;
    const ftrROI = ftrTotalStake > 0 ? (ftrProfit / ftrTotalStake) * 100 : 0;
    const ftrTotal = metrics.ftr.wins + metrics.ftr.losses;
    const ftrWinRate = ftrTotal > 0 ? (metrics.ftr.wins / ftrTotal) * 100 : 0;

    const ouProfit = metrics.ou.unit_profit * bankroll;
    const ouTotalStake = metrics.ou.unit_stake * bankroll;
    const ouROI = ouTotalStake > 0 ? (ouProfit / ouTotalStake) * 100 : 0;
    const ouTotal = metrics.ou.wins + metrics.ou.losses;
    const ouWinRate = ouTotal > 0 ? (metrics.ou.wins / ouTotal) * 100 : 0;

    const parlayProfit = metrics.parlay.unit_profit * ticketStake;
    const parlayTotalStake = metrics.parlay.unit_stake * ticketStake;
    const parlayROI = parlayTotalStake > 0 ? (parlayProfit / parlayTotalStake) * 100 : 0;
    const parlayTotal = metrics.parlay.wins + metrics.parlay.losses;
    const parlayWinRate = parlayTotal > 0 ? (metrics.parlay.wins / parlayTotal) * 100 : 0;

    const totalWins = metrics.ftr.wins + metrics.ou.wins + metrics.parlay.wins;
    const totalLosses = metrics.ftr.losses + metrics.ou.losses + metrics.parlay.losses;
    const totalBets = totalWins + totalLosses;
    const overallWinRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;

    const totalProfit = ftrProfit + ouProfit + parlayProfit;
    const totalTurnover = ftrTotalStake + ouTotalStake + parlayTotalStake;
    const overallROI = totalTurnover > 0 ? (totalProfit / totalTurnover) * 100 : 0;
    const totalUnitProfit = metrics.ftr.unit_profit + metrics.ou.unit_profit + metrics.parlay.unit_profit;

    return {
      ftrProfit, ftrTotalStake, ftrROI, ftrTotal, ftrWinRate,
      ouProfit, ouTotalStake, ouROI, ouTotal, ouWinRate,
      parlayProfit, parlayTotalStake, parlayROI, parlayTotal, parlayWinRate,
      totalWins, totalLosses, totalBets, overallWinRate,
      totalProfit, totalTurnover, overallROI, totalUnitProfit
    };
  }, [metrics, bankroll, ticketStake]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      
      {/* Background Subtle Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-emerald-500/5 via-blue-500/5 to-transparent blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* 1. Header Section (Mobile-First) */}
        <div className="flex flex-col gap-4">

          {/* Title & Description */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                Performa &amp; Evaluasi AI
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                Transparansi penuh pengujian model machine learning terhadap hasil nyata di lapangan menggunakan formula Value Bet &amp; Fractional Kelly Criterion.
              </p>
            </div>

            {/* Quick Bankroll Simulator Action (Mobile Button) */}
            <button
              onClick={() => setShowSimModal(!showSimModal)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <Wallet size={14} className="text-emerald-400" />
              <span>Simulasi Modal: <strong className="text-emerald-300 font-mono">{formatCurrency(bankroll)}</strong></span>
            </button>
          </div>

          {/* 2. Interactive Season Filter (21st.dev Segmented Pill Bar) */}
          <div className="pt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex-shrink-0">
                Pilih Musim:
              </span>
              
              <button
                onClick={() => setSelectedSeason('ALL')}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  selectedSeason === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                Semua Musim
              </button>

              {availableSeasonsList.map((season) => {
                const isActive = selectedSeason === season;
                return (
                  <button
                    key={season}
                    onClick={() => setSelectedSeason(season)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    Musim {season}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible / Interactive Bankroll Drawer */}
          {showSimModal && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Wallet size={14} className="text-emerald-400" />
                  Kustomisasi Simulasi Bankroll &amp; Taruhan
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Real-time Calculation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Bankroll Presets */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                    Modal Bankroll (100 Units)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {bankrollPresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setBankroll(preset.value)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-all ${
                          bankroll === preset.value
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={bankroll}
                      onChange={(e) => setBankroll(Math.max(10000, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Parlay Ticket Stake */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                    Taruhan per Tiket Parlay (Fixed Stake)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[10000, 25000, 50000, 100000].map((stake) => (
                      <button
                        key={stake}
                        onClick={() => setTicketStake(stake)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-all ${
                          ticketStake === stake
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {formatCurrency(stake)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={ticketStake}
                      onChange={(e) => setTicketStake(Math.max(5000, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 3. Loading Skeleton State */}
        {showSkeleton ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-[220px] bg-slate-900/60 rounded-3xl border border-slate-800/80" />
              <div className="h-[220px] bg-slate-900/60 rounded-3xl border border-slate-800/80" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-[280px] bg-slate-900/60 rounded-3xl border border-slate-800/80" />
              ))}
            </div>
          </div>
        ) : (
          stats && (
            <div className="space-y-8">

              {/* 4. ASYMMETRIC BENTO GRID (Anti-AI Slop Pattern) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

                {/* BENTO HERO CARD (Span 2): Net Profit & Cumulative Capital */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800/90 p-6 sm:p-8 shadow-xl hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between">
                  
                  {/* Subtle Background Radial */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Hasil Bersih Portofolio (Net Profit)
                        </span>
                      </div>
                      
                      {/* ROI Badge */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                        stats.overallROI >= 0
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {stats.overallROI >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        ROI {stats.overallROI >= 0 ? '+' : ''}{stats.overallROI.toFixed(2)}%
                      </span>
                    </div>

                    {/* Massive Monospaced Value */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mt-1">
                      <div className={`text-3xl sm:text-5xl font-mono font-extrabold tracking-tight ${
                        stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        (Akumulasi laba dari modal {formatCurrency(bankroll)})
                      </div>
                    </div>
                  </div>

                  {/* Micro Visual Performance Curve (SVG Sparkline) */}
                  <div className="relative z-10 my-4 sm:my-6 py-2">
                    <div className="h-10 w-full flex items-end">
                      <svg className="w-full h-8 overflow-visible" viewBox="0 0 400 40" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 35 Q 80 32, 140 25 T 260 18 T 350 8 T 400 4"
                          fill="none"
                          stroke="url(#curveGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* BENTO COMPANION CARD (Span 1): Win Rate & Accuracy Circle */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-slate-800/90 p-6 sm:p-7 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Rasio Kemenangan Model
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Percent size={15} />
                      </div>
                    </div>

                    {/* Big Percentage with Subtitle */}
                    <div className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 tracking-tight">
                      {stats.overallWinRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Akurasi gabungan dari seluruh prediksi tuntas.
                    </p>

                    {/* Progress Bar Dual Tone */}
                    <div className="mt-5 space-y-2">
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700" 
                          style={{ width: `${Math.min(stats.overallWinRate, 100)}%` }}
                        />
                        <div 
                          className="bg-rose-500/40 h-full rounded-full transition-all duration-700" 
                          style={{ width: `${Math.max(0, 100 - stats.overallWinRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Bets Summary Chips */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 size={13} /> {stats.totalWins} Menang
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                      <XCircle size={13} /> {stats.totalLosses} Kalah
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {stats.totalBets} Laga
                    </span>
                  </div>

                </div>

              </div>

              {/* 5. MARKET BREAKDOWN (3 Distinct 21st.dev Style Bento Cards) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Rincian Kinerja per Kategori Pasar
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Model terlatih secara spesifik pada masing-masing bursa
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

                  {/* CARD 1: Full Time Result (1X2 / FTR) */}
                  <div className="group rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-blue-500/50 p-5 sm:p-6 shadow-lg transition-all duration-300 flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            1X2 / Tebak Pemenang
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded-md">
                          {stats.ftrTotal} Taruhan
                        </span>
                      </div>

                      {/* Win Rate Bar */}
                      <div className="space-y-1.5 mb-5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">Win Rate Pasar</span>
                          <span className="font-mono text-blue-400 font-bold">{stats.ftrWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(stats.ftrWinRate, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 2x2 Metric Matrix */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rekor (W - L)</span>
                          <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                            {metrics.ftr.wins}W - {metrics.ftr.losses}L
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">ROI Pasar</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block ${
                            stats.ftrROI >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {stats.ftrROI >= 0 ? '+' : ''}{stats.ftrROI.toFixed(1)}%
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Unit Profit</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block ${
                            metrics.ftr.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {metrics.ftr.unit_profit >= 0 ? '+' : ''}{metrics.ftr.unit_profit.toFixed(2)} U
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Estimasi Net Profit</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block truncate ${
                            stats.ftrProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {stats.ftrProfit >= 0 ? '+' : ''}{formatCurrency(stats.ftrProfit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Metode: Kelly Criterion</span>
                      <span className="text-blue-400 font-semibold">Value Bet Teruji</span>
                    </div>
                  </div>

                  {/* CARD 2: Over / Under 2.5 Gol */}
                  <div className="group rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-purple-500/50 p-5 sm:p-6 shadow-lg transition-all duration-300 flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Over / Under 2.5 Gol
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded-md">
                          {stats.ouTotal} Taruhan
                        </span>
                      </div>

                      {/* Win Rate Bar */}
                      <div className="space-y-1.5 mb-5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">Win Rate Pasar</span>
                          <span className="font-mono text-purple-400 font-bold">{stats.ouWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(stats.ouWinRate, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 2x2 Metric Matrix */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rekor (W - L)</span>
                          <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                            {metrics.ou.wins}W - {metrics.ou.losses}L
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">ROI Pasar</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block ${
                            stats.ouROI >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {stats.ouROI >= 0 ? '+' : ''}{stats.ouROI.toFixed(1)}%
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Unit Profit</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block ${
                            metrics.ou.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {metrics.ou.unit_profit >= 0 ? '+' : ''}{metrics.ou.unit_profit.toFixed(2)} U
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Estimasi Net Profit</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block truncate ${
                            stats.ouProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {stats.ouProfit >= 0 ? '+' : ''}{formatCurrency(stats.ouProfit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Model: Poisson + xG Engine</span>
                      <span className="text-purple-400 font-semibold">Prediksi Gol Akurat</span>
                    </div>
                  </div>

                  {/* CARD 3: Parlay Combos */}
                  <div className="group rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/50 p-5 sm:p-6 shadow-lg transition-all duration-300 flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Tiket Parlay Kombinasi
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-md">
                          {stats.parlayTotal} Tiket
                        </span>
                      </div>

                      {/* Win Rate Bar */}
                      <div className="space-y-1.5 mb-5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">Win Rate Tiket</span>
                          <span className="font-mono text-amber-400 font-bold">{stats.parlayWinRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                          <div 
                            className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(stats.parlayWinRate, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 2x2 Metric Matrix */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rekor Tiket</span>
                          <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                            {metrics.parlay.wins}W - {metrics.parlay.losses}L
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">ROI Parlay</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block ${
                            stats.parlayROI >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {stats.parlayROI >= 0 ? '+' : ''}{stats.parlayROI.toFixed(1)}%
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Unit Profit</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block ${
                            metrics.parlay.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {metrics.parlay.unit_profit >= 0 ? '+' : ''}{metrics.parlay.unit_profit.toFixed(2)} U
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">Estimasi Net Profit</span>
                          <span className={`text-sm font-bold font-mono mt-0.5 block truncate ${
                            stats.parlayProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {stats.parlayProfit >= 0 ? '+' : ''}{formatCurrency(stats.parlayProfit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Format: 2-3 Leg Filtered</span>
                      <span className="text-amber-400 font-semibold">Pengganda Tinggi</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 6. TRANSPARENCY & METHODOLOGY CARD (21st.dev Callout Pattern) */}
              <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Info size={20} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Metodologi Evaluasi Transparan &amp; Konsep Unit
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Sistem kami mengaudit setiap prediksi secara otomatis berdasarkan hasil resmi pertandingan. 
                      <strong> 1 Unit</strong> mewakili ukuran taruhan standar Anda (misal 1 Unit = Rp 50.000). 
                      Jika akumulasi menunjukkan <strong>+10 Units</strong>, artinya portofolio Anda bertumbuh 10x dari ukuran taruhan dasar Anda.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={14} /> Tanpa Mengubah Riwayat Pasca Pertandingan
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-cyan-400">
                        <CheckCircle2 size={14} /> Pencatatan Odds Penutupan Bursa Resmi
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )
        )}

      </div>
    </div>
  );
}
