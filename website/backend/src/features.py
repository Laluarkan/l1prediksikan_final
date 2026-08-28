import numpy as np
import pandas as pd
from src.enrichment.standings import STANDINGS_FEATURES
from src.enrichment.weather import WEATHER_FEATURES

ODDS_FEATURES = [
    'ip_B365_H','ip_B365_D','ip_B365_A',
    'ip_PS_H','ip_PS_D','ip_PS_A',
    'ip_Max_H','ip_Max_D','ip_Max_A',
    'ip_Avg_H','ip_Avg_D','ip_Avg_A',
    'norm_Avg_H','norm_Avg_D','norm_Avg_A',
    'margin_B365','margin_PS','margin_Max','margin_Avg',
    'consensus_std_H','consensus_std_D','consensus_std_A',
    'market_uncertainty',
    'home_dominance','home_away_ratio','draw_tendency',
    'max_team_prob','prob_spread',
    'ip_ou_B365_over','ip_ou_Avg_over','ip_ou_Max_over',
    'ip_ou_B365_under','ip_ou_Avg_under',
    'ip_ou_AvgC_over','ip_ou_AvgC_under',
    'ip_ou_MaxC_over','ip_ou_MaxC_under',
    'consensus_over_prob','consensus_over_std',
    'ou_drift_over','ou_drift_under','ou_drift_magnitude','ou_drift_direction',
    'ou_opening_closing_gap','ou_market_margin','closing_consensus_over',
    'ah_line','ah_line_abs','home_stronger',
    'ip_ah_Avg_home','ip_ah_Avg_away','closing_ah_balance',
    'drift_B365_H','drift_B365_D','drift_B365_A',
    'drift_PS_H','drift_PS_D','drift_PS_A',
    'btts_ou_ah_interaction','btts_draw_proxy',
    'btts_closing_draw_interaction','team_prob_product',
]

LEAGUE_FEATURES = ['Div', 'season_num']

ROLLING_FEATURES = [
    'home_avg_scored','home_avg_conceded','home_win_rate',
    'home_over_rate','home_btts_rate',
    'away_avg_scored','away_avg_conceded','away_win_rate',
    'away_over_rate','away_btts_rate',
    'h2h_home_wins','h2h_away_wins','h2h_draws','h2h_avg_goals',
    'attack_vs_defense_home','attack_vs_defense_away',
    'expected_goals_proxy','form_diff',
    'home_clean_sheet_rate','home_failed_to_score_rate',
    'away_clean_sheet_rate','away_failed_to_score_rate',
    'btts_mutually_expected',
]

ELO_FEATURES = [
    'elo_home','elo_away','elo_diff',
    'elo_prob_home','elo_prob_away',
    'elo_expected_diff',
    'elo_home_form','elo_away_form',
]

FEATURE_COLS_BASE = ODDS_FEATURES + LEAGUE_FEATURES
FEATURE_COLS_FULL = (ODDS_FEATURES + LEAGUE_FEATURES + ROLLING_FEATURES +
                     ELO_FEATURES + STANDINGS_FEATURES + WEATHER_FEATURES)


def _safe_div(num, den, fill=np.nan):
    if isinstance(den, pd.Series):
        den = pd.to_numeric(den, errors='coerce')
    if isinstance(num, pd.Series):
        num = pd.to_numeric(num, errors='coerce')
    with np.errstate(divide='ignore', invalid='ignore'):
        r = num / den
    if isinstance(r, pd.Series):
        return r.replace([np.inf, -np.inf], fill)
    return fill if np.isinf(r) else r


def build_elo_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').reset_index(drop=True)

    for col in ELO_FEATURES:
        df[col] = np.nan

    elo_ratings = {}
    elo_history = {}
    team_last_season = {}

    K = 20.0
    HOME_ADV = 100.0
    INIT_ELO = 1500.0
    DECAY = 0.90 # Diperbarui dari 0.70 agar tim raksasa tetap dominan di awal musim

    for idx, row in df.iterrows():
        home = row['HomeTeam']
        away = row['AwayTeam']
        season = str(row.get('Season', ''))

        if not home or not away:
            continue

        if home_team := (home not in elo_ratings):
            elo_ratings[home] = INIT_ELO
            elo_history[home] = []
        if away_team := (away not in elo_ratings):
            elo_ratings[away] = INIT_ELO
            elo_history[away] = []

        if home in team_last_season and team_last_season[home] != season:
            elo_ratings[home] = INIT_ELO * (1.0 - DECAY) + elo_ratings[home] * DECAY
        if away in team_last_season and team_last_season[away] != season:
            elo_ratings[away] = INIT_ELO * (1.0 - DECAY) + elo_ratings[away] * DECAY

        team_last_season[home] = season
        team_last_season[away] = season

        r_h = elo_ratings[home]
        r_a = elo_ratings[away]

        df.at[idx, 'elo_home'] = r_h
        df.at[idx, 'elo_away'] = r_a
        df.at[idx, 'elo_diff'] = r_h - r_a

        exp_h = 1.0 / (1.0 + 10.0 ** ((r_a - (r_h + HOME_ADV)) / 400.0))
        exp_a = 1.0 / (1.0 + 10.0 ** (((r_h + HOME_ADV) - r_a) / 400.0))

        df.at[idx, 'elo_prob_home'] = exp_h
        df.at[idx, 'elo_prob_away'] = exp_a
        df.at[idx, 'elo_expected_diff'] = exp_h - exp_a

        h_hist = elo_history[home][-5:]
        a_hist = elo_history[away][-5:]
        df.at[idx, 'elo_home_form'] = np.mean(h_hist) if h_hist else r_h
        df.at[idx, 'elo_away_form'] = np.mean(a_hist) if a_hist else r_a

        ftr = row.get('FTR', '')
        if ftr == 'H':
            w_h, w_a = 1.0, 0.0
        elif ftr == 'A':
            w_h, w_a = 0.0, 1.0
        elif ftr == 'D':
            w_h, w_a = 0.5, 0.5
        else:
            continue

        elo_history[home].append(r_h)
        elo_history[away].append(r_a)

        elo_ratings[home] = r_h + K * (w_h - exp_h)
        elo_ratings[away] = r_a + K * (w_a - exp_a)

    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for pfx in ['B365','BW','PS']:
        h, d, a = f'{pfx}H', f'{pfx}D', f'{pfx}A'
        if all(c in df.columns for c in [h, d, a]):
            df[f'ip_{pfx}_H'] = _safe_div(1, df[h])
            df[f'ip_{pfx}_D'] = _safe_div(1, df[d])
            df[f'ip_{pfx}_A'] = _safe_div(1, df[a])
            df[f'margin_{pfx}'] = df[f'ip_{pfx}_H'] + df[f'ip_{pfx}_D'] + df[f'ip_{pfx}_A'] - 1

    for out in ['H','D','A']:
        if f'Max{out}' in df.columns:
            df[f'ip_Max_{out}'] = _safe_div(1, df[f'Max{out}'])
        if f'Avg{out}' in df.columns:
            df[f'ip_Avg_{out}'] = _safe_div(1, df[f'Avg{out}'])

    for pfx in ['B365','BW','PS','Max','Avg']:
        cols = [f'ip_{pfx}_H', f'ip_{pfx}_D', f'ip_{pfx}_A']
        if all(c in df.columns for c in cols):
            total = df[cols].sum(axis=1)
            for out in ['H','D','A']:
                df[f'norm_{pfx}_{out}'] = df[f'ip_{pfx}_{out}'] / total

    ip_H = [c for c in df.columns if c.startswith('ip_') and c.endswith('_H')]
    ip_D = [c for c in df.columns if c.startswith('ip_') and c.endswith('_D')]
    ip_A = [c for c in df.columns if c.startswith('ip_') and c.endswith('_A')]
    if ip_H:
        df['consensus_std_H'] = df[ip_H].std(axis=1)
        df['consensus_std_D'] = df[ip_D].std(axis=1)
        df['consensus_std_A'] = df[ip_A].std(axis=1)
        df['market_uncertainty'] = df['consensus_std_H'] + df['consensus_std_D'] + df['consensus_std_A']

    if 'ip_Avg_H' in df.columns and 'ip_Avg_A' in df.columns:
        df['home_dominance']  = df['ip_Avg_H'] - df['ip_Avg_A']
        df['home_away_ratio'] = df['ip_Avg_H'] / (df['ip_Avg_A'] + 1e-9)
        df['draw_tendency']   = df['ip_Avg_D'] / (df['ip_Avg_H'] + df['ip_Avg_A'] + 1e-9)
        df['max_team_prob']   = df[['ip_Avg_H','ip_Avg_D','ip_Avg_A']].max(axis=1)
        df['prob_spread']     = df['max_team_prob'] - df[['ip_Avg_H','ip_Avg_D','ip_Avg_A']].min(axis=1)

    for over_col, under_col, pfx in [
        ('B365>2.5','B365<2.5','B365'),
        ('Avg>2.5','Avg<2.5','Avg'),
        ('Max>2.5','Max<2.5','Max'),
    ]:
        if over_col in df.columns and under_col in df.columns:
            df[f'ip_ou_{pfx}_over']  = _safe_div(1, df[over_col])
            df[f'ip_ou_{pfx}_under'] = _safe_div(1, df[under_col])
            df[f'ou_margin_{pfx}']   = df[f'ip_ou_{pfx}_over'] + df[f'ip_ou_{pfx}_under'] - 1

    for over_col, under_col, pfx in [
        ('AvgC>2.5','AvgC<2.5','AvgC'),
        ('MaxC>2.5','MaxC<2.5','MaxC'),
    ]:
        if over_col in df.columns and under_col in df.columns:
            df[f'ip_ou_{pfx}_over']  = _safe_div(1, df[over_col])
            df[f'ip_ou_{pfx}_under'] = _safe_div(1, df[under_col])

    ou_over_cols = [c for c in df.columns if c.startswith('ip_ou_') and c.endswith('_over')]
    if ou_over_cols:
        df['consensus_over_prob'] = df[ou_over_cols].mean(axis=1)
        df['consensus_over_std']  = df[ou_over_cols].std(axis=1)

    if 'Avg>2.5' in df.columns and 'AvgC>2.5' in df.columns:
        df['ou_drift_over']      = _safe_div(1, df['AvgC>2.5']) - _safe_div(1, df['Avg>2.5'])
        df['ou_drift_under']     = _safe_div(1, df['AvgC<2.5']) - _safe_div(1, df['Avg<2.5'])
        df['ou_drift_magnitude'] = df['ou_drift_over'].abs()
        df['ou_drift_direction'] = np.sign(df['ou_drift_over'])
    else:
        for c in ['ou_drift_over','ou_drift_under','ou_drift_magnitude','ou_drift_direction']:
            df[c] = np.nan

    if 'ip_ou_Avg_over' in df.columns and 'ip_ou_AvgC_over' in df.columns:
        df['ou_opening_closing_gap'] = df['ip_ou_AvgC_over'] - df['ip_ou_Avg_over']
        df['closing_consensus_over'] = df['ip_ou_AvgC_over']
    else:
        df['ou_opening_closing_gap'] = np.nan
        df['closing_consensus_over'] = np.nan

    if 'ip_ou_Avg_over' in df.columns and 'ip_ou_Avg_under' in df.columns:
        df['ou_market_margin'] = df['ip_ou_Avg_over'] + df['ip_ou_Avg_under'] - 1
    else:
        df['ou_market_margin'] = np.nan

    for line_col, home_col, away_col, pfx in [
        ('AHh','AvgAHH','AvgAHA','Avg'),
        ('AHh','MaxAHH','MaxAHA','Max'),
    ]:
        if all(c in df.columns for c in [line_col, home_col, away_col]):
            df['ah_line'] = pd.to_numeric(df[line_col], errors='coerce')
            df[f'ip_ah_{pfx}_home'] = _safe_div(1, df[home_col])
            df[f'ip_ah_{pfx}_away'] = _safe_div(1, df[away_col])

    if 'ah_line' in df.columns:
        df['ah_line_abs']   = df['ah_line'].abs()
        df['home_stronger'] = (df['ah_line'] < 0).astype(int)
    else:
        df['ah_line'] = np.nan
        df['ah_line_abs'] = np.nan
        df['home_stronger'] = np.nan

    if 'AvgCAHH' in df.columns and 'AvgCAHA' in df.columns:
        df['closing_ah_balance'] = _safe_div(1, df['AvgCAHH']) - _safe_div(1, df['AvgCAHA'])
    else:
        df['closing_ah_balance'] = np.nan

    for open_col, close_col, pfx in [
        ('B365H','B365CH','B365'),('B365D','B365CD','B365'),('B365A','B365CA','B365'),
        ('PSH','PSCH','PS'),('PSD','PSCD','PS'),('PSA','PSCA','PS'),
    ]:
        out = open_col[-1]
        if open_col in df.columns and close_col in df.columns:
            df[f'drift_{pfx}_{out}'] = _safe_div(1, df[close_col]) - _safe_div(1, df[open_col])

    if 'ip_ou_Avg_over' in df.columns and 'ah_line_abs' in df.columns:
        df['btts_ou_ah_interaction'] = df['ip_ou_Avg_over'] * _safe_div(1, df['ah_line_abs'] + 0.5)
    else:
        df['btts_ou_ah_interaction'] = np.nan

    df['btts_draw_proxy'] = df.get('ip_Avg_D', np.nan)

    if 'ip_ou_AvgC_over' in df.columns and 'ip_Avg_D' in df.columns:
        df['btts_closing_draw_interaction'] = df['ip_ou_AvgC_over'] * df['ip_Avg_D']
    elif 'ip_ou_Avg_over' in df.columns and 'ip_Avg_D' in df.columns:
        df['btts_closing_draw_interaction'] = df['ip_ou_Avg_over'] * df['ip_Avg_D']
    else:
        df['btts_closing_draw_interaction'] = np.nan

    if 'ip_Avg_H' in df.columns and 'ip_Avg_A' in df.columns:
        df['team_prob_product'] = df['ip_Avg_H'] * df['ip_Avg_A']
    else:
        df['team_prob_product'] = np.nan

    df['Div'] = df['Div'].astype(str)
    if 'Season' in df.columns:
        df['Season'] = df['Season'].astype(str)

    season_order = {'2122': 1,'2223': 2,'2324': 3,'2425': 4,'2526': 5}
    df['season_num'] = df.get('Season', pd.Series(dtype=str)).map(season_order).fillna(0).astype(int)

    return df,


def build_rolling_features(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').reset_index(drop=True)

    new_cols = [
        'home_avg_scored','home_avg_conceded','home_win_rate','home_over_rate','home_btts_rate',
        'away_avg_scored','away_avg_conceded','away_win_rate','away_over_rate','away_btts_rate',
        'h2h_home_wins','h2h_away_wins','h2h_draws','h2h_avg_goals',
        'home_clean_sheet_rate','home_failed_to_score_rate',
        'away_clean_sheet_rate','away_failed_to_score_rate',
        'btts_mutually_expected',
    ]
    for col in new_cols:
        df[col] = np.nan

    team_history: dict = {}
    h2h_history: dict  = {}

    def get_stats(team, n=window):
        hist = team_history.get(team, [])
        if not hist:
            # Penanganan Cold-Start (Tim Promosi / Histori Kosong)
            return {
                'avg_scored': 1.0,
                'avg_conceded': 1.5,
                'win_rate': 0.25,
                'over_rate': 0.50,
                'btts_rate': 0.50,
                'clean_sheet_rate': 0.20,
                'failed_to_score_rate': 0.30,
            }
        r = hist[-n:]
        return {
            'avg_scored':          np.mean([h['scored'] for h in r]),
            'avg_conceded':        np.mean([h['conceded'] for h in r]),
            'win_rate':            np.mean([h['win'] for h in r]),
            'over_rate':           np.mean([h['over'] for h in r]),
            'btts_rate':           np.mean([h['btts'] for h in r]),
            'clean_sheet_rate':    np.mean([h['conceded'] == 0 for h in r]),
            'failed_to_score_rate':np.mean([h['scored'] == 0 for h in r]),
        }

    for idx, row in df.iterrows():
        home = row['HomeTeam']
        away = row['AwayTeam']
        fthg = row.get('FTHG', np.nan)
        ftag = row.get('FTAG', np.nan)
        total_goals = fthg + ftag if pd.notna(fthg) and pd.notna(ftag) else np.nan

        hs = get_stats(home)
        as_ = get_stats(away)

        df.at[idx,'home_avg_scored']           = hs.get('avg_scored', np.nan)
        df.at[idx,'home_avg_conceded']         = hs.get('avg_conceded', np.nan)
        df.at[idx,'home_win_rate']             = hs.get('win_rate', np.nan)
        df.at[idx,'home_over_rate']            = hs.get('over_rate', np.nan)
        df.at[idx,'home_btts_rate']            = hs.get('btts_rate', np.nan)
        df.at[idx,'home_clean_sheet_rate']     = hs.get('clean_sheet_rate', np.nan)
        df.at[idx,'home_failed_to_score_rate'] = hs.get('failed_to_score_rate', np.nan)
        df.at[idx,'away_avg_scored']           = as_.get('avg_scored', np.nan)
        df.at[idx,'away_avg_conceded']         = as_.get('avg_conceded', np.nan)
        df.at[idx,'away_win_rate']             = as_.get('win_rate', np.nan)
        df.at[idx,'away_over_rate']            = as_.get('over_rate', np.nan)
        df.at[idx,'away_btts_rate']            = as_.get('btts_rate', np.nan)
        df.at[idx,'away_clean_sheet_rate']     = as_.get('clean_sheet_rate', np.nan)
        df.at[idx,'away_failed_to_score_rate'] = as_.get('failed_to_score_rate', np.nan)

        pair = frozenset([home, away])
        h2h  = h2h_history.get(pair, [])
        
        # Penanganan Cold-Start untuk rekor H2H
        if h2h:
            df.at[idx,'h2h_home_wins']  = sum(1 for g in h2h if g['winner'] == home)
            df.at[idx,'h2h_away_wins']  = sum(1 for g in h2h if g['winner'] == away)
            df.at[idx,'h2h_draws']      = sum(1 for g in h2h if g['winner'] == 'D')
            df.at[idx,'h2h_avg_goals']  = np.mean([g['total'] for g in h2h])
        else:
            df.at[idx,'h2h_home_wins']  = 0
            df.at[idx,'h2h_away_wins']  = 0
            df.at[idx,'h2h_draws']      = 0
            df.at[idx,'h2h_avg_goals']  = 2.5 

        if pd.notna(fthg) and pd.notna(ftag):
            ftr     = str(row.get('FTR', ''))
            is_over = total_goals > 2.5
            is_btts = (fthg > 0) and (ftag > 0)
            for team, scored, conceded, win in [
                (home, fthg, ftag, ftr == 'H'),
                (away, ftag, fthg, ftr == 'A'),
            ]:
                if team not in team_history:
                    team_history[team] = []
                team_history[team].append({
                    'scored': scored, 'conceded': conceded,
                    'win': int(win), 'over': int(is_over), 'btts': int(is_btts),
                })
            if pair not in h2h_history:
                h2h_history[pair] = []
            winner = home if ftr == 'H' else (away if ftr == 'A' else 'D')
            h2h_history[pair].append({'winner': winner, 'total': total_goals})

    df['attack_vs_defense_home'] = df['home_avg_scored'] - df['away_avg_conceded']
    df['attack_vs_defense_away'] = df['away_avg_scored'] - df['home_avg_conceded']
    df['expected_goals_proxy']   = df['home_avg_scored'] + df['away_avg_scored']
    df['form_diff']              = df['home_win_rate'] - df['away_win_rate']
    df['btts_mutually_expected'] = (
        (1 - df['home_failed_to_score_rate'].fillna(0.5)) *
        (1 - df['away_clean_sheet_rate'].fillna(0.5)) *
        (1 - df['away_failed_to_score_rate'].fillna(0.5)) *
        (1 - df['home_clean_sheet_rate'].fillna(0.5))
    )
    return df,