# Sushi House - Sistema de Inventario

Sistema web de gestión de inventario desarrollado con Django REST Framework y frontend vanilla JavaScript. Incluye gestión de productos, categorías, proveedores, usuarios, reportes, backups automáticos y auditoría completa.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Frontend](#-frontend)
- [Backups y Mantenimiento](#-backups-y-mantenimiento)
- [Seguridad y Permisos](#-seguridad-y-permisos)
- [Auditoría](#-auditoría)
- [Comandos de Gestión](#-comandos-de-gestión)
 - [Pruebas](#-pruebas)
 - [Manual de Usuario y Admin](#-manual-de-usuario-y-admin)
 - [Validación en Staging](#-validación-en-staging)

---

## ✨ Características

### Funcionalidades Principales
- ✅ **Gestión de Inventario**: productos, categorías y proveedores
- ✅ **Control de Stock**: alertas de stock bajo configurables
- ✅ **Gestión de Usuarios**: roles (superuser, operativo, consulta), bloqueo por intentos fallidos
- ✅ **Reportes**: productos más vendidos, movimientos de inventario, productos por caducar
- ✅ **Backups Automáticos**: programados diariamente con retención configurable
- ✅ **Auditoría Completa**: registro de todas las acciones importantes
- ✅ **Autenticación JWT**: tokens de acceso y refresh
- ✅ **Interfaz Responsiva**: HTML/CSS/JS vanilla

### Características de Seguridad
- 🔐 Autenticación con tokens JWT (access + refresh)
- 🔐 Bloqueo automático de usuarios tras intentos fallidos
- 🔐 Control de acceso basado en roles (is_staff, is_superuser, rol de negocio)
- 🔐 Bloqueo de inicio de sesión para usuarios inactivos (campo `activo`)
- 🔐 Endpoints críticos restringidos a administradores
- 🔐 Confirmaciones para acciones destructivas en UI

### Backups y Mantenimiento
- 💾 Backups automáticos programables (APScheduler)
- 💾 Retención de backups con poda automática
- 💾 Exportación manual desde UI
- 💾 Restauración de configuración y opcionalmente inventario completo
- 💾 Reseteo completo del sistema (solo admin)

---

## 🏗 Arquitectura

```
┌─────────────────┐
│  Frontend       │
│  HTML/CSS/JS    │
│  (Vanilla)      │
└────────┬────────┘
         │ HTTP/JSON
         │ JWT Auth
┌────────▼────────┐
│  Django REST    │
│  Framework      │
│  + SimpleJWT    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────┐
│ SQL   │ │ APScheduler │
│ Server│ │ (Backups)   │
└───────┘ └─────────────┘
```

### Stack Tecnológico

**Backend:**
- Django 5.x
- Django REST Framework
- djangorestframework-simplejwt (autenticación)
- mssql-django + pyodbc (SQL Server)
- APScheduler 3.10.4 (tareas programadas)
- python-dotenv (variables de entorno)

**Frontend:**
- HTML5 + CSS3
- JavaScript Vanilla (ES6+)
- Sin frameworks ni librerías externas

**Base de Datos:**
- Microsoft SQL Server

---

## 📦 Requisitos

- Python 3.10+
- SQL Server (local o remoto)
- ODBC Driver 18 for SQL Server
- Navegador web moderno (Chrome, Firefox, Edge)

---

## 🚀 Instalación

### 1. Clonar el repositorio

```powershell
git clone https://github.com/Aguila09/Sushi-House-Sistema-de-inventario.git
cd sistemaInventario
```

### 2. Crear entorno virtual

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Instalar dependencias

```powershell
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Crear archivo `.env` en `backend/` (o usa `backend/.env.example` como base):

```env
# Django
SECRET_KEY=tu-clave-secreta-aqui
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_TIME_ZONE=America/Mexico_City
DJANGO_PAGE_SIZE=10

# SimpleJWT
SIMPLE_JWT_ACCESS_MINUTES=60
SIMPLE_JWT_REFRESH_DAYS=7

# Base de datos (SQL Server)
DB_ENGINE=mssql
DB_NAME=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña
DB_HOST=localhost\SQLEXPRESS
DB_PORT=
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_EXTRA_PARAMS=TrustServerCertificate=yes;

# Backups
BACKUP_SCHEDULE_HOUR=2
BACKUP_SCHEDULE_MINUTE=0
BACKUPS_MAX_FILES=10
```

### 5. Aplicar migraciones

```powershell
cd backend
python manage.py migrate
```

### 6. Crear superusuario

```powershell
python manage.py createsuperuser
# O usar el script personalizado
python crear_superusuario.py
```

### 7. Ejecutar el servidor

```powershell
python manage.py runserver
```

### 8. Acceder a la aplicación

- **API (Django)**: http://localhost:8000/api/
- **Admin Django**: http://localhost:8000/admin/
- **Frontend (dev)**: servir `frontend/` con Live Server (VS Code) en `http://127.0.0.1:5500/frontend/index.html`.
   - Alternativa: desde `frontend/`, ejecutar `python -m http.server 5500` y abrir la URL anterior.

---

## ⚙ Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `DB_NAME` | Nombre de la base de datos | - |
| `DB_USER` | Usuario de SQL Server | - |
| `DB_PASSWORD` | Contraseña de SQL Server | - |
| `DB_HOST` | Host de SQL Server | localhost |
| `DB_PORT` | Puerto de SQL Server | 1433 |
| `SECRET_KEY` | Clave secreta de Django | - |
| `DJANGO_DEBUG` | Modo debug | False |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos | localhost |
| `DJANGO_TIME_ZONE` | Zona horaria | UTC |
| `DJANGO_PAGE_SIZE` | Tamaño de página por defecto DRF | 10 |
| `SIMPLE_JWT_ACCESS_MINUTES` | Minutos de vida del access token | 60 |
| `SIMPLE_JWT_REFRESH_DAYS` | Días de vida del refresh token | 7 |
| `DB_ENGINE` | Engine BD (mssql) | mssql |
| `DB_DRIVER` | Driver ODBC | ODBC Driver 18 for SQL Server |
| `DB_EXTRA_PARAMS` | Parámetros extra ODBC | TrustServerCertificate=yes; |
| `DRF_THROTTLE_USER` | Límite por usuario | 120/minute |
| `DRF_THROTTLE_ANON` | Límite anónimo | 60/minute |
| `DRF_THROTTLE_AUTH` | Límite para login (scope auth) | 5/minute |
| `DJANGO_SECURE_SSL_REDIRECT` | Redirigir a HTTPS | False |
| `DJANGO_SESSION_COOKIE_SECURE` | Cookies de sesión solo HTTPS | False |
| `DJANGO_CSRF_COOKIE_SECURE` | Cookie CSRF solo HTTPS | False |
| `DJANGO_HSTS_SECONDS` | HSTS en segundos | 0 |
| `DJANGO_HSTS_INCLUDE_SUBDOMAINS` | HSTS subdominios | False |
| `DJANGO_HSTS_PRELOAD` | HSTS preload | False |
| `DISABLE_SCHEDULER` | Desactivar scheduler (tests, etc.) | False |
| `BACKUP_SCHEDULE_HOUR` | Hora de backup automático | 2 |
| `BACKUP_SCHEDULE_MINUTE` | Minuto de backup automático | 0 |
| `BACKUPS_MAX_FILES` | Máximo de backups a retener | 10 |

### Configuración del Sistema

Acceder a **Configuración** en la UI (requiere rol admin) para:
- Activar/desactivar backups automáticos
- Configurar límite de intentos de inicio de sesión
- Configurar alertas de stock bajo
- Establecer días de anticipación para alertas de caducidad

---

## 📖 Uso

### Inicio de Sesión

1. Abrir http://127.0.0.1:5500/frontend/login.html
2. Ingresar credenciales
3. El sistema valida:
   - Usuario existe
   - Contraseña correcta
   - Usuario activo (`activo = true`)
   - Usuario no bloqueado

### Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Superuser** | Acceso completo, gestión de usuarios, backups, configuración |
| **Operativo** | CRUD de productos, categorías, proveedores, reportes |
| **Consulta** | Solo lectura de productos, categorías, proveedores |

### Navegación

- **Dashboard** (`index.html`): resumen del inventario
- **Productos** (`productos.html`): gestión de productos
- **Categorías** (`categorias.html`): gestión de categorías
- **Proveedores** (`proveedores.html`): gestión de proveedores
- **Usuarios** (`usuarios.html`): gestión de usuarios (solo admin)
- **Reportes** (`reportes.html`): generación de reportes
- **Configuración** (`configuracion.html`): ajustes del sistema (solo admin)

---

## 📁 Estructura del Proyecto

```
sistemaInventario/
├── README.md
├── requirements.txt
├── backend/
│   ├── manage.py
│   ├── crear_superusuario.py
│   ├── purge_all_migrations.py
│   ├── purge_inventario_migrations.py
│   ├── .env (crear manualmente)
│   ├── backups/ (generado automáticamente)
│   ├── backend/
│   │   ├── __init__.py
│   │   ├── settings.py        # Configuración Django
│   │   ├── urls.py             # URLs principales
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── inventario/
│       ├── models.py           # Modelos de datos
│       ├── views.py            # ViewSets y vistas
│       ├── serializers.py      # Serializers DRF
│       ├── permissions.py      # Permisos personalizados
│       ├── auth.py             # Autenticación custom
│       ├── signals.py          # Señales Django
│       ├── audit.py            # Sistema de auditoría
│       ├── backup_utils.py     # Utilidades de backup
│       ├── scheduler.py        # Programador de tareas
│       ├── apps.py             # Configuración de app
│       ├── admin.py
│       ├── tests.py
│       ├── management/
│       │   └── commands/
│       │       ├── run_backup_now.py
│       │       ├── enable_backup_soon.py
│       │       ├── promote_superuser.py
│       │       ├── restore_from_file.py
│       │       └── backfill_ultimo_acceso.py
│       └── migrations/
└── frontend/
    ├── index.html
    ├── login.html
    ├── productos.html
    ├── categorias.html
    ├── proveedores.html
    ├── usuarios.html
    ├── reportes.html
    ├── configuracion.html
    ├── css/
    │   ├── styles.css
    │   └── loading.css
    └── js/
        ├── api.js              # Cliente HTTP con JWT
        ├── auth.js             # Autenticación y permisos
        ├── storage.js          # LocalStorage
        ├── validation.js       # Validaciones
        ├── confirmation.js     # Confirmaciones globales
        ├── loading.js          # Estados de carga
        ├── app.js
        ├── script.js
        ├── productos.js
        ├── categorias.js
        ├── proveedores.js
        ├── usuarios.js
        ├── reportes.js
        └── configuracion.js
```

---

## 🔌 API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/api/token/` | Obtener tokens JWT | Público |
| POST | `/api/token/refresh/` | Renovar access token | Público |

### Productos

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/productos/` | Listar productos | Autenticado |
| POST | `/api/productos/` | Crear producto | Admin/Operativo |
| GET | `/api/productos/{id}/` | Detalle de producto | Autenticado |
| PUT | `/api/productos/{id}/` | Actualizar producto | Admin/Operativo |
| DELETE | `/api/productos/{id}/` | Eliminar producto | Admin/Operativo |
| POST | `/api/productos/{id}/ajustar_stock/` | Ajustar stock | Admin/Operativo |

### Categorías

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/categorias/` | Listar categorías | Autenticado |
| POST | `/api/categorias/` | Crear categoría | Admin/Operativo |
| GET | `/api/categorias/{id}/` | Detalle de categoría | Autenticado |
| PUT | `/api/categorias/{id}/` | Actualizar categoría | Admin/Operativo |
| DELETE | `/api/categorias/{id}/` | Eliminar categoría | Admin/Operativo |

### Proveedores

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/proveedores/` | Listar proveedores | Autenticado |
| POST | `/api/proveedores/` | Crear proveedor | Admin/Operativo |
| GET | `/api/proveedores/{id}/` | Detalle de proveedor | Autenticado |
| PUT | `/api/proveedores/{id}/` | Actualizar proveedor | Admin/Operativo |
| DELETE | `/api/proveedores/{id}/` | Eliminar proveedor | Admin/Operativo |

### Usuarios

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/usuarios/` | Listar usuarios | Admin |
| POST | `/api/usuarios/` | Crear usuario | Admin |
| GET | `/api/usuarios/{id}/` | Detalle de usuario | Admin |
| PUT | `/api/usuarios/{id}/` | Actualizar usuario | Admin |
| DELETE | `/api/usuarios/{id}/` | Eliminar usuario | Admin |
<!-- Nota: desbloqueo de usuario por endpoint dedicado no está expuesto actualmente -->

### Reportes

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/reportes/productos-mas-vendidos/` | Top productos | Autenticado |
| GET | `/api/reportes/movimientos-inventario/` | Historial | Autenticado |
| GET | `/api/reportes/productos-por-caducar/` | Por caducar | Autenticado |

### Configuración

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/configuracion/` | Obtener configuración | Autenticado |
| PUT | `/api/configuracion/` | Actualizar configuración | Admin |

### Mantenimiento

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/backup/` | Generar y descargar backup | **Admin only** |
| POST | `/api/restore/` | Restaurar desde backup | **Admin only** |
| POST | `/api/system/reset/` | Resetear sistema completo | **Admin only** |

**Payload de Restore:**
```json
{
  "backup_data": { /* datos del backup */ },
  "restaurar_inventario": false  // true para restauración completa
}
```

---

## 🖥 Frontend

### Arquitectura del Frontend

- **Sin frameworks**: JavaScript vanilla para máximo control
- **Modular**: cada página tiene su script dedicado
- **Reutilizable**: componentes compartidos (api, auth, storage, validation, confirmation)
- **Seguro**: ocultación de UI según permisos con `data-role="admin"`

### Módulos JavaScript

#### `api.js` - Cliente HTTP
```javascript
const api = new ApiClient('http://localhost:8000/api');
await api.get('/productos/');
await api.post('/productos/', data);
```
- Manejo automático de JWT (access + refresh)
- Interceptores para errores 401
- Renovación automática de tokens

#### `auth.js` - Autenticación
```javascript
await Auth.login(username, password);
Auth.logout();
const user = Auth.getCurrentUser();
Auth.requireAuth(); // Redirige si no autenticado
```
- Gestión de sesión
- Ocultación de elementos `[data-role="admin"]` para no-admin
- Persistencia en localStorage

#### `storage.js` - Persistencia
```javascript
Storage.set('key', value, ttl);
const value = Storage.get('key');
Storage.remove('key');
```

#### `confirmation.js` - Confirmaciones
```javascript
confirmAction('¿Eliminar producto?', async () => {
  await api.delete(`/productos/${id}/`);
});

confirmCriticalAction('Operación irreversible', callback);
```

#### `validation.js` - Validaciones
```javascript
const errors = validateForm(formData, rules);
if (errors.length > 0) showErrors(errors);
```

### Elementos con `data-role="admin"`

Elementos que se ocultan automáticamente para usuarios no-admin:
- Botón de generar backup
- Sección de restaurar backup
- Botón de resetear sistema
- Card completa de "Configuración de Seguridad"
- Gestión de usuarios (página completa)

---

## 💾 Backups y Mantenimiento

### Backups Automáticos

**Implementación:** APScheduler (BackgroundScheduler + CronTrigger)

**Funcionamiento:**
1. El scheduler arranca en `apps.py` al iniciar Django
2. Ejecuta job diario a la hora configurada (env: `BACKUP_SCHEDULE_HOUR/MINUTE`)
3. El job verifica que `backup_automatico` esté activado en configuración
4. Genera backup JSON con timestamp: `backup-YYYYMMDD-HHMMSS.json`
5. Guarda en `backend/backups/`
6. Ejecuta poda automática (retiene últimos N backups según `BACKUPS_MAX_FILES`)
7. Registra acción en auditoría

**Contenido del Backup:**
```json
{
  "configuracion": { /* ConfiguracionSistema */ },
  "categorias": [ /* lista de categorías */ ],
  "proveedores": [ /* lista de proveedores */ ],
  "productos": [ /* lista de productos */ ],
  "usuarios": [ /* usuarios sin contraseñas */ ]
}
```

**Exclusiones:**
- Contraseñas de usuarios (solo username, email, rol, flags)
- Auditoría (AuditLog)
- Historial de movimientos de inventario

### Backup Manual desde UI

1. Ir a **Configuración**
2. Click en "Generar Backup"
3. Confirmar en el diálogo
4. El archivo se descarga automáticamente con timestamp

### Restauración

**Desde UI (solo configuración):**
1. Ir a **Configuración** → "Restaurar desde Backup"
2. Seleccionar archivo JSON
3. Click "Restaurar Backup"
4. Solo restaura configuración del sistema (safe)

**Desde CLI (completa):**
```powershell
python manage.py restore_from_file ruta/al/backup.json --restaurar-inventario
```

Restaura:
- Configuración
- Categorías (elimina existentes)
- Proveedores (elimina existentes)
- Productos (elimina existentes)
- Usuarios (NO sobrescribe; solo crea si no existen)

### Reset Completo del Sistema

**Advertencia:** Elimina TODOS los datos excepto superusuarios.

```powershell
# Desde UI (admin): Configuración → Resetear Sistema
# O desde API:
POST /api/system/reset/
Authorization: Bearer {admin_token}
```

---

## 🔐 Seguridad y Permisos

### Roles de Usuario

**Definición de roles (campo `rol` en modelo Usuario):**
- `superuser`: acceso completo
- `operativo`: CRUD de inventario, reportes
- `consulta`: solo lectura

**Flags de Django (is_staff, is_superuser):**
- `is_staff = True` → acceso a admin de Django
- `is_superuser = True` → bypass de todos los permisos

### Campo `activo` vs `is_active`

| Campo | Propósito |
|-------|-----------|
| `is_active` | Flag de Django (siempre True para usuarios creados) |
| `activo` | Flag de negocio (controla acceso real al sistema) |

**Regla:** Si `activo = False`, el usuario NO puede iniciar sesión aunque `is_active = True`.

### Clases de Permisos Personalizadas

**IsAdminOrReadOnly:**
- Admin/Operativo: lectura y escritura
- Consulta: solo lectura

**IsAdminOrOperationalOrReadOnly:**
- Admin/Operativo: lectura y escritura
- Consulta: solo lectura

**UserManagementPermission:**
- Solo admin: CRUD de usuarios
- Propietario: puede ver/editar su propio perfil

**IsAdminOnly:**
- Solo admin: cualquier método
- Aplicado a: Backup, Restore, System Reset

### Bloqueo por Intentos Fallidos

1. Configurar `intentos_login_max` en ConfiguracionSistema (ej: 3)
2. Al fallar login, incrementa `intentos_fallidos` del usuario
3. Al alcanzar el límite, establece `bloqueado_hasta = now + 15min`
4. Usuario no puede iniciar sesión hasta que expire el bloqueo
5. Desbloqueo manual puede realizarse por admin vía edición del usuario (si aplica).

### Auditoría de Intentos de Login

Todos los intentos de inicio de sesión se registran en AuditLog:
- Login exitoso: acción `login`
- Login fallido por usuario inactivo: acción `login_attempt_inactive`
- Login fallido por contraseña incorrecta: (Django logs)

---

## 📊 Auditoría

### Modelo AuditLog

Campos:
- `usuario` (FK a Usuario)
- `accion` (ej: 'create', 'update', 'delete', 'export', 'import', 'login')
- `modelo` (ej: 'Producto', 'Categoria')
- `objeto_id`
- `detalles` (JSON con cambios)
- `timestamp`

### Helper `log_action`

```python
from inventario.audit import log_action

log_action(
    usuario=request.user,
    accion='delete',
    modelo='Producto',
    objeto_id=producto.id,
    detalles={'nombre': producto.nombre}
)
```

### Acciones Auditadas

- Creación/edición/eliminación de productos, categorías, proveedores
- Ajustes de stock
- Creación/edición/eliminación de usuarios
- Generación de backups (manual y automático)
- Restauración de backups (config e inventario)
- Reseteo del sistema
- Intentos de login de usuarios inactivos

---

## 🛠 Comandos de Gestión

### Backups

**Generar backup inmediato:**
```powershell
python manage.py run_backup_now
```

**Activar backup automático y programar próximo (testing):**
```powershell
python manage.py enable_backup_soon --minutes 2
# Activa backup_automatico y programa para dentro de 2 minutos
```

**Restaurar desde archivo:**
```powershell
# Solo configuración
python manage.py restore_from_file backups/backup-20250116-143000.json

# Inventario completo
python manage.py restore_from_file backups/backup-20250116-143000.json --restaurar-inventario
```

### Usuarios

**Promover a superuser:**
```powershell
python manage.py promote_superuser admin
# Establece is_staff=True, is_superuser=True, rol='superuser'
```

**Crear superuser estándar:**
```powershell
python manage.py createsuperuser
# O usar script personalizado:
python crear_superusuario.py
```

**Backfill de campo ultimo_acceso:**
```powershell
python manage.py backfill_ultimo_acceso
```

### Migraciones

**Limpiar migraciones de inventario:**
```powershell
python purge_inventario_migrations.py
```

**Limpiar todas las migraciones:**
```powershell
python purge_all_migrations.py
```

---

## 🧪 Pruebas

### Ejecutar tests (SQLite en memoria)

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="backend.settings_test"
python manage.py test -v 2
```

Se usa una base SQLite en memoria para aislar pruebas. Incluye tests mínimos de:
- Bloqueo de login si `activo = False`
- Permiso admin-only en `/api/backup/`
- Restauración de configuración vía `/api/restore/`
- Reset de sistema en `/api/system/reset/`

Opcional: añadir cobertura con `coverage` si se requiere reporte.

---

## 📘 Manual de Usuario y Admin

- Inicio de sesión: vía `login.html`; si el usuario está inactivo (campo `activo=false`), el sistema bloquea el acceso.
- Navegación: dashboard, CRUD de productos/categorías/proveedores, reportes.
- Usuarios (solo admin): crear/editar usuarios; no se puede asignar `superuser` salvo superusuarios.
- Seguridad UI: elementos con `data-role="admin"` se ocultan para no-admin automáticamente.
- Backups (solo admin): en `configuracion.html` hay botón de generar backup (confirmación previa) y sección de restauración segura (configuración).
- Reset de sistema (solo admin): elimina productos/categorías/proveedores.

Buenas prácticas:
- Cerrar sesión desde el menú de usuario.
- Antes de operaciones críticas (restore/reset), generar un backup y validarlo.

---

## 🧪 Validación en Staging

Objetivo: comprobar ciclo backup → restore y permisos.

1) Preparar entorno
```powershell
cd backend
copy .env.example .env  # Ajusta credenciales
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_initial_data
```

2) Generar backup (API) y verificar
```powershell
# Inicia el servidor
python manage.py runserver
# Desde UI (configuración) descarga backup.json
```

3) Restauración segura (solo configuración)
```powershell
# Usar UI de configuración para subir el JSON y restaurar
```

4) Restauración completa (CLI, entorno aislado de pruebas)
```powershell
python manage.py restore_from_file ruta\al\backup.json --restaurar-inventario
```

5) Verificaciones
- Configuración: nombre del restaurante y parámetros aplicados.
- Inventario: categorías/proveedores/productos coinciden (para restore completo).
- Permisos: endpoints de mantenimiento solo accesibles a admin.

Notas:
- Production: establecer `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, CORS específico, y considerar `DJANGO_SECURE_*`/HSTS.
- Throttling: límites configurables por env para mitigar fuerza bruta en login.

---

## 🚀 Producción

### Recomendaciones

1. **Variables de entorno:**
   ```env
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=tu-dominio.com
   SECRET_KEY=clave-secreta-muy-larga-y-aleatoria
   ```

2. **Base de datos:**
   - SQL Server con backups periódicos
   - Índices en campos frecuentemente consultados
   - Monitoreo de rendimiento

3. **Backups:**
   - Configurar almacenamiento externo (Azure Blob, AWS S3)
   - Cifrar archivos de backup
   - Comprimir JSON (gzip)
   - Proceso dedicado para el scheduler (no en web workers)
   - Alertas si falla el backup automático

4. **Seguridad:**
   - HTTPS obligatorio
   - CORS configurado correctamente
   - Rate limiting en endpoints de autenticación
   - Rotación de SECRET_KEY periódica
   - Auditoría de accesos

5. **Servidor web:**
   - Usar Gunicorn/uWSGI + Nginx (Linux) o IIS/Reverse Proxy en Windows
   - Ejecutar `python manage.py collectstatic` (usa `STATIC_ROOT` ya configurado)
   - Servir `staticfiles/` directamente desde el proxy (Nginx/IIS)
   - Configurar timeout apropiado

6. **Despliegue (Guía rápida):**
   - Migraciones: `python manage.py migrate`
   - Crear superusuario: `python manage.py createsuperuser`
   - Archivos estáticos: `python manage.py collectstatic --noinput`
   - WSGI (ejemplo): `gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3`
   - Nginx: proxy_pass a `http://127.0.0.1:8000/`; servir `/static/` desde `staticfiles/`

6. **Monitoreo:**
   - Logs centralizados
   - Alertas de errores (Sentry)
   - Métricas de uso

---

## 🤝 Contribuciones

Este proyecto es desarrollado para Sushi House. Para contribuir:

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abrir Pull Request

---

## 📝 Licencia

Proyecto privado de Sushi House.

---

## 👨‍💻 Autor

Desarrollado para Sushi House - Sistema de Inventario  
Repositorio: [Aguila09/Sushi-House-Sistema-de-inventario](https://github.com/Aguila09/Sushi-House-Sistema-de-inventario)

---

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema, contactar al equipo de desarrollo.

---

**Última actualización:** Noviembre 2025
