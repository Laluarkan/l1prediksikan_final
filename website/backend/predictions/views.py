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
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count, F, Sum, Case, When, Value, FloatField
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema

from .models import (League, Team, MatchHistory, UpcomingFixture, ParlayTicket, BroadcastNotification, 
                    SavedPrediction, FeatureSuggestion, Article)
from .serializers import (LeagueSerializer, TeamSerializer, MatchHistorySerializer, 
                          UpcomingFixtureSerializer, ParlayTicketSerializer, BroadcastNotificationSerializer,
                          SavedPredictionSerializer, FeatureSuggestionSerializer,
                          ArticleListSerializer, ArticleDetailSerializer)
from .services import preview_uploaded_data, commit_uploaded_data

logger = logging.getLogger(__name__)
User = get_user_model()

def is_valid_server_request(request):
    client_secret = request.headers.get('X-Sync-Secret', '')
    expected_secret = os.environ.get('SYNC_SECRET_KEY', '')
    if not expected_secret:
        return False
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
                else:
                    # Akun terdaftar melalui Google OAuth (tanpa password lokal).
                    # Wajib tolak login password biasa untuk mencegah pengambilalihan akun (Account Takeover).
                    return Response({
                        'error': 'Akun ini terdaftar melalui Akun Google. Silakan klik tombol "Masuk dengan Google".'
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

@method_decorator(cache_page(60 * 60 * 12), name='dispatch')
class MatchHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MatchHistorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['has_value_bet', 'has_value_bet_ou', 'part_of_parlay', 'is_won_ftr', 'is_won_ou']
    search_fields = ['home_team__name', 'away_team__name', 'parlay_ticket_info']
    ordering_fields = ['date']

    def get_queryset(self):
        queryset = MatchHistory.objects.select_related('league', 'home_team', 'away_team').all()
        
        leagues_param = self.request.query_params.get('leagues') or self.request.query_params.get('league__code')
        if leagues_param:
            league_list = [l.strip() for l in leagues_param.split(',') if l.strip()]
            if league_list:
                queryset = queryset.filter(league__code__in=league_list)

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

class UpcomingFixtureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UpcomingFixture.objects.all()
    serializer_class = UpcomingFixtureSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['has_value_bet', 'has_value_bet_ou', 'part_of_parlay', 'is_processed']
    search_fields = ['home_team__name', 'away_team__name', 'parlay_ticket_info']
    ordering_fields = ['date']

    def get_queryset(self):
        now = timezone.now()
        queryset = UpcomingFixture.objects.select_related('league', 'home_team', 'away_team').filter(date__gte=now).order_by('date')
        
        leagues_param = self.request.query_params.get('leagues') or self.request.query_params.get('league__code')
        if leagues_param:
            league_list = [l.strip() for l in leagues_param.split(',') if l.strip()]
            if league_list:
                queryset = queryset.filter(league__code__in=league_list)
                
        return queryset

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

        temp_path = None
        try:
            import tempfile
            import uuid
            with tempfile.NamedTemporaryFile(prefix=f"upload_{uuid.uuid4().hex[:8]}_", suffix=".csv", delete=False) as temp_file:
                temp_path = temp_file.name
                for chunk in file_obj.chunks():
                    temp_file.write(chunk)

            logger.info(f"Admin memproses preview CSV: {file_obj.name} (Tipe: {upload_type})")
            result = preview_uploaded_data(temp_path, upload_type, league_code)
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error proses preview ML: {str(e)}", exc_info=True)
            return Response({"error": f"Terjadi kesalahan saat memproses data ML: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

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

        # --- OPTIMASI EGRESS: SQL Aggregation langsung di Database (Menghemat 99% Bandwidth) ---
        ftr_odds = Case(
            When(rl_pick_ftr='H', then=Coalesce('avg_h', Value(1.0))),
            When(rl_pick_ftr='D', then=Coalesce('avg_d', Value(1.0))),
            When(rl_pick_ftr='A', then=Coalesce('avg_a', Value(1.0))),
            default=Value(1.0),
            output_field=FloatField()
        )

        ftr_profit_case = Case(
            When(is_won_ftr=True, then=(F('rl_stake_ftr') * ftr_odds) - F('rl_stake_ftr')),
            When(is_won_ftr=False, then=-F('rl_stake_ftr')),
            default=Value(0.0),
            output_field=FloatField()
        )

        ou_odds = Case(
            When(rl_pick_ou='Over 2.5', then=Coalesce('avg_over_25', Value(1.0))),
            When(rl_pick_ou='Under 2.5', then=Coalesce('avg_under_25', Value(1.0))),
            default=Value(1.0),
            output_field=FloatField()
        )

        ou_profit_case = Case(
            When(is_won_ou=True, then=(F('rl_stake_ou') * ou_odds) - F('rl_stake_ou')),
            When(is_won_ou=False, then=-F('rl_stake_ou')),
            default=Value(0.0),
            output_field=FloatField()
        )

        hist_agg = history_qs.aggregate(
            ftr_wins=Count('id', filter=Q(rl_stake_ftr__gt=0, is_won_ftr=True)),
            ftr_losses=Count('id', filter=Q(rl_stake_ftr__gt=0, is_won_ftr=False)),
            ftr_stake=Coalesce(Sum('rl_stake_ftr', filter=Q(rl_stake_ftr__gt=0)), Value(0.0), output_field=FloatField()),
            ftr_profit=Coalesce(Sum(ftr_profit_case, filter=Q(rl_stake_ftr__gt=0)), Value(0.0), output_field=FloatField()),

            ou_wins=Count('id', filter=Q(rl_stake_ou__gt=0, is_won_ou=True)),
            ou_losses=Count('id', filter=Q(rl_stake_ou__gt=0, is_won_ou=False)),
            ou_stake=Coalesce(Sum('rl_stake_ou', filter=Q(rl_stake_ou__gt=0)), Value(0.0), output_field=FloatField()),
            ou_profit=Coalesce(Sum(ou_profit_case, filter=Q(rl_stake_ou__gt=0)), Value(0.0), output_field=FloatField()),
        )

        parlay_profit_case = Case(
            When(is_won=True, then=Coalesce('total_odds', Value(1.0)) - Value(1.0)),
            When(is_won=False, then=Value(-1.0)),
            default=Value(0.0),
            output_field=FloatField()
        )

        parlay_agg = parlay_qs.aggregate(
            parlay_wins=Count('id', filter=Q(is_won=True)),
            parlay_losses=Count('id', filter=Q(is_won=False)),
            parlay_stake=Count('id'),
            parlay_profit=Coalesce(Sum(parlay_profit_case), Value(0.0), output_field=FloatField())
        )

        result = {
            "ftr": {
                "wins": hist_agg['ftr_wins'],
                "losses": hist_agg['ftr_losses'],
                "unit_profit": hist_agg['ftr_profit'],
                "unit_stake": hist_agg['ftr_stake']
            },
            "ou": {
                "wins": hist_agg['ou_wins'],
                "losses": hist_agg['ou_losses'],
                "unit_profit": hist_agg['ou_profit'],
                "unit_stake": hist_agg['ou_stake']
            },
            "parlay": {
                "wins": parlay_agg['parlay_wins'],
                "losses": parlay_agg['parlay_losses'],
                "unit_profit": parlay_agg['parlay_profit'],
                "unit_stake": float(parlay_agg['parlay_stake'])
            }
        }
        cache.set(cache_key, result, timeout=60 * 60 * 24)
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

        # Kapasitas resmi tim per kompetisi liga (Mencegah tim liar / ekstra muncul di klasemen)
        LEAGUE_CAPACITIES = {
            'E0': 20,   # English Premier League
            'SP1': 20,  # Spanish La Liga
            'I1': 20,   # Italian Serie A
            'D1': 18,   # German Bundesliga
            'F1': 18,   # French Ligue 1 (sejak 23/24: 18 tim; 22/23 ke bawah: 20 tim)
            'N1': 18,   # Dutch Eredivisie
            'P1': 18,   # Portuguese Primeira Liga
            'B1': 16,   # Belgian Jupiler Pro League (sejak 23/24: 16 tim; 22/23 ke bawah: 18 tim)
            'T1': 19,   # Turkish Süper Lig
            'G1': 14,   # Greek Super League
            'SC0': 12,  # Scottish Premiership
        }

        max_teams = LEAGUE_CAPACITIES.get(league_code)
        if max_teams:
            if league_code == 'B1' and '/' in season:
                try:
                    y1 = int(season.split('/')[0])
                    if y1 < 23:
                        max_teams = 18
                except Exception:
                    pass
            elif league_code == 'F1' and '/' in season:
                try:
                    y1 = int(season.split('/')[0])
                    if y1 < 23:
                        max_teams = 20
                except Exception:
                    pass

            if len(sorted_standings) > max_teams:
                sorted_standings = sorted_standings[:max_teams]

        # Kalkulasi status kehormatan (Juara Bertahan, Top 3 Musim Lalu, Promosi) berdasarkan musim sebelumnya
        prev_champ = None
        prev_top3 = []
        prev_season_teams = set()

        if '/' in season:
            try:
                y1, y2 = season.split('/')
                prev_y1 = int(y1) - 1
                prev_y2 = int(y2) - 1
                prev_start = timezone.make_aware(datetime.datetime(2000 + prev_y1, 7, 1))
                prev_end = timezone.make_aware(datetime.datetime(2000 + prev_y2, 6, 30, 23, 59, 59))
                
                prev_matches = MatchHistory.objects.filter(
                    league__code=league_code,
                    date__gte=prev_start,
                    date__lte=prev_end
                ).values('home_team__name', 'away_team__name', 'fthg', 'ftag')
                
                if prev_matches.exists():
                    p_standings = {}
                    for pm in prev_matches:
                        phome = pm['home_team__name']
                        paway = pm['away_team__name']
                        if phome not in p_standings:
                            p_standings[phome] = {'team': phome, 'pts': 0, 'gf': 0, 'ga': 0}
                        if paway not in p_standings:
                            p_standings[paway] = {'team': paway, 'pts': 0, 'gf': 0, 'ga': 0}
                        phg = pm['fthg'] if pm['fthg'] is not None else 0
                        pag = pm['ftag'] if pm['ftag'] is not None else 0
                        p_standings[phome]['gf'] += phg
                        p_standings[phome]['ga'] += pag
                        p_standings[paway]['gf'] += pag
                        p_standings[paway]['ga'] += phg
                        if phg > pag:
                            p_standings[phome]['pts'] += 3
                        elif phg < pag:
                            p_standings[paway]['pts'] += 3
                        else:
                            p_standings[phome]['pts'] += 1
                            p_standings[paway]['pts'] += 1
                    
                    for pt in p_standings.values():
                        pt['gd'] = pt['gf'] - pt['ga']
                    
                    p_sorted = sorted(p_standings.values(), key=lambda x: (x['pts'], x['gd'], x['gf']), reverse=True)
                    prev_season_teams = {t['team'] for t in p_sorted}
                    if len(p_sorted) >= 1:
                        prev_champ = p_sorted[0]['team']
                    if len(p_sorted) >= 3:
                        prev_top3 = [p_sorted[1]['team'], p_sorted[2]['team']]
                    elif len(p_sorted) >= 2:
                        prev_top3 = [p_sorted[1]['team']]
            except Exception as e:
                logger.warning(f"Gagal mengalkulasi status promosi musim sebelumnya: {e}")

        for i, team in enumerate(sorted_standings):
            team['rank'] = i + 1
            t_name = team['team']
            if prev_champ and t_name == prev_champ:
                team['honor'] = 'Juara Bertahan'
            elif prev_top3 and t_name in prev_top3:
                team['honor'] = 'Top 3 Musim Lalu'
            elif prev_season_teams and t_name not in prev_season_teams:
                team['honor'] = 'Promosi'
            else:
                team['honor'] = None

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

    def _check_admin_permission(self, request):
        is_staff = bool(request.user and request.user.is_authenticated and request.user.is_staff)
        has_secret = is_valid_server_request(request)
        return is_staff or has_secret

    def create(self, request, *args, **kwargs):
        if not self._check_admin_permission(request):
            return Response(
                {'error': 'Akses Ditolak. Hanya staf admin atau server tersinkronisasi yang dapat menyiarkan notifikasi.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._check_admin_permission(request):
            return Response({'error': 'Akses Ditolak. Hanya staf admin yang dapat memperbarui notifikasi.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._check_admin_permission(request):
            return Response({'error': 'Akses Ditolak. Hanya staf admin yang dapat memperbarui notifikasi.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._check_admin_permission(request):
            return Response({'error': 'Akses Ditolak. Hanya staf admin yang dapat menghapus notifikasi.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


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

class SavedPredictionViewSet(viewsets.ModelViewSet):
    serializer_class = SavedPredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedPrediction.objects.filter(user=self.request.user).select_related(
            'fixture', 'fixture__league', 'fixture__home_team', 'fixture__away_team'
        ).order_by('-saved_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        fixture_id = request.data.get('fixture_id')
        if not fixture_id:
            return Response({'error': 'fixture_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            fixture = UpcomingFixture.objects.get(id=fixture_id)
        except UpcomingFixture.DoesNotExist:
            return Response({'error': 'Fixture tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        saved = SavedPrediction.objects.filter(user=request.user, fixture=fixture).first()
        if saved:
            saved.delete()
            return Response({'status': 'removed', 'is_saved': False}, status=status.HTTP_200_OK)
        else:
            SavedPrediction.objects.create(user=request.user, fixture=fixture)
            return Response({'status': 'saved', 'is_saved': True}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='ids')
    def ids(self, request):
        saved_ids = list(SavedPrediction.objects.filter(user=request.user).values_list('fixture_id', flat=True))
        return Response({'saved_fixture_ids': saved_ids}, status=status.HTTP_200_OK)

class FeatureSuggestionViewSet(viewsets.ModelViewSet):
    serializer_class = FeatureSuggestionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'category']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return FeatureSuggestion.objects.filter(is_approved=True).annotate(
            voters_count=Count('voters'),
            total_score=F('base_votes') + Count('voters')
        ).select_related('created_by').order_by('-total_score', '-created_at')

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        instance = serializer.save(created_by=user, base_votes=1)
        if user:
            instance.voters.add(user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        suggestion = self.get_object()
        user = request.user
        if suggestion.voters.filter(id=user.id).exists():
            suggestion.voters.remove(user)
            has_voted = False
        else:
            suggestion.voters.add(user)
            has_voted = True
        
        total_votes = (suggestion.base_votes or 0) + suggestion.voters.count()
        return Response({
            'status': 'success',
            'has_voted': has_voted,
            'votes_count': total_votes
        }, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not (request.user.is_staff or instance.created_by == request.user):
            return Response({'error': 'Anda tidak memiliki hak akses untuk mengubah rekomendasi fitur ini.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not (request.user.is_staff or instance.created_by == request.user):
            return Response({'error': 'Anda tidak memiliki hak akses untuk mengubah rekomendasi fitur ini.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not (request.user.is_staff or instance.created_by == request.user):
            return Response({'error': 'Anda tidak memiliki hak akses untuk menghapus rekomendasi fitur ini.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class AppVersionView(APIView):
    """
    Endpoint Publik untuk Pengecekan Pembaruan Versi Aplikasi Mobile (In-App Update Check).
    Mengembalikan versi & nomor build terbaru serta tautan unduhan APKPure langsung dari kode hardcode
    (tanpa perlu setting environment variables di Render).
    """
    permission_classes = []
    authentication_classes = []

    # =========================================================================
    # KONFIGURASI VERSI RILIS TERBARU (HARDCODE)
    # Cukup ubah nilai di bawah ini jika nanti Anda merilis update baru ke APKPure.
    # =========================================================================
    LATEST_VERSION = "1.4.1"
    LATEST_BUILD = 8
    UPDATE_URL = "https://apkpure.com/prediksikan-%E2%80%93-analitik-bola/id.prediksikan.app/download"
    RELEASE_NOTES = "Pembaruan logo liga resmi, tampilan navigasi baru, dan pembersihan cache tuntas."
    IS_CRITICAL = False

    def get(self, request):
        return Response({
            'latest_version': self.LATEST_VERSION,
            'latest_build': self.LATEST_BUILD,
            'update_url': self.UPDATE_URL,
            'release_notes': self.RELEASE_NOTES,
            'is_critical': self.IS_CRITICAL,
        }, status=status.HTTP_200_OK)


def get_current_season_bounds():
    """
    Menghitung rentang tanggal musim sepak bola Eropa saat ini (Juli Y - Juni Y+1)
    berdasarkan jadwal pertandingan paling mutakhir di sistem.
    """
    latest_fix = UpcomingFixture.objects.order_by('-date').first()
    ref_date = latest_fix.date if latest_fix else timezone.now()
    year = ref_date.year if ref_date.month >= 7 else ref_date.year - 1
    start = datetime.datetime(year, 7, 1, tzinfo=datetime.timezone.utc)
    end = datetime.datetime(year + 1, 6, 30, 23, 59, 59, tzinfo=datetime.timezone.utc)
    return start, end, f"{year}/{year+1}"


class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint Publik untuk Berita & Editorial Pertandingan.
    Mendukung list artikel terpublikasi dengan filter kategori, pekan (round), pencarian, dan slug lookup.
    Hanya menyajikan artikel pada musim berjalan (Current Season) dan secara default hanya pekan terakhir.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['title', 'excerpt', 'content', 'tags']
    ordering_fields = ['created_at', 'views_count']
    ordering = ['-created_at']

    def get_queryset(self):
        season_start, season_end, _ = get_current_season_bounds()
        
        # 1. Batasi hanya untuk artikel di MUSIM SAAT INI (Current Season Only)
        qs = Article.objects.filter(is_published=True).filter(
            Q(fixture__date__gte=season_start, fixture__date__lte=season_end) |
            Q(fixture__isnull=True, created_at__gte=season_start, created_at__lte=season_end)
        ).select_related(
            'fixture__league', 'fixture__home_team', 'fixture__away_team', 'parlay_ticket'
        )

        # 2. Filter Pekan (Round Selector): Default adalah 'latest' (Pekan Terakhir)
        round_param = self.request.query_params.get('round', 'latest')
        
        if round_param == 'latest':
            latest_match = qs.filter(fixture__isnull=False).order_by('-fixture__date').first()
            if latest_match and latest_match.fixture:
                latest_date = latest_match.fixture.date
                # Jendela pekan (4 hari sebelum s/d 1 hari setelah laga terbaru)
                start_window = latest_date - datetime.timedelta(days=4)
                end_window = latest_date + datetime.timedelta(days=1)
                qs = qs.filter(
                    Q(fixture__date__gte=start_window, fixture__date__lte=end_window) |
                    Q(category='parlay')
                )
        elif round_param != 'all':
            # Format ISO week: YYYY-Www (misal 2026-W45)
            try:
                parts = round_param.split('-W')
                if len(parts) == 2:
                    y, w = int(parts[0]), int(parts[1])
                    import datetime as dt_mod
                    monday = dt_mod.date.fromisocalendar(y, w, 1)
                    sunday = dt_mod.date.fromisocalendar(y, w, 7)
                    start_dt = datetime.datetime.combine(monday, datetime.time.min, tzinfo=datetime.timezone.utc)
                    end_dt = datetime.datetime.combine(sunday, datetime.time.max, tzinfo=datetime.timezone.utc)
                    qs = qs.filter(
                        Q(fixture__date__gte=start_dt, fixture__date__lte=end_dt) |
                        (Q(category='parlay') & Q(created_at__gte=start_dt, created_at__lte=end_dt))
                    )
            except Exception:
                pass

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ArticleDetailSerializer
        return ArticleListSerializer

    def list(self, request, *args, **kwargs):
        search = request.query_params.get('search', '').strip()
        # Jika ada keyword pencarian, lewati cache agar hasil instan & dinamis
        if search:
            return super().list(request, *args, **kwargs)

        round_param = request.query_params.get('round', 'latest')
        category = request.query_params.get('category', 'all')
        page = request.query_params.get('page', '1')
        page_size = request.query_params.get('page_size', '20')
        ordering = request.query_params.get('ordering', '-created_at')

        cache_key = f"articles_list_{round_param}_{category}_{page}_{page_size}_{ordering}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            resp = Response(cached_data)
            resp['X-Cache'] = 'HIT'
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            cache.set(cache_key, response.data, timeout=60 * 60 * 12)  # Cache 12 jam di Redis
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get('slug') or self.kwargs.get('slug')
        cache_key = f"article_detail_{slug}"
        cached_data = cache.get(cache_key)

        # Selalu update counter views secara efisien di background dengan cooldown per IP (5 menit)
        # untuk mencegah database connection spike / spam refresh abuse
        if slug:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                client_ip = x_forwarded_for.split(',')[0].strip()
            else:
                client_ip = request.META.get('REMOTE_ADDR', '')
            view_throttle_key = f"art_viewed_{slug}_{client_ip}"
            if not cache.get(view_throttle_key):
                Article.objects.filter(slug=slug).update(views_count=F('views_count') + 1)
                cache.set(view_throttle_key, True, timeout=300)
                if cached_data is not None and isinstance(cached_data, dict):
                    cached_data['views_count'] = (cached_data.get('views_count') or 0) + 1
                    cache.set(cache_key, cached_data, timeout=60 * 60 * 24)

        if cached_data is not None:
            resp = Response(cached_data)
            resp['X-Cache'] = 'HIT'
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

        article = self.get_object()
        serializer = self.get_serializer(article)
        data = serializer.data
        cache.set(cache_key, data, timeout=60 * 60 * 24)  # Cache 24 jam di Redis

        resp = Response(data)
        resp['X-Cache'] = 'MISS'
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp

    @action(detail=False, methods=['get'])
    def rounds(self, request):
        """
        Mengembalikan daftar pekan pertandingan yang tersedia di musim ini,
        lengkap dengan label tanggal Indonesia, jumlah artikel, dan status pekan terbaru.
        Data dicache di Redis selama 24 jam untuk meringankan beban database Supabase.
        """
        cache_key = "articles_rounds_list"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            resp = Response(cached_data)
            resp['X-Cache'] = 'HIT'
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

        season_start, season_end, season_label = get_current_season_bounds()
        latest_fix = UpcomingFixture.objects.order_by('-date').first()
        base_qs = Article.objects.filter(is_published=True).filter(
            Q(fixture__date__gte=season_start, fixture__date__lte=season_end) |
            Q(fixture__isnull=True, created_at__gte=season_start, created_at__lte=season_end)
        ).select_related('fixture', 'parlay_ticket')

        weeks_map = {}
        for a in base_qs:
            if a.fixture:
                dt = a.fixture.date
            elif a.category == 'parlay' and latest_fix:
                dt = latest_fix.date
            elif a.parlay_ticket:
                dt = datetime.datetime.combine(a.parlay_ticket.date, datetime.time.min, tzinfo=datetime.timezone.utc)
            else:
                dt = a.created_at
            
            iso = dt.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            if key not in weeks_map:
                weeks_map[key] = {
                    'key': key,
                    'week_num': iso[1],
                    'year': iso[0],
                    'count': 0,
                    'min_date': dt,
                    'max_date': dt
                }
            weeks_map[key]['count'] += 1
            weeks_map[key]['min_date'] = min(weeks_map[key]['min_date'], dt)
            weeks_map[key]['max_date'] = max(weeks_map[key]['max_date'], dt)

        sorted_weeks = sorted(weeks_map.values(), key=lambda x: (x['year'], x['week_num']), reverse=True)
        MONTHS_ID = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        
        rounds_list = []
        for idx, w in enumerate(sorted_weeks):
            min_d = w['min_date']
            max_d = w['max_date']
            if min_d.month == max_d.month:
                date_str = f"{min_d.day} - {max_d.day} {MONTHS_ID[min_d.month]} {min_d.year}"
            else:
                date_str = f"{min_d.day} {MONTHS_ID[min_d.month]} - {max_d.day} {MONTHS_ID[max_d.month]} {max_d.year}"
            
            is_latest = (idx == 0)
            label = f"Pekan Terbaru ({date_str})" if is_latest else f"Pekan {w['week_num']} ({date_str})"
            
            rounds_list.append({
                'key': 'latest' if is_latest else w['key'],
                'iso_key': w['key'],
                'label': label,
                'date_range': date_str,
                'is_latest': is_latest,
                'article_count': w['count']
            })

        rounds_list.append({
            'key': 'all',
            'iso_key': 'all',
            'label': f"Semua Pekan (Musim {season_label})",
            'date_range': f"Musim {season_label}",
            'is_latest': False,
            'article_count': base_qs.count()
        })

        result = {
            'season': season_label,
            'current_round': 'latest',
            'rounds': rounds_list,
            'total_articles': base_qs.count()
        }
        cache.set(cache_key, result, timeout=60 * 60 * 24)  # Cache 24 jam di Redis

        resp = Response(result)
        resp['X-Cache'] = 'MISS'
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Mengambil 5 artikel unggulan terbaru untuk Carousel/Hero Banner di halaman news"""
        cache_key = "articles_featured_list"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            resp = Response(cached_data)
            resp['X-Cache'] = 'HIT'
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

        qs = self.get_queryset()[:5]
        serializer = ArticleListSerializer(qs, many=True, context={'request': request})
        data = serializer.data
        cache.set(cache_key, data, timeout=60 * 60 * 12)

        resp = Response(data)
        resp['X-Cache'] = 'MISS'
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Mengembalikan daftar kategori artikel yang tersedia beserta jumlahnya"""
        cache_key = "articles_categories_list"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            resp = Response(cached_data)
            resp['X-Cache'] = 'HIT'
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

        qs = self.get_queryset()
        counts = qs.values('category').annotate(count=Count('id'))
        category_map = dict(Article.CATEGORY_CHOICES)
        result = [
            {'key': item['category'], 'name': category_map.get(item['category'], item['category']), 'count': item['count']}
            for item in counts
        ]
        cache.set(cache_key, result, timeout=60 * 60 * 24)

        resp = Response(result)
        resp['X-Cache'] = 'MISS'
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp




