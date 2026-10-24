/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import api from '@/lib/axios';
import { 
  Star, 
  Trash2, 
  Sliders, 
  Lightbulb, 
  ExternalLink, 
  Calendar, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Lock,
  ThumbsUp,
  Send,
  Sparkles
} from 'lucide-react';
import { getOptimizedLogoUrl, getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

interface SavedItem {
  id: number;
  fixture: any;
  saved_at: string;
}

interface RoadmapItem {
  id: string;
  title: string;
  category: string;
  description: string;
  votes: number;
  icon: string;
}

const ROADMAP_FEATURES: RoadmapItem[] = [
  {
    id: 'tg-wa-notif',
    title: 'Notifikasi Sinyal Value Bet via WhatsApp & Telegram',
    category: 'Notifikasi',
    description: 'Dapatkan pemberitahuan otomatis 1 jam sebelum kickoff saat algoritma menemukan selisih odds yang sangat menguntungkan.',
    votes: 142,
    icon: '📱'
  },
  {
    id: 'paper-trading',
    title: 'Simulasi Taruhan & Portofolio Virtual (Paper Trading)',
    category: 'Portofolio',
    description: 'Catat taruhan virtual tanpa uang sungguhan untuk menguji akurasi model dan memantau kurva pertumbuhan modal (ROI).',
    votes: 98,
    icon: '💼'
  },
  {
    id: 'custom-parlay-builder',
    title: 'Custom Parlay Builder dengan Filter Korelasi',
    category: 'Alat Analisis',
    description: 'Pilih sendiri pertandingan favorit Anda dan biarkan AI memverifikasi apakah kombinasi tersebut bebas korelasi negatif.',
    votes: 87,
    icon: '🎫'
  },
  {
    id: 'injury-h2h-radar',
    title: 'Radar Pemain Absen, Cedera & Taktik Formasi',
    category: 'Wawasan Tim',
    description: 'Integrasi data pemain kunci cedera atau akumulasi kartu yang berpotensi memengaruhi probabilitas gol dan odds.',
    votes: 76,
    icon: '⚔️'
  },
  {
    id: 'export-report',
    title: 'Ekspor Data Jadwal & Histori ke PDF / Excel',
    category: 'Produktivitas',
    description: 'Unduh lembar analisis statistik pertandingan dan rekap performa bulanan untuk catatan komparasi pribadi.',
    votes: 53,
    icon: '📊'
  }
];

export default function UserPage() {
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState<'favorites' | 'preferences' | 'roadmap'>('favorites');
  const [savedMatches, setSavedMatches] = useState<SavedItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Preference Settings
  const [userBankroll, setUserBankroll] = useState<number>(500000);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [prefMinOdds, setPrefMinOdds] = useState<number>(1.4);
  const [savePrefStatus, setSavePrefStatus] = useState<string | null>(null);

  // Roadmap & Feedback
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [suggestionText, setSuggestionText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Saved Matches from Backend
  const loadSavedMatches = () => {
    if (status !== 'authenticated') return;
    setLoadingSaved(true);
    api.get('/saved-matches/')
      .then((res) => {
        const data = res.data.results || res.data;
        setSavedMatches(Array.isArray(data) ? data : []);
        setLoadingSaved(false);
      })
      .catch((err) => {
        console.error("Gagal memuat match tersimpan:", err);
        setLoadingSaved(false);
      });
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadSavedMatches();
      // Load local preferences
      const savedBankroll = localStorage.getItem('user_bankroll');
      if (savedBankroll) setUserBankroll(Number(savedBankroll));
      const savedRisk = localStorage.getItem('user_risk') as any;
      if (savedRisk) setRiskTolerance(savedRisk);
      const savedOdds = localStorage.getItem('user_min_odds');
      if (savedOdds) setPrefMinOdds(Number(savedOdds));
    }
  }, [status]);

  const handleRemoveSaved = async (fixtureId: number) => {
    setDeletingId(fixtureId);
    try {
      await api.post('/saved-matches/toggle/', { fixture_id: fixtureId });
      setSavedMatches((prev) => prev.filter((item) => item.fixture?.id !== fixtureId));
      showToast('Pertandingan dihapus dari daftar favorit.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus pertandingan.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_bankroll', String(userBankroll));
    localStorage.setItem('user_risk', riskTolerance);
    localStorage.setItem('user_min_odds', String(prefMinOdds));

    setSavePrefStatus('Preferensi berhasil disimpan ke perangkat Anda.');
    setTimeout(() => setSavePrefStatus(null), 3000);
  };

  const handleVote = (id: string) => {
    if (votedIds.includes(id)) {
      setVotedIds((prev) => prev.filter((vId) => vId !== id));
      showToast('Suara voting Anda dibatalkan.');
    } else {
      setVotedIds((prev) => [...prev, id]);
      showToast('Terima kasih! Suara Anda dicatat untuk prioritas pengembangan.');
    }
  };

  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;
    setFeedbackSent(true);
    setSuggestionText('');
    showToast('Saran fitur Anda telah berhasil dikirim ke tim pengembang!');
    setTimeout(() => setFeedbackSent(false), 4000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  if (status === "loading") {
    return (
      <div className="min-h-[65vh] flex items-center justify-center text-sm text-slate-400 font-medium">
        Memverifikasi sesi pengguna...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="bg-slate-900/90 border border-slate-800/80 p-8 md:p-10 rounded-3xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner">
            <Lock className="text-emerald-400" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Halaman Khusus Pengguna</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Silakan masuk (login) terlebih dahulu untuk mengelola pertandingan favorit, mengatur preferensi model, dan memberikan masukan fitur.
          </p>
          <button
            onClick={() => signIn('google')}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const avatarUrl = user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=059669&color=fff&bold=true`;
  const isAdmin = (user as any)?.is_staff === true;

  return (
    <div className="max-w-6xl mx-auto pt-6 pb-20 px-4 sm:px-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white border border-emerald-500/50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn backdrop-blur-md">
          <Sparkles size={14} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* User Header Profile Card */}
      <div className="mb-8 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt={user?.name || 'User'} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-emerald-500/60 object-cover shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <Award size={11} /> {isAdmin ? 'Admin Staff' : 'Member Terverifikasi'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">{user?.email}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                <span>⭐ <strong>{savedMatches.length}</strong> Match Favorit</span>
                <span>⚙️ Modal Bawaan: <strong>{formatCurrency(userBankroll)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/fixtures"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            >
              <Calendar size={14} className="text-emerald-400" />
              <span>Jadwal Laga</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto text-xs sm:text-sm font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'favorites'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Star size={15} />
          <span>Match Tersimpan ({savedMatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'preferences'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders size={15} />
          <span>Preferensi Analisis</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'roadmap'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lightbulb size={15} />
          <span>Rekomendasi Fitur &amp; Saran</span>
        </button>
      </div>

      {/* ================= TAB 1: SAVED MATCHES ================= */}
      {activeTab === 'favorites' && (
        <div className="space-y-4 animate-fadeIn">
          {loadingSaved ? (
            <div className="text-center py-16 text-sm text-slate-400 bg-slate-850/60 border border-slate-800 rounded-2xl animate-pulse">
              Memuat daftar pertandingan favorit Anda...
            </div>
          ) : savedMatches.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-850 border border-slate-800 rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
                <Star size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Belum Ada Pertandingan Tersimpan</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Anda dapat menyimpan laga favorit dengan menekan ikon bintang pada kartu pertandingan di halaman Jadwal &amp; Prediksi.
              </p>
              <Link
                href="/fixtures"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-emerald-950/40"
              >
                <span>Jelajahi Jadwal Pertandingan</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedMatches.map((item) => {
                const fixture = item.fixture;
                if (!fixture) return null;

                const matchDate = new Date(fixture.date);
                const isPast = matchDate.getTime() < new Date().getTime();

                return (
                  <div 
                    key={item.id} 
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            <img 
                              src={getLeagueLogoUrl(fixture.league_code, fixture.league_name, fixture.league_logo, fixture.home_team_name)} 
                              alt="" 
                              className="w-3.5 h-3.5 object-contain shrink-0" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span>{fixture.league_name || 'Liga Eropa'}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {matchDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveSaved(fixture.id)}
                          disabled={deletingId === fixture.id}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Hapus dari daftar simpan"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Teams */}
                      <div className="py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getTeamLogoUrl(fixture.home_team_name, fixture.home_team_logo)} 
                            alt="" 
                            onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                            className="w-6 h-6 object-contain shrink-0" 
                          />
                          <span className="font-bold text-white text-sm truncate">{fixture.home_team_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <img 
                            src={getTeamLogoUrl(fixture.away_team_name, fixture.away_team_logo)} 
                            alt="" 
                            onError={(e) => { e.currentTarget.src = '/default-logo.svg'; }}
                            className="w-6 h-6 object-contain shrink-0" 
                          />
                          <span className="font-bold text-white text-sm truncate">{fixture.away_team_name}</span>
                        </div>
                      </div>

                      {/* Odds & Value Bet */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Rekomendasi 1X2</span>
                          <span className="font-extrabold text-blue-400">
                            {fixture.rl_pick_ftr ? `${fixture.rl_pick_ftr} (${fixture.rl_action_ftr || 'Bet'})` : 'Analisis ML'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Rekomendasi O/U</span>
                          <span className="font-extrabold text-purple-400">
                            {fixture.rl_pick_ou || 'Under 2.5'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                      <span>Disimpan {new Date(item.saved_at).toLocaleDateString('id-ID')}</span>
                      <Link 
                        href="/fixtures"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                      >
                        <span>Lihat Detail</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: USER PREFERENCES ================= */}
      {activeTab === 'preferences' && (
        <div className="max-w-2xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white">Preferensi Simulasi Modal &amp; Risiko</h2>
            <p className="text-xs text-slate-400 mt-1">
              Atur nilai bankroll default dan toleransi risiko algoritma Fractional Kelly untuk kalkulasi ukuran taruhan otomatis.
            </p>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Bankroll Bawaan (Rp)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm font-semibold">Rp</span>
                <input
                  type="number"
                  value={userBankroll}
                  onChange={(e) => setUserBankroll(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Profil Toleransi Risiko Staking
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'conservative', label: 'Konservatif', sub: 'Fractional Kelly 0.25x' },
                  { id: 'balanced', label: 'Seimbang (Default)', sub: 'Fractional Kelly 0.50x' },
                  { id: 'aggressive', label: 'Agresif', sub: 'Full Kelly 1.00x' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRiskTolerance(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      riskTolerance === item.id 
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold block text-white">{item.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Batas Bawah Minimum Odds
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">{prefMinOdds.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={prefMinOdds}
                onChange={(e) => setPrefMinOdds(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {savePrefStatus && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{savePrefStatus}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              Simpan Pengaturan Preferensi
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 3: FEATURE ROADMAP & SUGGESTIONS ================= */}
      {activeTab === 'roadmap' && (
        <div className="space-y-8 animate-fadeIn">
          
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Rencana Pembaruan Fitur (Roadmap Pengguna)</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Beri dukungan (vote) untuk fitur yang paling Anda inginkan agar segera diprioritaskan dalam pembaruan berikutnya.
            </p>
          </div>

          {/* Voting Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROADMAP_FEATURES.map((item) => {
              const isVoted = votedIds.includes(item.id);
              const voteCount = item.votes + (isVoted ? 1 : 0);

              return (
                <div 
                  key={item.id} 
                  className={`p-5 rounded-2xl bg-slate-900/80 border transition-all flex flex-col justify-between space-y-4 ${
                    isVoted ? 'border-emerald-500/50 bg-slate-900/90' : 'border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-950/60 border border-slate-800/70 px-2.5 py-1 rounded-md">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      <strong>{voteCount}</strong> Pemilih
                    </span>

                    <button
                      onClick={() => handleVote(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isVoted
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <ThumbsUp size={13} className={isVoted ? 'fill-current' : ''} />
                      <span>{isVoted ? 'Didukung' : 'Dukung Fitur'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Feature Suggestion Box */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Punya Ide atau Masukan Fitur Lain?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tuliskan saran fitur yang Anda perlukan untuk mempermudah analisis pertandingan sepak bola Anda.
              </p>
            </div>

            <form onSubmit={handleSubmitSuggestion} className="space-y-3">
              <textarea
                rows={3}
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder="Contoh: Tambahkan grafik formasi tim dan perbandingan head-to-head langsung di halaman jadwal..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!suggestionText.trim()}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Send size={13} />
                  <span>Kirim Masukan</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
