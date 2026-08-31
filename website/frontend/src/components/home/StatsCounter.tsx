'use client';

import { useEffect, useState } from 'react';

// AnimatedCounter: logika hitung-naik dari 0 ke nilai akhir TIDAK diubah sama sekali
// dari versi sebelumnya, hanya restyle tampilan di sekitarnya.
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

// Gaya papan skor stadion: background disamakan ke slate (menyatu dengan
// Navbar/Footer), aksen hijau lapangan tetap dipertahankan sebagai garis atas
// tipis, dan labelnya sentence case (bukan UPPERCASE tracking-widest generik).
export default function StatsCounter() {
  const stats = [
    { end: 11, suffix: '', label: 'Liga Eropa dianalisis' },
    { end: 25000, suffix: '+', label: 'Pertandingan diproses' },
    { end: 68, suffix: '%', label: 'Win rate model' },
    { end: 24, suffix: '/7', label: 'Pemindaian jadwal' },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-slate-800 border-t-2 border-t-emerald-500 border-x border-b border-slate-700 p-3 md:p-6 rounded-b-lg text-center shadow-xl"
        >
          <h3 className="text-xl md:text-4xl font-extrabold text-white mb-1">
            <AnimatedCounter end={stat.end} suffix={stat.suffix} />
          </h3>
          <p className="text-[10px] md:text-xs text-slate-400 font-medium">{stat.label}</p>
        </div>
      ))}
    </section>
  );
}