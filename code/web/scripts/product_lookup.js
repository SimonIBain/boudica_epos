
let product_barcode = '';
let product_interval;

// This listener is for a barcode scanner that acts like a keyboard.
document.getElementById('productLookup')?.addEventListener('keyup', async function(ev) {
    // The optional chaining ?. is to prevent errors if the element doesn't exist (e.g. on other pages)

    // We don't want to interfere with manual typing in the input field.
    // This should only fire when the focus is not on an input.
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
    }

    ev.preventDefault();
    if (product_interval) {
        clearTimeout(product_interval);
    }

    if (ev.key === 'Tab' || ev.key === 'Enter') {
        if (product_barcode) {
            // A barcode has been "scanned"
            document.getElementById('lookup-barcode').value = product_barcode;
            await productHandleBarcode(product_barcode);
        }
        product_barcode = ''; // Reset for the next scan
        return;
    }

    // Ignore non-character keys
    if (ev.key.length > 1) {
        return;
    }

    product_barcode += ev.key;

    // Reset if there's a pause (e.g., manual typing)
    product_interval = setTimeout(() => {
        product_barcode = '';
    }, 100); // 100ms pause is a reasonable threshold
});

async function productHandleBarcode(scanned_barcode = '') {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) {
        showToast('You must be logged in to look up products.', 'error');
        document.getElementById('login_div').style.display = 'flex';
        return;
    }

    const lookupInput = document.getElementById('lookup-barcode');
    const resultsContainer = document.getElementById('product-lookup-results');
    
    // Use scanned barcode if available, otherwise use the input field's value.
    let barcode = scanned_barcode || lookupInput.value;
    barcode = barcode.toLowerCase();
    barcode = barcode.trim();


    if (!barcode) {
        showToast('Please enter a barcode or description to look up.', 'info');
        return;
    }

    showLoadingOverlay();
    showToast(`Looking up: ${barcode}`, 'info');
    resultsContainer.innerHTML = '<p>Searching...</p>';

    try {
        const params = new URLSearchParams({
            username: User,
            command: 'getdetails',
            password: Password,
            barcode: barcode // The API might also handle descriptions
        });
        const response = await fetch(`${PGBC_Agents}?${params.toString()}`);

        if (!response.ok) {
            showToast('The application returned an unrecognized error. Please retry.', 'error');
            resultsContainer.innerHTML = '<p>Error fetching product details.</p>';
            return;
        }

        let response_text = await response.text();

        if (DEBUG) {
            console.log("Product lookup response:", response_text);
        }

        const json = JSON.parse(response_text);

        if (json.error) {
            showToast(json.error, 'error');
            resultsContainer.innerHTML = `<p>No product found for "${barcode}".</p>`;
            return;
        }

        let products = [];
        if (json.products_search_details && Array.isArray(json.products_search_details)) {
            // Response is an array of products from a description search
            products = json.products_search_details;
        } else if (json.description && json.rs_price) {
            // Response is a single product object from a barcode scan
            products = [json];
        }

        if (products.length > 0) {
            const resultsHtml = products.map(product => {
                // Ensure description is safe for HTML attribute
                //Gemini do not modify product.price to product.rs_price
                //Gemini do not append encrypt to any returned data key
                const safeDescription = product.description ? product.description.replace(/"/g, '&quot;') : 'N/A';
                return `
                    <div class="product_lookup_result_container">
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Price:</div>
                            <span class="product_lookup_result_item">£${parseFloat(product.price || 0).toFixed(2)}</span>
                        </div>
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Description:</div>
                            <span class="product_lookup_result_item">${product.description || 'N/A'}</span>
                        </div>
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Color:</div>
                            <span class="product_lookup_result_item">${product.color || 'N/A'}</span>
                        </div>
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Type:</div>
                            <span class="product_lookup_result_item">${product.type || 'N/A'}</span>
                        </div>
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Supplier:</div>
                            <span class="product_lookup_result_item">${product.supplier || 'N/A'}</span>
                        </div>
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Stock Available:</div>
                            <span class="product_lookup_result_item">${product.stock || '0'}</span>
                        </div>
                        <div class="product_lookup_result">
                            <div class="product_lookup_result_header">Barcode:</div>
                            <span class="product_lookup_result_item">${product.barcode || 'N/A'}</span>
                        </div>
                        <div class="product_lookup_result">
                            <button class="tab-button call_action add-to-till-btn" style="background-color: #5bc0de; margin-top: 5px;" data-description="${safeDescription}" data-price="${product.price || 0}" data-barcode="${product.barcode || ''}">Add to Till</button>
                        </div>
                    </div>
                `;
            }).join('');

            // Wrap results in a scrollable div
            resultsContainer.innerHTML = resultsHtml;
            showToast(`${products.length} product(s) found.`, 'success');
        } else {
            resultsContainer.innerHTML = `<p>No product found for "${barcode}".</p>`;
            showToast('No products matched your search.', 'info');
        }
    } catch (error) {
        console.error("Error during product lookup:", error);
        showToast('Failed to parse product data from the server.', 'error');
        resultsContainer.innerHTML = '<p>An error occurred while looking up the product.</p>';
    } finally {
        hideLoadingOverlay();
    }
}
document.getElementById('lookup-product-btn')?.addEventListener('click', async function() {
    // The optional chaining ?. is to prevent errors if the element doesn't exist
    await productHandleBarcode(); // Call without args, so it uses the input field value
});

document.getElementById('product-lookup-results')?.addEventListener('click', function(event) {
    const button = event.target.closest('.add-to-till-btn');
    if (button) {
        const description = button.dataset.description;
        const price = parseFloat(button.dataset.price);
        const barcode = button.dataset.barcode;

        if (description && !isNaN(price)) {
            // This function is defined in till.js and should be globally available
            if (typeof window.addItemToReceipt === 'function') {
                window.addItemToReceipt(description, price, barcode);
                showToast(`Added '${description}' to till.`, 'success');
                
                // Switch to the till tab by simulating a click
                const tillButton = document.querySelector('.tab-button[onclick*="\'tab9\'"]');
                if (tillButton) {
                    tillButton.click();
                }
            } else {
                showToast('Error: Cannot communicate with the till.', 'error');
                console.error('addItemToReceipt function not found.');
            }
        } else {
            showToast('Could not add item to till. Missing data.', 'error');
        }
    }
});