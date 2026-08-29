import os
import joblib
import numpy as np
from django.core.management.base import BaseCommand
from django.conf import settings
from predictions.models import UpcomingFixture

class Command(BaseCommand):
    help = 'Mendiagnosis bias Over 2.5 pada model OU.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("🔍 DIAGNOSTIK MODEL & FITUR ML (OVER/UNDER 2.5) 🔍"))
        self.stdout.write(self.style.WARNING("="*60))

        # 1. CEK LOKASI MODEL OU25
        model_path = os.path.join(settings.BASE_DIR, 'models', 'lgbm_global_OU25.pkl')
        if not os.path.exists(model_path):
            model_path = os.path.join(settings.BASE_DIR, 'models', 'global', 'lgbm_global_OU25.pkl')
            
        if not os.path.exists(model_path):
            self.stdout.write(self.style.ERROR("❌ Model OU25 tidak ditemukan di folder models/."))
            return

        lgbm_ou = joblib.load(model_path)
        
        self.stdout.write(self.style.SUCCESS("\n🧠 1. STRUKTUR KELAS MODEL (LIGHTGBM OU25)"))
        self.stdout.write(f"   -> Urutan kelas model: {lgbm_ou.classes_}")

        fixture = UpcomingFixture.objects.filter(is_processed=True).first()
        if not fixture:
            self.stdout.write(self.style.ERROR("❌ Tidak ada fixture di database."))
            return

        self.stdout.write(self.style.SUCCESS(f"\n📊 2. MENGANALISIS INPUT PERTANDINGAN: {fixture.home_team.name} vs {fixture.away_team.name}"))
        self.stdout.write(f"   -> Hasil Prediksi AI - Over 2.5: {fixture.prob_ou25_over:.1%}, Under 2.5: {fixture.prob_ou25_under:.1%}")
        self.stdout.write(f"   -> RL Pick: {fixture.rl_pick_ou}")

        ext_feat = fixture.extended_features
        if not ext_feat:
            self.stdout.write(self.style.ERROR("❌ extended_features kosong!"))
            return

        # 3. MENDETEKSI NAMA KOLOM YANG TIDAK COCOK
        model_features = lgbm_ou.feature_name_
        input_features = set(ext_feat.keys())
        missing = set(model_features) - input_features
        
        self.stdout.write(self.style.SUCCESS("\n🔎 3. KELENGKAPAN FITUR MODEL OU25 (Mendeteksi Kolom Hilang)"))
        self.stdout.write(f"   -> Total fitur dibutuhkan model : {len(model_features)}")
        self.stdout.write(f"   -> Total fitur tersedia di DB : {len(input_features)}")
        
        if missing:
            self.stdout.write(self.style.ERROR(f"   ⚠️ WARNING: Ada {len(missing)} fitur yang hilang dan diubah menjadi NaN saat prediksi!"))
            self.stdout.write("      (Inilah tersangka utama yang membuat model memprediksi Over 2.5 secara paksa)")
            for m in list(missing)[:15]:
                self.stdout.write(f"      - {m}")
            if len(missing) > 15:
                self.stdout.write(f"      - ... dan {len(missing) - 15} fitur lainnya.")
        else:
            self.stdout.write(self.style.SUCCESS("   ✅ Semua fitur model OU25 tersedia dan cocok."))

        self.stdout.write(self.style.WARNING("\n" + "="*60 + "\n"))