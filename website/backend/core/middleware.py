import os
import re
import logging
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger(__name__)

CLIENT_APP_SECRET = os.environ.get('SYNC_SECRET_KEY', '')

PROD_ALLOWED_ORIGINS = {
    'https://www.l1prediksikan.my.id',
    'https://l1prediksikan.my.id',
}

DEV_ALLOWED_ORIGINS = {
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
}

PROD_REFERER_REGEX = re.compile(
    r'^https?://(www\.l1prediksikan\.my\.id|l1prediksikan\.my\.id)(/.*)?$'
)

DEV_REFERER_REGEX = re.compile(
    r'^https?://(www\.l1prediksikan\.my\.id|l1prediksikan\.my\.id|localhost:3000|127\.0\.0\.1:3000|localhost:8000|127\.0\.0\.1:8000)(/.*)?$'
)

EXEMPT_PREFIXES = (
    '/health/',
    '/rahasia-dapur-l1/',
)

class RestrictBackendAccessMiddleware:
    """
    Middleware Keamanan Eksklusif:
    Membatasi seluruh akses API backend Django HANYA kepada:
    1. Website resmi (Origin / Referer domain resmi l1prediksikan.my.id)
    2. Aplikasi mobile resmi (X-App-Client-Key atau X-Sync-Secret valid)
    3. Lingkungan pengembangan lokal (HANYA jika DEBUG=True)
    
    Di server produksi (DEBUG=False), request dari localhost:3000 atau domain luar
    otomatis ditolak dengan HTTP 403 Forbidden.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # 1. Jalur publik/sistem bebas proteksi (Health check Render & Admin Django)
        if any(path.startswith(prefix) for prefix in EXEMPT_PREFIXES):
            return self.get_response(request)

        # 2. Izinkan preflight OPTIONS (CORS preflight browser)
        if request.method == 'OPTIONS':
            return self.get_response(request)

        # Tentukan allowed origins berdasarkan mode DEBUG
        # Pada produksi (DEBUG=False di Render), localhost DILARANG total agar orang luar tidak bisa menembak backend dari lokal mereka
        allowed_origins = PROD_ALLOWED_ORIGINS | DEV_ALLOWED_ORIGINS if settings.DEBUG else PROD_ALLOWED_ORIGINS
        allowed_referer_regex = DEV_REFERER_REGEX if settings.DEBUG else PROD_REFERER_REGEX

        # 3. Validasi Origin browser (Hanya domain resmi di produksi)
        origin = request.headers.get('Origin') or request.META.get('HTTP_ORIGIN')
        if origin and origin.rstrip('/') in allowed_origins:
            return self.get_response(request)

        # 4. Validasi Referer jika browser tidak menyertakan Origin
        referer = request.headers.get('Referer') or request.META.get('HTTP_REFERER')
        if referer and allowed_referer_regex.match(referer):
            return self.get_response(request)

        # 5. Validasi Aplikasi Mobile Resmi (Header Kunci Klien Rahasia)
        client_key = (
            request.headers.get('X-App-Client-Key')
            or request.headers.get('X-Sync-Secret')
            or request.META.get('HTTP_X_APP_CLIENT_KEY')
            or request.META.get('HTTP_X_SYNC_SECRET')
        )
        sync_secret = os.environ.get('SYNC_SECRET_KEY', '').strip('\'"') or CLIENT_APP_SECRET.strip('\'"')
        if client_key and sync_secret and client_key.strip('\'"') == sync_secret:
            return self.get_response(request)

        # 6. Validasi Request Lokal Internal (Hanya jika DEBUG aktif)
        remote_addr = request.META.get('REMOTE_ADDR', '')
        if settings.DEBUG:
            if remote_addr in ('127.0.0.1', '::1', 'localhost'):
                return self.get_response(request)


        # 7. Blokir seluruh akses tidak sah
        logger.warning(
            f"Akses Ditolak: Path='{path}', Method='{request.method}', "
            f"Origin='{origin}', Referer='{referer}', IP='{remote_addr}'"
        )
        return JsonResponse(
            {
                'error': 'Akses Ditolak (Unauthorized Access)',
                'message': 'API backend ini diproteksi dan hanya dapat diakses melalui website resmi atau aplikasi mobile Prediksikan.'
            },
            status=403
        )
