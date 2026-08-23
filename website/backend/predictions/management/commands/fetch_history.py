import pandas as pd
from django.core.management.base import BaseCommand
from django.utils import timezone
from predictions.services import process_and_append_fetched_data

LEAGUE_NAMES = {
    "E0": "EPL", "SP1": "La Liga", "I1": "Serie A", "D1": "Bundesliga",
    "F1": "Ligue 1", "N1": "Eredivisie", "B1": "Jupiler Pro League",
    "P1": "Primeira Liga", "T1": "Süper Lig", "G1": "Super League",
    "SC0": "Scottish Premiership",
}

class Command(BaseCommand):
    help = 'Mengunduh data History terbaru dari football-data.co.uk secara otomatis'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai proses penarikan data HISTORY dari football-data.co.uk..."))
        
        now = timezone.now()
        start_year = now.year if now.month >= 7 else now.year - 1
        season_str = f"{str(start_year)[-2:]}{str(start_year + 1)[-2:]}"
        
        base_url = f"https://www.football-data.co.uk/mmz4281/{season_str}/"
        frames = []
        
        for code, name in LEAGUE_NAMES.items():
            csv_url = f"{base_url}{code}.csv"
            self.stdout.write(f"Menarik data {name} ({code}) musim {season_str}...")
            try:
                df = pd.read_csv(csv_url, low_memory=False, storage_options={'User-Agent': 'Mozilla/5.0'})
                if not df.empty:
                    frames.append(df)
                    self.stdout.write(self.style.SUCCESS(f"  -> Sukses mengunduh {len(df)} baris."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  -> Gagal mengunduh {code}. File belum dirilis oleh server atau kosong."))

        if not frames:
            self.stdout.write(self.style.ERROR("\nTidak ada satupun data history yang berhasil diunduh. Proses dibatalkan."))
            return

        combined_df = pd.concat(frames, ignore_index=True)
        self.stdout.write(self.style.WARNING(f"\nTotal {len(combined_df)} baris data history digabungkan. Memulai Pipeline AI (History Mode)..."))
        
        try:
            # Karena upload_type='history', fix_count pasti 0. Kita abaikan variabelnya.
            hist_count, _ = process_and_append_fetched_data(combined_df, upload_type='history')
            
            if hist_count == 0:
                self.stdout.write(self.style.SUCCESS("\n[SELESAI] Data historis di database sudah mutakhir. Tidak ada pertandingan baru yang ditambahkan."))
            else:
                self.stdout.write(self.style.SUCCESS(f"\n[SELESAI] Pipeline tuntas! {hist_count} data History baru berhasil ditambahkan."))
                self.stdout.write(self.style.SUCCESS("          (Jadwal di tabel Fixture yang sudah dimainkan telah otomatis dihapus)."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n[FATAL] Terjadi kesalahan saat memproses data di pipeline: {str(e)}"))