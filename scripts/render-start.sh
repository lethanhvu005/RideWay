#!/bin/sh
set -eu
# Use a direct Neon URL for migrations; pooled runtime URLs are optional.
if [ -n "${DATABASE_DIRECT_URL:-}" ]; then
  DATABASE_URL="$DATABASE_DIRECT_URL" python backend/wait_for_database.py
  DATABASE_URL="$DATABASE_DIRECT_URL" python backend/manage.py migrate --noinput
else
  python backend/wait_for_database.py
  python backend/manage.py migrate --noinput
fi
exec gunicorn --chdir backend backend.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --workers "${WEB_CONCURRENCY:-2}" --threads 2 --timeout 90 --access-logfile - --error-logfile -
