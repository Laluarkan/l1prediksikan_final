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