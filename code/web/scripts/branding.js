document.addEventListener('DOMContentLoaded', function() {
    const brandingForm = document.getElementById('branding-form');
    if (!brandingForm) {
        return;
    }

    async function loadBranding() {
        try {
            const data = await apiCall('getbranding', { site_key: 'web_store' });
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }
            document.getElementById('branding-store-name').value = data.store_name || '';
            document.getElementById('branding-tagline').value = data.tagline || '';
            document.getElementById('branding-primary-color').value = data.primary_color || '#25214e';
            document.getElementById('branding-accent-color').value = data.accent_color || '#b8860b';
            document.getElementById('branding-logo-url').value = data.logo_url || '';
            document.getElementById('branding-welcome-message').value = data.welcome_message || '';
        } catch (error) {
            console.error('Failed to load branding:', error);
        }
    }

    // Loaded once, up front, rather than on tab-open — this tab, like every other
    // till tab, has no lazy-load hook of its own (see tabs.js's openTab()).
    loadBranding();

    brandingForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const storeName = document.getElementById('branding-store-name').value.trim();
        if (!storeName) {
            showToast('Please provide a store name.', 'error');
            return;
        }

        try {
            const json = await apiCall('setbranding', {
                site_key: 'web_store',
                store_name: storeName,
                tagline: document.getElementById('branding-tagline').value,
                primary_color: document.getElementById('branding-primary-color').value,
                accent_color: document.getElementById('branding-accent-color').value,
                logo_url: document.getElementById('branding-logo-url').value,
                welcome_message: document.getElementById('branding-welcome-message').value
            });
            if (json.error) {
                // setbranding is admin-gated server-side — an operator/manager sees this
                // rather than a silently-ignored save.
                showToast(json.error, 'error');
                return;
            }
            showToast('Branding updated — the web store kiosk will pick it up immediately.', 'success');
        } catch (error) {
            console.error('Failed to save branding:', error);
            showToast('An error occurred while saving branding.', 'error');
        }
    });
});
