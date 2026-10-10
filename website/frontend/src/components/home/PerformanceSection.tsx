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
    // Fungsi untuk mendapatkan musim bola saat ini (mulai bulan Agustus)
    const getCurrentSeason = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0 = Jan, 11 = Dec
      
      // Jika bulan Agustus (7) atau setelahnya, masuk musim tahun_ini/tahun_depan
      if (month >= 7) {
        return `${year.toString().slice(-2)}/${(year + 1).toString().slice(-2)}`;
      }
      // Jika sebelum Agustus, masuk musim tahun_lalu/tahun_ini
      return `${(year - 1).toString().slice(-2)}/${year.toString().slice(-2)}`;
    };

    api
      .get(`/performance/?season=${getCurrentSeason()}`)
      .then((res) => setPerfData(res.data))
      .catch(() => {});
  }, []);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-3xl p-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0"></div>
      <div className="relative z-10 bg-slate-800/40 backdrop-blur border border-slate-700/50 p-5 md:p-12 rounded-[10px] md:rounded-[22px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-10 border-b border-slate-700/50 pb-5 md:pb-8">
          <div className="flex-1">
            <h2 className="text-lg md:text-3xl font-bold text-white mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
               Bukti Kinerja Historis
            </h2>
            <p className="text-slate-400 text-[10px] md:text-sm max-w-xl mb-3">
              Transparansi penuh dari hasil prediksi model AI terhadap hasil nyata di lapangan.
            </p>
            <div className="inline-flex items-start gap-2 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
              <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded flex-shrink-0">
                <DollarSign size={16} />
              </div>
              <div>
                <p className="text-white text-xs font-semibold mb-0.5">Apa itu &quot;Unit&quot;?</p>
                <p className="text-slate-400 text-[10px] md:text-xs leading-relaxed">
                  <strong>1 Unit</strong> mewakili ukuran taruhan standar Anda (misal: 1 Unit = Rp 50.000). Jika profit <strong>+10 Units</strong>, artinya Anda untung 10x lipat dari ukuran standar (Rp 500.000).
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/performance"
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-sm px-6 py-3 rounded-xl transition-colors text-center font-bold flex-shrink-0"
          >
            Lihat Detail Metrik
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
              {/* Kartu FTR */}
              <div className="bg-slate-800/80 border border-slate-700 p-4 md:p-6 rounded-lg md:rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    1X2 (Tebak Pemenang)
                  </div>
                  <h3 className="text-white text-sm md:text-base font-medium mb-3 md:mb-4">
                    Profit 1X2 Market
                  </h3>
                  <div
                    className={`text-2xl md:text-4xl font-mono font-bold flex items-end gap-2 ${
                      perfData.ftr.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {perfData.ftr.unit_profit >= 0 ? '+' : ''}
                    {perfData.ftr.unit_profit.toFixed(2)} 
                    <span className="text-[10px] md:text-sm text-slate-500 mb-1">Units</span>
                  </div>
                </div>
                
                <div className="mt-5 md:mt-6">
                  <div className="flex justify-between text-[10px] md:text-xs text-slate-400 mb-1.5">
                    <span>Akurasi (Win Rate)</span>
                    <span className="text-white font-medium">
                      {((perfData.ftr.wins / (perfData.ftr.wins + perfData.ftr.losses)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 md:h-2 rounded-full"
                      style={{ width: `${(perfData.ftr.wins / (perfData.ftr.wins + perfData.ftr.losses)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] md:text-[10px] text-slate-500 mt-1.5">
                    <span>{perfData.ftr.wins} Menang</span>
                    <span>{perfData.ftr.losses} Kalah</span>
                  </div>
                </div>
              </div>

              {/* Kartu O/U */}
              <div className="bg-slate-800/80 border border-slate-700 p-4 md:p-6 rounded-lg md:rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Over/Under
                  </div>
                  <h3 className="text-white text-sm md:text-base font-medium mb-3 md:mb-4">
                    Profit Total Gol
                  </h3>
                  <div
                    className={`text-2xl md:text-4xl font-mono font-bold flex items-end gap-2 ${
                      perfData.ou.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {perfData.ou.unit_profit >= 0 ? '+' : ''}
                    {perfData.ou.unit_profit.toFixed(2)} 
                    <span className="text-[10px] md:text-sm text-slate-500 mb-1">Units</span>
                  </div>
                </div>
                
                <div className="mt-5 md:mt-6">
                  <div className="flex justify-between text-[10px] md:text-xs text-slate-400 mb-1.5">
                    <span>Akurasi (Win Rate)</span>
                    <span className="text-white font-medium">
                      {((perfData.ou.wins / (perfData.ou.wins + perfData.ou.losses)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 md:h-2 rounded-full"
                      style={{ width: `${(perfData.ou.wins / (perfData.ou.wins + perfData.ou.losses)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] md:text-[10px] text-slate-500 mt-1.5">
                    <span>{perfData.ou.wins} Menang</span>
                    <span>{perfData.ou.losses} Kalah</span>
                  </div>
                </div>
              </div>

              {/* Kartu Parlay */}
              <div className="bg-slate-800/80 border border-amber-500/30 p-4 md:p-6 rounded-lg md:rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                  HIGH RETURN
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
                    Kombinasi / Parlay
                  </div>
                  <h3 className="text-white text-sm md:text-base font-medium mb-3 md:mb-4">
                    Profit Tiket Ganda
                  </h3>
                  <div
                    className={`text-2xl md:text-4xl font-mono font-bold flex items-end gap-2 ${
                      perfData.parlay.unit_profit >= 0 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {perfData.parlay.unit_profit >= 0 ? '+' : ''}
                    {perfData.parlay.unit_profit.toFixed(2)} 
                    <span className="text-[10px] md:text-sm text-slate-500 mb-1">Units</span>
                  </div>
                </div>
                
                <div className="mt-5 md:mt-6 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-amber-400" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-300">Skema Pengujian</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-400 leading-snug">
                    Mensimulasikan taruhan statis <strong>1 Unit per tiket parlay</strong> harian secara konsisten.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}