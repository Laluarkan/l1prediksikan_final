/**
 * getOptimizedLogoUrl:
 * Mengoptimalkan pemuatan logo klub & liga agar secepat kilat (sub-10ms) dan tahan banting.
 * Jika URL mengarah ke domain produksi (https://l1prediksikan.my.id/logos/...),
 * kita ubah menjadi path lokal relatif '/logos/...' agar Next.js melayaninya secara langsung
 * (dari public folder lokal saat dev, dan dari Edge CDN Vercel ber-caching permanen di production).
 */
export function getOptimizedLogoUrl(url?: string | null): string {
  if (!url) return '/default-logo.svg';
  if (url.includes('/logos/')) {
    const idx = url.indexOf('/logos/');
    return url.substring(idx);
  }
  return url;
}
