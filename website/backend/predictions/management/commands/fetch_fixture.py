import os
import io
import time
import random
import pandas as pd
from curl_cffi import requests
import urllib3
from django.conf import settings
from django.core.management.base import BaseCommand
from predictions.services import process_and_append_fetched_data

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Command(BaseCommand):
    help = 'Mengunduh data Fixture secara dinamis (Online -> Lokal)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai proses penarikan data FIXTURE..."))
        
        csv_url = "https://www.football-data.co.uk/fixtures.csv"
        local_path = os.path.join(settings.BASE_DIR, 'local_data', 'fixtures.csv')
        
        df = None
        source = None
        max_retries = 3
        
        self.stdout.write(f"Mencoba mengunduh dari internet: {csv_url}")
        
        for attempt in range(1, max_retries + 1):
            try:
                res = requests.get(csv_url, impersonate="chrome120", timeout=30, verify=False)
                if res.status_code == 200:
                    csv_data = res.content.decode('utf-8', errors='ignore')
                    if "<html" not in csv_data.lower() and "<!doctype" not in csv_data.lower():
                        temp_df = pd.read_csv(io.StringIO(csv_data), low_memory=False)
                        if not temp_df.empty:
                            df = temp_df
                            source = "ONLINE"
                            break
                time.sleep(random.randint(2, 5))
            except Exception:
                time.sleep(random.randint(2, 5))
                
        if source != "ONLINE":
            self.stdout.write(self.style.ERROR("  -> Akses online diblokir/gagal. Beralih ke data lokal..."))
            if os.path.exists(local_path):
                try:
                    df = pd.read_csv(local_path, low_memory=False)
                    if not df.empty:
                        source = "LOKAL"
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  -> Gagal membaca file lokal: {str(e)}"))
            else:
                self.stdout.write(self.style.ERROR(f"  -> File lokal tidak ditemukan di: {local_path}"))
        
        if df is None or df.empty:
            self.stdout.write(self.style.ERROR("\n[FATAL] Tidak ada data Fixture yang bisa diproses (baik online maupun lokal)."))
            return
            
        if 'Date' not in df.columns and 'Date'.upper() not in df.columns and 'DATE' not in df.columns.str.upper():
            self.stdout.write(self.style.ERROR("\n[FATAL] Kolom 'Date' tidak ditemukan. Format CSV tidak valid."))
            return
            
        self.stdout.write(self.style.SUCCESS(f"  -> Sukses mendapatkan {len(df)} baris data jadwal (Sumber Data: {source})."))
        self.stdout.write(self.style.WARNING("\nMemulai Pipeline AI untuk Fixture (Fixture Mode)..."))
        
        try:
            _, fix_count = process_and_append_fetched_data(df, upload_type='fixture')
            
            if fix_count == 0:
                self.stdout.write(self.style.SUCCESS("\n[SELESAI] Data fixture di database sudah mutakhir. Tidak ada jadwal baru."))
            else:
                self.stdout.write(self.style.SUCCESS(f"\n[SELESAI] Pipeline tuntas! {fix_count} jadwal Fixture baru berhasil ditambahkan."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n[FATAL] Terjadi kesalahan saat memproses fixture: {str(e)}"))