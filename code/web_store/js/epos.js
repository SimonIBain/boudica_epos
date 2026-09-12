/**
 * The Boudica AI advice chat, via the real boudica_pos backend.
 *
 * Product search used to live here too (SearchStore, via getdetails) — removed
 * in favor of data.js calling the newer, purpose-built `getcatalog` command
 * directly (customer-safe fields, real multi-word matching). See
 * CODE_VERIFIED_AUDIT.md §12.
 */
import { apiCall } from './session.js';

const EPOS = () => {
    const AskBoudica = async (prompt) => {
        if (!prompt) {
            return '';
        }
        try {
            const data = await apiCall('getadvice', { prompt });
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
