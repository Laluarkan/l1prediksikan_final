import pandas as pd
from django.core.management.base import BaseCommand
from predictions.services import process_and_append_fetched_data

class Command(BaseCommand):
    help = 'Mengunduh data Fixture (Jadwal Mendatang) dari football-data.co.uk secara otomatis'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai proses penarikan data FIXTURE dari football-data.co.uk..."))
        
        csv_url = "https://www.football-data.co.uk/fixtures.csv"
        
        try:
            self.stdout.write(f"Menarik data jadwal dari URL: {csv_url}")
            df = pd.read_csv(csv_url, low_memory=False, storage_options={'User-Agent': 'Mozilla/5.0'})
            
            if df.empty:
                self.stdout.write(self.style.ERROR("\nData Fixture kosong dari server. Proses dibatalkan."))
                return
            
            self.stdout.write(self.style.SUCCESS(f"  -> Sukses mengunduh {len(df)} baris data jadwal pertandingan."))
            self.stdout.write(self.style.WARNING("\nMemulai Pipeline AI untuk Fixture (Fixture Mode)..."))
            
            # Karena upload_type='fixture', hist_count pasti 0. Kita abaikan variabelnya.
            _, fix_count = process_and_append_fetched_data(df, upload_type='fixture')
            
            if fix_count == 0:
                self.stdout.write(self.style.SUCCESS("\n[SELESAI] Data fixture di database sudah mutakhir. Tidak ada jadwal pertandingan baru yang ditambahkan."))
            else:
                self.stdout.write(self.style.SUCCESS(f"\n[SELESAI] Pipeline tuntas! {fix_count} jadwal Fixture baru berhasil ditambahkan."))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n[FATAL] Terjadi kesalahan saat memproses fixture: {str(e)}"))