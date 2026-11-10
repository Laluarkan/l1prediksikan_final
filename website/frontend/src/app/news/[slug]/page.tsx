/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ModernParlayCards from '@/components/ModernParlayCards';
import SafeImage from '@/components/SafeImage';
import { getOptimizedLogoUrl } from '@/lib/logo';
import { 
  Clock, 
  Eye, 
  ArrowLeft, 
  ChevronRight
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://l1prediksi-api.onrender.com/api';
  // Normalisasi slug: decode URI, trim, dan ubah spasi/karakter tidak baku menjadi tanda hubung (-)
  const rawDecoded = decodeURIComponent(slug).trim();
  const normalizedSlug = rawDecoded.replace(/\s+/g, '-').toLowerCase();

  const headers: HeadersInit = {
    'Origin': 'https://www.l1prediksikan.my.id',
    'Referer': 'https://www.l1prediksikan.my.id/news',
    'X-Sync-Secret': process.env.NEXT_PUBLIC_SYNC_SECRET || 'Laluarkan123@',
  };

  try {
    let res = await fetch(`${apiUrl}/articles/${normalizedSlug}/`, {
      headers,
      next: { revalidate: 1800 }, // ISR Cache 30 menit
    });

    // Fallback: Jika tidak ditemukan dengan normalizedSlug, coba slug aslinya
    if (!res.ok && normalizedSlug !== slug) {
      res = await fetch(`${apiUrl}/articles/${slug}/`, {
        headers,
        next: { revalidate: 1800 },
      });
    }

    if (!res.ok) {
      console.error(`getArticle failed: status ${res.status} for slug '${normalizedSlug}'`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('Error fetching article:', e);
    return null;
  }
}

async function getRelatedArticles(category: string, currentSlug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://l1prediksi-api.onrender.com/api';
  try {
    const res = await fetch(`${apiUrl}/articles/?category=${category}&page_size=4`, {
      headers: {
        'Origin': 'https://www.l1prediksikan.my.id',
        'Referer': 'https://www.l1prediksikan.my.id/news',
        'X-Sync-Secret': process.env.NEXT_PUBLIC_SYNC_SECRET || 'Laluarkan123@',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || data || [];
    return list.filter((a: any) => a.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: 'Artikel Tidak Ditemukan | Prediksi-Kan News',
    };
  }

  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt;
  const canonicalUrl = `https://www.l1prediksikan.my.id/news/${article.slug}`;

  return {
    title: `${title} | Prediksi-Kan News`,
    description: description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} | Prediksi-Kan News`,
      description: description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: article.created_at,
      modifiedTime: article.updated_at,
      section: article.category_display,
      tags: article.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(article.category, article.slug);
  const fixture = article.fixture_details;

  let parlayTickets = article.parlays_data || [];
  if (article.category === 'parlay' && (!parlayTickets || parlayTickets.length === 0)) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://l1prediksi-api.onrender.com/api';
    try {
      const pRes = await fetch(`${apiUrl}/parlays/?is_historical=false&page_size=10`, {
        next: { revalidate: 1800 },
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        parlayTickets = pData.results || pData || [];
      }
    } catch {
      // fallback silently
    }
  }

  // JSON-LD Structured Data Schema untuk Google Search
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.created_at,
    dateModified: article.updated_at,
    author: [{
      '@type': 'Organization',
      name: 'Tim Analis Data Prediksi-Kan',
      url: 'https://www.l1prediksikan.my.id',
    }],
    publisher: {
      '@type': 'Organization',
      name: 'L1 Prediksi-Kan',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.l1prediksikan.my.id/logo.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.l1prediksikan.my.id/news/${article.slug}`,
    },
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'big_match':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'value_bet':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'parlay':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  const pageUrl = `https://www.l1prediksikan.my.id/news/${article.slug}`;
  const shareText = encodeURIComponent(`${article.title} - Baca ulasan lengkap di Prediksi-Kan News: ${pageUrl}`);

  return (
    <>
      {/* Inject JSON-LD untuk Googlebot */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* 1. BREADCRUMBS & KEMBALI */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Link href="/news" className="hover:text-blue-600 flex items-center gap-1 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Semua Berita</span>
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-semibold">{article.category_display}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            <span>{article.views_count} dibaca</span>
          </div>
        </div>

        {/* 2. ARTIKEL UTAMA (TEMA TERANG EDITORIAL) */}
        <article className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 md:p-10 shadow-xs space-y-6">
          {/* Header Artikel */}
          <div className="space-y-3 sm:space-y-4 pb-5 sm:pb-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getCategoryColor(article.category)}`}>
                {article.category_display}
              </span>
              {article.tags && article.tags.map((tag: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium border border-slate-200">
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-slate-950 leading-snug sm:leading-tight tracking-tight">
              {article.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              {article.excerpt}
            </p>

            {/* Byline & Metadata Penulis */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/logo.svg" 
                  alt="Prediksi-Kan" 
                  className="w-7 h-7 rounded-lg object-contain border border-slate-200" 
                />
                <div>
                  <div className="font-semibold text-slate-800">Tim Analis Data Prediksi-Kan</div>
                  <div className="text-[11px] text-slate-400">
                    Dipublikasikan {new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-500">
                  {article.reading_time}
                </span>
              </div>
            </div>
          </div>

          {/* KARTU VISUAL STATISTIK PERTANDINGAN (JIKA ADA FIXTURE TERKAIT) */}
          {fixture && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200/80">
                <span className="font-bold text-slate-800 tracking-wide uppercase text-[11px]">
                  {fixture.league_name} ({fixture.league_code})
                </span>
                <span className="text-slate-500 font-medium">
                  {new Date(fixture.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                </span>
              </div>

              {/* Tampilan Skor / VS */}
              <div className="grid grid-cols-11 items-center gap-2 py-2">
                {/* Home */}
                <div className="col-span-5 flex flex-col items-center text-center space-y-2">
                  <SafeImage 
                    src={getOptimizedLogoUrl(fixture.home_team_logo)} 
                    alt={fixture.home_team_name} 
                    className="w-12 h-12 object-contain"
                  />
                  <span className="font-bold text-slate-900 text-sm">{fixture.home_team_name}</span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Odds: {fixture.avg_h || '-'}
                  </span>
                </div>

                {/* VS */}
                <div className="col-span-1 text-center font-bold text-slate-300 text-sm">
                  VS
                </div>

                {/* Away */}
                <div className="col-span-5 flex flex-col items-center text-center space-y-2">
                  <SafeImage 
                    src={getOptimizedLogoUrl(fixture.away_team_logo)} 
                    alt={fixture.away_team_name} 
                    className="w-12 h-12 object-contain"
                  />
                  <span className="font-bold text-slate-900 text-sm">{fixture.away_team_name}</span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Odds: {fixture.avg_a || '-'}
                  </span>
                </div>
              </div>

              {/* Bar Probabilitas AI */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                  <span>Home {roundProb(fixture.prob_ftr_h)}%</span>
                  <span>Draw {roundProb(fixture.prob_ftr_d)}%</span>
                  <span>Away {roundProb(fixture.prob_ftr_a)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(fixture.prob_ftr_h || 0.33) * 100}%` }} className="bg-blue-600 h-full"></div>
                  <div style={{ width: `${(fixture.prob_ftr_d || 0.33) * 100}%` }} className="bg-amber-400 h-full"></div>
                  <div style={{ width: `${(fixture.prob_ftr_a || 0.33) * 100}%` }} className="bg-rose-500 h-full"></div>
                </div>
              </div>

              {/* Sinyal Nilai */}
              {(fixture.has_value_bet || fixture.has_value_bet_ou) && (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-semibold">
                  <span>Sinyal Value Bet Teridentifikasi oleh Machine Learning</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Aktif</span>
                </div>
              )}
            </div>
          )}

          {/* ISI ARTIKEL EDITORIAL */}
          {article.category === 'parlay' && parlayTickets && parlayTickets.length > 0 ? (
            <div className="space-y-6 pt-2">
              <div className="text-slate-700 leading-relaxed text-sm sm:text-base border-b border-slate-100 pb-4">
                Sistem Reinforcement Learning (RL Agent) Prediksi-Kan telah merilis paket tiket parlay rekomendasi unggulan untuk jadwal pertandingan mendatang. Setiap tiket disusun melalui optimasi nilai matematis (<em>Value Edge</em>) dengan probabilitas kalkulasi kecerdasan buatan melampaui harga odds bandar.
              </div>

              {/* MODERN BET SLIP UI CARDS */}
              <ModernParlayCards tickets={parlayTickets} />

              {/* PANDUAN MANAJEMEN RISIKO */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3">
                <h3 className="font-serif font-black text-slate-900 text-lg">
                  Panduan Manajemen Risiko Taruhan Parlay
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Taruhan parlay menawarkan potensi pembayaran berlipat ganda, namun membutuhkan akurasi sempurna di mana seluruh leg harus berhasil ditembus. Disarankan untuk menggunakan <strong>stake terukur (1-2% dari total bankroll)</strong> dan mengutamakan konsistensi jangka panjang dibandingkan ambisi sesaat.
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <MarkdownRenderer content={article.content} />
            </div>
          )}

          {/* 3. CALL-TO-ACTION (CTA) BANNER (TEMA GELAP / DARK TERMINAL LUXURY) */}
          <div className="mt-10 sm:mt-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 md:p-10 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl space-y-3 sm:space-y-4">
              <div className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] sm:text-xs font-semibold">
                Platform Utama Prediksi-Kan
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Buka Platform Analitik Lengkap & Pantau Sinyal Value Bet Real-Time
              </h3>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Jelajahi terminal data analitik kami untuk mengakses kalkulasi machine learning 11 liga top Eropa, pantau odds pasar global, simulasi handicap, dan tiket parlay harian.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <Link
                  href={article.category === 'parlay' ? '/parlays' : '/fixtures'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5 text-center"
                >
                  <span>{article.category === 'parlay' ? 'Buka Tiket Parlay Aktif' : 'Buka Match Center & Prediksi Lengkap'}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>

                <Link
                  href="/performance"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold text-xs border border-slate-700/60 transition text-center"
                >
                  <span>Lihat Akurasi AI →</span>
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* 5. ARTIKEL TERKAIT */}
        {relatedArticles.length > 0 && (
          <div className="space-y-4 pt-6">
            <h3 className="text-xl font-serif font-black text-slate-900 border-b border-slate-200 pb-2">
              Berita & Analisis Terkait Lainnya
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedArticles.map((rel: any) => (
                <Link 
                  key={rel.id} 
                  href={`/news/${rel.slug}`}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition space-y-2 group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                      {rel.category_display}
                    </span>
                    <h4 className="font-serif font-bold text-slate-900 group-hover:text-blue-600 transition text-sm leading-snug line-clamp-2">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {rel.excerpt}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 pt-2 block">
                    Baca Selengkapnya →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function roundProb(val?: number) {
  return round(val || 0.33);
}

function round(val: number) {
  return Math.round(val * 100);
}

