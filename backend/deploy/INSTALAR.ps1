# ============================================================
# INSTALADOR AUTOMÁTICO - Sistema de Inventario Sushi House
# ============================================================
# Este script configura todo el sistema automáticamente.
# Solo necesitas ejecutarlo con clic derecho > "Ejecutar con PowerShell"

param(
    [string]$DBHost = "localhost",
    [string]$DBPort = "1433",
    [string]$DBUser = "sa",
    [string]$DBPassword = "",
    [string]$AdminUsername = "admin",
    [string]$AdminEmail = "admin@sushihouse.com",
    [string]$AdminPassword = ""
)

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR - Sistema de Inventario Sushi House" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Detectar ruta del proyecto
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

if (-not (Test-Path $BackendDir)) {
    Write-Host "ERROR: No se encontró la carpeta 'backend'. Asegúrate de ejecutar este script desde la carpeta 'deploy'." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# PASO 1: Verificar Python
Write-Host "[1/7] Verificando Python..." -ForegroundColor Yellow
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "ERROR: Python no está instalado o no está en PATH." -ForegroundColor Red
    Write-Host "Descarga Python desde: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Asegúrate de marcar 'Add Python to PATH' durante la instalación." -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}
$pythonVersion = python --version
Write-Host "  ✓ Python encontrado: $pythonVersion" -ForegroundColor Green

# PASO 2: Crear entorno virtual
Write-Host ""
Write-Host "[2/7] Creando entorno virtual..." -ForegroundColor Yellow
$VenvDir = Join-Path $BackendDir ".venv"
if (-not (Test-Path $VenvDir)) {
    Push-Location $BackendDir
    python -m venv .venv
    Pop-Location
    Write-Host "  ✓ Entorno virtual creado" -ForegroundColor Green
} else {
    Write-Host "  ✓ Entorno virtual ya existe" -ForegroundColor Green
}

# PASO 3: Activar entorno e instalar dependencias
Write-Host ""
Write-Host "[3/7] Instalando dependencias..." -ForegroundColor Yellow
Write-Host "  (Esto puede tomar varios minutos...)" -ForegroundColor Gray

$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
. $ActivateScript

Push-Location (Split-Path $BackendDir -Parent)
pip install -q --upgrade pip
pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la instalación de dependencias." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}
Pop-Location
Write-Host "  ✓ Dependencias instaladas" -ForegroundColor Green

# PASO 4: Configurar base de datos
Write-Host ""
Write-Host "[4/7] Configurando conexión a base de datos..." -ForegroundColor Yellow

if ([string]::IsNullOrWhiteSpace($DBPassword)) {
    $DBPasswordSecure = Read-Host "Ingresa la contraseña de SQL Server (usuario '$DBUser')" -AsSecureString
    $DBPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPasswordSecure))
}

# Generar SECRET_KEY aleatorio
$SecretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})

$EnvFile = Join-Path $BackendDir ".env"
$EnvContent = @"
# Configuración generada automáticamente
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_TIME_ZONE=America/Mexico_City
DJANGO_PAGE_SIZE=50
SECRET_KEY=$SecretKey

# Base de datos SQL Server
DB_ENGINE=mssql
DB_NAME=SushiHouse
DB_HOST=$DBHost
DB_PORT=$DBPort
DB_USER=$DBUser
DB_PASSWORD=$DBPassword
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_EXTRA_PARAMS=TrustServerCertificate=yes

# CORS/CSRF
CORS_ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# JWT
SIMPLE_JWT_ACCESS_MINUTES=60
SIMPLE_JWT_REFRESH_DAYS=7

# Backups
BACKUP_SCHEDULE_HOUR=3
BACKUP_SCHEDULE_MINUTE=0
BACKUPS_MAX_FILES=30

# Throttling
DRF_THROTTLE_USER=1000/day
DRF_THROTTLE_ANON=500/day
DRF_THROTTLE_AUTH=20/min

# Seguridad (desarrollo)
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_SESSION_COOKIE_SECURE=False
DJANGO_CSRF_COOKIE_SECURE=False

# Logging
DJANGO_LOG_LEVEL=INFO

# Scheduler
DISABLE_SCHEDULER=0
"@

$EnvContent | Out-File -FilePath $EnvFile -Encoding utf8 -Force
Write-Host "  ✓ Archivo .env creado" -ForegroundColor Green

# PASO 5: Aplicar migraciones
Write-Host ""
Write-Host "[5/7] Creando tablas en la base de datos..." -ForegroundColor Yellow
Write-Host "  (Asegúrate de que SQL Server esté corriendo y la base 'SushiHouse' exista)" -ForegroundColor Gray

Push-Location $BackendDir
python manage.py migrate --noinput 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la migración de base de datos." -ForegroundColor Red
    Write-Host "Verifica que SQL Server esté corriendo y que ejecutaste el script 'crear_base_datos.sql'" -ForegroundColor Yellow
    Pop-Location
    Read-Host "Presiona Enter para salir"
    exit 1
}
Pop-Location
Write-Host "  ✓ Tablas creadas exitosamente" -ForegroundColor Green

# PASO 6: Crear datos iniciales
Write-Host ""
Write-Host "[6/7] Creando datos iniciales..." -ForegroundColor Yellow
Push-Location $BackendDir
python manage.py seed_initial_data 2>&1 | Out-Null
Pop-Location
Write-Host "  ✓ Configuración y datos de ejemplo creados" -ForegroundColor Green

# PASO 7: Crear usuario administrador
Write-Host ""
Write-Host "[7/7] Creando usuario administrador..." -ForegroundColor Yellow

if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    $AdminPasswordSecure = Read-Host "Ingresa la contraseña para el administrador '$AdminUsername'" -AsSecureString
    $AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPasswordSecure))
}

Push-Location $BackendDir
$CreateAdminScript = @"
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from inventario.models import Usuario
if not Usuario.objects.filter(usuario='$AdminUsername').exists():
    admin = Usuario.objects.create_superuser(
        usuario='$AdminUsername',
        email='$AdminEmail',
        password='$AdminPassword',
        nombre='Administrador',
        apellido='Sistema',
        rol='admin'
    )
    print('Administrador creado')
else:
    print('El administrador ya existe')
"@

$CreateAdminScript | python - 2>&1 | Out-Null
Pop-Location
Write-Host "  ✓ Usuario administrador creado" -ForegroundColor Green

# RESUMEN FINAL
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ¡INSTALACIÓN COMPLETADA!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales del administrador:" -ForegroundColor Cyan
Write-Host "  Usuario:    $AdminUsername" -ForegroundColor White
Write-Host "  Contraseña: (la que ingresaste)" -ForegroundColor White
Write-Host ""
Write-Host "Para iniciar el sistema:" -ForegroundColor Cyan
Write-Host "  1. Abre PowerShell en la carpeta:" -ForegroundColor White
Write-Host "     $BackendDir" -ForegroundColor Gray
Write-Host "  2. Ejecuta:" -ForegroundColor White
Write-Host "     .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "     python manage.py runserver" -ForegroundColor Gray
Write-Host "  3. Abre tu navegador en:" -ForegroundColor White
Write-Host "     http://localhost:8000" -ForegroundColor Gray
Write-Host ""
Write-Host "Para usar el instalador rápido de servidor:" -ForegroundColor Cyan
Write-Host "  .\deploy\windows\run_waitress.ps1 -ProjectDir '$BackendDir'" -ForegroundColor Gray
Write-Host ""

Read-Host "Presiona Enter para salir"
