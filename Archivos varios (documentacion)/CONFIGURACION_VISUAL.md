# Configuration Page Implementation - Visual Summary

## Page Structure

The configuration page (`configuracion.html`) is divided into 5 main sections:

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER / NAVIGATION                   │
│  🍽️ Sushi House | Inicio | Productos | ... | Config    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  1. ⚙️  CONFIGURACIÓN GENERAL                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ • Nombre del Restaurante                          │  │
│  │ • Moneda (MXN, USD, EUR, COP, ARS, CLP)           │  │
│  │ • IVA (%)                                         │  │
│  │ • Formato de Fecha (DD/MM/AAAA, MM/DD/AAAA, ...)│  │
│  │ • Dirección del Restaurante [0/200 chars]        │  │
│  │ • Teléfono del Restaurante                        │  │
│  │                                                    │  │
│  │         [Guardar Configuración General]            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  2. 📦 CONFIGURACIÓN DE INVENTARIO                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ • Stock Mínimo Global                             │  │
│  │ • Alerta de Stock Bajo (Sí/No)                   │  │
│  │ • Unidad de Medida (Unidades, Kg, g, L, mL)      │  │
│  │ • Categoría Predeterminada [Dropdown dinámico]   │  │
│  │ ☐ Habilitar control de caducidad                 │  │
│  │ ☐ Enviar notificaciones automáticas              │  │
│  │                                                    │  │
│  │      [Guardar Configuración de Inventario]         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  3. 🔔 CONFIGURACIÓN DE NOTIFICACIONES                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ • Email para Notificaciones                       │  │
│  │                                                    │  │
│  │ Tipos de Notificaciones:                          │  │
│  │ ☑ Stock bajo                                      │  │
│  │ ☑ Stock agotado                                   │  │
│  │ ☐ Productos próximos a caducar                   │  │
│  │ ☐ Pedidos pendientes                             │  │
│  │ ☐ Reportes automáticos                           │  │
│  │ ☐ Actividad de usuarios                          │  │
│  │                                                    │  │
│  │ • Frecuencia de Reportes (Diario/Semanal/...)    │  │
│  │ • Hora de Envío (09:00)                          │  │
│  │                                                    │  │
│  │    [Guardar Configuración de Notificaciones]       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  4. 🔒 CONFIGURACIÓN DE SEGURIDAD                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ • Tiempo de Sesión (minutos): 30                  │  │
│  │   "Tiempo de inactividad antes de cerrar sesión" │  │
│  │                                                    │  │
│  │ • Intentos Fallidos Permitidos: 3                 │  │
│  │   "Antes de bloquear la cuenta"                   │  │
│  │                                                    │  │
│  │ ☐ Requerir confirmación para acciones críticas   │  │
│  │ ☑ Mantener registro de actividad de usuarios     │  │
│  │ ☐ Realizar copias de seguridad automáticas       │  │
│  │                                                    │  │
│  │      [Guardar Configuración de Seguridad]          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  5. 🛠️  MANTENIMIENTO DEL SISTEMA                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Copia de Seguridad                                │  │
│  │ "Realice una copia de seguridad de todos los     │  │
│  │  datos del sistema."                              │  │
│  │           [💾 Generar Copia de Seguridad]         │  │
│  │                                                    │  │
│  │ Restaurar Sistema                                 │  │
│  │ "Restaurar el sistema desde una copia de         │  │
│  │  seguridad anterior."                             │  │
│  │ [Elegir archivo...]                               │  │
│  │           [🔄 Restaurar desde Archivo]            │  │
│  │                                                    │  │
│  │ ⚠️  Zona de Peligro                               │  │
│  │ "Estas acciones no se pueden deshacer."           │  │
│  │           [⚠️  Restablecer Sistema]               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│             MODAL DE CONFIRMACIÓN (Hidden)               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Confirmar acción                                │    │
│  │                                                   │    │
│  │  ¿Está seguro de que desea realizar esta        │    │
│  │  acción?                                         │    │
│  │                                                   │    │
│  │         [Cancelar]  [Aceptar]                    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │  HTTP   │              │  SQL    │              │
│   Frontend   ├────────>│   Backend    ├────────>│   Database   │
│ (JavaScript) │<────────┤   (Django)   │<────────┤ (SQL Server) │
│              │  JSON   │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │                        │                        │
       v                        v                        v
  
  ConfiguracionManager    ConfiguracionSistemaViewSet    ConfiguracionSistema
  - loadConfiguracion()   - list() → singleton           - nombre_restaurante
  - populateForms()       - create() → update existing   - moneda
  - handleSubmit()        - permissions: IsAdmin         - iva
  - loadCategorias()                                     - formato_fecha
  - showNotification()                                   - ... (28+ fields)
```

## Key Features

### 1. Singleton Pattern
- Only ONE configuration object exists in the database
- API always returns/updates the same configuration
- No need to manage multiple configuration instances

### 2. Field Mapping
- Frontend uses camelCase: `nombreRestaurante`
- Backend uses snake_case: `nombre_restaurante`
- JavaScript handles both automatically for API compatibility

### 3. Dynamic Category Loading
- Categories fetched from `/api/categorias/` on page load
- Populates dropdown for default category selection
- Updates when categories are added/removed

### 4. Character Counter
- Real-time character count for address field (0/200)
- Updates as user types
- Visual feedback for length limits

### 5. Modal Confirmations
- Critical actions require user confirmation
- Modal properly closes after acceptance
- Prevents accidental data loss

### 6. Responsive Notifications
- Success/error messages displayed at top of page
- Auto-dismiss after 5 seconds
- Can be manually closed

## Security Features

✅ JWT Authentication required for all operations
✅ Admin/SuperUser permissions enforced
✅ Input validation on both frontend and backend
✅ SQL injection protection via Django ORM
✅ XSS protection via proper data escaping
✅ CSRF protection via Django middleware

## Browser Compatibility

The configuration page uses vanilla JavaScript (ES6+) and works on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (responsive design)

## Performance Considerations

- Configuration loaded once on page load
- Categories cached after first load
- Forms submit only changed data
- Minimal DOM manipulation
- No heavy libraries/frameworks required
