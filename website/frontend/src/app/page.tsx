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
    <div className="bg-[#06130D] min-h-screen pb-12 md:pb-24 overflow-hidden">

      {/* ================= HERO ================= */}
      <section className="relative w-full border-b border-[#17301F] px-4 md:px-6 py-14 md:py-24">
        <HeroBackground />

        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-center">

          {/* Kolom teks — rata kiri, bukan center generik */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#0D2117] border border-[#22412C] rounded-full pl-1.5 pr-4 py-1 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FA34D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3FA34D]"></span>
              </span>
              <span className="text-[11px] font-mono text-[#8FA396] tracking-wide">MUSIM 25/26 &middot; SEDANG BERJALAN</span>
            </div>

            <h1 className={`${oswald.className} text-3xl sm:text-5xl md:text-6xl text-[#F3F6F1] leading-[1.1] mb-6`}>
              Baca pertandingan sebelum peluit dibunyikan.
            </h1>

            <p className="text-sm md:text-lg text-[#8FA396] mb-8 leading-relaxed max-w-xl">
              Odds pasar, statistik head-to-head, dan performa dari 11 liga Eropa diolah jadi satu rekomendasi taruhan yang presisi — bukan tebakan di menit terakhir.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/fixtures"
                className="group inline-flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#3FA34D] text-[#06130D] px-6 py-3 rounded-lg font-bold transition-colors text-sm md:text-base"
              >
                Lihat Jadwal Pertandingan
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/standings"
                className="inline-flex items-center justify-center bg-transparent hover:bg-[#0D2117] text-[#F3F6F1] border border-[#22412C] px-6 py-3 rounded-lg font-bold transition-colors text-sm md:text-base"
              >
                Statistik &amp; Klasemen
              </Link>
            </div>
          </div>

          {/* Kolom visual — papan taktik mini, bukan ilustrasi generik */}
          <div className="hidden lg:block relative">
            <div className="bg-[#0D2117] border border-[#17301F] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 text-[11px] font-mono text-[#8FA396]">
                <span>FORMASI ANALITIK</span>
                <span>4-3-3</span>
              </div>
              <svg viewBox="0 0 300 380" className="w-full h-auto">
                <rect x="4" y="4" width="292" height="372" rx="8" fill="none" stroke="#22412C" strokeWidth="2" />
                <line x1="4" y1="190" x2="296" y2="190" stroke="#22412C" strokeWidth="2" />
                <circle cx="150" cy="190" r="42" fill="none" stroke="#22412C" strokeWidth="2" />
                {[
                  [150, 340, 'GK'],
                  [70, 280, 'BEK'],
                  [150, 290, 'BEK'],
                  [230, 280, 'BEK'],
                  [60, 210, 'GEL'],
                  [150, 220, 'GEL'],
                  [240, 210, 'GEL'],
                  [60, 130, 'SYP'],
                  [150, 100, 'STR'],
                  [240, 130, 'SYP'],
                ].map(([cx, cy, label], idx) => (
                  <g key={idx}>
                    <circle cx={Number(cx)} cy={Number(cy)} r="12" fill="#3FA34D" fillOpacity="0.9" />
                    <text x={Number(cx)} y={Number(cy) + 24} textAnchor="middle" fontSize="9" fill="#8FA396" fontFamily="monospace">
                      {label}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#8FA396] border-t border-[#17301F] pt-3">
                <span>Peluang Home Win</span>
                <span className="text-[#3FA34D] font-bold">62.4%</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-28 mt-10 md:mt-16 relative z-20">

        <StatsCounter />

        <HotFixturesSection />

        {/* ================= LEMBAR STATISTIK / FITUR ================= */}
        <section>
          <div className="mb-6 md:mb-10">
            <h2 className={`${oswald.className} text-xl md:text-3xl text-[#F3F6F1] mb-2`}>Cara kerja analitiknya</h2>
            <p className="text-xs md:text-base text-[#8FA396]">Tiga lapisan analisis yang berjalan di setiap pertandingan yang dipindai.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">

            <div className="bg-[#0D2117] border border-[#17301F] border-l-4 border-l-[#3FA34D] rounded-lg p-5 md:p-7">
              <div className="flex items-center gap-2 mb-4">
                <Crosshair className="text-[#3FA34D] w-5 h-5" />
                <span className="text-[11px] font-mono text-[#3FA34D] tracking-wide">VALUE</span>
              </div>
              <h3 className="text-base md:text-xl font-bold text-[#F3F6F1] mb-2">Value Bet Detection</h3>
              <p className="text-[#8FA396] text-[13px] md:text-sm leading-relaxed">
                Membandingkan probabilitas AI dengan probabilitas tersirat dari odds pasar untuk menemukan celah edge yang rasional — seperti mencari ruang kosong di lini pertahanan lawan.
              </p>
            </div>

            <div className="bg-[#0D2117] border border-[#17301F] border-l-4 border-l-[#E8B94A] rounded-lg p-5 md:p-7">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="text-[#E8B94A] w-5 h-5" />
                <span className="text-[11px] font-mono text-[#E8B94A] tracking-wide">COMBO</span>
              </div>
              <h3 className="text-base md:text-xl font-bold text-[#F3F6F1] mb-2">Dynamic Parlay Logic</h3>
              <p className="text-[#8FA396] text-[13px] md:text-sm leading-relaxed">
                Algoritma menyeleksi pertandingan dengan tingkat probabilitas terbaik dan merangkumnya menjadi kombinasi tiket parlay harian, layaknya menyusun starting line-up terbaik.
              </p>
            </div>

            <div className="bg-[#0D2117] border border-[#17301F] border-l-4 border-l-[#F3F6F1] rounded-lg p-5 md:p-7">
              <div className="flex items-center gap-2 mb-4">
                <ShieldHalf className="text-[#F3F6F1] w-5 h-5" />
                <span className="text-[11px] font-mono text-[#F3F6F1] tracking-wide">DEFENSE</span>
              </div>
              <h3 className="text-base md:text-xl font-bold text-[#F3F6F1] mb-2">Manajemen Modal RL</h3>
              <p className="text-[#8FA396] text-[13px] md:text-sm leading-relaxed">
                Mengintegrasikan agen Reinforcement Learning dengan porsi Kelly Criterion untuk menjaga modal tetap solid, seperti lini belakang yang menjaga clean sheet musim ini.
              </p>
            </div>

          </div>
        </section>

        <PerformanceSection />

      </div>
    </div>
  );
}