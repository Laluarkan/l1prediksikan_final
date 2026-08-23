import os
import pandas as pd
import json
import numpy as np
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from django.utils.dateparse import parse_datetime
from predictions.models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket
from predictions.services import LEAGUE_NAMES

class Command(BaseCommand):
    help = 'Memulihkan (Restore) database secara instan dari file backup CSV (Bypass ML/Weather)'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        file_path = os.path.join(settings.BASE_DIR, 'data', 'database_backup_lengkap.csv')
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File backup {file_path} tidak ditemukan! Harap pastikan file ada di folder data."))
            return
            
        self.stdout.write(self.style.WARNING("Membaca file backup CSV secara memori injeksi..."))
        df = pd.read_csv(file_path, keep_default_na=False) 
        
        league_objs = {code: League.objects.get_or_create(code=code, defaults={'name': name, 'country': 'Eropa'})[0] for code, name in LEAGUE_NAMES.items()}
        all_teams = set(df['home_team'].unique()) | set(df['away_team'].unique())
        team_objs = {name: Team.objects.get_or_create(name=name, defaults={'league': list(league_objs.values())[0]})[0] for name in all_teams if name}

        self.stdout.write(self.style.WARNING("Membersihkan tabel utama database..."))
        MatchHistory.objects.all().delete()
        UpcomingFixture.objects.all().delete()
        ParlayTicket.objects.all().delete()
        
        history_inserts = []
        fixture_inserts = []
        
        def to_float(val):
            try:
                if val == '' or pd.isna(val): return 0.0
                return float(val)
            except: return 0.0

        def to_int(val):
            try:
                if val == '' or pd.isna(val): return None
                return int(float(val))
            except: return None
            
        def to_bool(val):
            if val == '' or pd.isna(val) or val is None: return None
            if str(val).strip().lower() in ['true', '1', 't']: return True
            if str(val).strip().lower() in ['false', '0', 'f']: return False
            return None
            
        def parse_ext(val):
            if not val or val == '' or pd.isna(val): return {}
            try:
                return json.loads(str(val))
            except:
                return {}

        self.stdout.write(self.style.WARNING(f"Memulihkan {len(df)} baris data, metrik AI, dan format JSON..."))
        
        for _, row in df.iterrows():
            l_code = row['league_code']
            if l_code not in league_objs: continue
            
            date_val = parse_datetime(row['date_iso'])
            h_team = team_objs.get(row['home_team'])
            a_team = team_objs.get(row['away_team'])
            
            if not h_team or not a_team or not date_val: continue
            
            common_kwargs = {
                'league': league_objs[l_code], 
                'date': date_val, 
                'home_team': h_team, 
                'away_team': a_team,
                'avg_h': to_float(row['avg_h']), 
                'avg_d': to_float(row['avg_d']), 
                'avg_a': to_float(row['avg_a']),
                'avg_over_25': to_float(row['avg_over_25']), 
                'avg_under_25': to_float(row['avg_under_25']),
                'prob_ftr_h': to_float(row['prob_ftr_h']), 
                'prob_ftr_d': to_float(row['prob_ftr_d']), 
                'prob_ftr_a': to_float(row['prob_ftr_a']),
                'prob_ou25_over': to_float(row['prob_ou25_over']), 
                'prob_ou25_under': to_float(row['prob_ou25_under']),
                'has_value_bet': to_bool(row['has_value_bet']) or False, 
                'rl_pick_ftr': row['rl_pick_ftr'] if row['rl_pick_ftr'] != '' else None, 
                'rl_action_ftr': row['rl_action_ftr'] if row['rl_action_ftr'] != '' else None, 
                'rl_stake_ftr': to_float(row['rl_stake_ftr']), 
                'is_won_ftr': to_bool(row['is_won_ftr']),
                'has_value_bet_ou': to_bool(row['has_value_bet_ou']) or False, 
                'rl_pick_ou': row['rl_pick_ou'] if row['rl_pick_ou'] != '' else None, 
                'rl_action_ou': row['rl_action_ou'] if row['rl_action_ou'] != '' else None, 
                'rl_stake_ou': to_float(row['rl_stake_ou']), 
                'is_won_ou': to_bool(row['is_won_ou']),
                'part_of_parlay': to_bool(row['part_of_parlay']) or False, 
                'parlay_ticket_info': row['parlay_ticket_info'] if row['parlay_ticket_info'] != '' else None,
                'extended_features': parse_ext(row['extended_features'])
            }

            if row['table_source'] == 'history':
                history_inserts.append(MatchHistory(fthg=to_int(row['fthg']), ftag=to_int(row['ftag']), ftr=row['ftr'] if row['ftr'] != '' else None, **common_kwargs))
            else:
                fixture_inserts.append(UpcomingFixture(is_processed=True, **common_kwargs))
        
        MatchHistory.objects.bulk_create(history_inserts, batch_size=1000)
        UpcomingFixture.objects.bulk_create(fixture_inserts, batch_size=1000)
        
        self.stdout.write(self.style.WARNING("Merekonstruksi ulang tiket Parlay..."))
        df_parlay = df[(df['part_of_parlay'] == True) | (df['part_of_parlay'] == 'True') | (df['part_of_parlay'] == 'true')].copy()
        
        for t_info, group in df_parlay.groupby('parlay_ticket_info'):
            if not t_info or t_info == '': continue
            
            legs_odds, legs_prob, legs_won, legs_details = [], [], [], []
            is_historical = (group['table_source'].iloc[0] == 'history')
            
            for _, r in group.iterrows():
                pick = r['rl_pick_ftr']
                # PERBAIKAN: Sisipkan format tanggal ISO yang benar
                date_str = parse_datetime(r['date_iso']).isoformat() if r['date_iso'] else None
                
                if to_float(r['rl_stake_ftr']) > 0 and (to_float(r['rl_stake_ou']) == 0 or pick):
                    if pick == 'H': leg_odd, leg_prob = to_float(r['avg_h']), to_float(r['prob_ftr_h'])
                    elif pick == 'D': leg_odd, leg_prob = to_float(r['avg_d']), to_float(r['prob_ftr_d'])
                    else: leg_odd, leg_prob = to_float(r['avg_a']), to_float(r['prob_ftr_a'])
                    won_status = to_bool(r['is_won_ftr'])
                else:
                    pick = r['rl_pick_ou']
                    if pick == 'Over 2.5': leg_odd, leg_prob = to_float(r['avg_over_25']), to_float(r['prob_ou25_over'])
                    else: leg_odd, leg_prob = to_float(r['avg_under_25']), to_float(r['prob_ou25_under'])
                    won_status = to_bool(r['is_won_ou'])
                    
                legs_odds.append(leg_odd)
                legs_prob.append(leg_prob)
                legs_won.append(won_status)
                
                # PERBAIKAN: Menambahkan kunci date dan is_won agar frontend bisa merender status dengan benar
                legs_details.append({
                    "match": f"{r['home_team']} vs {r['away_team']}", 
                    "pick": pick, 
                    "odds": leg_odd,
                    "date": date_str,
                    "is_won": won_status
                })
            
            ticket_won = None
            if is_historical:
                if any(x is False for x in legs_won): ticket_won = False
                elif all(x is True for x in legs_won): ticket_won = True
                
            ParlayTicket.objects.create(
                ticket_id=t_info, date=parse_datetime(group['date_iso'].iloc[0]).date(),
                total_odds=float(np.prod(legs_odds)), total_prob=float(np.prod(legs_prob)),
                is_won=ticket_won, is_historical=is_historical, legs_details=legs_details
            )
            
        self.stdout.write(self.style.SUCCESS(f"\n[SUKSES] RESTORE DATA & AI SELESAI DALAM HITUNGAN DETIK!"))
        self.stdout.write(self.style.SUCCESS(f"Data tersimpan: {len(history_inserts)} History, {len(fixture_inserts)} Fixture."))