import os
import pandas as pd
import numpy as np
import math
import joblib
import sys
import time
import warnings
import uuid
import pytz
from pathlib import Path
from django.conf import settings
from django.db import transaction, models
from django.utils import timezone
from .models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket

PROJECT_ROOT = settings.BASE_DIR
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

try:
    from src.loader import _harmonize
    from src.enrichment.standings import build_standings_features
    from src.enrichment.weather import build_weather_features
    from src.features import build_features, build_rolling_features, build_elo_features
    from src.betting.core import detect_value_bets
    from src.betting.rl import BettingState, ACTIONS
except ImportError as e:
    print(f"[Peringatan Server] Gagal memuat modul Machine Learning: {e}")

LEAGUE_NAMES = {
    "E0": "EPL", "SP1": "La Liga", "I1": "Serie A", "D1": "Bundesliga",
    "F1": "Ligue 1", "N1": "Eredivisie", "B1": "Jupiler Pro League",
    "P1": "Primeira Liga", "T1": "Süper Lig", "G1": "Super League",
    "SC0": "Scottish Premiership",
}

def make_aware_dt(dt_val):
    if pd.isnull(dt_val):
        return None
    if isinstance(dt_val, pd.Timestamp):
        dt = dt_val.to_pydatetime()
    else:
        dt = dt_val
        
    if dt.tzinfo is None:
        from datetime import timezone as dt_timezone
        return dt.replace(tzinfo=dt_timezone.utc)
    return dt

def parse_csv_datetime(df):
    if df.empty: return df
    df = df.copy()
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=UserWarning)
        if 'Time' in df.columns:
            parsed_dates = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce').dt.strftime('%Y-%m-%d')
            parsed_times = df['Time'].fillna('00:00').astype(str).str.replace('.', ':', regex=False).replace('nan', '00:00')
            parsed_times = parsed_times.replace('', '00:00')
            combined_str = parsed_dates + ' ' + parsed_times
            
            naive_dt = pd.to_datetime(combined_str, errors='coerce')
            london_tz = pytz.timezone('Europe/London')
            london_dt = naive_dt.dt.tz_localize(london_tz, ambiguous='NaT', nonexistent='NaT')
            utc_dt = london_dt.dt.tz_convert('UTC')
            
            df['Date'] = utc_dt
        else:
            naive_dt = pd.to_datetime(df['Date'], errors='coerce')
            if naive_dt.dt.tz is not None:
                df['Date'] = naive_dt.dt.tz_convert('UTC')
            else:
                london_tz = pytz.timezone('Europe/London')
                df['Date'] = naive_dt.dt.tz_localize(london_tz, ambiguous='NaT', nonexistent='NaT').dt.tz_convert('UTC')
            
    return df

def clean_json_dict(d):
    clean_d = {}
    for k, v in d.items():
        if pd.isna(v) or (isinstance(v, float) and math.isnan(v)):
            continue
        if isinstance(v, pd.Timestamp):
            clean_d[k] = v.strftime('%Y-%m-%d %H:%M:%S')
        else:
            clean_d[k] = v
    return clean_d

def extract_odds(row):
    def safe_float(val):
        try:
            f = float(val)
            return f if not math.isnan(f) else 0.0
        except:
            return 0.0
    return {
        'H': safe_float(row.get('AvgH') or row.get('B365H') or row.get('MaxH')),
        'D': safe_float(row.get('AvgD') or row.get('B365D') or row.get('MaxD')),
        'A': safe_float(row.get('AvgA') or row.get('B365A') or row.get('MaxA')),
        'O25': safe_float(row.get('Avg>2.5') or row.get('B365>2.5') or row.get('Max>2.5')),
        'U25': safe_float(row.get('Avg<2.5') or row.get('B365<2.5') or row.get('Max<2.5')),
    }

def run_feature_engineering_pipeline(df: pd.DataFrame, upload_type: str = 'mixed', skip_weather: bool = False):
    if df.empty:
        return pd.DataFrame(), pd.DataFrame()
    t_start = time.time()
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df = df.dropna(subset=['Date', 'HomeTeam', 'AwayTeam', 'Div'])
    df = df.sort_values('Date').reset_index(drop=True)
    df = _harmonize(df, div='MIXED', season='MIXED')
    df = build_standings_features(df)
    
    if not skip_weather:
        df = build_weather_features(df)
        
    df = build_elo_features(df)
    feature_result = build_features(df)
    df = feature_result[0] if isinstance(feature_result, tuple) else feature_result
    
    rolling_result = build_rolling_features(df)
    df = rolling_result[0] if isinstance(rolling_result, tuple) else rolling_result
    df = df.copy()
    
    if upload_type == 'history':
        df_history = df[df['_source'] == 'csv'].copy() if '_source' in df.columns else df.copy()
        df_fixture = pd.DataFrame(columns=df.columns)
    elif upload_type == 'fixture':
        df_history = pd.DataFrame(columns=df.columns)
        df_fixture = df[df['_source'] == 'csv'].copy() if '_source' in df.columns else df.copy()
        cols_to_hide = ['FTR', 'FTHG', 'FTAG', 'HTHG', 'HTAG', 'HTR']
        for col in cols_to_hide:
            if col in df_fixture.columns:
                df_fixture[col] = np.nan
    else:
        df_csv_only = df[df['_source'] == 'csv'].copy() if '_source' in df.columns else df.copy()
        df_fixture = df_csv_only.groupby('Div').tail(10).copy()
        df_history = df_csv_only.drop(df_fixture.index).copy()
        cols_to_hide = ['FTR', 'FTHG', 'FTAG', 'HTHG', 'HTAG', 'HTR']
        for col in cols_to_hide:
            if col in df_fixture.columns:
                df_fixture[col] = np.nan
    
    if '_source' in df_history.columns: df_history.drop(columns=['_source'], inplace=True)
    if '_source' in df_fixture.columns: df_fixture.drop(columns=['_source'], inplace=True)
    return df_history, df_fixture

def apply_ai_predictions(df: pd.DataFrame, lgbm_ftr, lgbm_ou, agent, is_hist=False):
    if df.empty:
        return df
    
    df = df.copy()
    feat_cols = lgbm_ftr.feature_name_
    
    missing_cols = set(feat_cols) - set(df.columns)
    for c in missing_cols:
        df[c] = np.nan
        
    X = df.reindex(columns=feat_cols, fill_value=np.nan)
    
    probs_ftr = lgbm_ftr.predict_proba(X)
    probs_ou = lgbm_ou.predict_proba(X)
    
    # PERBAIKAN: Mengembalikan kabel prediksi ke urutan alfabetis (A, D, H)
    df['prob_FTR_A'] = probs_ftr[:, 0]
    df['prob_FTR_D'] = probs_ftr[:, 1]
    df['prob_FTR_H'] = probs_ftr[:, 2]
    
    df['prob_OU25_Yes'] = probs_ou[:, 1]
    
    data_res = {
        'has_value_bet': [], 'rl_pick_ftr': [], 'rl_action_ftr': [], 'rl_stake_ftr': [], 'is_won_ftr': [], 'edge_ftr': [],
        'has_value_bet_ou': [], 'rl_pick_ou': [], 'rl_action_ou': [], 'rl_stake_ou': [], 'is_won_ou': [], 'edge_ou': []
    }
    
    for _, row in df.iterrows():
        odds = extract_odds(row)
        
        m_probs_ftr = np.array([row['prob_FTR_H'], row['prob_FTR_D'], row['prob_FTR_A']])
        has_v_ftr, pick_ftr, rl_a_ftr, rl_s_ftr, is_won_ftr, edge_ftr = False, None, "Skip", 0.0, None, 0.0
        
        if sum(m_probs_ftr) > 0:
            try:
                bets_ftr = detect_value_bets(m_probs_ftr, {'H': odds['H'], 'D': odds['D'], 'A': odds['A']}, ['H', 'D', 'A'])
                if bets_ftr:
                    has_v_ftr = True
                    best_ftr = max(bets_ftr, key=lambda x: x['edge'])
                    pick_ftr = best_ftr['outcome']
                    edge_ftr = best_ftr['edge']
                    
                    state_ftr = BettingState.discretize(best_ftr['edge'], best_ftr['ev'], best_ftr['kelly_frac'], 1.0)
                    idx_ftr = agent.best_action(state_ftr)
                    if idx_ftr > 0:
                        rl_a_ftr = f"Bet {int(ACTIONS[idx_ftr]*100)}% Kelly"
                        rl_s_ftr = best_ftr['kelly_frac'] * ACTIONS[idx_ftr]
                    
                    if pd.notna(row.get('FTR')):
                        is_won_ftr = (pick_ftr == row['FTR'])
            except Exception:
                pass
                
        data_res['has_value_bet'].append(has_v_ftr)
        data_res['rl_pick_ftr'].append(pick_ftr)
        data_res['rl_action_ftr'].append(rl_a_ftr)
        data_res['rl_stake_ftr'].append(rl_s_ftr)
        data_res['is_won_ftr'].append(is_won_ftr)
        data_res['edge_ftr'].append(edge_ftr)
        
        prob_over = row['prob_OU25_Yes']
        prob_under = 1.0 - prob_over if prob_over > 0 else 0.0
        m_probs_ou = np.array([prob_over, prob_under])
        has_v_ou, pick_ou, rl_a_ou, rl_s_ou, is_won_ou, edge_ou = False, None, "Skip", 0.0, None, 0.0
        
        if sum(m_probs_ou) > 0:
            try:
                bets_ou = detect_value_bets(m_probs_ou, {'O25': odds['O25'], 'U25': odds['U25']}, ['O25', 'U25'])
                if bets_ou:
                    has_v_ou = True
                    best_ou = max(bets_ou, key=lambda x: x['edge'])
                    pick_ou = 'Over 2.5' if best_ou['outcome'] == 'O25' else 'Under 2.5'
                    edge_ou = best_ou['edge']
                    
                    state_ou = BettingState.discretize(best_ou['edge'], best_ou['ev'], best_ou['kelly_frac'], 1.0)
                    idx_ou = agent.best_action(state_ou)
                    if idx_ou > 0:
                        rl_a_ou = f"Bet {int(ACTIONS[idx_ou]*100)}% Kelly"
                        rl_s_ou = best_ou['kelly_frac'] * ACTIONS[idx_ou]
                    
                    if pd.notna(row.get('FTHG')) and pd.notna(row.get('FTAG')):
                        actual_ou = 'Over 2.5' if (row['FTHG'] + row['FTAG'] > 2.5) else 'Under 2.5'
                        is_won_ou = (pick_ou == actual_ou)
            except Exception:
                pass
                
        data_res['has_value_bet_ou'].append(has_v_ou)
        data_res['rl_pick_ou'].append(pick_ou)
        data_res['rl_action_ou'].append(rl_a_ou)
        data_res['rl_stake_ou'].append(rl_s_ou)
        data_res['is_won_ou'].append(is_won_ou)
        data_res['edge_ou'].append(edge_ou)
        
    for k, v in data_res.items():
        df[k] = v
        
    df['part_of_parlay'] = False
    df['parlay_ticket_info'] = None
    df['best_edge'] = df[['edge_ftr', 'edge_ou']].max(axis=1)
    
    valid_bets_mask = (df['rl_stake_ftr'].fillna(0) > 0) | (df['rl_stake_ou'].fillna(0) > 0)
    df_valid = df[valid_bets_mask].copy()
    
    p_tipe = "H" if is_hist else "F"
    for date_val, group in df_valid.groupby(df_valid['Date'].dt.date):
        group_sorted = group.sort_values('best_edge', ascending=False)
        
        while len(group_sorted) >= 4:
            top4_indices = group_sorted.head(4).index
            unique_hex = uuid.uuid4().hex[:6].upper()
            ticket_id = f"PRLY-{p_tipe}-{date_val.strftime('%Y%m%d')}-{unique_hex}"
            
            df.loc[top4_indices, 'part_of_parlay'] = True
            df.loc[top4_indices, 'parlay_ticket_info'] = ticket_id
            
            group_sorted = group_sorted.iloc[4:]
    return df

def run_ml_predictions_for_preview(df_history, df_fixture):
    model_dir = PROJECT_ROOT / 'models' / 'global'
    if not (model_dir / 'lgbm_global_FTR.pkl').exists():
        model_dir = PROJECT_ROOT / 'models'
    try:
        lgbm_ftr = joblib.load(model_dir / 'lgbm_global_FTR.pkl')
        lgbm_ou = joblib.load(model_dir / 'lgbm_global_OU25.pkl')
        agent = joblib.load(model_dir / 'rl_agent_FTR_OU.pkl')
        
        if not df_history.empty:
            df_history = apply_ai_predictions(df_history, lgbm_ftr, lgbm_ou, agent, is_hist=True)
            
        if not df_fixture.empty:
            df_fixture = apply_ai_predictions(df_fixture, lgbm_ftr, lgbm_ou, agent, is_hist=False)
            
    except Exception as e:
        print(f"[Peringatan Server] Gagal memuat/memprediksi model ML: {e}")
        
    return df_history, df_fixture

def preview_uploaded_data(file_path, upload_type, league_code='ALL'):
    df_csv = pd.read_csv(file_path, low_memory=False)
    
    if 'Div' in df_csv.columns:
        valid_leagues = list(LEAGUE_NAMES.keys())
        df_csv = df_csv[df_csv['Div'].isin(valid_leagues)].copy()
        
    if league_code and league_code != 'ALL' and 'Div' in df_csv.columns:
        df_csv = df_csv[df_csv['Div'] == league_code].copy()
        
    if df_csv.empty:
        return {"upload_type": upload_type, "preview_data": [], "total_rows": 0, "message": "File CSV tidak mengandung data yang valid."}
        
    df_csv = parse_csv_datetime(df_csv)
    df_csv['_source'] = 'csv'
    
    db_records = []
    teams_in_csv = set(df_csv['HomeTeam'].unique()) | set(df_csv['AwayTeam'].unique())
    
    hist_qs = MatchHistory.objects.filter(home_team__name__in=teams_in_csv).order_by('date') | MatchHistory.objects.filter(away_team__name__in=teams_in_csv).order_by('date')
    for m in hist_qs.distinct():
        db_records.append({
            'Div': m.league.code, 'Date': m.date, 'HomeTeam': m.home_team.name, 'AwayTeam': m.away_team.name,
            'FTHG': m.fthg, 'FTAG': m.ftag, 'FTR': m.ftr,
            'AvgH': m.avg_h, 'AvgD': m.avg_d, 'AvgA': m.avg_a, 'Avg>2.5': m.avg_over_25, 'Avg<2.5': m.avg_under_25,
            '_source': 'db'
        })
        
    df_db = pd.DataFrame(db_records)
    if not df_db.empty:
        df_db['Date'] = pd.to_datetime(df_db['Date'], utc=True)
        df_combined = pd.concat([df_db, df_csv]).drop_duplicates(subset=['Date', 'HomeTeam', 'AwayTeam'], keep='last').reset_index(drop=True)
    else:
        df_combined = df_csv.copy()
        
    df_hist, df_fix = run_feature_engineering_pipeline(df_combined, upload_type=upload_type, skip_weather=True)
    
    if league_code and league_code != 'ALL':
        db_hist_qs = MatchHistory.objects.filter(league__code=league_code)
        db_fix_qs = UpcomingFixture.objects.filter(league__code=league_code)
    else:
        db_hist_qs = MatchHistory.objects.all()
        db_fix_qs = UpcomingFixture.objects.all()
        
    existing_hist_keys = {f"{d.strftime('%Y-%m-%d')}_{h}_{a}" for d, h, a in db_hist_qs.values_list('date', 'home_team__name', 'away_team__name') if d}
    existing_fix_keys = {f"{d.strftime('%Y-%m-%d')}_{h}_{a}" for d, h, a in db_fix_qs.values_list('date', 'home_team__name', 'away_team__name') if d}
    
    if not df_hist.empty:
        df_hist['match_key'] = df_hist['Date'].dt.strftime('%Y-%m-%d') + "_" + df_hist['HomeTeam'] + "_" + df_hist['AwayTeam']
        new_hist_mask = ~df_hist['match_key'].isin(existing_hist_keys)
        df_hist = df_hist[new_hist_mask].copy().reset_index(drop=True)
        df_hist.drop(columns=['match_key'], inplace=True)
        
    if not df_fix.empty:
        df_fix['match_key'] = df_fix['Date'].dt.strftime('%Y-%m-%d') + "_" + df_fix['HomeTeam'] + "_" + df_fix['AwayTeam']
        new_fix_mask = ~df_fix['match_key'].isin(existing_fix_keys)
        df_fix = df_fix[new_fix_mask].copy().reset_index(drop=True)
        df_fix.drop(columns=['match_key'], inplace=True)
    
    if df_hist.empty and df_fix.empty:
        return {"upload_type": upload_type, "preview_data": [], "total_rows": 0, "message": "Seluruh baris pertandingan valid dari CSV ini sudah tersimpan di database."}
        
    if not df_hist.empty: df_hist = build_weather_features(df_hist)
    if not df_fix.empty: df_fix = build_weather_features(df_fix)
    
    df_hist, df_fix = run_ml_predictions_for_preview(df_hist, df_fix)
    
    if upload_type == 'history' and not df_hist.empty:
        df_hist['synced_ext_features'] = None
        df_hist['synced_ext_features'] = df_hist['synced_ext_features'].astype(object)
        
        hist_dates = df_hist['Date'].dt.date.tolist()
        fixture_qs = UpcomingFixture.objects.filter(date__date__in=hist_dates)
        
        fixture_map = {
            f"{f.date.strftime('%Y-%m-%d')}_{f.home_team.name}_{f.away_team.name}": f
            for f in fixture_qs
        }
        
        for idx, row in df_hist.iterrows():
            m_key = f"{row['Date'].strftime('%Y-%m-%d')}_{row['HomeTeam']}_{row['AwayTeam']}"
            if m_key in fixture_map:
                f_obj = fixture_map[m_key]
                df_hist.at[idx, 'prob_FTR_H'] = f_obj.prob_ftr_h
                df_hist.at[idx, 'prob_FTR_D'] = f_obj.prob_ftr_d
                df_hist.at[idx, 'prob_FTR_A'] = f_obj.prob_ftr_a
                df_hist.at[idx, 'prob_OU25_Yes'] = f_obj.prob_ou25_over
                df_hist.at[idx, 'AvgH'] = f_obj.avg_h
                df_hist.at[idx, 'AvgD'] = f_obj.avg_d
                df_hist.at[idx, 'AvgA'] = f_obj.avg_a
                df_hist.at[idx, 'Avg>2.5'] = f_obj.avg_over_25
                df_hist.at[idx, 'Avg<2.5'] = f_obj.avg_under_25
                df_hist.at[idx, 'has_value_bet'] = f_obj.has_value_bet
                df_hist.at[idx, 'rl_pick_ftr'] = f_obj.rl_pick_ftr
                df_hist.at[idx, 'rl_action_ftr'] = f_obj.rl_action_ftr
                df_hist.at[idx, 'rl_stake_ftr'] = f_obj.rl_stake_ftr
                
                if pd.notna(row.get('FTR')) and f_obj.rl_pick_ftr and f_obj.rl_pick_ftr != 'Skip':
                    df_hist.at[idx, 'is_won_ftr'] = (f_obj.rl_pick_ftr == row.get('FTR'))
                else:
                    df_hist.at[idx, 'is_won_ftr'] = None
                    
                if pd.notna(row.get('FTHG')) and pd.notna(row.get('FTAG')) and f_obj.rl_pick_ou and f_obj.rl_pick_ou != 'Skip':
                    actual_ou = 'Over 2.5' if (row.get('FTHG') + row.get('FTAG') > 2.5) else 'Under 2.5'
                    df_hist.at[idx, 'is_won_ou'] = (f_obj.rl_pick_ou == actual_ou)
                else:
                    df_hist.at[idx, 'is_won_ou'] = None
                
                df_hist.at[idx, 'part_of_parlay'] = f_obj.part_of_parlay
                if f_obj.parlay_ticket_info:
                    df_hist.at[idx, 'parlay_ticket_info'] = f_obj.parlay_ticket_info.replace('PRLY-F-', 'PRLY-H-')
                else:
                    df_hist.at[idx, 'parlay_ticket_info'] = None
                
                ext = f_obj.extended_features.copy() if f_obj.extended_features else {}
                ext['FTHG'] = row.get('FTHG')
                ext['FTAG'] = row.get('FTAG')
                ext['FTR'] = row.get('FTR')
                df_hist.at[idx, 'synced_ext_features'] = ext
    
    df_hist.to_pickle(os.path.join(settings.BASE_DIR, 'temp_hist_processed.pkl'))
    df_fix.to_pickle(os.path.join(settings.BASE_DIR, 'temp_fix_processed.pkl'))
    
    target_df = df_hist if upload_type == 'history' else df_fix
    
    preview_data = []
    if not target_df.empty:
        top_rows = target_df.tail(10) if upload_type == 'history' else target_df.head(10)
        for _, row in top_rows.iterrows():
            preview_data.append({
                "Date": str(row.get('Date', '')),
                "HomeTeam": str(row.get('HomeTeam', '')),
                "AwayTeam": str(row.get('AwayTeam', '')),
                "Pick_FTR": str(row.get('rl_pick_ftr', '-')),
                "Action_FTR": str(row.get('rl_action_ftr', '-')),
                "Pick_OU": str(row.get('rl_pick_ou', '-')),
                "Action_OU": str(row.get('rl_action_ou', '-')),
            })
            
    return {"upload_type": upload_type, "preview_data": preview_data, "total_rows": len(target_df), "message": "Sukses"}

@transaction.atomic
def commit_uploaded_data(upload_type):
    print("  [DEBUG] Memulai proses unggah data ke Supabase...")
    hist_path = os.path.join(settings.BASE_DIR, 'temp_hist_processed.pkl')
    fix_path = os.path.join(settings.BASE_DIR, 'temp_fix_processed.pkl')
    
    df_history = pd.read_pickle(hist_path) if os.path.exists(hist_path) else pd.DataFrame()
    df_fixture = pd.read_pickle(fix_path) if os.path.exists(fix_path) else pd.DataFrame()
    
    league_objs = {code: League.objects.get_or_create(code=code, defaults={'name': name, 'country': 'Eropa'})[0] for code, name in LEAGUE_NAMES.items()}
    all_teams = set()
    if not df_history.empty: all_teams |= set(df_history['HomeTeam'].unique()) | set(df_history['AwayTeam'].unique())
    if not df_fixture.empty: all_teams |= set(df_fixture['HomeTeam'].unique()) | set(df_fixture['AwayTeam'].unique())
    team_objs = {name: Team.objects.get_or_create(name=name, defaults={'league': list(league_objs.values())[0]})[0] for name in all_teams if isinstance(name, str)}
    
    print(f"  [DEBUG] Memproses tiket Parlay (History: {not df_history.empty}, Fixture: {not df_fixture.empty})...")
    if not df_history.empty:
        for _, row in df_history.iterrows():
            UpcomingFixture.objects.filter(date__date=row['Date'].date(), home_team__name=row['HomeTeam'], away_team__name=row['AwayTeam']).delete()
            t_info = row.get('parlay_ticket_info')
            if pd.notna(t_info) and isinstance(t_info, str) and 'PRLY-H-' in t_info:
                old_t = t_info.replace('PRLY-H-', 'PRLY-F-')
                ParlayTicket.objects.filter(ticket_id=old_t).delete()
                
    for is_hist, df_source in [(True, df_history), (False, df_fixture)]:
        if df_source.empty: continue
        df_parlay_only = df_source[df_source['part_of_parlay'] == True].copy()
        if df_parlay_only.empty: continue
        
        for t_info, group in df_parlay_only.groupby('parlay_ticket_info'):
            legs_odds, legs_prob, legs_won, legs_details = [], [], [], []
            for _, r in group.iterrows():
                odds = extract_odds(r)
                date_str = r['Date'].strftime('%Y-%m-%dT%H:%M:%S') if pd.notnull(r.get('Date')) else None
                
                if r['edge_ftr'] >= r['edge_ou']:
                    pick = r['rl_pick_ftr']
                    leg_odd = odds.get(pick) if odds.get(pick) else odds['H']
                    legs_odds.append(leg_odd)
                    legs_prob.append(r['prob_FTR_H'] if pick == 'H' else (r['prob_FTR_D'] if pick == 'D' else r['prob_FTR_A']))
                    
                    won_status = None
                    if pd.notnull(r.get('is_won_ftr')):
                        won_status = bool(r['is_won_ftr'])
                        
                    legs_won.append(won_status)
                    legs_details.append({
                        "match": f"{r['HomeTeam']} vs {r['AwayTeam']}", 
                        "pick": pick, 
                        "odds": leg_odd,
                        "date": date_str,
                        "is_won": won_status
                    })
                else:
                    pick = r['rl_pick_ou']
                    leg_odd = odds['O25'] if pick == 'Over 2.5' else odds['U25']
                    legs_odds.append(leg_odd)
                    legs_prob.append(r['prob_OU25_Yes'] if pick == 'Over 2.5' else (1.0 - r['prob_OU25_Yes']))
                    
                    won_status = None
                    if pd.notnull(r.get('is_won_ou')):
                        won_status = bool(r['is_won_ou'])
                        
                    legs_won.append(won_status)
                    legs_details.append({
                        "match": f"{r['HomeTeam']} vs {r['AwayTeam']}", 
                        "pick": pick, 
                        "odds": leg_odd,
                        "date": date_str,
                        "is_won": won_status
                    })
                    
            ticket_won = None
            if is_hist:
                if any(x is False for x in legs_won): ticket_won = False
                elif all(x is True for x in legs_won): ticket_won = True
                
            ParlayTicket.objects.filter(ticket_id=t_info).delete()
            ParlayTicket.objects.create(
                ticket_id=t_info, 
                date=group['Date'].iloc[0].date() if pd.notnull(group['Date'].iloc[0]) else None, 
                total_odds=float(np.prod(legs_odds)), 
                total_prob=float(np.prod(legs_prob)), 
                is_won=ticket_won, 
                is_historical=is_hist, 
                legs_details=legs_details
            )
            
    history_inserts = []
    for _, row in df_history.iterrows():
        if row['Div'] not in league_objs or row['HomeTeam'] not in team_objs or row['AwayTeam'] not in team_objs: continue
        odds = extract_odds(row)
        ext_feat = row.get('synced_ext_features')
        if not isinstance(ext_feat, dict): ext_feat = clean_json_dict(row.to_dict())
        history_inserts.append(MatchHistory(
            league=league_objs[row['Div']], date=make_aware_dt(row['Date']), home_team=team_objs[row['HomeTeam']], away_team=team_objs[row['AwayTeam']], fthg=row.get('FTHG'), ftag=row.get('FTAG'), ftr=row.get('FTR'),
            avg_h=odds['H'], avg_d=odds['D'], avg_a=odds['A'], avg_over_25=odds['O25'], avg_under_25=odds['U25'],
            prob_ftr_h=row.get('prob_FTR_H', 0.0), prob_ftr_d=row.get('prob_FTR_D', 0.0), prob_ftr_a=row.get('prob_FTR_A', 0.0), prob_ou25_over=row.get('prob_OU25_Yes', 0.0), prob_ou25_under=1.0 - row.get('prob_OU25_Yes', 0.0) if row.get('prob_OU25_Yes', 0.0) > 0 else 0.0,
            has_value_bet=row.get('has_value_bet', False), rl_pick_ftr=row.get('rl_pick_ftr'), rl_action_ftr=row.get('rl_action_ftr', 'Skip'), rl_stake_ftr=row.get('rl_stake_ftr', 0.0), is_won_ftr=row.get('is_won_ftr'),
            has_value_bet_ou=row.get('has_value_bet_ou', False), rl_pick_ou=row.get('rl_pick_ou'), rl_action_ou=row.get('rl_action_ou', 'Skip'), rl_stake_ou=row.get('rl_stake_ou', 0.0), is_won_ou=row.get('is_won_ou'),
            part_of_parlay=row.get('part_of_parlay', False), parlay_ticket_info=row.get('parlay_ticket_info'), extended_features=ext_feat
        ))
    
    print(f"  [DEBUG] Menyiapkan Bulk Insert untuk {len(history_inserts)} baris MatchHistory...")
    MatchHistory.objects.bulk_create(history_inserts, batch_size=1000)
    
    fixture_inserts = []
    for _, row in df_fixture.iterrows():
        if row['Div'] not in league_objs or row['HomeTeam'] not in team_objs or row['AwayTeam'] not in team_objs: continue
        odds = extract_odds(row)
        fixture_inserts.append(UpcomingFixture(
            league=league_objs[row['Div']], date=make_aware_dt(row['Date']), home_team=team_objs[row['HomeTeam']], away_team=team_objs[row['AwayTeam']],
            avg_h=odds['H'], avg_d=odds['D'], avg_a=odds['A'], avg_over_25=odds['O25'], avg_under_25=odds['U25'],
            prob_ftr_h=row.get('prob_FTR_H', 0.0), prob_ftr_d=row.get('prob_FTR_D', 0.0), prob_ftr_a=row.get('prob_FTR_A', 0.0), prob_ou25_over=row.get('prob_OU25_Yes', 0.0), prob_ou25_under=1.0 - row.get('prob_OU25_Yes', 0.0) if row.get('prob_OU25_Yes', 0.0) > 0 else 0.0,
            has_value_bet=row.get('has_value_bet', False), rl_pick_ftr=row.get('rl_pick_ftr'), rl_action_ftr=row.get('rl_action_ftr', 'Skip'), rl_stake_ftr=row.get('rl_stake_ftr', 0.0), is_won_ftr=row.get('is_won_ftr'),
            has_value_bet_ou=row.get('has_value_bet_ou', False), rl_pick_ou=row.get('rl_pick_ou'), rl_action_ou=row.get('rl_action_ou', 'Skip'), rl_stake_ou=row.get('rl_stake_ou', 0.0), is_won_ou=row.get('is_won_ou'),
            part_of_parlay=row.get('part_of_parlay', False), parlay_ticket_info=row.get('parlay_ticket_info'), extended_features=clean_json_dict(row.to_dict()), is_processed=True
        ))
    
    print(f"  [DEBUG] Menyiapkan Bulk Insert untuk {len(fixture_inserts)} baris UpcomingFixture...")
    UpcomingFixture.objects.bulk_create(fixture_inserts, batch_size=500)
    
    print("  [DEBUG] Proses unggah ke Database selesai!")
    return len(history_inserts), len(fixture_inserts)

@transaction.atomic
def process_and_append_fetched_data(df: pd.DataFrame, upload_type: str = 'history'):
    print("  [DEBUG] Memulai penyaringan tanggal, liga, dan validasi duplikat...")
    df_csv = parse_csv_datetime(df)
    if 'Div' in df_csv.columns:
        valid_leagues = list(LEAGUE_NAMES.keys())
        df_csv = df_csv[df_csv['Div'].isin(valid_leagues)].copy()
    
    if df_csv.empty: return 0, 0
        
    df_csv['_source'] = 'csv'
    
    db_records = []
    teams_in_csv = set(df_csv['HomeTeam'].unique()) | set(df_csv['AwayTeam'].unique())
    
    print(f"  [DEBUG] Menghubungkan ke Supabase untuk mencocokkan {len(teams_in_csv)} tim...")
    try:
        hist_qs = MatchHistory.objects.filter(
            models.Q(home_team__name__in=teams_in_csv) | models.Q(away_team__name__in=teams_in_csv)
        ).select_related('league', 'home_team', 'away_team')
        
        print(f"  [DEBUG] Kueri siap. Memproses baris dengan metode iterator yang ringan...")
        
        for m in hist_qs.iterator(chunk_size=1000):
            db_records.append({
                'Div': m.league.code, 'Date': m.date, 'HomeTeam': m.home_team.name, 'AwayTeam': m.away_team.name,
                'FTHG': m.fthg, 'FTAG': m.ftag, 'FTR': m.ftr,
                'AvgH': m.avg_h, 'AvgD': m.avg_d, 'AvgA': m.avg_a, 'Avg>2.5': m.avg_over_25, 'Avg<2.5': m.avg_under_25,
                '_source': 'db'
            })
        print(f"  [DEBUG] Berhasil memetakan {len(db_records)} catatan lama dari database tanpa freeze.")
    except Exception as e:
        print(f"  [FATAL ERROR DATABASE]: {str(e)}")
        raise e
        
    df_db = pd.DataFrame(db_records)
    if not df_db.empty:
        df_db['Date'] = pd.to_datetime(df_db['Date'], utc=True)
        df_combined = pd.concat([df_db, df_csv]).drop_duplicates(subset=['Date', 'HomeTeam', 'AwayTeam'], keep='last').reset_index(drop=True)
    else:
        df_combined = df_csv.copy()
        
    print("  [DEBUG] Menjalankan Pipeline Feature Engineering (Klasemen & ELO)...")
    df_hist, df_fix = run_feature_engineering_pipeline(df_combined, upload_type=upload_type, skip_weather=True)
    
    db_hist_qs = MatchHistory.objects.all()
    db_fix_qs = UpcomingFixture.objects.all()
    
    existing_hist_keys = {f"{d.strftime('%Y-%m-%d')}_{h}_{a}" for d, h, a in db_hist_qs.values_list('date', 'home_team__name', 'away_team__name') if d}
    existing_fix_keys = {f"{d.strftime('%Y-%m-%d')}_{h}_{a}" for d, h, a in db_fix_qs.values_list('date', 'home_team__name', 'away_team__name') if d}
    
    if not df_hist.empty:
        df_hist['match_key'] = df_hist['Date'].dt.strftime('%Y-%m-%d') + "_" + df_hist['HomeTeam'] + "_" + df_hist['AwayTeam']
        new_hist_mask = ~df_hist['match_key'].isin(existing_hist_keys)
        df_hist = df_hist[new_hist_mask].copy().reset_index(drop=True)
        df_hist.drop(columns=['match_key'], inplace=True)
        
    if not df_fix.empty:
        df_fix['match_key'] = df_fix['Date'].dt.strftime('%Y-%m-%d') + "_" + df_fix['HomeTeam'] + "_" + df_fix['AwayTeam']
        new_fix_mask = ~df_fix['match_key'].isin(existing_fix_keys)
        df_fix = df_fix[new_fix_mask].copy().reset_index(drop=True)
        df_fix.drop(columns=['match_key'], inplace=True)
        
    if df_hist.empty and df_fix.empty:
        print("  [DEBUG] Semua data sudah mutakhir di Database. Tidak ada yang perlu diproses.")
        return 0, 0
        
    if not df_hist.empty: df_hist = build_weather_features(df_hist)
    if not df_fix.empty: df_fix = build_weather_features(df_fix)
    
    print("  [DEBUG] Memulai Prediksi AI (LightGBM & Agen Reinforcement Learning)...")
    df_hist, df_fix = run_ml_predictions_for_preview(df_hist, df_fix)
    
    if upload_type == 'history' and not df_hist.empty:
        print("  [DEBUG] Menyinkronkan fitur ekstensif dengan data yang sudah ada...")
        df_hist['synced_ext_features'] = None
        df_hist['synced_ext_features'] = df_hist['synced_ext_features'].astype(object)
        hist_dates = df_hist['Date'].dt.date.tolist()
        fixture_qs = UpcomingFixture.objects.filter(date__date__in=hist_dates)
        fixture_map = {f"{f.date.strftime('%Y-%m-%d')}_{f.home_team.name}_{f.away_team.name}": f for f in fixture_qs}
        
        for idx, row in df_hist.iterrows():
            m_key = f"{row['Date'].strftime('%Y-%m-%d')}_{row['HomeTeam']}_{row['AwayTeam']}"
            if m_key in fixture_map:
                f_obj = fixture_map[m_key]
                df_hist.at[idx, 'prob_FTR_H'] = f_obj.prob_ftr_h
                df_hist.at[idx, 'prob_FTR_D'] = f_obj.prob_ftr_d
                df_hist.at[idx, 'prob_FTR_A'] = f_obj.prob_ftr_a
                df_hist.at[idx, 'prob_OU25_Yes'] = f_obj.prob_ou25_over
                df_hist.at[idx, 'AvgH'] = f_obj.avg_h
                df_hist.at[idx, 'AvgD'] = f_obj.avg_d
                df_hist.at[idx, 'AvgA'] = f_obj.avg_a
                df_hist.at[idx, 'Avg>2.5'] = f_obj.avg_over_25
                df_hist.at[idx, 'Avg<2.5'] = f_obj.avg_under_25
                df_hist.at[idx, 'has_value_bet'] = f_obj.has_value_bet
                df_hist.at[idx, 'rl_pick_ftr'] = f_obj.rl_pick_ftr
                df_hist.at[idx, 'rl_action_ftr'] = f_obj.rl_action_ftr
                df_hist.at[idx, 'rl_stake_ftr'] = f_obj.rl_stake_ftr
                if pd.notna(row.get('FTR')) and f_obj.rl_pick_ftr and f_obj.rl_pick_ftr != 'Skip':
                    df_hist.at[idx, 'is_won_ftr'] = (f_obj.rl_pick_ftr == row.get('FTR'))
                else:
                    df_hist.at[idx, 'is_won_ftr'] = None
                df_hist.at[idx, 'has_value_bet_ou'] = f_obj.has_value_bet_ou
                df_hist.at[idx, 'rl_pick_ou'] = f_obj.rl_pick_ou
                df_hist.at[idx, 'rl_action_ou'] = f_obj.rl_action_ou
                df_hist.at[idx, 'rl_stake_ou'] = f_obj.rl_stake_ou
                if pd.notna(row.get('FTHG')) and pd.notna(row.get('FTAG')) and f_obj.rl_pick_ou and f_obj.rl_pick_ou != 'Skip':
                    actual_ou = 'Over 2.5' if (row.get('FTHG') + row.get('FTAG') > 2.5) else 'Under 2.5'
                    df_hist.at[idx, 'is_won_ou'] = (f_obj.rl_pick_ou == actual_ou)
                else:
                    df_hist.at[idx, 'is_won_ou'] = None
                df_hist.at[idx, 'part_of_parlay'] = f_obj.part_of_parlay
                if f_obj.parlay_ticket_info:
                    df_hist.at[idx, 'parlay_ticket_info'] = f_obj.parlay_ticket_info.replace('PRLY-F-', 'PRLY-H-')
                else:
                    df_hist.at[idx, 'parlay_ticket_info'] = None
                ext = f_obj.extended_features.copy() if f_obj.extended_features else {}
                ext['FTHG'] = row.get('FTHG')
                ext['FTAG'] = row.get('FTAG')
                ext['FTR'] = row.get('FTR')
                df_hist.at[idx, 'synced_ext_features'] = ext
                
    df_hist.to_pickle(os.path.join(settings.BASE_DIR, 'temp_hist_processed.pkl'))
    df_fix.to_pickle(os.path.join(settings.BASE_DIR, 'temp_fix_processed.pkl'))
    
    print("  [DEBUG] Sinkronisasi ML selesai, meneruskan ke proses Database...")
    return commit_uploaded_data(upload_type)

@transaction.atomic
def process_and_save_data(df: pd.DataFrame, skip_weather: bool = False):
    df = parse_csv_datetime(df)
    df_history, df_fixture = run_feature_engineering_pipeline(df, upload_type='mixed', skip_weather=skip_weather)
    return save_to_db(df_history, df_fixture)

@transaction.atomic
def process_preprocessed_data(file_path):
    df = pd.read_csv(file_path, low_memory=False)
    df = parse_csv_datetime(df)
    df_history, df_fixture = run_feature_engineering_pipeline(df, upload_type='mixed', skip_weather=False)
    return save_to_db(df_history, df_fixture)

def save_to_db(df_history, df_fixture):
    league_objs = {code: League.objects.get_or_create(code=code, defaults={'name': name, 'country': 'Eropa'})[0] for code, name in LEAGUE_NAMES.items()}
    all_teams = set(df_history['HomeTeam'].unique()) if not df_history.empty else set()
    if not df_fixture.empty: all_teams |= set(df_fixture['HomeTeam'].unique()) | set(df_fixture['AwayTeam'].unique())
    team_objs = {name: Team.objects.get_or_create(name=name, defaults={'league': list(league_objs.values())[0]})[0] for name in all_teams if isinstance(name, str)}
    
    df_history, df_fixture = run_ml_predictions_for_preview(df_history, df_fixture)
    
    MatchHistory.objects.all().delete()
    UpcomingFixture.objects.all().delete()
    ParlayTicket.objects.all().delete()
    
    for is_hist, df_source in [(True, df_history), (False, df_fixture)]:
        if df_source.empty: continue
        df_parlay_only = df_source[df_source['part_of_parlay'] == True].copy()
        if df_parlay_only.empty: continue
        for t_info, group in df_parlay_only.groupby('parlay_ticket_info'):
            legs_odds, legs_prob, legs_won, legs_details = [], [], [], []
            for _, r in group.iterrows():
                odds = extract_odds(r)
                date_str = r['Date'].strftime('%Y-%m-%dT%H:%M:%S') if pd.notnull(r.get('Date')) else None
                
                if r['edge_ftr'] >= r['edge_ou']:
                    pick = r['rl_pick_ftr']
                    leg_odd = odds.get(pick) if odds.get(pick) else odds['H']
                    legs_odds.append(leg_odd)
                    legs_prob.append(r['prob_FTR_H'] if pick == 'H' else (r['prob_FTR_D'] if pick == 'D' else r['prob_FTR_A']))
                    
                    won_status = None
                    if pd.notnull(r.get('is_won_ftr')): won_status = bool(r['is_won_ftr'])
                    
                    legs_won.append(won_status)
                    legs_details.append({
                        "match": f"{r['HomeTeam']} vs {r['AwayTeam']}", 
                        "pick": pick, 
                        "odds": leg_odd,
                        "date": date_str,
                        "is_won": won_status
                    })
                else:
                    pick = r['rl_pick_ou']
                    leg_odd = odds['O25'] if pick == 'Over 2.5' else odds['U25']
                    legs_odds.append(leg_odd)
                    legs_prob.append(r['prob_OU25_Yes'] if pick == 'Over 2.5' else (1.0 - r['prob_OU25_Yes']))
                    
                    won_status = None
                    if pd.notnull(r.get('is_won_ou')): won_status = bool(r['is_won_ou'])
                    
                    legs_won.append(won_status)
                    legs_details.append({
                        "match": f"{r['HomeTeam']} vs {r['AwayTeam']}", 
                        "pick": pick, 
                        "odds": leg_odd,
                        "date": date_str,
                        "is_won": won_status
                    })
                    
            ticket_won = None
            if is_hist:
                if any(x is False for x in legs_won): ticket_won = False
                elif all(x is True for x in legs_won): ticket_won = True
                
            ParlayTicket.objects.create(ticket_id=t_info, date=group['Date'].iloc[0].date() if pd.notnull(group['Date'].iloc[0]) else None, total_odds=float(np.prod(legs_odds)), total_prob=float(np.prod(legs_prob)), is_won=ticket_won, is_historical=is_hist, legs_details=legs_details)
            
    history_inserts = []
    for _, row in df_history.iterrows():
        if row['Div'] not in league_objs or row['HomeTeam'] not in team_objs or row['AwayTeam'] not in team_objs: continue
        odds = extract_odds(row)
        ext_feat = row.get('synced_ext_features')
        if not isinstance(ext_feat, dict): ext_feat = clean_json_dict(row.to_dict())
        history_inserts.append(MatchHistory(
            league=league_objs[row['Div']], date=make_aware_dt(row['Date']), home_team=team_objs[row['HomeTeam']], away_team=team_objs[row['AwayTeam']], fthg=row.get('FTHG'), ftag=row.get('FTAG'), ftr=row.get('FTR'),
            avg_h=odds['H'], avg_d=odds['D'], avg_a=odds['A'], avg_over_25=odds['O25'], avg_under_25=odds['U25'],
            prob_ftr_h=row.get('prob_FTR_H', 0.0), prob_ftr_d=row.get('prob_FTR_D', 0.0), prob_ftr_a=row.get('prob_FTR_A', 0.0), prob_ou25_over=row.get('prob_OU25_Yes', 0.0), prob_ou25_under=1.0 - row.get('prob_OU25_Yes', 0.0) if row.get('prob_OU25_Yes', 0.0) > 0 else 0.0,
            has_value_bet=row.get('has_value_bet', False), rl_pick_ftr=row.get('rl_pick_ftr'), rl_action_ftr=row.get('rl_action_ftr', 'Skip'), rl_stake_ftr=row.get('rl_stake_ftr', 0.0), is_won_ftr=row.get('is_won_ftr'),
            has_value_bet_ou=row.get('has_value_bet_ou', False), rl_pick_ou=row.get('rl_pick_ou'), rl_action_ou=row.get('rl_action_ou', 'Skip'), rl_stake_ou=row.get('rl_stake_ou', 0.0), is_won_ou=row.get('is_won_ou'),
            part_of_parlay=row.get('part_of_parlay', False), parlay_ticket_info=row.get('parlay_ticket_info'), extended_features=ext_feat
        ))
    MatchHistory.objects.bulk_create(history_inserts, batch_size=1000)
    
    fixture_inserts = []
    for _, row in df_fixture.iterrows():
        if row['Div'] not in league_objs or row['HomeTeam'] not in team_objs or row['AwayTeam'] not in team_objs: continue
        odds = extract_odds(row)
        fixture_inserts.append(UpcomingFixture(
            league=league_objs[row['Div']], date=make_aware_dt(row['Date']), home_team=team_objs[row['HomeTeam']], away_team=team_objs[row['AwayTeam']],
            avg_h=odds['H'], avg_d=odds['D'], avg_a=odds['A'], avg_over_25=odds['O25'], avg_under_25=odds['U25'],
            prob_ftr_h=row.get('prob_FTR_H', 0.0), prob_ftr_d=row.get('prob_FTR_D', 0.0), prob_ftr_a=row.get('prob_FTR_A', 0.0), prob_ou25_over=row.get('prob_OU25_Yes', 0.0), prob_ou25_under=1.0 - row.get('prob_OU25_Yes', 0.0) if row.get('prob_OU25_Yes', 0.0) > 0 else 0.0,
            has_value_bet=row.get('has_value_bet', False), rl_pick_ftr=row.get('rl_pick_ftr'), rl_action_ftr=row.get('rl_action_ftr', 'Skip'), rl_stake_ftr=row.get('rl_stake_ftr', 0.0), is_won_ftr=row.get('is_won_ftr'),
            has_value_bet_ou=row.get('has_value_bet_ou', False), rl_pick_ou=row.get('rl_pick_ou'), rl_action_ou=row.get('rl_action_ou', 'Skip'), rl_stake_ou=row.get('rl_stake_ou', 0.0), is_won_ou=row.get('is_won_ou'),
            part_of_parlay=row.get('part_of_parlay', False), parlay_ticket_info=row.get('parlay_ticket_info'), extended_features=clean_json_dict(row.to_dict()), is_processed=True
        ))
    UpcomingFixture.objects.bulk_create(fixture_inserts, batch_size=500)
    
    return len(history_inserts), len(fixture_inserts)