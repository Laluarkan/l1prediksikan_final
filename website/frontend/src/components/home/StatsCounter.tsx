'use client';

import { useEffect, useState } from 'react';
import { Award, Layers, Cpu, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';

const AnimatedCounter = ({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [end]);
  return (
    <span className="font-mono">
      {prefix}
      {count.toLocaleString('id-ID')}
      {suffix}
    </span>
  );
};

export default function StatsCounter() {
  return (
    <section className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
        
        {/* Bento Card 1: Hero Metric (Win Rate & Edge) - Span 6 cols */}
        <div className="lg:col-span-6 group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-emerald-500/40 hover:shadow-[0_10px_30px_rgba(16,185,129,0.12)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award size={24} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <TrendingUp size={13} />
              <span>Positive Edge</span>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Tingkat Akurasi Model</span>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                <AnimatedCounter end={68} suffix="%" />
              </h3>
              <span className="text-xs font-semibold text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Kelly Formula
              </span>
            </div>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
            Divalidasi melalui ribuan taruhan simulasi dengan kalkulasi Expected Value (EV) positif dan manajemen alokasi modal cerdas.
          </p>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-700/60 text-[11px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80">Avg. Edge +18.4%</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80">Brier Score 0.18</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80">Monte Carlo 10k Iter</span>
          </div>
        </div>

        {/* Bento Card 2: 11 Liga Top Eropa - Span 6 cols */}
        <div className="lg:col-span-6 group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-blue-500/40 hover:shadow-[0_10px_30px_rgba(59,130,246,0.12)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers size={24} />
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-700">
              Eropa Kontinental
            </span>
          </div>

          <div className="space-y-1 mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Cakupan Kompetisi</span>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                <AnimatedCounter end={11} suffix=" Liga" />
              </h3>
            </div>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
            Meliputi liga elite utama serta liga kompetitif ber-odds menguntungkan seperti Eredivisie, Liga Portugal, dan Jupiler Pro League.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-700/60 text-[11px] font-semibold text-slate-300">
            {['EPL', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'].map((l) => (
              <span key={l} className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/70 text-slate-300 text-[10px]">
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Bento Card 3: 25.000+ Pertandingan Diproses - Span 6 cols */}
        <div className="lg:col-span-6 group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-purple-500/40 hover:shadow-[0_10px_30px_rgba(168,85,247,0.12)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Cpu size={22} />
            </div>
            <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              Big Data ML
            </span>
          </div>

          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Arsip Pertandingan</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight my-1.5">
            <AnimatedCounter end={25000} suffix="+" />
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Data historis 10+ musim dengan 45 parameter fitur mendalam: ELO tim, momentum form, rasio gol, dan riwayat odds bandar.
          </p>
        </div>

        {/* Bento Card 4: 24/7 Automated Pipeline - Span 6 cols */}
        <div className="lg:col-span-6 group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-amber-500/40 hover:shadow-[0_10px_30px_rgba(245,158,11,0.12)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Zap size={22} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistem Online</span>
            </div>
          </div>

          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Pemindaian Jadwal</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight my-1.5">
            <AnimatedCounter end={24} suffix="/7 Cron" />
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Sinkronisasi odds harian otomatis & integrasi cuaca Open-Meteo per stadion sebelum setiap pertandingan bergulir.
          </p>
        </div>

      </div>
    </section>
  );
}