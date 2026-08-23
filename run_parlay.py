# import pandas as pd
# import numpy as np
# from pathlib import Path
# import warnings
# warnings.filterwarnings('ignore')

# from config import SPLIT_RATIOS, KELLY_FRACTION
# from src.betting.core import detect_value_bets
# from src.betting.rl import load_agent, BettingState, ACTIONS

# def combo_kelly(combo_prob: float, combo_odds: float, fraction: float = KELLY_FRACTION) -> float:
#     if combo_odds <= 1.0 or combo_prob <= 0:
#         return 0.0
#     b = combo_odds - 1.0
#     q = 1.0 - combo_prob
#     f = (combo_prob * b - q) / b
#     return max(0.0, f * fraction)

# def main():
#     print("=== TAHAP 1: MEMUAT DATA & PREDIKSI ===")
#     df = pd.read_csv("./data/enriched/final_training_dataset.csv", low_memory=False)
#     df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
#     df = df.sort_values('Date').dropna(subset=['Date', 'FTHG', 'FTAG', 'FTR']).reset_index(drop=True)

#     train_idx = int(len(df) * SPLIT_RATIOS['train'])
#     val_idx = int(len(df) * (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']))
#     test_df = df.iloc[val_idx:].reset_index(drop=True)
#     preds_df = pd.read_csv("./data/cache/test_predictions.csv")

#     all_bets = []
#     for idx, row in test_df.iterrows():
#         pred_row = preds_df.iloc[idx]
#         odds_dict = {
#             'H': row.get('AvgH', np.nan),
#             'D': row.get('AvgD', np.nan),
#             'A': row.get('AvgA', np.nan)
#         }
#         model_probs = np.array([pred_row['prob_FTR_H'], pred_row['prob_FTR_D'], pred_row['prob_FTR_A']])
#         bets = detect_value_bets(model_probs, odds_dict, label_names=['H', 'D', 'A'])
        
#         for b in bets:
#             b['match'] = f"{row['HomeTeam']} vs {row['AwayTeam']}"
#             b['date'] = row['Date']
#             b['won'] = (b['outcome'] == row['FTR'])
#             all_bets.append(b)

#     df_bets = pd.DataFrame(all_bets)
#     df_bets['day'] = df_bets['date'].dt.date 

#     print("=== TAHAP 2: MEMUAT RL AGENT & MENYARING PERTANDINGAN ===")
#     agent = load_agent('rl_agent_FTR')
#     MODAL_AWAL = 50000.0
    
#     filtered_bets = []
#     for bet in df_bets.to_dict('records'):
#         state = BettingState.discretize(bet['edge'], bet['ev'], bet['kelly_frac'], 1.0)
#         action = agent.best_action(state)
#         if action > 0: 
#             filtered_bets.append(bet)

#     df_filtered = pd.DataFrame(filtered_bets)
#     print(f"Laga disetujui RL Agent: {len(df_filtered)} dari {len(df_bets)} total value bets.")

#     print("\n=== TAHAP 3: SIMULASI GROUP BET (PARLAY 4 LAGA) ===")
#     COMBO_SIZE = 4
#     sim_bankroll = MODAL_AWAL
#     combo_history = []

#     grouped = df_filtered.groupby('day')
    
#     for day, group in grouped:
#         group_sorted = group.sort_values(by='edge', ascending=False)
        
#         while len(group_sorted) >= COMBO_SIZE:
#             combo_legs = group_sorted.head(COMBO_SIZE).to_dict('records')
#             group_sorted = group_sorted.iloc[COMBO_SIZE:]
            
#             combo_odds = np.prod([leg['bookie_odds'] for leg in combo_legs])
#             combo_prob = np.prod([leg['model_prob'] for leg in combo_legs])
#             combo_won = all([leg['won'] for leg in combo_legs])
            
#             c_kelly = combo_kelly(combo_prob, combo_odds, fraction=0.10) 
            
#             if c_kelly > 0:
#                 stake = sim_bankroll * c_kelly
#                 if combo_won:
#                     profit = stake * (combo_odds - 1)
#                     sim_bankroll += profit
#                 else:
#                     profit = -stake
#                     sim_bankroll += profit
                    
#                 combo_history.append({
#                     'date': day,
#                     'legs': [f"{l['match']} ({l['outcome']})" for l in combo_legs],
#                     'odds': combo_odds,
#                     'prob': combo_prob,
#                     'stake': stake,
#                     'profit': profit,
#                     'won': combo_won
#                 })

#     print(f"Total Tiket Parlay Dimainkan: {len(combo_history)}")
#     print(f"Simulasi Bankroll Awal      : Rp {MODAL_AWAL:,.2f}")
#     print(f"Simulasi Bankroll Akhir     : Rp {sim_bankroll:,.2f}")
#     print(f"Total Keuntungan (ROI)      : {((sim_bankroll - MODAL_AWAL) / MODAL_AWAL) * 100:.2f}%\n")

#     print("Contoh 3 Tiket Parlay Terakhir:")
#     for combo in combo_history[-3:]:
#         status = "MENANG" if combo['won'] else "KALAH"
#         print(f"\nTanggal: {combo['date']} | Status: {status}")
#         print(f"Total Odds: {combo['odds']:.2f} | Probabilitas: {combo['prob']*100:.2f}%")
#         print(f"Stake: Rp {combo['stake']:,.2f} | P/L: Rp {combo['profit']:,.2f}")
#         for leg in combo['legs']:
#             print(f" - {leg}")

# if __name__ == "__main__":
#     main()

import pandas as pd
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

from config import SPLIT_RATIOS, KELLY_FRACTION, REPORTS_DIR
from src.betting.core import detect_value_bets
from src.betting.rl import load_agent, BettingState, ACTIONS

def combo_kelly(combo_prob: float, combo_odds: float, fraction: float = KELLY_FRACTION) -> float:
    if combo_odds <= 1.0 or combo_prob <= 0:
        return 0.0
    b = combo_odds - 1.0
    q = 1.0 - combo_prob
    f = (combo_prob * b - q) / b
    return max(0.0, f * fraction)

def main():
    print("=== TAHAP 1: MEMUAT DATA & PREDIKSI (FTR & OU25) ===")
    df = pd.read_csv("./data/enriched/final_training_dataset.csv", low_memory=False)
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').dropna(subset=['Date', 'FTHG', 'FTAG', 'FTR']).reset_index(drop=True)

    train_idx = int(len(df) * SPLIT_RATIOS['train'])
    val_idx = int(len(df) * (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']))
    test_df = df.iloc[val_idx:].reset_index(drop=True)
    preds_df = pd.read_csv("./data/cache/test_predictions.csv")

    all_bets = []
    for idx, row in test_df.iterrows():
        pred_row = preds_df.iloc[idx]
        
        odds_dict_ftr = {
            'H': row.get('AvgH', np.nan),
            'D': row.get('AvgD', np.nan),
            'A': row.get('AvgA', np.nan)
        }
        model_probs_ftr = np.array([pred_row['prob_FTR_H'], pred_row['prob_FTR_D'], pred_row['prob_FTR_A']])
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
    df_bets['day'] = df_bets['date'].dt.date 

    print("=== TAHAP 2: MEMUAT RL AGENT & MENYARING PERTANDINGAN ===")
    agent = load_agent('rl_agent_FTR_OU')
    MODAL_AWAL = 50000.0
    
    filtered_bets = []
    for bet in df_bets.to_dict('records'):
        state = BettingState.discretize(bet['edge'], bet['ev'], bet['kelly_frac'], 1.0)
        action = agent.best_action(state)
        if action > 0: 
            filtered_bets.append(bet)

    df_filtered = pd.DataFrame(filtered_bets)
    print(f"Taruhan disetujui RL Agent: {len(df_filtered)} dari {len(df_bets)} total value bets.")

    print("\n=== TAHAP 3: SIMULASI GROUP BET (PARLAY 4 LAGA) ===")
    COMBO_SIZE = 4
    sim_bankroll = MODAL_AWAL
    bankroll_history = [MODAL_AWAL]
    combo_history = []

    grouped = df_filtered.groupby('day')
    
    for day, group in grouped:
        group_sorted = group.sort_values(by='edge', ascending=False)
        
        while len(group_sorted) >= COMBO_SIZE:
            combo_legs = group_sorted.head(COMBO_SIZE).to_dict('records')
            group_sorted = group_sorted.iloc[COMBO_SIZE:]
            
            combo_odds = np.prod([leg['bookie_odds'] for leg in combo_legs])
            combo_prob = np.prod([leg['model_prob'] for leg in combo_legs])
            combo_won = all([leg['won'] for leg in combo_legs])
            
            c_kelly = combo_kelly(combo_prob, combo_odds, fraction=0.10) 
            
            if c_kelly > 0:
                stake = sim_bankroll * c_kelly
                if combo_won:
                    profit = stake * (combo_odds - 1)
                else:
                    profit = -stake
                
                sim_bankroll += profit
                bankroll_history.append(sim_bankroll)
                
                combo_history.append({
                    'date': day,
                    'legs': [f"{l['match']} ({l['outcome']})" for l in combo_legs],
                    'odds': combo_odds,
                    'prob': combo_prob,
                    'stake': stake,
                    'profit_loss': profit,
                    'running_bankroll': sim_bankroll,
                    'won': combo_won
                })

    df_combos = pd.DataFrame(combo_history)
    
    csv_path = REPORTS_DIR / "parlay_bets_history.csv"
    df_combos.to_csv(csv_path, index=False)
    
    plt.figure(figsize=(10, 6))
    plt.plot(bankroll_history, color='orange', linewidth=2)
    plt.title('Simulasi Pertumbuhan Bankroll (Parlay 4 Laga)')
    plt.xlabel('Jumlah Tiket Parlay')
    plt.ylabel('Bankroll (Rp)')
    plt.grid(True)
    chart_path = REPORTS_DIR / "charts" / "bankroll_parlay_bet.png"
    plt.savefig(chart_path)
    plt.close()

    print(f"Total Tiket Parlay Dimainkan: {len(combo_history)}")
    print(f"Simulasi Bankroll Awal      : Rp {MODAL_AWAL:,.2f}")
    print(f"Simulasi Bankroll Akhir     : Rp {sim_bankroll:,.2f}")
    print(f"Total Keuntungan (ROI)      : {((sim_bankroll - MODAL_AWAL) / MODAL_AWAL) * 100:.2f}%\n")
    print(f"-> Histori parlay disimpan di: {csv_path}")
    print(f"-> Grafik bankroll disimpan di: {chart_path}\n")

    print("Contoh 3 Tiket Parlay Terakhir:")
    for combo in combo_history[-3:]:
        status = "MENANG" if combo['won'] else "KALAH"
        print(f"\nTanggal: {combo['date']} | Status: {status}")
        print(f"Total Odds: {combo['odds']:.2f} | Probabilitas: {combo['prob']*100:.2f}%")
        print(f"Stake: Rp {combo['stake']:,.2f} | P/L: Rp {combo['profit_loss']:,.2f}")
        for leg in combo['legs']:
            print(f" - {leg}")

if __name__ == "__main__":
    main()