import os
import datetime
import hmac
import logging
from django.conf import settings
from django.utils import timezone
from django.core.management import call_command
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema

from .models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket, BroadcastNotification
from .serializers import (LeagueSerializer, TeamSerializer, MatchHistorySerializer, 
                          UpcomingFixtureSerializer, ParlayTicketSerializer, BroadcastNotificationSerializer)
from .services import preview_uploaded_data, commit_uploaded_data

logger = logging.getLogger(__name__)
User = get_user_model()

def is_valid_server_request(request):
    client_secret = request.headers.get('X-Sync-Secret', '')
    expected_secret = os.environ.get('SYNC_SECRET_KEY', 'Laluarkan123@')
    return hmac.compare_digest(client_secret, expected_secret)

class SyncUserView(APIView):
    permission_classes = [] 
    authentication_classes = []

    @extend_schema(exclude=True)
    def post(self, request):
        if not is_valid_server_request(request):
            logger.warning("Akses SyncUserView ditolak: Kunci Sinkronisasi tidak cocok.")
            return Response({'error': 'Akses Ditolak. Endpoint khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email', '').strip().lower()
        username = request.data.get('username', '').strip()
        password = request.data.get('password')
        name = request.data.get('name', '').strip()
        is_register = request.data.get('is_register', False)
        is_google = request.data.get('is_google', False)
        
        if not email:
            return Response({'error': 'Email wajib disertakan'}, status=status.HTTP_400_BAD_REQUEST)

        # Cek apakah email sudah terdaftar sebelumnya
        existing_user = User.objects.filter(email__iexact=email).first()
        
        if is_register and existing_user:
            return Response({
                'error': 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if existing_user:
            user = existing_user
            created = False
            
            if is_google:
                # Login Google terverifikasi dari penyedia Google OAuth
                if name and not user.first_name:
                    user.first_name = name
                    user.save(update_fields=['first_name'])
            else:
                # Login manual Email & Password
                if user.has_usable_password():
                    if not password:
                        return Response({
                            'error': 'Password wajib diisi.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    if not user.check_password(password):
                        return Response({
                            'error': 'Password yang Anda masukkan salah. Silakan periksa kembali.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                elif not user.has_usable_password() and password:
                    # Akun dibuat dari Google, sekarang mengatur password
                    user.set_password(password)
                    user.save()
                elif not user.has_usable_password() and not password:
                    return Response({
                        'error': 'Akun ini terdaftar melalui Akun Google. Silakan klik Masuk dengan Google.'
                    }, status=status.HTTP_400_BAD_REQUEST)
        else:
            if not is_register and not is_google:
                return Response({
                    'error': 'Akun dengan email ini belum terdaftar. Silakan daftar akun terlebih dahulu.'
                }, status=status.HTTP_404_NOT_FOUND)

            created = True
            username_val = username or email.split('@')[0]
            # Pastikan username unik di database
            base_username = username_val
            counter = 1
            while User.objects.filter(username__iexact=username_val).exists():
                username_val = f"{base_username}_{counter}"
                counter += 1

            user = User(
                email=email,
                username=username_val,
                first_name=name or username_val,
                is_active=True
            )
            # Enkripsi password menggunakan Django built-in PBKDF2 SHA-256 hasher
            if password:
                user.set_password(password)
            else:
                # Login dengan akun Google tidak menyertakan password
                user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User berhasil didaftarkan' if created else 'User berhasil disinkronisasi', 
            'user_id': user.id,
            'username': user.username,
            'is_staff': user.is_staff,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'avatar_url': f"https://ui-avatars.com/api/?name={user.username}&background=059669&color=fff&bold=true"
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class CheckEmailView(APIView):
    permission_classes = []
    authentication_classes = []

    @extend_schema(exclude=True)
    def get(self, request):
        if not is_valid_server_request(request):
            return Response({'error': 'Akses Ditolak. Endpoint khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.query_params.get('email', '').strip().lower()
        username = request.query_params.get('username', '').strip()

        exists = False
        if email:
            exists = User.objects.filter(email__iexact=email).exists()
        elif username:
            exists = User.objects.filter(username__iexact=username).exists()

        return Response({'exists': exists})

class CheckStaffView(APIView):
    permission_classes = []
    authentication_classes = []

    @extend_schema(exclude=True)
    def get(self, request):
        if not is_valid_server_request(request):
            return Response({'error': 'Akses Ditolak. Endpoint khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.query_params.get('email')
        if not email:
            return Response({'is_staff': False})
            
        try:
            user = User.objects.get(email=email)
            return Response({'is_staff': user.is_staff})
        except User.DoesNotExist:
            return Response({'is_staff': False})
class ClearCacheView(APIView):
    permission_classes = []
    authentication_classes = []

    @extend_schema(exclude=True)
    def post(self, request):
        if not is_valid_server_request(request):
            return Response({'error': 'Akses Ditolak.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            from django.core.cache import cache
            cache.clear()
            logger.info("Cache Redis di Render berhasil dibersihkan via webhook /api/clear-cache/.")
            return Response({'message': 'Cache Redis berhasil dibersihkan.'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Gagal membersihkan cache via webhook: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(cache_page(60 * 60 * 24), name='dispatch')
class LeagueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = League.objects.all().order_by('name')
    serializer_class = LeagueSerializer

@method_decorator(cache_page(60 * 60 * 24), name='dispatch')
class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Team.objects.select_related('league').order_by('name')
    serializer_class = TeamSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['league__code']
    search_fields = ['name']

# Cache diaktifkan kembali: payload ringkas (tanpa extended_features) aman di Redis & di-invalasi otomatis saat ada data baru
@method_decorator(cache_page(60 * 60 * 12), name='dispatch')
class MatchHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MatchHistorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['league__code', 'has_value_bet', 'has_value_bet_ou', 'part_of_parlay', 'is_won_ftr', 'is_won_ou']
    search_fields = ['home_team__name', 'away_team__name', 'parlay_ticket_info']
    ordering_fields = ['date']

    def get_queryset(self):
        queryset = MatchHistory.objects.select_related('league', 'home_team', 'away_team').all()
        
        season = self.request.query_params.get('season')
        if season and season != 'ALL':
            try:
                if '/' in season:
                    y1, y2 = season.split('/')
                    start_year = 2000 + int(y1)
                    end_year = 2000 + int(y2)
                    start_date = timezone.make_aware(datetime.datetime(start_year, 7, 1))
                    end_date = timezone.make_aware(datetime.datetime(end_year, 6, 30, 23, 59, 59))
                else:
                    year = int(season)
                    if year < 100:
                        year += 2000
                    start_date = timezone.make_aware(datetime.datetime(year, 1, 1))
                    end_date = timezone.make_aware(datetime.datetime(year, 12, 31, 23, 59, 59))
                queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
            except Exception:
                pass

        filter_result = (self.request.query_params.get('filter_result') or '').upper()
        if filter_result in ['WON', 'WIN']:
            queryset = queryset.filter(Q(is_won_ftr=True) | Q(is_won_ou=True))
        elif filter_result in ['LOST', 'LOSE']:
            queryset = queryset.filter(Q(is_won_ftr=False) | Q(is_won_ou=False))
            
        filter_ftr = self.request.query_params.get('filter_ftr')
        if filter_ftr and filter_ftr.lower() == 'true':
            queryset = queryset.filter(rl_stake_ftr__gt=0)
            
        filter_ou = self.request.query_params.get('filter_ou')
        if filter_ou and filter_ou.lower() == 'true':
            queryset = queryset.filter(rl_stake_ou__gt=0)

        return queryset

# Cache diaktifkan kembali: payload ringkas (tanpa extended_features) aman di Redis & di-invalasi otomatis saat ada data baru
@method_decorator(cache_page(60 * 60 * 12), name='dispatch')
class UpcomingFixtureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UpcomingFixture.objects.all()
    serializer_class = UpcomingFixtureSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['league__code', 'has_value_bet', 'has_value_bet_ou', 'part_of_parlay', 'is_processed']
    search_fields = ['home_team__name', 'away_team__name', 'parlay_ticket_info']
    ordering_fields = ['date']

    def get_queryset(self):
        now = timezone.now()
        return UpcomingFixture.objects.select_related('league', 'home_team', 'away_team').filter(date__gte=now).order_by('date')

# Cache diaktifkan kembali: payload ringkas & di-invalasi otomatis saat ada data baru
@method_decorator(cache_page(60 * 60 * 12), name='dispatch')
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
        
        if is_historical_param is not None:
            if is_historical_param.lower() in ['true', '1']:
                queryset = queryset.filter(is_historical=True)
            elif is_historical_param.lower() in ['false', '0']:
                now_date = timezone.now().date()
                queryset = queryset.filter(is_historical=False, date__gte=now_date)
            
        season = self.request.query_params.get('season')
        if season and season != 'ALL':
            try:
                if '/' in season:
                    y1, y2 = season.split('/')
                    start_year = 2000 + int(y1)
                    end_year = 2000 + int(y2)
                    start_date = datetime.date(start_year, 7, 1)
                    end_date = datetime.date(end_year, 6, 30)
                else:
                    year = int(season)
                    if year < 100:
                        year += 2000
                    start_date = datetime.date(year, 1, 1)
                    end_date = datetime.date(year, 12, 31)

                queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
            except Exception:
                pass

        filter_result = (self.request.query_params.get('filter_result') or '').upper()
        if filter_result in ['WON', 'WIN']:
            queryset = queryset.filter(is_won=True)
        elif filter_result in ['LOST', 'LOSE']:
            queryset = queryset.filter(is_won=False)

        search = self.request.query_params.get('search')
        if search:
            search_str = search.strip()
            if search_str:
                queryset = queryset.filter(
                    Q(ticket_id__icontains=search_str) | Q(legs_details__icontains=search_str)
                )

        return queryset

class DatasetPreviewView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    @extend_schema(exclude=True)
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

    @extend_schema(exclude=True)
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
    @extend_schema(exclude=True)
    def get(self, request):
        season = request.query_params.get('season', 'ALL')
        cache_key = f"perf_metrics_{season}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            resp = Response(cached_result)
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp
        
        history_qs = MatchHistory.objects.all() 
        parlay_qs = ParlayTicket.objects.filter(is_historical=True)
        
        if season != 'ALL':
            try:
                if '/' in season:
                    y1, y2 = season.split('/')
                    start_year = 2000 + int(y1)
                    end_year = 2000 + int(y2)
                    start_date = timezone.make_aware(datetime.datetime(start_year, 7, 1))
                    end_date = timezone.make_aware(datetime.datetime(end_year, 6, 30, 23, 59, 59))
                else:
                    year = int(season)
                    if year < 100:
                        year += 2000
                    start_date = timezone.make_aware(datetime.datetime(year, 1, 1))
                    end_date = timezone.make_aware(datetime.datetime(year, 12, 31, 23, 59, 59))

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

        result = {
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
        }
        cache.set(cache_key, result, timeout=60 * 60 * 12)
        resp = Response(result)
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp

class LeagueStandingsAPIView(APIView):
    @extend_schema(exclude=True)
    def get(self, request):
        league_code = request.query_params.get('league')
        season = request.query_params.get('season')

        if not league_code or not season:
            return Response([])

        cache_key = f"standings_{league_code}_{season}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            resp = Response(cached_result)
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

        try:
            if '/' in season:
                y1, y2 = season.split('/')
                start_year = 2000 + int(y1)
                end_year = 2000 + int(y2)
                start_date = timezone.make_aware(datetime.datetime(start_year, 7, 1))
                end_date = timezone.make_aware(datetime.datetime(end_year, 6, 30, 23, 59, 59))
            else:
                year = int(season)
                if year < 100:
                    year += 2000
                start_date = timezone.make_aware(datetime.datetime(year, 1, 1))
                end_date = timezone.make_aware(datetime.datetime(year, 12, 31, 23, 59, 59))
        except Exception:
            return Response([])

        matches = MatchHistory.objects.filter(
            league__code=league_code,
            date__gte=start_date,
            date__lte=end_date
        ).values('home_team__name', 'away_team__name', 'home_team__logo_url', 'away_team__logo_url', 'fthg', 'ftag')

        standings = {}
        for m in matches:
            home = m['home_team__name']
            away = m['away_team__name']
            home_logo = m['home_team__logo_url']
            away_logo = m['away_team__logo_url']

            if home not in standings:
                standings[home] = {'team': home, 'logo': home_logo, 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0}
            if away not in standings:
                standings[away] = {'team': away, 'logo': away_logo, 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0}

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

        cache.set(cache_key, sorted_standings, timeout=60 * 60 * 12)
        resp = Response(sorted_standings)
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp

class BroadcastNotificationViewSet(viewsets.ModelViewSet):
    queryset = BroadcastNotification.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = BroadcastNotificationSerializer
    permission_classes = []
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notif_type', 'is_active']
    ordering_fields = ['created_at']

    def create(self, request, *args, **kwargs):
        is_staff = request.user and request.user.is_authenticated and request.user.is_staff
        has_secret = is_valid_server_request(request)
        admin_email = request.data.get('admin_email')

        if admin_email and not is_staff:
            try:
                user = User.objects.get(email__iexact=admin_email)
                if user.is_staff:
                    is_staff = True
            except User.DoesNotExist:
                pass

        if not (is_staff or has_secret):
            return Response(
                {'error': 'Akses Ditolak. Hanya staf admin yang dapat menyiarkan notifikasi manual.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().create(request, *args, **kwargs)

class CronTriggerAPIView(APIView):
    permission_classes = [] 
    authentication_classes = []

    @extend_schema(exclude=True)
    def get(self, request):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        secret = os.environ.get('CRON_SECRET_KEY')
        
        if not secret or not token or not hmac.compare_digest(token, secret):
            logger.warning("Upaya akses ilegal ke CronTriggerAPIView terdeteksi.")
            return Response({"error": "Akses Ditolak. Token tidak valid atau belum diatur."}, status=status.HTTP_403_FORBIDDEN)
            
        from .tasks import run_fetch_jobs_task
        run_fetch_jobs_task.delay()
        
        return Response({"message": "Cron jobs telah berhasil dimasukkan ke dalam antrean Celery (Job Queue)."}, status=status.HTTP_200_OK)