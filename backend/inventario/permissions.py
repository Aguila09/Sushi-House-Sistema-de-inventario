from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """Acceso de escritura restringido a staff/superuser. Lectura requiere autenticación."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permiso que permite acceso total al dueño del objeto o a administradores.
    """
    def has_object_permission(self, request, view, obj):
        # Los administradores tienen acceso completo
        if request.user and request.user.is_staff:
            return True
        
        # El dueño del objeto tiene acceso completo
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class IsAdminOrOperationalOrReadOnly(permissions.BasePermission):
    """
    Permite escritura a superuser, staff (admin) y rol 'operacional'. Lectura requiere autenticación.
    Usado para productos (y potencialmente movimientos) según requisitos.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        # rol en modelo Usuario
        return getattr(request.user, 'rol', '').lower() == 'operacional'


class UserManagementPermission(permissions.BasePermission):
    """
    Gestión de usuarios:
    - superuser: CRUD completo y asigna cualquier rol.
    - admin (staff, no superuser): puede crear usuarios solo con rol operacional|consulta, editar/eliminar SOLO usuarios de rol operacional|consulta.
    - otros roles: solo lectura.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        # Escritura
        if user.is_superuser:
            return True
        if user.is_staff and not user.is_superuser:
            # creación: limitar rol
            if request.method == 'POST':
                rol = (request.data.get('rol') or '').lower()
                if rol in ('admin', 'superuser'):
                    return False
                return True
            # otras operaciones requieren verificación de objeto -> provisional True aquí, filtra en has_object_permission
            return True
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            return True
        if user.is_superuser:
            return True
        if user.is_staff and not user.is_superuser:
            # No puede operar sobre admins ni superusers
            target_rol = (getattr(obj, 'rol', '') or '').lower()
            if target_rol in ('admin', 'superuser') or getattr(obj, 'is_superuser', False):
                return False
            return True
        return False


class IsAdminOnly(permissions.BasePermission):
    """Permite acceso solo a usuarios staff o superuser (para cualquier método)."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))