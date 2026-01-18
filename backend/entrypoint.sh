#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Our Django manage.py lives in backend/strenghty_backend/
cd "${SCRIPT_DIR}/strenghty_backend"

echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput || echo "[entrypoint] migrate failed or no DB access yet"

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput || echo "[entrypoint] collectstatic failed or no storage configured"

echo "[entrypoint] Starting gunicorn"
exec gunicorn strenghty_backend.wsgi --bind 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS:-2}
