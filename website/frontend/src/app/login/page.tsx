'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  // Mode: 'login' | 'register'
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Email Validation state
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [hasTypedEmail, setHasTypedEmail] = useState(false);

  // Redirect jika sudah login
  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.push(callbackUrl);
    }
  }, [status, router, searchParams]);

  // Debounced live email check
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!cleanEmail || !isValidFormat || mode !== 'register') {
      setEmailExists(false);
      setIsCheckingEmail(false);
      return;
    }

    setHasTypedEmail(true);
    setIsCheckingEmail(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-email?email=${encodeURIComponent(cleanEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setEmailExists(data.exists === true);
        }
      } catch (e) {
        console.warn('Gagal cek email live:', e);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email, mode]);

  // Live Password Criteria Calculations
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
    };
  }, [password]);

  const isPasswordValid = 
    passwordCriteria.hasMinLength &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasUppercase &&
    passwordCriteria.hasLowercase;

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Harap isi email dan password Anda.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email: cleanEmail,
        password: password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage(res.error || 'Email atau password salah. Silakan coba lagi.');
        setIsLoading(false);
      } else {
        setSuccessMessage('Berhasil masuk! Mengalihkan...');
        const callbackUrl = searchParams.get('callbackUrl') || '/';
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
      setIsLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      setErrorMessage('Username wajib diisi.');
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Harap masukkan alamat email yang valid.');
      return;
    }
    if (emailExists) {
      setErrorMessage('Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Password belum memenuhi seluruh ketentuan keamanan di bawah.');
      return;
    }

    setIsLoading(true);

    try {
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: password,
        }),
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        setErrorMessage(regData.error || 'Pendaftaran gagal. Silakan coba kembali.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Pendaftaran berhasil! Menyambungkan ke sistem...');

      // Otomatis login dengan kredensial yang baru dibuat
      const loginRes = await signIn('credentials', {
        email: cleanEmail,
        password: password,
        redirect: false,
      });

      if (loginRes?.error) {
        setSuccessMessage('Akun dibuat. Silakan beralih ke tab Masuk untuk login.');
        setMode('login');
        setIsLoading(false);
      } else {
        const callbackUrl = searchParams.get('callbackUrl') || '/';
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghubungi server pendaftaran.');
      setIsLoading(false);
    }
  };

  // Handle Google Auth
  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setErrorMessage(null);
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    signIn('google', { callbackUrl });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Tombol Kembali ke Beranda */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Kembali ke Beranda
        </Link>

        {/* Card Autentikasi Utama */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Header Branding */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img 
                src="/logo.svg" 
                alt="L1 Prediksi-Kan Logo" 
                className="w-14 h-14 rounded-2xl object-contain shadow-xl shadow-blue-950/70 border border-blue-500/20" 
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              L1 Prediksi-Kan
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Akses analitik kecerdasan buatan & rekomendasi value bet
            </p>
          </div>

          {/* Toggle Tab (Masuk vs Daftar Akun) */}
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-700/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-slate-800 text-blue-400 shadow-md border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {/* Banner Error & Success */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORM: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Kolom Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    autoComplete="email"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Kolom Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    autoComplete="current-password"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Tombol Biru Tua: Masuk */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-950/60 border border-blue-600/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Masuk'
                )}
              </button>
            </form>
          )}

          {/* FORM: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Kolom Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Pilih nama pengguna"
                    required
                    autoComplete="username"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Kolom Email dengan Validasi Live */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    autoComplete="email"
                    className={`w-full bg-slate-900/90 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all ${
                      emailExists 
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
                        : email && !isCheckingEmail && hasTypedEmail
                        ? 'border-emerald-500/80 focus:border-emerald-500'
                        : 'border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    }`}
                  />
                  {/* Status Indicator Live */}
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    {isCheckingEmail ? (
                      <div className="w-4 h-4 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin" />
                    ) : emailExists ? (
                      <XCircle size={16} className="text-rose-500" />
                    ) : email && hasTypedEmail ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : null}
                  </div>
                </div>

                {/* Warning Langsung jika Email Sudah Terdaftar */}
                {emailExists && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-400 flex items-center gap-1.5 animate-fadeIn">
                    <AlertCircle size={13} className="shrink-0" />
                    Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.
                  </p>
                )}
              </div>

              {/* Kolom Password Tunggal dengan Icon Mata */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Buat password akun Anda"
                    required
                    autoComplete="new-password"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Checklist Ketentuan Keamanan Password Live */}
                <div className="mt-2.5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={13} className="text-emerald-400" /> Ketentuan Keamanan Password:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {passwordCriteria.hasMinLength ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-slate-600 ml-0.5" />
                      )}
                      <span>Minimal 8 karakter</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {passwordCriteria.hasNumber ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-slate-600 ml-0.5" />
                      )}
                      <span>Mengandung angka (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {passwordCriteria.hasUppercase ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-slate-600 ml-0.5" />
                      )}
                      <span>Huruf besar (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLowercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {passwordCriteria.hasLowercase ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-slate-600 ml-0.5" />
                      )}
                      <span>Huruf kecil (a-z)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Hijau: Hanya tulisan "Daftar" */}
              <button
                type="submit"
                disabled={isLoading || emailExists || !isPasswordValid}
                className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Daftar'
                )}
              </button>
            </form>
          )}

          {/* Divider "atau" */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/80" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-medium tracking-wider">
                atau lanjutkan dengan
              </span>
            </div>
          </div>

          {/* Tombol Login dengan Gmail / Akun Google di Bawah */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-900/90 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3 shadow-md group cursor-pointer"
          >
            {/* SVG Logo Google Resmi */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Lanjutkan dengan Akun Google</span>
          </button>

          {/* Privacy footnote */}
          <p className="mt-5 text-[11px] text-center text-slate-500 leading-relaxed">
            Dengan melanjutkan, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi L1 Prediksi-Kan.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
