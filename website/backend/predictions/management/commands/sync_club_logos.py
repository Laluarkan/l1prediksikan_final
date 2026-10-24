import os
import sys
import json
import re
import urllib.request
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from predictions.models import Team, League, MatchHistory

EXPLICIT_MAPPING = {
    'Aris': 'Aris Saloniki',
    'Ath Madrid': 'Atlético de Madrid',
    'Atl. Madrid': 'Atlético de Madrid',
    'Como': 'Como 1907',
    'Dep. A Coruna': 'Deportivo A Coruña',
    'La Coruna': 'Deportivo A Coruña',
    'FC Koln': '1. FC Köln',
    'Larisa': 'AE Larisa',
    'Leverkusen': 'Bayer 04 Leverkusen',
    'Lyon': 'Olympique Lyon',
    'Nice': 'OGC Nice',
    'OFI Crete': 'OFI Crete',
    'Panetolikos': 'Panetolikos GFS',
    'PAOK': 'PAOK Thessaloniki',
    'Pisa': 'Pisa Sporting Club',
    'Rennes': 'Stade Rennais FC',
    'RWD Molenbeek': 'RWD Molenbeek',
    'St. Gilloise': 'Royale Union Saint Gilloise',
    'Yeni Malatyaspor': 'Y. Malatyaspor',
    # Common abbreviations from football-data.co.uk
    'Man United': 'Manchester United', 'Man City': 'Manchester City', 'Newcastle': 'Newcastle United',
    'Nott\'m Forest': 'Nottingham Forest', 'Wolves': 'Wolverhampton Wanderers', 'Hull': 'Hull City',
    'Ipswich': 'Ipswich Town', 'Norwich': 'Norwich City', 'Luton': 'Luton Town', 'Coventry': 'Coventry City',
    'Leeds': 'Leeds United', 'Ath Bilbao': 'Athletic Club',
    'Espanol': 'Espanyol', 'Vallecano': 'Rayo Vallecano',
    'Sociedad': 'Real Sociedad', 'Valladolid': 'Real Valladolid', 'Betis': 'Real Betis',
    'Alaves': 'Deportivo Alaves', 'Oviedo': 'Real Oviedo', 'Granada': 'Granada CF',
    'M\'gladbach': 'Borussia Monchengladbach', 'Ein Frankfurt': 'Eintracht Frankfurt',
    'Stuttgart': 'VfB Stuttgart', 'Dortmund': 'Borussia Dortmund',
    'Mainz': 'FSV Mainz 05', 'Freiburg': 'SC Freiburg', 'Augsburg': 'FC Augsburg',
    'Hertha': 'Hertha BSC', 'Bielefeld': 'Arminia Bielefeld', 'Darmstadt': 'SV Darmstadt 98',
    'St Pauli': 'St. Pauli', 'Wolfsburg': 'VfL Wolfsburg', 'Elversberg': 'SV Elversberg',
    'Paderborn': 'SC Paderborn 07', 'Paris SG': 'Paris Saint Germain', 'St Etienne': 'Saint Etienne',
    'Clermont': 'Clermont Foot', 'Nijmegen': 'NEC Nijmegen', 'For Sittard': 'Fortuna Sittard',
    'Zwolle': 'PEC Zwolle', 'Den Haag': 'ADO Den Haag', 'Heracles': 'Heracles Almelo',
    'Groningen': 'FC Groningen', 'Volendam': 'FC Volendam', 'Utrecht': 'FC Utrecht',
    'Waalwijk': 'RKC Waalwijk', 'Sp Lisbon': 'Sporting CP', 'Pacos Ferreira': 'Pacos de Ferreira',
    'Porto': 'FC Porto', 'Farense': 'SC Farense', 'Sp Braga': 'SC Braga', 'AVS': 'AVS Futebol SAD',
    'Alverca': 'FC Alverca', 'Buyuksehyr': 'Istanbul Basaksehir', 'Goztep': 'Goztepe',
    'Ad. Demirspor': 'Adana Demirspor', 'Karagumruk': 'Fatih Karagumruk', 'Erzurumspor': 'Erzurumspor FK',
    'Corum': 'Corum FK', 'Hearts': 'Heart Of Midlothian', 'Dundee United': 'Dundee United',
    'AEK': 'AEK Athens', 'Olympiakos': 'Olympiacos', 'Levadeiakos': 'Levadiakos',
    'Giannina': 'PAS Giannina', 'Apollon': 'Apollon Smyrnis',
    'Oud-Heverlee Leuven': 'OH Leuven', 'Antwerp': 'Royal Antwerp',
    'St Truiden': 'Sint-Truiden', 'Lommel SK': 'Lommel', 'Seraing': 'RFC Seraing',
    'Gent': 'KAA Gent', 'Mechelen': 'KV Mechelen', 'Beveren': 'SK Beveren', 'Standard': 'Standard Liege',
    'Oostende': 'KV Oostende', 'Genk': 'KRC Genk', 'Eupen': 'KAS Eupen'
}

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8').lower()
    s = re.sub(r'\b(fc|cf|ac|as|sc|afc|cd|rcd|rc|ud|us|ss|bv|sv|fk|sk|vfl|vfb|bsc)\b', '', s)
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

class Command(BaseCommand):
    help = 'Download official high-resolution team logos and sync logo_url in database'

    def handle(self, *args, **options):
        self.stdout.write("Memulai sinkronisasi logo tim resmi terbaru...")
        sys.stdout.flush()

        # 1. Tentukan direktori penyimpanan aset frontend
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        public_teams_dir = os.path.join(base_dir, 'website', 'frontend', 'public', 'logos', 'teams')
        os.makedirs(public_teams_dir, exist_ok=True)
        self.stdout.write(f"Target folder aset: {public_teams_dir}")
        sys.stdout.flush()

        # 2. Ambil katalog lengkap logo dari repositori luukhopman/football-logos
        tree_url = 'https://api.github.com/repos/luukhopman/football-logos/git/trees/master?recursive=1'
        req = urllib.request.Request(tree_url, headers={'User-Agent': 'L1PrediksikanBot/1.0 (contact@l1prediksikan.my.id)'})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                tree = json.loads(resp.read().decode())['tree']
                png_files = [x['path'] for x in tree if x['path'].endswith('.png')]
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Gagal mengambil katalog pohon GitHub: {e}"))
            return

        # Prioritas: logos/ (musim terbaru/berjalan) terlebih dahulu, baru history/
        current_logos = [p for p in png_files if p.startswith('logos/')]
        history_logos = [p for p in png_files if p.startswith('history/')]
        history_logos.sort(reverse=True)
        ordered_files = current_logos + history_logos

        file_map = {}
        for p in ordered_files:
            fname = p.split('/')[-1][:-4]
            n = norm(fname)
            if n not in file_map:
                file_map[n] = p

        # 3. Dapatkan liga aktual tim menggunakan .distinct() yang cepat
        self.stdout.write("Memetakan liga masing-masing tim...")
        sys.stdout.flush()
        team_league_map = {}
        for row in MatchHistory.objects.values('home_team_id', 'league_id').distinct():
            team_league_map[row['home_team_id']] = row['league_id']
        for row in MatchHistory.objects.values('away_team_id', 'league_id').distinct():
            if row['away_team_id'] not in team_league_map:
                team_league_map[row['away_team_id']] = row['league_id']

        spain_league = League.objects.filter(code='SP1').first()
        spain_id = spain_league.id if spain_league else None

        teams = list(Team.objects.all().order_by('name'))
        self.stdout.write(f"Menemukan {len(teams)} tim di database. Mencocokkan logo...")
        sys.stdout.flush()

        tasks = []
        for team in teams:
            cand = EXPLICIT_MAPPING.get(team.name, team.name)
            n = norm(cand)
            rel_path = file_map.get(n)

            if not rel_path:
                for fn, p in file_map.items():
                    if n == fn or (len(n) >= 5 and (n in fn or fn in n)):
                        rel_path = p
                        break

            if not rel_path:
                self.stdout.write(self.style.WARNING(f"Logo tidak ditemukan untuk tim: {team.name}"))
                continue

            slug = slugify(team.name)
            filename = f"{slug}.png"
            dest_file = os.path.join(public_teams_dir, filename)
            
            quoted_path = urllib.parse.quote(rel_path)
            raw_url = f"https://raw.githubusercontent.com/luukhopman/football-logos/master/{quoted_path}"
            prod_logo_url = f"https://l1prediksikan.my.id/logos/teams/{filename}"

            league_id = team_league_map.get(team.id)
            if not league_id and team.name in ['Dep. A Coruna', 'Rayo Vallecano', 'Atl. Madrid']:
                league_id = spain_id

            tasks.append((team.id, team.name, raw_url, dest_file, prod_logo_url, league_id))

        self.stdout.write(f"Mulai mengunduh {len(tasks)} logo secara paralel (12 workers)...")
        sys.stdout.flush()

        def download_file(item):
            tid, tname, raw_url, dest_file, prod_logo_url, league_id = item
            try:
                if not os.path.exists(dest_file) or os.path.getsize(dest_file) == 0:
                    req = urllib.request.Request(raw_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        data = resp.read()
                        with open(dest_file, 'wb') as f:
                            f.write(data)
                return tid, prod_logo_url, league_id, True, None
            except Exception as e:
                return tid, prod_logo_url, league_id, False, str(e)

        downloaded_results = []
        with ThreadPoolExecutor(max_workers=12) as executor:
            future_to_task = {executor.submit(download_file, task): task for task in tasks}
            done_count = 0
            for future in as_completed(future_to_task):
                res = future.result()
                downloaded_results.append(res)
                done_count += 1
                if done_count % 30 == 0 or done_count == len(tasks):
                    self.stdout.write(f"Progres unduhan: {done_count}/{len(tasks)} file...")
                    sys.stdout.flush()

        self.stdout.write("Memperbarui data Team di database Supabase...")
        sys.stdout.flush()
        
        updated_count = 0
        teams_to_update = []
        team_objs = {t.id: t for t in teams}

        for tid, prod_url, league_id, ok, err in downloaded_results:
            if ok and tid in team_objs:
                t = team_objs[tid]
                t.logo_url = prod_url
                if league_id:
                    t.league_id = league_id
                teams_to_update.append(t)
                updated_count += 1

        # Bulk update
        Team.objects.bulk_update(teams_to_update, ['logo_url', 'league'], batch_size=100)

        self.stdout.write(self.style.SUCCESS(f"Selesai! Berhasil mengunduh dan menyinkronkan {updated_count}/{len(teams)} logo tim."))
        sys.stdout.flush()
