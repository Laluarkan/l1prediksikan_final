from pathlib import Path
import numpy as np
import pandas as pd
from config import DATA_RAW, LEAGUES, SEASONS

COLS_1X2 = [
    'B365H','B365D','B365A','BWH','BWD','BWA','PSH','PSD','PSA',
    'MaxH','MaxD','MaxA','AvgH','AvgD','AvgA',
]
COLS_1X2_CLOSE = [
    'B365CH','B365CD','B365CA','BWCH','BWCD','BWCA','PSCH','PSCD','PSCA',
    'MaxCH','MaxCD','MaxCA','AvgCH','AvgCD','AvgCA',
]
COLS_OU = ['B365>2.5','B365<2.5','P>2.5','P<2.5','Max>2.5','Max<2.5','Avg>2.5','Avg<2.5']
COLS_OU_CLOSE = ['B365C>2.5','B365C<2.5','PC>2.5','PC<2.5','MaxC>2.5','MaxC<2.5','AvgC>2.5','AvgC<2.5']
COLS_AH = ['AHh','B365AHH','B365AHA','PAHH','PAHA','MaxAHH','MaxAHA','AvgAHH','AvgAHA']
COLS_AH_CLOSE = ['AHCh','B365CAHH','B365CAHA','PCAHH','PCAHA','MaxCAHH','MaxCAHA','AvgCAHH','AvgCAHA']
ALL_EXPECTED = COLS_1X2 + COLS_1X2_CLOSE + COLS_OU + COLS_OU_CLOSE + COLS_AH + COLS_AH_CLOSE


def _harmonize(df: pd.DataFrame, div: str, season: str) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.str.strip()
    if 'Div' not in df.columns or df['Div'].isna().all():
        df['Div'] = div
    if 'Season' not in df.columns:
        df['Season'] = season

    for col in ALL_EXPECTED:
        if col not in df.columns:
            df[col] = np.nan

    num_cols = ALL_EXPECTED + ['FTHG', 'FTAG', 'HTHG', 'HTAG']
    for col in num_cols:
        if col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(',', '.').str.strip()
            df[col] = pd.to_numeric(df[col], errors='coerce')

    for out in ['H', 'D', 'A']:
        for avg, fb in [(f'Avg{out}', f'Max{out}'), (f'AvgC{out}', f'MaxC{out}')]:
            if avg in df.columns and fb in df.columns:
                m = df[avg].isna() & df[fb].notna()
                df.loc[m, avg] = df.loc[m, fb]

    for side in ['>2.5', '<2.5']:
        for avg, fb in [(f'Avg{side}', f'B365{side}'), (f'AvgC{side}', f'B365C{side}')]:
            if avg in df.columns and fb in df.columns:
                m = df[avg].isna() & df[fb].notna()
                df.loc[m, avg] = df.loc[m, fb]

    for ah_avg, ah_max in [('AvgAHH','MaxAHH'),('AvgAHA','MaxAHA'),('AvgCAHH','MaxCAHH'),('AvgCAHA','MaxCAHA')]:
        if ah_avg in df.columns and ah_max in df.columns:
            m = df[ah_avg].isna() & df[ah_max].notna()
            df.loc[m, ah_avg] = df.loc[m, ah_max]

    for out in ['H', 'D', 'A']:
        c, o = f'AvgC{out}', f'Avg{out}'
        if c in df.columns and o in df.columns:
            m = df[c].isna() & df[o].notna()
            df.loc[m, c] = df.loc[m, o]

    return df


def load_raw(data_dir=None) -> pd.DataFrame:
    data_dir = Path(data_dir) if data_dir else DATA_RAW
    frames = []
    for path in sorted(data_dir.glob("*.csv")):
        try:
            stem = path.stem
            parts = stem.split('_')
            div = parts[0] if len(parts) >= 2 else 'UNK'
            season = parts[1] if len(parts) >= 2 else 'unknown'
            df = pd.read_csv(path, low_memory=False)
            df = _harmonize(df, div, season)
            frames.append(df)
        except Exception:
            continue
    if not frames:
        raise FileNotFoundError(f"Tidak ada CSV di {data_dir}")
    combined = pd.concat(frames, ignore_index=True)
    print(f"Loaded {len(combined):,} rows dari {len(frames)} file CSV")
    return combined