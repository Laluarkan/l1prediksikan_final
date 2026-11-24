import time
import numpy as np
import pandas as pd
import urllib.request
import json
from config import STADIUM_COORDS


def _fetch_open_meteo(lat: float, lon: float, date_str: str, hour: int = 15) -> dict:
    endpoints = [
        f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={date_str}&end_date={date_str}&hourly=temperature_2m,precipitation,windspeed_10m,weathercode&timezone=auto",
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&start_date={date_str}&end_date={date_str}&hourly=temperature_2m,precipitation,windspeed_10m,weathercode&timezone=auto",
    ]
    # Jika tanggal adalah hari ini atau masa depan, prioritaskan endpoint forecast terlebih dahulu
    try:
        import datetime
        if date_str >= datetime.date.today().strftime('%Y-%m-%d'):
            endpoints.reverse()
    except Exception:
        pass

    for url in endpoints:
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            hourly = data.get('hourly', {})
            times  = hourly.get('time', [])
            target_time = f"{date_str}T{hour:02d}:00"
            if target_time in times:
                i = times.index(target_time)
                t_val = hourly['temperature_2m'][i]
                if t_val is not None:
                    return {
                        'temperature':   t_val,
                        'precipitation': hourly['precipitation'][i] if hourly['precipitation'][i] is not None else 0.0,
                        'windspeed':     hourly['windspeed_10m'][i] if hourly['windspeed_10m'][i] is not None else 10.0,
                        'weathercode':   hourly['weathercode'][i] if hourly['weathercode'][i] is not None else 1,
                    }
            temps = hourly.get('temperature_2m', [])
            prec  = hourly.get('precipitation', [])
            wind  = hourly.get('windspeed_10m', [])
            wcode = hourly.get('weathercode', [])
            if temps:
                mid = min(hour, len(temps) - 1)
                if temps[mid] is not None:
                    return {
                        'temperature':   temps[mid],
                        'precipitation': prec[mid] if (prec and prec[mid] is not None) else 0.0,
                        'windspeed':     wind[mid] if (wind and wind[mid] is not None) else 10.0,
                        'weathercode':   wcode[mid] if (wcode and wcode[mid] is not None) else 1,
                    }
        except Exception:
            continue
    return {'temperature': 15.0, 'precipitation': 0.0, 'windspeed': 10.0, 'weathercode': 1}


def build_weather_features(df: pd.DataFrame, delay: float = 0.3) -> pd.DataFrame:
    print("  [DEBUG] Memulai pengambilan data cuaca dari Open-Meteo...")
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')

    weather_cols = ['weather_temp', 'weather_precip', 'weather_wind',
                    'weather_code', 'weather_is_rain', 'weather_is_cold']
    for col in weather_cols:
        df[col] = np.nan

    cache: dict = {}
    total = len(df)

    for idx, row in df.iterrows():
        div  = str(row.get('Div', 'UNK'))
        date = row['Date']
        if pd.isna(date):
            continue

        date_str = date.strftime('%Y-%m-%d')
        cache_key = (div, date_str)

        if cache_key not in cache:
            coords = STADIUM_COORDS.get(div, (51.5, -0.1))
            w = _fetch_open_meteo(coords[0], coords[1], date_str)
            cache[cache_key] = w
            time.sleep(delay)

        w = cache[cache_key]
        df.at[idx, 'weather_temp']    = w['temperature']
        df.at[idx, 'weather_precip']  = w['precipitation']
        df.at[idx, 'weather_wind']    = w['windspeed']
        df.at[idx, 'weather_code']    = w['weathercode']
        df.at[idx, 'weather_is_rain'] = int(w['precipitation'] > 1.0) if not np.isnan(w['precipitation']) else np.nan
        df.at[idx, 'weather_is_cold'] = int(w['temperature'] < 5.0)   if not np.isnan(w['temperature'])   else np.nan

        if (idx + 1) % 10 == 0:
            print(f"  Weather: {idx+1}/{total} ({(idx+1)/total*100:.1f}%)")

    print(f"  Weather: {total}/{total} selesai. Cache hits: {total - len(cache)}")
    print("  [DEBUG] Pengambilan data cuaca selesai. Beralih ke proses selanjutnya...")
    return df


WEATHER_FEATURES = [
    'weather_temp', 'weather_precip', 'weather_wind',
    'weather_code', 'weather_is_rain', 'weather_is_cold',
]