'use client';

import dynamic from 'next/dynamic';

// Next.js App Router tidak mengizinkan `next/dynamic(..., { ssr: false })`
// dipanggil langsung di Server Component. Wrapper client kecil ini yang
// menanganinya, supaya page.tsx (src/app/page.tsx) tetap bisa jadi
// Server Component murni.
const HeroBackground = dynamic(() => import('@/components/home/HeroBackground'), {
  ssr: false,
});

export default function HeroBackgroundLoader() {
  return <HeroBackground />;
}