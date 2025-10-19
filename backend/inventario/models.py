# inventario/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    # heredamos username, password, email, first_name, last_name, is_staff, is_active...
    # añadimos campos extra
    rol = models.CharField(max_length=50, blank=True, default='usuario')
    activo = models.BooleanField(default=True)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.username


class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    activo = models.BooleanField(default=True)

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

    def __str__(self):
        return self.nombre


class Configuracion(models.Model):
    clave = models.CharField(max_length=100, unique=True)
    valor = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.clave} = {self.valor}"
