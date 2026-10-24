/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/axios';

import { getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

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
                <span className="inline-flex items-center gap-1.5 text-[9px] md:text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700/60 px-2.5 md:px-3 py-1 rounded-full">
                  <img 
                    src={getLeagueLogoUrl(fixture.league_code, fixture.league_name, fixture.league_logo, fixture.home_team_name)} 
                    alt="" 
                    className="w-3.5 h-3.5 object-contain shrink-0" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span>{fixture.league_name || "Liga Eropa"}</span>
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-mono">{formatWITA(fixture.date)}</span>
              </div>
              <div className="flex flex-col space-y-2.5 mb-4 md:mb-6">
                <div className="flex items-center gap-2.5 text-sm md:text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  <img 
                    src={getTeamLogoUrl(fixture.home_team_name, fixture.home_team_logo)} 
                    alt="" 
                    className="w-5 h-5 md:w-6 md:h-6 object-contain shrink-0" 
                    onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                  />
                  <span className="truncate">{fixture.home_team_name}</span>
                </div>
                <div className="text-[9px] md:text-xs text-slate-500 uppercase font-semibold pl-8">vs</div>
                <div className="flex items-center gap-2.5 text-sm md:text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  <img 
                    src={getTeamLogoUrl(fixture.away_team_name, fixture.away_team_logo)} 
                    alt="" 
                    className="w-5 h-5 md:w-6 md:h-6 object-contain shrink-0" 
                    onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                  />
                  <span className="truncate">{fixture.away_team_name}</span>
                </div>
              </div>
              <div className="border-t border-slate-700/50 pt-3 md:pt-4 flex justify-between items-center">
                <span className="text-[9px] md:text-xs text-slate-400">Rekomendasi:</span>
                <span className="text-[10px] md:text-sm font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded">
                  {fixture.rl_stake_ftr > 0
                    ? (fixture.rl_pick_ftr === 'H' ? 'Home' : fixture.rl_pick_ftr === 'A' ? 'Away' : 'Draw')
                    : fixture.rl_stake_ou > 0
                    ? (fixture.rl_pick_ou?.toUpperCase().includes('OVER') || fixture.rl_pick_ou === 'O' || fixture.rl_pick_ou === 'O 2.5' ? 'Over 2.5' : fixture.rl_pick_ou?.toUpperCase().includes('UNDER') || fixture.rl_pick_ou === 'U' || fixture.rl_pick_ou === 'U 2.5' ? 'Under 2.5' : fixture.rl_pick_ou)
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