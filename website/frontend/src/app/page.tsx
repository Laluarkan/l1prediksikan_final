/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { ArrowRight, Activity, ShieldCheck, Zap, TrendingUp, DollarSign, Crosshair } from 'lucide-react';

const ParticleNetwork = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let particles: any[] = [];
    let animationFrameId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1
        });
      }
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', resize);
    resize();
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none" />;
};

const AnimatedCounter = ({ end, suffix = "", prefix = "" }: { end: number, suffix?: string, prefix?: string }) => {
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
  return <span className="font-mono">{prefix}{count.toLocaleString('id-ID')}{suffix}</span>;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [hotFixtures, setHotFixtures] = useState<any[]>([]);
  const [perfData, setPerfData] = useState<any>(null);
  
  useEffect(() => {
    setMounted(true);
    api.get('/fixtures/')
      .then(res => {
        const data = res.data.results || res.data;
        const now = new Date().getTime();
        const upcoming = data.filter((f: any) => new Date(f.date).getTime() > now);
        setHotFixtures(upcoming.slice(0, 3));
      }).catch(() => {});
    api.get('/performance-metrics/')
      .then(res => setPerfData(res.data))
      .catch(() => {});
  }, []);
  
  const formatWITA = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }) + ' WITA';
  };

  return (
    <div className="bg-slate-900 min-h-screen pb-16 md:pb-24 overflow-hidden">
      
      <section className="relative w-full min-h-[75vh] md:min-h-[85vh] flex items-center justify-center text-center px-4 md:px-6 border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/40 to-slate-900 z-0"></div>
        <ParticleNetwork />
        
        <div className={`relative z-10 max-w-5xl mx-auto transition-all duration-1000 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} mt-10 md:mt-0`}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-slate-400 tracking-tight mb-4 md:mb-8 leading-tight px-2">
            Kalkulasi Kuantitatif.<br className="hidden sm:block"/>Keputusan Presisi.
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-slate-400 mb-8 md:mb-12 leading-relaxed max-w-3xl mx-auto font-light px-2">
            Platform analitik sepak bola bertenaga AI yang memproses pergerakan odds pasar dan data historis untuk mengidentifikasi probabilitas matematis murni.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-5 px-4">
            <Link href="/fixtures" className="group relative inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] text-sm md:text-base">
              Lihat Fixtures 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform md:w-[18px] md:h-[18px]" />
            </Link>
            <Link href="/history" className="inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold transition-colors text-sm md:text-base">
              Jelajahi Data Historis
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-32 -mt-8 md:-mt-16 relative z-20">
        
        <section className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 transition-all duration-1000 delay-300 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-4 md:p-6 rounded-2xl text-center shadow-xl">
            <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-1 md:mb-2"><AnimatedCounter end={11} /></h3>
            <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Liga Eropa</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-4 md:p-6 rounded-2xl text-center shadow-xl">
            <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-1 md:mb-2"><AnimatedCounter end={25000} suffix="+" /></h3>
            <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Match Dianalisis</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-4 md:p-6 rounded-2xl text-center shadow-xl">
            <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-1 md:mb-2"><AnimatedCounter end={68} suffix="%" /></h3>
            <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Win Rate</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-4 md:p-6 rounded-2xl text-center shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-2xl md:text-4xl font-extrabold text-white mb-1 md:mb-2"><AnimatedCounter end={24} suffix="/7" /></h3>
            <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-semibold">Real-time</p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Fixtures</h2>
          </div>
          {hotFixtures.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {hotFixtures.map((fixture) => (
                <div key={fixture.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 md:p-6 hover:border-slate-500 transition-colors group cursor-default">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] md:text-xs font-medium text-slate-400 bg-slate-900 px-2 md:px-3 py-1 rounded-full">{fixture.league_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{formatWITA(fixture.date)}</span>
                  </div>
                  <div className="flex flex-col space-y-1 mb-5 md:mb-6">
                    <div className="text-base md:text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">{fixture.home_team_name}</div>
                    <div className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold">vs</div>
                    <div className="text-base md:text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">{fixture.away_team_name}</div>
                  </div>
                  <div className="border-t border-slate-700/50 pt-3 md:pt-4 flex justify-between items-center">
                    <span className="text-[10px] md:text-xs text-slate-400">Rekomendasi:</span>
                    <span className="text-xs md:text-sm font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded">
                      {fixture.rl_stake_ftr > 0 ? `FTR ${fixture.rl_pick_ftr}` : fixture.rl_stake_ou > 0 ? `O/U ${fixture.rl_pick_ou}` : 'SKIP'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 text-center text-slate-400 text-sm md:text-base">
               Memindai pertandingan dengan Value Bet tertinggi...
             </div>
          )}
          <div className="text-center mt-6 md:mt-8">
            <Link href="/fixtures" className="text-blue-400 hover:text-blue-300 font-semibold text-xs md:text-sm inline-flex items-center gap-1 transition-colors">
              Lihat Seluruh Jadwal <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        <section>
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 md:mb-4 tracking-tight">Arsitektur Analitik</h2>
            <p className="text-sm md:text-base text-slate-400 px-4">Dirancang secara eksklusif untuk objektivitas dan akurasi data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-6 md:p-8 rounded-2xl h-full flex flex-col items-start">
                <div className="p-2 md:p-3 bg-slate-900 rounded-lg mb-4 md:mb-6"><Crosshair className="text-blue-400 w-5 h-5 md:w-6 md:h-6" /></div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Value Bet Detection</h3>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  Membandingkan probabilitas AI dengan probabilitas tersirat dari odds pasar untuk menemukan celah edge yang rasional.
                </p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-6 md:p-8 rounded-2xl h-full flex flex-col items-start">
                <div className="p-2 md:p-3 bg-slate-900 rounded-lg mb-4 md:mb-6"><Zap className="text-purple-400 w-5 h-5 md:w-6 md:h-6" /></div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Dynamic Parlay Logic</h3>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  Algoritma menyeleksi pertandingan dengan tingkat probabilitas terbaik dan merangkumnya menjadi kombinasi tiket parlay harian.
                </p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-6 md:p-8 rounded-2xl h-full flex flex-col items-start">
                <div className="p-2 md:p-3 bg-slate-900 rounded-lg mb-4 md:mb-6"><ShieldCheck className="text-emerald-400 w-5 h-5 md:w-6 md:h-6" /></div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Manajemen Modal RL</h3>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  Mengintegrasikan agen Reinforcement Learning dengan porsi Kelly Criterion untuk manajemen bankroll yang tahan uji variansi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {perfData && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl p-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0"></div>
            <div className="relative z-10 bg-slate-800/40 backdrop-blur border border-slate-700/50 p-6 md:p-12 rounded-[14px] md:rounded-[22px]">
              <div className="flex flex-col justify-between items-start md:items-center gap-4 md:gap-8 mb-6 md:mb-10 border-b border-slate-700/50 pb-6 md:pb-8">
                <div>
                  <h2 className="text-xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2 md:gap-3">
                    <TrendingUp className="text-blue-500 w-5 h-5 md:w-6 md:h-6" /> Bukti Kinerja Historis
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm">Transparansi penuh dari hasil prediksi model AI terhadap hasil nyata di lapangan.</p>
                </div>
                <Link href="/model-performance" className="bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm px-4 md:px-6 py-2 md:py-2.5 rounded-lg transition-colors whitespace-nowrap w-full md:w-auto text-center">
                  Lihat Metrik Lengkap
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-slate-900/80 border border-slate-700 p-5 md:p-6 rounded-xl md:rounded-2xl">
                  <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Total Return FTR</div>
                  <div className={`text-2xl md:text-3xl font-mono font-bold flex items-center ${perfData.ftr.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {perfData.ftr.unit_profit >= 0 ? '+' : ''}{perfData.ftr.unit_profit.toFixed(2)} <span className="text-xs md:text-sm text-slate-500 ml-2">Units</span>
                  </div>
                  <div className="mt-3 md:mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(perfData.ftr.wins / (perfData.ftr.wins + perfData.ftr.losses)) * 100}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-slate-900/80 border border-slate-700 p-5 md:p-6 rounded-xl md:rounded-2xl">
                  <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Total Return O/U</div>
                  <div className={`text-2xl md:text-3xl font-mono font-bold flex items-center ${perfData.ou.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {perfData.ou.unit_profit >= 0 ? '+' : ''}{perfData.ou.unit_profit.toFixed(2)} <span className="text-xs md:text-sm text-slate-500 ml-2">Units</span>
                  </div>
                  <div className="mt-3 md:mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(perfData.ou.wins / (perfData.ou.wins + perfData.ou.losses)) * 100}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-slate-900/80 border border-slate-700 p-5 md:p-6 rounded-xl md:rounded-2xl">
                  <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 md:mb-4">Total Return Parlay</div>
                  <div className={`text-2xl md:text-3xl font-mono font-bold flex items-center ${perfData.parlay.unit_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {perfData.parlay.unit_profit >= 0 ? '+' : ''}{perfData.parlay.unit_profit.toFixed(2)} <span className="text-xs md:text-sm text-slate-500 ml-2">Units</span>
                  </div>
                  <div className="mt-3 md:mt-4 flex items-center gap-1.5 md:gap-2">
                    <DollarSign size={14} className="text-amber-500 md:w-4 md:h-4" />
                    <span className="text-[10px] md:text-xs text-slate-400">Diuji menggunakan 1 Unit per Tiket</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}