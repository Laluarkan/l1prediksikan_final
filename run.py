import pandas as pd
from src.loader import load_raw
from src.enrichment.pipeline import run_enrichment
from src.features import build_features, build_rolling_features, build_elo_features

def main():
    print("=== TAHAP 1: MEMUAT DATA MENTAH ===")
    raw_res = load_raw()
    raw_df = raw_res[0] if isinstance(raw_res, tuple) else raw_res
    
    print("\n=== TAHAP 2: PENGAYAAN DATA (STANDINGS & WEATHER) ===")
    enriched_res = run_enrichment(raw_df, skip_weather=False, force=False)
    enriched_df = enriched_res[0] if isinstance(enriched_res, tuple) else enriched_res
    
    print("\n=== TAHAP 3: MENGHITUNG FITUR ELO RATINGS ===")
    df_with_elo = build_elo_features(enriched_df)
    
    print("\n=== TAHAP 4: FEATURE ENGINEERING (ODDS & ROLLING METRICS) ===")
    odds_res = build_features(df_with_elo)
    df_with_odds = odds_res[0] if isinstance(odds_res, tuple) else odds_res
    
    final_res = build_rolling_features(df_with_odds)
    final_df = final_res[0] if isinstance(final_res, tuple) else final_res
    
    output_path = "./data/enriched/final_training_dataset.csv"
    final_df.to_csv(output_path, index=False)
    print(f"\nProses Selesai! Dataset final siap latih disimpan di: {output_path}")
    print(f"Dimensi dataset final: {final_df.shape[0]} baris, {final_df.shape[1]} fitur.")

if __name__ == "__main__":
    main()