# 📦 LÉEME PRIMERO - Sistema de Inventario Sushi House

## ¡Bienvenido!

Este es tu Sistema de Inventario completo y listo para usar.

---

## 🎯 Inicio Rápido (3 pasos)

### PASO 1: Instala los requisitos
- **Python 3.11+** → https://www.python.org/downloads/
  - ⚠️ Marca "Add Python to PATH" durante instalación
- **SQL Server Express** → https://www.microsoft.com/sql-server/sql-server-downloads
  - Elige "Express" → Instalación "Basic"
- **Azure Data Studio** → https://aka.ms/azuredatastudio
  - Para ejecutar scripts SQL fácilmente

### PASO 2: Crea la base de datos
1. Abre **Azure Data Studio**
2. Conecta a tu servidor (por defecto: `localhost\SQLEXPRESS`)
3. Abre el archivo: `backend\deploy\database\crear_base_datos.sql`
4. Presiona F5 o clic en "Ejecutar"

### PASO 3: Instala el sistema
1. Haz clic derecho sobre: `backend\deploy\INSTALAR.ps1`
2. Selecciona **"Ejecutar con PowerShell"**
3. Sigue las instrucciones en pantalla
4. ¡Listo!

---

## 📖 Documentación Completa

- **`MANUAL_INSTALACION.md`** ← LEE ESTE ARCHIVO para instalación paso a paso sin tecnicismos
- **`README.md`** ← Documentación técnica completa
- **`RELEASE_NOTES.md`** ← Características y cambios de esta versión

---

## 🚀 Iniciar el Sistema

### Después de instalar:

**Opción 1 - Servidor de desarrollo:**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```
Abre: http://localhost:8000

**Opción 2 - Servidor estable (recomendado):**
```powershell
cd backend\deploy\windows
.\run_waitress.ps1 -ProjectDir "C:\ruta\donde\instalaste\backend"
```
Abre: http://localhost:8000

---

## 👤 Acceso Inicial

- **Usuario:** `admin` (o el que creaste durante instalación)
- **Contraseña:** (la que ingresaste durante instalación)

---

## 📁 Estructura del Paquete

```
SushiHouse-v1.0.0/
├── backend/
│   ├── deploy/
│   │   ├── INSTALAR.ps1           ← Instalador automático
│   │   ├── database/
│   │   │   └── crear_base_datos.sql  ← Script SQL
│   │   └── windows/
│   │       ├── run_waitress.ps1   ← Servidor estable
│   │       └── setup_backup_task.ps1  ← Backups automáticos
│   ├── inventario/                ← Código de la aplicación
│   ├── requirements.txt           ← Dependencias
│   └── .env.example               ← Plantilla configuración
├── frontend/                      ← Interfaz web
├── MANUAL_INSTALACION.md          ← ⭐ LEE ESTO PRIMERO
├── README.md                      ← Documentación técnica
└── RELEASE_NOTES.md               ← Notas de versión
```

---

## ✨ Características Principales

✅ Gestión completa de productos, categorías y proveedores  
✅ Control de usuarios con roles (Admin, Operativo, Consulta)  
✅ Backups automáticos programables  
✅ Restauración de datos  
✅ Reportes e inventario en tiempo real  
✅ Alertas de stock bajo  
✅ Auditoría de cambios  
✅ API REST con autenticación JWT  

---

## 🆘 ¿Problemas?

1. **Revisa `MANUAL_INSTALACION.md`** → Sección "Solución de Problemas"
2. **Contacto de soporte:** [añade tu email/teléfono aquí]

---

## 🔒 Seguridad

- Cambia la contraseña del admin después del primer acceso
- Haz backups semanales (botón en Configuración)
- Guarda los backups en un disco externo

---

**v1.0.0 - Noviembre 2025**  
Sistema de Inventario Sushi House  
Desarrollado por [Tu Nombre/Empresa]
