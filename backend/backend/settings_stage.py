# settings_stage.py
from .settings import *  # noqa
import os

# Use SQLite file-based DB for staging validation
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db_stage.sqlite3'),
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

# Allow all origins in local staging validation
CORS_ALLOW_ALL_ORIGINS = True

# Reduce logging noise
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'WARNING'},
}
