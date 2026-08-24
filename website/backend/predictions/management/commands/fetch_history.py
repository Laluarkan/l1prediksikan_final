import os
import io
import time
import random
import pandas as pd
from curl_cffi import requests
import urllib3
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import connection, close_old_connections
from predictions.services import process_and_append_fetched_data

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

LEAGUE_NAMES = {
    "E0": "EPL", "SP1": "La Liga", "I1": "Serie A", "D1": "Bundesliga",
    "F1": "Ligue 1", "N1": "Eredivisie", "B1": "Jupiler Pro League",
    "P1": "Primeira Liga", "T1": "Süper Lig", "G1": "Super League",
    "SC0": "Scottish Premiership",
}

class Command(BaseCommand):
    help = 'Mengunduh data History secara dinamis (Online -> Lokal)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai proses penarikan data HISTORY..."))
        
        now = timezone.now()
        start_year = now.year if now.month >= 7 else now.year - 1
        season_str = f"{str(start_year)[-2:]}{str(start_year + 1)[-2:]}"
        
        base_url = f"https://www.football-data.co.uk/mmz4281/{season_str}/"
        local_dir = os.path.join(settings.BASE_DIR, 'local_data')
        
        if not os.path.exists(local_dir):
            os.makedirs(local_dir)
            
        frames = []
        max_retries = 3
        
        for code, name in LEAGUE_NAMES.items():
            csv_url = f"{base_url}{code}.csv"
            local_path = os.path.join(local_dir, f"{code}.csv")
            
            self.stdout.write(f"\nMemproses data {name} ({code}) musim {season_str}...")
            
            df = None
            source = None
            
            for attempt in range(1, max_retries + 1):
                try:
                    res = requests.get(csv_url, impersonate="chrome120", timeout=20, verify=False)
                    if res.status_code == 200:
                        csv_data = res.content.decode('utf-8', errors='ignore')
                        if "<html" not in csv_data.lower() and "<!doctype" not in csv_data.lower():
                            temp_df = pd.read_csv(io.StringIO(csv_data), low_memory=False)
                            if not temp_df.empty and ('Date' in temp_df.columns or 'Date'.upper() in temp_df.columns or 'DATE' in temp_df.columns.str.upper()):
                                df = temp_df
                                source = "ONLINE"
                                break
                    elif res.status_code == 404:
                        break
                    time.sleep(random.randint(1, 3))
                except Exception:
                    time.sleep(random.randint(1, 3))
                    
            if source != "ONLINE":
                if os.path.exists(local_path):
                    try:
                        temp_df = pd.read_csv(local_path, low_memory=False)
                        if not temp_df.empty and ('Date' in temp_df.columns or 'Date'.upper() in temp_df.columns or 'DATE' in temp_df.columns.str.upper()):
                            df = temp_df
                            source = "LOKAL"
                    except Exception:
                        pass

            if df is not None and not df.empty:
                frames.append(df)
                self.stdout.write(self.style.SUCCESS(f"  -> Sukses mendapatkan {len(df)} baris (Sumber: {source})."))
            else:
                self.stdout.write(self.style.ERROR(f"  -> Gagal memproses {code} (Online & Lokal kosong/tidak ada)."))
            
            time.sleep(1)

        if not frames:
            self.stdout.write(self.style.ERROR("\nTidak ada satupun data history yang berhasil didapatkan. Proses dibatalkan."))
            return

        combined_df = pd.concat(frames, ignore_index=True)
        self.stdout.write(self.style.WARNING(f"\nTotal {len(combined_df)} baris data history digabungkan. Memulai Pipeline AI (History Mode)..."))
        
        try:
            close_old_connections()
            
            # Mematikan stopwatch Supabase
            with connection.cursor() as cursor:
                cursor.execute("SET statement_timeout = 0;")
            
            hist_count, _ = process_and_append_fetched_data(combined_df, upload_type='history')
            
            if hist_count == 0:
                self.stdout.write(self.style.SUCCESS("\n[SELESAI] Data historis di database sudah mutakhir."))
            else:
                self.stdout.write(self.style.SUCCESS(f"\n[SELESAI] Pipeline tuntas! {hist_count} data History baru berhasil ditambahkan."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n[FATAL] Terjadi kesalahan saat memproses data di pipeline: {str(e)}"))