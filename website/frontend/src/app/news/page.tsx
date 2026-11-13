import React from 'react';
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

async function getInitialNewsData(category: string, round: string): Promise<PrefetchedNewsData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://l1prediksi-api.onrender.com/api';
  const syncSecret = process.env.SYNC_SECRET_KEY || process.env.NEXTAUTH_SECRET || "";

  const headers: HeadersInit = {
    'Origin': 'https://www.l1prediksikan.my.id',
    'Referer': 'https://www.l1prediksikan.my.id/news',
    'X-Sync-Secret': syncSecret,
  };

  try {
    let articlesUrl = `${apiUrl}/articles/?page_size=100&round=${encodeURIComponent(round)}`;
    if (category && category !== 'all') {
      articlesUrl += `&category=${encodeURIComponent(category)}`;
    }

    const [roundsRes, articlesRes] = await Promise.all([
      fetch(`${apiUrl}/articles/rounds/`, {
        headers,
        cache: 'no-store',
      }),
      fetch(articlesUrl, {
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

interface NewsPageProps {
  searchParams: Promise<{ category?: string; round?: string }>;
}

export default async function NewsPage(props: NewsPageProps) {
  const searchParams = await props.searchParams;
  const category = searchParams?.category || 'all';
  const round = searchParams?.round || 'latest';

  const initialData = await getInitialNewsData(category, round);

  return (
    <NewsListClient 
      initialData={initialData} 
      initialCategory={category} 
      initialRound={round} 
    />
  );
}
