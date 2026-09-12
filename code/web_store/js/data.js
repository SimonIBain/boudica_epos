/**
 * Product catalog access for the storefront.
 *
 * Previously routed through a client-side raw-SQL layer (js/driver/pgbc.js,
 * deleted) that built SQL strings in the browser and shipped them to a
 * `pgbcadmin` CGI endpoint on an external demo host, authenticated with a
 * real-looking hardcoded personal credential — a completely different,
 * unrelated product not even part of this repo, unreachable in this stack,
 * and non-functional by design here (store.web_store_front was never seeded).
 * Deleted entirely rather than fixed. See CODE_VERIFIED_AUDIT.md §12.
 *
 * Now calls this project's own real `getcatalog` backend command (built for
 * the kiosk, CODE_VERIFIED_AUDIT.md §11) via the shared session module.
 */
import { apiCall } from './session.js';
import EPOS from './epos.js';

const Data = async () => {
    /**
     * Builds the homepage's "featured categories" cards — one per distinct
     * product `type`, showing that type's cheapest priced, in-stock item with
     * an image. Replaces the old store.web_store_front raw-SQL-clause table.
     */
    const StoreFrontList = async () => {
        const data = await apiCall('getcatalog', { limit: '100' });
        if (data.error || !Array.isArray(data.products)) {
            console.error('Error fetching storefront list:', data.error);
            return [];
        }

        const byType = new Map();
        for (const p of data.products) {
            const type = (p.type || '').trim();
            if (!type || !p.image_url || !(p.price >= 0.01)) { continue; }
            const existing = byType.get(type);
            if (!existing || p.price < existing.price) { byType.set(type, p); }
        }

        return Array.from(byType.entries()).map(([type, p]) => ({
            id: type,
            name: type.toUpperCase(),
            price: p.price,
            image: p.image_url || 'assets/logo.png',
            category: 'featured',
            searchTerm: type
        }));
    };

    /** Products within one "category" (product type). */
    const getProductsByCategory = async (categoryType = '') => {
        if (!categoryType) { return []; }
        const data = await apiCall('getcatalog', { q: categoryType, limit: '100' });
        if (data.error || !Array.isArray(data.products)) {
            console.error('Error fetching products for category:', data.error);
            return [];
        }
        return data.products
            .filter(p => p.image_url && p.price >= 0.01)
            .map(mapCatalogProduct);
    };

    /** Free-text search across the catalog. */
    const searchProducts = async (searchTerm = '') => {
        if (!searchTerm) { return []; }
        const data = await apiCall('getcatalog', { q: searchTerm, limit: '50' });
        if (data.error || !Array.isArray(data.products)) {
            console.error('Error searching products:', data.error);
            return [];
        }
        return data.products.map(mapCatalogProduct);
    };

    const askBoudica = async (prompt = '') => {
        const epos = EPOS();
        return await epos.AskBoudica(prompt);
    };

    return {
        StoreFrontList,
        getProductsByCategory,
        searchProducts,
        askBoudica
    };
};

/**
 * getcatalog returns a coarse availability tier (in_stock/low_stock/
 * out_of_stock), not an exact count — the UI shows that tier directly instead
 * of a fabricated number.
 */
function mapCatalogProduct(p) {
    return {
        id: p.barcode,
        name: p.description,
        price: p.price,
        image: p.image_url || 'assets/logo.png',
        availability: p.availability
    };
}

export default Data;
