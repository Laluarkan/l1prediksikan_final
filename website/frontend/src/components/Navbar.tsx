/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Upload, ChevronDown, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isAdmin = (session?.user as any)?.is_staff === true;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-lg md:text-xl font-bold text-white tracking-wide">
              <img src="/logo.svg" alt="L1 Prediksi-Kan Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
              L1 Prediksi-Kan
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <Link href="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Home
            </Link>

            <div className="relative group">
              <button className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${(pathname === '/fixtures' || pathname === '/parlays') ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                Upcoming <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>
              <div className="absolute left-0 mt-0 w-48 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                  <Link href="/fixtures" className={`block px-4 py-2 text-sm transition-colors ${pathname === '/fixtures' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                    Fixtures
                  </Link>
                  <Link href="/parlays" className={`block px-4 py-2 text-sm transition-colors ${pathname === '/parlays' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                    Parlay Tickets
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/standings" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/standings' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Standings
            </Link>

            <div className="relative group">
              <button className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${(pathname === '/history' || pathname === '/history-parlays') ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                History <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>
              <div className="absolute left-0 mt-0 w-48 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                  <Link href="/history" className={`block px-4 py-2 text-sm transition-colors ${pathname === '/history' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                    Match History
                  </Link>
                  <Link href="/history-parlays" className={`block px-4 py-2 text-sm transition-colors ${pathname === '/history-parlays' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                    Historical Parlays
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/performance" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/performance' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Model Performance
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {!session ? (
              <button 
                onClick={() => signIn('google')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors"
              >
                Login
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link href="admin/upload" className="hidden md:flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg items-center gap-2 transition-colors shadow-sm">
                    <Upload size={14} /> Upload Data
                  </Link>
                )}
                
                <div className="relative group cursor-pointer" onClick={() => signOut()}>
                  <img 
                    src={session.user?.image || "/default-avatar.png"} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-slate-600 group-hover:border-rose-500 transition-colors object-cover"
                  />
                </div>
              </div>
            )}

            <div className="md:hidden flex items-center ml-2">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 hover:text-white p-1">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-6 space-y-1 shadow-2xl absolute w-full">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Home
          </Link>
          
          <div className="px-3 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming</div>
          <Link href="/fixtures" onClick={() => setIsMobileMenuOpen(false)} className={`block px-5 py-2 text-sm ${pathname === '/fixtures' ? 'text-white font-semibold' : 'text-slate-400'}`}>Fixtures</Link>
          <Link href="/parlays" onClick={() => setIsMobileMenuOpen(false)} className={`block px-5 py-2 text-sm ${pathname === '/parlays' ? 'text-white font-semibold' : 'text-slate-400'}`}>Parlay Tickets</Link>
          
          <Link href="/standings" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium mt-2 ${pathname === '/standings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Standings
          </Link>
          
          <div className="px-3 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase tracking-wider">History</div>
          <Link href="/history" onClick={() => setIsMobileMenuOpen(false)} className={`block px-5 py-2 text-sm ${pathname === '/history' ? 'text-white font-semibold' : 'text-slate-400'}`}>Match History</Link>
          <Link href="/history-parlays" onClick={() => setIsMobileMenuOpen(false)} className={`block px-5 py-2 text-sm ${pathname === '/history-parlays' ? 'text-white font-semibold' : 'text-slate-400'}`}>Historical Parlays</Link>
          
          <Link href="/performance" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium mt-2 ${pathname === '/performance' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Model Performance
          </Link>

          {isAdmin && (
            <Link href="/admin/upload" onClick={() => setIsMobileMenuOpen(false)} className="mt-4 bg-blue-600/20 text-blue-400 px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
              <Upload size={16} /> Admin Upload Data
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}