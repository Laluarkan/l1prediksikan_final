import time
import pandas as pd
from pathlib import Path
from config import DATA_ENRICH
from src.enrichment.standings import build_standings_features
from src.enrichment.weather import build_weather_features


ENRICHED_PATH = DATA_ENRICH / "dataset_enriched.parquet"
ENRICHED_CSV  = DATA_ENRICH / "dataset_enriched.csv"


def run_enrichment(df: pd.DataFrame, skip_weather: bool = False,
                   force: bool = False) -> pd.DataFrame:
    if not force and ENRICHED_PATH.exists():
        print(f"Enriched dataset ditemukan: {ENRICHED_PATH}")
        return pd.read_parquet(ENRICHED_PATH)
    if not force and ENRICHED_CSV.exists():
        print(f"Enriched dataset ditemukan: {ENRICHED_CSV}")
        return pd.read_csv(ENRICHED_CSV, low_memory=False)

    print("[Enrichment 1/2] Building standings features...")
    t0 = time.time()
    df = build_standings_features(df)
    print(f"  Standings selesai ({time.time()-t0:.1f}s)")

    if not skip_weather:
        print("[Enrichment 2/2] Fetching weather features (Open-Meteo)...")
        print("  Estimasi waktu: ~30-60 menit untuk 17.000+ baris")
        t0 = time.time()
        df = build_weather_features(df)
        print(f"  Weather selesai ({time.time()-t0:.1f}s)")
    else:
        print("[Enrichment 2/2] Weather SKIPPED (skip_weather=True)")

    try:
        df.to_parquet(ENRICHED_PATH, index=False)
        print(f"Disimpan: {ENRICHED_PATH}")
    except Exception:
        df.to_csv(ENRICHED_CSV, index=False)
        print(f"Disimpan: {ENRICHED_CSV}")

    return df