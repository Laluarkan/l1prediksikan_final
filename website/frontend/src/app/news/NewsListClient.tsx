/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { getOptimizedLogoUrl } from '@/lib/logo';
import { Search, X, Calendar, ChevronDown } from 'lucide-react';

export interface ArticleItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  category_display: string;
  tags: string[];
  reading_time: string;
  views_count: number;
  created_at: string;
  home_team_name?: string;
  away_team_name?: string;
  home_team_logo?: string;
  away_team_logo?: string;
  league_name?: string;
  match_date?: string;
  week_key?: string;
}

export interface RoundItem {
  key: string;
  iso_key: string;
  label: string;
  date_range: string;
  is_latest: boolean;
  article_count: number;
}

interface NewsListClientProps {
  initialData?: {
    rounds: RoundItem[];
    season: string;
    articles: ArticleItem[];
  };
  initialCategory?: string;
  initialRound?: string;
}

export default function NewsListClient({
  initialData,
  initialCategory = 'all',
  initialRound = 'latest',
}: NewsListClientProps) {
  const [articles, setArticles] = useState<ArticleItem[]>(initialData?.articles || []);
  const [rounds, setRounds] = useState<RoundItem[]>(initialData?.rounds || []);
  const [selectedRound, setSelectedRound] = useState<string>(initialRound);
  const [currentSeason, setCurrentSeason] = useState<string>(initialData?.season || '2026/2027');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const isFirstMount = useRef(true);

  // Sinkronisasi data saat props dari Server Component (SSR) berubah (misal saat klik tab kategori)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (initialData?.articles) {
      setArticles(initialData.articles);
    }
    if (initialData?.rounds && initialData.rounds.length > 0) {
      setRounds(initialData.rounds);
    }
    if (initialData?.season) {
      setCurrentSeason(initialData.season);
    }
    setSelectedRound(initialRound);
    setVisibleCount(8);
    setSearchQuery('');
  }, [initialCategory, initialRound, initialData]);

  // Handler saat user mengganti pekan melalui dropdown selector
  const handleRoundChange = async (newRound: string) => {
    setSelectedRound(newRound);
    setSearchQuery('');
    setVisibleCount(8);
    setLoading(true);
    try {
      let url = `/articles/?page_size=100&round=${encodeURIComponent(newRound)}`;
      if (initialCategory && initialCategory !== 'all') {
        url += `&category=${encodeURIComponent(initialCategory)}`;
      }
      const res = await api.get(url);
      const data = res.data.results || res.data || [];
      setArticles(data);
    } catch (e) {
      console.error('Gagal mengambil daftar artikel berita:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(q) ||
      (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [articles, searchQuery]);

  // Artikel Utama (Featured)
  const featuredArticle = filteredArticles[0];
  const remainingArticles = filteredArticles.slice(1);
  const visibleRemainingArticles = remainingArticles.slice(0, visibleCount);

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'big_match':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'value_bet':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'parlay':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryTitle = () => {
    switch (initialCategory) {
      case 'big_match': return 'Big Match & Derby';
      case 'value_bet': return 'Sinyal Best Value Bet';
      case 'parlay': return 'Ulasan Seluruh Tiket Parlay';
      case 'match_preview': return 'Match Preview Pertandingan';
      default: return 'Seluruh Berita & Analisis Terbaru';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. SELEKTOR PEKAN PERTANDINGAN & MUSIM SAAT INI (RESPONSIF) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pekan Pertandingan
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Musim {currentSeason}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 font-normal">
              {selectedRound === 'latest' 
                ? 'Secara default menampilkan artikel untuk pekan terakhir. Pekan lain tersimpan dalam arsip.' 
                : selectedRound === 'all'
                ? `Menampilkan seluruh artikel musim ${currentSeason}.`
                : 'Menampilkan arsip artikel untuk pekan yang dipilih.'}
            </p>
          </div>
        </div>

        {/* Pilihan Dropdown / Selector Pekan (Label Aksesibel Permanen untuk Screen Reader & Lighthouse) */}
        <div className="flex items-center gap-2">
          <label htmlFor="round-select" className="text-xs font-semibold text-slate-700 shrink-0">
            Pilih Pekan:
          </label>
          <div className="relative w-full sm:w-auto min-w-[240px]">
            <select
              id="round-select"
              aria-label="Pilih Pekan Pertandingan"
              value={selectedRound}
              onChange={(e) => handleRoundChange(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
            >
              {rounds.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} ({r.article_count} artikel)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. HEADER RUBRIK & PENCARIAN (RESPONSIF MOBILE) */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-black text-slate-900">
            {getCategoryTitle()}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
            <span suppressHydrationWarning>
              {loading ? 'Memperbarui data...' : `Menampilkan ${filteredArticles.length} artikel`}
            </span>
            {selectedRound === 'latest' && (
              <>
                <span>•</span>
                <span className="text-blue-700 font-semibold">Pekan Terakhir</span>
              </>
            )}
          </div>
        </div>

        {/* Input Search dengan Tombol Hapus Cepat */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="news-search-input"
            aria-label="Cari artikel berita berdasarkan tim, liga, atau kata kunci"
            type="text"
            placeholder="Cari tim, liga, atau laga..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(8);
            }}
            className="w-full pl-8 sm:pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium placeholder:text-slate-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setVisibleCount(8);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-0.5 rounded cursor-pointer"
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. KONTEN BERITA */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600 text-xs font-medium">Memuat artikel berita terbaru...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16 sm:py-20 text-center bg-white rounded-xl border border-slate-200 px-4">
          <p className="text-slate-700 text-sm font-medium">
            {searchQuery 
              ? `Tidak ditemukan artikel dengan kata kunci "${searchQuery}".` 
              : 'Belum ada artikel yang diterbitkan untuk rubrik ini.'}
          </p>
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setVisibleCount(8);
              }}
              className="mt-3 text-xs text-blue-700 font-bold hover:underline cursor-pointer"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* FEATURED / HERO ARTICLE */}
          {featuredArticle && (
            <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 p-5 sm:p-7 md:p-8 items-center">
                <div className="lg:col-span-8 space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-md font-bold border text-[10px] sm:text-[11px] ${getCategoryBadgeClass(featuredArticle.category)}`}>
                      {featuredArticle.category_display}
                    </span>
                    {featuredArticle.league_name && (
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] sm:text-[11px] border border-slate-200">
                        {featuredArticle.league_name}
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 text-[11px] font-medium">
                      {featuredArticle.reading_time}
                    </span>
                  </div>

                  <Link href={`/news/${featuredArticle.slug}`}>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-slate-900 group-hover:text-blue-600 transition leading-snug sm:leading-tight">
                      {featuredArticle.title}
                    </h3>
                  </Link>

                  <p className="text-slate-600 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3">
                    {featuredArticle.excerpt}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 font-medium">
                      <span>Tim Analis Prediksi-Kan</span>
                      <span>•</span>
                      <span suppressHydrationWarning>
                        {new Date(featuredArticle.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <Link 
                      href={`/news/${featuredArticle.slug}`}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900"
                    >
                      Baca Selengkapnya →
                    </Link>
                  </div>
                </div>

                {/* Visual Match Badge untuk Featured Article (Menggunakan Next Image untuk Optimasi Format WebP & Ukuran Ringan) */}
                <div className="lg:col-span-4 bg-white rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center">
                  {featuredArticle.home_team_logo && featuredArticle.away_team_logo ? (
                    <div className="w-full space-y-2.5 sm:space-y-3">
                      <div className="flex items-center justify-center gap-3 sm:gap-4">
                        <Image 
                          src={getOptimizedLogoUrl(featuredArticle.home_team_logo)} 
                          alt={featuredArticle.home_team_name || 'Home Team'} 
                          width={56}
                          height={56}
                          priority
                          className="w-11 h-11 sm:w-14 sm:h-14 object-contain"
                          onError={(e) => { (e.target as any).src = '/default-logo.svg'; }}
                        />
                        <span className="text-slate-500 font-black text-xs sm:text-sm">VS</span>
                        <Image 
                          src={getOptimizedLogoUrl(featuredArticle.away_team_logo)} 
                          alt={featuredArticle.away_team_name || 'Away Team'} 
                          width={56}
                          height={56}
                          priority
                          className="w-11 h-11 sm:w-14 sm:h-14 object-contain"
                          onError={(e) => { (e.target as any).src = '/default-logo.svg'; }}
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {featuredArticle.home_team_name} vs {featuredArticle.away_team_name}
                      </div>
                      <div className="inline-block px-2.5 py-0.5 sm:py-1 bg-white text-slate-700 rounded text-[10px] sm:text-[11px] font-semibold border border-slate-200">
                        Analisis Data & Prediksi AI
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2 py-3 sm:py-4">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Rangkuman Tiket Akumulator
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Seluruh Tiket Parlay Aktif Pekan Ini
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )}

          {/* GRID BERITA LAINNYA (DENGAN NEXT IMAGE RESPONSIVE & WEBP OTOMATIS) */}
          {remainingArticles.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {visibleRemainingArticles.map((art) => (
                  <article 
                    key={art.id} 
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                      {/* Header Card */}
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${getCategoryBadgeClass(art.category)}`}>
                          {art.category_display}
                        </span>
                        <span className="text-slate-600 text-[10px] sm:text-[11px] font-semibold">
                          {art.views_count} views
                        </span>
                      </div>

                      {/* Logo Klub (Next Image Otomatis WebP, Dimensi Akurat 24x24) */}
                      {art.home_team_logo && art.away_team_logo && (
                        <div className="flex items-center gap-2 py-0.5">
                          <Image 
                            src={getOptimizedLogoUrl(art.home_team_logo)} 
                            alt={art.home_team_name || 'Home'} 
                            width={24}
                            height={24}
                            loading="lazy"
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain" 
                            onError={(e) => { (e.target as any).src = '/default-logo.svg'; }}
                          />
                          <span className="text-slate-500 text-xs font-bold">vs</span>
                          <Image 
                            src={getOptimizedLogoUrl(art.away_team_logo)} 
                            alt={art.away_team_name || 'Away'} 
                            width={24}
                            height={24}
                            loading="lazy"
                            className="w-5 h-5 sm:w-6 sm:h-6 object-contain" 
                            onError={(e) => { (e.target as any).src = '/default-logo.svg'; }}
                          />
                          <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 ml-auto truncate max-w-[130px]">
                            {art.league_name}
                          </span>
                        </div>
                      )}

                      {/* Judul */}
                      <Link href={`/news/${art.slug}`}>
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug text-sm sm:text-base font-serif">
                          {art.title}
                        </h4>
                      </Link>

                      {/* Excerpt */}
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                        {art.excerpt}
                      </p>
                    </div>

                    {/* Footer Card */}
                    <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>{art.reading_time}</span>
                      <Link 
                        href={`/news/${art.slug}`}
                        className="font-bold text-blue-700 hover:text-blue-900"
                      >
                        Baca →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Tombol Muat Lebih Banyak (Load More Pagination) */}
              {remainingArticles.length > visibleCount && (
                <div className="pt-8 pb-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 8)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-blue-600 hover:text-blue-700 text-slate-700 text-xs font-bold shadow-2xs hover:shadow-xs transition active:scale-98 cursor-pointer"
                  >
                    <span>Muat Lebih Banyak Artikel</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      +{remainingArticles.length - visibleCount} lagi
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
