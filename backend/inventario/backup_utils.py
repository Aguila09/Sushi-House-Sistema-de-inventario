import json
import os
from django.conf import settings
from django.utils import timezone

from django.contrib.auth import get_user_model
from .models import Categoria, Proveedor, Producto, ConfiguracionSistema
from .serializers import ConfiguracionSistemaSerializer
from .audit import log_action


def generate_backup_data():
    """Genera el payload JSON del backup (sin escribir a disco)."""
    config = ConfiguracionSistema.objects.first() or ConfiguracionSistema.objects.create()
    User = get_user_model()
    data = {
        'configuracion': ConfiguracionSistemaSerializer(config).data,
        'categorias': list(Categoria.objects.values()),
        'proveedores': list(Proveedor.objects.values()),
        'productos': list(Producto.objects.values()),
        # Usuarios: incluir solo campos no sensibles (coincide con la vista previa)
        'usuarios': list(User.objects.values('id', 'usuario', 'email', 'rol', 'activo')),
    }
    return data


def ensure_backups_dir():
    base_dir = getattr(settings, 'BASE_DIR', os.getcwd())
    backups_dir = os.path.join(base_dir, 'backups')
    os.makedirs(backups_dir, exist_ok=True)
    return backups_dir


def prune_backups(max_files: int | None = None):
    """Mantiene solo los últimos N archivos de backup (por nombre timestamp)."""
    try:
        backups_dir = ensure_backups_dir()
        max_files = max_files or int(os.environ.get('BACKUPS_MAX_FILES', '10'))
        files = [f for f in os.listdir(backups_dir) if f.startswith('backup-') and f.endswith('.json')]
        files.sort(reverse=True)  # nombres con timestamp YYYYMMDD-HHMMSS ordenados lexicográficamente
        for old in files[max_files:]:
            try:
                os.remove(os.path.join(backups_dir, old))
            except Exception:
                pass
    except Exception:
        # Silenciar errores de poda.
        pass


def save_backup_file():
    """Genera y guarda un archivo de backup en la carpeta `backups/`, aplica poda y devuelve la ruta."""
    backups_dir = ensure_backups_dir()
    now = timezone.now()
    filename = f"backup-{now.strftime('%Y%m%d-%H%M%S')}.json"
    file_path = os.path.join(backups_dir, filename)

    payload = generate_backup_data()
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)

    # Registrar auditoría como acción del sistema
    try:
        log_action(
            usuario=None,
            accion='export',
            modelo='Backup',
            objeto_id=None,
            objeto_repr=filename,
            detalles={'file': filename, 'path': file_path},
            request=None,
        )
    except Exception:
        # No interrumpir si el log falla
        pass

    prune_backups()
    return file_path
