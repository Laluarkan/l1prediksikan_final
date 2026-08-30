import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, Crosshair } from 'lucide-react';
import StatsCounter from '@/components/home/StatsCounter';
import HotFixturesSection from '@/components/home/HotFixturesSection';
import PerformanceSection from '@/components/home/PerformanceSection';
import HeroBackgroundLoader from '@/components/home/HeroBackgroundLoader';

export default function Home() {
  return (
    <div className="bg-slate-900 min-h-screen pb-12 md:pb-24 overflow-hidden">
      <section className="relative w-full min-h-[65vh] md:min-h-[85vh] flex items-center justify-center text-center px-4 md:px-6 border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/40 to-slate-900 z-0"></div>
        <HeroBackgroundLoader />

        <div className="relative z-10 max-w-5xl mx-auto mt-8 md:mt-0">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-slate-400 tracking-tight mb-4 md:mb-8 leading-tight px-1">
            Kalkulasi Kuantitatif.
            <br />
            Keputusan Presisi.
          </h1>
          <p className="text-xs sm:text-sm md:text-xl text-slate-400 mb-6 md:mb-12 leading-relaxed max-w-3xl mx-auto font-light px-2">
            Platform analitik sepak bola bertenaga AI yang memproses pergerakan odds pasar dan data historis untuk mengidentifikasi probabilitas matematis murni.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 px-4 max-w-xs sm:max-w-none mx-auto">
            <Link
              href="/fixtures"
              className="group relative inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 md:px-8 md:py-4 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] text-xs md:text-base w-full sm:w-auto"
            >
              Lihat Fixtures
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform md:w-[18px] md:h-[18px]" />
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-5 py-2.5 md:px-8 md:py-4 rounded-xl font-bold transition-colors text-xs md:text-base w-full sm:w-auto"
            >
              Jelajahi Data Historis
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-32 -mt-6 md:-mt-16 relative z-20">
        <StatsCounter />

        <HotFixturesSection />

        <section>
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-4 tracking-tight">Arsitektur Analitik</h2>
            <p className="text-xs md:text-base text-slate-400 px-2">Dirancang secara eksklusif untuk objektivitas dan akurasi data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-5 md:p-8 rounded-xl md:rounded-2xl h-full flex flex-col items-start">
                <div className="p-2 md:p-3 bg-slate-900 rounded-lg mb-3 md:mb-6">
                  <Crosshair className="text-blue-400 w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-xl font-bold text-white mb-2 md:mb-3">Value Bet Detection</h3>
                <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed">
                  Membandingkan probabilitas AI dengan probabilitas tersirat dari odds pasar untuk menemukan celah edge yang rasional.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-5 md:p-8 rounded-xl md:rounded-2xl h-full flex flex-col items-start">
                <div className="p-2 md:p-3 bg-slate-900 rounded-lg mb-3 md:mb-6">
                  <Zap className="text-purple-400 w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-xl font-bold text-white mb-2 md:mb-3">Dynamic Parlay Logic</h3>
                <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed">
                  Algoritma menyeleksi pertandingan dengan tingkat probabilitas terbaik dan merangkumnya menjadi kombinasi tiket parlay harian.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-5 md:p-8 rounded-xl md:rounded-2xl h-full flex flex-col items-start">
                <div className="p-2 md:p-3 bg-slate-900 rounded-lg mb-3 md:mb-6">
                  <ShieldCheck className="text-emerald-400 w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-xl font-bold text-white mb-2 md:mb-3">Manajemen Modal RL</h3>
                <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed">
                  Mengintegrasikan agen Reinforcement Learning dengan porsi Kelly Criterion untuk manajemen bankroll yang tahan uji variansi.
                </p>
              </div>
            </div>
          </div>
        </section>

        <PerformanceSection />
      </div>
    </div>
  );
}