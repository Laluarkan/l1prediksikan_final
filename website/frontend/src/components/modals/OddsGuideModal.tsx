'use client';

import { X, TrendingUp, HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface OddsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OddsGuideModal({ isOpen, onClose }: OddsGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-800 border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700/50 transition-colors"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Panduan Odds & Value Bet AI
            </h2>
            <p className="text-xs text-slate-400">
              Konsep dasar probabilitas & ekspektasi matematis positif (+EV)
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4 text-xs text-slate-300">
          
          <div className="p-4 bg-slate-900/70 border border-slate-700/60 rounded-2xl space-y-2">
            <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} /> Apa itu Value Bet?
            </h3>
            <p className="leading-relaxed text-slate-300">
              Value Bet terjadi ketika estimasi probabilitas model AI kami lebih tinggi dibandingkan probabilitas implisit yang ditawarkan oleh bursa taruhan (Odds Bandar).
            </p>
            <div className="p-2.5 bg-slate-800/80 rounded-xl font-mono text-[11px] text-emerald-300">
              Formula: (Probabilitas AI × Odds) &gt; 1.00
            </div>
          </div>

          <div className="p-4 bg-slate-900/70 border border-slate-700/60 rounded-2xl space-y-2">
            <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2">
              <HelpCircle size={16} /> Cara Membaca Rekomendasi
            </h3>
            <ul className="space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong className="text-white">Edge %:</strong> Margin keunggulan probabilitas matematis di atas harga bursa pasar.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong className="text-white">Winrate:</strong> Persentase kemenangan historis dari model prediksi pada liga terkait.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong className="text-white">Poin Parlay:</strong> Skor akumulasi kecocokan kombinasi laga berisiko terukur.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-300 block">Pengelolaan Finansial (Bankroll)</span>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Gunakan ukuran unit tetap (misalnya 1-2% dari total modal) untuk meminimalkan dampak varians statistik jangka pendek.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-300/90 text-[11px]">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <span>Platform ini ditujukan untuk tujuan analisis statistik dan riset matematis. Selalu bermain secara bijak dan bertanggung jawab.</span>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-xl transition-colors"
        >
          Mengerti & Tutup
        </button>
      </div>
    </div>
  );
}
