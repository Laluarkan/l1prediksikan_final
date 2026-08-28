# Peta Proyek: L1 Prediksi-Kan
Platform analitik sepak bola kuantitatif yang memproses pergerakan *odds* pasar dan data historis untuk mengidentifikasi probabilitas matematis murni (Value Bet) menggunakan algoritma *Machine Learning*.

## 1. Arsitektur & Integrasi Pihak Ketiga
Sistem ini dibangun menggunakan arsitektur terpisah (*Decoupled Full-Stack*) yang memanfaatkan berbagai layanan pihak ketiga berstandar industri kelas *Enterprise*:

| Layanan / Pihak Ketiga | Teknologi | Peran & Fungsionalitas |
| :--- | :--- | :--- |
| **Frontend Server** | Next.js (React) | Menyajikan UI dinamis, *Server-Side Rendering*, dan *Route Guard*. |
| **Backend Server** | Django & DRF | API Utama, pemrosesan logika matematika, dan manajemen keamanan (Di-hosting di Render). |
| **Database Server** | Supabase (PostgreSQL) | Menyimpan data relasional liga, tim, histori, dan metrik performa. |
| **Auth Provider** | Google Cloud (OAuth 2.0) | Memfasilitasi sistem Login aman via NextAuth tanpa menyimpan *password* pengguna. |
| **In-Memory Store** | Redis (Render Key Value) | Mengelola *Caching* data API dan bertindak sebagai *Broker* pesan untuk antrean tugas. |
| **Error Tracking** | Sentry (sentry.io) | Melacak *bug*, *crash*, dan anomali kode secara *real-time* di produksi. |

## 2. Peta Fitur & Fungsionalitas Terpasang
*   **Modul Analitik & Prediksi:** Menampilkan *Upcoming Fixtures*, *Match History*, dan *League Standings* yang dilengkapi dengan rekomendasi "Value Bet" (Pasar FTR & O/U 2.5) serta kalkulasi manajemen risiko (*Fractional Kelly*).
*   **Otentikasi & Dasbor Metrik:** Sistem sinkronisasi pengguna mulus antara Next.js dan Django yang membuka akses ke halaman *Model Performance* (Kalkulasi total *Win Rate* dan profit/loss dari ribuan data taruhan).
*   **Modul Admin & Legal:** Halaman khusus *Staff* untuk mengunggah dataset *Machine Learning* format `.csv` dengan fitur *preview*, dilengkapi dengan halaman publik untuk Syarat & Ketentuan, Metodologi, serta *Disclaimer* Anti-Judi.

## 3. Implementasi Keamanan (Security Hardening)
*   **Proteksi Akses (Kritis):** Menerapkan otentikasi *JSON Web Token* (JWT) murni, penjagaan rute (*Route Guard*) di *Frontend*, dan komunikasi Server-ke-Server aman menggunakan kriptografi *HMAC* (`SYNC_SECRET_KEY` & `CRON_SECRET_KEY`).
*   **Benteng Jaringan (Tinggi):** Mengunci CORS hanya untuk domain resmi, mewajibkan *SSL Redirect* (HTTPS), mengamankan *Cookies*, dan membatasi *spam request* melalui pembatasan API (*Rate Limiting*: 30/menit untuk anonim, 100/menit untuk pengguna terdaftar).
*   **Validasi & Visibilitas (Menengah):** Filter unggahan CSV berlapis (penolakan otomatis untuk ukuran > 5MB, format salah, atau *header* tidak dikenali) yang dipantau penuh melalui *Structured Logging* di peladen.

## 4. Optimasi Skala Produksi (Performance)
*   **Resolusi N+1 Query:** Penggunaan `select_related` pada *endpoint* *History* dan *Fixtures* untuk menggabungkan tabel (*SQL JOIN*), memangkas puluhan panggilan *database* menjadi hanya 1 panggilan.
*   **Manajemen Memori Massal:** Implementasi `iterator()` dipadukan dengan `.values()` pada API *Performance* untuk memproses 25.000+ baris kalkulasi finansial tanpa meledakkan RAM peladen (mencegah *Out of Memory*).
*   **Caching & Job Queue:** API yang berat dicadangkan ke dalam memori Redis selama 2 jam (`@cache_page`), sementara tugas pembaruan data berkala (*Cron Job*) tidak lagi menggunakan *threading* biasa, melainkan dilempar ke antrean pekerja tangguh menggunakan **Celery**.