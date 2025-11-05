# inventario/views.py

import logging
import traceback

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, F
from django.db import models

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
from .permissions import IsAdminOrReadOnly

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
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
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

    def perform_destroy(self, instance):
        # No retornar Response desde perform_destroy; lanzar excepción para que DRF la maneje.
        try:
            instance.delete()
        except Exception:
            tb = traceback.format_exc()
            logger.error("Error al eliminar producto: %s", tb)
            raise

    def perform_update(self, serializer):
        try:
            serializer.save()
        except Exception:
            tb = traceback.format_exc()
            logger.error("Error al actualizar producto: %s", tb)
            raise


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
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

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)


class ConfiguracionSistemaViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionSistema.objects.all()
    serializer_class = ConfiguracionSistemaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        # Si no existe configuración, crear una por defecto
        if not ConfiguracionSistema.objects.exists():
            ConfiguracionSistema.objects.create()
        return ConfiguracionSistema.objects.all()


class UsuarioActualView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)


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
