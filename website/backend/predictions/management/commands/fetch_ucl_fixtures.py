import datetime
import json
import logging
import math
import os
import re
import urllib.request
import numpy as np
import pandas as pd
import pytz
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from predictions.models import League, Team, UpcomingFixture, MatchHistory
from predictions.services import (
    LEAGUE_NAMES,
    clean_json_dict,
    make_aware_dt,
    run_ml_predictions_for_preview,
)

logger = logging.getLogger(__name__)

# Kamus pemetaan nama tim dari ESPN API ke nama standar tim di database Prediksikan (11 Liga)
UCL_TEAM_ALIASES = {
    # Inggris (E0)
    "arsenal": "Arsenal",
    "manchester city": "Man City",
    "man city": "Man City",
    "liverpool": "Liverpool",
    "aston villa": "Aston Villa",
    "chelsea": "Chelsea",
    "tottenham hotspur": "Tottenham",
    "tottenham": "Tottenham",
    "newcastle united": "Newcastle",
    "newcastle": "Newcastle",
    "manchester united": "Man United",
    "man united": "Man United",
    "nottingham forest": "Nott'm Forest",
    "brighton & hove albion": "Brighton",
    "brighton": "Brighton",

    # Spanyol (SP1)
    "real madrid": "Real Madrid",
    "barcelona": "Barcelona",
    "fc barcelona": "Barcelona",
    "atletico madrid": "Ath Madrid",
    "atlético madrid": "Ath Madrid",
    "girona": "Girona",
    "athletic club": "Ath Bilbao",
    "athletic bilbao": "Ath Bilbao",
    "real sociedad": "Sociedad",
    "real betis": "Betis",
    "villarreal": "Villarreal",
    "sevilla": "Sevilla",

    # Jerman (D1)
    "bayer leverkusen": "Leverkusen",
    "leverkusen": "Leverkusen",
    "bayern munich": "Bayern Munich",
    "bayern münchen": "Bayern Munich",
    "borussia dortmund": "Dortmund",
    "dortmund": "Dortmund",
    "rb leipzig": "RB Leipzig",
    "leipzig": "RB Leipzig",
    "vfb stuttgart": "Stuttgart",
    "stuttgart": "Stuttgart",
    "eintracht frankfurt": "Ein Frankfurt",
    "frankfurt": "Ein Frankfurt",
    "borussia monchengladbach": "M'gladbach",
    "wolfsburg": "Wolfsburg",

    # Italia (I1)
    "internazionale": "Inter",
    "inter milan": "Inter",
    "inter": "Inter",
    "ac milan": "Milan",
    "milan": "Milan",
    "juventus": "Juventus",
    "atalanta": "Atalanta",
    "bologna": "Bologna",
    "as roma": "Roma",
    "roma": "Roma",
    "lazio": "Lazio",
    "napoli": "Napoli",
    "fiorentina": "Fiorentina",
    "como": "Como",

    # Prancis (F1)
    "paris saint-germain": "Paris SG",
    "paris sg": "Paris SG",
    "psg": "Paris SG",
    "monaco": "Monaco",
    "as monaco": "Monaco",
    "brest": "Brest",
    "stade brestois 29": "Brest",
    "lille": "Lille",
    "losc lille": "Lille",
    "nice": "Nice",
    "ogc nice": "Nice",
    "lyon": "Lyon",
    "olympique lyonnais": "Lyon",
    "marseille": "Marseille",
    "lens": "Lens",
    "rc lens": "Lens",

    # Belanda (N1)
    "psv eindhoven": "PSV Eindhoven",
    "psv": "PSV Eindhoven",
    "feyenoord rotterdam": "Feyenoord",
    "feyenoord": "Feyenoord",
    "ajax": "Ajax",
    "az alkmaar": "AZ Alkmaar",
    "twente": "Twente",

    # Portugal (P1)
    "sporting cp": "Sporting",
    "sporting lisbon": "Sporting",
    "sporting": "Sporting",
    "sl benfica": "Benfica",
    "benfica": "Benfica",
    "fc porto": "Porto",
    "porto": "Porto",
    "braga": "Braga",
    "sc braga": "Braga",

    # Belgia (B1)
    "club brugge": "Club Brugge",
    "brugge": "Club Brugge",
    "union saint-gilloise": "Union SG",
    "anderlecht": "Anderlecht",
    "rsc anderlecht": "Anderlecht",
    "gent": "Gent",
    "genk": "Genk",

    # Skotlandia (SC0)
    "celtic": "Celtic",
    "rangers": "Rangers",

    # Turki (T1)
    "galatasaray": "Galatasaray",
    "fenerbahce": "Fenerbahce",
    "besiktas": "Besiktas",

    # Yunani (G1)
    "olympiacos": "Olympiakos",
    "olympiakos": "Olympiakos",
    "paok": "PAOK",
    "panathinaikos": "Panathinaikos",
    "aek athens": "AEK",
}

def american_to_decimal_odds(american_val):
    """Mengonversi American Odds (e.g. +400, -195) ke Decimal Odds (e.g. 5.00, 1.51)"""
    if american_val is None:
        return None
    try:
        val_str = str(american_val).replace('+', '').strip()
        num = float(val_str)
        if num == 0:
            return 1.0
        if num > 0:
            return round(1.0 + (num / 100.0), 2)
        else:
            return round(1.0 + (100.0 / abs(num)), 2)
    except Exception:
        return None

def normalize_name(name):
    """Normalisasi nama tim untuk pencocokan toleran"""
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r'[\.\-\'\/\,]', ' ', n)
    n = re.sub(r'\b(fc|cf|sc|rc|afc|vfb|sv|as|ogc|losc|fk)\b', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()

class Command(BaseCommand):
    help = 'Menarik data Fixture UEFA Champions League (UCL) dari ESPN API untuk beberapa hari ke depan'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=10,
            help='Jumlah hari ke depan untuk mencari jadwal fixture UCL (default: 10 hari)',
        )

    def handle(self, *args, **options):
        days_ahead = options.get('days') or 10
        self.stdout.write(self.style.WARNING(f"=== Memulai Penarikan Fixture UEFA Champions League ({days_ahead} Hari ke Depan) ==="))

        # 1. Pastikan Entitas Liga UCL ada di Database
        ucl_league, _ = League.objects.get_or_create(
            code="UCL",
            defaults={
                "name": "UEFA Champions League",
                "country": "Eropa",
                "logo_url": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
            }
        )

        # Siapkan kamus nama tim di database untuk pencarian cepat
        db_teams_qs = Team.objects.all()
        db_teams_map = {t.name.lower(): t for t in db_teams_qs}
        normalized_teams_map = {normalize_name(t.name): t for t in db_teams_qs}

        def find_db_team(espn_name):
            if not espn_name:
                return None
            clean_name = espn_name.strip()
            lower_name = clean_name.lower()

            # 1. Cek kamus alias langsung
            if lower_name in UCL_TEAM_ALIASES:
                target_alias = UCL_TEAM_ALIASES[lower_name].lower()
                if target_alias in db_teams_map:
                    return db_teams_map[target_alias]

            # 2. Cek kecocokan langsung di nama database
            if lower_name in db_teams_map:
                return db_teams_map[lower_name]

            # 3. Cek nama ternormalisasi
            norm = normalize_name(clean_name)
            if norm in normalized_teams_map:
                return normalized_teams_map[norm]

            # 4. Cek substring matching toleran
            for db_n, team_obj in db_teams_map.items():
                if len(db_n) >= 4 and (db_n in lower_name or lower_name in db_n):
                    return team_obj

            return None

        # 2. Tarik Event dari ESPN API per Tanggal (Hari ini s/d days_ahead)
        start_date = datetime.date.today()
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        
        all_events = []
        seen_event_ids = set()

        for day_offset in range(days_ahead + 1):
            target_date = start_date + datetime.timedelta(days=day_offset)
            date_str = target_date.strftime('%Y%m%d')
            url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates={date_str}"

            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=12) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    events = data.get('events', [])
                    for ev in events:
                        eid = ev.get('id')
                        if eid and eid not in seen_event_ids:
                            seen_event_ids.add(eid)
                            all_events.append(ev)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Gagal mengambil tanggal {date_str}: {e}"))

        self.stdout.write(f"Ditemukan total {len(all_events)} jadwal pertandingan UCL dari ESPN.")

        # 3. Filter Match: Hanya jika KEDUA tim ada di 11 liga kita
        ucl_matched_fixtures = []
        skipped_matches = []

        for ev in all_events:
            comps = ev.get('competitions', [])
            if not comps:
                continue
            comp = comps[0]
            
            # Cek status laga: abaikan jika sudah selesai (FT/final)
            status_type = ev.get('status', {}).get('type', {}).get('state', '').lower()
            if status_type in ('post', 'final'):
                continue

            competitors = comp.get('competitors', [])
            if len(competitors) < 2:
                continue

            home_comp = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
            away_comp = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

            raw_home_name = home_comp.get('team', {}).get('displayName', '')
            raw_away_name = away_comp.get('team', {}).get('displayName', '')

            db_home_team = find_db_team(raw_home_name)
            db_away_team = find_db_team(raw_away_name)

            # ATURAN EMAS: Jika salah satu tim BUKAN dari 11 liga kita, lewati!
            if not db_home_team or not db_away_team:
                missing_info = []
                if not db_home_team:
                    missing_info.append(f"Home '{raw_home_name}'")
                if not db_away_team:
                    missing_info.append(f"Away '{raw_away_name}'")
                skipped_matches.append(f"{raw_home_name} vs {raw_away_name} (Di luar 11 liga: {', '.join(missing_info)})")
                continue

            # Parsing Tanggal & Waktu UTC
            match_date_str = ev.get('date')
            try:
                dt_obj = datetime.datetime.fromisoformat(match_date_str.replace('Z', '+00:00'))
            except Exception:
                dt_obj = timezone.now()

            # Ekstrak Odds Bandar DraftKings
            odds_list = comp.get('odds', [])
            avg_h, avg_d, avg_a = None, None, None
            avg_over_25, avg_under_25 = None, None

            if odds_list:
                main_odds = odds_list[0]
                ml = main_odds.get('moneyline', {})
                h_ml = ml.get('home', {}).get('close', {}).get('odds') or ml.get('home', {}).get('open', {}).get('odds')
                d_ml = ml.get('draw', {}).get('close', {}).get('odds') or ml.get('draw', {}).get('open', {}).get('odds')
                a_ml = ml.get('away', {}).get('close', {}).get('odds') or ml.get('away', {}).get('open', {}).get('odds')

                avg_h = american_to_decimal_odds(h_ml)
                avg_d = american_to_decimal_odds(d_ml)
                avg_a = american_to_decimal_odds(a_ml)

                # Total Over/Under (Line 2.5 atau fallback)
                totals = main_odds.get('total', {})
                over_info = totals.get('over', {})
                under_info = totals.get('under', {})
                o_ml = over_info.get('close', {}).get('odds') or over_info.get('open', {}).get('odds')
                u_ml = under_info.get('close', {}).get('odds') or under_info.get('open', {}).get('odds')

                avg_over_25 = american_to_decimal_odds(o_ml)
                avg_under_25 = american_to_decimal_odds(u_ml)

            # Fallback odds jika bandar belum merilis odds spesifik
            if not avg_h or not avg_d or not avg_a or avg_h <= 1.0 or avg_d <= 1.0 or avg_a <= 1.0:
                avg_h = 2.10
                avg_d = 3.35
                avg_a = 3.20

            if not avg_over_25 or not avg_under_25 or avg_over_25 <= 1.0 or avg_under_25 <= 1.0:
                avg_over_25 = 1.85
                avg_under_25 = 1.95

            ucl_matched_fixtures.append({
                'Date': dt_obj,
                'Div': 'UCL',
                'HomeTeam': db_home_team.name,
                'AwayTeam': db_away_team.name,
                'home_team_obj': db_home_team,
                'away_team_obj': db_away_team,
                'AvgH': avg_h,
                'AvgD': avg_d,
                'AvgA': avg_a,
                'Avg>2.5': avg_over_25,
                'Avg<2.5': avg_under_25,
            })

        self.stdout.write(f"\n[HASIL FILTER TIM] Memenuhi syarat 11 liga: {len(ucl_matched_fixtures)} laga | Dilewati: {len(skipped_matches)} laga.")
        if skipped_matches:
            self.stdout.write(self.style.NOTICE(f"  Contoh laga yang dilewati: {skipped_matches[0]}"))

        if not ucl_matched_fixtures:
            self.stdout.write(self.style.WARNING("Tidak ada jadwal fixture UCL antara tim 11 liga untuk rentang hari ini."))
            return

        # 4. Pipeline Feature Engineering Cerdas & Prediksi AI
        self.stdout.write(self.style.WARNING("\nMenghitung fitur statistik tim dan menjalankan model AI LightGBM + RL..."))
        df_ucl = pd.DataFrame(ucl_matched_fixtures)

        # Hitung fitur rolling dari riwayat laga domestik kedua tim di database
        for idx, row in df_ucl.iterrows():
            h_team = row['home_team_obj']
            a_team = row['away_team_obj']

            # 5 Laga terakhir tim kandang
            h_recent = MatchHistory.objects.filter(
                home_team=h_team
            ).order_by('-date')[:5]
            h_scored = [m.fthg for m in h_recent if m.fthg is not None]
            h_conceded = [m.ftag for m in h_recent if m.ftag is not None]

            # 5 Laga terakhir tim tandang
            a_recent = MatchHistory.objects.filter(
                away_team=a_team
            ).order_by('-date')[:5]
            a_scored = [m.ftag for m in a_recent if m.ftag is not None]
            a_conceded = [m.fthg for m in a_recent if m.fthg is not None]

            df_ucl.at[idx, 'rolling_goals_scored_home'] = np.mean(h_scored) if h_scored else 1.5
            df_ucl.at[idx, 'rolling_goals_conceded_home'] = np.mean(h_conceded) if h_conceded else 1.0
            df_ucl.at[idx, 'rolling_goals_scored_away'] = np.mean(a_scored) if a_scored else 1.2
            df_ucl.at[idx, 'rolling_goals_conceded_away'] = np.mean(a_conceded) if a_conceded else 1.2

        # Eksekusi AI Model LightGBM & RL Agent
        df_empty_hist = pd.DataFrame()
        _, df_predicted = run_ml_predictions_for_preview(df_empty_hist, df_ucl)

        # 5. Simpan / Perbarui ke Tabel UpcomingFixture
        created_count = 0
        updated_count = 0

        for idx, row in df_predicted.iterrows():
            match_dt = make_aware_dt(row['Date'])
            h_obj = row['home_team_obj']
            a_obj = row['away_team_obj']

            prob_h = float(row.get('prob_FTR_H') or 0.33)
            prob_d = float(row.get('prob_FTR_D') or 0.33)
            prob_a = float(row.get('prob_FTR_A') or 0.34)
            prob_o25 = float(row.get('prob_OU25_Yes') or 0.50)
            prob_u25 = 1.0 - prob_o25 if prob_o25 > 0 else 0.50

            has_v_ftr = bool(row.get('has_value_bet', False))
            rl_pick_ftr = row.get('rl_pick_ftr')
            rl_action_ftr = row.get('rl_action_ftr', 'Skip')
            rl_stake_ftr = float(row.get('rl_stake_ftr') or 0.0)

            has_v_ou = bool(row.get('has_value_bet_ou', False))
            rl_pick_ou = row.get('rl_pick_ou')
            rl_action_ou = row.get('rl_action_ou', 'Skip')
            rl_stake_ou = float(row.get('rl_stake_ou') or 0.0)

            # Bentuk extended features agar kompatibel penuh dengan modal UI web/mobile
            ext_feat = {
                'match_name': f"{h_obj.name} vs {a_obj.name}",
                'competition': 'UEFA Champions League',
                'h2h_home_wins': 0,
                'h2h_draws': 0,
                'h2h_away_wins': 0,
                'rolling_goals_scored_home': float(row.get('rolling_goals_scored_home') or 1.5),
                'rolling_goals_conceded_home': float(row.get('rolling_goals_conceded_home') or 1.0),
                'rolling_goals_scored_away': float(row.get('rolling_goals_scored_away') or 1.2),
                'rolling_goals_conceded_away': float(row.get('rolling_goals_conceded_away') or 1.2),
            }

            defaults = {
                'league': ucl_league,
                'avg_h': row['AvgH'],
                'avg_d': row['AvgD'],
                'avg_a': row['AvgA'],
                'avg_over_25': row['Avg>2.5'],
                'avg_under_25': row['Avg<2.5'],
                'prob_ftr_h': prob_h,
                'prob_ftr_d': prob_d,
                'prob_ftr_a': prob_a,
                'prob_ou25_over': prob_o25,
                'prob_ou25_under': prob_u25,
                'has_value_bet': has_v_ftr,
                'rl_pick_ftr': rl_pick_ftr,
                'rl_action_ftr': rl_action_ftr,
                'rl_stake_ftr': rl_stake_ftr,
                'has_value_bet_ou': has_v_ou,
                'rl_pick_ou': rl_pick_ou,
                'rl_action_ou': rl_action_ou,
                'rl_stake_ou': rl_stake_ou,
                'extended_features': clean_json_dict(ext_feat),
                'is_processed': True,
            }

            # Cek apakah jadwal sudah ada di tanggal yang sama (toleransi tanggal yang sama)
            existing = UpcomingFixture.objects.filter(
                date__date=match_dt.date(),
                home_team=h_obj,
                away_team=a_obj
            ).first()

            if existing:
                for k, v in defaults.items():
                    setattr(existing, k, v)
                existing.date = match_dt
                existing.save()
                updated_count += 1
            else:
                UpcomingFixture.objects.create(
                    date=match_dt,
                    home_team=h_obj,
                    away_team=a_obj,
                    **defaults
                )
                created_count += 1

            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {h_obj.name} vs {a_obj.name} ({match_dt.strftime('%d %b %H:%M UTC')}) | Pick: {rl_pick_ftr or '1X2'} | Prob: {prob_h:.2f}/{prob_d:.2f}/{prob_a:.2f}"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\n[SUKSES] Sinkronisasi UCL tuntas! {created_count} laga baru ditambahkan, {updated_count} diperbarui."
        ))

        # Bersihkan cache Django
        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass
