const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = 3000;

// ---- Deployment-specific config — all read from the environment, never hardcoded. ----

// Boudica's real chat endpoint (see CODE_VERIFIED_AUDIT.md §0.4/reference_boudica_slm_inference):
// served at /api/boudica/chat, not /boudica/api/chat.
const BOUDICA_ENDPOINT = process.env.BOUDICA_ENDPOINT || 'http://192.168.0.131/api/boudica/chat';
const BOUDICA_API_KEY = process.env.BOUDICA_API_KEY || '';
const BOUDICA_USER_ID = process.env.BOUDICA_USER_ID || 'boudica-kiosk';
const BOUDICA_USER_EMAIL = process.env.BOUDICA_USER_EMAIL || 'kiosk@localhost';

// The boudica_pos backend this kiosk reads live stock/price data from — a read-only
// service account (seeded as `kiosk_user`, see docker/sql/02-seed-users.sql.template)
// logs in via the same session-token flow the till uses (CODE_VERIFIED_AUDIT.md §8).
const POS_API_BASE = process.env.POS_API_BASE || 'http://192.168.0.131:8080';
const POS_USERNAME = process.env.POS_KIOSK_USERNAME || 'kiosk_user';
const POS_PASSWORD = process.env.POS_KIOSK_PASSWORD || '';

const ADMIN_USER = process.env.KIOSK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KIOSK_ADMIN_PASSWORD || '';

if (!ADMIN_PASSWORD) {
    console.warn('WARNING: KIOSK_ADMIN_PASSWORD is not set — the branding editor is disabled until it is configured.');
}
if (!BOUDICA_API_KEY) {
    console.warn('WARNING: BOUDICA_API_KEY is not set — the customer AI chat box will not work until it is configured.');
}
if (!POS_PASSWORD) {
    console.warn('WARNING: POS_KIOSK_PASSWORD is not set — the stock browser will not work until it is configured.');
}

app.use(express.json({ limit: '1mb' }));

const storageDir = path.join(__dirname, 'public', 'storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const BRANDING_FILE = path.join(storageDir, 'branding.json');
const DEFAULT_BRANDING = {
    storeName: 'Our Store',
    tagline: '',
    primaryColor: '#25214e',
    accentColor: '#b8860b',
    logoUrl: '',
    welcomeMessage: "Hi! Ask me about anything we stock, or a project you're working on."
};

function readBranding() {
    try {
        const raw = fs.readFileSync(BRANDING_FILE, 'utf8');
        return { ...DEFAULT_BRANDING, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_BRANDING };
    }
}

function timingSafeEqualStr(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA); // constant-time even on length mismatch
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Gate for the branding editor (admin.html) and everything that changes it —
 * the public kiosk view, catalog, and chat stay open, since that's what
 * customers are meant to use.
 */
function requireAdminAuth(req, res, next) {
    if (!ADMIN_PASSWORD) {
        return res.status(503).send('Kiosk admin is not configured. Set KIOSK_ADMIN_PASSWORD.');
    }
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const sepIndex = decoded.indexOf(':');
        const user = sepIndex >= 0 ? decoded.slice(0, sepIndex) : decoded;
        const pass = sepIndex >= 0 ? decoded.slice(sepIndex + 1) : '';
        if (timingSafeEqualStr(user, ADMIN_USER) && timingSafeEqualStr(pass, ADMIN_PASSWORD)) {
            return next();
        }
    }
    res.set('WWW-Authenticate', 'Basic realm="Kiosk Admin"');
    return res.status(401).send('Authentication required.');
}

app.get('/admin.html', requireAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---- Branding: a short guided form, not a drag-and-drop page builder — the whole ----
// ---- point is a shop owner with no design skill can set this up themselves.     ----

app.get('/api/branding', (req, res) => {
    res.json(readBranding());
});

app.post('/api/branding', requireAdminAuth, (req, res) => {
    const current = readBranding();
    const hexColor = /^#[0-9a-fA-F]{6}$/;
    const next = {
        storeName: typeof req.body.storeName === 'string' ? req.body.storeName.slice(0, 80) : current.storeName,
        tagline: typeof req.body.tagline === 'string' ? req.body.tagline.slice(0, 140) : current.tagline,
        primaryColor: hexColor.test(req.body.primaryColor) ? req.body.primaryColor : current.primaryColor,
        accentColor: hexColor.test(req.body.accentColor) ? req.body.accentColor : current.accentColor,
        welcomeMessage: typeof req.body.welcomeMessage === 'string' ? req.body.welcomeMessage.slice(0, 300) : current.welcomeMessage,
        logoUrl: current.logoUrl
    };
    fs.writeFile(BRANDING_FILE, JSON.stringify(next, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Failed to save branding.' });
        }
        res.json({ status: 'success', branding: next });
    });
});

const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new Error('Logo must be a PNG, JPEG, WebP, or SVG image.'), ok);
    }
});

app.post('/api/branding/logo', requireAdminAuth, (req, res) => {
    logoUpload.single('logo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: 'error', message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No logo file uploaded.' });
        }
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' }[req.file.mimetype];
        const fileName = `logo.${ext}`;
        fs.writeFile(path.join(storageDir, fileName), req.file.buffer, (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ status: 'error', message: 'Failed to save logo.' });
            }
            const current = readBranding();
            current.logoUrl = `/storage/${fileName}?v=${Date.now()}`;
            fs.writeFile(BRANDING_FILE, JSON.stringify(current, null, 2), (saveErr) => {
                if (saveErr) {
                    return res.status(500).json({ status: 'error', message: 'Failed to save branding.' });
                }
                res.json({ status: 'success', branding: current });
            });
        });
    });
});

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// ---- Live stock/price/availability, proxied from the real boudica_pos backend. ----

let posSession = { token: '', expiresAt: 0 };

async function getPosToken(forceRefresh = false) {
    if (!POS_PASSWORD) {
        throw new Error('POS_KIOSK_PASSWORD not configured');
    }
    if (!forceRefresh && posSession.token && Date.now() < posSession.expiresAt) {
        return posSession.token;
    }
    const params = new URLSearchParams({ command: 'login', username: POS_USERNAME, password: POS_PASSWORD });
    const response = await fetch(`${POS_API_BASE}/cgi-bin/boudica_pos`, { method: 'POST', body: params });
    const data = await response.json();
    if (!data.token) {
        throw new Error(data.error || 'Kiosk could not log in to the POS backend');
    }
    posSession = {
        token: data.token,
        // Refresh a little early rather than exactly at expiry.
        expiresAt: Date.now() + (Math.max((data.expires_in_seconds || 0) - 60, 60)) * 1000
    };
    return posSession.token;
}

async function callPosCatalog(q, page, limit) {
    let token = await getPosToken();
    const params = new URLSearchParams({ command: 'getcatalog', token, page: String(page || 1), limit: String(limit || 24) });
    if (q) { params.set('q', q); }
    let response = await fetch(`${POS_API_BASE}/cgi-bin/boudica_pos?${params.toString()}`);
    let data = await response.json();
    if (data.error) {
        // Token may have been revoked/expired server-side — retry once with a fresh login.
        token = await getPosToken(true);
        params.set('token', token);
        response = await fetch(`${POS_API_BASE}/cgi-bin/boudica_pos?${params.toString()}`);
        data = await response.json();
    }
    return data;
}

app.get('/api/catalog', async (req, res) => {
    try {
        const data = await callPosCatalog(req.query.q, Number(req.query.page) || 1, Number(req.query.limit) || 24);
        if (data.error) {
            return res.status(502).json({ error: data.error });
        }
        res.json(data);
    } catch (err) {
        console.error('Catalog lookup failed:', err.message);
        res.status(503).json({ error: 'Stock information is temporarily unavailable.' });
    }
});

// ---- AI-assisted "smart search": for questions a keyword search can't answer     ----
// ---- ("what would suit a craft teddy bear?"), ask Boudica to pick from real      ----
// ---- stock instead of guessing. Layered on top of the fast search, not          ----
// ---- replacing it — only used when the fast path finds nothing.                 ----

const MAX_SMART_SEARCH_CANDIDATES = 150;

/**
 * Pulls the first page(s) of the full catalog as a candidate pool for the AI to
 * choose from. A small shop's whole catalog fits in one or two pages; a larger
 * one is only partially represented — a known limitation, not chased further
 * here (flagged in project_boudica_kiosk_review memory).
 */
async function fetchCandidatePool(maxItems) {
    const pageSize = 100;
    const first = await callPosCatalog('', 1, pageSize);
    if (first.error || !Array.isArray(first.products)) { return []; }
    const products = first.products.slice();
    const total = Math.min(first.total || products.length, maxItems);
    for (let page = 2; products.length < total && products.length < maxItems; page++) {
        const next = await callPosCatalog('', page, pageSize);
        if (next.error || !Array.isArray(next.products) || next.products.length === 0) { break; }
        products.push(...next.products);
    }
    return products.slice(0, maxItems);
}

/** Tolerates the model wrapping its JSON in prose or a markdown code fence. */
function parseLooseJsonObject(text) {
    if (typeof text !== 'string') { return null; }
    try { return JSON.parse(text); } catch { /* fall through */ }
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        try { return JSON.parse(match[0]); } catch { /* give up below */ }
    }
    return null;
}

/**
 * Asks Boudica to pick relevant barcodes out of a real candidate list, given the
 * customer's own words. Sent as a file attachment, not inline in the message —
 * inline embedded JSON gets ignored/misread here (confirmed live: the model
 * claimed "the customer's question is missing" with the exact same data inline),
 * the same "doesn't trust embedded text" issue CODE_VERIFIED_AUDIT.md §7.7 hit
 * for stockanalysis/salesanalysis, fixed there the same way. use_rag is off and
 * "No Rag. No Memory." is prepended (matching call_boudica_with_data() in
 * main.cpp) — this is a structured internal pick-from-this-list task, not the
 * customer-facing grounded chat, so it shouldn't be distracted by RAG documents.
 */
async function askBoudicaToPickProducts(query, candidates) {
    if (!BOUDICA_API_KEY || candidates.length === 0) { return null; }

    const compact = candidates.map(p => ({
        barcode: p.barcode, description: p.description, color: p.color,
        type: p.type, price: p.price, availability: p.availability
    }));

    const form = new FormData();
    form.append('message',
        'No Rag. No Memory. A customer asked: "' + query + '". The attached file lists our ' +
        'current stock as a JSON array (barcode, description, color, type, price, availability). ' +
        'Pick which barcodes from that file would help answer the customer, most relevant first, ' +
        'up to 8. Reply with ONLY a JSON object shaped exactly like ' +
        '{"items": ["barcode1", "barcode2"], "note": "a short one-sentence explanation"} ' +
        'and nothing else before or after it. Use an empty items array if nothing fits.'
    );
    form.append('use_rag', 'false');
    // Explicit field, not just the "No Rag. No Memory." phrase above — belt-and-braces
    // against the same memory-leak class fixed in §12.7/§12.8.
    form.append('disable_memory', 'true');
    // Generous budget: the model's chain-of-thought (hidden from the customer, but
    // still counted against max_tokens) can run long when reasoning over a dozen-plus
    // candidates — too low a cap truncates mid-JSON before the final answer even
    // starts (confirmed live: 400 cut off at `{"items": ["`  with 7 candidates).
    form.append('max_tokens', '1500');
    form.append('file', new Blob([JSON.stringify(compact)], { type: 'application/json' }), 'stock_data.json');

    const response = await fetch(BOUDICA_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${BOUDICA_API_KEY}` },
        body: form
    });
    if (!response.ok) { throw new Error(`Boudica returned ${response.status}`); }
    const data = await response.json();
    const parsed = parseLooseJsonObject(data.response);
    if (!parsed || !Array.isArray(parsed.items)) {
        console.warn('Smart search: could not parse a product list out of Boudica\'s reply:', data.response);
        return null;
    }

    const byBarcode = new Map(candidates.map(p => [p.barcode, p]));
    const products = parsed.items.map(b => byBarcode.get(b)).filter(Boolean).slice(0, 8);
    return { products, note: typeof parsed.note === 'string' ? parsed.note : '' };
}

app.get('/api/smart-search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
        return res.status(400).json({ error: 'A search query is required.' });
    }

    try {
        // Fast path: the real getcatalog search (AND-across-words, OR-across-fields —
        // see CODE_VERIFIED_AUDIT.md §11) already handles most "do you have X" questions
        // and structured queries like "blue aran 4 ply" with no AI cost or latency.
        const direct = await callPosCatalog(q, 1, 12);
        if (!direct.error && Array.isArray(direct.products) && direct.products.length > 0) {
            return res.json({ mode: 'direct', products: direct.products, note: '' });
        }

        // Fallback: a genuinely conceptual question ("what would suit a craft teddy
        // bear?") that no keyword match will ever answer — ask Boudica to reason over
        // the real candidate pool instead.
        const candidates = await fetchCandidatePool(MAX_SMART_SEARCH_CANDIDATES);
        const ai = await askBoudicaToPickProducts(q, candidates);
        if (ai && ai.products.length > 0) {
            return res.json({ mode: 'ai', products: ai.products, note: ai.note });
        }
        return res.json({ mode: 'none', products: [], note: '' });
    } catch (err) {
        console.error('Smart search failed:', err.message);
        res.status(503).json({ error: 'Search is temporarily unavailable.' });
    }
});

// ---- Boudica AI chat, grounded in real stock matches for the customer's question. ----

const CHAT_STOPWORDS = new Set([
    'the', 'a', 'an', 'do', 'you', 'have', 'any', 'is', 'are', 'in', 'stock', 'how',
    'much', 'it', 'for', 'and', 'or', 'to', 'of', 'on', 'with', 'what', 'can', 'i',
    'me', 'my', 'we', 'your', 'please', 'there', 'does', 'they', 'them', 'this',
    'that', 'these', 'those', 'get', 'got', 'need', 'want', 'looking', 'some', 'more'
]);

function extractKeywords(message) {
    return message
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !CHAT_STOPWORDS.has(w));
}

/**
 * getcatalog only does a single substring ILIKE, not a phrase search — a whole
 * customer sentence ("do you have any wool in stock?") never substring-matches a
 * product description ("Demo Wool Aran 400g"). Try the full message first (covers
 * an exact multi-word product name/barcode), then fall back to individual
 * significant words, merging/deduping by barcode.
 */
async function findCatalogMatches(message, maxResults) {
    const terms = [message.trim(), ...extractKeywords(message)].filter(Boolean).slice(0, 5);
    const seen = new Map();
    for (const term of terms) {
        if (seen.size >= maxResults) break;
        const result = await callPosCatalog(term, 1, maxResults);
        for (const p of (result.products || [])) {
            if (!seen.has(p.barcode)) { seen.set(p.barcode, p); }
        }
    }
    return Array.from(seen.values()).slice(0, maxResults);
}

app.post('/boudica/api/chat', async (req, res) => {
    if (!BOUDICA_API_KEY) {
        return res.status(503).json({ error: 'Boudica API key not configured (set BOUDICA_API_KEY).' });
    }
    const userMessage = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!userMessage) {
        return res.status(400).json({ error: 'A non-empty message is required.' });
    }

    // Best-effort: look up products matching the customer's own words and hand Boudica
    // the real price/stock for anything that matches, so stock questions get accurate
    // answers instead of the model guessing. Never blocks the chat if this fails.
    let augmentedMessage = userMessage;
    try {
        const matches = await findCatalogMatches(userMessage, 5);
        if (matches.length > 0) {
            const lines = matches.map(p =>
                `- ${p.description}${p.color ? ' (' + p.color + ')' : ''}: £${p.price.toFixed(2)}, ${p.availability.replace('_', ' ')}`
            );
            augmentedMessage = `Customer question: ${userMessage}\n\nMatching items currently in our store:\n${lines.join('\n')}\n\nAnswer the customer's question naturally and briefly. Only mention the store items above if they're actually relevant to the question.`;
        }
    } catch (err) {
        console.warn('Catalog grounding skipped (stock lookup failed):', err.message);
    }

    // Real Boudica /chat field is "message", not "prompt" (§0.4). RAG stays on
    // deliberately here — unlike the reporting endpoints (§7.7), this is genuine
    // customer Q&A meant to be grounded in the shop's own RAG corpus (workshops,
    // project guides, etc.), on top of the live stock match above.
    //
    // disable_memory: true (§12.7/§12.8) — separate from use_rag/RAG (a knowledge-base
    // lookup, kept on above), this suppresses Boudica's personal-memory-assistant
    // features (conversation recall/search/recommendations/bookmarks/analytics). This
    // kiosk shares one BOUDICA_USER_ID/EMAIL across every customer who walks up to the
    // terminal — without this, one customer's wording could trip a memory-recall
    // heuristic and surface a *previous* customer's conversation. Confirmed live for
    // the web store's equivalent chat (getadvice): an innocuous stock question
    // returned a list of unrelated prior conversations, IDs and timestamps included.
    const boudicaPayload = {
        message: augmentedMessage,
        session_id: `kiosk_session_${Date.now()}`,
        user_id: BOUDICA_USER_ID,
        user_email: BOUDICA_USER_EMAIL,
        stream: true,
        temperature: 0.8,
        max_tokens: 4000,
        use_rag: true,
        disable_memory: true
    };

    try {
        const response = await fetch(BOUDICA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BOUDICA_API_KEY}`
            },
            body: JSON.stringify(boudicaPayload)
        });

        if (!response.ok || !response.body) {
            console.error('Boudica endpoint returned', response.status);
            return res.status(502).end();
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (err) {
        console.error('Boudica endpoint communication failure:', err);
        res.status(502).end();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Boudica kiosk running on http://0.0.0.0:${PORT}`);
});
