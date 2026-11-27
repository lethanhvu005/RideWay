"""Wait briefly for the database compute to become available at container startup."""
import os
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()
from django.db import connections, OperationalError

for attempt in range(30):
    try:
        connections['default'].ensure_connection()
        connections['default'].close()
        break
    except OperationalError:
        if attempt == 29:
            raise SystemExit('Database is unavailable. Check DATABASE_URL and network access.')
        print('Waiting for database...', flush=True)
        time.sleep(2)
