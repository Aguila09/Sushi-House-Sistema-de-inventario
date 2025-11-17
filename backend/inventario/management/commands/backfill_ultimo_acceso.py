# inventario/management/commands/backfill_ultimo_acceso.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Copia last_login -> ultimo_acceso cuando ultimo_acceso es NULL'

    def handle(self, *args, **options):
        User = get_user_model()
        qs = User.objects.filter(ultimo_acceso__isnull=True).exclude(last_login__isnull=True)
        total = qs.count()
        self.stdout.write(f"Usuarios a actualizar: {total}")
        for u in qs:
            u.ultimo_acceso = u.last_login
            u.save(update_fields=['ultimo_acceso'])
        self.stdout.write("Backfill completado.")
