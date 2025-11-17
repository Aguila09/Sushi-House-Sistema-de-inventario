import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings
from django.utils import timezone

from .models import ConfiguracionSistema
from .backup_utils import save_backup_file

logger = logging.getLogger(__name__)

_scheduler = None


def _run_backup_job():
    try:
        config = ConfiguracionSistema.objects.first() or ConfiguracionSistema.objects.create()
        if not getattr(config, 'backup_automatico', False):
            return
        path = save_backup_file()
        logger.info("Backup automático completado: %s", path)
    except Exception as e:
        logger.exception("Error ejecutando backup automático: %s", str(e))


def _get_default_schedule_time():
    """Devuelve hora/minuto por defecto sin consultar la base de datos (evita warning en ready())."""
    try:
        hour = int(os.environ.get('BACKUP_SCHEDULE_HOUR', '2'))
        minute = int(os.environ.get('BACKUP_SCHEDULE_MINUTE', '0'))
        return hour, minute
    except Exception:
        return 2, 0


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    # Evitar doble arranque con el autoreloader en dev
    is_main = os.environ.get('RUN_MAIN') == 'true' or not getattr(settings, 'DEBUG', False)
    if not is_main:
        return None

    try:
        tz = getattr(settings, 'TIME_ZONE', 'UTC')
        _scheduler = BackgroundScheduler(timezone=tz)
        hour, minute = _get_default_schedule_time()
        _scheduler.add_job(
            _run_backup_job,
            trigger=CronTrigger(hour=hour, minute=minute),
            id='daily_backup',
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        logger.info("Scheduler de backups iniciado. Programado diario a %02d:%02d (%s)", hour, minute, tz)
        return _scheduler
    except Exception as e:
        logger.exception("No se pudo iniciar el scheduler de backups: %s", str(e))
        return None
