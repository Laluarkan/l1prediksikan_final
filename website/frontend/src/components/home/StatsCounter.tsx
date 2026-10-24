'use client';

import { useEffect, useState } from 'react';
import { Award, Layers, Cpu, Zap, TrendingUp, Download, CheckCircle2 } from 'lucide-react';

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
        
        {/* Bento Card 1: Hero Metric (Win Rate & Edge) - Span 4 cols */}
        <div className="lg:col-span-4 group relative rounded-2xl p-6 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-emerald-500/40 hover:shadow-[0_10px_30px_rgba(16,185,129,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Award size={22} />
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Tingkat Akurasi Model</span>
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  <AnimatedCounter end={68} suffix="%" />
                </h3>
                <span className="text-[10px] font-semibold text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  Kelly Formula
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-4">
              Divalidasi ribuan taruhan simulasi dengan Expected Value positif & pengelolaan modal cerdas.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-700/60 text-[10px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80">Avg. Edge +18.4%</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80">Brier 0.18</span>
          </div>
        </div>

        {/* Bento Card 2: 500+ Unduhan Aplikasi (NEW - Requirement 1) - Span 4 cols */}
        <div className="lg:col-span-4 group relative rounded-2xl p-6 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-emerald-500/40 hover:shadow-[0_10px_30px_rgba(16,185,129,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Download size={22} />
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300">Total Unduhan Aplikasi</span>
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 tracking-tight">
                  <AnimatedCounter end={500} suffix="+" />
                </h3>
                <span className="text-[10px] font-semibold text-emerald-300 font-mono bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-700/40">
                  Android APK
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-4">
              Lebih dari 500 pengguna aktif mengunduh APK resmi L1 Prediksi-Kan untuk analisis peluang harian di genggaman.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-[10px]">
            <span className="font-mono text-emerald-400 font-medium">Bebas Iklan Judi</span>
            <a 
              href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white bg-emerald-600/80 hover:bg-emerald-500 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download size={11} /> Unduh APK
            </a>
          </div>
        </div>

        {/* Bento Card 3: 11 Liga Top Eropa - Span 4 cols */}
        <div className="lg:col-span-4 group relative rounded-2xl p-6 bg-gradient-to-br from-slate-800/90 via-slate-850/80 to-slate-900 border border-slate-700/80 hover:border-blue-500/40 hover:shadow-[0_10px_30px_rgba(59,130,246,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="space-y-1 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Cakupan Kompetisi</span>
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  <AnimatedCounter end={11} suffix=" Liga" />
                </h3>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-4">
              Meliputi liga elite utama serta liga kompetitif ber-odds menguntungkan di Eropa.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 pt-3 border-t border-slate-700/60">
            {['EPL', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie'].map((l) => (
              <span key={l} className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/70 text-slate-300 text-[10px]">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}