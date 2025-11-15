# Página de Configuración - Sushi House

## Descripción General
La página de configuración permite a los administradores del sistema personalizar diversos aspectos del sistema de inventario de Sushi House.

## Funcionalidades Implementadas

### 1. Configuración General
- **Nombre del Restaurante**: Personalización del nombre del establecimiento
- **Moneda**: Selección de la moneda para precios (MXN, USD, EUR, COP, ARS, CLP)
- **IVA (%)**: Configuración del porcentaje de IVA aplicable
- **Formato de Fecha**: Selección del formato de fecha (DD/MM/AAAA, MM/DD/AAAA, AAAA-MM-DD)
- **Dirección del Restaurante**: Ubicación física del establecimiento
- **Teléfono del Restaurante**: Número de contacto

### 2. Configuración de Inventario
- **Stock Mínimo Global**: Valor predeterminado de stock mínimo para nuevos productos
- **Alerta de Stock Bajo**: Activar/desactivar alertas de stock bajo
- **Unidad de Medida Predeterminada**: Unidad por defecto para productos (Unidades, Kg, g, L, mL)
- **Categoría Predeterminada**: Categoría asignada automáticamente a nuevos productos
- **Control de Caducidad**: Habilitar seguimiento de fechas de vencimiento
- **Notificaciones Automáticas**: Envío automático de alertas de stock

### 3. Configuración de Notificaciones
- **Email para Notificaciones**: Dirección de correo para recibir alertas
- **Tipos de Notificaciones**:
  - Stock bajo
  - Stock agotado
  - Productos próximos a caducar
  - Pedidos pendientes
  - Reportes automáticos
  - Actividad de usuarios
- **Frecuencia de Reportes**: Diario, Semanal, Mensual, Ninguno
- **Hora de Envío**: Hora preferida para recibir notificaciones

### 4. Configuración de Seguridad
- **Tiempo de Sesión**: Minutos de inactividad antes de cerrar sesión automáticamente
- **Intentos Fallidos Permitidos**: Número de intentos antes de bloquear cuenta
- **Requerir Confirmación**: Solicitar confirmación para acciones críticas
- **Registro de Actividad**: Mantener historial de acciones de usuarios
- **Backup Automático**: Realizar copias de seguridad automáticas

### 5. Mantenimiento del Sistema
- **Generar Copia de Seguridad**: Exportar todos los datos del sistema en formato JSON
- **Restaurar Sistema**: Importar datos desde una copia de seguridad
- **Restablecer Sistema**: Eliminar todos los datos (acción irreversible)

## Implementación Técnica

### Backend (Django)
- **Modelo**: `ConfiguracionSistema` en `inventario/models.py`
- **Serializer**: `ConfiguracionSistemaSerializer` en `inventario/serializers.py`
- **ViewSet**: `ConfiguracionSistemaViewSet` en `inventario/views.py`
- **Endpoint API**: `/api/configuracion/`
- **Migración**: `0002_update_configuracionsistema.py`

### Frontend
- **HTML**: `frontend/configuracion.html`
- **JavaScript**: `frontend/js/configuracion.js`
- **CSS**: `frontend/css/styles.css`

### Patrón Singleton
El sistema utiliza un patrón singleton para la configuración - solo existe una instancia de ConfiguracionSistema en la base de datos. El ViewSet maneja automáticamente este comportamiento:
- GET `/api/configuracion/` retorna la configuración única
- POST `/api/configuracion/` actualiza la configuración existente o crea una nueva si no existe

## Flujo de Datos

1. **Carga Inicial**: 
   - La página carga la configuración desde la API
   - Si falla, usa configuración local como fallback
   - Carga las categorías disponibles para el selector

2. **Actualización**:
   - Los formularios envían datos a la API
   - La API valida y guarda en la base de datos
   - La configuración local se actualiza
   - Se muestra notificación de éxito/error

3. **Validación**:
   - Validación de campos requeridos en frontend
   - Validación de tipos de datos (números, emails)
   - Validación de rangos (IVA 0-100, tiempo de sesión 5-480 min)

## Permisos
- Solo usuarios con rol de **Admin** o **Super User** pueden modificar la configuración
- Usuarios con roles de consulta pueden ver pero no editar

## Consideraciones de Seguridad
- Todas las operaciones requieren autenticación JWT
- Las acciones críticas pueden requerir confirmación adicional
- Las contraseñas nunca se exponen en la configuración
- Los backups contienen datos sensibles y deben manejarse con cuidado
