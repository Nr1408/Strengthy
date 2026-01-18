#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Our Django manage.py lives in backend/strenghty_backend/
cd "${SCRIPT_DIR}/strenghty_backend"

echo "[entrypoint] Running database migrations..."
echo "[entrypoint] Waiting for DB and running migrations..."
MAX_TRIES=10
SLEEP_SECONDS=5
i=1
until python manage.py migrate --noinput; do
	if [ $i -ge $MAX_TRIES ]; then
		echo "[entrypoint] migrations failed after $i attempts, exiting"
		exit 1
	fi
	echo "[entrypoint] migrate failed, retrying in ${SLEEP_SECONDS}s ($i/${MAX_TRIES})"
	i=$((i+1))
	sleep $SLEEP_SECONDS
done

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput || echo "[entrypoint] collectstatic failed or no storage configured"

echo "[entrypoint] Starting gunicorn"
exec gunicorn strenghty_backend.wsgi --bind 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS:-2}
