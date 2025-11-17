# inventario/apps.py
from django.apps import AppConfig
import os

class InventarioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventario'

    def ready(self):
        # importa signals para que se registren los handlers
        import inventario.signals  # noqa: F401
        # inicia scheduler de backups automáticos (si aplica)
        try:
            # Permitir desactivar el scheduler vía variable de entorno (tests, multi-proceso, etc.)
            if os.environ.get('DISABLE_SCHEDULER', 'False').lower() not in ('1', 'true', 'yes'):
                from .scheduler import start_scheduler
                start_scheduler()
        except Exception:
            # No interrumpir el arranque por fallos del scheduler
            pass
