param(
    [string]$ProjectDir = "C:\ruta\del\proyecto\backend",
    [int]$Port = 8000,
    [switch]$EnableScheduler
)

# Script simple para servir la app Django con Waitress en Windows.
# Requisitos: Python 3.x, entorno virtual, requisitos instalados.
# Uso (PowerShell):
#   .\run_waitress.ps1 -ProjectDir "C:\proyecto\backend" -Port 8000 -EnableScheduler

if (-not (Test-Path $ProjectDir)) {
    Write-Error "ProjectDir no existe: $ProjectDir"; exit 1
}

$venvActivate = Join-Path $ProjectDir ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    Push-Location $ProjectDir
    python -m venv .venv
    Pop-Location
}

. $venvActivate

# Instala dependencias si faltan
Push-Location (Split-Path $ProjectDir -Parent)
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) { Write-Error "pip no disponible"; exit 1 }
Write-Host "Instalando dependencias (si faltan)..." -ForegroundColor Yellow
pip install -r requirements.txt | Out-Null
pip show waitress | Out-Null; if ($LASTEXITCODE -ne 0) { pip install waitress | Out-Null }
Pop-Location

# Variables de entorno
$env:DJANGO_SETTINGS_MODULE = "backend.settings"
if (-not $EnableScheduler) {
    $env:DISABLE_SCHEDULER = "1"
    Write-Host "Scheduler desactivado en este proceso." -ForegroundColor Yellow
} else {
    if (Test-Path Env:\DISABLE_SCHEDULER) { Remove-Item Env:\DISABLE_SCHEDULER }
}

# Arranca Waitress
Push-Location $ProjectDir
Write-Host "Levantando Waitress en puerto $Port..." -ForegroundColor Green
waitress-serve --listen=0.0.0.0:$Port backend.wsgi:application
Pop-Location
