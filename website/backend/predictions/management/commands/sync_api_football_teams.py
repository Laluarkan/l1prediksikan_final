import requests
import time
from django.core.management.base import BaseCommand
from predictions.models import Team
from django.conf import settings

# Mapping nama tim dari football-data.co.uk ke API-Football
# Anda bisa menambahkan mapping lain jika nama tim di database tidak cocok persis dengan API-Football
TEAM_NAME_MAPPING = {
    'Man United': 'Manchester United',
    'Man City': 'Manchester City',
    'Newcastle': 'Newcastle United',
    'Nott\'m Forest': 'Nottingham Forest',
    'Spurs': 'Tottenham',
    'Wolves': 'Wolverhampton Wanderers',
    'Sheffield United': 'Sheffield Utd',
    'Aston Villa': 'Aston Villa',
    'West Ham': 'West Ham',
    # Tambahkan mapping liga lain jika diperlukan
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

        # Mengambil semua tim yang ada di database kita
        teams = Team.objects.all()
        self.stdout.write(f"Ditemukan {teams.count()} tim di database. Mulai sinkronisasi...")

        for team in teams:
            search_name = TEAM_NAME_MAPPING.get(team.name, team.name)
            
            # API-Football Endpoint: Cari tim berdasarkan nama
            url = f"https://v3.football.api-sports.io/teams?search={search_name}"
            
            try:
                response = requests.get(url, headers=headers)
                data = response.json()

                if data.get('results', 0) > 0:
                    # Ambil hasil pertama (paling relevan)
                    team_data = data['response'][0]['team']
                    
                    team.api_football_id = team_data['id']
                    team.logo_url = team_data['logo']
                    team.save()
                    
                    self.stdout.write(self.style.SUCCESS(f"Berhasil update: {team.name} -> ID: {team_data['id']}, Logo: {team_data['logo']}"))
                else:
                    self.stdout.write(self.style.WARNING(f"Tim tidak ditemukan di API: {team.name} (Search: {search_name})"))
                
                # Jeda agar tidak melebihi rate limit (API-Sports punya limit 10 request/detik untuk free plan)
                time.sleep(0.2)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error saat mencari {team.name}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("Selesai sinkronisasi logo tim!"))

