/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Upload, 
  ChevronDown, 
  Menu, 
  X, 
  LogIn, 
  LogOut, 
  User, 
  HelpCircle, 
  Layers, 
  Calendar, 
  History, 
  TrendingUp,
  Award,
  Download,
  Smartphone
} from 'lucide-react';
import ProfileModal from './modals/ProfileModal';
import OddsGuideModal from './modals/OddsGuideModal';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isAdmin = (session?.user as any)?.is_staff === true;
  const user = session?.user;
  const avatarUrl = user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=059669&color=fff&bold=true`;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu & dropdown on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 md:px-12 lg:px-20">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Brand */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 text-lg md:text-xl font-black text-white tracking-wide hover:opacity-95 transition-opacity">
                <img 
                  src="/logo.svg" 
                  alt="L1 Prediksi-Kan Logo" 
                  className="w-8 h-8 rounded-xl object-contain shadow-md shadow-blue-950/60 border border-blue-500/20" 
                />
                <span>Prediksi-Kan</span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-3">
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/' ? 'text-white bg-slate-800/80 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Beranda
              </Link>

              {/* Dropdown Mendatang */}
              <div className="relative group">
                <button 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    (pathname === '/fixtures' || pathname === '/parlays') 
                      ? 'text-white bg-slate-800/80' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  Mendatang <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
                </button>
                <div className="absolute left-0 mt-1 w-52 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden py-1.5">
                    <Link 
                      href="/fixtures" 
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                        pathname === '/fixtures' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                      }`}
                    >
                      <Calendar size={15} className="text-emerald-400" />
                      Jadwal Pertandingan
                    </Link>
                    <Link 
                      href="/parlays" 
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                        pathname === '/parlays' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                      }`}
                    >
                      <Layers size={15} className="text-emerald-400" />
                      Tiket Parlay
                    </Link>
                  </div>
                </div>
              </div>

              <Link 
                href="/standings" 
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/standings' ? 'text-white bg-slate-800/80' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Klasemen
              </Link>

              {/* Dropdown Riwayat */}
              <div className="relative group">
                <button 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    (pathname === '/history' || pathname === '/history-parlays') 
                      ? 'text-white bg-slate-800/80' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  Riwayat <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
                </button>
                <div className="absolute left-0 mt-1 w-52 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden py-1.5">
                    <Link 
                      href="/history" 
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                        pathname === '/history' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                      }`}
                    >
                      <History size={15} className="text-emerald-400" />
                      Riwayat Pertandingan
                    </Link>
                    <Link 
                      href="/history-parlays" 
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                        pathname === '/history-parlays' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                      }`}
                    >
                      <Layers size={15} className="text-emerald-400" />
                      Riwayat Parlay
                    </Link>
                  </div>
                </div>
              </div>

              <Link 
                href="/performance" 
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/performance' ? 'text-white bg-slate-800/80' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Performa Model
              </Link>
            </div>

            {/* Right Action: Auth / User Menu */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              
              {/* Tombol Unduh APK Mobile */}
              <a 
                href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Unduh Aplikasi Android Resmi (APK)"
              >
                <Download size={14} />
                <span>Unduh APK</span>
              </a>
              
              {/* Tombol Unggah Data Admin (Jika Admin) */}
              {isAdmin && (
                <Link 
                  href="/admin/upload" 
                  className="hidden md:flex bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl items-center gap-2 transition-all shadow-md shadow-blue-900/30"
                >
                  <Upload size={14} /> Unggah Data
                </Link>
              )}

              {/* Status Sesi Autentikasi */}
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
              ) : !session ? (
                // Tombol Masuk Modern yang Mengarahkan ke Halaman /login
                <Link 
                  href="/login"
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs md:text-sm px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-950/40 border border-emerald-400/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogIn size={15} />
                  <span>Masuk</span>
                </Link>
              ) : (
                // Akun Pengguna yang Sudah Login dengan Dropdown Interaktif
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 md:px-3 md:py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl transition-all cursor-pointer group"
                    aria-expanded={isUserDropdownOpen}
                    aria-label="Menu Akun Pengguna"
                  >
                    <div className="relative">
                      <img 
                        src={avatarUrl} 
                        alt={user?.name || "Profil"} 
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-emerald-500/50 object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                    </div>
                    
                    <span className="hidden md:block text-xs font-semibold text-slate-200 group-hover:text-white max-w-[110px] truncate">
                      {user?.name || 'Akun Saya'}
                    </span>

                    <ChevronDown 
                      size={14} 
                      className={`text-slate-400 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {/* Dropdown Menu Akun */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-800/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                      
                      {/* Header Dropdown: Foto, Nama, Email, Badge */}
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/50 mb-2">
                        <div className="flex items-center gap-3">
                          <img 
                            src={avatarUrl} 
                            alt="Profil" 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full border border-emerald-500/50 object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">
                              {user?.name || 'Pengguna'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {user?.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800">
                          <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-md flex items-center gap-1">
                            <Award size={11} /> {isAdmin ? 'Admin Staff' : 'Member Aktif'}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] rounded-md truncate">
                            {user?.image?.includes('google') ? 'Akun Google' : 'Email'}
                          </span>
                        </div>
                      </div>

                      {/* Menu Navigasi Pengguna */}
                      <div className="space-y-0.5 text-xs">
                        {isAdmin && (
                          <Link
                            href="/admin/upload"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-blue-400 hover:bg-blue-600/15 rounded-xl transition-colors font-medium"
                          >
                            <Upload size={15} />
                            <span>Unggah Data Admin</span>
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors text-left"
                        >
                          <User size={15} className="text-emerald-400" />
                          <span>Profil & Detail Akun</span>
                        </button>

                        <Link
                          href="/fixtures"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors"
                        >
                          <Calendar size={15} className="text-slate-400" />
                          <span>Jadwal Pertandingan</span>
                        </Link>

                        <Link
                          href="/parlays"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors"
                        >
                          <Layers size={15} className="text-slate-400" />
                          <span>Tiket Parlay AI</span>
                        </Link>

                        <Link
                          href="/history"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors"
                        >
                          <History size={15} className="text-slate-400" />
                          <span>Riwayat & Akurasi</span>
                        </Link>

                        <Link
                          href="/performance"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors"
                        >
                          <TrendingUp size={15} className="text-slate-400" />
                          <span>Performa Model AI</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsGuideModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors text-left"
                        >
                          <HelpCircle size={15} className="text-teal-400" />
                          <span>Panduan Odds & Value Bet</span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="my-1.5 border-t border-slate-700/70" />

                      {/* Tombol Logout */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 rounded-xl transition-colors text-xs font-semibold cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Keluar dari Akun</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Hamburger Button untuk Mobile */}
              <div className="md:hidden flex items-center ml-1">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors" 
                  aria-label="Buka Menu"
                >
                  {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-6 space-y-1 shadow-2xl absolute w-full z-40 max-h-[85vh] overflow-y-auto animate-fadeIn">
            
            {/* Header Profil Pengguna di Mobile Drawer */}
            {session ? (
              <div className="mb-4 p-3.5 bg-slate-800/90 border border-slate-700/70 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    src={avatarUrl} 
                    alt="Profil" 
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-emerald-500/50 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-xl font-medium shrink-0"
                >
                  Profil
                </button>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Masuk untuk akses penuh</span>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm border border-blue-500/30"
                >
                  <LogIn size={13} /> Masuk
                </Link>
              </div>
            )}

            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${
                pathname === '/' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Beranda
            </Link>
            
            <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mendatang</div>
            <Link 
              href="/fixtures" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-5 py-2 text-sm ${pathname === '/fixtures' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
            >
              Jadwal Pertandingan
            </Link>
            <Link 
              href="/parlays" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-5 py-2 text-sm ${pathname === '/parlays' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
            >
              Tiket Parlay
            </Link>
            
            <Link 
              href="/standings" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-3 py-2.5 rounded-xl text-sm font-medium mt-2 ${
                pathname === '/standings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Klasemen
            </Link>
            
            <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Riwayat</div>
            <Link 
              href="/history" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-5 py-2 text-sm ${pathname === '/history' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
            >
              Riwayat Pertandingan
            </Link>
            <Link 
              href="/history-parlays" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-5 py-2 text-sm ${pathname === '/history-parlays' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
            >
              Riwayat Parlay
            </Link>
            
            <Link 
              href="/performance" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`block px-3 py-2.5 rounded-xl text-sm font-medium mt-2 ${
                pathname === '/performance' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Performa Model
            </Link>

            {/* Unduh APK Mobile Menu CTA */}
            <a
              href="https://d.apkpure.com/b/APK/id.prediksikan.app?version=latest"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Download size={16} className="text-emerald-400" />
                <span>Unduh Aplikasi Android (APK)</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">v1.3.0</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsGuideModalOpen(true);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2"
            >
              <HelpCircle size={16} className="text-teal-400" /> Panduan Odds & Value Bet
            </button>

            {isAdmin && (
              <Link 
                href="/admin/upload" 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="mt-4 bg-blue-600/20 text-blue-400 px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Upload size={16} /> Unggah Data Admin
              </Link>
            )}

            {session && (
              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut size={16} /> Keluar dari Akun
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Modals */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        session={session} 
      />

      <OddsGuideModal 
        isOpen={isGuideModalOpen} 
        onClose={() => setIsGuideModalOpen(false)} 
      />
    </>
  );
}