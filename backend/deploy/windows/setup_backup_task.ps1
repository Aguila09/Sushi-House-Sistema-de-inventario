param(
    [string]$ProjectDir = "C:\ruta\del\proyecto\backend",
    [string]$PythonPath = "",
    [string]$TaskName = "SushiHouse-Backup-Diario",
    [int]$Hour = 3,
    [int]$Minute = 0,
    [switch]$RunOnLogon
)

# Configura una tarea programada en Windows para ejecutar `python manage.py run_backup_now`
# Uso rápido (PowerShell como Administrador):
#   .\setup_backup_task.ps1 -ProjectDir "C:\proyecto\backend" -Hour 3 -Minute 0
#   (Opcional) -RunOnLogon para disparar también al iniciar sesión

if (-not (Test-Path $ProjectDir)) {
    Write-Error "ProjectDir no existe: $ProjectDir"; exit 1
}

if ([string]::IsNullOrWhiteSpace($PythonPath)) {
    $PythonPath = Join-Path $ProjectDir ".venv\Scripts\python.exe"
}

if (-not (Test-Path $PythonPath)) {
    Write-Error "Python no encontrado en: $PythonPath. Crea el venv e instala dependencias."; exit 1
}

$timeStr = "{0:D2}:{1:D2}" -f $Hour, $Minute
$action = New-ScheduledTaskAction -Execute $PythonPath -Argument "manage.py run_backup_now" -WorkingDirectory $ProjectDir

if ($RunOnLogon) {
    $trigger1 = New-ScheduledTaskTrigger -AtLogOn
    $trigger2 = New-ScheduledTaskTrigger -Daily -At $timeStr
    $triggers = @($trigger1, $trigger2)
} else {
    $triggers = @(New-ScheduledTaskTrigger -Daily -At $timeStr)
}

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -Compatibility Win8
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description "Backup diario de Sushi House (Django)" -Force | Out-Null
    Write-Host "Tarea programada creada/actualizada: $TaskName" -ForegroundColor Green
    Write-Host "Se ejecutará diariamente a las $timeStr."
    if ($RunOnLogon) { Write-Host "También se ejecutará al iniciar sesión." }
} catch {
    Write-Error $_
    Write-Host "Si requiere ejecutar en segundo plano sin sesión, registre la tarea con credenciales en el Programador de tareas." -ForegroundColor Yellow
}
