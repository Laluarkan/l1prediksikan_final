import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import NewsListClient, { ArticleItem, RoundItem } from './NewsListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Berita Sepak Bola & Prediksi AI Terlengkap | L1 Prediksi-Kan News',
  description: 'Portal jurnalisme dan analisis data sepak bola bertenaga AI. Baca prediksi Big Match, taktik, sinyal value bet, dan ulasan parlay 11 liga top Eropa.',
  alternates: {
    canonical: 'https://www.l1prediksikan.my.id/news',
  },
};

interface PrefetchedNewsData {
  rounds: RoundItem[];
  season: string;
  articles: ArticleItem[];
}

async function getInitialNewsData(): Promise<PrefetchedNewsData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://l1prediksi-api.onrender.com/api';
  const syncSecret = process.env.NEXT_PUBLIC_SYNC_SECRET || 'Laluarkan123@';

  const headers: HeadersInit = {
    'Origin': 'https://www.l1prediksikan.my.id',
    'Referer': 'https://www.l1prediksikan.my.id/news',
    'X-Sync-Secret': syncSecret,
  };

  try {
    const [roundsRes, articlesRes] = await Promise.all([
      fetch(`${apiUrl}/articles/rounds/`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${apiUrl}/articles/?page_size=100&round=latest`, {
        headers,
        cache: 'no-store',
      }),
    ]);

    const roundsData = roundsRes.ok ? await roundsRes.json() : null;
    const articlesData = articlesRes.ok ? await articlesRes.json() : null;

    return {
      rounds: Array.isArray(roundsData?.rounds) ? roundsData.rounds : [],
      season: roundsData?.season || '2026/2027',
      articles: Array.isArray(articlesData?.results) ? articlesData.results : (Array.isArray(articlesData) ? articlesData : []),
    };
  } catch (error) {
    console.error('Failed to prefetch news data on server:', error);
    return {
      rounds: [],
      season: '2026/2027',
      articles: [],
    };
  }
}

export default async function NewsPage() {
  const initialData = await getInitialNewsData();

  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-600 text-xs font-medium">Memuat portal berita Prediksi-Kan...</p>
      </div>
    }>
      <NewsListClient initialData={initialData} />
    </Suspense>
  );
}
