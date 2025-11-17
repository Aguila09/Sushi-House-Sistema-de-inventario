# inventario/views.py

import logging
import traceback

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, F
from django.db import models
from django.utils import timezone

from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django_filters.rest_framework import DjangoFilterBackend

from .models import Categoria, Proveedor, Producto, ConfiguracionSistema
from .serializers import (
    CategoriaSerializer, ProveedorSerializer, ProductoSerializer,
    UsuarioSerializer, UsuarioCreateSerializer, UsuarioUpdateSerializer, ConfiguracionSistemaSerializer
)
from .permissions import IsAdminOrReadOnly, IsAdminOrOperationalOrReadOnly, UserManagementPermission, IsAdminOnly
from .audit import log_action
from django.db import transaction
from decimal import Decimal
from .backup_utils import generate_backup_data

User = get_user_model()
logger = logging.getLogger(__name__)


class CategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre']

    def get_queryset(self):
        return Categoria.objects.all().order_by('nombre')


class ProveedorViewSet(viewsets.ModelViewSet):
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'contacto', 'email']
    ordering_fields = ['nombre']

    def get_queryset(self):
        return Proveedor.objects.all().order_by('nombre')


class ProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet de Producto con captura temporal de excepciones para depuración local.
    - Usa select_related para evitar N+1.
    - En caso de excepción en list/retrieve devuelve la traza en JSON (solo DEV).
    """
    serializer_class = ProductoSerializer
    # Permitir escritura también a usuarios con rol 'operacional'
    permission_classes = [IsAuthenticated, IsAdminOrOperationalOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'proveedor', 'activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio', 'stock', 'fecha_actualizacion']

    def get_queryset(self):
        # Una única implementación de get_queryset (sin duplicados)
        return Producto.objects.select_related('categoria', 'proveedor').order_by('nombre')

    def list(self, request, *args, **kwargs):
        """
        Capturamos la excepción y devolvemos la traza en la respuesta
        para poder depurar el error 500. Eliminar esta traza una vez resuelto.
        """
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en ProductoViewSet.list: %s\n%s", str(e), tb)
            # Responder con detalle y traza (solo en desarrollo)
            return Response({'detail': str(e), 'traceback': tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Producto.DoesNotExist:
            return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en ProductoViewSet.retrieve: %s\n%s", str(e), tb)
            return Response({'error': str(e), 'traceback': tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        """Aplica stock_minimo_global si el campo no viene definido en la petición."""
        try:
            data = serializer.validated_data
            if ('stock_minimo' not in data or data.get('stock_minimo') in (None, 0)):
                config = ConfiguracionSistema.objects.first()
                if config and config.stock_minimo_global is not None:
                    instance = serializer.save(stock_minimo=config.stock_minimo_global)
                else:
                    instance = serializer.save()
            else:
                instance = serializer.save()
            
            # Registrar auditoría
            log_action(
                usuario=self.request.user,
                accion='crear',
                modelo='Producto',
                objeto_id=instance.id,
                objeto_repr=str(instance),
                detalles={'nombre': instance.nombre, 'stock': instance.stock, 'precio': float(instance.precio)},
                request=self.request
            )
        except Exception:
            tb = traceback.format_exc()
            logger.error("Error al crear producto: %s", tb)
            raise

    def perform_update(self, serializer):
        try:
            instance = serializer.save()
            
            # Registrar auditoría
            log_action(
                usuario=self.request.user,
                accion='actualizar',
                modelo='Producto',
                objeto_id=instance.id,
                objeto_repr=str(instance),
                detalles={'nombre': instance.nombre, 'stock': instance.stock},
                request=self.request
            )
        except Exception:
            tb = traceback.format_exc()
            logger.error("Error al actualizar producto: %s", tb)
            raise

    def perform_destroy(self, instance):
        try:
            producto_repr = str(instance)
            producto_id = instance.id
            
            instance.delete()
            
            # Registrar auditoría
            log_action(
                usuario=self.request.user,
                accion='eliminar',
                modelo='Producto',
                objeto_id=producto_id,
                objeto_repr=producto_repr,
                request=self.request
            )
        except Exception:
            tb = traceback.format_exc()
            logger.error("Error al eliminar producto: %s", tb)
            raise


class UsuarioViewSet(viewsets.ModelViewSet):
    # Aseguramos un queryset ordenado para evitar warnings de paginación inconsistente
    queryset = User.objects.all().order_by('usuario')
    # Reglas granulares de gestión de usuarios según rol
    permission_classes = [IsAuthenticated, UserManagementPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Usas 'usuario' como campo en tu User model (ajustado)
    search_fields = ['usuario', 'nombre', 'email']
    ordering_fields = ['usuario', 'nombre', 'fecha_creacion']

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UsuarioUpdateSerializer
        return UsuarioSerializer

    def perform_create(self, serializer):
        user = self.request.user
        rol_nuevo = (self.request.data.get('rol') or '').lower()
        # superuser: sin restricciones
        if user.is_superuser:
            serializer.save()
            return
        # admin: limitar rol
        if user.is_staff:
            if rol_nuevo in ('admin', 'superuser'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('No puedes crear usuarios con rol admin o superuser.')
            serializer.save()
            return
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('No tienes permisos para crear usuarios.')

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance
        target_rol = (getattr(instance, 'rol', '') or '').lower()
        new_rol = (self.request.data.get('rol') or target_rol).lower()
        if user.is_superuser:
            serializer.save()
            return
        if user.is_staff:
            # No puede editar admins/superusers ni promover a admin/superuser
            if target_rol in ('admin', 'superuser') or getattr(instance, 'is_superuser', False):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('No puedes editar este usuario.')
            if new_rol in ('admin', 'superuser'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('No puedes asignar rol admin o superuser.')
            serializer.save()
            return
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('No tienes permisos para actualizar usuarios.')

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Endpoint /usuarios/me/ :
        - Actualiza `ultimo_acceso` en el usuario autenticado (timezone-aware)
        - Devuelve el serializer con datos del usuario
        """
        try:
            user = request.user
            if user and getattr(user, 'is_authenticated', False):
                # actualizar ultimo_acceso en cada consulta 'me'
                if hasattr(user, 'ultimo_acceso'):
                    user.ultimo_acceso = timezone.now()
                    # evitar tocar is_active/is_staff sin querer; solo actualizar el campo concreto
                    try:
                        user.save(update_fields=['ultimo_acceso'])
                    except Exception as e:
                        logger.warning("No se pudo guardar ultimo_acceso para user %s: %s", getattr(user, 'id', '<unk>'), str(e))
            serializer = UsuarioSerializer(user, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en UsuarioViewSet.me: %s\n%s", str(e), tb)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfiguracionSistemaViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionSistema.objects.all()
    serializer_class = ConfiguracionSistemaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def list(self, request, *args, **kwargs):
        # Devuelve siempre la única configuración (crea si no existe)
        config = ConfiguracionSistema.objects.first()
        if not config:
            config = ConfiguracionSistema.objects.create()
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Asegurar singleton
        config = ConfiguracionSistema.objects.first()
        if config:
            serializer = self.get_serializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        # Normal retrieve por id
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def singleton(self, request):
        config = ConfiguracionSistema.objects.first()
        if not config:
            config = ConfiguracionSistema.objects.create()
        serializer = self.get_serializer(config)
        return Response(serializer.data)


class UsuarioActualView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Endpoint alternativo /usuarios/actual/ o similar:
        - Asegura actualizar ultimo_acceso y devuelve el objeto del usuario.
        """
        try:
            user = request.user
            if user and getattr(user, 'is_authenticated', False) and hasattr(user, 'ultimo_acceso'):
                try:
                    user.ultimo_acceso = timezone.now()
                    user.save(update_fields=['ultimo_acceso'])
                except Exception as e:
                    logger.warning("No se pudo guardar ultimo_acceso en UsuarioActualView: %s", str(e))
            serializer = UsuarioSerializer(user, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en UsuarioActualView.get: %s\n%s", str(e), tb)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardEstadisticasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            total_productos = Producto.objects.count()
            stock_bajo = Producto.objects.filter(stock__lte=F('stock_minimo'), stock__gt=0).count()
            stock_agotado = Producto.objects.filter(stock=0).count()
            total_categorias = Categoria.objects.filter(activo=True).count()
            total_proveedores = Proveedor.objects.filter(activo=True).count()
            total_usuarios = User.objects.filter(is_active=True).count()

            valor_inventario_result = Producto.objects.aggregate(
                total=Sum(F('precio') * F('stock'))
            )
            valor_inventario = valor_inventario_result.get('total') or 0

            return Response({
                'total_productos': total_productos,
                'stock_bajo': stock_bajo,
                'stock_agotado': stock_agotado,
                'total_categorias': total_categorias,
                'total_proveedores': total_proveedores,
                'total_usuarios': total_usuarios,
                'valor_inventario': float(valor_inventario)
            })
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en DashboardEstadisticasView.get: %s\n%s", str(e), tb)
            return Response({
                'error': str(e),
                'total_productos': 0,
                'stock_bajo': 0,
                'stock_agotado': 0,
                'total_categorias': 0,
                'total_proveedores': 0,
                'total_usuarios': 0,
                'valor_inventario': 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOnly]

    def get(self, request):
        try:
            data = generate_backup_data()
            return Response(data)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en BackupView: %s\n%s", str(e), tb)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RestoreView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOnly]

    def post(self, request):
        payload = request.data
        try:
            config_payload = payload.get('configuracion')
            if config_payload:
                config = ConfiguracionSistema.objects.first() or ConfiguracionSistema.objects.create()
                serializer = ConfiguracionSistemaSerializer(config, data=config_payload, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            # Restauración ampliada (inventario) solo si se indica explícitamente
            if payload.get('restaurar_inventario') is True:
                categorias_data = payload.get('categorias') or []
                proveedores_data = payload.get('proveedores') or []
                productos_data = payload.get('productos') or []
                # Operación atómica para consistencia
                with transaction.atomic():
                    # Limpiar datos existentes de inventario
                    Producto.objects.all().delete()
                    Categoria.objects.all().delete()
                    Proveedor.objects.all().delete()

                    old_cat_map = {}
                    for c in categorias_data:
                        obj = Categoria.objects.create(
                            nombre=c.get('nombre',''),
                            descripcion=c.get('descripcion',''),
                            activo=c.get('activo', True)
                        )
                        old_cat_map[c.get('id')] = obj

                    old_prov_map = {}
                        
                    for p in proveedores_data:
                        obj = Proveedor.objects.create(
                            nombre=p.get('nombre',''),
                            contacto=p.get('contacto',''),
                            telefono=p.get('telefono',''),
                            email=p.get('email',''),
                            direccion=p.get('direccion',''),
                            activo=p.get('activo', True)
                        )
                        old_prov_map[p.get('id')] = obj

                    # Crear productos mapeando categorías y proveedores
                    for prod in productos_data:
                        cat_old_id = prod.get('categoria_id') or prod.get('categoria')
                        prov_old_id = prod.get('proveedor_id') or prod.get('proveedor')
                        categoria_obj = old_cat_map.get(cat_old_id)
                        proveedor_obj = old_prov_map.get(prov_old_id)
                        precio_val = prod.get('precio', 0)
                        try:
                            precio_val = Decimal(str(precio_val))
                        except Exception:
                            precio_val = Decimal('0')
                        Producto.objects.create(
                            nombre=prod.get('nombre',''),
                            descripcion=prod.get('descripcion',''),
                            categoria=categoria_obj,
                            proveedor=proveedor_obj,
                            stock=prod.get('stock',0),
                            stock_minimo=prod.get('stock_minimo',0),
                            precio=precio_val,
                            activo=prod.get('activo', True)
                        )

                # Registrar auditoría de importación
                log_action(
                    usuario=request.user,
                    accion='import',
                    modelo='Inventario',
                    objeto_id=None,
                    objeto_repr='Restauración inventario completa',
                    detalles={'categorias': len(categorias_data), 'proveedores': len(proveedores_data), 'productos': len(productos_data)},
                    request=request
                )
                return Response({'detail': 'Restauración aplicada (configuración + inventario).'})

            return Response({'detail': 'Restauración aplicada (solo configuración).'})
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en RestoreView: %s\n%s", str(e), tb)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemResetView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOnly]

    def post(self, request):
        try:
            # Eliminar datos de inventario (no usuarios)
            Producto.objects.all().delete()
            Categoria.objects.all().delete()
            Proveedor.objects.all().delete()
            return Response({'detail': 'Sistema restablecido (productos, categorías, proveedores eliminados).'})
        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Error en SystemResetView: %s\n%s", str(e), tb)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
