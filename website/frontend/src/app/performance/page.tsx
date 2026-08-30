/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

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

  const [bankroll, setBankroll] = useState<number>(100000);
  const [ticketStake, setTicketStake] = useState<number>(10000);

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

    // Meminta data kalkulasi matang dari backend
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

  // Catatan performa (CLS): sebelumnya di sini ada `if (!metrics) return null;`
  // sebelum JSX header/filter dirender. Efeknya, selama proses fetch, halaman
  // benar-benar kosong (bukan skeleton), lalu begitu data datang seluruh halaman
  // (header + konten) muncul sekaligus -> lompatan layout besar (CLS tinggi).
  // Header & filter sekarang SELALU dirender di `return` utama di bawah,
  // dan body-nya menampilkan skeleton berukuran mirip konten asli selama
  // `loading || !metrics`, supaya tinggi halaman relatif stabil saat data masuk.
  const showSkeleton = loading || !metrics;

  // Semua kalkulasi turunan di bawah ini TIDAK diubah logikanya sama sekali,
  // hanya dipindah agar tidak dieksekusi saat `metrics` masih null (mencegah error).
  let content: React.ReactNode = null;

  if (!showSkeleton && metrics) {
    // --- Perkalian Skala Modal ---
    const ftrProfit = metrics.ftr.unit_profit * bankroll;
    const ftrTotalStake = metrics.ftr.unit_stake * bankroll;

    const ouProfit = metrics.ou.unit_profit * bankroll;
    const ouTotalStake = metrics.ou.unit_stake * bankroll;

    const parlayProfit = metrics.parlay.unit_profit * ticketStake;
    const parlayTotalStake = metrics.parlay.unit_stake * ticketStake;

    // --- Kalkulasi Agregat Top Level ---
    const totalWins = metrics.ftr.wins + metrics.ou.wins + metrics.parlay.wins;
    const totalLosses = metrics.ftr.losses + metrics.ou.losses + metrics.parlay.losses;
    const totalBets = totalWins + totalLosses;
    const overallWinRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;

    const totalProfit = ftrProfit + ouProfit + parlayProfit;
    const totalTurnover = ftrTotalStake + ouTotalStake + parlayTotalStake;
    const overallROI = totalTurnover > 0 ? (totalProfit / totalTurnover) * 100 : 0;

    // Win rates per market
    const ftrTotal = metrics.ftr.wins + metrics.ftr.losses;
    const ftrWinRate = ftrTotal > 0 ? (metrics.ftr.wins / ftrTotal) * 100 : 0;

    const ouTotal = metrics.ou.wins + metrics.ou.losses;
    const ouWinRate = ouTotal > 0 ? (metrics.ou.wins / ouTotal) * 100 : 0;

    const parlayTotal = metrics.parlay.wins + metrics.parlay.losses;
    const parlayWinRate = parlayTotal > 0 ? (metrics.parlay.wins / parlayTotal) * 100 : 0;

    content = (
      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Taruhan Tuntas</span>
            <span className="text-3xl font-mono font-bold text-white">{totalBets}</span>
            <div className="mt-2 text-xs text-slate-500 flex gap-3">
              <span className="text-emerald-400">{totalWins} Menang</span>
              <span className="text-rose-400">{totalLosses} Kalah</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Overall Win Rate</span>
            <span className="text-3xl font-mono font-bold text-blue-400">{overallWinRate.toFixed(1)}%</span>
            <div className="w-full bg-slate-900 h-1.5 mt-3 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${overallWinRate}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Net Profit / Loss</span>
            <span className={`text-2xl font-mono font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
            </span>
            <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-wider">
              Turnover: {formatCurrency(totalTurnover)}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Return on Investment (ROI)</span>
            <span className={`text-3xl font-mono font-bold ${overallROI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {overallROI >= 0 ? '+' : ''}{overallROI.toFixed(2)}%
            </span>
            <p className="mt-2 text-[10px] text-slate-500 leading-tight">Persentase laba bersih dibandingkan dengan total nilai kapital yang diputar.</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-white pt-4">Rincian Performa per Pasar</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Full Time Result (1X2)</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-mono text-white">{ftrWinRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full" style={{ width: `${ftrWinRate}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Rekor (W-L)</span>
                  <span className="text-sm font-bold text-white">{metrics.ftr.wins} - {metrics.ftr.losses}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Profit</span>
                  <span className={`text-sm font-bold ${ftrProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ftrProfit >= 0 ? '+' : ''}{formatCurrency(ftrProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Over / Under 2.5</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-mono text-white">{ouWinRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full rounded-full" style={{ width: `${ouWinRate}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Rekor (W-L)</span>
                  <span className="text-sm font-bold text-white">{metrics.ou.wins} - {metrics.ou.losses}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Profit</span>
                  <span className={`text-sm font-bold ${ouProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ouProfit >= 0 ? '+' : ''}{formatCurrency(ouProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Parlay Combos</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-mono text-white">{parlayWinRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${parlayWinRate}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Rekor (W-L)</span>
                  <span className="text-sm font-bold text-white">{metrics.parlay.wins} - {metrics.parlay.losses}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Profit</span>
                  <span className={`text-sm font-bold ${parlayProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    <div className="max-w-7xl mx-auto pt-6 pb-12 px-4">

      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Model Performance</h1>
          <p className="text-slate-400 text-sm mt-1">Laporan evaluasi tingkat kemenangan dan Return on Investment (ROI) dari agen AI.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Musim</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <option value="ALL">Semua Musim</option>
              {availableSeasonsList.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Bankroll</span>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none"
            />
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Bet Parlay</span>
            <input
              type="number"
              value={ticketStake}
              onChange={(e) => setTicketStake(Number(e.target.value))}
              className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {showSkeleton ? (
        // Skeleton berukuran mirip konten asli (4 kartu atas + 3 kartu pasar),
        // supaya tinggi halaman tidak melonjak drastis saat data selesai dimuat.
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm h-[104px]">
                <div className="h-2 w-24 bg-slate-700 rounded mb-4"></div>
                <div className="h-8 w-20 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
          <div className="h-6 w-56 bg-slate-800 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm h-[172px]">
                <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-700 h-11"></div>
                <div className="p-5 space-y-4">
                  <div className="h-2 w-full bg-slate-700 rounded"></div>
                  <div className="h-4 w-3/4 bg-slate-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : content}
    </div>
  );
}