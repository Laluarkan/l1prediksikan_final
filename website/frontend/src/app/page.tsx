import Link from 'next/link';
import { Oswald } from 'next/font/google';
import { ArrowRight, Crosshair, Layers, ShieldHalf } from 'lucide-react';
import StatsCounter from '@/components/home/StatsCounter';
import HotFixturesSection from '@/components/home/HotFixturesSection';
import PerformanceSection from '@/components/home/PerformanceSection';
import HeroBackground from '@/components/home/HeroBackground';

// Font kondensat ala papan skor stadion & jersey klub, dipakai khusus untuk judul.
// Dipasang di sini (bukan di layout.tsx) supaya perubahannya tetap terbatas
// di homepage saja.
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'] });

export default function Home() {
  return (
    <div className="bg-slate-900 min-h-screen pb-12 md:pb-24 overflow-hidden">

      {/* ================= HERO ================= */}
      {/* Tema background dikembalikan ke slate (menyatu dengan Navbar/Footer),
          aksen hijau lapangan cuma dipakai untuk garis motif & warna aksen,
          bukan warna dasar section. Panel formasi vertikal di sisi kanan
          dihapus sesuai permintaan -- hero sekarang satu kolom. */}
      <section className="relative w-full border-b border-slate-800 px-4 md:px-6 py-14 md:py-24">
        <HeroBackground />

        <div className="relative z-10 max-w-3xl mx-auto lg:mx-0 lg:ml-[10%]">
          <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pl-1.5 pr-4 py-1 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <h1 className={`${oswald.className} text-3xl sm:text-5xl md:text-6xl text-white leading-[1.1] mb-6`}>
            Baca pertandingan sebelum peluit dibunyikan.
          </h1>

          <p className="text-sm md:text-lg text-slate-400 mb-8 leading-relaxed max-w-xl">
            Odds pasar, statistik head-to-head, dan performa dari 11 liga Eropa diolah jadi satu rekomendasi taruhan yang presisi bukan tebakan di menit terakhir.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/fixtures"
              className="group inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold transition-colors text-sm md:text-base"
            >
              Lihat Jadwal Pertandingan
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/standings"
              className="inline-flex items-center justify-center bg-transparent hover:bg-slate-800 text-white border border-slate-700 px-6 py-3 rounded-lg font-bold transition-colors text-sm md:text-base"
            >
              Statistik &amp; Klasemen
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-28 mt-10 md:mt-16 relative z-20">

        <StatsCounter />

        <HotFixturesSection />

        {/* ================= LEMBAR STATISTIK / FITUR ================= */}
        <section>
          <div className="mb-6 md:mb-10">
            <h2 className={`${oswald.className} text-xl md:text-3xl text-white mb-2`}>Cara kerja analitiknya</h2>
            <p className="text-xs md:text-base text-slate-400">Tiga lapisan analisis yang berjalan di setiap pertandingan yang dipindai.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">

            <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-emerald-500 rounded-lg p-5 md:p-7">
              <h3 className="text-base md:text-xl font-bold text-white mb-2">Value Bet Detection</h3>
              <p className="text-slate-400 text-[13px] md:text-sm leading-relaxed">
                Membandingkan probabilitas AI dengan probabilitas tersirat dari odds pasar untuk menemukan celah edge yang rasional.
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-amber-400 rounded-lg p-5 md:p-7">
              <h3 className="text-base md:text-xl font-bold text-white mb-2">Dynamic Parlay Logic</h3>
              <p className="text-slate-400 text-[13px] md:text-sm leading-relaxed">
                Algoritma menyeleksi pertandingan dengan tingkat probabilitas terbaik dan merangkumnya menjadi kombinasi tiket parlay harian.
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-slate-300 rounded-lg p-5 md:p-7">
              <h3 className="text-base md:text-xl font-bold text-white mb-2">Manajemen Modal RL</h3>
              <p className="text-slate-400 text-[13px] md:text-sm leading-relaxed">
                Mengintegrasikan agen Reinforcement Learning dengan porsi Kelly Criterion untuk menjaga modal tetap solid.
              </p>
            </div>

          </div>
        </section>

        <PerformanceSection />

      </div>
    </div>
  );
}