import requests
import time
from django.core.management.base import BaseCommand
from predictions.models import Team
from django.conf import settings

# Mapping nama tim dari football-data.co.uk ke API-Football
TEAM_NAME_MAPPING = {
    # Inggris (Premier League & Championship)
    'Man United': 'Manchester United',
    'Man City': 'Manchester City',
    'Newcastle': 'Newcastle United',
    'Nott\'m Forest': 'Nottingham Forest',
    'Wolves': 'Wolverhampton Wanderers',
    'Hull': 'Hull City',
    'Ipswich': 'Ipswich Town',
    'Norwich': 'Norwich City',
    'Luton': 'Luton Town',
    'Coventry': 'Coventry City',
    'Leeds': 'Leeds United',

    # Spanyol (La Liga & Segunda)
    'Ath Madrid': 'Atletico Madrid',
    'Ath Bilbao': 'Athletic Club',
    'Espanol': 'Espanyol',
    'Vallecano': 'Rayo Vallecano',
    'La Coruna': 'Deportivo La Coruna',
    'Sociedad': 'Real Sociedad',
    'Valladolid': 'Real Valladolid',
    'Betis': 'Real Betis',
    'Alaves': 'Deportivo Alaves',
    'Oviedo': 'Real Oviedo',
    'Granada': 'Granada CF',

    # Jerman (Bundesliga & 2. Bundesliga)
    'M\'gladbach': 'Borussia Monchengladbach',
    'Ein Frankfurt': 'Eintracht Frankfurt',
    'Stuttgart': 'VfB Stuttgart',
    'Leverkusen': 'Bayer Leverkusen',
    'Dortmund': 'Borussia Dortmund',
    'Mainz': 'FSV Mainz 05',
    'Freiburg': 'SC Freiburg',
    'Augsburg': 'FC Augsburg',
    'Hertha': 'Hertha BSC',
    'Bielefeld': 'Arminia Bielefeld',
    'Darmstadt': 'SV Darmstadt 98',
    'St Pauli': 'St. Pauli',
    'Wolfsburg': 'VfL Wolfsburg',
    'Elversberg': 'SV Elversberg',
    'Paderborn': 'SC Paderborn 07',

    # Prancis (Ligue 1 & Ligue 2)
    'Paris SG': 'Paris Saint Germain',
    'St Etienne': 'Saint Etienne',
    'Clermont': 'Clermont Foot',
    
    # Belanda (Eredivisie & Eerste Divisie)
    'Nijmegen': 'NEC Nijmegen',
    'For Sittard': 'Fortuna Sittard',
    'Zwolle': 'PEC Zwolle',
    'Den Haag': 'ADO Den Haag',
    'Heracles': 'Heracles Almelo',
    'Groningen': 'FC Groningen',
    'Volendam': 'FC Volendam',
    'Utrecht': 'FC Utrecht',
    'Waalwijk': 'RKC Waalwijk',
    
    # Portugal (Primeira Liga)
    'Sp Lisbon': 'Sporting CP',
    'Pacos Ferreira': 'Pacos de Ferreira',
    'Porto': 'FC Porto',
    'Farense': 'SC Farense',
    'Sp Braga': 'SC Braga',
    'AVS': 'AVS Futebol SAD',
    'Alverca': 'FC Alverca',

    # Turki (Super Lig)
    'Buyuksehyr': 'Istanbul Basaksehir',
    'Goztep': 'Goztepe',
    'Ad. Demirspor': 'Adana Demirspor',
    'Karagumruk': 'Fatih Karagumruk',
    'Erzurumspor': 'Erzurumspor FK',
    'Corum': 'Corum FK',
    
    # Skotlandia (Premiership)
    'Hearts': 'Heart Of Midlothian',
    'Dundee United': 'Dundee Utd',

    # Yunani (Super League)
    'AEK': 'AEK Athens',
    'Olympiakos': 'Olympiacos',
    'Larisa': 'AEL Larissa',
    'Levadeiakos': 'Levadiakos',
    'Giannina': 'PAS Giannina',
    'OFI Crete': 'OFI',
    'Apollon': 'Apollon Smyrnis',
    'Panetolikos': 'Panaitolikos',
    
    # Belgia (Pro League)
    'St. Gilloise': 'Royale Union SG',
    'Oud-Heverlee Leuven': 'OH Leuven',
    'RWD Molenbeek': 'RWDM',
    'Antwerp': 'Royal Antwerp',
    'St Truiden': 'Sint-Truiden',
    'Lommel SK': 'Lommel',
    'Seraing': 'RFC Seraing',
    'Gent': 'KAA Gent',
    'Mechelen': 'KV Mechelen',
    'Beveren': 'SK Beveren',
    'Standard': 'Standard Liege',
    'Oostende': 'KV Oostende',
    'Genk': 'KRC Genk',
    'Eupen': 'KAS Eupen',
}

class Command(BaseCommand):
    help = 'Sync team logos and IDs from API-Football'

    def handle(self, *args, **options):
        api_key = getattr(settings, 'API_FOOTBALL_KEY', None)
        if not api_key:
            self.stdout.write(self.style.ERROR("API_FOOTBALL_KEY belum diset di .env atau settings.py"))
            return

        headers = {
            'x-apisports-key': api_key
        }

        # Hanya ambil tim yang belum memiliki logo/ID
        teams = Team.objects.filter(api_football_id__isnull=True)
        self.stdout.write(f"Ditemukan {teams.count()} tim yang belum memiliki logo. Mulai sinkronisasi...")

        for team in teams:
            search_name = TEAM_NAME_MAPPING.get(team.name, team.name)
            
            url = "https://v3.football.api-sports.io/teams"
            
            try:
                response = requests.get(url, headers=headers, params={'search': search_name})
                data = response.json()

                # Cek jika ada error dari API (misal rate limit atau suspended)
                if data.get('errors'):
                    errors = data['errors']
                    self.stdout.write(self.style.ERROR(f"API Error: {errors}"))
                    self.stdout.write(self.style.WARNING("Menghentikan script sementara untuk mencegah spam request!"))
                    break # Hentikan proses jika kena error apapun (limit/suspended)
                
                elif data.get('results', 0) > 0:
                    # Ambil hasil pertama (paling relevan)
                    team_data = data['response'][0]['team']
                    
                    team.api_football_id = team_data['id']
                    team.logo_url = team_data['logo']
                    team.save()
                    
                    self.stdout.write(self.style.SUCCESS(f"Berhasil update: {team.name} -> ID: {team_data['id']}"))
                else:
                    self.stdout.write(self.style.WARNING(f"Tim tidak ditemukan di API: {team.name} (Search: {search_name})"))
                
                # API-Football free plan limit: 10 requests per minute
                # Kita set delay 6.1 detik per request agar aman dari limit per menit
                time.sleep(6.1)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error saat mencari {team.name}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("Proses sinkronisasi selesai!"))

