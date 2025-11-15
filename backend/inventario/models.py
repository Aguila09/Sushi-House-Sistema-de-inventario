# inventario/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

class UsuarioManager(BaseUserManager):
    def create_user(self, usuario, email, password=None, **extra_fields):
        if not usuario:
            raise ValueError('El usuario debe ser proporcionado')
        if not email:
            raise ValueError('El email debe ser proporcionado')
        email = self.normalize_email(email)
        user = self.model(usuario=usuario, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, usuario, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('rol', 'admin')
        
        return self.create_user(usuario, email, password, **extra_fields)

class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de usuario personalizado según el diagrama ER
    """
    usuario = models.CharField(max_length=50, unique=True)
    nombres = models.CharField(max_length=128)
    apellidos = models.CharField(max_length=128)
    nombre = models.CharField(max_length=255, editable=False)  # Quita el db_column
    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=50, default='usuario')
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)
    
    # Campos requeridos para el admin de Django
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'usuario'
    REQUIRED_FIELDS = ['email', 'nombres', 'apellidos']  # Actualizado

    def save(self, *args, **kwargs):
        self.nombre = f"{self.nombres} {self.apellidos}".strip()
        super().save(*args, **kwargs)


class ConfiguracionSistema(models.Model):
    """
    Configuración del sistema según diagrama ER
    """
    # Configuración General
    nombre_restaurante = models.CharField(max_length=100, default="Sushi House")
    moneda = models.CharField(max_length=10, default="MXN")
    iva = models.DecimalField(max_digits=5, decimal_places=2, default=16.0)
    formato_fecha = models.CharField(max_length=20, default="dd/mm/yyyy")
    direccion_restaurante = models.CharField(max_length=200, blank=True, default='')
    telefono_restaurante = models.CharField(max_length=20, blank=True, default='')
    
    # Configuración de Inventario
    stock_minimo_global = models.IntegerField(default=10)
    alerta_stock_bajo = models.CharField(max_length=5, default="si")
    unidad_medida = models.CharField(max_length=20, default="unidades")
    categoria_predeterminada = models.ForeignKey('Categoria', on_delete=models.SET_NULL, null=True, blank=True)
    control_caducidad = models.BooleanField(default=False)
    notificaciones_automaticas = models.BooleanField(default=False)
    
    # Configuración de Notificaciones
    email_notificaciones = models.EmailField(blank=True, default='')
    notif_stock_bajo = models.BooleanField(default=True)
    notif_stock_agotado = models.BooleanField(default=True)
    notif_productos_caducados = models.BooleanField(default=False)
    notif_pedidos_pendientes = models.BooleanField(default=False)
    notif_reportes_automaticos = models.BooleanField(default=False)
    notif_actividad_usuarios = models.BooleanField(default=False)
    frecuencia_reportes = models.CharField(max_length=20, default="semanal")
    hora_notificaciones = models.TimeField(default="09:00")
    
    # Configuración de Seguridad
    tiempo_sesion = models.IntegerField(default=30)
    intentos_fallidos = models.IntegerField(default=3)
    requerir_confirmacion = models.BooleanField(default=False)
    registro_actividad = models.BooleanField(default=True)
    backup_automatico = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Configuración del Sistema"
        verbose_name_plural = "Configuraciones del Sistema"

    def __str__(self):
        return f"Configuración: {self.nombre_restaurante}"

# Los modelos Categoria, Proveedor, Producto se mantienen igual
class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, related_name='productos')
    proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos')
    stock = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.nombre