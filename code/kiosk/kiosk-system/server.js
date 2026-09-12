const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Deployment-specific config — all read from the environment, never hardcoded.
// Boudica's real chat endpoint (see CODE_VERIFIED_AUDIT.md §0.4/reference_boudica_slm_inference):
// served at /api/boudica/chat, not /boudica/api/chat.
const BOUDICA_ENDPOINT = process.env.BOUDICA_ENDPOINT || 'http://192.168.0.131/api/boudica/chat';
const BOUDICA_API_KEY = process.env.BOUDICA_API_KEY || '';
const BOUDICA_USER_ID = process.env.BOUDICA_USER_ID || 'boudica-kiosk';
const BOUDICA_USER_EMAIL = process.env.BOUDICA_USER_EMAIL || 'kiosk@localhost';

const ADMIN_USER = process.env.KIOSK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KIOSK_ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
    console.warn('WARNING: KIOSK_ADMIN_PASSWORD is not set — the layout editor and publish endpoint are disabled until it is configured.');
}
if (!BOUDICA_API_KEY) {
    console.warn('WARNING: BOUDICA_API_KEY is not set — the customer AI chat box will not work until it is configured.');
}

// Middleware rules for static hosting and payload parsing
app.use(express.json({ limit: '1mb' }));

// Ensure target persistent configuration directories exist locally
const storageDir = path.join(__dirname, 'public', 'storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
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
 * Gate for the layout editor (admin.html) and the publish endpoint — everything
 * else (the public kiosk view, load-layout) stays open, since that's what
 * customers are meant to see.
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

/**
 * Endpoint: Save layout definitions to local storage
 */
app.post('/api/save-layout', requireAdminAuth, (req, res) => {
    fs.writeFile(
        path.join(storageDir, 'layout.json'),
        JSON.stringify(req.body, null, 2),
        (err) => {
            if (err) {
                return res.status(500).json({ status: 'error', message: 'Failed to write configuration profile' });
            }
            res.json({ status: 'success', message: 'Kiosk deployment settings applied successfully!' });
        }
    );
});

// Serve the public kiosk view and everything else in public/ except admin.html,
// which is handled above behind auth.
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

/**
 * Endpoint: Read layout definitions from local storage — public, this is what
 * the customer-facing kiosk view loads on every visit.
 */
app.get('/api/load-layout', (req, res) => {
    const filePath = path.join(storageDir, 'layout.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Fallback default setup structure if configuration profiles do not exist yet
        res.json({
            html: '<div class="kiosk-body"><div class="ai-box"><h3>Store AI</h3><div class="chat-log"></div></div></div>',
            css: '.kiosk-body{background:#f8f9fa; padding:20px;}'
        });
    }
});

/**
 * Endpoint: Stream Proxy to the Boudica AI chat API
 */
app.post('/boudica/api/chat', async (req, res) => {
    if (!BOUDICA_API_KEY) {
        return res.status(503).json({ error: 'Boudica API key not configured (set BOUDICA_API_KEY).' });
    }
    const userMessage = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!userMessage) {
        return res.status(400).json({ error: 'A non-empty message is required.' });
    }

    // Real Boudica /chat field is "message", not "prompt" (§0.4). RAG stays on
    // deliberately here — unlike the reporting endpoints (§7.7), this is genuine
    // customer Q&A meant to be grounded in the shop's own RAG corpus.
    const boudicaPayload = {
        message: userMessage,
        session_id: `kiosk_session_${Date.now()}`,
        user_id: BOUDICA_USER_ID,
        user_email: BOUDICA_USER_EMAIL,
        stream: true,
        temperature: 0.8,
        max_tokens: 4000,
        use_rag: true
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
