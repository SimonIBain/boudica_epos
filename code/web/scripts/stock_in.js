let stock_in_barcode = '';
let stock_in_interval;

// Barcode scanner listener for the "Stock In" tab
document.getElementById('tab11')?.addEventListener('keyup', async function(ev) {
    // This listener is for a barcode scanner. It should not interfere with manual typing in form fields.
    if (document.activeElement && document.activeElement.tagName !== 'BODY') {
        return;
    }

    if (stock_in_interval) {
        clearTimeout(stock_in_interval);
    }

    if (ev.key === 'Tab' || ev.key === 'Enter') {
        ev.preventDefault();
        if (stock_in_barcode) {
            document.getElementById('stock-in-barcode').value = stock_in_barcode;
        }
        stock_in_barcode = ''; // Reset for the next scan
        return;
    }

    // Ignore non-character keys
    if (ev.key.length > 1) {
        return;
    }

    stock_in_barcode += ev.key;

    // Reset if there's a pause (e.g., manual typing)
    stock_in_interval = setTimeout(() => {
        stock_in_barcode = '';
    }, 100); // 100ms pause is a reasonable threshold
});

// Form submission handler
document.getElementById('stock-in-form')?.addEventListener('submit', async function(ev) {
    ev.preventDefault();

    const quantity = document.getElementById('stock-in-quantity').value;
    const barcode = document.getElementById('stock-in-barcode').value;

    if (!quantity || parseInt(quantity, 10) <= 0) {
        showToast('Please enter a valid quantity.', 'error');
        return;
    }

    if (barcode) {
        await stockInItem(barcode, quantity);
    } else {
        showToast('Please provide a barcode.', 'error');
    }
});

// Function to add stock using barcode and quantity
async function stockInItem(barcode, quantity) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) {
        document.getElementById('login_div').style.display = 'flex';
        return;
    }

    showToast(`Adding ${quantity} to stock for barcode ${barcode}...`, 'info');

    // Based on till.js, to ADD stock, we need to send a NEGATIVE quantity.
    const apiQuantity = -parseInt(quantity, 10);

    const params = new URLSearchParams({
        username: User,
        password: Password,
        command: 'updatestock',
        quantity: apiQuantity.toString(),
        barcode: barcode
    });

    try {
        const response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let response_text = await response.text();
        if (DEBUG) {
            console.log("Stock In Response:", response_text);
        }
        // Handle potential non-JSON text at the end of the response
        const i_end = response_text.indexOf("}");
        if (i_end > 0) {
            response_text = response_text.substring(0, i_end + 1);
        }

        if (response.ok) {
            const json = JSON.parse(response_text);
            if (json.error) {
                showToast(json.error, 'error');
            } else if (json.response) {
                showToast(json.response, 'success');
                // Clear fields after success
                document.getElementById('stock-in-barcode').value = '';
                document.getElementById('stock-in-quantity').value = '1';
            } else {
                showToast('Stock updated, but no confirmation received.', 'info');
            }
        } else {
            showToast(`Error: ${response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('Failed to add stock:', error);
        showToast('An error occurred while adding stock.', 'error');
    }
}