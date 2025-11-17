from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Promueve un usuario a superusuario: is_staff/is_superuser True y rol='superuser'."

    def add_arguments(self, parser):
        parser.add_argument('--usuario', required=True, help='Nombre de usuario a promover (USERNAME_FIELD).')

    def handle(self, *args, **options):
        username = options['usuario']
        User = get_user_model()
        try:
            user = User.objects.get(**{User.USERNAME_FIELD: username})
        except User.DoesNotExist:
            raise CommandError(f"Usuario '{username}' no existe.")

        user.is_staff = True
        user.is_superuser = True
        if hasattr(user, 'rol'):
            user.rol = 'superuser'
        if hasattr(user, 'activo'):
            user.activo = True
        user.save(update_fields=['is_staff', 'is_superuser', 'rol', 'activo'])

        self.stdout.write(self.style.SUCCESS(f"Usuario '{username}' promovido a superuser (rol='superuser')."))
