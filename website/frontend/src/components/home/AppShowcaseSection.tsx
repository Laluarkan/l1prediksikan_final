/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink, 
  Layers, 
  TrendingUp, 
  Calendar, 
  Ticket, 
  Award, 
  ArrowRight,
  Zap,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface ScreenTab {
  id: string;
  name: string;
  badge: string;
  title: string;
  description: string;
  highlightIcon: any;
  bulletPoints: { title: string; desc: string }[];
  image: string;
  colorScheme: {
    accent: string;
    border: string;
    glow: string;
    pillBg: string;
    pillText: string;
  };
}

const SCREENS: ScreenTab[] = [
  {
    id: 'beranda',
    name: 'Beranda & Rekomendasi',
    badge: 'AI Value Bet',
    title: 'Rekomendasi Pintar dengan Positive Edge',
    description: 'Menemukan celah pasar (odds edge) antara probabilitas murni statistik dan pasar taruhan secara real-time untuk 11 liga top Eropa.',
    highlightIcon: Sparkles,
    image: '/mobile-showcase/screenshot_1_beranda.png',
    bulletPoints: [
      { title: 'Value Bet Detection', desc: 'Hanya pertandingan dengan Expected Value (EV) positif yang direkomendasikan.' },
      { title: 'Model Reinforcement Learning', desc: 'Kelly Criterion cerdas untuk mengalokasikan ukuran taruhan tanpa risiko emosional.' },
      { title: 'Skor Probabilitas 1X2 & O/U', desc: 'Probabilitas matematis murni hasil kalkulasi machine learning 25.000+ laga.' }
    ],
    colorScheme: {
      accent: 'emerald',
      border: 'border-emerald-500/30',
      glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      pillBg: 'bg-emerald-500/10',
      pillText: 'text-emerald-400'
    }
  },
  {
    id: 'jadwal',
    name: 'Jadwal & Komparasi Odds',
    badge: 'Odds & Cuaca Stadion',
    title: 'Pemeriksaan Mendalam Odds & Kondisi Laga',
    description: 'Bandingkan pergerakan odds bandar utama (Bet365, Max, Avg) dan pantau perkiraan cuaca stadion untuk memprediksi ritme gol.',
    highlightIcon: Calendar,
    image: '/mobile-showcase/screenshot_2_jadwal.png',
    bulletPoints: [
      { title: 'Integrasi Cuaca Open-Meteo', desc: 'Suhu, kecepatan angin, dan presipitasi hujan langsung terhubung ke model Over/Under.' },
      { title: 'Multi-Bookmaker Odds', desc: 'Deteksi perbedaan odds Home, Draw, Away, serta Over/Under 2.5.' },
      { title: 'Indikator Edge Pasar', desc: 'Visualisasi langsung persentase selisih keuntungan terhadap tawaran pasar.' }
    ],
    colorScheme: {
      accent: 'blue',
      border: 'border-blue-500/30',
      glow: 'from-blue-500/20 via-blue-500/5 to-transparent',
      pillBg: 'bg-blue-500/10',
      pillText: 'text-blue-400'
    }
  },
  {
    id: 'parlay',
    name: 'Tiket Parlay Harian',
    badge: 'Smart Multi-Leg',
    title: 'Kombinasi Tiket Parlay dengan Filter Korelasi',
    description: 'Algoritma secara otomatis menyusun tiket kombinasi (2-leg s/d 5-leg) yang memiliki probabilitas kumulatif terbaik tanpa saling bertabrakan.',
    highlightIcon: Ticket,
    image: '/mobile-showcase/screenshot_3_parlay.png',
    bulletPoints: [
      { title: 'Anti-Correlation Filter', desc: 'Menghindari kombinasi laga yang saling melemahkan potensi kemenangan tiket.' },
      { title: 'Total Odds & Probabilitas', desc: 'Perhitungan perkalian odds dan probabilitas realistis sebelum Anda memasang.' },
      { title: 'Kurasi Tiket Otomatis', desc: 'Tiket baru disintesis setiap kali update jadwal pertandingan tiba.' }
    ],
    colorScheme: {
      accent: 'amber',
      border: 'border-amber-500/30',
      glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
      pillBg: 'bg-amber-500/10',
      pillText: 'text-amber-400'
    }
  },
  {
    id: 'klasemen',
    name: 'Klasemen & Formasi',
    badge: 'Form & Momentum',
    title: 'Peringkat ELO & Statistik Dinamis 11 Liga',
    description: 'Bukan sekadar tabel poin biasa. Pantau rasio gol kandang/tandang, tren kemenangan 5 laga terakhir, dan kekuatan relatif setiap tim.',
    highlightIcon: TrendingUp,
    image: '/mobile-showcase/screenshot_4_klasemen.png',
    bulletPoints: [
      { title: 'Peringkat ELO Dinamis', desc: 'Menilai bobot kemenangan melawan tim kuat vs tim papan bawah secara adil.' },
      { title: 'Statistik Kandang vs Tandang', desc: 'Filter spesifik kebiasaan bermain saat bertamu atau di hadapan pendukung sendiri.' },
      { title: '11 Liga Top Eropa Terlengkap', desc: 'EPL, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Liga Portugal, dan lainnya.' }
    ],
    colorScheme: {
      accent: 'purple',
      border: 'border-purple-500/30',
      glow: 'from-purple-500/20 via-purple-500/5 to-transparent',
      pillBg: 'bg-purple-500/10',
      pillText: 'text-purple-400'
    }
  },
  {
    id: 'riwayat',
    name: 'Riwayat & Audit Model',
    badge: '100% Transparan',
    title: 'Evaluasi Terbuka Tanpa Ada Rekayasa',
    description: 'Setiap rekomendasi yang diterbitkan dicatat dan dievaluasi otomatis begitu pertandingan selesai. Tidak ada prediksi yang disunting atau disembunyikan.',
    highlightIcon: Award,
    image: '/mobile-showcase/screenshot_5_riwayat.png',
    bulletPoints: [
      { title: 'Audit Publik Transparan', desc: 'Lihat status WIN / LOSS secara gamblang untuk mengukur reliabilitas jangka panjang.' },
      { title: 'Tracking Yield & Profit Modal', desc: 'Simulasi pertumbuhan saldo jika disiplin mengikuti rekomendasi Kelly Criterion.' },
      { title: 'Basis Evaluasi Musiman', desc: 'Riwayat komprehensif dari musim sebelumnya untuk validasi algoritma.' }
    ],
    colorScheme: {
      accent: 'teal',
      border: 'border-teal-500/30',
      glow: 'from-teal-500/20 via-teal-500/5 to-transparent',
      pillBg: 'bg-teal-500/10',
      pillText: 'text-teal-400'
    }
  }
];

export default function AppShowcaseSection() {
  const [activeTab, setActiveTab] = useState<string>('beranda');

  const currentScreen = SCREENS.find((s) => s.id === activeTab) || SCREENS[0];
  const IconComponent = currentScreen.highlightIcon;

  return (
    <section className="relative my-12 md:my-24 overflow-hidden">
      {/* Decorative ambient aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Section Header */}
      <div className="max-w-4xl mx-auto text-center mb-10 md:mb-16 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4 backdrop-blur-sm">
          <Smartphone size={14} className="text-emerald-400 animate-pulse" />
          <span>Aplikasi Mobile Resmi (Android)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-slate-300">Tersedia di APKPure</span>
        </div>

        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Semua Kekuatan AI Bola di <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Genggaman Anda</span>
        </h2>

        <p className="text-slate-400 text-sm md:text-lg leading-relaxed max-w-2xl mx-auto">
          Dapatkan notifikasi peluang nilai tertinggi, simulasi parlay cerdas, dan perbandingan odds langsung melalui aplikasi mobile kami yang ringan dan bebas iklan judi.
        </p>

        {/* Quick Download Buttons in Header */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <a
            href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm md:text-base shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            <span>Unduh APK Langsung</span>
            <span className="text-[11px] font-mono bg-emerald-900/40 px-2 py-0.5 rounded text-emerald-200">v1.3.0</span>
          </a>

          <a
            href="https://apkpure.com/prediksikan-%E2%80%93-analitik-bola/id.prediksikan.app/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-sm md:text-base transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
          >
            <ExternalLink size={16} className="text-slate-400" />
            <span>Halaman APKPure</span>
          </a>
        </div>
      </div>

      {/* Interactive Tabs Selector */}
      <div className="max-w-5xl mx-auto px-4 mb-8 md:mb-12">
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 scrollbar-none">
          {SCREENS.map((screen) => {
            const isActive = activeTab === screen.id;
            const ScreenIcon = screen.highlightIcon;
            return (
              <button
                key={screen.id}
                onClick={() => setActiveTab(screen.id)}
                className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-xs md:text-sm whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-slate-800 text-white border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}>
                  <ScreenIcon size={14} />
                </div>
                <span>{screen.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage: Bento Box Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gradient-to-b from-slate-800/60 via-slate-850/70 to-slate-900/90 border border-slate-700/60 rounded-3xl p-6 sm:p-8 md:p-12 backdrop-blur-xl shadow-2xl relative">
          
          {/* Subtle Corner Accents */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-tr-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-bl-3xl pointer-events-none" />

          {/* Left Details Panel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 relative z-10">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <IconComponent size={14} />
              <span>{currentScreen.badge}</span>
            </div>

            {/* Screen Title & Subtitle */}
            <div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                {currentScreen.title}
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {currentScreen.description}
              </p>
            </div>

            {/* Bullet Highlights */}
            <div className="space-y-3 pt-2">
              {currentScreen.bulletPoints.map((point, idx) => (
                <div 
                  key={idx} 
                  className="group flex items-start gap-3.5 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-slate-600 transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {point.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      {point.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Micro Feature Grid / Specs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Ukuran File</span>
                <span className="text-sm sm:text-base font-bold text-white font-mono">~48 MB</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Android OS</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">7.0+</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Keamanan</span>
                <span className="text-sm sm:text-base font-bold text-cyan-400 font-mono">Verified</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <a
                href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-900/20"
              >
                <Download size={16} />
                <span>Unduh Sekarang (APK)</span>
              </a>

              <a
                href="https://apkpure.com/prediksikan-%E2%80%93-analitik-bola/id.prediksikan.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium"
              >
                <span>Lihat info versi & changelog di APKPure</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>

          {/* Right Phone Showcase Device (5 cols) */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            
            {/* Ambient Radial Glow Behind Device */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 via-cyan-500/10 to-transparent blur-3xl rounded-full -z-10 scale-90" />

            {/* Floating Live Badge Top */}
            <div className="hidden sm:flex absolute -top-4 -left-6 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-md animate-bounce duration-1000">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="text-left">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Algoritma Aktif</span>
                <span className="text-xs font-bold text-white">Value Edge +18.4%</span>
              </div>
            </div>

            {/* Floating Live Badge Bottom */}
            <div className="hidden sm:flex absolute -bottom-4 -right-4 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <ShieldCheck size={14} />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Manajemen Risiko</span>
                <span className="text-xs font-bold text-emerald-400">Kelly Staking 2.5%</span>
              </div>
            </div>

            {/* Smartphone Mockup Frame */}
            <div className="group/phone relative w-[280px] sm:w-[310px] md:w-[330px] rounded-[44px] p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] border-2 border-slate-600/60 hover:scale-[1.02] transition-transform duration-500">
              
              {/* Phone Speaker & Dynamic Island */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
                <div className="w-2 h-2 rounded-full bg-slate-900 ml-2" />
              </div>

              {/* Screen Bezel & Container */}
              <div className="relative rounded-[36px] overflow-hidden bg-slate-950 aspect-[9/19] border border-slate-800/80 shadow-inner">
                
                {/* Real Mobile Screenshot */}
                <img
                  src={currentScreen.image}
                  alt={`Tampilan Aplikasi - ${currentScreen.name}`}
                  className="w-full h-full object-cover object-top transition-opacity duration-300"
                  loading="lazy"
                />

                {/* Subtle Glass Glare Reflex */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                {/* Bottom Home Indicator Bar */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full pointer-events-none" />
              </div>

              {/* Hardware Volume Buttons (Left) */}
              <div className="absolute -left-[5px] top-24 w-[3px] h-10 bg-slate-600 rounded-l-md" />
              <div className="absolute -left-[5px] top-38 w-[3px] h-10 bg-slate-600 rounded-l-md" />

              {/* Power Button (Right) */}
              <div className="absolute -right-[5px] top-28 w-[3px] h-14 bg-slate-600 rounded-r-md" />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
