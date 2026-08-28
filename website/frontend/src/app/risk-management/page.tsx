/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { Calculator, ShieldAlert, PieChart } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Manajemen Risiko (Kelly) | L1 Prediksi-Kan',
  description: 'Penerapan Kriteria Kelly untuk manajemen bankroll dan perlindungan modal.',
};

export default function RiskManagementPage() {
  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Manajemen Risiko (Kelly)
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Melindungi modal investasi (Bankroll) melalui pendekatan matematika yang disiplin.
          </p>
        </div>

        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-500/20 rounded-lg">
              <Calculator className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-amber-400">Apa itu Kriteria Kelly?</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Menemukan "Value Bet" saja tidak cukup. Tanpa manajemen modal (<em>Bankroll Management</em>) yang ketat, fluktuasi (*variance*) dapat menghancurkan modal Anda. L1 Prediksi-Kan menggunakan turunan dari <strong>Kriteria Kelly (Kelly Criterion)</strong> untuk menentukan ukuran taruhan (<em>Stake</em>) yang paling optimal.
            </p>
            <p>
              Rumus dasar Kelly menghitung persentase modal yang harus dialokasikan berdasarkan <em>Win Probability</em> dan <em>Odds</em> yang ditawarkan. Tujuannya adalah memaksimalkan laju pertumbuhan modal secara logaritmik seiring berjalannya waktu.
            </p>
          </div>
        </section>

        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-rose-500/20 rounded-lg">
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-rose-400">Pecahan Kelly (Fractional Kelly)</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Kriteria Kelly murni (100% Kelly) sering kali menyarankan ukuran <em>stake</em> yang terlalu agresif, yang dapat menyebabkan volatilitas ekstrem pada modal Anda jika terjadi rentetan kekalahan (*losing streak*).
            </p>
            <p>
              Oleh karena itu, sistem agen AI kami menerapkan <strong>Fractional Kelly</strong>. Anda akan sering melihat rekomendasi sistem kami berupa <strong>25% Kelly</strong>, <strong>50% Kelly</strong>, atau maksimal <strong>75% Kelly</strong>. Pendekatan moderat ini mengorbankan sebagian kecil potensi pertumbuhan demi meredam volatilitas dan meminimalisir risiko kebangkrutan hingga mendekati 0%.
            </p>
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