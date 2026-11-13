/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.l1prediksikan.my.id';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/fixtures`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/parlays`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/history`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/standings`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/performance`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/risk-management`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const fetchUrl = apiUrl || 'https://l1prediksi-api.onrender.com/api';
    const res = await fetch(`${fetchUrl}/articles/?page_size=150`, {
      headers: {
        'Origin': 'https://www.l1prediksikan.my.id',
        'Referer': 'https://www.l1prediksikan.my.id/news',
        'X-Sync-Secret': process.env.SYNC_SECRET_KEY || process.env.NEXTAUTH_SECRET || '',
      },
      next: { revalidate: 3600 },
    });
    
    if (res.ok) {
      const data = await res.json();
      const articles = data.results || data || [];
      const articleRoutes: MetadataRoute.Sitemap = articles.map((art: any) => ({
        url: `${baseUrl}/news/${art.slug}`,
        lastModified: new Date(art.updated_at || art.created_at || new Date()),
        changeFrequency: 'weekly',
        priority: art.category === 'big_match' || art.category === 'parlay' ? 0.9 : 0.75,
      }));

      return [...staticRoutes, ...articleRoutes];
    }
  } catch (error) {
    console.error('Gagal mengambil data artikel untuk sitemap dinamis:', error);
  }

  return staticRoutes;
}
