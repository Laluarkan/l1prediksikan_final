import React from 'react';

interface AdPlaceholderProps {
  format?: 'leaderboard' | 'rectangle' | 'banner';
  className?: string;
  label?: string;
}

export default function AdPlaceholder({ 
  format = 'leaderboard', 
  className = '', 
  label = 'Ruang Iklan Sponsor / Google AdSense' 
}: AdPlaceholderProps) {
  // Ukuran standar iklan web:
  // Leaderboard: 728x90 (Desktop) / 320x50 (Mobile)
  // Rectangle: 300x250
  // Banner: Responsif horizontal
  
  return (
    <div className={`w-full my-6 flex flex-col items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl border border-dashed border-slate-300 bg-slate-100/80 rounded-xl p-4 text-center transition-all hover:bg-slate-100">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 block mb-2">
          {label}
        </span>
        <div className={`mx-auto flex items-center justify-center text-slate-400 font-medium text-xs bg-slate-200/60 rounded-lg border border-slate-300/60 ${
          format === 'leaderboard' 
            ? 'h-24 md:h-28 max-w-[728px]' 
            : format === 'rectangle'
            ? 'h-60 max-w-[300px]'
            : 'h-20 max-w-xl'
        }`}>
          <div className="flex flex-col items-center gap-1">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span>Slot Iklan {format.toUpperCase()} (Tersedia untuk Google AdSense / Sponsor)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

