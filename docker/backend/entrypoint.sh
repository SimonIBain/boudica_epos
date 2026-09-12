#!/bin/bash
set -euo pipefail

: "${DB_HOST:=db}"
: "${DB_PORT:=5432}"
: "${STORE_DB_PASSWORD:=local_dev_store_password}"
: "${ADMIN_USERNAME:=admin}"
: "${ADMIN_PASSWORD:=AdminPassword123!}"
: "${STRIPE_SECRET_KEY:=}"
: "${STRIPE_PUBLISHABLE_KEY:=}"
: "${BOUDICA_HOST:=localhost}"
: "${BOUDICA_PORT:=80}"
: "${BOUDICA_API_KEY:=}"
# Comma-separated exact origins (scheme+host+port, e.g. https://shop.example.com) allowed
# to make cross-origin calls to this backend — reflected back in Access-Control-Allow-Origin
# instead of a bare wildcard (CODE_VERIFIED_AUDIT.md §3.8/§5/§6.2). Empty by default: the
# till and web store both reach the backend same-origin through this compose stack's own
# nginx proxy, so no CORS header is even consulted locally. A production deployment where
# the public web store is tunneled back to this backend needs its real origin listed here.
: "${ALLOWED_ORIGINS:=}"
# Empty defaults here (main.cpp's getpublicconfig falls back to the same
# http://localhost:8001/... default this always hardcoded, and "Boudica POS") — set these
# for a real deployment instead of leaving the till showing generic/local placeholder
# branding and a printer URL that only works if the Star WebPRNT service happens to be on
# the same machine as the browser (CODE_VERIFIED_AUDIT.md §10; was previously hardcoded in
# code/web/scripts/printer.js as "Curiosity Cabin"/thecuriositycabins.com, a leftover from
# a specific prior deployment).
: "${STAR_PRINTER_URL:=}"
: "${STORE_NAME:=}"
: "${STORE_WEBSITE:=}"

export DB_HOST DB_PORT STORE_DB_PASSWORD ADMIN_USERNAME ADMIN_PASSWORD STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY BOUDICA_HOST BOUDICA_PORT BOUDICA_API_KEY ALLOWED_ORIGINS STAR_PRINTER_URL STORE_NAME STORE_WEBSITE

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

# addinvoice's file-attachment upload (processUpload(), main.cpp) writes here. Must be
# writable by www-data (the account Apache's CGI workers run as, not root) and outside
# /usr/lib/cgi-bin/ itself, which www-data has no write access to.
mkdir -p /var/lib/boudica_pos/uploads
chown -R www-data:www-data /var/lib/boudica_pos

echo "Config written to /usr/lib/cgi-bin/boudica_pos.conf:"
sed -E 's/(password|key) .+/\1 ***redacted***/' /usr/lib/cgi-bin/boudica_pos.conf

exec apache2ctl -D FOREGROUND
