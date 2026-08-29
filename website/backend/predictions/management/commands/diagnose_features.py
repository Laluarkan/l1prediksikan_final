import os
import re
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings
from predictions.models import UpcomingFixture

class Command(BaseCommand):
    help = 'Membongkar perbedaan nama fitur antara Model ML dan Database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n" + "="*80))
        self.stdout.write(self.style.SUCCESS("🔍 INVESTIGASI FORENSIK: NAMA FITUR MODEL VS DATABASE 🔍"))
        self.stdout.write(self.style.WARNING("="*80))

        # 1. Load Model (Otak AI)
        model_path = os.path.join(settings.BASE_DIR, 'models', 'global', 'lgbm_global_OU25.pkl')
        if not os.path.exists(model_path):
            model_path = os.path.join(settings.BASE_DIR, 'models', 'lgbm_global_OU25.pkl')

        try:
            lgbm_ou = joblib.load(model_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Gagal load model: {e}"))
            return

        model_features = set(lgbm_ou.feature_name_)
        self.stdout.write(f"-> Total fitur di dalam Model (Otak AI) : {len(model_features)}")

        # 2. Load Database (Data Input)
        fixture = UpcomingFixture.objects.filter(is_processed=True).first()
        if not fixture:
            self.stdout.write(self.style.ERROR("❌ Database fixture kosong! Tidak bisa menguji data."))
            return

        raw_db_features = list(fixture.extended_features.keys())
        self.stdout.write(f"-> Total fitur mentah di Database       : {len(raw_db_features)}")

        # 3. Fungsi Pembersih yang sedang berjalan di sistem saat ini
        def clean_col_name(col):
            c = str(col).replace('>', '_over_').replace('<', '_under_')
            c = re.sub(r'[^\w]', '_', c)
            return re.sub(r'_+', '_', c).strip('_')

        cleaned_db_features = set([clean_col_name(k) for k in raw_db_features])

        # 4. Operasi Perbandingan (Mencari Selisih)
        missing_in_db = model_features - cleaned_db_features
        extra_in_db = cleaned_db_features - model_features
        matched = model_features.intersection(cleaned_db_features)

        self.stdout.write(self.style.SUCCESS(f"\n✅ FITUR COCOK (MATCHED): {len(matched)}"))
        
        self.stdout.write(self.style.ERROR(f"\n❌ FITUR HILANG (Diminta Model, tapi TIDAK ADA di DB): {len(missing_in_db)}"))
        self.stdout.write(self.style.WARNING("   (Ini yang membuat model jadi buta dan error)"))
        for f in sorted(list(missing_in_db))[:40]:
            self.stdout.write(f"   - {f}")
        if len(missing_in_db) > 40:
            self.stdout.write(f"   - ... (dan {len(missing_in_db) - 40} fitur lainnya)")

        self.stdout.write(self.style.WARNING(f"\n⚠️ FITUR NYASAR (Ada di DB, tapi TIDAK DIKENAL Model): {len(extra_in_db)}"))
        self.stdout.write(self.style.WARNING("   (Ini adalah fitur yang namanya mungkin typo/berbeda)"))
        for f in sorted(list(extra_in_db))[:40]:
            self.stdout.write(f"   - {f}")
        if len(extra_in_db) > 40:
            self.stdout.write(f"   - ... (dan {len(extra_in_db) - 40} fitur lainnya)")

        self.stdout.write(self.style.WARNING("\n" + "="*80))
        self.stdout.write("KESIMPULAN PENGAMATAN:")
        self.stdout.write("Silakan bandingkan nama di daftar ❌ FITUR HILANG dengan nama di ⚠️ FITUR NYASAR.")
        self.stdout.write("Anda pasti akan menemukan fitur yang sebenarnya sama, tapi ejaannya beda ")
        self.stdout.write("(Misal: Model minta 'home_win_rate', tapi DB memberikannya 'home_winrate_5').")
        self.stdout.write("="*80 + "\n")