/**
 * Shared, same-origin backend access for the whole storefront.
 *
 * Every public page (home, cart, checkout, order history, receipts) used to
 * carry its own copy of a hardcoded `web_store_user`/`web_store_pass` literal
 * and send it, in the clear, in a GET query string, to an external demo host
 * (`https://demo.pgbc.ai`) on every single request. This module is the one
 * place that credential lives now: it logs in once per browser session (via
 * boudica_pos's real session-token flow, CODE_VERIFIED_AUDIT.md §8), caches
 * the token, and every other page just calls `apiCall()`.
 *
 * This does NOT remove the password from public JS entirely — an anonymous
 * shopper has to be able to browse before any real login exists, and this
 * site has no server of its own to hide it behind (a deliberate choice for
 * this pass, see CODE_VERIFIED_AUDIT.md §12 — the kiosk's Node-backed
 * approach was considered and declined for the storefront). What changes:
 * the password is sent once per session instead of on every request, it's
 * POSTed instead of sitting in a URL, it never leaves this origin, and the
 * token — not the password — is what every subsequent call actually uses.
 */

const BACKEND = '/cgi-bin/boudica_pos';
const SERVICE_USERNAME = 'web_store_user';
const SERVICE_PASSWORD = 'web_store_pass';
const TOKEN_KEY = 'web_store_session_token';

let loginPromise = null;

async function login() {
    const body = new URLSearchParams({ command: 'login', username: SERVICE_USERNAME, password: SERVICE_PASSWORD });
    const res = await fetch(BACKEND, { method: 'POST', body });
    const data = await res.json();
    if (!data.token) {
        throw new Error(data.error || 'Could not start a store session.');
    }
    sessionStorage.setItem(TOKEN_KEY, data.token);
    return data.token;
}

async function getToken(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = sessionStorage.getItem(TOKEN_KEY);
        if (cached) { return cached; }
    }
    if (!loginPromise || forceRefresh) {
        loginPromise = login();
    }
    return loginPromise;
}

/**
 * Calls a boudica_pos backend command with the shared session token, retrying
 * once with a fresh token if the current one was rejected (expired/revoked).
 * @param {string} command
 * @param {Object<string, string>} [params] extra command-specific fields
 * @returns {Promise<any>} the parsed JSON response
 */
export async function apiCall(command, params = {}) {
    let token = await getToken();
    let res = await fetch(BACKEND, { method: 'POST', body: new URLSearchParams({ command, token, ...params }) });
    let data = await res.json();
    if (data.error && /token/i.test(data.error)) {
        token = await getToken(true);
        res = await fetch(BACKEND, { method: 'POST', body: new URLSearchParams({ command, token, ...params }) });
        data = await res.json();
    }
    return data;
}

/**
 * Escapes text for safe insertion into innerHTML. Every product description,
 * customer-typed value, or AI-generated string rendered into the page must go
 * through this — see CODE_VERIFIED_AUDIT.md §12's stored-XSS findings.
 */
export function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value === null || value === undefined ? '' : String(value);
    return div.innerHTML;
}
