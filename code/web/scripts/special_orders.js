document.addEventListener('DOMContentLoaded', function() {
    const specialOrderForm = document.getElementById('special-order-form');
    if (!specialOrderForm) {
        return;
    }

    specialOrderForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const orderDetails = {
            name: document.getElementById('special-order-name').value,
            address: document.getElementById('special-order-address').value,
            products: document.getElementById('special-order-products').value,
            total: parseFloat(document.getElementById('special-order-total').value),
            deposit: parseFloat(document.getElementById('special-order-deposit').value),
            dueDate: document.getElementById('special-order-due-date').value
        };

        // Basic validation
        if (!orderDetails.name || !orderDetails.products || isNaN(orderDetails.total) || isNaN(orderDetails.deposit) || !orderDetails.dueDate) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        if (orderDetails.deposit > orderDetails.total) {
            showToast('Deposit cannot be greater than the total price.', 'error');
            return;
        }

        const User = get_localStorage('user');
        const Password = get_localStorage('password');
        if (!User || !Password) {
            document.getElementById('login_div').style.display = 'flex';
            showToast('You must be logged in to take a special order.', 'error');
            return;
        }

        // Save the order before printing/clearing — previously this only printed a paper
        // receipt and discarded the order entirely, so a lost receipt meant there was no
        // way to look it up, track fulfillment, or reconcile the deposit later.
        const orderNumber = 'SO-' + Date.now();
        showToast('Saving special order...', 'info');
        try {
            const json = await apiCall('addspecialorder', {
                order_number: orderNumber,
                name: orderDetails.name,
                address: orderDetails.address,
                products: orderDetails.products,
                total: orderDetails.total.toString(),
                deposit: orderDetails.deposit.toString(),
                due_date: orderDetails.dueDate
            });
            if (json.error) {
                showToast(json.error, 'error');
                return;
            }
        } catch (error) {
            console.error('Failed to save special order:', error);
            showToast('An error occurred while saving the special order.', 'error');
            return;
        }

        // Call the printer function
        if (typeof printSpecialOrderReceipt === 'function') {
            printSpecialOrderReceipt(orderDetails);
        } else {
            console.error('printSpecialOrderReceipt function is not defined. Make sure printer.js is loaded correctly.');
            showToast('Error: Printing function not available.', 'error');
        }

        showToast('Special order created successfully.', 'success');
        specialOrderForm.reset();
    });
});