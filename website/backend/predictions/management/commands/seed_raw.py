import pandas as pd
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from predictions.services import process_and_save_data, process_preprocessed_data

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        dataset_path = settings.BASE_DIR.parent / 'backend' / 'data' / 'enriched' / 'final_training_dataset.csv'
        raw_dir = settings.BASE_DIR.parent / 'backend' / 'data' / 'raw'
        
        if dataset_path.exists():
            self.stdout.write(self.style.SUCCESS(f'Dataset ditemukan: {dataset_path}. Menggunakan jalur cepat (Fast Track)...'))
            h_count, f_count = process_preprocessed_data(dataset_path)
            self.stdout.write(self.style.SUCCESS(f'Selesai! {h_count} Histori dan {f_count} Jadwal Simulasi berhasil disimpan.'))
            
        elif raw_dir.exists():
            self.stdout.write(self.style.WARNING('Dataset final tidak ditemukan, memproses data mentah (raw)...'))
            csv_files = list(raw_dir.glob("*.csv"))
            if not csv_files:
                self.stdout.write(self.style.ERROR(f'Tidak ada file CSV di: {raw_dir}'))
                return

            self.stdout.write(f'Membaca {len(csv_files)} file CSV mentah...')
            frames = []
            for file_path in csv_files:
                try:
                    df = pd.read_csv(file_path, low_memory=False)
                    stem = file_path.stem
                    parts = stem.split('_')
                    if 'Div' not in df.columns: df['Div'] = parts[0] if len(parts) >= 2 else 'UNK'
                    if 'Season' not in df.columns: df['Season'] = parts[1] if len(parts) >= 2 else 'unknown'
                    frames.append(df)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Gagal membaca {file_path.name}: {e}'))

            if not frames:
                self.stdout.write(self.style.ERROR('Tidak ada data yang berhasil dimuat.'))
                return

            combined_df = pd.concat(frames, ignore_index=True)
            self.stdout.write(f'Total {len(combined_df)} baris data mentah digabungkan.')
            hist_count, fix_count = process_and_save_data(combined_df, skip_weather=False)
            self.stdout.write(self.style.SUCCESS(f'Selesai! {hist_count} Histori dan {fix_count} Jadwal Simulasi berhasil disimpan.'))
            
        else:
            self.stdout.write(self.style.ERROR('Folder data/raw tidak ditemukan.'))