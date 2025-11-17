# inventario/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
import datetime

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
        # Aseguramos flags y asignamos rol explícito 'superuser' para mayor claridad semántica.
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Si ya existía un superuser con rol 'admin' esto no afecta registros previos.
        # Nuevos superusuarios tendrán rol 'superuser'.
        extra_fields['rol'] = 'superuser'
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
    
    # Control de intentos fallidos
    intentos_fallidos_count = models.IntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    
    # Campos requeridos para el admin de Django
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'usuario'
    REQUIRED_FIELDS = ['email', 'nombres', 'apellidos']  # Actualizado

    def save(self, *args, **kwargs):
        self.nombre = f"{self.nombres} {self.apellidos}".strip()
        super().save(*args, **kwargs)

    def is_bloqueado(self):
        """Verifica si el usuario está bloqueado por intentos fallidos"""
        if self.bloqueado_hasta and timezone.now() < self.bloqueado_hasta:
            return True
        # Si el tiempo de bloqueo ya pasó, desbloquear automáticamente
        if self.bloqueado_hasta and timezone.now() >= self.bloqueado_hasta:
            self.bloqueado_hasta = None
            self.intentos_fallidos_count = 0
            self.save(update_fields=['bloqueado_hasta', 'intentos_fallidos_count'])
        return False

    def incrementar_intentos_fallidos(self):
        """Incrementa el contador de intentos fallidos y bloquea si es necesario"""
        from .models import ConfiguracionSistema
        config = ConfiguracionSistema.objects.first()
        max_intentos = config.intentos_fallidos if config else 3
        
        self.intentos_fallidos_count += 1
        
        if self.intentos_fallidos_count >= max_intentos:
            # Bloquear por 15 minutos
            self.bloqueado_hasta = timezone.now() + timezone.timedelta(minutes=15)
        
        self.save(update_fields=['intentos_fallidos_count', 'bloqueado_hasta'])

    def resetear_intentos_fallidos(self):
        """Resetea el contador de intentos fallidos tras login exitoso"""
        if self.intentos_fallidos_count > 0 or self.bloqueado_hasta:
            self.intentos_fallidos_count = 0
            self.bloqueado_hasta = None
            self.save(update_fields=['intentos_fallidos_count', 'bloqueado_hasta'])


class ConfiguracionSistema(models.Model):
    """
    Configuración del sistema según diagrama ER
    """
    # Identidad y formato
    nombre_restaurante = models.CharField(max_length=100, default="Sushi House")
    moneda = models.CharField(max_length=10, default="MXN")
    iva = models.DecimalField(max_digits=5, decimal_places=2, default=16.00)
    formato_fecha = models.CharField(max_length=20, default="dd/mm/yyyy")
    direccion_restaurante = models.CharField(max_length=200, blank=True, default='')
    telefono_restaurante = models.CharField(max_length=30, blank=True, default='')

    # Inventario
    stock_minimo_global = models.IntegerField(default=10)
    alerta_stock_bajo = models.BooleanField(default=True)
    unidad_medida = models.CharField(max_length=20, default='unidades')
    categoria_predeterminada = models.ForeignKey('Categoria', null=True, blank=True, on_delete=models.SET_NULL, related_name='configuraciones_predeterminada')
    notificaciones_automaticas = models.BooleanField(default=False)

    # Notificaciones y canales
    email_notificaciones = models.EmailField(blank=True, default='')
    notif_stock_bajo = models.BooleanField(default=True)
    notif_stock_agotado = models.BooleanField(default=True)
    notif_reportes_automaticos = models.BooleanField(default=False)
    notif_actividad_usuarios = models.BooleanField(default=False)
    frecuencia_reportes = models.CharField(max_length=10, default='semanal')  # diario|semanal|mensual|ninguno
    hora_notificaciones = models.TimeField(default=datetime.time(9, 0))

    # Seguridad
    tiempo_sesion = models.IntegerField(default=30)  # minutos
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


class AuditLog(models.Model):
    """
    Modelo para registro de auditoría de todas las acciones del sistema
    """
    ACCION_CHOICES = [
        ('crear', 'Crear'),
        ('actualizar', 'Actualizar'),
        ('eliminar', 'Eliminar'),
        ('login', 'Inicio de sesión'),
        ('logout', 'Cierre de sesión'),
        ('export', 'Exportación'),
        ('import', 'Importación'),
    ]
    
    usuario = models.ForeignKey('Usuario', on_delete=models.SET_NULL, null=True, related_name='acciones_auditoria')
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    modelo = models.CharField(max_length=50, blank=True)  # Producto, Usuario, Categoria, etc.
    objeto_id = models.IntegerField(null=True, blank=True)
    objeto_repr = models.CharField(max_length=255, blank=True)  # Representación del objeto
    detalles = models.JSONField(null=True, blank=True)  # Detalles adicionales en JSON
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Registro de Auditoría"
        verbose_name_plural = "Registros de Auditoría"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['usuario', '-timestamp']),
            models.Index(fields=['modelo', '-timestamp']),
        ]
    
    def __str__(self):
        usuario_str = self.usuario.usuario if self.usuario else 'Sistema'
        return f"{usuario_str} - {self.get_accion_display()} {self.modelo} - {self.timestamp}"

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.nombre