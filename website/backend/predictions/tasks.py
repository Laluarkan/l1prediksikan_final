from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_fetch_jobs_task():
    try:
        logger.info("Celery Task: Memulai eksekusi Cron Job (fetch_history & fetch_fixture)...")
        call_command('fetch_history')
        call_command('fetch_fixture')
        logger.info("Celery Task: Cron Job selesai dieksekusi dengan sukses.")
        return "Success"
    except Exception as e:
        logger.error(f"Celery Task Error: {str(e)}", exc_info=True)
        return f"Failed: {str(e)}"