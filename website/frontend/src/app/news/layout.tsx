import React, { Suspense } from 'react';
import Link from 'next/link';
import NewsNavTabs from '@/components/NewsNavTabs';

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-[#f8fafc] text-slate-900 min-h-screen font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* 1. TOP EDITORIAL BAR (RESPONSIF MOBILE & DESKTOP) */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2 sm:gap-3 truncate pr-2">
              <span className="hidden sm:inline font-semibold text-slate-700">{currentDate}</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-slate-600 font-medium truncate text-[11px] sm:text-xs">
                Portal Jurnalisme & Data Sepak Bola
              </span>
            </div>
            
            <Link 
              href="/fixtures" 
              className="shrink-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span className="sm:hidden">Match Center →</span>
              <span className="hidden sm:inline">Platform Match Center →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. EDITORIAL BRAND HEADER */}
      <header className="border-b border-slate-200 bg-white shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
            <div>
              <Link href="/news" className="inline-block group">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <img 
                    src="/logo.svg" 
                    alt="Prediksi-Kan Logo" 
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs border border-slate-200 group-hover:opacity-95 transition"
                  />
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-slate-950">
                      PREDIKSI-KAN <span className="text-blue-600 font-sans font-normal text-lg sm:text-xl md:text-2xl">NEWS</span>
                    </h1>
                  </div>
                </div>
              </Link>
              <p className="mt-1.5 sm:mt-2 text-xs md:text-sm text-slate-600 font-medium max-w-xl leading-relaxed">
                Jurnalisme Sepak Bola Berbasis Data, Analisis Taktik, Bedah Parlay & Probabilitas Matematika
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">11 Liga Top Eropa</span>
            </div>
          </div>

          {/* Navigasi Kategori dengan Indikator Aktif Berwarna Biru & Touch Scroll Mobile */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Suspense fallback={
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-full max-w-md"></div>
            }>
              <NewsNavTabs />
            </Suspense>
          </div>
        </div>
      </header>

      {/* 3. KONTEN UTAMA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* 4. EDITORIAL FOOTER MANDIRI (TEMA TERANG) */}
      <footer className="border-t border-slate-200 bg-white mt-16 py-12 text-slate-600 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/logo.svg" 
                  alt="Prediksi-Kan" 
                  className="w-7 h-7 rounded-lg object-contain border border-slate-200"
                />
                <span className="font-serif font-black text-slate-900 text-lg">PREDIKSI-KAN NEWS</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed max-w-md">
                Media informasi olahraga independen. Seluruh ulasan taktik, tren statistik, dan kalkulasi probabilitas diproses secara matematis untuk memberikan wawasan objektif bagi para pecinta sepak bola.
              </p>
              <div className="text-xs text-slate-500">
                © {new Date().getFullYear()} Prediksi-Kan News. All rights reserved.
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Rubrik Berita</h4>
              <ul className="space-y-2 text-xs text-slate-600 font-medium">
                <li><Link href="/news?category=big_match" className="hover:text-blue-600">Big Match & Derby Eropa</Link></li>
                <li><Link href="/news?category=value_bet" className="hover:text-blue-600">Sinyal Best Value Bet</Link></li>
                <li><Link href="/news?category=parlay" className="hover:text-blue-600">Ulasan Seluruh Tiket Parlay</Link></li>
                <li><Link href="/news?category=match_preview" className="hover:text-blue-600">Match Preview Harian</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Akses Platform Utama</h4>
              <ul className="space-y-2 text-xs text-slate-600 font-medium">
                <li><Link href="/fixtures" className="text-blue-600 font-semibold hover:underline">Match Center →</Link></li>
                <li><Link href="/parlays" className="hover:text-blue-600">Tiket Parlay Aktif</Link></li>
                <li><Link href="/history" className="hover:text-blue-600">Riwayat Hasil Pertandingan</Link></li>
                <li><Link href="/performance" className="hover:text-blue-600">Transparansi Performa Model</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>Informasi berbasis data statistik. Bertaruhlah secara bijak dan bertanggung jawab (18+).</p>
            <div className="flex gap-4">
              <Link href="/legal" className="hover:underline">Kebijakan Privasi</Link>
              <Link href="/legal" className="hover:underline">Syarat & Ketentuan</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
