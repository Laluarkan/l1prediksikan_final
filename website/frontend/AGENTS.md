# Panduan Operasional & Aturan Pengembangan Frontend (L1 Prediksi-Kan)

> [!IMPORTANT]
> **Status Website:** Website L1 Prediksi-Kan telah resmi **GO ONLINE / LIVE** di domain produksi (`https://l1prediksikan.my.id`).  
> Seluruh agen AI dan pengembang yang bekerja pada repositori ini **WAJIB MEMATUHI** aturan-aturan di bawah ini secara ketat tanpa pengecualian.

---

## 1. Aturan Pembaruan Versi (Version Bumping)
- **Kewajiban Update Versi:** Setiap kali dilakukan penambahan fitur, pembaruan antarmuka, perbaikan bug (*bugfix*), atau perubahan kode frontend, **nomor versi di `website/frontend/package.json` WAJIB diperbarui**.
- **Standar Semantic Versioning (`MAJOR.MINOR.PATCH`):**
  - **PATCH (misal `1.2.0` -> `1.2.1`):** Perbaikan bug kecil, perbaikan teks/styling minor, atau penyesuaian parameter.
  - **MINOR (misal `1.2.0` -> `1.3.0`):** Penambahan fitur baru yang kompatibel (seperti halaman baru, modal baru, fitur analitik).
  - **MAJOR (misal `1.2.0` -> `2.0.0`):** Perubahan arsitektur besar atau perombakan sistem menyeluruh.
- **Tampilan Otomatis di Footer:** Nomor versi dari `package.json` secara dinamis diimpor dan ditampilkan langsung di `src/components/Footer.tsx` (`Versi {packageJson.version}`). Pengguna langsung melihat versi terbaru di website.
- **Sinkronisasi Versi:** Selalu jaga keselarasan versi aplikasi dengan mobile (`mobile/app.json`).

---

## 2. Aturan Git & Keamanan Repositori Multi-Project
- **BATASAN DIREKTORI KERJA:** Agen **DILARANG KERAS** menjalankan perintah `git` atau menyentuh proyek lain di luar repositori `d:\Project\project_prediksikan` (misal: dilarang menyentuh folder BPOM Project atau direktori lain).
- **Prosedur Push:** Selalu jalankan `git add` dan `git commit` secara spesifik, kemudian push hanya ke `origin main` di direktori `project_prediksikan`.
- **Automated Deployment:** Push ke branch `main` secara otomatis memicu GitHub Actions untuk memvalidasi build dan mendeploy backend ke Render serta frontend ke Vercel.
- **Verifikasi Build Sebelum Push:** Selalu jalankan `npx tsc --noEmit` dan `npm run build` sebelum melakukan commit agar tidak terjadi kegagalan deployment di production.

---

## 3. Ketentuan Desain & Branding Logo
- **Logo Resmi:** Selalu gunakan aset vektor resmi [`/logo.svg`](file:///d:/Project/project_prediksikan/website/frontend/public/logo.svg) yang tersimpan di folder `website/frontend/public/logo.svg`.
  - Jangan mengganti logo resmi dengan teks buatan (seperti kotak huruf "L1") atau ikon generik.
  - Logo ini digunakan pada Navbar (`Navbar.tsx`), halaman autentikasi (`/login`), dan favicon sistem (`layout.tsx`).

---

## 4. Ketentuan Warna Tombol Autentikasi
- **Tombol "Masuk" (Navbar & Form):**
  - Tombol "Masuk" di Navbar desktop, menu mobile, serta tombol submit pada form Masuk **WAJIB menggunakan warna Biru Tua**:
    `bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white font-semibold`
  - Aksen fokus kolom input saat tab Masuk aktif menggunakan warna biru (`focus:border-blue-500 focus:ring-blue-500`).
- **Tombol "Daftar" (Form Register):**
  - Menggunakan warna hijau (`bg-emerald-600 hover:bg-emerald-500 text-white font-bold`).
- **Tombol "Lanjutkan dengan Akun Google":**
  - Diletakkan di bagian bawah form dengan pemisah *"atau lanjutkan dengan"*.
  - Menggunakan gaya netral gelap berlogo SVG 4-warna resmi Google.

---

## 5. Arsitektur Autentikasi & Akun Pengguna
- **Halaman Autentikasi (`/login`):**
  - Menggunakan *tab switcher* antara **"Masuk"** dan **"Daftar Akun"**.
- **Form Pendaftaran (Register):**
  - Terdiri dari: **Username**, **Email**, dan **Password tunggal**.
  - **Live Email Check:** Email divalidasi langsung secara *debounced* via endpoint [`/api/check-email/`](file:///d:/Project/project_prediksikan/website/frontend/src/app/api/check-email/route.ts). Jika email sudah terdaftar di database, langsung tampilkan border merah dan pesan peringatan:  
    *⚠️ "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."*
  - **Password:** Tanpa kolom konfirmasi password. Dilengkapi ikon mata (`Eye`/`EyeOff`) untuk melihat password, dan daftar ketentuan keamanan live di bawah kolom:
    - Minimal 8 karakter
    - Mengandung angka (0-9)
    - Mengandung huruf besar (A-Z)
    - Mengandung huruf kecil (a-z)
  - **Enkripsi Password:** Seluruh password di database wajib dienkripsi menggunakan algoritma bawaan Django PBKDF2 SHA-256 melalui endpoint backend [`/api/sync-user/`](file:///d:/Project/project_prediksikan/website/backend/predictions/views.py).
- **Login Akun Google:**
  - Login melalui Google OAuth tidak menyertakan password manual (`user.set_unusable_password()`).
- **Dropdown Profil di Navbar:**
  - Saat user sudah login, tombol "Masuk" berubah menjadi tampilan avatar profil Google/inisial, nama user, indikator aktif, dan panah dropdown.
  - Dropdown berisi:
    1. Info Profil (Avatar, Nama, Email, Badge Member/Google/Admin).
    2. Unggah Data Admin (`/admin/upload`, khusus admin/staff).
    3. Profil & Detail Akun (membuka `ProfileModal`).
    4. Jadwal Pertandingan (`/fixtures`).
    5. Tiket Parlay AI (`/parlays`).
    6. Riwayat & Akurasi (`/history`).
    7. Performa Model AI (`/performance`).
    8. Panduan Odds & Value Bet (membuka `OddsGuideModal`).
    9. Tombol Keluar / Logout (`signOut()`).

---

## 6. Kunci Rahasia & Komunikasi Server-to-Server
- Kunci sinkronisasi server backend Django dan Next.js adalah `SYNC_SECRET_KEY` (default: `'Laluarkan123@'`).
- Rute API Next.js ([`/api/check-email`](file:///d:/Project/project_prediksikan/website/frontend/src/app/api/check-email/route.ts) dan [`/api/register`](file:///d:/Project/project_prediksikan/website/frontend/src/app/api/register/route.ts)) bertindak sebagai *proxy* aman sehingga kunci rahasia tidak pernah terekspos ke browser pengguna.
