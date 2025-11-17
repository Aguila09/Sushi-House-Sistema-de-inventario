from django.db import connection

cursor = connection.cursor()
try:
    cursor.execute("DELETE FROM django_migrations WHERE app='inventario'")
    print('Deleted migration records for app inventario.')
except Exception as e:
    print('Error deleting migration records:', e)

try:
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
    tables = [r[0] for r in cursor.fetchall() if r[0].startswith('inventario_')]
    print('Existing inventario tables before drop:', tables)
    for t in tables:
        try:
            cursor.execute(f"DROP TABLE {t}")
            print('Dropped table:', t)
        except Exception as e:
            print('Failed to drop', t, '->', e)
except Exception as e:
    print('Error listing/dropping tables:', e)

print('Purge script finished.')
