# Blueprint Arsitektur Web: L1 Prediksi-Kan

## 1. Tech Stack (Teknologi yang Digunakan)
* **Backend:** Django & Django REST Framework (DRF)
* **Frontend:** Next.js (React Framework) dengan Tailwind CSS
* **Database:** SQLite (Untuk tahap *development* lokal) & PostgreSQL (Ideal untuk *deployment* produksi guna memproses dan memfilter ribuan data statistik sepak bola)
* **Machine Learning:** LightGBM, Scikit-Learn, Pandas (Diintegrasikan langsung di dalam *service* Django)

## 2. Strategi Manajemen Data (Database Seeding & Simulasi)
Karena musim liga Eropa sedang berakhir, kita akan melakukan simulasi *live environment* menggunakan dataset yang ada.
* **Data Histori (Tabel `MatchHistory`):** Semua baris data dari awal musim hingga `2025-10-24` akan dimasukkan ke tabel ini. Data ini digunakan untuk menampilkan statistik masa lalu, klasemen, dan *head-to-head*.
* **Data Simulasi Jadwal (Tabel `UpcomingFixture`):** Data *test* dari tanggal `2025-10-25` (Kifisia vs Panetolikos) hingga `2026-05-24` (Verona vs Roma) tidak akan dimasukkan sebagai histori, melainkan diinjeksi ke tabel jadwal mendatang. Tanggal pada tabel ini akan diatur agar seolah-olah pertandingan ini belum terjadi.
* Saat simulasi berjalan, sistem akan membaca `UpcomingFixture`, memanggil model ML, dan menyajikan prediksinya di web.

## 3. Peta Halaman & Fitur Frontend (Next.js)
1. **Beranda (Home):**
   * *Hero section* dengan *Match of the Day*.
   * Menu navigasi untuk 11 Liga Eropa.
   * Ringkasan akurasi model dan ROI *bankroll*.
2. **Halaman Prediksi (Predictions Page):**
   * Filter berdasarkan liga, tanggal, atau tim.
   * **Kartu Pertandingan (Match Card):** Menampilkan logo tim, tanggal, dan jam.
   * **Detail Prediksi (Prediction Detail):** * Probabilitas Model vs Probabilitas Bandar untuk pasar FTR (1X2) dan OU25.
     * Indikator **Value Bet** (Jika ada *edge* yang signifikan).
     * **RL Agent Recommendation:** Saran ukuran taruhan (*Kelly Stake*) dan status tindakan (Misal: *Bet 100% of Kelly* atau *Skip*).
3. **Halaman Klasemen & Elo Rating:**
   * Klasemen dinamis dari 11 liga.
   * Papan peringkat kekuatan tim murni berdasarkan perhitungan algoritma Elo Rating kita.
4. **Halaman Transparansi (Performance Tracker):**
   * Grafik visualisasi pertumbuhan *bankroll* dari agen RL (menampilkan *chart* yang sudah digenerate).
   * Laporan histori prediksi (Benar/Salah) untuk membangun kepercayaan pengguna.
5. **Fitur Autentikasi & Akun Pengguna (User Area):**
   * Halaman Login dan Registrasi.
   * Halaman Profil: Melacak *Saved Predictions* (pertandingan yang ditandai atau disimpan oleh pengguna ke dalam daftar pantauan/tiket *parlay* pribadi).

## 4. Fitur Dashboard Admin (Django Admin Custom)
1. **Manajemen Data Histori:** Form *upload* file CSV historis. Sistem otomatis menjalankan fungsi `enrichment` (klasemen & cuaca) lalu menyimpannya ke *database*.
2. **Manajemen Fixtures (Jadwal Baru):** Form *upload* file CSV *fixtures* dari `football-data.co.uk`. 
3. **Trigger Pipeline ML:** Tombol eksekusi manual bagi admin untuk menyuruh model ML dan agen RL memproses data *fixtures* terbaru dan memperbarui hasil probabilitas di *database* yang akan dikonsumsi oleh pengguna.
4. **Manajemen Pengguna:** Memantau pengguna aktif dan mengelola hak akses akun.

## 5. Output Utama Platform (Deliverables)
Platform ini pada akhirnya memberikan nilai tambah (*output*) konkret kepada pengguna berupa:
* **Probabilitas ML vs Pasar:** Menyajikan persentase probabilitas murni (*true probability*) dari hasil FTR dan OU25 yang dihitung oleh model AI, disandingkan langsung dengan probabilitas tersirat (*implied probability*) dari bandar.
* **Deteksi Value Bet Otomatis:** Menyoroti pertandingan mana saja yang memiliki *edge* (keuntungan matematis jangka panjang) di atas ambang batas.
* **Panduan Manajemen Modal (Bankroll Management):** Tidak hanya memberikan prediksi, tetapi juga instruksi eksekusi finansial dari RL Agent (berapa nominal Rupiah yang ideal untuk dipertaruhkan atau anjuran untuk *Skip* jika rasio risiko/imbalan terlalu tinggi).

## 6. Alur Pengguna (User Flow)
### Alur Umum (General Flow)
1. **Kunjungan Awal:** Pengguna mendarat di Beranda, melihat *Match of the Day* dan statistik performa keseluruhan (ROI).
2. **Autentikasi:** Pengguna melakukan Registrasi/Login untuk membuka akses fitur penyimpanan (*Watchlist*).
3. **Eksplorasi:** Pengguna menavigasi ke Halaman Prediksi atau melihat Klasemen/Elo Rating.

### Alur Detail di Halaman Prediksi (Prediction Flow)
1. **Akses & Filter:** Pengguna membuka Halaman Prediksi dan menggunakan filter di *sidebar*/*topbar* untuk menyortir jadwal berdasarkan Liga (misal: EPL, La Liga) atau rentang waktu (Hari ini, Besok, Akhir Pekan).
2. **Pemilihan Pertandingan:** Pengguna melihat daftar *Match Card* dan mengklik salah satu pertandingan yang menarik minat mereka.
3. **Evaluasi Data Laga (Detail View):** * Panel detail terbuka (bisa berupa *modal/popup* atau halaman baru).
   * Pengguna membandingkan diagram *True Probability* (Model) vs *Bookie Probability*.
   * Pengguna melihat indikator visual: Apakah ada label **"VALUE BET DETECTED"** warna hijau pada pasar FTR atau OU25?
4. **Pengambilan Keputusan (RL Agent Action):** Pengguna menggulir ke bagian rekomendasi aksi.
   * *Skenario A:* Agen merekomendasikan "Bet 50% of Kelly = Rp 5.000". Pengguna yakin dan memutuskan untuk mengeksekusinya (di platform *bookie* eksternal).
   * *Skenario B:* Agen merekomendasikan "Skip (0%)" karena *odds* berisiko tinggi (*drawdown risk*). Pengguna mengikuti anjuran untuk tidak memaksakan taruhan.
5. **Simpan/Pantau (Aksi User):** Pengguna menekan tombol "Save Prediction" atau "Add to Watchlist". Pertandingan tersebut masuk ke Halaman Profil pengguna untuk dievaluasi hasilnya setelah laga usai.

## 7. Alur Pembuatan (Development Workflow)
* **Tahap 1: Setup Backend & Database (Django)**
  * Inisialisasi proyek Django dengan konfigurasi *database* dinamis (SQLite untuk lokal, PostgreSQL untuk produksi).
  * Pembuatan arsitektur *Models*:
    * **Domain Prediksi:** `League`, `Team`, `MatchHistory`, `UpcomingFixture`, `PredictionResult`.
    * **Domain Pengguna:** `CustomUser` (Manajemen login, registrasi, *role* autentikasi), `UserProfile` (Preferensi pengguna), dan `SavedPrediction` (Riwayat atau *watchlist* taruhan pengguna).
* **Tahap 2: Integrasi Pipeline ML ke Django**
  * Memindahkan direktori `models/` (.pkl) dan skrip `src/` (feature engineering) ke dalam *service* Django.
  * Membuat skrip otomatis (*management command*) untuk membaca CSV kita saat ini dan melakukan *seeding* memisahkannya menjadi data histori dan data simulasi jadwal.
* **Tahap 3: Pembuatan REST API**
  * Membangun *endpoint* API (misal: `/api/fixtures/`, `/api/predictions/<match_id>/`) menggunakan Django REST Framework.
  * Membangun *endpoint* Autentikasi (JWT Auth untuk Register, Login, Logout, dan perlindungan akses *endpoint*).
* **Tahap 4: Setup & Desain Frontend (Next.js)**
  * Membangun antarmuka UI/UX dengan *dark-theme* yang sudah direncanakan.
  * Integrasi API untuk menampilkan data ke komponen React serta integrasi *state management* untuk sesi *login* pengguna.
* **Tahap 5: Deployment**
  * Backend (Django, Database PostgreSQL, dan Model ML) di-deploy ke VPS atau *platform* seperti Render.
  * Frontend (Next.js) di-deploy ke Vercel untuk performa yang optimal.

---
*Catatan: Blueprint ini hanya template dasar yang di mana saat proses pembuatan tiap halamannya nanti kemungkinan ada perubahan yang disesuaikan.*