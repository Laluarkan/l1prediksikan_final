/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Upload, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Menggunakan status murni dari Database Django, bukan .env lagi
  const isAdmin = (session?.user as any)?.is_staff === true;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-white tracking-wide">
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

          <div className="flex items-center gap-4">
            {!session ? (
              <button 
                onClick={() => signIn('google')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </button>
            ) : (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Link href="/upload" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                    <Upload size={14} /> Upload Dataset
                  </Link>
                )}
                
                <div className="relative group cursor-pointer" onClick={() => signOut()}>
                  <img 
                    src={session.user?.image || "/default-avatar.png"} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-slate-600 group-hover:border-rose-500 transition-colors object-cover"
                  />
                  <div className="absolute right-0 top-full mt-2 w-max bg-slate-800 border border-slate-700 text-xs text-rose-400 px-3 py-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Logout ({session.user?.name})
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}