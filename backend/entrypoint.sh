#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput || echo "[entrypoint] migrate failed or no DB access yet"

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput || echo "[entrypoint] collectstatic failed or no storage configured"

echo "[entrypoint] Starting gunicorn"
exec gunicorn strenghty_backend.wsgi --chdir strenghty_backend --bind 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS:-2}
