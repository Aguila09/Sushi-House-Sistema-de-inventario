from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .audit import log_action

User = get_user_model()

class ResolveUserView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email es requerido'}, status=400)
            
        try:
            user = User.objects.filter(email=email).first()
            if user:
                return Response({'usuario': user.usuario})
            return Response({'detail': 'Usuario no encontrado'}, status=404)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Obtener el usuario antes de validar
        user = User.objects.filter(usuario=attrs.get('usuario')).first()
        
        if user:
            # Verificar si está bloqueado
            if user.is_bloqueado():
                tiempo_restante = (user.bloqueado_hasta - timezone.now()).seconds // 60
                raise Exception(f'Cuenta bloqueada temporalmente. Intente nuevamente en {tiempo_restante} minutos.')
            # Verificar si está desactivado a nivel de negocio
            if hasattr(user, 'activo') and not user.activo:
                # Registrar intento fallido por cuenta desactivada (sin incrementar intentos)
                log_action(
                    usuario=user,
                    accion='login',
                    modelo='Usuario',
                    objeto_id=user.id,
                    objeto_repr=user.usuario,
                    detalles={'exito': False, 'razon': 'cuenta_desactivada'},
                    request=self.context.get('request')
                )
                from rest_framework.exceptions import AuthenticationFailed
                raise AuthenticationFailed('Cuenta desactivada por un administrador.')
        
        try:
            # Intentar autenticación normal
            data = super().validate(attrs)
            
            # Si llegamos aquí, el login fue exitoso
            if user:
                user.resetear_intentos_fallidos()
                user.ultimo_acceso = timezone.now()
                user.save(update_fields=['ultimo_acceso'])
                
                # Registrar login exitoso en auditoría
                log_action(
                    usuario=user,
                    accion='login',
                    modelo='Usuario',
                    objeto_id=user.id,
                    objeto_repr=user.usuario,
                    detalles={'exito': True},
                    request=self.context.get('request')
                )
            
            return data
            
        except Exception as e:
            # Login falló - incrementar intentos
            if user and 'credentials' in str(e).lower():
                user.incrementar_intentos_fallidos()
                
                # Registrar intento fallido
                log_action(
                    usuario=user,
                    accion='login',
                    modelo='Usuario',
                    objeto_id=user.id,
                    objeto_repr=user.usuario,
                    detalles={'exito': False, 'razon': str(e)},
                    request=self.context.get('request')
                )
                
                # Verificar si ahora está bloqueado
                if user.is_bloqueado():
                    raise Exception(f'Cuenta bloqueada por múltiples intentos fallidos. Intente nuevamente en 15 minutos.')
            
            raise


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    # aplicar throttling por alcance 'auth'
    throttle_scope = 'auth'