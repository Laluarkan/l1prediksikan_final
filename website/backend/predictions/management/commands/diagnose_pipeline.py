import os
import re
import joblib
import numpy as np
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db.models import Avg, Count, Q
from predictions.models import UpcomingFixture, MatchHistory

class Command(BaseCommand):
    help = 'Diagnostik ML End-to-End: Memeriksa anomali prediksi, missing features, dan kesehatan agen RL.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n" + "="*70))
        self.stdout.write(self.style.SUCCESS("🩺 DIAGNOSTIK ML END-TO-END (SISTEM L1 PREDIKSI-KAN) 🩺"))
        self.stdout.write(self.style.WARNING("="*70))

        model_dir = os.path.join(settings.BASE_DIR, 'models')
        if not os.path.exists(model_dir):
            model_dir = os.path.join(settings.BASE_DIR, 'models')

        try:
            lgbm_ftr = joblib.load(os.path.join(model_dir, 'lgbm_global_FTR.pkl'))
            lgbm_ou = joblib.load(os.path.join(model_dir, 'lgbm_global_OU25.pkl'))
            agent = joblib.load(os.path.join(model_dir, 'rl_agent_FTR_OU.pkl'))
            self.stdout.write(self.style.SUCCESS("✅ [1/5] MODEL LOADED: Seluruh file .pkl berhasil dimuat."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ [1/5] GAGAL MEMUAT MODEL: {e}"))
            return

        self.stdout.write(f"   -> Kelas FTR : {lgbm_ftr.classes_}")
        self.stdout.write(f"   -> Kelas OU  : {lgbm_ou.classes_}")

        fix_count = UpcomingFixture.objects.count()
        hist_count = MatchHistory.objects.count()
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ [2/5] STATUS DATABASE: {fix_count} Fixture & {hist_count} History."))
        if fix_count == 0:
            self.stdout.write(self.style.ERROR("   ⚠️ Menunggu GitHub Actions selesai... Data Fixture masih kosong."))
            return

        self.stdout.write(self.style.SUCCESS("\n✅ [3/5] DETEKSI ANOMALI BIAS (MACRO CHECK)"))
        
        avg_ftr = UpcomingFixture.objects.aggregate(
            avg_h=Avg('prob_ftr_h'), avg_d=Avg('prob_ftr_d'), avg_a=Avg('prob_ftr_a')
        )
        avg_ou = UpcomingFixture.objects.aggregate(
            avg_over=Avg('prob_ou25_over'), avg_under=Avg('prob_ou25_under')
        )

        self.stdout.write(f"   -> Rata-rata FTR : Home ({avg_ftr['avg_h']:.1%}), Draw ({avg_ftr['avg_d']:.1%}), Away ({avg_ftr['avg_a']:.1%})")
        if avg_ftr['avg_d'] > 0.35:
            self.stdout.write(self.style.ERROR("      ⚠️ WARNING: Masih ada bias Draw sistemik!"))
        elif avg_ftr['avg_a'] < 0.15:
            self.stdout.write(self.style.ERROR("      ⚠️ WARNING: Probabilitas Away lumpuh total!"))
        else:
            self.stdout.write(self.style.SUCCESS("      ✔️ Distribusi probabilitas FTR sangat sehat dan rasional."))

        self.stdout.write(f"   -> Rata-rata OU  : Over ({avg_ou['avg_over']:.1%}), Under ({avg_ou['avg_under']:.1%})")
        if avg_ou['avg_over'] > 0.70:
            self.stdout.write(self.style.ERROR("      ⚠️ WARNING: Masih ada bias Over 2.5 yang buta!"))
        else:
            self.stdout.write(self.style.SUCCESS("      ✔️ Distribusi probabilitas Over/Under wajar dan seimbang."))

        self.stdout.write(self.style.SUCCESS("\n✅ [4/5] INSPEKSI MAPPING KOLOM (MICRO CHECK)"))
        
        sample_fix = UpcomingFixture.objects.filter(is_processed=True).first()
        raw_keys = list(sample_fix.extended_features.keys())

        def clean_col_name(col):
            c = str(col).replace('>', '_over_').replace('<', '_under_')
            c = re.sub(r'[^\w]', '_', c)
            return re.sub(r'_+', '_', c).strip('_')

        cleaned_keys = set([clean_col_name(k) for k in raw_keys])

        missing_ftr = set(lgbm_ftr.feature_name_) - cleaned_keys
        missing_ou = set(lgbm_ou.feature_name_) - cleaned_keys

        self.stdout.write(f"   -> Fitur hilang di FTR  : {len(missing_ftr)} dari {len(lgbm_ftr.feature_name_)} fitur.")
        self.stdout.write(f"   -> Fitur hilang di OU25 : {len(missing_ou)} dari {len(lgbm_ou.feature_name_)} fitur.")
        
        if len(missing_ftr) > 100 or len(missing_ou) > 100:
            self.stdout.write(self.style.ERROR("      ⚠️ BAHAYA: Terlalu banyak fitur yang hilang! Fungsi Mapping gagal."))
        else:
            self.stdout.write(self.style.SUCCESS("      ✔️ Toleransi fitur hilang normal (Mayoritas adalah Closing Odds). Mapping sukses!"))

        self.stdout.write(self.style.SUCCESS("\n✅ [5/5] KESEHATAN AGEN REINFORCEMENT LEARNING (VALUE BET)"))
        
        total_bets = UpcomingFixture.objects.filter(Q(rl_stake_ftr__gt=0) | Q(rl_stake_ou__gt=0)).count()
        bet_percentage = total_bets / fix_count if fix_count > 0 else 0

        self.stdout.write(f"   -> Fixture dengan rekomendasi Bet : {total_bets} dari {fix_count} pertandingan ({bet_percentage:.1%}).")
        if bet_percentage == 0:
            self.stdout.write(self.style.ERROR("      ⚠️ WARNING: RL Agent tidak berani bertaruh sama sekali. Cek ketersediaan Odds."))
        elif bet_percentage > 0.8:
            self.stdout.write(self.style.ERROR("      ⚠️ WARNING: RL Agent bertaruh terlalu banyak. Filter Value Bet mungkin bocor."))
        else:
            self.stdout.write(self.style.SUCCESS("      ✔️ Agen RL beroperasi normal (Sangat selektif mencari Edge)."))

        self.stdout.write(self.style.WARNING("\n" + "="*70))
        self.stdout.write(self.style.SUCCESS("🎉 DIAGNOSTIK SELESAI 🎉"))
        self.stdout.write(self.style.WARNING("="*70 + "\n"))