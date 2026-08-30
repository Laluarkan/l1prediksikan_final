/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, DollarSign } from 'lucide-react';
import api from '@/lib/axios';

// Logika fetch performance-metrics di bawah ini sama persis dengan versi asli di page.tsx,
// hanya dipindah ke komponen client terpisah.
export default function PerformanceSection() {
  const [perfData, setPerfData] = useState<any>(null);

  useEffect(() => {
    api
      .get('/performance-metrics/')
      .then((res) => setPerfData(res.data))
      .catch(() => {});
  }, []);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-3xl p-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0"></div>
      <div className="relative z-10 bg-slate-800/40 backdrop-blur border border-slate-700/50 p-5 md:p-12 rounded-[10px] md:rounded-[22px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-10 border-b border-slate-700/50 pb-5 md:pb-8">
          <div>
            <h2 className="text-lg md:text-3xl font-bold text-white mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
              <TrendingUp className="text-blue-500 w-4 h-4 md:w-6 md:h-6" /> Bukti Kinerja Historis
            </h2>
            <p className="text-slate-400 text-[10px] md:text-sm">
              Transparansi penuh dari hasil prediksi model AI terhadap hasil nyata di lapangan.
            </p>
          </div>
          <Link
            href="/performance"
            className="w-full md:w-auto bg-slate-700 hover:bg-slate-600 text-white text-[10px] md:text-sm px-6 py-3 rounded-xl transition-colors text-center font-semibold"
          >
            Lihat Metrik Lengkap
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {!perfData ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-700 p-5 md:p-6 rounded-lg md:rounded-2xl animate-pulse">
                  <div className="h-2 md:h-3 w-24 bg-slate-700 rounded mb-4"></div>
                  <div className="h-8 md:h-10 w-32 bg-slate-700 rounded mb-4"></div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-slate-700 w-1/2"></div>
                  </div>
                </div>
              ))
          ) : (
            <>
              <div className="bg-slate-900/80 border border-slate-700 p-4 md:p-6 rounded-lg md:rounded-2xl">
                <div className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 md:mb-4">
                  Total Return FTR
                </div>
                <div
                  className={`text-xl md:text-3xl font-mono font-bold flex items-center ${
                    perfData.ftr.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {perfData.ftr.unit_profit >= 0 ? '+' : ''}
                  {perfData.ftr.unit_profit.toFixed(2)} <span className="text-[10px] md:text-sm text-slate-500 ml-2">Units</span>
                </div>
                <div className="mt-2 md:mt-4 w-full bg-slate-800 rounded-full h-1 md:h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1 md:h-1.5 rounded-full"
                    style={{ width: `${(perfData.ftr.wins / (perfData.ftr.wins + perfData.ftr.losses)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-700 p-4 md:p-6 rounded-lg md:rounded-2xl">
                <div className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 md:mb-4">
                  Total Return O/U
                </div>
                <div
                  className={`text-xl md:text-3xl font-mono font-bold flex items-center ${
                    perfData.ou.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {perfData.ou.unit_profit >= 0 ? '+' : ''}
                  {perfData.ou.unit_profit.toFixed(2)} <span className="text-[10px] md:text-sm text-slate-500 ml-2">Units</span>
                </div>
                <div className="mt-2 md:mt-4 w-full bg-slate-800 rounded-full h-1 md:h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1 md:h-1.5 rounded-full"
                    style={{ width: `${(perfData.ou.wins / (perfData.ou.wins + perfData.ou.losses)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-700 p-4 md:p-6 rounded-lg md:rounded-2xl">
                <div className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 md:mb-4">
                  Total Return Parlay
                </div>
                <div
                  className={`text-xl md:text-3xl font-mono font-bold flex items-center ${
                    perfData.parlay.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {perfData.parlay.unit_profit >= 0 ? '+' : ''}
                  {perfData.parlay.unit_profit.toFixed(2)} <span className="text-[10px] md:text-sm text-slate-500 ml-2">Units</span>
                </div>
                <div className="mt-2 md:mt-4 flex items-center gap-1.5 md:gap-2">
                  <DollarSign size={12} className="text-amber-500 md:w-4 md:h-4" />
                  <span className="text-[9px] md:text-xs text-slate-400">Diuji dengan 1 Unit / Tiket</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}