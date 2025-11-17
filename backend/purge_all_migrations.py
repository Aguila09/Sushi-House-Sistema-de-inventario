from django.db import connection

PREFIXES = ("auth_", "django_", "admin_", "inventario_", "sessions")

cursor = connection.cursor()
print("--- PURGE START ---")
# Delete all migration records
try:
    cursor.execute("DELETE FROM django_migrations")
    print("Deleted ALL rows from django_migrations.")
except Exception as e:
    print("Error deleting django_migrations rows:", e)

# Collect tables
try:
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
    tables = [r[0] for r in cursor.fetchall()]
except Exception as e:
    print("Error listing tables:", e)
    tables = []

# Filter tables to drop
to_drop = [t for t in tables if t.startswith(PREFIXES)]
print("Tables considered for drop:", to_drop)

for t in to_drop:
    try:
        cursor.execute(f"DROP TABLE {t}")
        print("Dropped:", t)
    except Exception as e:
        print("Failed to drop", t, "->", e)

print("--- PURGE END ---")
