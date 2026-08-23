import csv
import os
import json
from django.core.management.base import BaseCommand
from django.conf import settings
from predictions.models import MatchHistory, UpcomingFixture

class Command(BaseCommand):
    help = 'Ekspor database FULL (Prediksi AI, Cuaca, Extended Features) ke CSV untuk Backup'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai pengeksporan FULL database ke file CSV..."))
        
        export_dir = os.path.join(settings.BASE_DIR, 'data')
        os.makedirs(export_dir, exist_ok=True)
        export_path = os.path.join(export_dir, 'database_backup_lengkap.csv')
        
        headers = [
            'table_source', 'league_code', 'date_iso', 'home_team', 'away_team',
            'fthg', 'ftag', 'ftr', 'avg_h', 'avg_d', 'avg_a', 'avg_over_25', 'avg_under_25',
            'prob_ftr_h', 'prob_ftr_d', 'prob_ftr_a', 'prob_ou25_over', 'prob_ou25_under',
            'has_value_bet', 'rl_pick_ftr', 'rl_action_ftr', 'rl_stake_ftr', 'is_won_ftr',
            'has_value_bet_ou', 'rl_pick_ou', 'rl_action_ou', 'rl_stake_ou', 'is_won_ou',
            'part_of_parlay', 'parlay_ticket_info', 'extended_features'
        ]
        
        try:
            with open(export_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                
                histories = MatchHistory.objects.all().order_by('date')
                hist_count = 0
                for h in histories:
                    writer.writerow([
                        'history', h.league.code, h.date.isoformat(), h.home_team.name, h.away_team.name,
                        h.fthg, h.ftag, h.ftr, h.avg_h, h.avg_d, h.avg_a, h.avg_over_25, h.avg_under_25,
                        h.prob_ftr_h, h.prob_ftr_d, h.prob_ftr_a, h.prob_ou25_over, h.prob_ou25_under,
                        h.has_value_bet, h.rl_pick_ftr, h.rl_action_ftr, h.rl_stake_ftr, h.is_won_ftr,
                        h.has_value_bet_ou, h.rl_pick_ou, h.rl_action_ou, h.rl_stake_ou, h.is_won_ou,
                        h.part_of_parlay, h.parlay_ticket_info, json.dumps(h.extended_features) if h.extended_features else '{}'
                    ])
                    hist_count += 1
                    
                fixtures = UpcomingFixture.objects.all().order_by('date')
                fix_count = 0
                for fx in fixtures:
                    writer.writerow([
                        'fixture', fx.league.code, fx.date.isoformat(), fx.home_team.name, fx.away_team.name,
                        '', '', '', fx.avg_h, fx.avg_d, fx.avg_a, fx.avg_over_25, fx.avg_under_25,
                        fx.prob_ftr_h, fx.prob_ftr_d, fx.prob_ftr_a, fx.prob_ou25_over, fx.prob_ou25_under,
                        fx.has_value_bet, fx.rl_pick_ftr, fx.rl_action_ftr, fx.rl_stake_ftr, fx.is_won_ftr,
                        fx.has_value_bet_ou, fx.rl_pick_ou, fx.rl_action_ou, fx.rl_stake_ou, fx.is_won_ou,
                        fx.part_of_parlay, fx.parlay_ticket_info, json.dumps(fx.extended_features) if fx.extended_features else '{}'
                    ])
                    fix_count += 1
                    
            self.stdout.write(self.style.SUCCESS(f"\n[SUKSES] Database berhasil diekspor lengkap dengan data JSON!"))
            self.stdout.write(self.style.SUCCESS(f"Total History : {hist_count} baris"))
            self.stdout.write(self.style.SUCCESS(f"Total Fixture : {fix_count} baris"))
            self.stdout.write(self.style.WARNING(f"File Backup CSV tersimpan di: {export_path}"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n[FATAL] Gagal mengekspor database: {str(e)}"))