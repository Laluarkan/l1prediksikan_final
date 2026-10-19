import os
import sqlite3
import json
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
from predictions.models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket

class Command(BaseCommand):
    help = 'Memulihkan database FULL (17.565 Laga, Parlay, Fixtures) langsung dari db.sqlite3 lokal'

    def handle(self, *args, **kwargs):
        sqlite_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')
        if not os.path.exists(sqlite_path):
            self.stdout.write(self.style.ERROR(f"File {sqlite_path} tidak ditemukan!"))
            return

        self.stdout.write(self.style.WARNING(f"Membuka database lokal: {sqlite_path}..."))
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # 1. Bersihkan tabel tujuan di database aktif (Supabase)
        self.stdout.write(self.style.WARNING("Membersihkan tabel Supabase lama..."))
        with connection.cursor() as pg_cur:
            pg_cur.execute("TRUNCATE TABLE predictions_parlayticket, predictions_matchhistory, predictions_upcomingfixture, predictions_team, predictions_league CASCADE;")

        # 2. Pindahkan League
        self.stdout.write("Memindahkan data League...")
        cur.execute("SELECT id, code, name, country FROM predictions_league")
        leagues = [League(id=r['id'], code=r['code'], name=r['name'], country=r['country']) for r in cur.fetchall()]
        League.objects.bulk_create(leagues)
        self.stdout.write(f"  -> {len(leagues)} Liga tersimpan.")

        # 3. Pindahkan Team
        self.stdout.write("Memindahkan data Team...")
        cur.execute("SELECT id, name, logo_url, api_football_id, league_id FROM predictions_team")
        teams = [Team(id=r['id'], name=r['name'], logo_url=r['logo_url'], api_football_id=r['api_football_id'], league_id=r['league_id']) for r in cur.fetchall()]
        Team.objects.bulk_create(teams, batch_size=500)
        self.stdout.write(f"  -> {len(teams)} Tim tersimpan.")

        # 4. Pindahkan Upcoming Fixtures
        self.stdout.write("Memindahkan data UpcomingFixture...")
        cur.execute("SELECT * FROM predictions_upcomingfixture")
        fix_rows = cur.fetchall()
        fixtures = []
        for r in fix_rows:
            d = dict(r)
            if isinstance(d.get('extended_features'), str):
                try:
                    d['extended_features'] = json.loads(d['extended_features'])
                except Exception:
                    d['extended_features'] = {}
            fixtures.append(UpcomingFixture(**d))
        UpcomingFixture.objects.bulk_create(fixtures, batch_size=500)
        self.stdout.write(f"  -> {len(fixtures)} Jadwal Fixture tersimpan.")

        # 5. Pindahkan Parlay Tickets
        self.stdout.write("Memindahkan data ParlayTicket...")
        cur.execute("SELECT * FROM predictions_parlayticket")
        parlay_rows = cur.fetchall()
        parlays = []
        for r in parlay_rows:
            d = dict(r)
            if isinstance(d.get('legs_details'), str):
                try:
                    d['legs_details'] = json.loads(d['legs_details'])
                except Exception:
                    d['legs_details'] = []
            parlays.append(ParlayTicket(**d))
        ParlayTicket.objects.bulk_create(parlays, batch_size=1000)
        self.stdout.write(f"  -> {len(parlays)} Tiket Parlay tersimpan.")

        # 6. Pindahkan MatchHistory (17.565 baris secara batching)
        self.stdout.write("Memindahkan data MatchHistory (17.565 laga dari musim 2021 hingga 2026)...")
        cur.execute("SELECT * FROM predictions_matchhistory")
        total_hist = 0
        while True:
            rows = cur.fetchmany(1000)
            if not rows:
                break
            chunk = []
            for r in rows:
                d = dict(r)
                if isinstance(d.get('extended_features'), str):
                    try:
                        d['extended_features'] = json.loads(d['extended_features'])
                    except Exception:
                        d['extended_features'] = {}
                chunk.append(MatchHistory(**d))
            MatchHistory.objects.bulk_create(chunk, batch_size=1000)
            total_hist += len(chunk)
            self.stdout.write(f"  -> {total_hist}/17565 riwayat laga tersimpan...")

        conn.close()

        # 7. Reset sequences di PostgreSQL (Supabase)
        self.stdout.write("Mereset serial ID sequences di Supabase...")
        with connection.cursor() as pg_cur:
            for tbl in ['predictions_league', 'predictions_team', 'predictions_matchhistory', 'predictions_upcomingfixture', 'predictions_parlayticket']:
                pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), coalesce(max(id), 1)) FROM {tbl};")

        # 8. Bersihkan cache
        try:
            from django.core.cache import cache
            cache.clear()
            self.stdout.write(self.style.SUCCESS("Cache Redis/Django berhasil dibersihkan."))
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS(f"\n[SUKSES] SELURUH DATA LENGKAP HISTORIS BERHASIL DIPINDAHKAN!"))
        self.stdout.write(self.style.SUCCESS(f"Total data di Supabase: {total_hist} History, {len(fixtures)} Fixture, {len(parlays)} Parlay."))
