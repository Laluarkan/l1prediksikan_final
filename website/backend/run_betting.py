import os
import sys
import re
from pathlib import Path

# -- PATH INJECTION: Mencegah ModuleNotFoundError --
BACKEND_DIR = Path(__file__).resolve().parent
SRC_DIR = BACKEND_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
# --------------------------------------------------

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
import warnings
warnings.filterwarnings('ignore')

from config import SPLIT_RATIOS, REPORTS_DIR
from src.betting.core import detect_value_bets, profitability_summary
from src.betting.rl import train_rl_agent, save_agent, rl_recommend

def main():
    print("=== TAHAP 1: MEMUAT DATA ODDS & MODEL AI TERBARU ===")
    
    # Menggunakan BACKEND_DIR agar path selalu absolut dan anti-error
    dataset_path = BACKEND_DIR / "data" / "enriched" / "final_training_dataset.csv"
    
    if not dataset_path.exists():
        print(f"❌ Error: File dataset tidak ditemukan di {dataset_path}!")
        return

    df = pd.read_csv(dataset_path, low_memory=False)
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').dropna(subset=['Date', 'FTHG', 'FTAG', 'FTR']).reset_index(drop=True)

    train_idx = int(len(df) * SPLIT_RATIOS['train'])
    val_idx = int(len(df) * (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']))
    test_df = df.iloc[val_idx:].reset_index(drop=True)

    print("-> Memuat otak model FTR dan OU25 yang baru dilatih...")
    model_dir = BACKEND_DIR / "models" / "global"
    try:
        lgbm_ftr = joblib.load(model_dir / 'lgbm_global_FTR.pkl')
        lgbm_ou = joblib.load(model_dir / 'lgbm_global_OU25.pkl')
    except Exception as e:
        print(f"❌ Error: Gagal memuat file .pkl model. Pastikan train_global.py sudah sukses. Detail: {e}")
        return

    print("\n=== TAHAP 2: PREDIKSI & DETEKSI VALUE BETS PADA DATA TEST ===")
    
    # Fungsi pembersih nama kolom untuk mencegah Data Leakage
    def clean_col_name(col):
        c = str(col).replace('>', '_over_').replace('<', '_under_')
        c = re.sub(r'[^\w]', '_', c)
        return re.sub(r'_+', '_', c).strip('_')
        
    X_predict = test_df.rename(columns=clean_col_name)
    
    # Memastikan urutan fitur sesuai dengan yang diminta model FTR
    feat_cols_ftr = lgbm_ftr.feature_name_
    missing_ftr = set(feat_cols_ftr) - set(X_predict.columns)
    for c in missing_ftr: X_predict[c] = np.nan
    X_ftr = X_predict.reindex(columns=feat_cols_ftr, fill_value=np.nan)
    probs_ftr_all = lgbm_ftr.predict_proba(X_ftr)

    # Memastikan urutan fitur sesuai dengan yang diminta model OU25
    feat_cols_ou = lgbm_ou.feature_name_
    missing_ou = set(feat_cols_ou) - set(X_predict.columns)
    for c in missing_ou: X_predict[c] = np.nan
    X_ou = X_predict.reindex(columns=feat_cols_ou, fill_value=np.nan)
    probs_ou_all = lgbm_ou.predict_proba(X_ou)

    all_bets = []
    
    for idx, row in test_df.iterrows():
        # 1. Evaluasi FTR
        odds_dict_ftr = {
            'H': row.get('AvgH', np.nan),
            'D': row.get('AvgD', np.nan),
            'A': row.get('AvgA', np.nan)
        }
        # INGAT: Model FTR dilatih dengan kelas [0=A, 1=D, 2=H]
        model_probs_ftr = np.array([
            probs_ftr_all[idx, 2], # H (indeks 2)
            probs_ftr_all[idx, 1], # D (indeks 1)
            probs_ftr_all[idx, 0]  # A (indeks 0)
        ])

        bets_ftr = detect_value_bets(model_probs_ftr, odds_dict_ftr, label_names=['H', 'D', 'A'])
        for b in bets_ftr:
            b['match'] = f"{row['HomeTeam']} vs {row['AwayTeam']}"
            b['date'] = row['Date']
            b['won'] = (b['outcome'] == row['FTR'])
            all_bets.append(b)

        # 2. Evaluasi OU25
        odds_dict_ou = {
            'Over 2.5': row.get('Avg>2.5', np.nan),
            'Under 2.5': row.get('Avg<2.5', np.nan)
        }
        prob_over = probs_ou_all[idx, 1]
        model_probs_ou = np.array([prob_over, 1.0 - prob_over])
        
        bets_ou = detect_value_bets(model_probs_ou, odds_dict_ou, label_names=['Over 2.5', 'Under 2.5'])
        actual_ou = 'Over 2.5' if (row['FTHG'] + row['FTAG'] > 2.5) else 'Under 2.5'
        
        for b in bets_ou:
            b['match'] = f"{row['HomeTeam']} vs {row['AwayTeam']} (OU25)"
            b['date'] = row['Date']
            b['won'] = (b['outcome'] == actual_ou)
            all_bets.append(b)

    df_bets = pd.DataFrame(all_bets)
    if df_bets.empty:
        print("❌ Tidak ada Value Bet yang ditemukan pada data test.")
        return

    summary = profitability_summary(df_bets.to_dict('records'))
    
    print(f"Total Value Bets Ditemukan : {summary['n_bets']} taruhan")
    print(f"Total Expected Value (EV)  : {summary['total_ev']}")
    print(f"Rata-rata Edge Pasar       : {summary['avg_edge'] * 100:.2f}%")

    MODAL_AWAL = 50000.0

    print("\n=== TAHAP 3: MELATIH RL AGENT DENGAN HISTORI BETTING ===")
    agent = train_rl_agent(df_bets, n_episodes=2000, init_bankroll=MODAL_AWAL)
    save_agent(agent, 'rl_agent_FTR_OU')

    print("\n=== TAHAP 4: HASIL REKOMENDASI & SIMULASI RL AGENT ===")
    recoms = rl_recommend(agent, df_bets.to_dict('records'), bankroll=MODAL_AWAL, init_bankroll=MODAL_AWAL)

    sim_bankroll = MODAL_AWAL
    bankroll_history = [MODAL_AWAL]
    
    for r in recoms:
        if r['won']:
            profit = r['rl_stake'] * (r['bookie_odds'] - 1)
        else:
            profit = -r['rl_stake']
            
        sim_bankroll += profit
        bankroll_history.append(sim_bankroll)
        r['profit_loss'] = profit
        r['running_bankroll'] = sim_bankroll

    df_recoms = pd.DataFrame(recoms)
    
    # Memastikan folder reports dan charts tersedia
    csv_path = Path(REPORTS_DIR) / "single_bets_history.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df_recoms.to_csv(csv_path, index=False)
    
    plt.figure(figsize=(10, 6))
    plt.plot(bankroll_history, color='blue', linewidth=2)
    plt.title('Simulasi Pertumbuhan Bankroll (Single Bet)')
    plt.xlabel('Jumlah Taruhan')
    plt.ylabel('Bankroll (Rp)')
    plt.grid(True)
    
    chart_path = Path(REPORTS_DIR) / "charts" / "bankroll_single_bet.png"
    chart_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(chart_path)
    plt.close()

    # --- PENGHITUNGAN RASIO EKSEKUSI TARUHAN ---
    executed_bets = df_recoms[df_recoms['rl_stake'] > 0]
    n_total = len(df_recoms)
    n_exec = len(executed_bets)
    exec_rate = (n_exec / n_total) * 100 if n_total > 0 else 0

    print(f"Simulasi Bankroll Awal  : Rp {MODAL_AWAL:,.2f}")
    print(f"Simulasi Bankroll Akhir : Rp {sim_bankroll:,.2f}")
    print(f"Total Keuntungan (ROI)  : {((sim_bankroll - MODAL_AWAL) / MODAL_AWAL) * 100:.2f}%\n")
    
    print(f"-> Total Taruhan Dieksekusi : {n_exec} dari {n_total} Value Bets ({exec_rate:.1f}%)")
    print(f"-> Histori taruhan disimpan di: {csv_path}")
    print(f"-> Grafik bankroll disimpan di: {chart_path}\n")

    print("Contoh 5 Rekomendasi Taruhan AKTIF Teratas dari Agent:")
    if not executed_bets.empty:
        top_bets = executed_bets.sort_values(by='edge', ascending=False).head(5)
        for idx, row in top_bets.iterrows():
            print(f"- Match : {row['match']} ({row['date'].strftime('%Y-%m-%d')})")
            print(f"  Pick  : {row['outcome']} | Odds: {row['bookie_odds']} | Edge: {row['edge']*100:.2f}%")
            print(f"  Action: {row['rl_description']}")
    else:
        print("  (Tidak ada taruhan yang dieksekusi oleh Agent pada simulasi ini)")

if __name__ == "__main__":
    main()