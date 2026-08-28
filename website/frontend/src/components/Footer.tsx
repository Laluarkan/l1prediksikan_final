import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-xl font-bold text-white tracking-wide">L1 Prediksi-Kan</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Platform analitik sepak bola kuantitatif yang memproses pergerakan odds pasar dan data historis untuk mengidentifikasi probabilitas matematis murni menggunakan mesin Reinforcement Learning.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Eksplorasi</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link href="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
              <li><Link href="/fixtures" className="hover:text-blue-400 transition-colors">Upcoming Fixtures</Link></li>
              <li><Link href="/standings" className="hover:text-blue-400 transition-colors">League Standings</Link></li>
              <li><Link href="/history" className="hover:text-blue-400 transition-colors">Match History</Link></li>
              <li><Link href="/performance" className="hover:text-blue-400 transition-colors">Model Performance</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Informasi</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link href="/about-api" className="hover:text-blue-400 transition-colors">Tentang Sistem API</Link></li>
              <li><Link href="/methodology" className="hover:text-blue-400 transition-colors">Metodologi Algoritma</Link></li>
              <li><Link href="/risk-management" className="hover:text-blue-400 transition-colors">Manajemen Risiko (Kelly)</Link></li>
              <li><Link href="/legal" className="hover:text-blue-400 transition-colors">Legal & Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} L1 Prediksi-Kan. Hak Cipta Dilindungi.
          </p>
          <div className="flex gap-4 text-xs text-slate-500 font-mono">
            <span>Versi 1.0.0</span>
            <span>|</span>
            <span>Data by API Eksternal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}