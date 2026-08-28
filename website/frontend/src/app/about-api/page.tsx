import { Server, Database, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Tentang Sistem API | L1 Prediksi-Kan',
  description: 'Arsitektur dan teknologi di balik platform L1 Prediksi-Kan.',
};

export default function AboutApiPage() {
  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Arsitektur Sistem & API
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Infrastruktur berkinerja tinggi yang menggerakkan analitik L1 Prediksi-Kan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="p-3 bg-blue-500/20 rounded-lg w-max mb-4">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Backend Django</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ditenagai oleh Python dan Django REST Framework, API kami dirancang untuk menangani komputasi matematika berat dan pemrosesan dataset CSV skala besar dengan keamanan JWT ketat.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="p-3 bg-emerald-500/20 rounded-lg w-max mb-4">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Redis & Celery</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Memori Redis memangkas waktu respons API dari 7 detik menjadi di bawah 0.1 detik. Pekerjaan berat (Cron Jobs) ditangani di latar belakang oleh Celery Job Queue.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="p-3 bg-purple-500/20 rounded-lg w-max mb-4">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Proteksi Anti-DDoS</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              API kami dilindungi oleh sistem Rate Limiting cerdas dan Route Guard yang memastikan ketersediaan server (uptime) tetap stabil meskipun terjadi lonjakan lalu lintas data.
            </p>
          </div>
        </div>

        <div className="pt-8 flex justify-center">
          <Link href="/" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-600">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}