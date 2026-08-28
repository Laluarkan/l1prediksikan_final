import os
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings
from predictions.models import UpcomingFixture

class Command(BaseCommand):
    help = 'Mendiagnosis input fitur dan struktur model ML untuk mencari anomali probabilitas Away yang lumpuh.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("🔍 DIAGNOSTIK MODEL & FITUR ML (AWAY PROBABILITY) 🔍"))
        self.stdout.write(self.style.WARNING("="*60))

        # 1. CEK STRUKTUR KELAS MODEL
        model_path = os.path.join(settings.BASE_DIR, 'models', 'lgbm_global_FTR.pkl')
        if not os.path.exists(model_path):
            self.stdout.write(self.style.ERROR("❌ Model lgbm_global_FTR.pkl tidak ditemukan di folder models/."))
            return

        lgbm_ftr = joblib.load(model_path)
        
        self.stdout.write(self.style.SUCCESS("\n🧠 1. STRUKTUR KELAS MODEL (LIGHTGBM)"))
        self.stdout.write(f"   -> Urutan indeks prediksi model (0, 1, 2) adalah: {lgbm_ftr.classes_}")
        
        if list(lgbm_ftr.classes_) != ['A', 'D', 'H']:
            self.stdout.write(self.style.ERROR("   ⚠️ BAHAYA: Urutan kelas bukan ['A', 'D', 'H']! Ini bisa membuat prediksi terbalik di services.py."))
        else:
            self.stdout.write(self.style.SUCCESS("   ✅ Urutan kelas normal (Alfabetis)."))

        # 2. AMBIL FIXTURE DARI SCREENSHOT (ALAVES)
        fixture = UpcomingFixture.objects.filter(home_team__name__icontains='Alaves').first()
        if not fixture:
            fixture = UpcomingFixture.objects.filter(is_processed=True).first()

        if not fixture:
            self.stdout.write(self.style.ERROR("❌ Tidak ada data fixture di database."))
            return

        self.stdout.write(self.style.SUCCESS(f"\n📊 2. MENGANALISIS INPUT PERTANDINGAN: {fixture.home_team.name} vs {fixture.away_team.name}"))
        self.stdout.write(f"   -> Hasil Prediksi AI - Home: {fixture.prob_ftr_h:.1%}, Draw: {fixture.prob_ftr_d:.1%}, Away: {fixture.prob_ftr_a:.1%}")

        ext_feat = fixture.extended_features
        if not ext_feat:
            self.stdout.write(self.style.ERROR("❌ extended_features kosong! Data input tidak tersimpan."))
            return

        # 3. CEK FITUR YANG HILANG (TERISI 0.0)
        model_features = lgbm_ftr.feature_name_
        input_features = set(ext_feat.keys())
        missing = set(model_features) - input_features
        
        self.stdout.write(self.style.SUCCESS("\n🔎 3. KELENGKAPAN FITUR (Mendeteksi Kolom Hilang)"))
        self.stdout.write(f"   -> Total fitur dibutuhkan model: {len(model_features)}")
        self.stdout.write(f"   -> Total fitur tersedia di DB: {len(input_features)}")
        
        if missing:
            self.stdout.write(self.style.ERROR(f"   ⚠️ WARNING: Ada {len(missing)} fitur yang hilang dan diam-diam diisi 0.0 oleh sistem!"))
            for m in list(missing)[:10]:
                self.stdout.write(f"      - {m}")
            if len(missing) > 10:
                self.stdout.write(f"      - ... dan {len(missing) - 10} fitur lainnya.")
        else:
            self.stdout.write(self.style.SUCCESS("   ✅ Semua fitur model tersedia di database."))

        # 4. CEK NILAI KUNCI AWAY VS HOME
        self.stdout.write(self.style.SUCCESS("\n⚖️ 4. PERBANDINGAN NILAI FITUR KUNCI (HOME vs AWAY)"))
        keys_to_check = [
            ('elo_home', 'elo_away'), 
            ('home_win_rate', 'away_win_rate'), 
            ('attack_vs_defense_home', 'attack_vs_defense_away'),
            ('ip_Avg_H', 'ip_Avg_A')
        ]
        
        for h_key, a_key in keys_to_check:
            h_val = ext_feat.get(h_key, 'NaN')
            a_val = ext_feat.get(a_key, 'NaN')
            self.stdout.write(f"   -> {h_key}: {h_val}  |  {a_key}: {a_val}")

        self.stdout.write(self.style.WARNING("\n" + "="*60 + "\n"))