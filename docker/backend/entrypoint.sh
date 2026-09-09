#!/bin/bash
set -euo pipefail

: "${DB_HOST:=db}"
: "${DB_PORT:=5432}"
: "${STORE_DB_PASSWORD:=local_dev_store_password}"
: "${ADMIN_USERNAME:=admin}"
: "${ADMIN_PASSWORD:=AdminPassword123!}"
: "${STRIPE_SECRET_KEY:=}"
: "${BOUDICA_HOST:=localhost}"
: "${BOUDICA_PORT:=80}"
: "${BOUDICA_API_KEY:=}"

export DB_HOST DB_PORT STORE_DB_PASSWORD ADMIN_USERNAME ADMIN_PASSWORD STRIPE_SECRET_KEY BOUDICA_HOST BOUDICA_PORT BOUDICA_API_KEY

echo "Waiting for postgres at ${DB_HOST}:${DB_PORT}..."
for i in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/${DB_HOST}/${DB_PORT}") 2>/dev/null; then
        exec 3>&- 3<&-
        break
    fi
    sleep 1
done

envsubst < /etc/boudica_pos.conf.template > /usr/lib/cgi-bin/boudica_pos.conf
chmod 644 /usr/lib/cgi-bin/boudica_pos.conf

echo "Config written to /usr/lib/cgi-bin/boudica_pos.conf:"
sed -E 's/(password|key) .+/\1 ***redacted***/' /usr/lib/cgi-bin/boudica_pos.conf

exec apache2ctl -D FOREGROUND
