import datetime
import json
import logging
import math
import os
import re
import uuid
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import pandas as pd
import pytz
from django.conf import settings
from django.core.management import call_command
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

# Konfigurasi 3 Kompetisi Resmi Klub Eropa UEFA di ESPN API
UEFA_COMPETITIONS = {
    "UCL": {
        "name": "UEFA Champions League",
        "espn_slug": "uefa.champions",
        "country": "Eropa",
        "logo_url": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
    },
    "UEL": {
        "name": "UEFA Europa League",
        "espn_slug": "uefa.europa",
        "country": "Eropa",
        "logo_url": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
    },
    "UECL": {
        "name": "UEFA Conference League",
        "espn_slug": "uefa.europa.conf",
        "country": "Eropa",
        "logo_url": "https://a.espncdn.com/i/leaguelogos/soccer/500/20296.png",
    },
}

# Daftar hitam tim luar 11 liga yang namanya mirip substring tim 11 liga (mencegah false positive seperti Lillestrom -> Lille, Inter D'Escaldes -> Inter)
NON_11_LEAGUE_BLACKLIST = {
    "lillestrom",
    "lillestrøm",
    "inter d'escaldes",
    "inter descaldes",
    "inter turku",
    "inter miami",
    "arsenal tula",
    "dinamo zagreb",
    "slovan bratislava",
    "slavia prague",
    "sparta prague",
    "shakhtar donetsk",
    "bodo/glimt",
    "bodø/glimt",
    "lask linz",
    "viking fk",
    "sabah fk",
    "ferencvaros",
    "levski sofia",
    "omonia nicosia",
    "torreense",
    "sk sturm graz",
    "sturm graz",
    "nk celje",
    "rb salzburg",
    "red bull salzburg",
    "jagiellonia bialystok",
    "viktoria plzen",
    "hapoel be'er",
    "hapoel beer sheva",
    "lech poznan",
    "ararat-armenia",
    "fc lugano",
    "sk brann",
    "f.c. københavn",
    "fc copenhagen",
    "csu craiova",
    "mjällby aif",
    "hajduk split",
    "red star belgrade",
    "crvena zvezda",
    "riga fc",
    "fc thun",
    "borac banja luka",
    "lincoln red imps",
    "jablonec",
    "agf",
    "fc nordsjælland",
    "egnatia",
    "kairat almaty",
    "cska sofia",
    "iberia 1999",
    "pafos",
    "kups kuopio",
    "fc midtjylland",
    "kauno zalgiris",
}

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
    "afc bournemouth": "Bournemouth",
    "bournemouth": "Bournemouth",
    "crystal palace": "Crystal Palace",
    "sunderland": "Sunderland",
    "west ham united": "West Ham",
    "west ham": "West Ham",
    "fulham": "Fulham",
    "brentford": "Brentford",
    "everton": "Everton",
    "wolverhampton wanderers": "Wolves",
    "wolves": "Wolves",

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
    "celta vigo": "Celta",
    "rc celta": "Celta",
    "getafe": "Getafe",
    "rayo vallecano": "Vallecano",
    "mallorca": "Mallorca",
    "rcd mallorca": "Mallorca",
    "osasuna": "Osasuna",
    "ca osasuna": "Osasuna",
    "valencia": "Valencia",

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
    "vfl wolfsburg": "Wolfsburg",
    "sc freiburg": "Freiburg",
    "freiburg": "Freiburg",
    "tsg hoffenheim": "Hoffenheim",
    "hoffenheim": "Hoffenheim",
    "1. fsv mainz 05": "Mainz",
    "mainz": "Mainz",
    "1. fc union berlin": "Union Berlin",
    "union berlin": "Union Berlin",
    "werder bremen": "Werder Bremen",
    "1. fc heidenheim 1846": "Heidenheim",
    "heidenheim": "Heidenheim",

    # Italia (I1)
    "internazionale": "Inter",
    "inter milan": "Inter",
    "fc internazionale milano": "Inter",
    "inter": "Inter",
    "ac milan": "Milan",
    "milan": "Milan",
    "juventus": "Juventus",
    "atalanta": "Atalanta",
    "bologna": "Bologna",
    "as roma": "Roma",
    "roma": "Roma",
    "lazio": "Lazio",
    "ss lazio": "Lazio",
    "napoli": "Napoli",
    "ssc napoli": "Napoli",
    "fiorentina": "Fiorentina",
    "acf fiorentina": "Fiorentina",
    "como": "Como",
    "como 1907": "Como",
    "torino": "Torino",
    "udinese": "Udinese",

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
    "olympique de marseille": "Marseille",
    "lens": "Lens",
    "rc lens": "Lens",
    "stade rennais": "Rennes",
    "rennes": "Rennes",
    "strasbourg": "Strasbourg",
    "rc strasbourg alsace": "Strasbourg",
    "toulouse": "Toulouse",

    # Belanda (N1)
    "psv eindhoven": "PSV Eindhoven",
    "psv": "PSV Eindhoven",
    "feyenoord rotterdam": "Feyenoord",
    "feyenoord": "Feyenoord",
    "ajax": "Ajax",
    "ajax amsterdam": "Ajax",
    "az alkmaar": "AZ Alkmaar",
    "az": "AZ Alkmaar",
    "twente": "Twente",
    "fc twente": "Twente",
    "nec nijmegen": "Nijmegen",
    "nijmegen": "Nijmegen",
    "fc utrecht": "Utrecht",
    "utrecht": "Utrecht",
    "go ahead eagles": "Go Ahead Eagles",

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
    "vitoria de guimaraes": "Guimaraes",
    "vitória de guimarães": "Guimaraes",
    "guimaraes": "Guimaraes",

    # Belgia (B1)
    "club brugge": "Club Brugge",
    "brugge": "Club Brugge",
    "cercle brugge": "Cercle Brugge",
    "union saint-gilloise": "St. Gilloise",
    "union st.-gilloise": "St. Gilloise",
    "union sg": "St. Gilloise",
    "royal antwerp": "Antwerp",
    "antwerp": "Antwerp",
    "anderlecht": "Anderlecht",
    "rsc anderlecht": "Anderlecht",
    "gent": "Gent",
    "kaa gent": "Gent",
    "genk": "Genk",
    "krc genk": "Genk",
    "sint-truidense": "St Truiden",
    "st. truiden": "St Truiden",
    "standard liege": "Standard",

    # Skotlandia (SC0)
    "celtic": "Celtic",
    "rangers": "Rangers",
    "heart of midlothian": "Hearts",
    "hearts": "Hearts",
    "aberdeen": "Aberdeen",
    "hibernian": "Hibernian",
    "kilmarnock": "Kilmarnock",

    # Turki (T1)
    "galatasaray": "Galatasaray",
    "fenerbahce": "Fenerbahce",
    "fenerbahçe": "Fenerbahce",
    "besiktas": "Besiktas",
    "beşiktaş": "Besiktas",
    "trabzonspor": "Trabzonspor",
    "istanbul basaksehir": "Buyuksehyr",
    "basaksehir": "Buyuksehyr",

    # Yunani (G1)
    "olympiacos": "Olympiakos",
    "olympiakos": "Olympiakos",
    "paok": "PAOK",
    "paok salonika": "PAOK",
    "panathinaikos": "Panathinaikos",
    "aek athens": "AEK",
    "ofi crete": "OFI Crete",
    "aris": "Aris",
    "aris thessaloniki": "Aris",
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
    """Normalisasi nama tim untuk pencocokan presisi"""
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r'[\.\-\'\/\,]', ' ', n)
    n = re.sub(r'\b(fc|cf|sc|rc|afc|vfb|sv|as|ogc|losc|fk|kaa|tsg|nec|sl|rsc)\b', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()


def extract_espn_event_row(ev, comp_code, db_home_team, db_away_team, is_finished=False):
    """Mengekstrak satu baris DataFrame (140 fitur kompatibel) dari event JSON ESPN"""
    comp = ev['competitions'][0]
    competitors = comp.get('competitors', [])
    home_comp = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
    away_comp = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

    match_date_str = ev.get('date')
    try:
        dt_obj = datetime.datetime.fromisoformat(match_date_str.replace('Z', '+00:00'))
    except Exception:
        dt_obj = timezone.now()

    fthg, ftag, ftr = np.nan, np.nan, np.nan
    if is_finished:
        try:
            fthg = int(float(home_comp.get('score', 0)))
            ftag = int(float(away_comp.get('score', 0)))
            ftr = 'H' if fthg > ftag else ('A' if fthg < ftag else 'D')
        except Exception:
            fthg, ftag, ftr = np.nan, np.nan, np.nan

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

        if not d_close and not d_open:
            d_close = main_odds.get('drawOdds', {}).get('moneyLine')

        avg_h = american_to_decimal_odds(h_close or h_open)
        avg_d = american_to_decimal_odds(d_close or d_open)
        avg_a = american_to_decimal_odds(a_close or a_open)
        open_h = american_to_decimal_odds(h_open or h_close)
        open_d = american_to_decimal_odds(d_open or d_close)
        open_a = american_to_decimal_odds(a_open or a_close)

        ou_line = main_odds.get('overUnder', 2.5)
        totals = main_odds.get('total', {})
        over_info = totals.get('over', {})
        under_info = totals.get('under', {})
        o_ml = over_info.get('close', {}).get('odds') or over_info.get('open', {}).get('odds')
        u_ml = under_info.get('close', {}).get('odds') or under_info.get('open', {}).get('odds')

        raw_over = american_to_decimal_odds(o_ml)
        raw_under = american_to_decimal_odds(u_ml)
        avg_over_25, avg_under_25 = convert_ou_line_to_25(raw_over, raw_under, ou_line)

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

    return {
        'Date': dt_obj,
        'Div': comp_code,
        'HomeTeam': db_home_team.name,
        'AwayTeam': db_away_team.name,
        'FTHG': fthg,
        'FTAG': ftag,
        'FTR': ftr,
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
    }


def build_combined_ucl_round_parlays(df_ucl_predicted):
    """
    Memastikan kombinasi 6, 8, dan 10 Laga lintas hari dalam putaran pekan Eropa (Selasa-Kamis: UCL, UEL, UECL)
    ikut terbentuk apabila jumlah total pertandingan pekan Eropa tersebut mencukupi.
    """
    if df_ucl_predicted is None or df_ucl_predicted.empty:
        return

    candidates = []
    for idx, r in df_ucl_predicted.iterrows():
        odds = extract_odds(r)
        date_str = r['Date'].strftime('%Y-%m-%dT%H:%M:%S') if pd.notnull(r.get('Date')) else None
        div_code = str(r.get('Div') or 'UCL')
        comp_name = UEFA_COMPETITIONS.get(div_code, {}).get('name', 'UEFA Champions League')

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
                'league_code': div_code,
                'league_name': comp_name,
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

    for tier in [4, 6, 8, 10]:
        if n_c < tier:
            continue
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
            "league_code": l['league_code'],
            "league_name": l['league_name'],
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
    help = 'Menarik data History (sejak awal musim) & Fixture mendatang untuk UCL, UEL, dan UECL dari ESPN API (khusus tim 11 liga)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=10,
            help='Jumlah hari ke depan untuk mencari jadwal fixture UCL/UEL/UECL (default: 10 hari)',
        )
        parser.add_argument(
            '--history-days',
            type=int,
            default=14,
            help='Jumlah hari ke belakang untuk sinkronisasi rutin hasil pertandingan (default: 14 hari; otomatis awal musim jika DB belum lengkap)',
        )
        parser.add_argument(
            '--full-season',
            action='store_true',
            help='Paksa tarik seluruh riwayat pertandingan UCL/UEL/UECL sejak awal musim (September)',
        )

    def handle(self, *args, **options):
        days_ahead = options.get('days') or 10
        history_days = options.get('history_days') or 14
        force_full_season = bool(options.get('full_season'))

        self.stdout.write(self.style.WARNING(
            f"=== Memulai Sinkronisasi Kompetisi Eropa UEFA (UCL, UEL, UECL) | History & {days_ahead} Hari ke Depan ==="
        ))

        # 1. Pastikan Entitas Liga UCL, UEL, dan UECL ada di Database
        league_objs = {}
        for code, meta in UEFA_COMPETITIONS.items():
            lg_obj, _ = League.objects.update_or_create(
                code=code,
                defaults={
                    "name": meta["name"],
                    "country": meta["country"],
                    "logo_url": meta["logo_url"],
                }
            )
            league_objs[code] = lg_obj

        # Siapkan kamus nama tim di database untuk pencarian cepat & aman dari false-positive
        db_teams_qs = Team.objects.select_related('league').all()
        db_teams_map = {t.name.lower(): t for t in db_teams_qs}
        normalized_teams_map = {normalize_name(t.name): t for t in db_teams_qs}

        def find_db_team(espn_name):
            if not espn_name:
                return None
            clean_name = espn_name.strip()
            lower_name = clean_name.lower()

            if lower_name in NON_11_LEAGUE_BLACKLIST:
                return None

            if lower_name in UCL_TEAM_ALIASES:
                target_alias = UCL_TEAM_ALIASES[lower_name].lower()
                if target_alias in db_teams_map:
                    return db_teams_map[target_alias]

            if lower_name in db_teams_map:
                return db_teams_map[lower_name]

            norm = normalize_name(clean_name)
            if norm in NON_11_LEAGUE_BLACKLIST:
                return None
            if norm in UCL_TEAM_ALIASES:
                target_alias = UCL_TEAM_ALIASES[norm].lower()
                if target_alias in db_teams_map:
                    return db_teams_map[target_alias]
            if norm in normalized_teams_map:
                return normalized_teams_map[norm]

            # Pencocokan berbasis kata utuh (token-level), bukan raw substring agar Lillestrom != Lille
            norm_tokens = set(norm.split())
            for db_n, team_obj in db_teams_map.items():
                if len(db_n) >= 5 and db_n in norm_tokens:
                    return team_obj

            return None

        # 2. Tentukan Tanggal Penarikan (Sejak Awal Musim jika History Kosong, atau history_days s/d days_ahead)
        today = datetime.date.today()
        season_start_year = today.year if today.month >= 7 else today.year - 1
        season_start_date = datetime.date(season_start_year, 9, 1)

        existing_uefa_hist_count = MatchHistory.objects.filter(league__code__in=['UCL', 'UEL', 'UECL']).count()
        need_full_backfill = force_full_season or (existing_uefa_hist_count < 15)

        if need_full_backfill:
            self.stdout.write(self.style.WARNING(
                f"  -> Menarik riwayat penuh sejak awal musim ({season_start_date}) untuk UCL, UEL, dan UECL..."
            ))
            past_dates = []
            d_cur = season_start_date
            while d_cur < today:
                # Laga Eropa (UCL/UEL/UECL) dimainkan pada Selasa (1), Rabu (2), dan Kamis (3)
                if d_cur.weekday() in (1, 2, 3):
                    past_dates.append(d_cur)
                d_cur += datetime.timedelta(days=1)
        else:
            past_dates = [today - datetime.timedelta(days=i) for i in range(history_days, 0, -1)]

        future_dates = [today + datetime.timedelta(days=i) for i in range(0, days_ahead + 1)]
        all_target_dates = sorted(set(past_dates + future_dates))

        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

        def fetch_espn_day(args):
            comp_code, espn_slug, d_obj = args
            d_str = d_obj.strftime('%Y%m%d')
            url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{espn_slug}/scoreboard?dates={d_str}"
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=12) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    return comp_code, data.get('events', [])
            except Exception:
                return comp_code, []

        tasks = [
            (code, meta["espn_slug"], d_obj)
            for code, meta in UEFA_COMPETITIONS.items()
            for d_obj in all_target_dates
        ]

        raw_events_by_comp = {code: [] for code in UEFA_COMPETITIONS}
        seen_event_ids = set()

        with ThreadPoolExecutor(max_workers=10) as executor:
            for comp_code, events in executor.map(fetch_espn_day, tasks):
                for ev in events:
                    eid = ev.get('id')
                    if eid and eid not in seen_event_ids:
                        seen_event_ids.add(eid)
                        raw_events_by_comp[comp_code].append(ev)

        for code in UEFA_COMPETITIONS:
            self.stdout.write(f"  -> [{code}] Ditemukan total {len(raw_events_by_comp[code])} event dari ESPN.")

        # 3. Pilah menjadi History (Selesai/Post) dan Upcoming Fixtures (Pre), Filter HANYA Tim 11 Liga
        history_rows = []
        fixture_rows = []
        skipped_count = 0
        team_obj_lookup = {}

        for comp_code, events in raw_events_by_comp.items():
            for ev in events:
                comps = ev.get('competitions', [])
                if not comps:
                    continue
                comp = comps[0]
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
                    skipped_count += 1
                    continue

                team_obj_lookup[db_home_team.name] = db_home_team
                team_obj_lookup[db_away_team.name] = db_away_team

                status_type = ev.get('status', {}).get('type', {}).get('state', '').lower()
                is_finished = status_type in ('post', 'final')

                row_dict = extract_espn_event_row(ev, comp_code, db_home_team, db_away_team, is_finished=is_finished)
                if is_finished and pd.notna(row_dict['FTHG']) and pd.notna(row_dict['FTAG']):
                    history_rows.append(row_dict)
                elif not is_finished:
                    fixture_rows.append(row_dict)

        self.stdout.write(
            f"\n[HASIL FILTER 11 LIGA] Riwayat Selesai: {len(history_rows)} laga | "
            f"Jadwal Mendatang: {len(fixture_rows)} laga | Dilewati (tim luar 11 liga): {skipped_count} laga."
        )

        if not history_rows and not fixture_rows:
            self.stdout.write(self.style.WARNING("Tidak ada data pertandingan baru untuk diproses."))
            return

        # 4. Ambil Riwayat Domestik dari Database untuk Feature Engineering (140 Fitur)
        leagues_involved = {t.league.code for t in team_obj_lookup.values() if t and t.league}
        hist_qs = MatchHistory.objects.filter(
            league__code__in=leagues_involved
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

        # =========================================================================
        # 5A. PROSES & SIMPAN RIWAYAT PERTANDINGAN (MATCH HISTORY UCL/UEL/UECL)
        # =========================================================================
        hist_created = 0
        hist_updated = 0
        if history_rows:
            self.stdout.write(self.style.WARNING(f"\nMemproses {len(history_rows)} riwayat pertandingan UCL/UEL/UECL ke MatchHistory..."))
            df_uefa_hist_raw = pd.DataFrame(history_rows)
            if not df_db.empty:
                df_comb_hist = pd.concat([df_db, df_uefa_hist_raw]).drop_duplicates(
                    subset=['Date', 'HomeTeam', 'AwayTeam'], keep='last'
                ).reset_index(drop=True)
            else:
                df_comb_hist = df_uefa_hist_raw.copy()

            df_hist_pred, _ = run_feature_engineering_pipeline(df_comb_hist, upload_type='history', skip_weather=True)
            df_hist_pred, _ = run_ml_predictions_for_preview(df_hist_pred, pd.DataFrame())

            # Bangun tiket parlay historis untuk tanggal-tanggal riwayat Eropa yang belum punya parlay
            build_and_save_parlays(df_hist_pred, pd.DataFrame())

            for _, row in df_hist_pred.iterrows():
                comp_code = str(row.get('Div') or 'UCL')
                if comp_code not in league_objs:
                    continue
                lg_obj = league_objs[comp_code]
                match_dt = make_aware_dt(row['Date'])
                h_obj = team_obj_lookup.get(row['HomeTeam']) or find_db_team(row['HomeTeam'])
                a_obj = team_obj_lookup.get(row['AwayTeam']) or find_db_team(row['AwayTeam'])
                if not h_obj or not a_obj or pd.isna(row.get('FTHG')) or pd.isna(row.get('FTAG')):
                    continue

                fthg_val = int(row['FTHG'])
                ftag_val = int(row['FTAG'])
                ftr_val = 'H' if fthg_val > ftag_val else ('A' if fthg_val < ftag_val else 'D')

                # Cek apakah pertandingan ini sebelumnya ada di UpcomingFixture (jika ya, gunakan probabilitas pra-laga & hapus dari UpcomingFixture)
                prev_fix = UpcomingFixture.objects.filter(
                    date__date=match_dt.date(),
                    home_team=h_obj,
                    away_team=a_obj
                ).first()

                if prev_fix:
                    prob_h = float(prev_fix.prob_ftr_h or row.get('prob_FTR_H') or 0.33)
                    prob_d = float(prev_fix.prob_ftr_d or row.get('prob_FTR_D') or 0.33)
                    prob_a = float(prev_fix.prob_ftr_a or row.get('prob_FTR_A') or 0.34)
                    prob_o25 = float(prev_fix.prob_ou25_over or row.get('prob_OU25_Yes') or 0.50)
                else:
                    prob_h = float(row.get('prob_FTR_H') or 0.33)
                    prob_d = float(row.get('prob_FTR_D') or 0.33)
                    prob_a = float(row.get('prob_FTR_A') or 0.34)
                    prob_o25 = float(row.get('prob_OU25_Yes') or 0.50)

                prob_u25 = 1.0 - prob_o25 if prob_o25 > 0 else 0.50
                dom_ftr = ['H', 'D', 'A'][int(np.argmax([prob_h, prob_d, prob_a]))]
                dom_ou = 'Over 2.5' if prob_o25 >= 0.5 else 'Under 2.5'
                actual_ou = 'Over 2.5' if (fthg_val + ftag_val) > 2.5 else 'Under 2.5'

                is_won_ftr = (dom_ftr == ftr_val)
                is_won_ou = (dom_ou == actual_ou)

                has_v_ftr = bool(prev_fix.has_value_bet if prev_fix else row.get('has_value_bet', False))
                rl_pick_ftr = (prev_fix.rl_pick_ftr if prev_fix else row.get('rl_pick_ftr'))
                if pd.isna(rl_pick_ftr) or str(rl_pick_ftr).lower() == 'nan':
                    rl_pick_ftr = None
                rl_action_ftr = (prev_fix.rl_action_ftr if prev_fix else row.get('rl_action_ftr', 'Skip')) or 'Skip'
                rl_stake_ftr = float((prev_fix.rl_stake_ftr if prev_fix else row.get('rl_stake_ftr')) or 0.0)

                has_v_ou = bool(prev_fix.has_value_bet_ou if prev_fix else row.get('has_value_bet_ou', False))
                rl_pick_ou = (prev_fix.rl_pick_ou if prev_fix else row.get('rl_pick_ou'))
                if pd.isna(rl_pick_ou) or str(rl_pick_ou).lower() == 'nan':
                    rl_pick_ou = None
                rl_action_ou = (prev_fix.rl_action_ou if prev_fix else row.get('rl_action_ou', 'Skip')) or 'Skip'
                rl_stake_ou = float((prev_fix.rl_stake_ou if prev_fix else row.get('rl_stake_ou')) or 0.0)

                ext_feat = clean_json_dict(row.to_dict())
                ext_feat['match_name'] = f"{h_obj.name} vs {a_obj.name}"
                ext_feat['competition'] = lg_obj.name
                ext_feat['FTHG'] = fthg_val
                ext_feat['FTAG'] = ftag_val
                ext_feat['FTR'] = ftr_val

                hist_defaults = {
                    'league': lg_obj,
                    'fthg': fthg_val,
                    'ftag': ftag_val,
                    'ftr': ftr_val,
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
                    'is_won_ftr': is_won_ftr,
                    'has_value_bet_ou': has_v_ou,
                    'rl_pick_ou': rl_pick_ou,
                    'rl_action_ou': rl_action_ou,
                    'rl_stake_ou': rl_stake_ou,
                    'is_won_ou': is_won_ou,
                    'part_of_parlay': bool(prev_fix.part_of_parlay if prev_fix else row.get('part_of_parlay', False)),
                    'parlay_ticket_info': (prev_fix.parlay_ticket_info if prev_fix else row.get('parlay_ticket_info')),
                    'extended_features': ext_feat,
                }

                existing_hist = MatchHistory.objects.filter(
                    date__date=match_dt.date(),
                    home_team=h_obj,
                    away_team=a_obj
                ).first()

                if existing_hist:
                    for k, v in hist_defaults.items():
                        setattr(existing_hist, k, v)
                    existing_hist.date = match_dt
                    existing_hist.save()
                    hist_updated += 1
                else:
                    MatchHistory.objects.create(
                        date=match_dt,
                        home_team=h_obj,
                        away_team=a_obj,
                        **hist_defaults
                    )
                    hist_created += 1

                if prev_fix:
                    prev_fix.delete()

            self.stdout.write(self.style.SUCCESS(
                f"  ✓ [HISTORY UEFA] {hist_created} riwayat baru disimpan, {hist_updated} diperbarui ke MatchHistory."
            ))

        # =========================================================================
        # 5B. PROSES & SIMPAN JADWAL MENDATANG (UPCOMING FIXTURES UCL/UEL/UECL)
        # =========================================================================
        fix_created = 0
        fix_updated = 0
        if fixture_rows:
            self.stdout.write(self.style.WARNING(f"\nMenghitung 140 fitur & memprediksi {len(fixture_rows)} jadwal mendatang UCL/UEL/UECL..."))
            df_uefa_fix_raw = pd.DataFrame(fixture_rows)
            if not df_db.empty:
                df_comb_fix = pd.concat([df_db, df_uefa_fix_raw]).drop_duplicates(
                    subset=['Date', 'HomeTeam', 'AwayTeam'], keep='last'
                ).reset_index(drop=True)
            else:
                df_comb_fix = df_uefa_fix_raw.copy()

            _, df_predicted = run_feature_engineering_pipeline(df_comb_fix, upload_type='fixture', skip_weather=True)
            if not df_predicted.empty:
                df_predicted = build_weather_features(df_predicted, delay=0.1)
            _, df_predicted = run_ml_predictions_for_preview(pd.DataFrame(), df_predicted)

            self.stdout.write(self.style.WARNING("Menyusun kombinasi Tiket Parlay AI (2, 4, 6, 8, 10 Laga) untuk jadwal Eropa..."))
            build_and_save_parlays(pd.DataFrame(), df_predicted)
            build_combined_ucl_round_parlays(df_predicted)

            for _, row in df_predicted.iterrows():
                comp_code = str(row.get('Div') or 'UCL')
                if comp_code not in league_objs:
                    continue
                lg_obj = league_objs[comp_code]
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
                ext_feat['competition'] = lg_obj.name

                defaults = {
                    'league': lg_obj,
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
                    fix_updated += 1
                else:
                    UpcomingFixture.objects.create(
                        date=match_dt,
                        home_team=h_obj,
                        away_team=a_obj,
                        **defaults
                    )
                    fix_created += 1

                dom_ftr = ['H', 'D', 'A'][int(np.argmax([prob_h, prob_d, prob_a]))]
                dom_ou = 'Over 2.5' if prob_o25 >= 0.5 else 'Under 2.5'
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ [{comp_code}] {h_obj.name} vs {a_obj.name} ({match_dt.strftime('%d %b %H:%M UTC')}) | "
                    f"1X2: {dom_ftr} ({prob_h:.2f}/{prob_d:.2f}/{prob_a:.2f}) | O/U: {dom_ou} ({prob_o25:.2f})"
                ))

        # 6. Evaluasi tiket parlay yang pertandingannya sudah selesai
        try:
            call_command('update_parlay')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  [Info] Evaluasi parlay: {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"\n[SUKSES] Sinkronisasi UEFA (UCL, UEL, UECL) Tuntas! "
            f"History: +{hist_created} baru ({hist_updated} update) | "
            f"Fixture: +{fix_created} baru ({fix_updated} update)."
        ))

        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass
