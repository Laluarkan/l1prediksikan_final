/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { UploadCloud, CheckCircle, Database } from 'lucide-react';
import { useSession } from 'next-auth/react'; 
import { useRouter } from 'next/navigation'; 

interface League {
  id: number;
  code: string;
  name: string;
}

interface PreviewRow {
  Date: string;
  HomeTeam: string;
  AwayTeam: string;
  Pick_FTR: string;
  Action_FTR: string;
  Pick_OU: string;
  Action_OU: string;
}

interface PreviewResponse {
  upload_type: string;
  preview_data: PreviewRow[];
  total_rows: number;
  message?: string;
}

export default function AdminUploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('history');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [loadingStep, setLoadingStep] = useState<string>('');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && !(session?.user as any)?.is_staff) {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Pastikan API memuat liga hanya jika user adalah admin
    if (status === 'authenticated' && (session?.user as any)?.is_staff) {
      api.get('/leagues/')
        .then((res) => {
          setLeagues(res.data.results || res.data);
        })
        .catch((err) => console.error("Gagal memuat liga:", err));
    }
  }, [status, session]);
  
  if (status === 'loading' || !session || !(session?.user as any)?.is_staff) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-white text-lg animate-pulse font-semibold">
          Memverifikasi Otorisasi Keamanan...
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setPreviewData(null); 
      setMessage(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setMessage({ text: 'Pilih file CSV terlebih dahulu.', type: 'error' });
      return;
    }

    setLoading(true);
    setLoadingStep('Membaca CSV...');
    setLoadingStep('Memproses Pipeline & Data Cuaca (API eksternal mungkin lambat)...');
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_type', uploadType);
    formData.append('league', selectedLeague);

    try {
      const response = await api.post('/upload-preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      
      setPreviewData(response.data);
      
      if (response.data.total_rows === 0 && response.data.message) {
        setMessage({ text: response.data.message, type: 'info' });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Terjadi kesalahan saat memproses file.', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSaveToDB = async () => {
    setSaveLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/upload-save/', { upload_type: uploadType });
      setMessage({ 
        text: `${response.data.message} (Data Baru Ditambahkan: Histori ${response.data.history_saved}, Jadwal ${response.data.fixtures_saved} baris).`, 
        type: 'success' 
      });
      setPreviewData(null);
      setFile(null);
      
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Gagal menyimpan ke database.', type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-16 px-4">
      <div className="mb-8 border-b border-slate-700 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Database className="text-blue-500" /> Upload Dataset
        </h1>
        <p className="text-slate-400 text-sm mt-2">Pilih liga untuk mempercepat kalkulasi. Sistem akan otomatis memfilter dan hanya menghitung data yang belum ada di database.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'error' ? 'bg-rose-900/30 border-rose-700 text-rose-300' : 
          message.type === 'info' ? 'bg-amber-900/30 border-amber-700 text-amber-300' : 
          'bg-emerald-900/30 border-emerald-700 text-emerald-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipe Dataset</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="uploadType" 
                    value="history" 
                    checked={uploadType === 'history'}
                    onChange={() => setUploadType('history')}
                    className="text-blue-600 bg-slate-900 border-slate-600 focus:ring-blue-600" 
                  />
                  <span className="text-sm text-slate-200">Data Histori (Selesai)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="uploadType" 
                    value="fixture" 
                    checked={uploadType === 'fixture'}
                    onChange={() => setUploadType('fixture')}
                    className="text-blue-600 bg-slate-900 border-slate-600 focus:ring-blue-600" 
                  />
                  <span className="text-sm text-slate-200">Data Fixtures (Jadwal)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Liga Spesifik (Sangat Disarankan)</label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Liga (Auto-Detect, Lebih Lambat)</option>
                {leagues.map((l) => (
                  <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">File CSV</label>
              <input 
                id="csv-upload"
                type="file" 
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-900/30 file:text-blue-400 hover:file:bg-blue-900/50 transition-all cursor-pointer border border-slate-700 rounded-md bg-slate-900"
              />
            </div>
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={handlePreview}
              disabled={loading || !file}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                loading || !file ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center">
                  <span>{loadingStep}</span>
                  <span className="text-[9px] animate-pulse">Mohon tunggu, jangan refresh...</span>
                </div>
              ) : (
                <><UploadCloud size={18} /> Upload & Preview Data Baru</>
              )}
            </button>
          </div>

        </div>
      </div>

      {previewData && previewData.total_rows > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-800/60 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white">Preview Data Baru Terdeteksi</h2>
              <p className="text-xs text-slate-400 mt-1">Ditemukan <span className="font-bold text-blue-400">{previewData.total_rows}</span> baris data baru untuk ditambahkan ke database.</p>
            </div>
            <button
              onClick={handleSaveToDB}
              disabled={saveLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                saveLoading ? 'bg-emerald-900/50 text-emerald-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              {saveLoading ? 'Menyimpan...' : <><CheckCircle size={18} /> Simpan Data Baru</>}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Tanggal</th>
                  <th className="px-6 py-4 font-semibold">Pertandingan</th>
                  <th className="px-6 py-4 font-semibold text-center border-x border-slate-700/50">Pick 1X2</th>
                  <th className="px-6 py-4 font-semibold text-center border-r border-slate-700/50">Action 1X2</th>
                  <th className="px-6 py-4 font-semibold text-center border-r border-slate-700/50">Pick O/U</th>
                  <th className="px-6 py-4 font-semibold text-center">Action O/U</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {previewData.preview_data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-3 font-mono text-[11px] whitespace-nowrap">{row.Date}</td>
                    <td className="px-6 py-3 font-medium text-white">{row.HomeTeam} vs {row.AwayTeam}</td>
                    <td className="px-6 py-3 text-center border-x border-slate-700/50 text-blue-400 font-bold">{row.Pick_FTR}</td>
                    <td className="px-6 py-3 text-center border-r border-slate-700/50 text-[10px] uppercase">{row.Action_FTR}</td>
                    <td className="px-6 py-3 text-center border-r border-slate-700/50 text-purple-400 font-bold">{row.Pick_OU}</td>
                    <td className="px-6 py-3 text-center text-[10px] uppercase">{row.Action_OU}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-900/50 px-6 py-3 text-center text-[10px] text-slate-500 uppercase tracking-widest border-t border-slate-700">
            Menampilkan sampel {previewData.preview_data.length} data baru.
          </div>
        </div>
      )}

    </div>
  );
}