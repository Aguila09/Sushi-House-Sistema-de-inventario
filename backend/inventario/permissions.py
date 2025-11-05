from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado que permite acceso de escritura solo a administradores.
    """
    def has_permission(self, request, view):
        # Los métodos seguros (GET, HEAD, OPTIONS) están permitidos para todos los usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Los métodos de escritura solo están permitidos para administradores
        return request.user and request.user.is_staff

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