import json
from django.core.management.base import BaseCommand
from django.db.models import Q
from predictions.models import ParlayTicket, MatchHistory, UpcomingFixture


class Command(BaseCommand):
    help = 'Memperbarui rincian tiket parlay (zona waktu ISO UTC & evaluasi status menang/kalah per leg dan tiket)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Memulai sinkronisasi dan evaluasi status tiket parlay..."))

        tickets = list(ParlayTicket.objects.filter(Q(is_won__isnull=True) | Q(is_historical=False)))
        if not tickets:
            self.stdout.write(self.style.SUCCESS("[SUKSES] Seluruh tiket parlay sudah terevaluasi."))
            return

        ticket_dates = {t.date for t in tickets if t.date}

        # Preload dalam 2 query saja (menghemat ribuan round-trip ke Supabase)
        fix_map = {}
        for f in UpcomingFixture.objects.filter(date__date__in=ticket_dates).select_related('home_team', 'away_team'):
            key = (f.date.date(), f.home_team.name, f.away_team.name)
            fix_map[key] = f

        hist_map = {}
        for m in MatchHistory.objects.filter(date__date__in=ticket_dates).select_related('home_team', 'away_team'):
            key = (m.date.date(), m.home_team.name, m.away_team.name)
            hist_map[key] = m

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
                match_str = leg.get('match') or leg.get('match_name') or ''
                if ' vs ' not in match_str:
                    new_legs.append(leg)
                    continue

                home_name, away_name = match_str.split(' vs ', 1)
                home_name = home_name.strip()
                away_name = away_name.strip()
                pick = leg.get('pick', '')

                key = (ticket.date, home_name, away_name)
                hist_obj = hist_map.get(key)
                fix_obj = fix_map.get(key)
                match_obj = hist_obj or fix_obj

                if match_obj:
                    date_str = match_obj.date.isoformat()
                    won_status = leg.get('is_won')

                    if hist_obj:
                        if pick in ['H', 'D', 'A']:
                            won_status = (hist_obj.ftr == pick) if hist_obj.ftr else hist_obj.is_won_ftr
                        elif 'Over' in pick:
                            won_status = ((hist_obj.fthg + hist_obj.ftag) > 2.5) if (hist_obj.fthg is not None and hist_obj.ftag is not None) else hist_obj.is_won_ou
                        elif 'Under' in pick:
                            won_status = ((hist_obj.fthg + hist_obj.ftag) < 2.5) if (hist_obj.fthg is not None and hist_obj.ftag is not None) else hist_obj.is_won_ou
                    elif fix_obj:
                        if pick in ['H', 'D', 'A']:
                            won_status = fix_obj.is_won_ftr
                        elif '2.5' in pick:
                            won_status = fix_obj.is_won_ou

                    if leg.get('date') != date_str or leg.get('is_won') != won_status:
                        leg['date'] = date_str
                        leg['is_won'] = won_status
                        is_modified = True

                new_legs.append(leg)

            leg_statuses = [l.get('is_won') for l in new_legs]
            new_ticket_won = ticket.is_won
            if leg_statuses and any(s is False for s in leg_statuses):
                new_ticket_won = False
            elif leg_statuses and all(s is True for s in leg_statuses):
                new_ticket_won = True

            if is_modified or new_ticket_won != ticket.is_won:
                ticket.legs_details = new_legs
                ticket.is_won = new_ticket_won
                if new_ticket_won is not None:
                    ticket.is_historical = True
                ticket.save()
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"\n[SUKSES] {updated_count} Tiket Parlay berhasil dievaluasi dan dikalibrasi!"))
