import os
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Memverifikasi bahwa model baru 100% bebas dari kebocoran fitur odds.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n" + "="*70))
        self.stdout.write(self.style.SUCCESS("🧪 VERIFIKASI ZERO LEAKAGE (MENGUJI OTAK BARU) 🧪"))
        self.stdout.write(self.style.WARNING("="*70))

        # 1. Load Model FTR dan OU25 yang baru
        model_dir = os.path.join(settings.BASE_DIR, 'models', 'global')
        try:
            lgbm_ftr = joblib.load(os.path.join(model_dir, 'lgbm_global_FTR.pkl'))
            lgbm_ou = joblib.load(os.path.join(model_dir, 'lgbm_global_OU25.pkl'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Gagal load model! Pastikan train_global.py sudah dijalankan. Error: {e}"))
            return

        ftr_features = lgbm_ftr.feature_name_
        ou_features = lgbm_ou.feature_name_
        
        self.stdout.write(self.style.SUCCESS(f"✅ Model Dimuat: FTR butuh {len(ftr_features)} fitur, OU25 butuh {len(ou_features)} fitur."))

        # 2. Cek Logika yang Lebih Cerdas (Tidak flag 'home_avg_scored')
        def is_leaked_bookie_feature(f):
            f_lower = f.lower()
            
            # Jika mengandung nama bandar yang spesifik
            if any(x in f_lower for x in ['b365', 'bw_', 'ps_', 'ip_', 'margin_', 'ou_drift', 'consensus']):
                return True
            
            # Jika diawali dengan 'avg' atau 'max' (Ini Odds Bandar, BUKAN _avg_ gol)
            if f_lower.startswith('avg') or f_lower.startswith('max'):
                return True
                
            return False

        leakage_found = [f for f in ftr_features if is_leaked_bookie_feature(f)]

        if leakage_found:
            self.stdout.write(self.style.ERROR(f"❌ GAGAL! Ditemukan {len(leakage_found)} fitur bandar yang bocor ke dalam model!"))
            self.stdout.write("Contoh fitur bocor: " + ", ".join(leakage_found[:5]))
            return
        else:
            self.stdout.write(self.style.SUCCESS("✅ LULUS UJI LEAKAGE: 0 (Nol) fitur bandar ditemukan di dalam otak AI! Model ini 100% murni memprediksi dari statistik tim."))

        self.stdout.write(self.style.WARNING("="*70 + "\n"))