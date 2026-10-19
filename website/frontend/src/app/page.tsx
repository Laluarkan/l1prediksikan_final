/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Oswald } from 'next/font/google';
import { 
  ArrowRight, 
  Download, 
  Smartphone, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Award,
  Layers,
  Cpu
} from 'lucide-react';

import StatsCounter from '@/components/home/StatsCounter';
import AppShowcaseSection from '@/components/home/AppShowcaseSection';
import HotFixturesSection from '@/components/home/HotFixturesSection';
import DownloadCtaBanner from '@/components/home/DownloadCtaBanner';
import PerformanceSection from '@/components/home/PerformanceSection';
import HeroBackground from '@/components/home/HeroBackground';

// Font kondensat ala papan skor stadion & jersey klub, dipakai khusus untuk judul
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'] });

export default function Home() {
  return (
    <div className="bg-slate-900 min-h-screen pb-12 md:pb-24 overflow-hidden text-slate-100">

      {/* ================= HERO SECTION ================= */}
      <section className="relative w-full border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24 overflow-hidden">
        <HeroBackground />

        {/* Ambient neon radial lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Content Column (7 cols on lg) */}
            <div className="lg:col-span-7 relative z-10 space-y-6 text-center lg:text-left">
              
              {/* Status Pill Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-emerald-500/30 text-xs font-semibold backdrop-blur-md shadow-lg mx-auto lg:mx-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-mono">v1.3.0 Live</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">Tersedia di Web &amp; Android APK</span>
              </div>

              {/* Main Headline */}
              <h1 className={`${oswald.className} text-3xl sm:text-5xl md:text-6xl text-white leading-[1.08] tracking-tight`}>
                Baca pertandingan sebelum <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">peluit dibunyikan.</span>
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Odds pasar, statistik head-to-head, cuaca stadion, dan tren momentum dari 11 liga top Eropa diolah oleh model Machine Learning &amp; Kelly Criterion menjadi rekomendasi matematis yang presisi — bukan tebakan di menit terakhir.
              </p>

              {/* Action Buttons Group */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                {/* Direct APK Download Button */}
                <a
                  href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-6 py-3.5 rounded-xl font-bold transition-all duration-200 text-sm md:text-base shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>Unduh Aplikasi APK</span>
                  <span className="text-[10px] font-mono bg-emerald-950/40 px-2 py-0.5 rounded text-emerald-200">v1.3.0</span>
                </a>

                {/* Web Fixtures Link */}
                <Link
                  href="/fixtures"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 px-5 py-3.5 rounded-xl font-bold transition-all duration-200 text-sm md:text-base hover:-translate-y-0.5"
                >
                  <span>Jadwal &amp; Prediksi</span>
                  <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* APKPure Store Link */}
                <a
                  href="https://apkpure.com/prediksikan-%E2%80%93-analitik-bola/id.prediksikan.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium py-1"
                >
                  <ExternalLink size={13} />
                  <span>Halaman APKPure</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  <span>Bebas Iklan Judi</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-cyan-400" />
                  <span>Kelly Criterion Staking</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap size={15} className="text-amber-400" />
                  <span>Update Odds Harian</span>
                </span>
              </div>

            </div>

            {/* Right Phone Mockup Preview (5 cols on lg) */}
            <div className="lg:col-span-5 relative flex items-center justify-center pt-4 lg:pt-0">
              
              {/* Back Glow behind device */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent blur-3xl rounded-full scale-90 -z-10" />

              {/* Floating Chip 1: Top Left */}
              <div className="hidden sm:flex absolute -top-2 left-0 z-20 items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-md hover:scale-105 transition-transform cursor-default">
                <TrendingUp size={14} className="text-emerald-400" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-mono">Value Edge</span>
                  <span className="text-xs font-bold text-emerald-400">+18.4% EV</span>
                </div>
              </div>

              {/* Floating Chip 2: Bottom Right */}
              <div className="hidden sm:flex absolute -bottom-2 right-2 z-20 items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-xl backdrop-blur-md hover:scale-105 transition-transform cursor-default">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-mono">Model Win Rate</span>
                  <span className="text-xs font-bold text-white">68.4% Terverifikasi</span>
                </div>
              </div>

              {/* Phone Device Frame */}
              <div className="relative w-[260px] sm:w-[290px] md:w-[310px] rounded-[42px] p-2.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600/60 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] hover:scale-[1.02] transition-transform duration-500 group">
                
                {/* Dynamic Island / Speaker */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center">
                  <div className="w-10 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Inner Screen */}
                <div className="relative rounded-[34px] overflow-hidden bg-slate-950 aspect-[9/19] border border-slate-800 shadow-inner">
                  <img
                    src="/mobile-showcase/screenshot_1_beranda.png"
                    alt="Pratinjau Aplikasi L1 Prediksi-Kan"
                    className="w-full h-full object-cover object-top"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/40 rounded-full pointer-events-none" />
                </div>

                {/* Phone Hardware Buttons */}
                <div className="absolute -left-[4px] top-20 w-[2px] h-8 bg-slate-600 rounded-l" />
                <div className="absolute -left-[4px] top-32 w-[2px] h-8 bg-slate-600 rounded-l" />
                <div className="absolute -right-[4px] top-24 w-[2px] h-12 bg-slate-600 rounded-r" />
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 md:space-y-28 mt-10 md:mt-16 relative z-20">

        {/* ================= ASYMMETRICAL BENTO METRICS ================= */}
        <StatsCounter />

        {/* ================= INTERACTIVE MOBILE APP SHOWCASE ================= */}
        <AppShowcaseSection />

        {/* ================= HOT FIXTURES / JADWAL ================= */}
        <HotFixturesSection />

        {/* ================= LEMBAR CARA KERJA ANALITIK (BENTO STYLE) ================= */}
        <section className="relative">
          <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <Cpu size={13} />
                <span>Arsitektur Algoritma</span>
              </div>
              <h2 className={`${oswald.className} text-2xl md:text-3xl lg:text-4xl text-white uppercase tracking-wide`}>
                Cara Kerja Tiga Lapisan Analitik
              </h2>
              <p className="text-xs md:text-base text-slate-400 mt-1">
                Setiap pertandingan diproses melalui 3 tahapan matematis sebelum menghasilkan rekomendasi.
              </p>
            </div>
            <Link
              href="/methodology"
              className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
            >
              <span>Pelajari Metodologi Lengkap</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
            {/* Step 1 */}
            <div className="group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-emerald-500/40 hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 flex items-center justify-center font-mono font-bold text-sm">
                    01
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Probabilitas Murni
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  Value Bet Detection
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                  Membandingkan probabilitas murni statistik dengan probabilitas tersirat dari odds pasar untuk menemukan celah (edge) yang menguntungkan.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Metrik Evaluasi:</span>
                <span className="text-emerald-400 font-bold">EV (Expected Value) &gt; 0</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-blue-500/40 hover:shadow-[0_10px_30px_rgba(59,130,246,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 flex items-center justify-center font-mono font-bold text-sm">
                    02
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Sintesis Tiket
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  Dynamic Parlay Logic
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                  Algoritma menyeleksi pertandingan dengan tingkat probabilitas tertinggi dan mengeliminasi leg berkorelasi untuk merangkum tiket parlay harian yang realistis.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Standar Kurasi:</span>
                <span className="text-blue-400 font-bold">Min. Win Rate 70%</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative rounded-2xl p-6 sm:p-7 bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-amber-500/40 hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 flex items-center justify-center font-mono font-bold text-sm">
                    03
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Ukuran Modal
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                  Manajemen Modal RL
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                  Integrasi agen Reinforcement Learning dipadukan dengan formula Fractional Kelly Criterion untuk menentukan ukuran taruhan dan menjaga stabilitas modal.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Proteksi Drawdown:</span>
                <span className="text-amber-400 font-bold">Fractional Kelly</span>
              </div>
            </div>

          </div>
        </section>

        {/* ================= DOWNLOAD CTA BANNER WITH STORE GRAPHICS ================= */}
        <DownloadCtaBanner />

        {/* ================= HISTORICAL PERFORMANCE SECTION ================= */}
        <PerformanceSection />

      </div>
    </div>
  );
}