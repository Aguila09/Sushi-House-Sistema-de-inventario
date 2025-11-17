# inventario/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Categoria, Proveedor, Producto, ConfiguracionSistema

# Custom User Admin
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = ['usuario', 'nombres', 'apellidos', 'nombre', 'email', 'rol', 'activo', 'fecha_creacion']
    list_filter = ['rol', 'activo', 'is_staff']
    search_fields = ['usuario', 'nombres', 'apellidos', 'email']
    readonly_fields = ('nombre', 'fecha_creacion', 'ultimo_acceso')
    fieldsets = UserAdmin.fieldsets + (
        ('Información adicional', {'fields': ('nombres', 'apellidos', 'nombre', 'rol', 'activo', 'ultimo_acceso')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información adicional', {
            'fields': ('nombres', 'apellidos', 'email', 'rol', 'activo')
        }),
    )
    ordering = ('usuario',)

# Register your models here
admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Categoria)
admin.site.register(Proveedor)
admin.site.register(Producto)
admin.site.register(ConfiguracionSistema)