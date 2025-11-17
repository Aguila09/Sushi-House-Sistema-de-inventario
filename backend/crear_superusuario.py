from inventario.models import Usuario

# Crear superusuario
u = Usuario.objects.create_superuser(
    usuario='admin',
    email='admin@sushihouse.com',
    password='admin123',
    nombres='Administrador',
    apellidos='Sistema'
)

print('==============================================')
print('Superusuario creado exitosamente')
print('==============================================')
print('Usuario: admin')
print('Password: admin123')
print('Email: admin@sushihouse.com')
print('==============================================')
print('Puedes iniciar sesión en el sistema ahora.')
print('==============================================')
