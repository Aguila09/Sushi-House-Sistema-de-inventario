from django.core.management.base import BaseCommand
from django.utils import timezone
from inventario.models import ConfiguracionSistema


class Command(BaseCommand):
    help = "Activa backup_automatico y mueve hora_notificaciones a ~2 minutos a futuro (para probar scheduler)."

    def add_arguments(self, parser):
        parser.add_argument('--minutes', type=int, default=2, help='Minutos a futuro para programar (default: 2)')

    def handle(self, *args, **options):
        minutes = options['minutes']
        config = ConfiguracionSistema.objects.first() or ConfiguracionSistema.objects.create()
        now = timezone.localtime()
        future = now + timezone.timedelta(minutes=minutes)
        # Ajusta solo hora y minuto, conserva TZ
        config.backup_automatico = True
        config.hora_notificaciones = future.time().replace(second=0, microsecond=0)
        config.save(update_fields=['backup_automatico', 'hora_notificaciones'])
        self.stdout.write(self.style.SUCCESS(
            f"Backup automático activado. Programado para {config.hora_notificaciones.strftime('%H:%M')} (TZ {timezone.get_current_timezone_name()})."
        ))
