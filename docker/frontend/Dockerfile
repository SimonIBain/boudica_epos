# Serves both static frontends (till + web store) behind one nginx origin, proxying
# /cgi-bin/ to the backend container so both frontends' relative-path API calls just work.
FROM nginx:1.27-alpine

COPY code/web_store/ /usr/share/nginx/html/web_store/
COPY code/web/ /usr/share/nginx/html/till/

# Both frontends used to hardcode an absolute https://demo.pgbc.ai (web_store) or
# http://localhost (till forecasting tab) origin instead of the relative /cgi-bin/...
# path used everywhere else — silently pointing a local instance at the live public
# demo server. Previously patched here at image-build time only; both are now fixed
# in the tracked source itself (see CODE_VERIFIED_AUDIT.md §7.6/§8/§12), so this
# build-time patch is gone too — nothing left for it to match.

COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
