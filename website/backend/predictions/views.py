import os
import threading
import datetime
import hmac
import logging
from django.conf import settings
from django.utils import timezone
from django.core.management import call_command
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket
from .serializers import (LeagueSerializer, TeamSerializer, MatchHistorySerializer, 
                          UpcomingFixtureSerializer, ParlayTicketSerializer)
from .services import preview_uploaded_data, commit_uploaded_data

logger = logging.getLogger(__name__)
User = get_user_model()

# ==========================================
# FUNGSI GEMBOK SERVER-TO-SERVER BARU
# ==========================================
def is_valid_server_request(request):
    client_secret = request.headers.get('X-Sync-Secret', '')
    expected_secret = os.environ.get('SYNC_SECRET_KEY', 'l1prediksikan-sync-rahasia-2026')
    return hmac.compare_digest(client_secret, expected_secret)

class SyncUserView(APIView):
    permission_classes = [] 
    authentication_classes = []

    def post(self, request):
        if not is_valid_server_request(request):
            logger.warning("Akses SyncUserView ditolak: Kunci Sinkronisasi tidak cocok.")
            return Response({'error': 'Akses Ditolak. Endpoint ini khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        name = request.data.get('name')
        
        if not email:
            return Response({'error': 'Email wajib disertakan'}, status=status.HTTP_400_BAD_REQUEST)
            
        username_base = email.split('@')[0]
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username_base,
                'first_name': name or '',
                'is_active': True
            }
        )
        
        if created:
            user.save()
            
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User berhasil disinkronisasi', 
            'user_id': user.id,
            'is_staff': user.is_staff,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class CheckStaffView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        if not is_valid_server_request(request):
            return Response({'error': 'Akses Ditolak. Endpoint ini khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.query_params.get('email')
        if not email:
            return Response({'is_staff': False})
            
        try:
            user = User.objects.get(email=email)
            return Response({'is_staff': user.is_staff})
        except User.DoesNotExist:
            return Response({'is_staff': False})

# ==========================================
# VIEWSET DAN API STANDAR
# ==========================================
class LeagueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = League.objects.all().order_by('name')
    serializer_class = LeagueSerializer

class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Team.objects.all().order_by('name')
    serializer_class = TeamSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['league__code']
    search_fields = ['name']

class MatchHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MatchHistory.objects.all()
    serializer_class = MatchHistorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['league__code', 'has_value_bet', 'has_value_bet_ou', 'part_of_parlay', 'is_won_ftr', 'is_won_ou']
    search_fields = ['home_team__name', 'away_team__name', 'parlay_ticket_info']
    ordering_fields = ['date']

class UpcomingFixtureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UpcomingFixture.objects.all()
    serializer_class = UpcomingFixtureSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['league__code', 'has_value_bet', 'has_value_bet_ou', 'part_of_parlay', 'is_processed']
    search_fields = ['home_team__name', 'away_team__name', 'parlay_ticket_info']
    ordering_fields = ['date']

    def get_queryset(self):
        now = timezone.now()
        return UpcomingFixture.objects.filter(date__gte=now).order_by('date')

class ParlayTicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ParlayTicket.objects.all()
    serializer_class = ParlayTicketSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_won', 'is_historical']
    search_fields = ['ticket_id']
    ordering_fields = ['date', 'total_odds', 'total_prob']

    def get_queryset(self):
        queryset = ParlayTicket.objects.all()
        is_historical_param = self.request.query_params.get('is_historical')
        
        if is_historical_param and is_historical_param.lower() in ['false', '0']:
            now_date = timezone.now().date()
            queryset = queryset.filter(date__gte=now_date)
            
        return queryset

class DatasetPreviewView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        upload_type = request.data.get('upload_type', 'history')
        league_code = request.data.get('league', 'ALL') 
        
        if not file_obj:
            logger.warning("Upload ditolak: Tidak ada file yang disisipkan.")
            return Response({"error": "Tidak ada file yang diunggah."}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.endswith('.csv'):
            logger.warning(f"Upload ditolak: Format tidak valid ({file_obj.name}).")
            return Response({"error": "Format file tidak valid. Harap unggah file CSV."}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > settings.DATA_UPLOAD_MAX_MEMORY_SIZE:
            logger.warning(f"Upload ditolak: Ukuran melebihi batas ({file_obj.size} bytes).")
            return Response({"error": "Ukuran file terlalu besar (Maksimal 5MB)."}, status=status.HTTP_400_BAD_REQUEST)

        header_chunk = file_obj.read(1024).decode('utf-8', errors='ignore')
        file_obj.seek(0)
        if 'Date' not in header_chunk and 'Div' not in header_chunk:
            logger.warning("Upload ditolak: Header kolom CSV tidak dikenali.")
            return Response({"error": "File CSV tidak valid, kolom Date/Div tidak ditemukan."}, status=status.HTTP_400_BAD_REQUEST)

        temp_path = os.path.join(settings.BASE_DIR, 'temp_upload.csv')
        
        try:
            with open(temp_path, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)

            logger.info(f"Admin memproses preview CSV: {file_obj.name} (Tipe: {upload_type})")
            result = preview_uploaded_data(temp_path, upload_type, league_code)
            
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error proses preview ML: {str(e)}", exc_info=True)
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return Response({"error": f"Terjadi kesalahan saat memproses data ML: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DatasetConfirmSaveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        upload_type = request.data.get('upload_type', 'history')
        try:
            logger.info(f"Admin memulai proses penyimpanan dataset {upload_type} ke database.")
            hist_count, fix_count = commit_uploaded_data(upload_type)
            logger.info(f"Simpan sukses: {hist_count} History, {fix_count} Fixture.")
            return Response({
                "message": f"Dataset {upload_type} berhasil disimpan ke database.",
                "history_saved": hist_count,
                "fixtures_saved": fix_count
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Gagal menyimpan data konfirmasi: {str(e)}", exc_info=True)
            return Response({"error": f"Gagal menyimpan data ke database: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PerformanceMetricsAPIView(APIView):
    def get(self, request):
        season = request.query_params.get('season', 'ALL')
        
        history_qs = MatchHistory.objects.all() 
        parlay_qs = ParlayTicket.objects.filter(is_historical=True)
        
        if season != 'ALL':
            try:
                y1, y2 = season.split('/')
                start_year = 2000 + int(y1)
                end_year = 2000 + int(y2)
                start_date = timezone.make_aware(datetime.datetime(start_year, 7, 1))
                end_date = timezone.make_aware(datetime.datetime(end_year, 6, 30, 23, 59, 59))
                history_qs = history_qs.filter(date__gte=start_date, date__lte=end_date)
                parlay_qs = parlay_qs.filter(date__gte=start_date, date__lte=end_date)
            except Exception:
                pass

        ftr_wins = ftr_losses = 0
        ftr_unit_profit = ftr_unit_stake = 0.0
        
        ou_wins = ou_losses = 0
        ou_unit_profit = ou_unit_stake = 0.0

        hist_data = history_qs.values(
            'rl_stake_ftr', 'is_won_ftr', 'rl_pick_ftr', 'avg_h', 'avg_d', 'avg_a',
            'rl_stake_ou', 'is_won_ou', 'rl_pick_ou', 'avg_over_25', 'avg_under_25'
        ).iterator(chunk_size=2000)

        for match in hist_data:
            if match['rl_stake_ftr'] and match['rl_stake_ftr'] > 0:
                stake = float(match['rl_stake_ftr'])
                ftr_unit_stake += stake
                if match['is_won_ftr'] is True:
                    ftr_wins += 1
                    odds = match['avg_h'] if match['rl_pick_ftr'] == 'H' else (match['avg_d'] if match['rl_pick_ftr'] == 'D' else match['avg_a'])
                    ftr_unit_profit += (stake * float(odds or 1)) - stake
                elif match['is_won_ftr'] is False:
                    ftr_losses += 1
                    ftr_unit_profit -= stake
            
            if match['rl_stake_ou'] and match['rl_stake_ou'] > 0:
                stake = float(match['rl_stake_ou'])
                ou_unit_stake += stake
                if match['is_won_ou'] is True:
                    ou_wins += 1
                    odds = match['avg_over_25'] if match['rl_pick_ou'] == 'Over 2.5' else match['avg_under_25']
                    ou_unit_profit += (stake * float(odds or 1)) - stake
                elif match['is_won_ou'] is False:
                    ou_losses += 1
                    ou_unit_profit -= stake

        parlay_wins = parlay_losses = 0
        parlay_unit_profit = parlay_unit_stake = 0.0
        
        parlay_data = parlay_qs.values('is_won', 'total_odds').iterator(chunk_size=1000)
        
        for ticket in parlay_data:
            stake = 1.0 
            parlay_unit_stake += stake
            if ticket['is_won'] is True:
                parlay_wins += 1
                parlay_unit_profit += (stake * float(ticket['total_odds'] or 1)) - stake
            elif ticket['is_won'] is False:
                parlay_losses += 1
                parlay_unit_profit -= stake

        return Response({
            "ftr": {
                "wins": ftr_wins, "losses": ftr_losses, 
                "unit_profit": ftr_unit_profit, "unit_stake": ftr_unit_stake
            },
            "ou": {
                "wins": ou_wins, "losses": ou_losses, 
                "unit_profit": ou_unit_profit, "unit_stake": ou_unit_stake
            },
            "parlay": {
                "wins": parlay_wins, "losses": parlay_losses, 
                "unit_profit": parlay_unit_profit, "unit_stake": parlay_unit_stake
            }
        })

class LeagueStandingsAPIView(APIView):
    def get(self, request):
        league_code = request.query_params.get('league')
        season = request.query_params.get('season')

        if not league_code or not season:
            return Response([])

        try:
            y1, y2 = season.split('/')
            start_year = 2000 + int(y1)
            end_year = 2000 + int(y2)
            start_date = timezone.make_aware(datetime.datetime(start_year, 7, 1))
            end_date = timezone.make_aware(datetime.datetime(end_year, 6, 30, 23, 59, 59))
        except Exception:
            return Response([])

        matches = MatchHistory.objects.filter(
            league__code=league_code,
            date__gte=start_date,
            date__lte=end_date
        ).values('home_team__name', 'away_team__name', 'fthg', 'ftag')

        standings = {}
        for m in matches:
            home = m['home_team__name']
            away = m['away_team__name']

            if home not in standings:
                standings[home] = {'team': home, 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0}
            if away not in standings:
                standings[away] = {'team': away, 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0}

            hg = m['fthg'] if m['fthg'] is not None else 0
            ag = m['ftag'] if m['ftag'] is not None else 0

            standings[home]['p'] += 1
            standings[home]['gf'] += hg
            standings[home]['ga'] += ag

            standings[away]['p'] += 1
            standings[away]['gf'] += ag
            standings[away]['ga'] += hg

            if hg > ag:
                standings[home]['w'] += 1
                standings[home]['pts'] += 3
                standings[away]['l'] += 1
            elif hg < ag:
                standings[away]['w'] += 1
                standings[away]['pts'] += 3
                standings[home]['l'] += 1
            else:
                standings[home]['d'] += 1
                standings[home]['pts'] += 1
                standings[away]['d'] += 1
                standings[away]['pts'] += 1

        for team in standings.values():
            team['gd'] = team['gf'] - team['ga']

        sorted_standings = sorted(standings.values(), key=lambda x: (x['pts'], x['gd'], x['gf']), reverse=True)

        for i, team in enumerate(sorted_standings):
            team['rank'] = i + 1

        return Response(sorted_standings)

class CronTriggerAPIView(APIView):
    permission_classes = [] 
    authentication_classes = []

    def get(self, request):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        secret = os.environ.get('CRON_SECRET_KEY')
        
        if not secret or not token or not hmac.compare_digest(token, secret):
            logger.warning("Upaya akses ilegal ke CronTriggerAPIView terdeteksi.")
            return Response({"error": "Akses Ditolak. Token tidak valid atau belum diatur."}, status=status.HTTP_403_FORBIDDEN)
            
        def run_jobs():
            try:
                logger.info("Memulai eksekusi Cron Job dari trigger API...")
                call_command('fetch_history')
                call_command('fetch_fixture')
                logger.info("Cron Job selesai dieksekusi.")
            except Exception as e:
                logger.error(f"Cron Job Error: {str(e)}", exc_info=True)
                
        threading.Thread(target=run_jobs).start()
        
        return Response({"message": "Cron jobs untuk History dan Fixture sedang dijalankan di latar belakang."}, status=status.HTTP_200_OK)