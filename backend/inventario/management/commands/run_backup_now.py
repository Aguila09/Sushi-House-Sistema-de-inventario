from django.core.management.base import BaseCommand
from inventario.backup_utils import save_backup_file


class Command(BaseCommand):
    help = "Genera un backup inmediato en la carpeta 'backups/'"

    def handle(self, *args, **options):
        path = save_backup_file()
        self.stdout.write(self.style.SUCCESS(f"Backup generado: {path}"))
