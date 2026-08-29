import os
import re
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings
from predictions.models import UpcomingFixture

class Command(BaseCommand):
    help = 'Simulasi pengujian pembersihan nama kolom (Column Mapping) sebelum eksekusi pipeline.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("🧪 SIMULASI MAPPING KOLOM (TEST BEFORE DEPLOY) 🧪"))
        self.stdout.write(self.style.WARNING("="*60))

        # Fungsi pembersih yang sama persis dengan yang ada di services.py dan train_global.py
        def clean_col_name(col):
            c = str(col).replace('>', '_over_').replace('<', '_under_')
            c = re.sub(r'[^\w]', '_', c)
            return re.sub(r'_+', '_', c).strip('_')

        # 1. Load Model OU25
        model_path = os.path.join(settings.BASE_DIR, 'models', 'lgbm_global_OU25.pkl')
        if not os.path.exists(model_path):
            model_path = os.path.join(settings.BASE_DIR, 'models', 'global', 'lgbm_global_OU25.pkl')
            
        if not os.path.exists(model_path):
            self.stdout.write(self.style.ERROR("❌ Model OU25 tidak ditemukan."))
            return

        lgbm_ou = joblib.load(model_path)
        model_features = set(lgbm_ou.feature_name_)

        # 2. Ambil sampel fixture mentah dari DB (yang namanya masih belum dibersihkan)
        fixture = UpcomingFixture.objects.filter(is_processed=True).first()
        if not fixture:
            self.stdout.write(self.style.ERROR("❌ Tidak ada data fixture di database untuk dites."))
            return

        raw_features = list(fixture.extended_features.keys())
        
        # 3. Simulasi: Bandingkan sebelum dan sesudah dibersihkan
        missing_before = model_features - set(raw_features)
        
        cleaned_features = set([clean_col_name(f) for f in raw_features])
        missing_after = model_features - cleaned_features

        self.stdout.write(self.style.SUCCESS(f"\n📊 DATA SAMPEL: {fixture.home_team.name} vs {fixture.away_team.name}"))
        self.stdout.write(f"   -> Fitur hilang SEBELUM fungsi clean_col_name  : {len(missing_before)} fitur")
        self.stdout.write(f"   -> Fitur hilang SESUDAH fungsi clean_col_name  : {len(missing_after)} fitur")

        if len(missing_after) < len(missing_before):
            self.stdout.write(self.style.SUCCESS(f"\n✅ SUKSES BESAR! Fungsi berhasil memulihkan {len(missing_before) - len(missing_after)} fitur penting yang sebelumnya buta."))
            self.stdout.write(self.style.WARNING("   Catatan: Jika masih ada sisa fitur yang hilang (misal 50-90 fitur), itu normal. "
                                                 "Itu adalah fitur Closing Odds (odds penutupan) yang memang belum ada karena pertandingan belum dimulai."))
        elif len(missing_after) == len(missing_before):
            self.stdout.write(self.style.ERROR("\n❌ GAGAL: Tidak ada perubahan jumlah fitur yang hilang. Nama kolom masih tidak cocok."))
            
        self.stdout.write(self.style.WARNING("\n" + "="*60 + "\n"))