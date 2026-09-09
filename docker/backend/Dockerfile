# Boudica POS backend — builds the C++20 CGI binary (code/back_end/src) and
# serves it via Apache's cgi-bin, matching the CGI protocol main.cpp expects
# (QUERY_STRING / CONTENT_LENGTH / stdin, headers written by the program itself).
FROM debian:12

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        pkg-config \
        libpq-dev \
        libcurl4-openssl-dev \
        libssl-dev \
        libcrypto++-dev \
        nlohmann-json3-dev \
        apache2 \
        gettext-base \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Apache CGI setup: Debian's apache2 package ships serve-cgi-bin.conf which
# ScriptAliases /cgi-bin/ -> /usr/lib/cgi-bin/ with +ExecCGI already — main.cpp's
# own conf lookup even hardcodes /usr/lib/cgi-bin/boudica_pos.conf as a fallback path.
RUN a2enmod cgid && a2enconf serve-cgi-bin

WORKDIR /build
COPY code/back_end/ /build/

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j"$(nproc)" \
    && install -m 0755 src/boudica_pos /usr/lib/cgi-bin/boudica_pos \
    && rm -rf /build

COPY docker/backend/boudica_pos.conf.template /etc/boudica_pos.conf.template
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
# Uses real credentials (not just "does Apache answer") since every command now requires
# them — this genuinely exercises auth + the DB round trip, not just process liveness.
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=10 \
    CMD curl -sf "http://localhost/cgi-bin/boudica_pos?command=getsupplierlist&username=admin&password=AdminPassword123!" -o /dev/null || exit 1
ENTRYPOINT ["/entrypoint.sh"]
