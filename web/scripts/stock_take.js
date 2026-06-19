let stock_take_barcode;
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
    const User = get_localStorage('user');
    const Password = get_localStorage('password');  
    const barcode = scanned_barcode || document.getElementById('st_barcode').value;

    showToast('Adding item to stock count', 'info');  
    let response = await fetch(`${PGBC_Agents}?username=${User}&command=stocktake&password=${Password}&barcode=${barcode}`);
    if ( response.status == 200 ) {
        let response_text = await response.text();
        if ( DEBUG ) {
            console.log ( response_text);
        }
        const i_end = response_text.indexOf("}");
        if ( i_end > 0 ) {
            response_text = response_text.substring(0, i_end + 1);
        }
        try {
            const json = JSON.parse(response_text);
            if ( json.error != undefined ) {
                showToast(json.error, 'error');   
            } else {
                document.getElementById('stock_take_count').innerText = json.shelf;
                document.getElementById('store_stock_count').innerText = json.stock;
            }
        } catch {/** Do nothing it is the expected result */}
        document.getElementById('st_barcode').value = '';
        document.getElementById('st_barcode').focus();
        return;
    }
    document.getElementById('st_barcode').value = '';
    showToast('Sorry the service is currently unavailable. Please retry', 'error');
}

document.getElementById('set-stock_take-btn').addEventListener('click', async function() {
    await stockTakeHandleBarcode('');
});

document.getElementById('set-stock_take_complete_btn').addEventListener('click', async function() {
    // Ensure the 'Accept All' button is hidden before new results are loaded.
    document.getElementById('accept-all-discrepancies-btn').style.display = 'none';
    showLoadingOverlay();
    try {
        const User = get_localStorage('user');
        const Password = get_localStorage('password');  
        let response = await fetch(`${PGBC_Agents}?username=${User}&command=completestocktake&password=${Password}`);
        if ( response.status == 200 ) {
            let response_text = await response.text();
            if ( DEBUG ) {
                console.log ( response_text);
            }

            try {
                const stockDetails = JSON.parse(response_text).stock_count_details;
                if (!stockDetails) {
                    showToast('No stock take details found in response.', 'info');
                    document.getElementById('stock_take_completion').innerHTML = '<p>No items to display.</p>';
                    return;
                }

                if (stockDetails.error) {
                    showToast(stockDetails.error, 'error');
                    return;
                }

                let resultsHtml = '';
                for (const key in stockDetails) {
                    const iter = stockDetails[key];
                    // Escape single quotes in supplier name to prevent breaking the onclick attribute
                    const safeSupplier = iter.supplier ? iter.supplier.replace(/'/g, "\\'") : '';
                    resultsHtml += `<div class="product_lookup_result_container">
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Barcode:</div><span class="product_lookup_result_item">${iter.barcode}</span></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Supplier:</div><span class="product_lookup_result_item">${iter.supplier || 'N/A'}</span></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Description:</div><span class="product_lookup_result_item">${iter.description || 'N/A'}</span></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Color:</div><span class="product_lookup_result_item">${iter.color || 'N/A'}</span></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Type:</div><span class="product_lookup_result_item">${iter.type || 'N/A'}</span></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Stock Count:</div><input type="number" id="${iter.barcode}_counted" name="stock-count" min="0" step="1" required value="${iter.counted}"></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Stock Registered:</div><span class="product_lookup_result_item">${iter.stock}</span></div>
                        <div class="product_lookup_result"><div class="product_lookup_result_header">Discrepancy:</div><span class="product_lookup_result_item" id="${iter.barcode}_descrepency">${iter.descrepency}</span></div>
                        <div class="product_lookup_result"><button type="button" class="tab-button call_action" id="${iter.barcode}_btn" style="background-color: #486586;" onclick="updateStock('${iter.barcode}', '${safeSupplier}')">Update Stock</button></div>
                    </div> `;
                }

                document.getElementById('stock_take_completion').innerHTML = resultsHtml;
                // Show the 'Accept All' button now that results are loaded and there are items.
                const acceptAllBtn = document.getElementById('accept-all-discrepancies-btn');
                if (acceptAllBtn && Object.keys(stockDetails).length > 0) {
                    acceptAllBtn.style.display = 'inline-block';
                }
            } catch (err) {
                console.error("Error processing stock take completion:", err, response_text);
                showToast('Failed to process stock take results.', 'error');
            }
        } else {
            showToast('Sorry the service is currently unavailable. Please retry', 'error');
        }
    } catch (error) {
        console.error("Error during 'Complete Stock Take':", error);
        showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
        hideLoadingOverlay();
    }
});

document.getElementById('accept-all-discrepancies-btn')?.addEventListener('click', async function() {
    showToast('Accepting all discrepancies. This may take a moment...', 'info');
    showLoadingOverlay();
    try {
        const updateButtons = document.querySelectorAll('#stock_take_completion button[onclick^="updateStock"]');

        const updatePromises = [];
        updateButtons.forEach(button => {
            const onclickAttr = button.getAttribute('onclick');
            // Extracts arguments from a string like "updateStock('barcode123', 'Supplier Name\\'s')"
            const matches = onclickAttr.match(/updateStock\('([^']*)', '((?:[^']|\\')*)'\)/);
            if (matches && matches.length === 3) {
                const barcode = matches[1];
                const supplier = matches[2].replace(/\\'/g, "'"); // Un-escape single quotes
                updatePromises.push(updateStock(barcode, supplier));
            } else {
                console.warn('Could not parse arguments from onclick attribute:', onclickAttr);
            }
        });

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

async function updateStock(barcode, supplier) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) {
        document.getElementById('login_div').style.display = 'flex';
        return;
    }

    const quantityInput = document.getElementById(`${barcode}_counted`);
    const quantity = quantityInput ? quantityInput.value : null;

    // The API expects a supplier, barcode, and quantity.
    if (barcode && quantity && Number(quantity) >= 0) {
        showToast(`Updating stock for ${barcode} to ${quantity}...`, 'info');
        
        const params = new URLSearchParams({
            username: User,
            password: Password,
            command: 'updatestock',
            quantity: quantity,
            barcode: barcode
        });
        
        const response = await fetch(`${PGBC_Agents}?${params.toString()}`);

        if (response.ok) {
            let response_text = await response.text();
            if (DEBUG) {
                console.log(response_text);
            }

            const i_end = response_text.indexOf("}");
            if (i_end > 0) {
                response_text = response_text.substring(0, i_end + 1);
            }

            try {
                const json = JSON.parse(response_text);
                if (json.error) {
                    showToast(json.error, 'error');
                } else if (json.response) {
                    showToast(json.response, 'success');
                    quantityInput.style.backgroundColor = '#d4edda'; // green background to show success
                } else {
                    showToast('Stock updated, but no confirmation received.', 'info');
                }
            } catch (e) {
                if (response_text.toLowerCase().includes('success') || response_text.toLowerCase().includes('updated')) {
                    showToast('Stock updated successfully!', 'success');
                    quantityInput.style.backgroundColor = '#d4edda';
                } else {
                    console.error("Error parsing update stock response:", e, response_text);
                    showToast('Received an invalid response from server.', 'error');
                }
            }
        } else {
            showToast('Sorry, the service is currently unavailable. Please try again.', 'error');
        }
    } else {
        showToast('Invalid data. Could not update stock.', 'error');
    }
}