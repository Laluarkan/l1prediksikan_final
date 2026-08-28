"""
Script diagnostik untuk cek kenapa prediksi awal musim cenderung Draw.
Jalankan dari root folder website/backend, lewat Django shell:

    python manage.py shell < diagnose_draw_bias.py

atau paste isinya ke `python manage.py shell` secara interaktif.
"""
import pandas as pd
import numpy as np
from predictions.models import UpcomingFixture, MatchHistory

print("=" * 70)
print("1. CEK APAKAH TIM DI FIXTURE PUNYA HISTORI DI DATABASE")
print("=" * 70)

fixtures = UpcomingFixture.objects.select_related('home_team', 'away_team', 'league').filter(
    prob_ftr_d__isnull=False
).order_by('date')[:20]

for f in fixtures:
    home_hist_count = MatchHistory.objects.filter(home_team=f.home_team).count() + \
                       MatchHistory.objects.filter(away_team=f.home_team).count()
    away_hist_count = MatchHistory.objects.filter(home_team=f.away_team).count() + \
                       MatchHistory.objects.filter(away_team=f.away_team).count()

    flag = "  <-- CURIGA: histori sangat sedikit/kosong" if (home_hist_count < 5 or away_hist_count < 5) else ""

    print(f"{f.date.strftime('%Y-%m-%d')} | {f.home_team.name:15s} (hist={home_hist_count:4d}) vs "
          f"{f.away_team.name:15s} (hist={away_hist_count:4d}) | "
          f"D={f.prob_ftr_d:.1%}{flag}")

print()
print("=" * 70)
print("2. DISTRIBUSI PROBABILITAS DRAW SECARA KESELURUHAN (semua fixture aktif)")
print("=" * 70)

all_probs = list(UpcomingFixture.objects.filter(prob_ftr_d__isnull=False).values_list('prob_ftr_d', flat=True))
if all_probs:
    arr = np.array(all_probs)
    print(f"Jumlah fixture       : {len(arr)}")
    print(f"Rata-rata prob Draw  : {arr.mean():.1%}")
    print(f"Median prob Draw     : {np.median(arr):.1%}")
    print(f"Basis rate normal    : ~25-27% (rata-rata liga top Eropa jangka panjang)")
    if arr.mean() > 0.35:
        print("=> INDIKASI KUAT: model bias ke Draw secara sistemik, bukan cuma awal musim.")
    else:
        print("=> Rata-rata masih wajar; kemungkinan cuma fixture awal musim tertentu yang bias.")

print()
print("=" * 70)
print("3. CEK APAKAH ODDS TERISI PENUH UNTUK FIXTURE (bukan 0 / kosong)")
print("=" * 70)

missing_odds = UpcomingFixture.objects.filter(
    prob_ftr_d__isnull=False
).filter(
    avg_h__isnull=True
).count()
total_fixtures = UpcomingFixture.objects.filter(prob_ftr_d__isnull=False).count()
print(f"Fixture tanpa odds (avg_h kosong): {missing_odds} dari {total_fixtures}")
if total_fixtures and missing_odds / total_fixtures > 0.1:
    print("=> INDIKASI: banyak fixture diprediksi tanpa odds lengkap -> fitur odds terisi 0 -> bisa bikin bias.")