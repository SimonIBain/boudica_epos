let add_stock_barcode = '';
let add_stock_interval;

document.getElementById('tab4').addEventListener('keyup', async function(ev) {
    // This listener is for a barcode scanner that acts like a keyboard.
    // It captures keystrokes quickly and assumes a 'Tab' or 'Enter' key press at the end.

    // We don't want to interfere with manual typing in form fields.
    // The scanner should not have any input focused for this to work.
    if (document.activeElement && document.activeElement.tagName !== 'BODY') {
        return;
    }

    if (add_stock_interval) {
        clearTimeout(add_stock_interval);
    }

    if (ev.key === 'Tab' || ev.key === 'Enter') {
        ev.preventDefault();
        if (add_stock_barcode) {
            // A barcode has been "scanned"
            addStockHandleBarcode(add_stock_barcode);
        }
        add_stock_barcode = ''; // Reset for the next scan
        return;
    }

    // Ignore non-character keys
    if (ev.key.length > 1) {
        return;
    }

    add_stock_barcode += ev.key;

    // Reset if there's a pause (e.g., manual typing)
    add_stock_interval = setTimeout(() => {
        add_stock_barcode = '';
    }, 100); // 100ms pause is a reasonable threshold
});

async function addStockHandleBarcode(scanned_barcode) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) {
        document.getElementById('login_div').style.display = 'flex';
        return;
    }

    // When a barcode is scanned, we first check if it already exists.
    showToast(`Checking barcode: ${scanned_barcode}`, 'info');
    const json = await apiCall('getdetails', { barcode: scanned_barcode });
    // getdetails wraps its result in "products_search_details" (even for an exact
    // barcode match) rather than returning a bare object or an "error" for "not
    // found" — see the identical fix in till.js's handleBarCode (7.1#3). A genuine
    // "not found" is a one-item array of empty strings, not an empty array, so check
    // for an actual barcode rather than array truthiness.
    const product = json.products_search_details && json.products_search_details[0];
    if (json.error || !product || !product.barcode) {
        showToast('Barcode is available.', 'success');
        document.getElementById('stock-barcode').value = scanned_barcode;
    } else {
        showToast('This barcode is already in the system!', 'error');
    }
}

document.getElementById('add-stock-form').addEventListener('submit', async function(ev) {
    ev.preventDefault();

    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) {
        document.getElementById('login_div').style.display = 'flex';
        //showToast('You must be logged in to add stock.', 'error');
        return;
    }

    const supplier = document.getElementById("stock-supplier").value;
    const description = document.getElementById("stock-description").value;
    const price = document.getElementById("stock-price").value;
    const quantity = document.getElementById("stock-quantity").value;
    const barcode = document.getElementById("stock-barcode").value;

    if (supplier && description && price && quantity  > 0 && barcode) {
        showToast('Adding stock item...', 'info');
        const qty = Number(quantity);
        const json = ( isNaN(qty) || qty <= 0 )
            ? await apiCall('addproduct', { supplier, description, price, barcode })
            : await apiCall('updatestock', { supplier, quantity, barcode });

        if (json.error) {
            showToast(json.error, 'error');
        } else if (json.response) {
            showToast(json.response, 'success');
            const keepSupplier = document.getElementById('keep-supplier-checkbox').checked;
            if (keepSupplier) {
                // Reset all fields except the supplier
                document.getElementById("stock-description").value = '';
                document.getElementById("stock-price").value = '';
                document.getElementById("stock-quantity").value = '0';
                document.getElementById("stock-barcode").value = '';
            } else {
                document.getElementById('add-stock-form').reset();
            }
        } else {
            showToast('Item added, but no confirmation received.', 'info');
        }
    } else {
        showToast('Please provide all of the required information.', 'error');
    }
});