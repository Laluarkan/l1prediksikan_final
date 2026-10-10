import Link from 'next/link';
import { Oswald } from 'next/font/google';
import { ArrowRight } from 'lucide-react';
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
          <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className={`${oswald.className} text-xl md:text-3xl text-white mb-2 uppercase tracking-wide`}>
                Cara Kerja Analitiknya
              </h2>
              <p className="text-xs md:text-base text-slate-400">Tiga lapisan pemrosesan data di setiap pertandingan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t border-b lg:border-b-0 lg:border-l lg:border-t border-slate-800">
            {/* Step 1 */}
            <div className="p-6 md:p-8 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-800 hover:bg-slate-800/30 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tahap 01</div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-3">Value Bet Detection</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                Membandingkan probabilitas murni hasil model statistik dengan probabilitas tersirat dari odds pasar untuk menemukan celah (edge) yang menguntungkan.
              </p>
              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Metrik Kunci</span>
                  <span className="text-sm text-slate-200 font-mono">EV (Expected Value) &gt; 0</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 md:p-8 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-800 hover:bg-slate-800/30 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tahap 02</div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-3">Dynamic Parlay Logic</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                Algoritma menyeleksi pertandingan dengan tingkat probabilitas tertinggi dan merangkumnya menjadi rekomendasi tiket parlay harian.
              </p>
              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Metrik Kunci</span>
                  <span className="text-sm text-slate-200 font-mono">Min. Win Rate 70%</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 md:p-8 flex flex-col relative border-b lg:border-b-0 lg:border-r lg:border-b-slate-800 lg:border-r-slate-800 hover:bg-slate-800/30 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tahap 03</div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-3">Manajemen Modal RL</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                Integrasi agen Reinforcement Learning dipadukan dengan formula Kelly Criterion untuk menentukan ukuran taruhan dan menjaga stabilitas modal.
              </p>
              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Metrik Kunci</span>
                  <span className="text-sm text-slate-200 font-mono">Fractional Kelly</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PerformanceSection />

      </div>
    </div>
  );
}