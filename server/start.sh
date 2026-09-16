#!/bin/sh
set -eu

python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --bind "[::]:${PORT:-8080}" --workers 2 --access-logfile - --error-logfile -
