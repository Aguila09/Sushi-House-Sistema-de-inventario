# inventario/audit.py
import json
from django.conf import settings
from django.utils import timezone
from .models import AuditLog, ConfiguracionSistema


def get_client_ip(request):
    """Obtiene la IP del cliente desde el request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_action(usuario, accion, modelo='', objeto_id=None, objeto_repr='', detalles=None, request=None):
    """
    Registra una acción en el sistema de auditoría si está habilitado en la configuración
    
    Args:
        usuario: Usuario que realiza la acción
        accion: Tipo de acción ('crear', 'actualizar', 'eliminar', 'login', 'logout', etc.)
        modelo: Nombre del modelo afectado
        objeto_id: ID del objeto afectado
        objeto_repr: Representación en string del objeto
        detalles: Dict con detalles adicionales
        request: HttpRequest para obtener IP y user agent
    """
    try:
        # Verificar si el registro de actividad está habilitado
        config = ConfiguracionSistema.objects.first()
        if not config or not config.registro_actividad:
            return  # No registrar si está deshabilitado
        
        # Preparar datos del log
        log_data = {
            'usuario': usuario,
            'accion': accion,
            'modelo': modelo,
            'objeto_id': objeto_id,
            'objeto_repr': objeto_repr,
            'detalles': detalles,
        }
        
        # Agregar información del request si está disponible
        if request:
            log_data['ip_address'] = get_client_ip(request)
            log_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:255]
        
        # Crear registro
        AuditLog.objects.create(**log_data)
        
    except Exception as e:
        # No fallar si hay error en el logging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al registrar auditoría: {str(e)}")


class AuditLogMiddleware:
    """
    Middleware para registrar automáticamente las acciones en el sistema
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Registrar acciones específicas
        if request.user and request.user.is_authenticated:
            # Login/Logout se manejan en las vistas correspondientes
            # Aquí se pueden registrar otras acciones si es necesario
            pass
        
        return response
