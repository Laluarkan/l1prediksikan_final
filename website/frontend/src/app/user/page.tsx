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
  Sparkles,
  Plus,
  Check,
  User as UserIcon,
  Flame
} from 'lucide-react';
import { getOptimizedLogoUrl, getTeamLogoUrl, getLeagueLogoUrl } from '@/lib/logo';

interface SavedItem {
  id: number;
  fixture: any;
  saved_at: string;
}

interface FeatureItem {
  id: number;
  title: string;
  category: string;
  description: string;
  icon: string;
  created_by?: number | null;
  created_by_username: string;
  votes_count: number;
  has_voted: boolean;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  'Fitur Baru',
  'Notifikasi',
  'Portofolio',
  'Alat Analisis',
  'Wawasan Tim',
  'Produktivitas'
];

const ICON_OPTIONS = ['💡', '⚡', '📱', '💼', '🎫', '⚔️', '📊', '🚀'];

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

  // Roadmap & Feature Suggestions
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form for new feature
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Fitur Baru');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('💡');

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

  // Load Features from Backend
  const loadFeatures = () => {
    setLoadingFeatures(true);
    api.get('/features/')
      .then((res) => {
        const data = res.data.results || res.data;
        setFeatures(Array.isArray(data) ? data : []);
        setLoadingFeatures(false);
      })
      .catch((err) => {
        console.error("Gagal memuat rekomendasi fitur:", err);
        setLoadingFeatures(false);
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
    loadFeatures();
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

  const handleVote = async (featureId: number) => {
    if (status !== 'authenticated') {
      showToast('Silakan login terlebih dahulu untuk memberikan dukungan fitur.');
      return;
    }
    setVotingId(featureId);
    try {
      const res = await api.post(`/features/${featureId}/vote/`);
      const { has_voted, votes_count } = res.data;
      setFeatures((prev) =>
        prev
          .map((f) => (f.id === featureId ? { ...f, has_voted, votes_count } : f))
          .sort((a, b) => b.votes_count - a.votes_count)
      );
      showToast(has_voted ? 'Terima kasih! Suara dukungan Anda berhasil dicatat.' : 'Dukungan fitur dibatalkan.');
    } catch (err) {
      console.error("Gagal vote fitur:", err);
      showToast('Gagal memproses dukungan fitur.');
    } finally {
      setVotingId(null);
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Judul fitur wajib diisi.');
      return;
    }
    if (status !== 'authenticated') {
      showToast('Silakan login terlebih dahulu untuk mengusulkan fitur.');
      return;
    }

    setIsSubmittingFeature(true);
    try {
      await api.post('/features/', {
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim(),
        icon: newIcon || '💡'
      });
      showToast('Usulan rekomendasi fitur berhasil ditambahkan!');
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
      loadFeatures();
    } catch (err) {
      console.error("Gagal menambah rekomendasi fitur:", err);
      showToast('Gagal menambahkan usulan fitur.');
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  // Helper untuk Rekomendasi 1X2 (Menampilkan Model ML jika Bukan Value Bet)
  const getRecommendationFtr = (fixture: any) => {
    const isValueBet = 
      fixture.rl_stake_ftr > 0 && 
      fixture.rl_pick_ftr && 
      String(fixture.rl_pick_ftr).toLowerCase() !== 'nan';

    if (isValueBet) {
      const pickLabel = fixture.rl_pick_ftr === 'H' ? 'Home' : fixture.rl_pick_ftr === 'D' ? 'Draw' : fixture.rl_pick_ftr === 'A' ? 'Away' : fixture.rl_pick_ftr;
      return {
        text: `${pickLabel} (Value Bet)`,
        action: fixture.rl_action_ftr || 'Bet',
        isValueBet: true
      };
    }

    const probs = [
      { label: 'Home', val: Number(fixture.prob_ftr_h) || 0 },
      { label: 'Draw', val: Number(fixture.prob_ftr_d) || 0 },
      { label: 'Away', val: Number(fixture.prob_ftr_a) || 0 }
    ];
    const maxProb = probs.reduce((max, p) => p.val > max.val ? p : max, probs[0]);
    const pct = Math.round(maxProb.val * 100);

    return {
      text: `${maxProb.label} (${pct}%)`,
      action: 'Skip Bet',
      isValueBet: false
    };
  };

  // Helper untuk Rekomendasi O/U (Menampilkan Model ML jika Bukan Value Bet)
  const getRecommendationOu = (fixture: any) => {
    const isValueBet = 
      fixture.rl_stake_ou > 0 && 
      fixture.rl_pick_ou && 
      String(fixture.rl_pick_ou).toLowerCase() !== 'nan';

    if (isValueBet) {
      return {
        text: `${fixture.rl_pick_ou} (Value Bet)`,
        action: fixture.rl_action_ou || 'Bet',
        isValueBet: true
      };
    }

    const overVal = Number(fixture.prob_ou25_over) || 0;
    const underVal = Number(fixture.prob_ou25_under) || 0;
    const isOver = overVal >= underVal;
    const highestVal = isOver ? overVal : underVal;
    const pct = Math.round(highestVal * 100);
    const label = isOver ? 'Over 2.5' : 'Under 2.5';

    return {
      text: `${label} (${pct}%)`,
      action: 'Skip Bet',
      isValueBet: false
    };
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'roadmap'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lightbulb size={15} />
          <span>Rekomendasi Fitur &amp; Saran ({features.length})</span>
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
                const recFtr = getRecommendationFtr(fixture);
                const recOu = getRecommendationOu(fixture);

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
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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

                      {/* Odds & Recommendation (Fixed: Always display model ML prediction if not value bet) */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Rekomendasi 1X2</span>
                            {recFtr.isValueBet ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">Value Bet</span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">Model ML</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-extrabold ${recFtr.isValueBet ? 'text-blue-400' : 'text-slate-200'}`}>
                              {recFtr.text}
                            </span>
                            {!recFtr.isValueBet && (
                              <span className="text-[10px] text-slate-400 italic">• Skip Bet</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Rekomendasi O/U</span>
                            {recOu.isValueBet ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">Value Bet</span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">Model ML</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-extrabold ${recOu.isValueBet ? 'text-purple-400' : 'text-slate-200'}`}>
                              {recOu.text}
                            </span>
                            {!recOu.isValueBet && (
                              <span className="text-[10px] text-slate-400 italic">• Skip Bet</span>
                            )}
                          </div>
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
              <input
                type="number"
                min="10000"
                step="50000"
                value={userBankroll}
                onChange={(e) => setUserBankroll(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Toleransi Risiko Kelly
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['conservative', 'balanced', 'aggressive'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRiskTolerance(mode)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                      riskTolerance === mode
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'conservative' ? 'Konservatif (1/4)' : mode === 'balanced' ? 'Seimbang (1/2)' : 'Agresif (Full)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Batas Minimum Odds: <span className="text-emerald-400 font-mono">{prefMinOdds.toFixed(2)}</span>
              </label>
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
          
          {/* Header Roadmap with Add Suggestion Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Rencana Pembaruan Fitur &amp; Rekomendasi</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  {features.length} Ide
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Beri dukungan (vote) untuk fitur yang paling Anda inginkan agar segera diprioritaskan. Diurutkan otomatis berdasarkan suara terbanyak.
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus size={15} />
              <span>{showAddForm ? 'Tutup Formulir' : 'Usulkan Fitur Baru'}</span>
            </button>
          </div>

          {/* Form Tambah Rekomendasi Fitur (Database-backed) */}
          {showAddForm && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" />
                    <span>Usulkan Fitur atau Rekomendasi Baru</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Usulan Anda akan otomatis disimpan ke database, tertera nama pengusul, dan dapat didukung oleh anggota lainnya.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateFeature} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Judul Rekomendasi Fitur <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Contoh: Notifikasi Telegram Sinyal Underdog Otomatis"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Kategori
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Pilih Ikon Representatif
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewIcon(icon)}
                        className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all cursor-pointer ${
                          newIcon === icon
                            ? 'bg-emerald-500/20 border-emerald-500 scale-105 shadow-sm'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Deskripsi Detail &amp; Alasan
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Jelaskan bagaimana fitur ini dapat mempermudah Anda dalam menganalisis probabilitas dan odds..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeature || !newTitle.trim()}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow-md shadow-emerald-950/40 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>{isSubmittingFeature ? 'Menyimpan...' : 'Kirim Usulan Fitur'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Voting Cards Grid (Database Dynamic & Ranked by Highest Votes) */}
          {loadingFeatures ? (
            <div className="text-center py-16 text-sm text-slate-400 bg-slate-850/60 border border-slate-800 rounded-2xl animate-pulse">
              Memuat daftar rekomendasi fitur dari komunitas...
            </div>
          ) : features.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-850 border border-slate-800 rounded-3xl space-y-3">
              <Lightbulb size={32} className="text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Belum Ada Rekomendasi Fitur</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Jadilah yang pertama mengusulkan fitur baru untuk pengembangan platform L1 Prediksi-Kan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((item, idx) => {
                const isVoted = item.has_voted;
                const isTop1 = idx === 0;

                return (
                  <div 
                    key={item.id} 
                    className={`p-5 rounded-2xl bg-slate-900/80 border transition-all flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden ${
                      isVoted ? 'border-emerald-500/50 bg-slate-900/90' : 'border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    {isTop1 && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500/20 to-transparent px-3 py-1 rounded-bl-xl border-b border-l border-amber-500/30 flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Flame size={12} className="text-amber-400 fill-amber-400" />
                        <span>Paling Banyak Didukung</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{item.icon || '💡'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-950/60 border border-slate-800/70 px-2.5 py-1 rounded-md">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-300">
                          <strong>{item.votes_count}</strong> Pemilih
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          • <UserIcon size={11} className="inline" /> {item.created_by_username || 'Admin'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleVote(item.id)}
                        disabled={votingId === item.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isVoted
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {isVoted ? (
                          <>
                            <Check size={13} className="stroke-[3]" />
                            <span>Didukung</span>
                          </>
                        ) : (
                          <>
                            <ThumbsUp size={13} />
                            <span>Dukung Fitur</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
