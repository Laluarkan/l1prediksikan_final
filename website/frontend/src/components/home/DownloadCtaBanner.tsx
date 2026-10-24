/* eslint-disable @next/next/no-img-element */
'use client';

import { Download, ExternalLink, ShieldCheck, Zap, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export default function DownloadCtaBanner() {
  return (
    <section className="relative my-12 md:my-20">
      <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 shadow-2xl">
        
        {/* Background Graphic with gradient overlay */}
        <div className="absolute inset-0 opacity-20 md:opacity-25 pointer-events-none mix-blend-luminosity overflow-hidden">
          <img
            src="/mobile-showcase/feature_graphic_1024x500.png"
            alt="Fitur Aplikasi Mobile"
            className="w-full h-full object-cover object-center scale-105 filter blur-[1px]"
          />
        </div>

        {/* Ambient colored lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-10 md:p-14 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Headlines & Benefits (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Siap Mengubah Cara Anda <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Menganalisis Sepak Bola?</span>
              </h2>

              <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
                Unduh aplikasi Android <strong>L1 Prediksi-Kan</strong> sekarang. Nikmati kemudahan membaca peluang matematis murni, tiket parlay, dan data cuaca lapangan secara instan kapan saja.
              </p>

              {/* Verified Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>100% Bebas Iklan Judi</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <Zap size={16} className="text-cyan-400 shrink-0" />
                  <span>Update Odds Otomatis</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium col-span-2 sm:col-span-1">
                  <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                  <span>Kompatibel Android 7.0+</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <a
                  href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm md:text-base shadow-[0_10px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>Unduh File APK Langsung</span>
                  <span className="text-[11px] font-mono bg-emerald-950/40 px-2 py-0.5 rounded text-emerald-100">~48 MB</span>
                </a>

                <a
                  href="https://apkpure.com/prediksikan-%E2%80%93-analitik-bola/id.prediksikan.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm md:text-base transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                >
                  <ExternalLink size={17} className="text-slate-400" />
                  <span>Unduh via APKPure</span>
                </a>
              </div>

            </div>

            {/* Right Column: Visual App Banner Card (5 cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-800/90 shadow-2xl p-4 transition-transform duration-300 hover:scale-[1.02]">
                
                {/* Feature Graphic Banner */}
                <div className="relative rounded-xl overflow-hidden aspect-[16/9] mb-4 border border-slate-700">
                  <img
                    src="/mobile-showcase/feature_graphic_1024x500.png"
                    alt="L1 Prediksi-Kan Banner"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider bg-emerald-600/90 px-2.5 py-1 rounded-md backdrop-blur-sm">
                      Versi Terbaru v1.4.0
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-1 rounded">
                      48.2 MB
                    </span>
                  </div>
                </div>

                {/* App Identity Row */}
                <div className="flex items-center gap-3.5 px-1 py-1">
                  <img
                    src="/mobile-showcase/app_icon_512x512.svg"
                    alt="Logo Aplikasi"
                    className="w-12 h-12 rounded-xl border border-slate-700 shadow-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">Prediksikan – Analitik Bola</h4>
                    <p className="text-xs text-slate-400 truncate">id.prediksikan.app • APKPure Official</p>
                  </div>
                  <a
                    href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors shrink-0"
                    title="Download APK"
                  >
                    <Download size={18} />
                  </a>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
