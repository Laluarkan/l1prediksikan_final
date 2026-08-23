import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "L1 Prediksi-Kan",
  description: "Platform Analitik Sepak Bola Kuantitatif",
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
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