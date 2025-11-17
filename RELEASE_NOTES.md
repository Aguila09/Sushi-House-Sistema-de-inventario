# Sushi House – Sistema de Inventario

## v1.0.0 — Entrega inicial (2025-11-16)

Entrega lista para cliente con backend Django + DRF, frontend HTML/JS, backups automáticos, restauración, permisos reforzados, pruebas básicas y documentación completa.

---

## Cambios principales

- Backups automáticos
  - APScheduler (cron diario configurable por env); poda automática por `BACKUPS_MAX_FILES`.
  - Utilidad central `inventario/backup_utils.py` (genera JSON; guarda en `backend/backups/`).
  - Comando `run_backup_now` y `enable_backup_soon`.
- Restauración y mantenimiento
  - `POST /api/restore/` (solo configuración por defecto; inventario completo opcional por bandera `restaurar_inventario=true`).
  - Comando `restore_from_file --path <json> [--inventario] [--usuario <admin>]` (ahora autentica internamente para pasar permisos).
  - `POST /api/system/reset/` (solo admin).
- Seguridad y autenticación
  - JWT (SimpleJWT); login bloquea si `usuario.activo = false`.
  - Endpoints críticos marcados admin-only (`IsAdminOnly`).
  - Throttling: límites por usuario/anónimo y scope `auth` para login (`DRF_THROTTLE_*`).
  - Flags de seguridad de producción configurables por env (SSL redirect, cookies seguras, HSTS).
- UI/Frontend
  - Botón de backup con confirmación y ayuda en `configuracion.html`.
  - Elementos de seguridad/mantenimiento ocultos a no-admin via `data-role="admin"`.
- Operación y DX
  - `.env.example` con todas las variables reales usadas por settings.
  - `STATIC_ROOT` y guía de `collectstatic` en README.
  - Seed inicial: `seed_initial_data` (categorías/proveedor/productos ejemplo).
  - Settings de prueba y staging: `backend/backend/settings_test.py` (SQLite memoria) y `settings_stage.py` (SQLite archivo).
- Pruebas
  - Smoke tests mínimos: login de inactivo (bloqueo), backup admin-only, restore (config), reset inventario.
  - Ejecución: `DJANGO_SETTINGS_MODULE=backend.settings_test python manage.py test -v 2`.
- Documentación
  - README completo: arquitectura, endpoints, seguridad, backups, pruebas, guía producción y validación en staging.

---

## Validación realizada

- Tests automáticos (SQLite memoria): OK.
- Ciclo en staging (SQLite archivo):
  - `migrate` → `seed_initial_data` → `run_backup_now` → `restore_from_file --inventario --usuario <admin>`.
  - Verificado: conteos (3 categorías, 1 proveedor, 3 productos) y config aplicada.

---

## Variables de entorno relevantes (resumen)

- Django: `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_TIME_ZONE`, `DJANGO_PAGE_SIZE`, `SECRET_KEY`.
- Base de datos MSSQL: `DB_ENGINE`, `DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DRIVER`, `DB_EXTRA_PARAMS`.
- JWT: `SIMPLE_JWT_ACCESS_MINUTES`, `SIMPLE_JWT_REFRESH_DAYS`.
- Backups: `BACKUP_SCHEDULE_HOUR`, `BACKUP_SCHEDULE_MINUTE`, `BACKUPS_MAX_FILES`.
- Throttling: `DRF_THROTTLE_USER`, `DRF_THROTTLE_ANON`, `DRF_THROTTLE_AUTH`.
- Seguridad Prod: `DJANGO_SECURE_SSL_REDIRECT`, `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_CSRF_COOKIE_SECURE`, `DJANGO_HSTS_*`.
- Scheduler: `DISABLE_SCHEDULER` (permite desactivar en tests/multi-proceso).

> Ver `backend/.env.example` para la lista completa y valores sugeridos.

---

## Pasos de despliegue (resumen)

1) Preparar variables `.env` en `backend/`:
- `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS=<dominio>`
- Configurar MSSQL y `SECRET_KEY` fuerte

2) Migrar y crear admin:
```
cd backend
python manage.py migrate
python manage.py createsuperuser
```

3) Recopilar estáticos (si aplica):
```
python manage.py collectstatic --noinput
```

4) Ejecutar WSGI y proxy inverso (ejemplo Linux):
- Gunicorn: `gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3`
- Nginx: `proxy_pass http://127.0.0.1:8000;` y servir `/static/` desde `staticfiles/`

5) Scheduler de backups:
- Activar por env y asegurar proceso único por despliegue (p. ej., solo en un worker/pod).

---

## Recomendaciones finales

- Habilitar HTTPS + HSTS en producción.
- Ajustar throttling de login según riesgo.
- Configurar almacenamiento externo y/o cifrado para backups.
- Monitoreo de errores (Sentry) y alertas si falla el job de backup.
- Mantener roles y campo `activo` correctamente gestionados en administración.

---

## Conformidad de entrega

- Código probado en entorno local.
- Documentación de instalación y operación incluida en README.
- Validación del ciclo de backup/restore realizada y reproducible.

Contacto: Equipo de desarrollo Sushi House — Sistema de Inventario.
