import time
import numpy as np
import pandas as pd
import urllib.request
import json
from config import STADIUM_COORDS


def _fetch_open_meteo(lat: float, lon: float, date_str: str, hour: int = 15) -> dict:
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={date_str}&end_date={date_str}"
        f"&hourly=temperature_2m,precipitation,windspeed_10m,weathercode"
        f"&timezone=auto"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        hourly = data.get('hourly', {})
        times  = hourly.get('time', [])
        target_time = f"{date_str}T{hour:02d}:00"
        if target_time in times:
            i = times.index(target_time)
            return {
                'temperature':   hourly['temperature_2m'][i],
                'precipitation': hourly['precipitation'][i],
                'windspeed':     hourly['windspeed_10m'][i],
                'weathercode':   hourly['weathercode'][i],
            }
        temps = hourly.get('temperature_2m', [])
        prec  = hourly.get('precipitation', [])
        wind  = hourly.get('windspeed_10m', [])
        wcode = hourly.get('weathercode', [])
        if temps:
            mid = min(hour, len(temps) - 1)
            return {
                'temperature':   temps[mid],
                'precipitation': prec[mid] if prec else np.nan,
                'windspeed':     wind[mid] if wind else np.nan,
                'weathercode':   wcode[mid] if wcode else np.nan,
            }
    except Exception:
        pass
    return {'temperature': np.nan, 'precipitation': np.nan, 'windspeed': np.nan, 'weathercode': np.nan}


def build_weather_features(df: pd.DataFrame, delay: float = 0.3) -> pd.DataFrame:
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

        if (idx + 1) % 500 == 0:
            print(f"  Weather: {idx+1}/{total} ({(idx+1)/total*100:.1f}%)")

    print(f"  Weather: {total}/{total} selesai. Cache hits: {total - len(cache)}")
    return df


WEATHER_FEATURES = [
    'weather_temp', 'weather_precip', 'weather_wind',
    'weather_code', 'weather_is_rain', 'weather_is_cold',
]