#!/bin/bash
set -euo pipefail

: "${STORE_DB_PASSWORD:=local_dev_store_password}"
: "${ADMIN_PASSWORD:=AdminPassword123!}"
: "${WEB_STORE_PASSWORD:=web_store_pass}"

export STORE_DB_PASSWORD ADMIN_PASSWORD WEB_STORE_PASSWORD

for f in /docker-entrypoint-initdb.d/templates/*.sql.template; do
    echo "Applying $(basename "$f")..."
    envsubst < "$f" | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
done
