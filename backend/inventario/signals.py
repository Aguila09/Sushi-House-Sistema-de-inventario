# inventario/signals.py
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from django.utils import timezone

# Importa el modelo Usuario tal como lo tienes en models.py
from .models import Usuario

@receiver(user_logged_in)
def actualizar_ultimo_acceso(sender, user, request, **kwargs):
    """
    Actualiza el campo ultimo_acceso cada vez que el usuario inicia sesión.
    Usa timezone.now() para que el valor sea timezone-aware.
    """
    try:
        # Solo actualizar si el modelo tiene el campo (seguridad)
        if hasattr(user, 'ultimo_acceso'):
            user.ultimo_acceso = timezone.now()
            user.save(update_fields=['ultimo_acceso'])
    except Exception as e:
        # No interrumpir el flujo de login; loguearlo para debug si quieres
        # print("Error actualizando ultimo_acceso:", e)
        pass
