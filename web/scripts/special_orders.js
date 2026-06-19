document.addEventListener('DOMContentLoaded', function() {
    const specialOrderForm = document.getElementById('special-order-form');
    if (!specialOrderForm) {
        return;
    }

    specialOrderForm.addEventListener('submit', function(event) {
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

        // Call the printer function
        if (typeof printSpecialOrderReceipt === 'function') {
            printSpecialOrderReceipt(orderDetails);
        } else {
            console.error('printSpecialOrderReceipt function is not defined. Make sure printer.js is loaded correctly.');
            showToast('Error: Printing function not available.', 'error');
        }

        // Optionally, send data to a server here.
        // For now, we just print and clear.

        showToast('Special order created successfully.', 'success');
        specialOrderForm.reset();
    });
});