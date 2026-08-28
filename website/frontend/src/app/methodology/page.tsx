/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { BrainCircuit, LineChart, Target } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Metodologi Algoritma | L1 Prediksi-Kan',
  description: 'Cara kerja Machine Learning kami dalam mendeteksi Value Bet.',
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Metodologi Algoritma
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Mendeteksi inefisiensi pasar menggunakan pendekatan kuantitatif.
          </p>
        </div>

        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <BrainCircuit className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-blue-400">Konsep "Value Bet"</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Inti dari sistem kami adalah pencarian <strong>Value Bet</strong>. Sebuah <em>value bet</em> terjadi ketika probabilitas suatu hasil pertandingan yang dihitung oleh algoritma kami lebih besar daripada probabilitas yang tersirat dari <em>odds</em> pasar.
            </p>
            <p>
              Misalnya, jika pasar memberikan odds 2.00 untuk kemenangan tim tuan rumah (probabilitas tersirat 50%), namun model Machine Learning kami menghitung probabilitas kemenangan sebenarnya adalah 60%, maka selisih 10% tersebut adalah <em>Value</em>. Sistem kami secara otomatis akan merekomendasikan pertandingan ini.
            </p>
          </div>
        </section>

        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <LineChart className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-400">Faktor Evaluasi Model</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Model kami mengevaluasi dua pasar utama: <strong>FTR (Full Time Result)</strong> dan <strong>O/U 2.5 (Over/Under 2.5 Goals)</strong>. Evaluasi ini dilakukan dengan memproses ribuan baris data historis yang mencakup:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Pergerakan rata-rata <em>odds</em> (Home, Draw, Away).</li>
              <li>Rasio ekspektasi gol (*Expected Goals/xG*) historis kandang dan tandang.</li>
              <li>Deviasi standar dari performa tim dibandingkan dengan nilai pasar mereka.</li>
            </ul>
          </div>
        </section>

        <div className="pt-8 flex justify-center">
          <Link href="/" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-600">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}