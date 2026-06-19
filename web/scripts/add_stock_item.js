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
    let response = await fetch(`${PGBC_Agents}?username=${User}&command=getdetails&password=${Password}&barcode=${scanned_barcode}`);
    if (response.status == 200) {
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
                // An error like "not found" is a good thing here, it means the barcode is available.
                if (json.error.toLowerCase().includes('not found')) {
                    showToast('Barcode is available.', 'success');
                    document.getElementById('stock-barcode').value = scanned_barcode;
                } else {
                    showToast(json.error, 'error');
                }
            } else {
                // If we get details, it means the barcode is already in the system.
                if (json.price !== undefined) {
                    showToast('This barcode is already in the system!', 'error');
                }
            }
        } catch (e) {
            console.error("Error parsing barcode check response:", e, response_text);
            // If parsing fails, it might be a non-JSON error response.
            // We can assume the barcode is available and let the user proceed.
            document.getElementById('stock-barcode').value = scanned_barcode;
        }
        return;
    }
    showToast('Sorry, the service is currently unavailable. Please retry', 'error');
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
        let response;
        showToast('Adding stock item...', 'info');
        // Assuming the command is 'addstockitem' based on the form's purpose.
        const qty = Number(quantity);
         //queryString="username=sibain@omniindex.io&command=addproduct&password=Ch35t3r&supplier=Debs J Bain&barcode=973098767891&price=8.50&description=Needle thread wall hanging small.";
         if ( isNaN(qty) || qty <= 0 ) {
            const params = new URLSearchParams({
                username: User,
                password: Password,
                command: 'addproduct',
                supplier: supplier,
                description: description,
                price: price,
                barcode: barcode
            });
            response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        } else {
            //queryString="username=sibain@omniindex.io&command=updatestock&password=Ch35t3r&supplier=Debs J Bain&barcode=973098767891&quantity=3";
            const params = new URLSearchParams({
                username: User,
                password: Password,
                command: 'updatestock',
                supplier: supplier,
                quantity: quantity,
                barcode: barcode
            });
            response = await fetch(`${PGBC_Agents}?${params.toString()}`);            
        }

        if (response.status == 200) {
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
            } catch (e) {
                console.error("Error parsing add stock item response:", e, response_text);
                showToast('Received an invalid response from server.', 'error');
            }
        } else {
            showToast('Sorry, the service is currently unavailable. Please try again.', 'error');
        }
    } else {
        showToast('Please provide all of the required information.', 'error');
    }
});