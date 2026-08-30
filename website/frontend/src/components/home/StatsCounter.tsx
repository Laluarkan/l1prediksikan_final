'use client';

import { useEffect, useState } from 'react';

// AnimatedCounter: logika hitung-naik dari 0 ke nilai akhir TIDAK diubah sama sekali
// dari versi asli di page.tsx, hanya dipindah ke sini.
const AnimatedCounter = ({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [end]);
  return (
    <span className="font-mono">
      {prefix}
      {count.toLocaleString('id-ID')}
      {suffix}
    </span>
  );
};

export default function StatsCounter() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 md:p-6 rounded-xl md:rounded-2xl text-center shadow-xl">
        <h3 className="text-xl md:text-4xl font-extrabold text-white mb-1">
          <AnimatedCounter end={11} />
        </h3>
        <p className="text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Liga Eropa</p>
      </div>
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 md:p-6 rounded-xl md:rounded-2xl text-center shadow-xl">
        <h3 className="text-xl md:text-4xl font-extrabold text-white mb-1">
          <AnimatedCounter end={25000} suffix="+" />
        </h3>
        <p className="text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Match Dianalisis</p>
      </div>
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 md:p-6 rounded-xl md:rounded-2xl text-center shadow-xl">
        <h3 className="text-xl md:text-4xl font-extrabold text-white mb-1">
          <AnimatedCounter end={68} suffix="%" />
        </h3>
        <p className="text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Win Rate</p>
      </div>
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 md:p-6 rounded-xl md:rounded-2xl text-center shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <h3 className="text-xl md:text-4xl font-extrabold text-white mb-1">
          <AnimatedCounter end={24} suffix="/7" />
        </h3>
        <p className="text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Real-time</p>
      </div>
    </section>
  );
}