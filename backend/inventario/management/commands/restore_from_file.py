import json
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from inventario.views import RestoreView


class Command(BaseCommand):
    help = "Restaura datos desde un archivo JSON de backup. Usa la misma lógica que la vista /api/restore/"

    def add_arguments(self, parser):
        parser.add_argument('--path', required=True, help='Ruta al archivo JSON de backup.')
        parser.add_argument('--inventario', action='store_true', help='Incluir restauración de inventario (categorías, proveedores, productos).')
        parser.add_argument('--usuario', help='Usuario (USERNAME_FIELD) que se registrará en auditoría (opcional).')

    def handle(self, *args, **options):
        path = options['path']
        restore_inv = options['inventario']
        username = options.get('usuario')
        try:
            with open(path, 'r', encoding='utf-8') as f:
                payload = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"Archivo no encontrado: {path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"JSON inválido: {e}")

        if restore_inv:
            payload['restaurar_inventario'] = True

        # Simular request para reutilizar lógica
        factory = APIRequestFactory()
        request = factory.post('/api/restore/', data=payload, format='json')

        if username:
            User = get_user_model()
            try:
                user = User.objects.get(**{User.USERNAME_FIELD: username})
            except User.DoesNotExist:
                raise CommandError(f"Usuario '{username}' no existe para auditoría.")
            # Autenticar la request para pasar permisos DRF
            force_authenticate(request, user=user)

        view = RestoreView.as_view()
        response = view(request)
        self.stdout.write(self.style.SUCCESS(f"{response.data.get('detail','Restauración completada')}"))
