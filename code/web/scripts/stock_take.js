// Must start as '' not undefined — see till.js's identical fix for why.
let stock_take_barcode = '';
let stock_take_interval;

// This listener is for a barcode scanner that acts like a keyboard.
document.getElementById('tab10')?.addEventListener('keyup', async function(ev) {
    // This should only fire when the focus is not on an input.
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
    }

    ev.preventDefault();
    if (stock_take_interval) {
        clearTimeout(stock_take_interval);
    }

    if (ev.key === 'Tab' || ev.key === 'Enter') {
        if (stock_take_barcode) {
            // A barcode has been "scanned"
            document.getElementById('st_barcode').value = stock_take_barcode;
            await stockTakeHandleBarcode(stock_take_barcode);
        }
        stock_take_barcode = ''; // Reset for the next scan
        return;
    }

    // Ignore non-character keys
    if (ev.key.length > 1) {
        return;
    }

    stock_take_barcode += ev.key;

    // Reset if there's a pause (e.g., manual typing)
    stock_take_interval = setTimeout(() => {
        stock_take_barcode = '';
    }, 100); // 100ms pause is a reasonable threshold
});

async function stockTakeHandleBarcode(scanned_barcode) {
    const barcode = scanned_barcode || document.getElementById('st_barcode').value;

    showToast('Adding item to stock count', 'info');
    const json = await apiCall('stocktake', { barcode });
    if ( json.error != undefined ) {
        showToast(json.error, 'error');
    } else {
        document.getElementById('stock_take_count').innerText = json.shelf;
        document.getElementById('store_stock_count').innerText = json.stock;
    }
    document.getElementById('st_barcode').value = '';
    document.getElementById('st_barcode').focus();
}

document.getElementById('set-stock_take-btn').addEventListener('click', async function() {
    await stockTakeHandleBarcode('');
});

document.getElementById('set-stock_take_complete_btn').addEventListener('click', async function() {
    // Ensure the 'Accept All' button is hidden before new results are loaded.
    document.getElementById('accept-all-discrepancies-btn').style.display = 'none';
    showLoadingOverlay();
    try {
        const json = await apiCall('completestocktake');
        if (json.error) {
            showToast(json.error, 'error');
            return;
        }

        const stockDetails = json.stock_count_details;
        if (!stockDetails) {
            showToast('No stock take details found in response.', 'info');
            document.getElementById('stock_take_completion').innerHTML = '<p>No items to display.</p>';
            return;
        }

        let resultsHtml = '';
        for (const key in stockDetails) {
            const iter = stockDetails[key];
            // Every DB-sourced field below is escaped before insertion — a crafted
            // barcode/description/supplier could otherwise inject script, or (via the old
            // inline onclick="updateStock('...')" pattern) break out of that JS string
            // literal entirely regardless of HTML-entity escaping. Replaced the inline
            // onclick with a data-barcode attribute plus a delegated click listener below,
            // which sidesteps that class of bug rather than trying to double-escape for it.
            const safeBarcode = escapeHtml(iter.barcode);
            resultsHtml += `<div class="product_lookup_result_container">
                <div class="product_lookup_result"><div class="product_lookup_result_header">Barcode:</div><span class="product_lookup_result_item">${safeBarcode}</span></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Supplier:</div><span class="product_lookup_result_item">${escapeHtml(iter.supplier || 'N/A')}</span></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Description:</div><span class="product_lookup_result_item">${escapeHtml(iter.description || 'N/A')}</span></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Color:</div><span class="product_lookup_result_item">${escapeHtml(iter.color || 'N/A')}</span></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Type:</div><span class="product_lookup_result_item">${escapeHtml(iter.type || 'N/A')}</span></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Stock Count:</div><input type="number" id="${safeBarcode}_counted" name="stock-count" min="0" step="1" required value="${escapeHtml(iter.counted)}"></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Stock Registered:</div><span class="product_lookup_result_item">${escapeHtml(iter.stock)}</span></div>
                <div class="product_lookup_result"><div class="product_lookup_result_header">Discrepancy:</div><span class="product_lookup_result_item" id="${safeBarcode}_descrepency">${escapeHtml(iter.descrepency)}</span></div>
                <div class="product_lookup_result"><button type="button" class="tab-button call_action stock-take-update-btn" id="${safeBarcode}_btn" style="background-color: #486586;" data-barcode="${safeBarcode}">Update Stock</button></div>
            </div> `;
        }

        document.getElementById('stock_take_completion').innerHTML = resultsHtml;
        // Show the 'Accept All' button now that results are loaded and there are items.
        const acceptAllBtn = document.getElementById('accept-all-discrepancies-btn');
        if (acceptAllBtn && Object.keys(stockDetails).length > 0) {
            acceptAllBtn.style.display = 'inline-block';
        }
    } catch (error) {
        console.error("Error during 'Complete Stock Take':", error);
        showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
        hideLoadingOverlay();
    }
});

// Delegated listener replacing the old inline onclick="updateStock('${barcode}', ...)"
// pattern — that embedded DB-sourced values directly into a JS string literal inside an
// HTML attribute, which HTML-entity escaping alone doesn't make safe (the browser decodes
// entities in the attribute back to the original text before the inline handler runs, so
// a barcode/supplier containing a stray quote could still break out of the JS string).
// Reading the value back off .dataset instead sidesteps that class of bug entirely.
document.getElementById('stock_take_completion')?.addEventListener('click', function(event) {
    const button = event.target.closest('.stock-take-update-btn');
    if (button) {
        updateStock(button.dataset.barcode);
    }
});

document.getElementById('accept-all-discrepancies-btn')?.addEventListener('click', async function() {
    showToast('Accepting all discrepancies. This may take a moment...', 'info');
    showLoadingOverlay();
    try {
        const updateButtons = document.querySelectorAll('#stock_take_completion .stock-take-update-btn');
        const updatePromises = Array.from(updateButtons).map(button => updateStock(button.dataset.barcode));

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            showToast('All stock discrepancies have been updated successfully.', 'success');
        }
    } catch (error) {
        console.error('An error occurred while updating all stock items:', error);
        showToast('An error occurred during the bulk update. Check console for details.', 'error');
    } finally {
        hideLoadingOverlay();
    }
});

async function updateStock(barcode) {
    const User = get_localStorage('user');
    const Token = get_localStorage('token');
    if (!User || !Token) {
        document.getElementById('login_div').style.display = 'flex';
        return;
    }

    const quantityInput = document.getElementById(`${barcode}_counted`);
    const quantity = quantityInput ? quantityInput.value : null;

    // The API expects a supplier, barcode, and quantity.
    if (barcode && quantity && Number(quantity) >= 0) {
        showToast(`Updating stock for ${barcode} to ${quantity}...`, 'info');

        const json = await apiCall('updatestock', { quantity, barcode });

        if (json.error) {
            showToast(json.error, 'error');
        } else if (json.response) {
            showToast(json.response, 'success');
            quantityInput.style.backgroundColor = '#d4edda'; // green background to show success
        } else {
            showToast('Stock updated, but no confirmation received.', 'info');
        }
    } else {
        showToast('Invalid data. Could not update stock.', 'error');
    }
}