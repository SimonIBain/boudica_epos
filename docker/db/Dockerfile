# pgvector/pgvector:pg16 is the official postgres:16 image + the pgvector extension,
# needed because code/sql/setup.sql does `CREATE EXTENSION IF NOT EXISTS vector`
# (unused by any query today, but the schema file requires it to be installable).
FROM pgvector/pgvector:pg16

RUN apt-get update && apt-get install -y --no-install-recommends gettext-base \
    && rm -rf /var/lib/apt/lists/*

COPY docker/sql/init.sh /docker-entrypoint-initdb.d/00-init.sh
COPY docker/sql/*.sql.template /docker-entrypoint-initdb.d/templates/
RUN chmod +x /docker-entrypoint-initdb.d/00-init.sh
