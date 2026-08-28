import os
from celery import Celery

# Set default modul settings Django untuk program celery.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')

# Gunakan string agar pekerja Celery tidak perlu memuat ulang objek saat serialization.
# Namespace 'CELERY' artinya semua pengaturan celery di settings.py harus diawali CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Memuat modul task dari semua aplikasi Django yang terdaftar.
app.autodiscover_tasks()