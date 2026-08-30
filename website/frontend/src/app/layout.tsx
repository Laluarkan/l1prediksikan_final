import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'L1 Prediksi-Kan | Platform Analitik & Prediksi Bola AI',
    template: '%s | L1 Prediksi-Kan'
  },
  description: 'Platform analitik sepak bola bertenaga AI. Dapatkan rekomendasi value bet, prediksi FTR, Over/Under, dan statistik lengkap liga top Eropa secara real-time.',
  keywords: ['prediksi bola', 'value bet bola', 'analitik sepak bola', 'AI bola', 'prediksi parlay', 'jadwal bola', 'statistik bola akurat', 'prediksi liga inggris'],
  authors: [{ name: 'Lalu Naufal Arkan' }],
  creator: 'Lalu Naufal Arkan',
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://l1prediksikan.my.id',
    title: 'L1 Prediksi-Kan | Platform Analitik & Prediksi Bola AI',
    description: 'Platform analitik sepak bola bertenaga AI yang memproses pergerakan odds pasar dan data historis untuk mengidentifikasi probabilitas matematis murni.',
    siteName: 'L1 Prediksi-Kan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'L1 Prediksi-Kan | Platform Analitik & Prediksi Bola AI',
    description: 'Platform analitik sepak bola bertenaga AI dengan rekomendasi Value Bet harian.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-SJ5L2P8WQN"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SJ5L2P8WQN');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-900 flex flex-col min-h-screen`}>
        <Providers>
          <Navbar />
          
          <main className="flex-grow">
            {children}
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}