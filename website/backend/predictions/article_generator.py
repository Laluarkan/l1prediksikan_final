import os
import re
import random
import logging
import json
import time
import datetime
import requests
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from predictions.models import UpcomingFixture, ParlayTicket, Article

logger = logging.getLogger(__name__)

# Kamus Rivalitas Klasik & Derby Ternama di 11 Liga Eropa
KNOWN_DERBIES = {
    # Premier League (E0)
    ("arsenal", "chelsea"): "London Derby",
    ("chelsea", "arsenal"): "London Derby",
    ("arsenal", "tottenham"): "North London Derby",
    ("tottenham", "arsenal"): "North London Derby",
    ("chelsea", "tottenham"): "London Derby",
    ("tottenham", "chelsea"): "London Derby",
    ("liverpool", "everton"): "Merseyside Derby",
    ("everton", "liverpool"): "Merseyside Derby",
    ("manchester united", "manchester city"): "Manchester Derby",
    ("manchester city", "manchester united"): "Manchester Derby",
    ("liverpool", "manchester united"): "North West Derby",
    ("manchester united", "liverpool"): "North West Derby",
    ("arsenal", "manchester united"): "Duel Klasik Inggris",
    ("manchester united", "arsenal"): "Duel Klasik Inggris",
    ("aston villa", "wolves"): "Midlands Derby",
    ("wolves", "aston villa"): "Midlands Derby",

    # La Liga (SP1)
    ("real madrid", "barcelona"): "El Clásico",
    ("barcelona", "real madrid"): "El Clásico",
    ("real madrid", "atletico madrid"): "Derbi Madrileño",
    ("atletico madrid", "real madrid"): "Derbi Madrileño",
    ("sevilla", "real betis"): "El Gran Derbi",
    ("real betis", "sevilla"): "El Gran Derbi",
    ("athletic club", "real sociedad"): "Basque Derby",
    ("real sociedad", "athletic club"): "Basque Derby",
    ("barcelona", "espanyol"): "Derbi Barceloní",
    ("espanyol", "barcelona"): "Derbi Barceloní",

    # Serie A (I1)
    ("inter", "milan"): "Derby della Madonnina",
    ("milan", "inter"): "Derby della Madonnina",
    ("juventus", "inter"): "Derby d'Italia",
    ("inter", "juventus"): "Derby d'Italia",
    ("roma", "lazio"): "Derby della Capitale",
    ("lazio", "roma"): "Derby della Capitale",
    ("juventus", "torino"): "Derby della Mole",
    ("torino", "juventus"): "Derby della Mole",
    ("napoli", "roma"): "Derby del Sole",
    ("roma", "napoli"): "Derby del Sole",

    # Bundesliga (D1)
    ("bayern munich", "dortmund"): "Der Klassiker",
    ("dortmund", "bayern munich"): "Der Klassiker",
    ("dortmund", "schalke"): "Revierderby",
    ("schalke", "dortmund"): "Revierderby",
    ("bayern munich", "leverkusen"): "Big Match Jerman",
    ("leverkusen", "bayern munich"): "Big Match Jerman",

    # Ligue 1 (F1)
    ("psg", "marseille"): "Le Classique",
    ("marseille", "psg"): "Le Classique",
    ("lyon", "saint-etienne"): "Derby Rhône-Alpes",
    ("saint-etienne", "lyon"): "Derby Rhône-Alpes",
    ("psg", "monaco"): "Big Match Prancis",
    ("monaco", "psg"): "Big Match Prancis",

    # Scottish Premiership (SC0)
    ("celtic", "rangers"): "Old Firm Derby",
    ("rangers", "celtic"): "Old Firm Derby",
    ("hearts", "hibernian"): "Edinburgh Derby",
    ("hibernian", "hearts"): "Edinburgh Derby",

    # Eredivisie (N1)
    ("ajax", "feyenoord"): "De Klassieker",
    ("feyenoord", "ajax"): "De Klassieker",
    ("ajax", "psv"): "De Topper",
    ("psv", "ajax"): "De Topper",

    # Primeira Liga (P1)
    ("benfica", "sporting cp"): "Derby de Lisboa",
    ("sporting cp", "benfica"): "Derby de Lisboa",
    ("porto", "benfica"): "O Clássico",
    ("benfica", "porto"): "O Clássico",

    # Süper Lig (T1)
    ("galatasaray", "fenerbahce"): "Intercontinental Derby",
    ("fenerbahce", "galatasaray"): "Intercontinental Derby",
    ("besiktas", "fenerbahce"): "Istanbul Derby",
    ("fenerbahce", "besiktas"): "Istanbul Derby",
    ("galatasaray", "besiktas"): "Istanbul Derby",
    ("besiktas", "galatasaray"): "Istanbul Derby",
}


def clean_team_name(name: str) -> str:
    """Membersihkan nama tim untuk pencocokan kamus derby"""
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r'\b(fc|cf|afc|sc|ac|as|rc|tsv|bv|ss)\b', '', n)
    return n.strip()


def check_derby(home: str, away: str):
    """Mengecek apakah laga merupakan derby atau rivalitas besar"""
    h_clean = clean_team_name(home)
    a_clean = clean_team_name(away)
    
    # Cek kombinasi langsung
    for (t1, t2), derby_name in KNOWN_DERBIES.items():
        if t1 in h_clean and t2 in a_clean:
            return derby_name
        if t2 in h_clean and t1 in a_clean:
            return derby_name
    return None


def get_fixture_priority(f: UpcomingFixture):
    """
    Menentukan prioritas pembuatan artikel agar laga penting (Big Match, Derby, Clash, Value Bet)
    diproses paling awal dan mendapat jatah kuota AI Gemini terbaik sebelum kuota harian/menitan terpakai.
    Tingkat Prioritas:
    1. Derby / Rivalitas Terkenal
    2. Bentrok Papan Atas (Top 5 Clash)
    3. Duel ELO Tinggi (High ELO Clash >= 3200)
    4. Sinyal Value Bet (1X2 atau Over/Under)
    5. Pertandingan Reguler (Preview Statistik Ringkas)
    """
    home = f.home_team.name
    away = f.away_team.name
    ext = f.extended_features or {}
    derby = check_derby(home, away)
    home_pos = ext.get('home_league_pos')
    away_pos = ext.get('away_league_pos')
    elo_home = ext.get('elo_home', 1500)
    elo_away = ext.get('elo_away', 1500)

    is_derby = bool(derby)
    is_top5 = bool(home_pos and away_pos and int(home_pos) <= 5 and int(away_pos) <= 5)
    is_high_elo = (elo_home + elo_away >= 3200)
    is_val = bool(f.has_value_bet or f.has_value_bet_ou)

    if is_derby:
        tier = 1
    elif is_top5:
        tier = 2
    elif is_high_elo:
        tier = 3
    elif is_val:
        tier = 4
    else:
        tier = 5

    # Urutkan berdasarkan tier prioritas, lalu tanggal pertandingan (f.date)
    return (tier, f.date)


def generate_with_gemini(prompt: str) -> str:
    """
    Memanggil Google Gemini API dengan auto-pacing cerdas dan cascading model fallback.
    Dilengkapi jeda otomatis untuk menghormati batas Free Tier (15 RPM) serta retry backoff
    jika menerima respons 429 (rate-limit) atau 503 (server overloaded).
    """
    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        return None

    # Model kandidat yang terbukti aktif dan terdaftar pada API key
    candidate_models = [
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3-flash-preview",
        "gemini-flash-latest",
    ]
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096
        }
    }

    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=45)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text and len(text.strip()) > 100:
                        # Bersihkan kalimat pengantar percakapan jika ada
                        clean_text = re.sub(r'^(Tentu|Berikut|Baiklah)[^\n]*\n+(---\n+)?', '', text.strip(), flags=re.IGNORECASE)
                        clean_text = re.sub(r'^\*\*Oleh:[^\n]*\n+', '', clean_text)
                        logger.info(f"Berhasil menghasilkan konten dengan model {model} ({len(clean_text)} karakter)")
                        # Jeda pacing 4 detik agar tidak melampaui batas 15 RPM (Requests Per Minute) pada Free Tier
                        time.sleep(4.0)
                        return clean_text.strip()
            elif res.status_code == 429:
                logger.warning(f"Gemini API model {model} terkena batas kuota/rate-limit (429). Menunggu jeda 5 detik sebelum mencoba model fallback...")
                time.sleep(5.0)
            elif res.status_code == 503:
                logger.warning(f"Gemini API model {model} sedang mengalami lonjakan beban (503). Menunggu 2 detik...")
                time.sleep(2.0)
            else:
                logger.warning(f"Gemini API model {model} mengembalikan status {res.status_code}: {res.text[:150]}")
        except Exception as e:
            logger.warning(f"Panggilan ke Gemini API ({model}) gagal: {e}")
            time.sleep(2.0)

    logger.warning("Seluruh panggilan Gemini API gagal/timeout. Mengalihkan ke Dynamic Smart Matrix...")
    return None


def generate_dynamic_big_match_text(f: UpcomingFixture, derby_name: str = None) -> str:
    """Generator teks jurnalisme dinamis untuk Big Match (Offline NLP Matrix)"""
    home = f.home_team.name
    away = f.away_team.name
    league = f.league.name
    date_str = f.date.strftime("%d %B %Y pukul %H:%M WIB")
    
    # Cuaca
    ext = f.extended_features or {}
    temp = ext.get('weather_temp_c', 16)
    weather_desc = ext.get('weather_condition', 'kondisi cuaca sejuk')
    
    prob_h = round((f.prob_ftr_h or 0.33) * 100, 1)
    prob_d = round((f.prob_ftr_d or 0.33) * 100, 1)
    prob_a = round((f.prob_ftr_a or 0.33) * 100, 1)
    prob_over = round((f.prob_ou25_over or 0.5) * 100, 1)
    
    derby_lead = f"Sorotan utama sepak bola Eropa akhir pekan ini tertuju pada panggung megah **{derby_name}**." if derby_name else f"Pekan krusial kompetisi **{league}** menghadirkan pertarungan sengit antara dua kekuatan besar."
    
    intros = [
        f"{derby_lead} Duel berbobot tinggi antara **{home}** melawan **{away}** dijadwalkan bergulir pada {date_str}. Kedua kubu datang dengan ambisi penuh mengamankan poin berharga demi posisi terhormat di papan klasemen.",
        f"{derby_lead} Pertandingan prestisius antara **{home}** dan **{away}** dipastikan menyedot atensi penggemar pada {date_str}. Laga ini bukan sekadar perebutan 3 angka, melainkan pertaruhan gengsi dan dominasi taktik.",
        f"{derby_lead} Atmosfer panas menyelimuti pertemuan akbar antara **{home}** kontra **{away}** yang dihelat pada {date_str}. Konsistensi dan ketajaman mental kedua tim diuji di tengah sorotan publik."
    ]
    
    taktik_phrases = [
        f"Dari sudut pandang taktik, **{home}** diproyeksikan mengandalkan kendali ritme permainan di sektor tengah untuk membongkar pertahanan lawan. Namun, transisi serangan balik cepat dari **{away}** tetap menjadi ancaman nyata yang patut diwaspadai sepanjang 90 menit.",
        f"Pelatih **{home}** diperkirakan menerapkan garis tekanan tinggi sejak peluit awal berbunyi guna memaksa lini belakang tim tamu melakukan kesalahan. Sementara itu, **{away}** diprediksi tampil disiplin dengan blok pertahanan rapat dan memaksimalkan situasi bola mati.",
        f"Kunci duel ini berada pada pertarungan lini vital lapangan tengah. Siapa pun yang berhasil mendominasi duel perebutan bola kedua akan memiliki peluang lebih besar menciptakan peluang emas."
    ]
    
    pick_text = ""
    if f.has_value_bet and f.rl_pick_ftr:
        pick_name = home if f.rl_pick_ftr == 'H' else (away if f.rl_pick_ftr == 'A' else "Hasil Seri (Draw)")
        pick_text = f"Berdasarkan kalkulasi machine learning Prediksi-Kan, model mendeteksi anomali odds (*Value Bet*) pada pilihan **{pick_name}** dengan peluang menang terukur."
    elif f.has_value_bet_ou and f.rl_pick_ou:
        pick_text = f"Sinyal matematis AI menunjukkan nilai tertinggi berada di pasar gol, di mana rekomendasi **{f.rl_pick_ou}** memiliki keunggulan probabilitas di atas estimasi pasar."
    else:
        favorit = home if prob_h > prob_a else away
        pick_text = f"Meski pasar menilai laga ini berjalan ketat, AI Prediksi-Kan memberi bobot sedikit lebih unggul kepada **{favorit}** dengan kalkulasi risiko moderat."

    content = f"""{random.choice(intros)}

### Tinjauan Taktik & Kondisi Lapangan
{random.choice(taktik_phrases)}

Pertandingan ini diprakirakan berlangsung dalam kondisi temperatur sekitar **{temp}°C** ({weather_desc}), suasana ideal bagi kedua kesebelasan untuk menampilkan intensitas permainan terbaik tanpa kendala iklim ekstrem.

### Kalkulasi Peluang & Probabilitas AI
Sistem machine learning Prediksi-Kan memproses data performa historis, tren form, serta fluktuasi odds pasar untuk memetakan probabilitas objektif laga ini:
- **Peluang Kemenangan {home} (Home)**: `{prob_h}%` (Rata-rata Odds: `{f.avg_h or '-'}`)
- **Peluang Hasil Imbang (Draw)**: `{prob_d}%` (Rata-rata Odds: `{f.avg_d or '-'}`)
- **Peluang Kemenangan {away} (Away)**: `{prob_a}%` (Rata-rata Odds: `{f.avg_a or '-'}`)
- **Peluang Tercipta Lebih dari 2.5 Gol (Over 2.5)**: `{prob_over}%` (Rata-rata Odds: `{f.avg_over_25 or '-'}`)

### Analisis Nilai & Rekomendasi Taruhan
{pick_text}

Bagi para penikmat taruhan olahraga, disiplin manajemen modal (*bankroll management*) tetap menjadi faktor paling fundamental. Pastikan selalu memasang taruhan secara terukur dan bertanggung jawab.
"""
    return content.strip()


def generate_concise_match_preview(f: UpcomingFixture) -> str:
    """Generator ringkas untuk SEMUA pertandingan biasa (Programmatic Match Preview)"""
    home = f.home_team.name
    away = f.away_team.name
    league = f.league.name
    date_str = f.date.strftime("%d %B %Y pukul %H:%M WIB")

    prob_h = round((f.prob_ftr_h or 0.33) * 100, 1)
    prob_d = round((f.prob_ftr_d or 0.33) * 100, 1)
    prob_a = round((f.prob_ftr_a or 0.33) * 100, 1)
    prob_over = round((f.prob_ou25_over or 0.5) * 100, 1)

    intro = f"Pertandingan antara **{home}** dan **{away}** pada lanjutan pekan kompetisi **{league}** dijadwalkan berlangsung pada {date_str}."
    
    pred_summary = f"Berdasarkan kalkulasi probabilitas AI Prediksi-Kan, tuan rumah **{home}** memiliki peluang menang sebesar `{prob_h}%`, potensi hasil imbang tercatat `{prob_d}%`, sedangkan peluang kemenangan tandang bagi **{away}** berada di angka `{prob_a}%`. Di pasar jumlah gol, estimasi tercipta di atas 2.5 gol (*Over 2.5*) mencapai `{prob_over}%`."

    odds_summary = f"Pasar taruhan global saat ini mencatat rata-rata odds: `{f.avg_h or '-'}` untuk kemenangan {home}, `{f.avg_d or '-'}` untuk hasil seri, dan `{f.avg_a or '-'}` untuk kemenangan {away}."

    content = f"""{intro} {pred_summary}

### Ringkasan Statistik & Odds Pasar
{odds_summary}

- **Probabilitas Menang {home}**: `{prob_h}%`
- **Probabilitas Imbang**: `{prob_d}%`
- **Probabilitas Menang {away}**: `{prob_a}%`
- **Peluang Over 2.5 Gol**: `{prob_over}%`

Pantau terus pergerakan odds dan statistik mendalam melalui platform analitik Prediksi-Kan.
"""
    return content.strip()


def generate_parlay_review_articles() -> list:
    """
    Menghasilkan artikel ulasan paket tiket parlay aktif untuk pekan pertandingan berjalan,
    DIBEDAKAN SPESIFIK per kombinasi parlay (2, 4, 6, 8, dan 10 laga).
    Setiap kombinasi mendapatkan artikel tersendiri yang mengupas strategi, manajemen risiko,
    dan rincian tiket unik di tier tersebut.
    """
    # 1. Cari tiket parlay aktif terbaru di database
    latest_ticket = ParlayTicket.objects.filter(is_historical=False).order_by('-date').first()
    if not latest_ticket or not latest_ticket.date:
        logger.info("Tidak ada tiket parlay aktif untuk dibuatkan ulasan.")
        return []

    target_date = latest_ticket.date

    # 2. Otomatis tandai tiket lama yang tanggalnya sudah lewat jauh sebagai is_historical=True
    ParlayTicket.objects.filter(
        is_historical=False,
        date__lt=target_date - datetime.timedelta(days=4)
    ).update(is_historical=True)

    # 3. Ambil tiket parlay aktif dalam jendela pekan yang sama (3 hari sebelum s/d 1 hari setelah target_date)
    start_week_date = target_date - datetime.timedelta(days=3)
    end_week_date = target_date + datetime.timedelta(days=1)

    active_parlays = list(
        ParlayTicket.objects.filter(
            is_historical=False,
            date__gte=start_week_date,
            date__lte=end_week_date
        ).order_by('-total_prob', '-date')
    )

    if not active_parlays:
        logger.info(f"Tidak ada tiket parlay aktif dalam rentang pekan {start_week_date} s/d {end_week_date}.")
        return []

    # 4. Tentukan identifier pekan berdasarkan ISO Calendar (Tahun & Pekan ke-W)
    iso_year, iso_week, _ = target_date.isocalendar()

    MONTHS_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    date_label = f"{target_date.day} {MONTHS_ID[target_date.month]} {target_date.year}"

    TIER_SPECS = {
        2: {
            'label': '2 Laga (Double)',
            'focus': 'Strategi Safe Anchor & Win Rate Tertinggi',
            'desc': 'Kombinasi **Parlay 2 Laga (Double)** disusun secara khusus oleh model kecerdasan buatan sebagai strategi fondasi berakurasi tinggi (*Safe Anchor*). Setiap tiket memadukan 2 laga dengan probabilitas kemenangan paling solid dan tanpa pengulangan pertandingan antar tiket di kategori ini. Sangat direkomendasikan bagi pemain yang mengutamakan keamanan modal dan pertumbuhan portofolio secara konsisten.',
            'stake_guide': '2% - 5% dari total bankroll (Fokus Low-Risk, High-Strike-Rate)',
            'tags': ['Parlay 2 Laga', 'Double Parlay', 'Safe Anchor', 'Tips Taruhan', 'Prediksi AI']
        },
        4: {
            'label': '4 Laga (Classic)',
            'focus': 'Akumulator Seimbang & Value Edge Optimal',
            'desc': 'Paket **Parlay 4 Laga (Classic)** menghadirkan titik temu ideal antara potensi pembayaran odds menarik (berkisar 5x - 12x) dengan keunggulan nilai matematis (*Value Edge*). Mengombinasikan 4 laga pilihan dari pasar 1X2 dan Over/Under 2.5 dengan kalkulasi probabilitas superior.',
            'stake_guide': '1% - 2% dari total bankroll (Fokus Balanced Value & Risk)',
            'tags': ['Parlay 4 Laga', 'Classic Parlay', 'Value Bet', 'Tips Taruhan', 'Prediksi AI']
        },
        6: {
            'label': '6 Laga (Multiplier)',
            'focus': 'Potensi Pengali Belasan Kali Lipat',
            'desc': 'Paket **Parlay 6 Laga (Multiplier)** memadukan 6 pertandingan pilihan untuk menghasilkan pembayaran pengali tinggi (biasanya odds 15x - 40x). Setiap laga dipilih dari tim-tim dengan keunggulan statistik paling meyakinkan pekan ini.',
            'stake_guide': '0.5% - 1% dari total bankroll (Fokus High-Multiplier Accumulator)',
            'tags': ['Parlay 6 Laga', 'Multiplier Parlay', 'Akumulator', 'Prediksi AI']
        },
        8: {
            'label': '8 Laga (Super Akumulator)',
            'focus': 'Kupon Panjang Pilihan AI',
            'desc': 'Paket **Parlay 8 Laga (Super Akumulator)** mengumpulkan 8 pertandingan teratas pekan ini menjadi satu kupon panjang dengan potensi pembayaran puluhan hingga ratusan kali lipat. Cocok untuk taruhan spekulatif terukur.',
            'stake_guide': '0.25% - 0.5% dari total bankroll (Fokus Super Accumulator)',
            'tags': ['Parlay 8 Laga', 'Super Parlay', 'High Odds', 'Prediksi AI']
        },
        10: {
            'label': '10 Laga (Monster Jackpot)',
            'focus': 'Peluang Emas Akumulator 10 Laga',
            'desc': 'Paket **Parlay 10 Laga (Monster Jackpot)** adalah tiket akumulator pamungkas mingguan AI yang merangkum 10 pertandingan terbaik dari seluruh liga top Eropa. Memberikan potensi keuntungan masif dengan alokasi modal minimalis.',
            'stake_guide': 'Micro-stake 0.1% - 0.25% dari total bankroll (Fokus Fun / Jackpot)',
            'tags': ['Parlay 10 Laga', 'Monster Parlay', 'Jackpot', 'Prediksi AI']
        },
    }

    created_articles = []

    for tier, spec in TIER_SPECS.items():
        tier_tickets = [t for t in active_parlays if (t.legs_details and len(t.legs_details) == tier)]
        if not tier_tickets:
            continue

        slug = f"analisis-parlay-{tier}-laga-ai-{iso_year}-w{iso_week:02d}"

        # Cek apakah artikel parlay kategori ini untuk pekan berjalan sudah ada
        existing_art = Article.objects.filter(category='parlay', slug=slug).first()
        if existing_art:
            # Periksa apakah seluruh kode tiket aktif (termasuk tiket UCL baru) sudah tercantum di dalam konten artikel
            all_tickets_present = all(t.ticket_id in (existing_art.content or '') for t in tier_tickets)
            if all_tickets_present:
                logger.info(f"[PARLAY SKIP] Artikel ulasan {spec['label']} pekan {iso_year}-W{iso_week:02d} sudah mutakhir.")
                continue
            logger.info(f"[PARLAY UPDATE] Mendeteksi tiket baru (UCL/Midweek) untuk {spec['label']} pekan {iso_year}-W{iso_week:02d}, memperbarui artikel...")

        total_t = len(tier_tickets)
        title = f"Bedah Paket Parlay {spec['label']} AI Pekan Ini ({date_label}): {spec['focus']}"

        sections = []
        intro = f"""Sistem Reinforcement Learning (RL Agent) Prediksi-Kan telah merilis sebanyak **{total_t} Tiket Pilihan** untuk kategori **{spec['label']}** pada putaran jadwal pekan ini ({date_label}).

{spec['desc']}

Berikut adalah bedah analisis lengkap dan peluang matematis untuk setiap tiket {spec['label']} aktif yang tersedia:
"""
        sections.append(intro)

        for idx, ticket in enumerate(tier_tickets, 1):
            odds = round(ticket.total_odds or 1.0, 2)
            prob = round((ticket.total_prob or 0.0) * 100, 2)
            legs = ticket.legs_details or []

            ticket_sec = f"""## 🎫 Paket {spec['label']} #{idx} (Kode Tiket: `{ticket.ticket_id}`)
- **Total Akumulator Odds**: `x{odds}`
- **Estimasi Probabilitas Kumulatif AI**: `{prob}%`
- **Jumlah Pertandingan**: `{len(legs)} Pertandingan Pilihan`

### Rincian Pertandingan dalam Tiket #{idx}:
"""
            for l_idx, leg in enumerate(legs, 1):
                match_name = leg.get('match') or leg.get('match_name') or 'Pertandingan'
                parts = re.split(r'\s+vs\s+', match_name, flags=re.IGNORECASE)
                home_team = parts[0].strip() if len(parts) > 0 else match_name
                away_team = parts[1].strip() if len(parts) > 1 else ""
                home_slug = slugify(home_team)
                away_slug = slugify(away_team)
                
                if away_team:
                    match_display = f"![{home_team}](/logos/teams/{home_slug}.png) **{home_team}** vs ![{away_team}](/logos/teams/{away_slug}.png) **{away_team}**"
                else:
                    match_display = f"**{match_name}**"

                pick = leg.get('pick', '-')
                leg_odds = leg.get('odds', '-')
                edge = round((leg.get('edge') or 0.0) * 100, 1)
                tipe = "Hasil Akhir (1X2)" if leg.get('market') == 'ftr' or leg.get('market_type') == '1X2 / FTR' else "Jumlah Gol (Over/Under 2.5)"

                ticket_sec += f"""{l_idx}. {match_display}
   - **Pasar**: {tipe}
   - **Rekomendasi AI**: `{pick}`
   - **Odds Pasar**: `{leg_odds}`
   - **Keunggulan Nilai (*Value Edge*)**: `+{edge}%`
"""
            sections.append(ticket_sec)

        closing = f"""
---
### 💡 Panduan Manajemen Modal & Risiko ({spec['label']})
- **Rekomendasi Alokasi Stake**: `{spec['stake_guide']}`
- **Karakter Strategi**: Setiap tiket dalam kategori {spec['label']} ini menggunakan pasangan pertandingan yang unik dan tidak tumpang tindih. Jika salah satu tiket mengalami kejutan (*upset*), tiket lainnya tetap mandiri dan tidak terpengaruh.
- **Disiplin Portofolio**: Utamakan konsistensi jangka panjang dengan taruhan proporsional sesuai bankroll Anda.
"""
        sections.append(closing)

        full_content = "\n\n".join(sections)
        excerpt = f"Ulasan lengkap {total_t} paket tiket Parlay {spec['label']} rekomendasi AI Prediksi-Kan pekan ini ({date_label}). Analisis mendalam peluang odds akumulator dan value edge tiap leg."

        if existing_art:
            existing_art.title = title
            existing_art.excerpt = excerpt
            existing_art.content = full_content
            existing_art.tags = spec['tags']
            existing_art.parlay_ticket = tier_tickets[0]
            existing_art.meta_title = f"{title} | Prediksi-Kan"
            existing_art.meta_description = excerpt[:160]
            existing_art.reading_time = f"{max(3, len(tier_tickets) * 2)} menit"
            existing_art.is_published = True
            existing_art.save()
            created_articles.append(existing_art)
            logger.info(f"Berhasil memperbarui artikel ulasan parlay dengan tiket baru: {existing_art.title}")
        else:
            art = Article.objects.create(
                title=title,
                slug=slug,
                excerpt=excerpt,
                content=full_content,
                category='parlay',
                tags=spec['tags'],
                parlay_ticket=tier_tickets[0],
                meta_title=f"{title} | Prediksi-Kan",
                meta_description=excerpt[:160],
                reading_time=f"{max(3, len(tier_tickets) * 2)} menit",
                is_published=True
            )
            created_articles.append(art)
            logger.info(f"Berhasil menerbitkan artikel ulasan parlay: {art.title}")

    return created_articles

def generate_parlay_review_article():
    """Alias kompatibilitas mundur."""
    arts = generate_parlay_review_articles()
    return arts[0] if arts else None


def run_article_generation_pipeline():
    """
    Eksekutor Utama Pembuatan Berita Otomatis:
    1. Scan dan susun ulasan 1 artikel komprehensif paket tiket parlay aktif (maksimal 10 paket unggulan).
    2. Buat berita untuk SEMUA pertandingan mendatang yang ditarik:
       - Big Match (Derby, Top 5 Clash, High ELO) -> Analisis Taktik & Probabilitas Mendalam
       - Sinyal Value Bet -> Analisis Anomali Odds
       - Seluruh pertandingan lainnya -> Match Preview Ringkas Programmatic
    """
    logger.info("=== MEMULAI GENERASI ARTIKEL BERITA & PREVIEW OTOMATIS ===")
    
    # Ambil pertandingan mendatang, atau seluruh pertandingan pada pekan terakhir di Supabase
    now = timezone.now()
    upcoming = UpcomingFixture.objects.filter(date__gte=now - timezone.timedelta(days=1)).order_by('date')
    if not upcoming.exists():
        latest_fixture = UpcomingFixture.objects.order_by('-date').first()
        if latest_fixture:
            latest_date = latest_fixture.date
            # Ambil semua laga dalam rentang 4 hari putaran pekan terakhir tersebut (Jumat - Senin)
            fixtures = list(UpcomingFixture.objects.filter(
                date__gte=latest_date - timezone.timedelta(days=4)
            ).select_related('league', 'home_team', 'away_team').order_by('date'))
        else:
            fixtures = []
    else:
        fixtures = list(upcoming.select_related('league', 'home_team', 'away_team'))
    
    # Prioritaskan Big Match, Derby, Clash, dan Value Bet di urutan teratas agar mendapatkan jatah Gemini AI terbaik
    fixtures.sort(key=get_fixture_priority)
    
    created_count = 0

    # 1. GENERATE ARTIKEL PARLAY (Dibedakan per kombinasi: 2, 4, 6, 8, 10 laga)
    try:
        parlay_arts = generate_parlay_review_articles()
        created_count += len(parlay_arts)
    except Exception as e:
        logger.error(f"Gagal generate artikel parlay: {e}")

    # 2. GENERATE BERITA UNGGULAN & PREVIEW UNTUK SEMUA MATCH TANPA PENGURANGAN
    for f in fixtures:
        home = f.home_team.name
        away = f.away_team.name
        derby = check_derby(home, away)
        
        ext = f.extended_features or {}
        home_pos = ext.get('home_league_pos')
        away_pos = ext.get('away_league_pos')
        elo_home = ext.get('elo_home', 1500)
        elo_away = ext.get('elo_away', 1500)
        
        is_top5_clash = (home_pos and away_pos and int(home_pos) <= 5 and int(away_pos) <= 5)
        is_high_elo = (elo_home + elo_away >= 3200)
        is_value_bet = (f.has_value_bet or f.has_value_bet_ou)

        # 1. Cek langsung via relasi ForeignKey ke fixture
        if Article.objects.filter(fixture=f).exists():
            continue

        date_code = f.date.strftime("%Y%m%d")
        slug_base = slugify(f"{home}-vs-{away}-{date_code}")

        # 2. Cek apakah artikel untuk laga ini di tanggal yang sama sudah pernah dibuat
        # Ini mencegah duplikasi jika action GitHub berjalan lagi di hari Sabtu atau Minggu
        if Article.objects.filter(slug__icontains=slug_base).exists():
            continue

        tags = [f.league.name, home, away]

        if derby:
            category = 'big_match'
            title = f"Prediksi {home} vs {away}: Duel Panas {derby} & Peluang Emas AI"
            tags.extend(['Derby', derby, 'Big Match'])
            slug = f"prediksi-{slug_base}"
            prompt_gemini = f"""Anda adalah jurnalis olahraga senior terkemuka. Tuliskan artikel preview berita sepak bola komprehensif antara {home} vs {away} di kompetisi {f.league.name} pada {f.date.strftime('%d %B %Y')}.
Data pertandingan:
- Status: Derby {derby}
- Probabilitas AI: Kemenangan {home} {round((f.prob_ftr_h or 0.33)*100, 1)}%, Seri {round((f.prob_ftr_d or 0.33)*100, 1)}%, Kemenangan {away} {round((f.prob_ftr_a or 0.33)*100, 1)}%.
- Over 2.5 Gol: {round((f.prob_ou25_over or 0.5)*100, 1)}%.
- Odds Pasar: Home {f.avg_h}, Draw {f.avg_d}, Away {f.avg_a}, Over 2.5 {f.avg_over_25}.
Tulis dalam Bahasa Indonesia dengan gaya jurnalisme olahraga yang mengalir, hidup, tajam, dan gunakan format Markdown. Panjang sekitar 400 kata. Akhiri dengan rekomendasi taruhan bijak. Jangan menyertakan salam pembuka atau penutup percakapan."""
            content = generate_with_gemini(prompt_gemini) or generate_dynamic_big_match_text(f, derby_name=derby)
            reading_time = "4 menit"

        elif is_top5_clash:
            category = 'big_match'
            title = f"Prediksi {home} vs {away}: Bentrok Papan Atas Top 5 Klasemen {f.league.name}"
            tags.extend(['Top 5 Clash', 'Big Match'])
            slug = f"prediksi-{slug_base}"
            prompt_gemini = f"""Anda adalah jurnalis olahraga senior terkemuka. Tuliskan artikel preview berita sepak bola komprehensif antara {home} vs {away} di kompetisi {f.league.name} pada {f.date.strftime('%d %B %Y')}.
Data pertandingan:
- Status: Bentrok Papan Atas Top 5 Klasemen (Posisi #{home_pos} vs #{away_pos})
- Probabilitas AI: Kemenangan {home} {round((f.prob_ftr_h or 0.33)*100, 1)}%, Seri {round((f.prob_ftr_d or 0.33)*100, 1)}%, Kemenangan {away} {round((f.prob_ftr_a or 0.33)*100, 1)}%.
- Over 2.5 Gol: {round((f.prob_ou25_over or 0.5)*100, 1)}%.
- Odds Pasar: Home {f.avg_h}, Draw {f.avg_d}, Away {f.avg_a}, Over 2.5 {f.avg_over_25}.
Tulis dalam Bahasa Indonesia dengan gaya jurnalisme olahraga yang mengalir, hidup, mendalam, dan gunakan format Markdown. Panjang sekitar 400 kata. Berikan analisis taktik, perebutan poin krusial, dan proyeksi pertandingan. Jangan menyertakan salam pembuka atau penutup percakapan."""
            content = generate_with_gemini(prompt_gemini) or generate_dynamic_big_match_text(f, derby_name=None)
            reading_time = "4 menit"

        elif is_high_elo:
            category = 'big_match'
            title = f"Prediksi {home} vs {away}: Pertarungan Sengit Dua Kekuatan Besar {f.league.name}"
            tags.append('Big Match')
            slug = f"prediksi-{slug_base}"
            prompt_gemini = f"""Anda adalah jurnalis olahraga senior terkemuka. Tuliskan artikel preview berita sepak bola komprehensif antara {home} vs {away} di kompetisi {f.league.name} pada {f.date.strftime('%d %B %Y')}.
Data pertandingan:
- Status: Duel Dua Raksasa ELO Tinggi (High ELO Clash: {elo_home} vs {elo_away})
- Probabilitas AI: Kemenangan {home} {round((f.prob_ftr_h or 0.33)*100, 1)}%, Seri {round((f.prob_ftr_d or 0.33)*100, 1)}%, Kemenangan {away} {round((f.prob_ftr_a or 0.33)*100, 1)}%.
- Over 2.5 Gol: {round((f.prob_ou25_over or 0.5)*100, 1)}%.
- Odds Pasar: Home {f.avg_h}, Draw {f.avg_d}, Away {f.avg_a}, Over 2.5 {f.avg_over_25}.
Tulis dalam Bahasa Indonesia dengan gaya jurnalisme olahraga yang mengalir, hidup, mendalam, dan gunakan format Markdown. Panjang sekitar 400 kata. Berikan analisis taktik, tren performa, dan proyeksi skor. Jangan menyertakan salam pembuka atau penutup percakapan."""
            content = generate_with_gemini(prompt_gemini) or generate_dynamic_big_match_text(f, derby_name=None)
            reading_time = "4 menit"

        elif is_value_bet:
            category = 'value_bet'
            title = f"Prediksi {home} vs {away}: Sinyal Emas Value Bet AI & Analisis Peluang"
            tags.extend(['Value Bet', 'Tips Taruhan'])
            slug = f"prediksi-{slug_base}"
            prompt_gemini = f"""Anda adalah analis taruhan olahraga profesional. Tulis ulasan artikel Value Bet mendalam antara {home} vs {away} di {f.league.name} ({f.date.strftime('%d %B %Y')}).
Data pertandingan:
- Probabilitas AI: Kemenangan {home} {round((f.prob_ftr_h or 0.33)*100, 1)}%, Seri {round((f.prob_ftr_d or 0.33)*100, 1)}%, Kemenangan {away} {round((f.prob_ftr_a or 0.33)*100, 1)}%.
- Odds Pasar: Home {f.avg_h}, Draw {f.avg_d}, Away {f.avg_a}, Over 2.5 {f.avg_over_25}.
- Sinyal Value Bet: {'Value Bet 1X2 terdeteksi' if f.has_value_bet else ''} {'Value Bet Over/Under terdeteksi' if f.has_value_bet_ou else ''}
Tulis dalam bahasa Indonesia profesional, format Markdown. Panjang 350-400 kata. Jelaskan mengapa pasar memberikan mispricing dan mengapa sinyal AI ini bernilai tinggi. Jangan menyertakan salam pembuka atau penutup percakapan."""
            content = generate_with_gemini(prompt_gemini) or generate_dynamic_big_match_text(f, derby_name=None)
            reading_time = "3 menit"

        else:
            category = 'match_preview'
            title = f"Preview Pertandingan {home} vs {away}: Statistik & Prediksi Peluang AI"
            slug = f"preview-{slug_base}"
            content = generate_concise_match_preview(f)
            tags.append('Match Preview')
            reading_time = "2 menit"

        # Pastikan slug unik
        original_slug = slug
        c = 1
        while Article.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{c}"
            c += 1

        excerpt = f"Analisis prediksi {home} vs {away} di {f.league.name}. Tinjauan statistik, tren performa, dan probabilitas AI Prediksi-Kan."

        Article.objects.create(
            title=title,
            slug=slug,
            excerpt=excerpt,
            content=content,
            category=category,
            tags=tags,
            fixture=f,
            meta_title=f"{title} | L1 Prediksi-Kan",
            meta_description=excerpt[:160],
            reading_time=reading_time,
            is_published=True
        )
        created_count += 1

    if created_count > 0:
        try:
            from django.core.cache import cache
            cache.clear()
            logger.info("Cache Redis berhasil dibersihkan setelah menerbitkan artikel berita baru.")
        except Exception as e:
            logger.warning(f"Gagal membersihkan cache Redis: {e}")

    logger.info(f"=== SELESAI: Berhasil menerbitkan {created_count} artikel berita & preview baru ===")
    return created_count
