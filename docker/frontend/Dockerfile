# Serves both static frontends (till + web store) behind one nginx origin, proxying
# /cgi-bin/ to the backend container so both frontends' relative-path API calls just work.
FROM nginx:1.27-alpine

COPY code/web_store/ /usr/share/nginx/html/web_store/
COPY code/web/ /usr/share/nginx/html/till/

# A handful of pages hardcode an absolute https://demo.pgbc.ai (or, for the till's
# forecasting tab, http://localhost) origin instead of the relative /cgi-bin/... path used
# everywhere else in the same codebase — that would otherwise silently point a local test
# instance at the live public demo server. Rewritten to relative paths so everything talks
# to this container's own backend. See CODE_VERIFIED_AUDIT.md section 3.13/§4 for the
# underlying bug reports; this patch is applied only at image build time, not to the
# tracked source in code/web(_store).
RUN grep -rl 'https://demo.pgbc.ai' /usr/share/nginx/html/web_store | \
        xargs -r sed -i 's#https://demo\.pgbc\.ai##g' && \
    grep -rl 'http://localhost/cgi-bin' /usr/share/nginx/html/till | \
        xargs -r sed -i 's#http://localhost/cgi-bin#/cgi-bin#g'

COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
