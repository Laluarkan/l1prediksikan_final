/* eslint-disable react/no-unescaped-entities */
import { AlertTriangle, Scale, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Legal & Disclaimer | L1 Prediksi-Kan',
  description: 'Informasi legal, syarat dan ketentuan, serta kebijakan privasi penggunaan platform L1 Prediksi-Kan.',
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Pusat Informasi Legal
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            L1 Prediksi-Kan beroperasi dengan transparansi dan kepatuhan penuh terhadap hukum.
          </p>
        </div>

        {/* DISCLAIMER SECTION */}
        <section className="bg-rose-900/20 border border-rose-500/30 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-rose-500/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-rose-400">Disclaimer Ketat Anti-Perjudian</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              <strong>L1 Prediksi-Kan BUKANLAH situs judi, agen taruhan, atau penyelenggara perjudian dalam bentuk apa pun.</strong> Kami tidak menerima, memfasilitasi, atau memproses transaksi taruhan uang asli.
            </p>
            <p>
              Platform ini murni merupakan alat <strong>analitik statistik dan riset kuantitatif</strong> yang menggunakan teknologi <em>Machine Learning</em> untuk mengevaluasi probabilitas matematis dari pertandingan sepak bola. Istilah seperti <em>"Value Bet"</em>, <em>"Stake"</em>, dan <em>"Return"</em> digunakan secara eksklusif dalam konteks simulasi dan metrik performa algoritma.
            </p>
            <p>
              Segala bentuk keputusan yang diambil oleh pengguna berdasarkan data dari platform ini adalah tanggung jawab pengguna sepenuhnya. Kami tidak bertanggung jawab atas kerugian finansial yang diakibatkan oleh penyalahgunaan informasi dari situs ini.
            </p>
          </div>
        </section>

        {/* TERMS & CONDITIONS SECTION */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Scale className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-blue-400">Syarat & Ketentuan Penggunaan</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed text-sm md:text-base">
            <p><strong>1. Penerimaan Syarat:</strong> Dengan mengakses dan menggunakan L1 Prediksi-Kan, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Jika Anda tidak setuju, harap hentikan penggunaan platform ini.</p>
            <p><strong>2. Akurasi Data:</strong> Meskipun kami menggunakan algoritma canggih, kami tidak memberikan jaminan eksplisit maupun implisit terkait akurasi, kelengkapan, atau keandalan prediksi pertandingan. Sepak bola adalah olahraga dinamis dan probabilitas tidak menjamin kepastian.</p>
            <p><strong>3. Batasan Usia:</strong> Platform ini memuat data historis pasar olahraga. Pengguna harus berusia minimal 18 tahun (atau usia legal mayoritas di yurisdiksi masing-masing) untuk mendaftar dan menggunakan dasbor performa.</p>
            <p><strong>4. Hak Kekayaan Intelektual:</strong> Seluruh kode algoritma, desain antarmuka, dan arsitektur database adalah milik intelektual pengembang L1 Prediksi-Kan.</p>
            <p><strong>5. Yurisdiksi dan Hukum yang Berlaku:</strong> Syarat dan Ketentuan ini ditafsirkan berdasarkan hukum yang berlaku di Indonesia. Segala perselisihan yang timbul dari penggunaan platform ini akan diselesaikan secara eksklusif di bawah yurisdiksi pengadilan di Kota Mataram, Nusa Tenggara Barat.</p>
          </div>
        </section>

        {/* PRIVACY POLICY SECTION */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-400">Kebijakan Privasi</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed text-sm md:text-base">
            <p><strong>Pengumpulan Data:</strong> Kami hanya mengumpulkan informasi dasar melalui layanan otentikasi Google (Google OAuth), yang mencakup alamat email dan nama profil publik Anda. Kami tidak mengumpulkan password Anda.</p>
            <p><strong>Penggunaan Data:</strong> Data yang dikumpulkan semata-mata digunakan untuk keperluan manajemen sesi (Login/Logout), verifikasi hak akses (khususnya untuk halaman Admin), dan personalisasi metrik dasbor.</p>
            <p><strong>Perlindungan Data:</strong> Komunikasi data antara server aplikasi dan database diamankan menggunakan protokol enkripsi standar industri. Kami tidak akan menjual, menyewakan, atau membagikan data pribadi Anda kepada pihak ketiga mana pun tanpa izin hukum yang sah.</p>
          </div>
        </section>

        <div className="pt-8 flex justify-center">
          <Link 
            href="/" 
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-600"
          >
            Kembali ke Beranda
          </Link>
        </div>

      </div>
    </div>
  );
}