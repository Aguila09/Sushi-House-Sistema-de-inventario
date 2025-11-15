# Sushi-House-Sistema-de-inventario
Sistema de inventario para el restaurante Sushi House

## Características

### Gestión de Inventario
- Control de productos, categorías y proveedores
- Alertas de stock bajo y productos agotados
- Seguimiento de fechas de caducidad
- Reportes y estadísticas

### Usuarios y Roles
- Super Usuario: Acceso completo al sistema
- Administrador: Gestión de inventario y usuarios
- Usuario Operacional: Gestión de inventario
- Usuario de Consulta: Solo lectura

### Página de Configuración
Sistema completo de configuración que permite personalizar:
- **Configuración General**: Nombre, moneda, IVA, formato de fecha, dirección, teléfono
- **Configuración de Inventario**: Stock mínimo, alertas, unidad de medida, categoría predeterminada, control de caducidad
- **Configuración de Notificaciones**: Email, tipos de notificaciones, frecuencia de reportes
- **Configuración de Seguridad**: Tiempo de sesión, intentos fallidos, confirmaciones, registro de actividad, backups automáticos
- **Mantenimiento del Sistema**: Backup, restauración y restablecimiento del sistema

Ver [CONFIGURACION.md](Archivos%20varios%20(documentacion)/CONFIGURACION.md) para más detalles.

## Tecnologías

### Backend
- Django 5.2.7
- Django REST Framework
- SQL Server (django-mssql-backend)
- JWT Authentication

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- API REST para comunicación con el backend

## Instalación

1. Instalar dependencias de Python:
```bash
pip install -r requirements.txt
```

2. Ejecutar migraciones:
```bash
cd backend
python manage.py migrate
```

3. Crear superusuario:
```bash
python manage.py createsuperuser
```

4. Ejecutar servidor de desarrollo:
```bash
python manage.py runserver
```

5. Abrir el frontend en un navegador:
```
frontend/index.html
```

## Configuración de Base de Datos

El sistema utiliza SQL Server por defecto. Configurar las variables de entorno en un archivo `.env`:

```
DB_NAME=SushiHouseDB
DB_HOST=localhost\SQLEXPRESS
DB_USER=
DB_PASSWORD=
DB_TRUSTED_CONNECTION=yes
```

## Estructura del Proyecto

```
.
├── backend/
│   ├── backend/          # Configuración Django
│   ├── inventario/       # App principal
│   │   ├── models.py     # Modelos de datos
│   │   ├── views.py      # Vistas y ViewSets
│   │   ├── serializers.py # Serializadores DRF
│   │   └── migrations/   # Migraciones de BD
│   └── manage.py
├── frontend/
│   ├── index.html
│   ├── configuracion.html
│   ├── usuarios.html
│   ├── productos.html
│   ├── categorias.html
│   ├── proveedores.html
│   ├── css/
│   └── js/
└── README.md
```

