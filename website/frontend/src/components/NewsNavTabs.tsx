'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = [
  { id: 'all', label: 'Semua Berita', href: '/news' },
  { id: 'big_match', label: 'Big Match & Derby', href: '/news?category=big_match' },
  { id: 'value_bet', label: 'Best Value Bet', href: '/news?category=value_bet' },
  { id: 'parlay', label: 'Ulasan Parlay', href: '/news?category=parlay' },
  { id: 'match_preview', label: 'Match Preview', href: '/news?category=match_preview' },
];

export default function NewsNavTabs() {
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('category') || 'all';

  return (
    <nav 
      aria-label="Kategori Berita" 
      className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 text-xs font-semibold scroll-smooth"
    >
      {CATEGORIES.map((cat) => {
        const isActive = currentCat === cat.id;
        return (
          <Link
            key={cat.id}
            href={cat.href}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 font-medium'
            }`}
          >
            {cat.label}
          </Link>
        );
      })}
    </nav>
  );
}

