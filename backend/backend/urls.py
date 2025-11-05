"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from inventario import views
from inventario.auth import ResolveUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = routers.DefaultRouter()
router.register(r'categorias', views.CategoriaViewSet, basename='categorias')
router.register(r'proveedores', views.ProveedorViewSet, basename='proveedores')
router.register(r'productos', views.ProductoViewSet, basename='productos')
router.register(r'usuarios', views.UsuarioViewSet, basename='usuarios')
router.register(r'configuracion', views.ConfiguracionSistemaViewSet, basename='configuracion')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # CORREGIDO: Cambiado a /api/token/ para que coincida con el frontend
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # NUEVOS ENDPOINTS REQUERIDOS POR EL FRONTEND
    path('api/usuarios/me/', views.UsuarioActualView.as_view(), name='usuario_actual'),
    path('api/auth/resolve-user/', ResolveUserView.as_view(), name='resolve_user'),
    path('api/dashboard/estadisticas/', views.DashboardEstadisticasView.as_view(), name='dashboard_estadisticas'),
]
