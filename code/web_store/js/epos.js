/**
 * The Boudica AI advice chat, via the real boudica_pos backend.
 *
 * Product search used to live here too (SearchStore, via getdetails) — removed
 * in favor of data.js calling the newer, purpose-built `getcatalog` command
 * directly (customer-safe fields, real multi-word matching). See
 * CODE_VERIFIED_AUDIT.md §12.
 *
 * Grounded in real stock (added same session, §12.7): a plain `getadvice` call
 * has no idea what's actually in stock — asked live "do you have any of this
 * in stock?" it fabricated an answer sending the customer to Michaels/Jo-Ann/
 * Etsy/Amazon instead of checking this store's own inventory. Fixed the same
 * way the kiosk's customer chat is grounded (CODE_VERIFIED_AUDIT.md §11):
 * extract keywords from the question, look up real matches via getcatalog,
 * and prepend them as plain-text context before sending to Boudica.
 */
import { apiCall } from './session.js';

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
 * getcatalog only does a single substring ILIKE (well, an AND-across-words one,
 * see §12), not a phrase search — a whole customer sentence never matches a
 * product description on its own. Try the full message first, then fall back
 * to individual significant words, merging/deduping by barcode.
 */
async function findCatalogMatches(message, maxResults) {
    const terms = [message.trim(), ...extractKeywords(message)].filter(Boolean).slice(0, 5);
    const seen = new Map();
    for (const term of terms) {
        if (seen.size >= maxResults) break;
        const result = await apiCall('getcatalog', { q: term, limit: String(maxResults) });
        if (Array.isArray(result.products)) {
            for (const p of result.products) {
                if (!seen.has(p.barcode)) { seen.set(p.barcode, p); }
            }
        }
    }
    return Array.from(seen.values()).slice(0, maxResults);
}

const EPOS = () => {
    const AskBoudica = async (prompt) => {
        if (!prompt) {
            return '';
        }

        let augmentedPrompt = prompt;
        try {
            const matches = await findCatalogMatches(prompt, 5);
            if (matches.length > 0) {
                const lines = matches.map(p =>
                    `- ${p.description}${p.color ? ' (' + p.color + ')' : ''}: £${p.price.toFixed(2)}, ${p.availability.replace('_', ' ')}`
                );
                augmentedPrompt = `Here is what we currently have in stock that may be relevant (real data — use it if it helps answer the question, otherwise ignore it):\n${lines.join('\n')}\n\nCustomer question: ${prompt}`;
            }
        } catch (err) {
            console.warn('Stock grounding skipped (catalog lookup failed):', err.message);
        }

        try {
            const data = await apiCall('getadvice', { prompt: augmentedPrompt });
            if (data.error) {
                console.error('Error asking Boudica:', data.error);
                return 'Sorry, I seem to be having trouble connecting. Please try again later.';
            }
            return data.response || 'Sorry, I received an unexpected response. Please try again.';
        } catch (error) {
            console.error('Error asking Boudica:', error);
            return 'Sorry, an error occurred while I was thinking. Please check your connection and try again.';
        }
    };

    return {
        AskBoudica
    };
};

export default EPOS;
