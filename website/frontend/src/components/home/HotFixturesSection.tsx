/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/axios';

// Logika fetch & filter fixture di bawah ini sama persis dengan versi asli di page.tsx,
// hanya dipindah ke komponen client terpisah supaya bagian statis di page.tsx
// (hero, fitur) bisa dirender dari server tanpa menunggu fetch ini selesai.
const formatWITA = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }) + ' WITA';
};

export default function HotFixturesSection() {
  const [hotFixtures, setHotFixtures] = useState<any[]>([]);

  useEffect(() => {
    api.get('/fixtures/')
      .then((res) => {
        const data = res.data.results || res.data;
        const now = new Date().getTime();
        const upcoming = data.filter((f: any) => new Date(f.date).getTime() > now);
        setHotFixtures(upcoming.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4 md:mb-8">
        <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">Jadwal Pertandingan</h2>
      </div>
      {hotFixtures.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {hotFixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="bg-slate-800 border border-slate-700 rounded-xl md:rounded-2xl p-4 md:p-6 hover:border-slate-500 transition-colors group cursor-default"
            >
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <span className="text-[9px] md:text-xs font-medium text-slate-400 bg-slate-900 px-2 md:px-3 py-1 rounded-full">
                  {fixture.league_name}
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-mono">{formatWITA(fixture.date)}</span>
              </div>
              <div className="flex flex-col space-y-1 mb-4 md:mb-6">
                <div className="text-sm md:text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                  {fixture.home_team_name}
                </div>
                <div className="text-[9px] md:text-xs text-slate-500 uppercase font-semibold">vs</div>
                <div className="text-sm md:text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                  {fixture.away_team_name}
                </div>
              </div>
              <div className="border-t border-slate-700/50 pt-3 md:pt-4 flex justify-between items-center">
                <span className="text-[9px] md:text-xs text-slate-400">Rekomendasi:</span>
                <span className="text-[10px] md:text-sm font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded">
                  {fixture.rl_stake_ftr > 0
                    ? `FTR ${fixture.rl_pick_ftr}`
                    : fixture.rl_stake_ou > 0
                    ? `O/U ${fixture.rl_pick_ou}`
                    : 'SKIP'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl md:rounded-2xl p-4 md:p-8 text-center text-slate-400 text-xs md:text-base">
          Memindai pertandingan dengan Value Bet tertinggi...
        </div>
      )}
      <div className="text-center mt-5 md:mt-8">
        <Link
          href="/fixtures"
          className="text-blue-400 hover:text-blue-300 font-semibold text-xs md:text-sm inline-flex items-center gap-1 transition-colors"
        >
          Lihat Seluruh Jadwal <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}