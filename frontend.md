Aquí hay un resumen de los archivos frontend y sus funcionalidades:

Archivos HTML

index.html

- Página principal del dashboard
- Contiene la estructura básica de navegación
- Muestra estadísticas generales del sistema
- Menú de navegación principal
- Perfil de usuario en el header

productos.html

- Gestión de productos del inventario
- Tabla para listar productos
- Formularios para crear/editar productos
- Muestra información como precio, stock y categoría

categorias.html

- Gestión de categorías de productos
- Lista de categorías existentes
- Formularios para crear/editar categorías

proveedores.html

- Gestión de proveedores
- Lista de proveedores
- Formularios para registrar/editar proveedores
- usuarios.html
- Gestión de usuarios del sistema
- Lista de usuarios registrados
- Formularios para crear/editar usuarios

reportes.html

- Visualización de reportes y estadísticas
- Dashboard con métricas importantes
- Productos más vendidos
- Valor total del inventario

configuracion.html

- Configuración general del sistema
- Formularios para ajustes del sistema
- Opciones de backup y restauración
- Configuración de notificaciones

login.html
- Página de inicio de sesión del sistema
- Contiene los siguientes elementos principales:
    - Formulario de login con:
        - Campo para nombre de usuario/email
        - Campo para contraseña
        - Botón de inicio de sesión
    - Logo de Sushi House
    - Mensaje de bienvenida
    - Enlaces para:
        - Recuperar contraseña
        - Registrar nuevo usuario (si está permitido)
    - Validaciones del formulario
    - Manejo de errores de autenticación
    - Redirección al dashboard después del login exitoso

Archivos CSS

styles.css

- Estilos principales de la aplicación
- Definición de colores, tipografía y layout
- Estilos de componentes reutilizables

loading.css

- Estilos para pantallas y animaciones de carga
- Spinners y estados de loading

Archivos JavaScript

script.js

- Clase principal SushiHouseApp
- Manejo de inicialización del sistema
- Funciones para renderizar dashboard
- Manejo de datos y tablas

auth.js

- Manejo de autenticación
- Login/logout
- Gestión de sesiones

storage.js

- Gestión del almacenamiento local
- Manejo de datos en localStorage/sessionStorage

validation.js

- Validación de formularios
- Reglas de validación
- Mensajes de error

- usuarios.js

- Lógica específica para gestión de usuarios
- CRUD de usuarios
- Permisos y roles

- proveedores.js

- Lógica específica para gestión de proveedores
- CRUD de proveedores

configuracion.js

- Clase ConfiguracionManager
- Manejo de configuraciones del sistema
- Backup y restauración
- Configuración de notificaciones

La arquitectura frontend está organizada por:

- Páginas HTML para cada módulo principal
- Estilos CSS separados por funcionalidad
- JavaScript modular con clases específicas
- Separación de responsabilidades entre archivos

## Conexiones y Relaciones entre Archivos

### Jerarquía Principal
- `index.html` actúa como el contenedor principal después del login
- Todos los archivos HTML comparten `styles.css` para mantener consistencia visual
- `script.js` contiene la clase principal que inicializa la aplicación

### Flujo de Autenticación
1. `login.html` ↔ `auth.js`
   - Maneja el proceso de login
   - Utiliza `validation.js` para validar formularios
   - Al autenticar exitosamente, redirige a `index.html`

### Dependencias de Archivos HTML
- Todas las páginas HTML dependen de:
  - `styles.css` (estilos globales)
  - `loading.css` (animaciones de carga)
  - `auth.js` (verificación de sesión)
  - `storage.js` (manejo de datos)

### Módulos Específicos
1. `productos.html`:
   - Utiliza `script.js` para gestión de datos
   - Se conecta con `categorias.html` para asignación de categorías
   - Usa `proveedores.js` para información de proveedores

2. `usuarios.html`:
   - Depende de `usuarios.js` para CRUD
   - Utiliza `auth.js` para manejo de permisos
   - Conecta con `configuracion.js` para roles

3. `reportes.html`:
   - Obtiene datos de `storage.js`
   - Usa datos de `productos.html` y `proveedores.html`
   - Se conecta con `script.js` para procesamiento

4. `configuracion.html`:
   - Utiliza `configuracion.js` como controlador principal
   - Se conecta con `storage.js` para backup/restauración
   - Interactúa con todos los módulos para ajustes globales

### Flujo de Datos
1. Almacenamiento:
   - `storage.js` es utilizado por todos los módulos
   - Mantiene sincronización entre páginas
   - Gestiona caché y persistencia

2. Validaciones:
   - `validation.js` es usado en todos los formularios
   - Proporciona reglas consistentes
   - Se integra con mensajes de error

### Interacciones JavaScript
- `script.js` ↔ Módulos específicos
  - Coordina operaciones entre módulos
  - Maneja eventos globales
  - Gestiona estado de la aplicación

- `auth.js` ↔ Todos los módulos
  - Verifica permisos
  - Mantiene sesión activa
  - Controla acceso a funcionalidades

### Estructura de Dependencias
```
login.html
   ├── auth.js
   ├── validation.js
   └── styles.css

index.html
   ├── script.js
   ├── auth.js
   ├── storage.js
   ├── styles.css
   └── loading.css

módulos/*.html
   ├── script.js
   ├── módulo-específico.js
   ├── storage.js
   ├── validation.js
   ├── styles.css
   └── loading.css
```

Esta arquitectura asegura:
- Modularidad y reutilización de código
- Separación clara de responsabilidades
- Mantenimiento simplificado
- Escalabilidad del sistema