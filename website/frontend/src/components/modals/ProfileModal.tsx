/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { X, User, Mail, Shield, Award, Calendar, CheckCircle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

export default function ProfileModal({ isOpen, onClose, session }: ProfileModalProps) {
  if (!isOpen || !session?.user) return null;

  const user = session.user;
  const isAdmin = user.is_staff === true;
  const isGoogle = user.provider === 'google' || Boolean(user.image?.includes('googleusercontent.com'));
  const avatarUrl = user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=059669&color=fff&bold=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-800 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700/50 transition-colors"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Header Profile */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="relative mb-3">
            <img
              src={avatarUrl}
              alt="Profil"
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full border-2 border-emerald-500/50 object-cover shadow-lg"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-slate-800 rounded-full flex items-center justify-center">
              <CheckCircle size={12} className="text-white" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            {user.name || 'Pengguna'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{user.email}</p>
          
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <Award size={13} /> {isAdmin ? 'Administrator' : 'Member Aktif'}
            </span>
            <span className="px-2.5 py-1 bg-slate-700/60 border border-slate-600/50 text-slate-300 text-xs rounded-full">
              {isGoogle ? 'Akun Google' : 'Email Terdaftar'}
            </span>
          </div>
        </div>

        {/* Detail Akun Information Grid */}
        <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 space-y-3 text-xs mb-6">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <User size={14} className="text-emerald-400" /> Username
            </span>
            <span className="font-semibold text-slate-200">
              {user.name || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Mail size={14} className="text-emerald-400" /> Email
            </span>
            <span className="font-semibold text-slate-200 truncate max-w-[180px]">
              {user.email || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" /> Hak Akses
            </span>
            <span className="font-semibold text-slate-200">
              {isAdmin ? 'Akses Penuh / Admin' : 'Pengguna Standar'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Calendar size={14} className="text-emerald-400" /> Status Sesi
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Terhubung Aman
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-xl transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
