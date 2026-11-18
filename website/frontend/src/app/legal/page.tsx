/* eslint-disable react/no-unescaped-entities */
import { AlertTriangle, Scale, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Pusat Legal, Disclaimer & Kebijakan Privasi | L1 Prediksi-Kan',
  description: 'Informasi legal, syarat dan ketentuan, penafian anti-perjudian, serta kebijakan privasi dan penggunaan cookie Google AdSense di L1 Prediksi-Kan.',
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
            <h2 className="text-2xl font-bold text-emerald-400">Kebijakan Privasi &amp; Penggunaan Cookie</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed text-sm md:text-base">
            <p><strong>1. Pengumpulan Data Pengguna:</strong> Kami menghormati privasi pengunjung kami. Kami mengumpulkan data akun dasar semata-mata melalui otentikasi Google OAuth atau registrasi mandiri (nama profil dan alamat email) untuk kebutuhan manajemen sesi login, fitur simpan pertandingan, serta personalisasi dashboard pengguna. Kami tidak pernah meminta, menyimpan, atau memperjualbelikan informasi perbankan Anda.</p>
            
            <p><strong>2. File Log &amp; Data Analitik:</strong> Seperti kebanyakan situs web standar, L1 Prediksi-Kan menggunakan file log dan alat analitik (Google Analytics) untuk mengukur tren lalu lintas pengunjung, demografi agregat, serta efisiensi performa server. Informasi ini mencakup alamat protokol internet (IP), tipe browser, penyedia layanan internet (ISP), serta waktu kunjungan yang diolah secara anonim tanpa mengidentifikasi individu.</p>
            
            <p><strong>3. Kebijakan Cookie &amp; Iklan Pihak Ketiga (Google AdSense):</strong></p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Vendor pihak ketiga, termasuk Google, menggunakan <em>cookie</em> untuk menayangkan iklan yang relevan berdasarkan riwayat kunjungan pengguna sebelumnya ke situs web kami atau situs web lain di internet.</li>
              <li>Penggunaan <em>cookie</em> periklanan oleh Google (seperti DoubleClick) memungkinkan Google dan jaringan mitranya menayangkan materi iklan berkualitas kepada pengguna kami berdasarkan kunjungan mereka ke situs ini dan/atau situs lainnya.</li>
              <li>Pengguna dapat memilih untuk menonaktifkan atau menyisihkan personalisasi iklan Google kapan saja dengan membuka menu <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold">Setelan Iklan Google</a> atau melalui portal konsorsium periklanan di <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold">www.aboutads.info</a>.</li>
            </ul>

            <p><strong>4. Perlindungan dan Keamanan Data:</strong> Komunikasi pertukaran data antara browser Anda dan server kami dienkripsi penuh menggunakan sertifikat SSL/TLS (HTTPS). Kami menerapkan praktik keamanan siber enterprise untuk mencegah akses tidak sah, kebocoran data, atau manipulasi informasi.</p>

            <p><strong>5. Kontak Pengelola &amp; Pertanyaan:</strong> Jika Anda memiliki pertanyaan seputar Kebijakan Privasi, kepatuhan periklanan, atau perlindungan data di L1 Prediksi-Kan, Anda dapat menghubungi tim redaksi &amp; pengembang kami langsung melalui email resmi di: <a href="mailto:lalunaufalarkan21@gmail.com" className="text-emerald-400 underline font-semibold">lalunaufalarkan21@gmail.com</a>.</p>
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