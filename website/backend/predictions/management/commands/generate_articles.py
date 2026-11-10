from django.core.management.base import BaseCommand
from predictions.article_generator import run_article_generation_pipeline

class Command(BaseCommand):
    help = 'Menghasilkan artikel berita olahraga & match preview otomatis untuk SEO dan Google Search Console'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Memulai pipeline pembuatan artikel berita otomatis..."))
        try:
            total_created = run_article_generation_pipeline()
            self.stdout.write(self.style.SUCCESS(f"Selesai! Berhasil membuat {total_created} artikel baru."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Gagal mengeksekusi pipeline artikel: {e}"))

