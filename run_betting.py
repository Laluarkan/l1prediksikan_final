# import pandas as pd
# import numpy as np
# from pathlib import Path
# import warnings
# warnings.filterwarnings('ignore')

# from config import SPLIT_RATIOS
# from src.betting.core import detect_value_bets, profitability_summary
# from src.betting.rl import train_rl_agent, save_agent, rl_recommend

# def main():
#     print("=== TAHAP 1: MEMUAT DATA ODDS & PREDIKSI MODEL ===")
#     df = pd.read_csv("./data/enriched/final_training_dataset.csv", low_memory=False)
#     df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
#     df = df.sort_values('Date').dropna(subset=['Date', 'FTHG', 'FTAG', 'FTR']).reset_index(drop=True)

#     train_idx = int(len(df) * SPLIT_RATIOS['train'])
#     val_idx = int(len(df) * (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']))
#     test_df = df.iloc[val_idx:].reset_index(drop=True)

#     preds_df = pd.read_csv("./data/cache/test_predictions.csv")

#     print("\n=== TAHAP 2: DETEKSI VALUE BETS PADA DATA TEST (FTR) ===")
#     all_bets = []
    
#     for idx, row in test_df.iterrows():
#         pred_row = preds_df.iloc[idx]
        
#         odds_dict = {
#             'H': row.get('AvgH', np.nan),
#             'D': row.get('AvgD', np.nan),
#             'A': row.get('AvgA', np.nan)
#         }
        
#         model_probs = np.array([
#             pred_row['prob_FTR_H'],
#             pred_row['prob_FTR_D'],
#             pred_row['prob_FTR_A']
#         ])

#         bets = detect_value_bets(model_probs, odds_dict, label_names=['H', 'D', 'A'])
#         actual_ftr = row['FTR']
        
#         for b in bets:
#             b['match'] = f"{row['HomeTeam']} vs {row['AwayTeam']}"
#             b['date'] = row['Date']
#             b['won'] = (b['outcome'] == actual_ftr)
#             all_bets.append(b)

#     df_bets = pd.DataFrame(all_bets)
#     summary = profitability_summary(df_bets.to_dict('records'))
    
#     print(f"Total Value Bets Ditemukan : {summary['n_bets']} pertandingan")
#     print(f"Total Expected Value (EV)  : {summary['total_ev']}")
#     print(f"Rata-rata Edge Pasar       : {summary['avg_edge'] * 100:.2f}%")

#     MODAL_AWAL = 50000.0

#     print("\n=== TAHAP 3: MELATIH RL AGENT DENGAN HISTORI BETTING ===")
#     agent = train_rl_agent(df_bets, n_episodes=2000, init_bankroll=MODAL_AWAL)
#     save_agent(agent, 'rl_agent_FTR')

#     print("\n=== TAHAP 4: HASIL REKOMENDASI & SIMULASI RL AGENT ===")
#     recoms = rl_recommend(agent, df_bets.to_dict('records'), bankroll=MODAL_AWAL, init_bankroll=MODAL_AWAL)
#     df_recoms = pd.DataFrame(recoms)

#     sim_bankroll = MODAL_AWAL
#     for r in recoms:
#         if r['won']:
#             sim_bankroll += r['rl_stake'] * (r['bookie_odds'] - 1)
#         else:
#             sim_bankroll -= r['rl_stake']

#     print(f"Simulasi Bankroll Awal  : Rp {MODAL_AWAL:,.2f}")
#     print(f"Simulasi Bankroll Akhir : Rp {sim_bankroll:,.2f}")
#     print(f"Total Keuntungan (ROI)  : {((sim_bankroll - MODAL_AWAL) / MODAL_AWAL) * 100:.2f}%\n")

#     print("Contoh 5 Rekomendasi Taruhan Teratas dari Agent:")
#     top_bets = df_recoms.sort_values(by='edge', ascending=False).head(5)
#     for idx, row in top_bets.iterrows():
#         print(f"- Match : {row['match']} ({row['date'].strftime('%Y-%m-%d')})")
#         print(f"  Pick  : {row['outcome']} | Odds: {row['bookie_odds']} | Edge: {row['edge']*100:.2f}%")
#         print(f"  Action: {row['rl_description']}")

# if __name__ == "__main__":
#     main()

import pandas as pd
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

from config import SPLIT_RATIOS, REPORTS_DIR
from src.betting.core import detect_value_bets, profitability_summary
from src.betting.rl import train_rl_agent, save_agent, rl_recommend

def main():
    print("=== TAHAP 1: MEMUAT DATA ODDS & PREDIKSI MODEL ===")
    df = pd.read_csv("./data/enriched/final_training_dataset.csv", low_memory=False)
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').dropna(subset=['Date', 'FTHG', 'FTAG', 'FTR']).reset_index(drop=True)

    train_idx = int(len(df) * SPLIT_RATIOS['train'])
    val_idx = int(len(df) * (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']))
    test_df = df.iloc[val_idx:].reset_index(drop=True)

    preds_df = pd.read_csv("./data/cache/test_predictions.csv")

    print("\n=== TAHAP 2: DETEKSI VALUE BETS (FTR & OU25) ===")
    all_bets = []
    
    for idx, row in test_df.iterrows():
        pred_row = preds_df.iloc[idx]
        
        odds_dict_ftr = {
            'H': row.get('AvgH', np.nan),
            'D': row.get('AvgD', np.nan),
            'A': row.get('AvgA', np.nan)
        }
        model_probs_ftr = np.array([
            pred_row['prob_FTR_H'],
            pred_row['prob_FTR_D'],
            pred_row['prob_FTR_A']
        ])

        bets_ftr = detect_value_bets(model_probs_ftr, odds_dict_ftr, label_names=['H', 'D', 'A'])
        for b in bets_ftr:
            b['match'] = f"{row['HomeTeam']} vs {row['AwayTeam']}"
            b['date'] = row['Date']
            b['won'] = (b['outcome'] == row['FTR'])
            all_bets.append(b)

        odds_dict_ou = {
            'Over 2.5': row.get('Avg>2.5', np.nan),
            'Under 2.5': row.get('Avg<2.5', np.nan)
        }
        prob_over = pred_row['prob_OU25_Yes']
        model_probs_ou = np.array([prob_over, 1.0 - prob_over])
        
        bets_ou = detect_value_bets(model_probs_ou, odds_dict_ou, label_names=['Over 2.5', 'Under 2.5'])
        actual_ou = 'Over 2.5' if (row['FTHG'] + row['FTAG'] > 2.5) else 'Under 2.5'
        
        for b in bets_ou:
            b['match'] = f"{row['HomeTeam']} vs {row['AwayTeam']} (OU25)"
            b['date'] = row['Date']
            b['won'] = (b['outcome'] == actual_ou)
            all_bets.append(b)

    df_bets = pd.DataFrame(all_bets)
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
    
    csv_path = REPORTS_DIR / "single_bets_history.csv"
    df_recoms.to_csv(csv_path, index=False)
    
    plt.figure(figsize=(10, 6))
    plt.plot(bankroll_history, color='blue', linewidth=2)
    plt.title('Simulasi Pertumbuhan Bankroll (Single Bet)')
    plt.xlabel('Jumlah Taruhan')
    plt.ylabel('Bankroll (Rp)')
    plt.grid(True)
    chart_path = REPORTS_DIR / "charts" / "bankroll_single_bet.png"
    plt.savefig(chart_path)
    plt.close()

    print(f"Simulasi Bankroll Awal  : Rp {MODAL_AWAL:,.2f}")
    print(f"Simulasi Bankroll Akhir : Rp {sim_bankroll:,.2f}")
    print(f"Total Keuntungan (ROI)  : {((sim_bankroll - MODAL_AWAL) / MODAL_AWAL) * 100:.2f}%\n")
    print(f"-> Histori taruhan disimpan di: {csv_path}")
    print(f"-> Grafik bankroll disimpan di: {chart_path}\n")

    print("Contoh 5 Rekomendasi Taruhan Teratas dari Agent:")
    top_bets = df_recoms.sort_values(by='edge', ascending=False).head(5)
    for idx, row in top_bets.iterrows():
        print(f"- Match : {row['match']} ({row['date'].strftime('%Y-%m-%d')})")
        print(f"  Pick  : {row['outcome']} | Odds: {row['bookie_odds']} | Edge: {row['edge']*100:.2f}%")
        print(f"  Action: {row['rl_description']}")

if __name__ == "__main__":
    main()