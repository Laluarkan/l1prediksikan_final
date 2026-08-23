import json
from django.core.management.base import BaseCommand
from predictions.models import ParlayTicket, MatchHistory, UpcomingFixture

class Command(BaseCommand):
    help = 'Memperbarui struktur JSON rincian tiket parlay lama untuk menampilkan Jam (date) yang Timezone-Aware dan Status (is_won)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai sinkronisasi dan kalibrasi zona waktu tiket parlay..."))
        
        tickets = ParlayTicket.objects.all()
        updated_count = 0
        
        for ticket in tickets:
            if not ticket.legs_details:
                continue
                
            new_legs = []
            is_modified = False
            
            legs = ticket.legs_details
            if isinstance(legs, str):
                try:
                    legs = json.loads(legs)
                except Exception:
                    continue
            
            for leg in legs:
                match_str = leg.get('match', '')
                if ' vs ' not in match_str:
                    new_legs.append(leg)
                    continue
                    
                home_name, away_name = match_str.split(' vs ')
                pick = leg.get('pick', '')
                
                match_obj = UpcomingFixture.objects.filter(
                    date__date=ticket.date,
                    home_team__name=home_name,
                    away_team__name=away_name
                ).first()
                
                if not match_obj:
                    match_obj = MatchHistory.objects.filter(
                        date__date=ticket.date,
                        home_team__name=home_name,
                        away_team__name=away_name
                    ).first()
                    
                if match_obj:
                    # PERBAIKAN: Menggunakan .isoformat() agar penanda UTC (+00:00) ikut tersimpan ke dalam JSON
                    # Sehingga saat dibaca React di Mataram, otomatis ditambah +8 Jam menjadi WITA yang akurat
                    date_str = match_obj.date.isoformat()
                    
                    won_status = None
                    if pick in ['H', 'D', 'A']:
                        won_status = match_obj.is_won_ftr
                    elif '2.5' in pick:
                        won_status = match_obj.is_won_ou
                        
                    # Menimpa ulang tanggal dan status
                    leg['date'] = date_str
                    leg['is_won'] = won_status
                    is_modified = True
                    
                new_legs.append(leg)
                
            if is_modified:
                ticket.legs_details = new_legs
                ticket.save()
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"\n[SUKSES] {updated_count} Tiket Parlay berhasil dikalibrasi ke zona waktu lokal Anda!"))