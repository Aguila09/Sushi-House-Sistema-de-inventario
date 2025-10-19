from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Solo usuarios con rol 'admin' (campo rol) pueden hacer POST/PUT/DELETE.
    Lectura abierta.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.is_superuser or getattr(request.user, 'rol', '') == 'admin'))
