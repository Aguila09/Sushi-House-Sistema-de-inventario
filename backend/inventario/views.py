from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Categoria, Proveedor, Producto, Configuracion
from .serializers import (
    CategoriaSerializer, ProveedorSerializer, ProductoSerializer,
    UsuarioSerializer, UsuarioCreateSerializer, ConfiguracionSerializer
)
from .permissions import IsAdminOrReadOnly
from django.contrib.auth import get_user_model
User = get_user_model()

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre']


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'contacto']
    ordering_fields = ['nombre']


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related('categoria', 'proveedor').all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria__id', 'proveedor__id', 'activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio', 'stock']


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'email']
    ordering_fields = ['username']

    def get_serializer_class(self):
        if self.action in ['create']:
            return UsuarioCreateSerializer
        return UsuarioSerializer


class ConfiguracionViewSet(viewsets.ModelViewSet):
    queryset = Configuracion.objects.all()
    serializer_class = ConfiguracionSerializer
    permission_classes = [IsAdminOrReadOnly]
