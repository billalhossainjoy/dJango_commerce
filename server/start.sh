#!/bin/sh
set -eu

python manage.py collectstatic --noinput
exec python run_services.py
