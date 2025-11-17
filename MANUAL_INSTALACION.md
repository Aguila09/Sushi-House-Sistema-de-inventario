# Manual de Instalación y Uso - Sistema de Inventario Sushi House

## Para el Cliente

Este manual te guiará paso a paso para instalar y usar el sistema **sin necesidad de conocimientos técnicos**.

---

## 📦 PASO 1: Requisitos Previos

Antes de instalar, necesitas tener instalado en tu computadora:

### 1.1. Python (Lenguaje de programación)
- **Descargar desde:** https://www.python.org/downloads/
- **Versión recomendada:** Python 3.11 o superior
- **Durante la instalación:**
  - ✅ **MUY IMPORTANTE:** Marca la casilla **"Add Python to PATH"**
  - Haz clic en "Install Now"

### 1.2. SQL Server (Base de datos)
Tienes dos opciones:

**Opción A: SQL Server Express (Gratis, recomendado para empresas pequeñas)**
- Descargar desde: https://www.microsoft.com/es-mx/sql-server/sql-server-downloads
- Selecciona "Express" y descarga
- Durante instalación, elige "Basic"
- **Anota el nombre del servidor** que aparezca al final (ejemplo: `localhost\SQLEXPRESS`)

**Opción B: SQL Server completo** (si ya lo tienes)
- Asegúrate de conocer:
  - Nombre del servidor (ejemplo: `localhost` o IP del servidor)
  - Usuario (por defecto: `sa`)
  - Contraseña del usuario

### 1.3. Herramienta para ejecutar scripts SQL
Descarga **Azure Data Studio** (gratis y fácil de usar):
- https://aka.ms/azuredatastudio
- Instalar con opciones por defecto

---

## 🚀 PASO 2: Instalación del Sistema

### 2.1. Descomprimir el archivo
1. Haz clic derecho sobre `SushiHouse-v1.0.0.zip`
2. Selecciona "Extraer todo..."
3. Elige una ubicación fácil de recordar (ejemplo: `C:\SushiHouse`)

### 2.2. Crear la base de datos
1. Abre **Azure Data Studio**
2. Conecta a tu servidor SQL:
   - Servidor: `localhost\SQLEXPRESS` (o el nombre que anotaste)
   - Autenticación: SQL Login
   - Usuario: `sa`
   - Contraseña: (la que configuraste)
   - Clic en "Conectar"

3. Abre el script de base de datos:
   - Menú: Archivo → Abrir archivo
   - Busca: `C:\SushiHouse\backend\deploy\database\crear_base_datos.sql`
   - Clic en **"Ejecutar"** (botón verde o F5)
   - Deberías ver: "Base de datos SushiHouse creada exitosamente"

### 2.3. Ejecutar el instalador automático
1. Abre la carpeta donde descomprimiste el sistema
2. Navega a: `backend\deploy\`
3. Haz clic derecho sobre `INSTALAR.ps1`
4. Selecciona **"Ejecutar con PowerShell"**

5. El instalador te pedirá:
   - **Contraseña de SQL Server:** (la del usuario `sa`)
   - **Contraseña para el administrador:** (crea una contraseña para entrar al sistema)

6. Espera mientras el instalador:
   - ✓ Instala componentes necesarios
   - ✓ Configura la conexión a la base de datos
   - ✓ Crea las tablas
   - ✓ Crea datos iniciales
   - ✓ Crea tu usuario administrador

7. Al finalizar verás: **"¡INSTALACIÓN COMPLETADA!"**

---

## 💻 PASO 3: Iniciar el Sistema

### Opción A: Inicio rápido (para desarrollo/pruebas)

1. Abre PowerShell:
   - Presiona `Windows + R`
   - Escribe: `powershell`
   - Presiona Enter

2. Navega a la carpeta del sistema:
   ```powershell
   cd C:\SushiHouse\backend
   ```

3. Activa el entorno:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

4. Inicia el servidor:
   ```powershell
   python manage.py runserver
   ```

5. Abre tu navegador en: **http://localhost:8000**

### Opción B: Servidor estable (recomendado para uso diario)

1. Abre PowerShell como **Administrador**:
   - Busca "PowerShell" en el menú inicio
   - Clic derecho → "Ejecutar como administrador"

2. Navega a la carpeta de scripts:
   ```powershell
   cd C:\SushiHouse\backend\deploy\windows
   ```

3. Ejecuta el servidor:
   ```powershell
   .\run_waitress.ps1 -ProjectDir "C:\SushiHouse\backend" -Port 8000
   ```

4. Abre tu navegador en: **http://localhost:8000**

**NOTA:** El servidor se queda corriendo. Para detenerlo, presiona `Ctrl + C` en la ventana de PowerShell.

---

## 👤 PASO 4: Primer Acceso

### 4.1. Iniciar sesión
1. En tu navegador, ve a: **http://localhost:8000**
2. Se mostrará la pantalla de inicio de sesión
3. Ingresa:
   - **Usuario:** `admin` (o el que configuraste)
   - **Contraseña:** (la que ingresaste durante la instalación)
4. Clic en **"Iniciar Sesión"**

### 4.2. Pantalla principal
Verás el dashboard con:
- Total de productos
- Total de categorías
- Total de proveedores
- Productos con stock bajo

---

## 📚 PASO 5: Usar el Sistema

### 5.1. Gestión de Categorías
1. En el menú lateral, clic en **"Categorías"**
2. Para crear una nueva:
   - Clic en **"Nueva Categoría"**
   - Ingresa el nombre
   - Clic en **"Guardar"**
3. Para editar: clic en el ícono de lápiz
4. Para eliminar: clic en el ícono de basura

### 5.2. Gestión de Proveedores
1. En el menú lateral, clic en **"Proveedores"**
2. Clic en **"Nuevo Proveedor"**
3. Completa los datos:
   - Nombre
   - Contacto
   - Teléfono
   - Email
   - Dirección
4. Clic en **"Guardar"**

### 5.3. Gestión de Productos
1. En el menú lateral, clic en **"Productos"**
2. Clic en **"Nuevo Producto"**
3. Completa:
   - Nombre del producto
   - Código (único)
   - Categoría (selecciona de la lista)
   - Proveedor (selecciona de la lista)
   - Precio de compra
   - Precio de venta
   - Stock actual
   - Stock mínimo (para alertas)
   - Unidad de medida
   - Ubicación en almacén
4. Clic en **"Guardar"**

### 5.4. Gestión de Usuarios
**Solo disponible para administradores**

1. En el menú lateral, clic en **"Usuarios"**
2. Clic en **"Nuevo Usuario"**
3. Completa los datos:
   - Usuario (nombre de inicio de sesión)
   - Email
   - Nombre y apellido
   - Contraseña
   - **Rol:** Selecciona uno:
     - **Administrador:** Acceso total
     - **Operativo:** Puede ver y editar productos/proveedores
     - **Consulta:** Solo puede ver información
   - **Activo:** Marca esta casilla para permitir el acceso
4. Clic en **"Guardar"**

**IMPORTANTE:** Si desmarcas "Activo", el usuario no podrá iniciar sesión.

### 5.5. Reportes
1. En el menú lateral, clic en **"Reportes"**
2. Selecciona el tipo de reporte:
   - Productos con stock bajo
   - Valor total del inventario
   - Productos por categoría
   - Productos por proveedor
3. Ajusta los filtros si necesario
4. Clic en **"Generar Reporte"**
5. Puedes exportar a PDF o Excel (si configurado)

### 5.6. Configuración del Sistema
**Solo disponible para administradores**

1. En el menú lateral, clic en **"Configuración"**
2. Puedes ajustar:
   - Nombre del restaurante
   - Dirección
   - Teléfono
   - Email de notificaciones
   - Stock mínimo global (alerta cuando un producto baja de este nivel)

3. **Generar Backup:**
   - En la sección "Seguridad y Mantenimiento"
   - Clic en **"Generar Backup"**
   - Confirma la acción
   - El sistema creará una copia de seguridad en `backend\backups\`

---

## 🔒 PASO 6: Backups Automáticos (Opcional)

Si quieres que el sistema haga backups automáticos todos los días:

1. Abre PowerShell como **Administrador**
2. Navega a:
   ```powershell
   cd C:\SushiHouse\backend\deploy\windows
   ```
3. Ejecuta:
   ```powershell
   .\setup_backup_task.ps1 -ProjectDir "C:\SushiHouse\backend" -Hour 3 -Minute 0
   ```
   (Esto hará un backup todos los días a las 3:00 AM)

4. Verás: "Tarea programada creada/actualizada"

Los backups se guardarán en: `C:\SushiHouse\backend\backups\`

---

## 🆘 Solución de Problemas Comunes

### Error: "Python no está instalado"
- Descarga Python desde https://www.python.org/downloads/
- Durante la instalación, marca **"Add Python to PATH"**
- Reinicia tu computadora

### Error: "No se puede conectar a la base de datos"
- Verifica que SQL Server esté corriendo:
  - Abre "Servicios" (Busca en el menú inicio)
  - Busca "SQL Server (SQLEXPRESS)"
  - Si está detenido, clic derecho → Iniciar

- Verifica usuario y contraseña en `backend\.env`

### Error: "El servidor no inicia"
- Asegúrate de que el puerto 8000 no esté en uso
- Intenta con otro puerto: `python manage.py runserver 8080`
- Luego abre: http://localhost:8080

### No puedo iniciar sesión
- Verifica que el usuario esté marcado como "Activo"
- Si olvidaste la contraseña del admin:
  1. Abre PowerShell en `C:\SushiHouse\backend`
  2. Activa el entorno: `.\.venv\Scripts\Activate.ps1`
  3. Ejecuta: `python crear_superusuario.py`

---

## 📞 Soporte Técnico

Si tienes problemas con la instalación o uso del sistema:

- **Email:** [tu-email]
- **Teléfono:** [tu-teléfono]
- **Horario de soporte:** [horario]

---

## 📝 Notas Importantes

1. **Haz backups regulares:** Usa el botón "Generar Backup" semanalmente
2. **Guarda los backups en otro disco:** Copia la carpeta `backend\backups\` a un USB o disco externo
3. **Cambia las contraseñas:** Especialmente la del usuario `admin` después del primer uso
4. **No compartas credenciales:** Crea usuarios individuales para cada persona

---

**¡Listo! Ya puedes usar tu Sistema de Inventario Sushi House** 🍣
