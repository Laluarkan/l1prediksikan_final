import datetime
import json
import logging
import math
import os
import re
import uuid
import urllib.request
import numpy as np
import pandas as pd
import pytz
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import models
from django.utils import timezone
from predictions.models import League, Team, UpcomingFixture, MatchHistory, ParlayTicket
from predictions.services import (
    LEAGUE_NAMES,
    clean_json_dict,
    extract_odds,
    make_aware_dt,
    run_feature_engineering_pipeline,
    run_ml_predictions_for_preview,
    build_and_save_parlays,
)
from src.enrichment.weather import build_weather_features

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
    "sporting cp": "Sp Lisbon",
    "sporting lisbon": "Sp Lisbon",
    "sporting": "Sp Lisbon",
    "sl benfica": "Benfica",
    "benfica": "Benfica",
    "fc porto": "Porto",
    "porto": "Porto",
    "braga": "Sp Braga",
    "sc braga": "Sp Braga",

    # Belgia (B1)
    "club brugge": "Club Brugge",
    "brugge": "Club Brugge",
    "union saint-gilloise": "St. Gilloise",
    "union sg": "St. Gilloise",
    "royal antwerp": "Antwerp",
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
    "trabzonspor": "Trabzonspor",
    "istanbul basaksehir": "Buyuksehyr",

    # Yunani (G1)
    "olympiacos": "Olympiakos",
    "olympiakos": "Olympiakos",
    "paok": "PAOK",
    "panathinaikos": "Panathinaikos",
    "aek athens": "AEK",
}


def american_to_decimal_odds(american_val):
    """Mengonversi American Odds (e.g. +400, -195, EVEN) ke Decimal Odds (e.g. 5.00, 1.51, 2.00)"""
    if american_val is None:
        return None
    try:
        val_str = str(american_val).strip().upper()
        if val_str in ('EVEN', 'EV'):
            return 2.00
        val_str = val_str.replace('+', '')
        num = float(val_str)
        if num == 0:
            return 1.0
        if num > 0:
            return round(1.0 + (num / 100.0), 2)
        else:
            return round(1.0 + (100.0 / abs(num)), 2)
    except Exception:
        return None


def _poisson_cdf(k, lam):
    return sum((lam ** i) * math.exp(-lam) / math.factorial(i) for i in range(k + 1))


def convert_ou_line_to_25(over_odds, under_odds, line):
    """
    Mengonversi odds Over/Under dari line selain 2.5 (misal 3.5 atau 4.5 di ESPN/DraftKings)
    menjadi odds ekuivalen pada garis standar 2.5 gol menggunakan distribusi Poisson.
    """
    if not over_odds or not under_odds or line is None:
        return over_odds, under_odds
    try:
        line_val = float(str(line).lower().replace('o', '').replace('u', '').strip())
        if abs(line_val - 2.5) < 0.1:
            return over_odds, under_odds
        k = int(math.floor(line_val))
        inv_o = 1.0 / over_odds
        inv_u = 1.0 / under_odds
        margin = inv_o + inv_u
        p_under_line = inv_u / margin

        low, high = 0.3, 6.8
        for _ in range(30):
            mid = (low + high) / 2.0
            if _poisson_cdf(k, mid) > p_under_line:
                low = mid
            else:
                high = mid
        lam = (low + high) / 2.0
        p_under_25 = max(0.08, min(0.92, _poisson_cdf(2, lam)))
        p_over_25 = 1.0 - p_under_25
        o25 = round(1.0 / (p_over_25 * margin), 2)
        u25 = round(1.0 / (p_under_25 * margin), 2)
        return max(1.12, o25), max(1.12, u25)
    except Exception:
        return over_odds, under_odds


def normalize_name(name):
    """Normalisasi nama tim untuk pencocokan toleran"""
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r'[\.\-\'\/\,]', ' ', n)
    n = re.sub(r'\b(fc|cf|sc|rc|afc|vfb|sv|as|ogc|losc|fk)\b', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()


def build_combined_ucl_round_parlays(df_ucl_predicted):
    """
    Di Liga Champions (UCL), satu putaran matchday selalu terbagi ke 2 hari (Selasa & Rabu).
    Jika satu hari hanya memiliki 5-7 pertandingan, maka kombinasi 8 Laga dan 10 Laga tidak akan
    terbentuk jika hanya dikelompokkan per satu tanggal.
    Fungsi ini memastikan kombinasi 6, 8, dan 10 Laga lintas hari dalam putaran UCL yang sama
    ikut dibuat apabila jumlah total pertandingan UCL di putaran tersebut mencukupi.
    """
    if df_ucl_predicted is None or df_ucl_predicted.empty:
        return

    candidates = []
    for idx, r in df_ucl_predicted.iterrows():
        odds = extract_odds(r)
        date_str = r['Date'].strftime('%Y-%m-%dT%H:%M:%S') if pd.notnull(r.get('Date')) else None

        prob_h = float(r.get('prob_FTR_H') or 0.0)
        prob_a = float(r.get('prob_FTR_A') or 0.0)
        prob_o25 = float(r.get('prob_OU25_Yes') or 0.5)
        prob_u25 = 1.0 - prob_o25 if prob_o25 > 0 else 0.5

        odds_h = float(odds.get('H') or 1.0)
        odds_a = float(odds.get('A') or 1.0)
        odds_o25 = float(odds.get('O25') or 1.0)
        odds_u25 = float(odds.get('U25') or 1.0)

        picks = []
        if prob_h >= 0.52 and 1.12 <= odds_h <= 2.60:
            edge = float(r.get('edge_ftr') or (prob_h - (1.0 / odds_h)))
            picks.append({'market': 'ftr', 'pick': 'H', 'odds': odds_h, 'prob': prob_h, 'edge': edge})
        if prob_a >= 0.52 and 1.12 <= odds_a <= 2.60:
            edge = float(r.get('edge_ftr') or (prob_a - (1.0 / odds_a)))
            picks.append({'market': 'ftr', 'pick': 'A', 'odds': odds_a, 'prob': prob_a, 'edge': edge})
        if prob_o25 >= 0.55 and 1.15 <= odds_o25 <= 2.40:
            edge = float(r.get('edge_ou') or (prob_o25 - (1.0 / odds_o25)))
            picks.append({'market': 'ou', 'pick': 'Over 2.5', 'odds': odds_o25, 'prob': prob_o25, 'edge': edge})
        if prob_u25 >= 0.55 and 1.15 <= odds_u25 <= 2.40:
            edge = float(r.get('edge_ou') or (prob_u25 - (1.0 / odds_u25)))
            picks.append({'market': 'ou', 'pick': 'Under 2.5', 'odds': odds_u25, 'prob': prob_u25, 'edge': edge})

        if not picks:
            m_ftr = 'H' if prob_h >= prob_a else 'A'
            p_ftr = max(prob_h, prob_a)
            o_ftr = odds_h if m_ftr == 'H' else odds_a
            m_ou = 'Over 2.5' if prob_o25 >= 0.5 else 'Under 2.5'
            p_ou = max(prob_o25, prob_u25)
            o_ou = odds_o25 if m_ou == 'Over 2.5' else odds_u25

            if p_ftr >= p_ou and o_ftr >= 1.12:
                picks.append({'market': 'ftr', 'pick': m_ftr, 'odds': o_ftr, 'prob': p_ftr, 'edge': p_ftr - (1.0 / o_ftr)})
            elif o_ou >= 1.12:
                picks.append({'market': 'ou', 'pick': m_ou, 'odds': o_ou, 'prob': p_ou, 'edge': p_ou - (1.0 / o_ou)})

        if picks:
            best_opt = max(picks, key=lambda x: (x['prob'] * 0.75 + max(0.0, x['edge']) * 0.25))
            score = best_opt['prob'] * 0.75 + max(0.0, best_opt['edge']) * 0.25
            candidates.append({
                'idx': idx,
                'match': f"{r['HomeTeam']} vs {r['AwayTeam']}",
                'match_name': f"{r['HomeTeam']} vs {r['AwayTeam']}",
                'home_team': r['HomeTeam'],
                'away_team': r['AwayTeam'],
                'league_code': 'UCL',
                'league_name': 'UEFA Champions League',
                'pick': best_opt['pick'],
                'odds': round(best_opt['odds'], 2),
                'prob': round(best_opt['prob'], 4),
                'date': date_str,
                'is_won': None,
                'score': score,
            })

    candidates.sort(key=lambda x: x['score'], reverse=True)
    n_c = len(candidates)
    if n_c < 2:
        return

    ucl_dates = sorted(df_ucl_predicted['Date'].dt.date.unique())
    anchor_date = ucl_dates[0]

    for tier in [6, 8, 10]:
        if n_c < tier:
            continue
        # Cek apakah sudah ada tiket tier ini pada tanggal-tanggal UCL tersebut
        existing_tier = ParlayTicket.objects.filter(
            is_historical=False,
            date__in=ucl_dates,
            ticket_id__icontains=f"PRLY-{tier}-F-"
        ).exists()
        if existing_tier:
            continue

        tier_legs = candidates[:tier]
        legs_odds = [l['odds'] for l in tier_legs]
        legs_prob = [l['prob'] for l in tier_legs]
        total_odds = float(np.prod(legs_odds)) if legs_odds else 1.0
        total_prob = float(np.prod(legs_prob)) if legs_prob else 0.5

        clean_legs = [{
            "match": l['match'],
            "match_name": l['match'],
            "home_team": l['home_team'],
            "away_team": l['away_team'],
            "league_code": "UCL",
            "league_name": "UEFA Champions League",
            "pick": l['pick'],
            "odds": l['odds'],
            "prob": l['prob'],
            "date": l['date'],
            "is_won": None,
        } for l in tier_legs]

        unique_hex = uuid.uuid4().hex[:6].upper()
        ticket_id = f"PRLY-{tier}-F-{anchor_date.strftime('%Y%m%d')}-{unique_hex}"

        ParlayTicket.objects.update_or_create(
            ticket_id=ticket_id,
            defaults={
                'date': anchor_date,
                'total_odds': round(total_odds, 4),
                'total_prob': round(total_prob, 6),
                'is_won': None,
                'is_historical': False,
                'legs_details': clean_legs,
            }
        )
        for l in tier_legs:
            idx = l['idx']
            df_ucl_predicted.at[idx, 'part_of_parlay'] = True
            cur_info = df_ucl_predicted.at[idx, 'parlay_ticket_info']
            df_ucl_predicted.at[idx, 'parlay_ticket_info'] = (
                ticket_id if pd.isna(cur_info) or not cur_info else f"{cur_info},{ticket_id}"
            )


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
        db_teams_qs = Team.objects.select_related('league').all()
        db_teams_map = {t.name.lower(): t for t in db_teams_qs}
        normalized_teams_map = {normalize_name(t.name): t for t in db_teams_qs}

        def find_db_team(espn_name):
            if not espn_name:
                return None
            clean_name = espn_name.strip()
            lower_name = clean_name.lower()

            if lower_name in UCL_TEAM_ALIASES:
                target_alias = UCL_TEAM_ALIASES[lower_name].lower()
                if target_alias in db_teams_map:
                    return db_teams_map[target_alias]

            if lower_name in db_teams_map:
                return db_teams_map[lower_name]

            norm = normalize_name(clean_name)
            if norm in normalized_teams_map:
                return normalized_teams_map[norm]

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
        team_obj_lookup = {}

        for ev in all_events:
            comps = ev.get('competitions', [])
            if not comps:
                continue
            comp = comps[0]

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

            if not db_home_team or not db_away_team:
                missing_info = []
                if not db_home_team:
                    missing_info.append(f"Home '{raw_home_name}'")
                if not db_away_team:
                    missing_info.append(f"Away '{raw_away_name}'")
                skipped_matches.append(f"{raw_home_name} vs {raw_away_name} (Di luar 11 liga: {', '.join(missing_info)})")
                continue

            team_obj_lookup[db_home_team.name] = db_home_team
            team_obj_lookup[db_away_team.name] = db_away_team

            match_date_str = ev.get('date')
            try:
                dt_obj = datetime.datetime.fromisoformat(match_date_str.replace('Z', '+00:00'))
            except Exception:
                dt_obj = timezone.now()

            # Ekstrak Odds Bandar DraftKings (Moneyline, Total Over/Under, & PointSpread/Asian Handicap)
            odds_list = comp.get('odds', [])
            avg_h, avg_d, avg_a = None, None, None
            open_h, open_d, open_a = None, None, None
            avg_over_25, avg_under_25 = None, None
            ah_line, ah_h, ah_a = None, None, None

            if odds_list:
                main_odds = odds_list[0]
                ml = main_odds.get('moneyline', {})
                h_close = ml.get('home', {}).get('close', {}).get('odds')
                h_open = ml.get('home', {}).get('open', {}).get('odds')
                d_close = ml.get('draw', {}).get('close', {}).get('odds')
                d_open = ml.get('draw', {}).get('open', {}).get('odds')
                a_close = ml.get('away', {}).get('close', {}).get('odds')
                a_open = ml.get('away', {}).get('open', {}).get('odds')

                avg_h = american_to_decimal_odds(h_close or h_open)
                avg_d = american_to_decimal_odds(d_close or d_open)
                avg_a = american_to_decimal_odds(a_close or a_open)
                open_h = american_to_decimal_odds(h_open or h_close)
                open_d = american_to_decimal_odds(d_open or d_close)
                open_a = american_to_decimal_odds(a_open or a_close)

                # Total Over/Under (konversi otomatis ke garis 2.5 gol jika ESPN menyajikan garis 3.5 atau 4.5)
                ou_line = main_odds.get('overUnder', 2.5)
                totals = main_odds.get('total', {})
                over_info = totals.get('over', {})
                under_info = totals.get('under', {})
                o_ml = over_info.get('close', {}).get('odds') or over_info.get('open', {}).get('odds')
                u_ml = under_info.get('close', {}).get('odds') or under_info.get('open', {}).get('odds')

                raw_over = american_to_decimal_odds(o_ml)
                raw_under = american_to_decimal_odds(u_ml)
                avg_over_25, avg_under_25 = convert_ou_line_to_25(raw_over, raw_under, ou_line)

                # Point Spread / Asian Handicap
                ps = main_odds.get('pointSpread', {})
                h_spread_str = ps.get('home', {}).get('close', {}).get('line') or ps.get('home', {}).get('open', {}).get('line')
                try:
                    if h_spread_str is not None:
                        ah_line = float(str(h_spread_str).replace('+', '').strip())
                except Exception:
                    ah_line = None
                ah_h = american_to_decimal_odds(ps.get('home', {}).get('close', {}).get('odds') or ps.get('home', {}).get('open', {}).get('odds'))
                ah_a = american_to_decimal_odds(ps.get('away', {}).get('close', {}).get('odds') or ps.get('away', {}).get('open', {}).get('odds'))

            if not avg_h or not avg_d or not avg_a or avg_h <= 1.0 or avg_d <= 1.0 or avg_a <= 1.0:
                avg_h, avg_d, avg_a = 2.10, 3.35, 3.20
            if not open_h or open_h <= 1.0:
                open_h, open_d, open_a = avg_h, avg_d, avg_a

            if not avg_over_25 or not avg_under_25 or avg_over_25 <= 1.0 or avg_under_25 <= 1.0:
                avg_over_25, avg_under_25 = 1.85, 1.95

            if ah_line is None:
                ah_line = -0.5 if avg_h < avg_a else 0.5
            if not ah_h or ah_h <= 1.0:
                ah_h = 1.90
            if not ah_a or ah_a <= 1.0:
                ah_a = 1.90

            # Isi lengkap seluruh kolom odds multi-bandar yang dibutuhkan oleh 140 fitur LightGBM
            ucl_matched_fixtures.append({
                'Date': dt_obj,
                'Div': 'UCL',
                'HomeTeam': db_home_team.name,
                'AwayTeam': db_away_team.name,
                'AvgH': avg_h, 'AvgD': avg_d, 'AvgA': avg_a,
                'AvgCH': avg_h, 'AvgCD': avg_d, 'AvgCA': avg_a,
                'B365H': open_h, 'B365D': open_d, 'B365A': open_a,
                'B365CH': avg_h, 'B365CD': avg_d, 'B365CA': avg_a,
                'BWH': avg_h, 'BWD': avg_d, 'BWA': avg_a,
                'IWH': avg_h, 'IWD': avg_d, 'IWA': avg_a,
                'PSH': open_h, 'PSD': open_d, 'PSA': open_a,
                'PSCH': avg_h, 'PSCD': avg_d, 'PSCA': avg_a,
                'WHH': avg_h, 'WHD': avg_d, 'WHA': avg_a,
                'MaxH': round(max(avg_h, open_h) * 1.03, 2),
                'MaxD': round(max(avg_d, open_d) * 1.03, 2),
                'MaxA': round(max(avg_a, open_a) * 1.03, 2),
                'MaxCH': round(avg_h * 1.03, 2),
                'MaxCD': round(avg_d * 1.03, 2),
                'MaxCA': round(avg_a * 1.03, 2),
                'BFH': avg_h, 'BFD': avg_d, 'BFA': avg_a,
                '1XBD': avg_d, '1XBA': avg_a,
                'BFEH': avg_h, 'BFED': avg_d, 'BFEA': avg_a,
                'BFDH': avg_h, 'BFDD': avg_d, 'BFDA': avg_a,
                'BMGMH': avg_h, 'BMGMD': avg_d, 'BMGMA': avg_a,
                'BVH': avg_h, 'BVD': avg_d, 'BVA': avg_a,
                'CLH': avg_h, 'CLD': avg_d, 'CLA': avg_a,
                'LBH': avg_h, 'LBD': avg_d, 'LBA': avg_a,
                'Avg>2.5': avg_over_25, 'Avg<2.5': avg_under_25,
                'AvgC>2.5': avg_over_25, 'AvgC<2.5': avg_under_25,
                'B365>2.5': avg_over_25, 'B365<2.5': avg_under_25,
                'B365C>2.5': avg_over_25, 'B365C<2.5': avg_under_25,
                'P>2.5': avg_over_25, 'P<2.5': avg_under_25,
                'PC>2.5': avg_over_25, 'PC<2.5': avg_under_25,
                'Max>2.5': round(avg_over_25 * 1.03, 2), 'Max<2.5': round(avg_under_25 * 1.03, 2),
                'MaxC>2.5': round(avg_over_25 * 1.03, 2), 'MaxC<2.5': round(avg_under_25 * 1.03, 2),
                'BFE>2.5': avg_over_25, 'BFE<2.5': avg_under_25,
                'AHh': ah_line, 'AHCh': ah_line,
                'B365AHH': ah_h, 'B365AHA': ah_a,
                'PAHH': ah_h, 'PAHA': ah_a,
                'MaxAHH': round(ah_h * 1.02, 2), 'MaxAHA': round(ah_a * 1.02, 2),
                'AvgAHH': ah_h, 'AvgAHA': ah_a,
                'AvgCAHH': ah_h, 'AvgCAHA': ah_a,
                'BFEAHH': ah_h, 'BFEAHA': ah_a,
                '_source': 'csv',
            })

        self.stdout.write(f"\n[HASIL FILTER TIM] Memenuhi syarat 11 liga: {len(ucl_matched_fixtures)} laga | Dilewati: {len(skipped_matches)} laga.")
        if skipped_matches:
            self.stdout.write(self.style.NOTICE(f"  Contoh laga yang dilewati: {skipped_matches[0]}"))

        if not ucl_matched_fixtures:
            self.stdout.write(self.style.WARNING("Tidak ada jadwal fixture UCL antara tim 11 liga untuk rentang hari ini."))
            return

        # 4. Pipeline Feature Engineering Lengkap (Menggabungkan Histori 11 Liga Domestik + Cuaca + ELO + Standings + Rolling)
        self.stdout.write(self.style.WARNING("\nMenghitung 140 fitur statistik tim dari riwayat liga domestik dan menjalankan model AI LightGBM + RL..."))
        df_ucl = pd.DataFrame(ucl_matched_fixtures)
        leagues_in_ucl = {t.league.code for t in team_obj_lookup.values() if t and t.league}

        # Ambil seluruh riwayat pertandingan dari liga-liga domestik terkait agar klasemen, ELO, dan rolling form akurat 100%
        hist_qs = MatchHistory.objects.filter(
            league__code__in=leagues_in_ucl
        ).values(
            'league__code', 'date', 'home_team__name', 'away_team__name',
            'fthg', 'ftag', 'ftr',
            'avg_h', 'avg_d', 'avg_a', 'avg_over_25', 'avg_under_25'
        )

        db_records = []
        for r in hist_qs.iterator(chunk_size=2000):
            db_records.append({
                'Div': r['league__code'],
                'Date': r['date'],
                'HomeTeam': r['home_team__name'],
                'AwayTeam': r['away_team__name'],
                'FTHG': r['fthg'],
                'FTAG': r['ftag'],
                'FTR': r['ftr'],
                'AvgH': r['avg_h'],
                'AvgD': r['avg_d'],
                'AvgA': r['avg_a'],
                'Avg>2.5': r['avg_over_25'],
                'Avg<2.5': r['avg_under_25'],
                '_source': 'db',
            })

        df_db = pd.DataFrame(db_records)
        if not df_db.empty:
            df_db['Date'] = pd.to_datetime(df_db['Date'], utc=True)
            df_combined = pd.concat([df_db, df_ucl]).drop_duplicates(
                subset=['Date', 'HomeTeam', 'AwayTeam'], keep='last'
            ).reset_index(drop=True)
        else:
            df_combined = df_ucl.copy()

        _, df_predicted = run_feature_engineering_pipeline(df_combined, upload_type='fixture', skip_weather=True)
        if not df_predicted.empty:
            df_predicted = build_weather_features(df_predicted, delay=0.1)
        _, df_predicted = run_ml_predictions_for_preview(pd.DataFrame(), df_predicted)

        # 5. Bangun Tiket Parlay Multi-Tier (2, 4, 6, 8, 10 Laga) untuk Jadwal UCL
        self.stdout.write(self.style.WARNING("\nMenyusun kombinasi Tiket Parlay AI (2, 4, 6, 8, 10 Laga) untuk jadwal UCL..."))
        build_and_save_parlays(pd.DataFrame(), df_predicted)
        build_combined_ucl_round_parlays(df_predicted)

        # 6. Simpan / Perbarui ke Tabel UpcomingFixture
        created_count = 0
        updated_count = 0

        for idx, row in df_predicted.iterrows():
            match_dt = make_aware_dt(row['Date'])
            h_obj = team_obj_lookup.get(row['HomeTeam']) or find_db_team(row['HomeTeam'])
            a_obj = team_obj_lookup.get(row['AwayTeam']) or find_db_team(row['AwayTeam'])
            if not h_obj or not a_obj:
                continue

            prob_h = float(row.get('prob_FTR_H') or 0.33)
            prob_d = float(row.get('prob_FTR_D') or 0.33)
            prob_a = float(row.get('prob_FTR_A') or 0.34)
            prob_o25 = float(row.get('prob_OU25_Yes') or 0.50)
            prob_u25 = 1.0 - prob_o25 if prob_o25 > 0 else 0.50

            has_v_ftr = bool(row.get('has_value_bet', False))
            rl_pick_ftr = row.get('rl_pick_ftr')
            if pd.isna(rl_pick_ftr) or str(rl_pick_ftr).lower() == 'nan':
                rl_pick_ftr = None
            rl_action_ftr = row.get('rl_action_ftr', 'Skip')
            rl_stake_ftr = float(row.get('rl_stake_ftr') or 0.0)

            has_v_ou = bool(row.get('has_value_bet_ou', False))
            rl_pick_ou = row.get('rl_pick_ou')
            if pd.isna(rl_pick_ou) or str(rl_pick_ou).lower() == 'nan':
                rl_pick_ou = None
            rl_action_ou = row.get('rl_action_ou', 'Skip')
            rl_stake_ou = float(row.get('rl_stake_ou') or 0.0)

            ext_feat = clean_json_dict(row.to_dict())
            ext_feat['match_name'] = f"{h_obj.name} vs {a_obj.name}"
            ext_feat['competition'] = 'UEFA Champions League'

            defaults = {
                'league': ucl_league,
                'avg_h': float(row['AvgH']),
                'avg_d': float(row['AvgD']),
                'avg_a': float(row['AvgA']),
                'avg_over_25': float(row['Avg>2.5']),
                'avg_under_25': float(row['Avg<2.5']),
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
                'part_of_parlay': bool(row.get('part_of_parlay', False)),
                'parlay_ticket_info': row.get('parlay_ticket_info') if pd.notna(row.get('parlay_ticket_info')) else None,
                'extended_features': ext_feat,
                'is_processed': True,
            }

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

            dom_ftr = ['H', 'D', 'A'][int(np.argmax([prob_h, prob_d, prob_a]))]
            dom_ou = 'Over 2.5' if prob_o25 >= 0.5 else 'Under 2.5'
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {h_obj.name} vs {a_obj.name} ({match_dt.strftime('%d %b %H:%M UTC')}) | "
                f"1X2: {dom_ftr} ({prob_h:.2f}/{prob_d:.2f}/{prob_a:.2f}) | "
                f"O/U: {dom_ou} ({prob_o25:.2f})"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\n[SUKSES] Sinkronisasi UCL tuntas! {created_count} laga baru ditambahkan, {updated_count} diperbarui."
        ))

        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass
