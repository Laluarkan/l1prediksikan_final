/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

interface League {
  id: number;
  code: string;
  name: string;
  country: string;
}

interface TeamStanding {
  rank: number;
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export default function StandingsPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  // Catatan performa (CLS): state loading di-default jadi `true` (sebelumnya `false`).
  // Dulu, render pertama sebelum fetch selesai jatuh ke cabang "Tidak ada data..."
  // (karena `loading=false` dan `standings=[]`), lalu begitu `loading` di-set `true`
  // saat fetch mulai, tampilan berpindah ke skeleton, dan sekali lagi berpindah ke
  // tabel penuh saat data datang -- dua kali lompatan tinggi. Dengan default `true`,
  // urutannya jadi konsisten: skeleton -> tabel, cuma satu kali transisi ukuran.
  const [loading, setLoading] = useState(true);

  const generateSeasons = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startYear = 2021;
    const latestStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;

    const seasons = [];
    for (let y = latestStartYear; y >= startYear; y--) {
      const y1 = y.toString().slice(-2);
      const y2 = (y + 1).toString().slice(-2);
      seasons.push(`${y1}/${y2}`);
    }
    return seasons;
  };

  const [availableSeasons] = useState<string[]>(generateSeasons());
  const [selectedSeason, setSelectedSeason] = useState<string>(availableSeasons[0]);
  const [selectedLeague, setSelectedLeague] = useState<string>('E0');

  useEffect(() => {
    api.get('/leagues/')
      .then((res) => {
        const data = res.data.results || res.data;
        setLeagues(data);
        if (data.length > 0 && !selectedLeague) setSelectedLeague(data[0].code);
      })
      .catch((err) => console.error("Gagal memuat liga:", err));
  }, []);

  useEffect(() => {
    if (!selectedLeague || !selectedSeason) return;

    setLoading(true);
    api.get('/standings/', { params: { league: selectedLeague, season: selectedSeason } })
      .then((res) => {
        setStandings(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat klasemen:", err);
        setLoading(false);
      });
  }, [selectedLeague, selectedSeason]);

  return (
    <div className="max-w-5xl mx-auto pt-6 pb-12 px-4">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">League Standings</h1>
          <p className="text-slate-400 text-sm mt-1">Klasemen resmi liga berdasarkan riwayat pertandingan di database.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Liga</span>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none appearance-none cursor-pointer"
            >
              {leagues.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Musim</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none appearance-none cursor-pointer"
            >
              {availableSeasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          // Skeleton tabel dengan jumlah baris mendekati klasemen liga sungguhan (20 tim),
          // supaya tinggi kontainer sudah mendekati final SEBELUM data datang, dan tidak
          // melonjak drastis saat tabel asli akhirnya dirender.
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-4 text-center w-12">#</th>
                  <th className="px-4 py-4 font-semibold text-white">Club</th>
                  <th className="px-4 py-4 text-center">MP</th>
                  <th className="px-4 py-4 text-center">W</th>
                  <th className="px-4 py-4 text-center">D</th>
                  <th className="px-4 py-4 text-center">L</th>
                  <th className="px-4 py-4 text-center hidden sm:table-cell">GF</th>
                  <th className="px-4 py-4 text-center hidden sm:table-cell">GA</th>
                  <th className="px-4 py-4 text-center">GD</th>
                  <th className="px-4 py-4 text-center font-bold text-white text-base">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {Array(20).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3"><div className="h-3 w-32 bg-slate-700 rounded"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell"><div className="h-3 w-4 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-6 bg-slate-700 rounded mx-auto"></div></td>
                    <td className="px-4 py-3 text-center"><div className="h-3 w-5 bg-slate-700 rounded mx-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-20 text-sm text-slate-400">Tidak ada data pertandingan untuk musim dan liga ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-4 text-center w-12">#</th>
                  <th className="px-4 py-4 font-semibold text-white">Club</th>
                  <th className="px-4 py-4 text-center">MP</th>
                  <th className="px-4 py-4 text-center">W</th>
                  <th className="px-4 py-4 text-center">D</th>
                  <th className="px-4 py-4 text-center">L</th>
                  <th className="px-4 py-4 text-center hidden sm:table-cell">GF</th>
                  <th className="px-4 py-4 text-center hidden sm:table-cell">GA</th>
                  <th className="px-4 py-4 text-center">GD</th>
                  <th className="px-4 py-4 text-center font-bold text-white text-base">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {standings.map((team, idx) => (
                  <tr key={team.team} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-500 font-mono">{team.rank}</td>
                    <td className="px-4 py-3 font-bold text-white">{team.team}</td>
                    <td className="px-4 py-3 text-center">{team.p}</td>
                    <td className="px-4 py-3 text-center">{team.w}</td>
                    <td className="px-4 py-3 text-center">{team.d}</td>
                    <td className="px-4 py-3 text-center">{team.l}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">{team.gf}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">{team.ga}</td>
                    <td className="px-4 py-3 text-center">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                    <td className="px-4 py-3 text-center font-bold text-white bg-slate-900/20">{team.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}