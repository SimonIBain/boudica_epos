// Order History and Receipt functionality for Till Dashboard

async function loadOrderHistory() {
    const customerEmail = document.getElementById('order-customer-email').value;
    
    if (!customerEmail || customerEmail.trim() === '') {
        showToast('Please enter a customer email', 'warning');
        return;
    }

    showLoadingOverlay();

    const User = get_localStorage('user');
    const Token = get_localStorage('token');
    
    if (!User || !Token) {
        hideLoadingOverlay();
        showToast('Not authenticated', 'error');
        return;
    }

    try {
        const jsonData = await apiCall('orderhistory', { email: customerEmail });

        if (jsonData.error) {
            showToast(jsonData.error, 'error');
            document.getElementById('orders-container').innerHTML = '<p>No orders found for this customer</p>';
            return;
        }

        displayOrderHistory(jsonData);
    } catch (error) {
        console.error('Error loading order history:', error);
        showToast('Error loading order history', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function displayOrderHistory(data) {
    const container = document.getElementById('orders-container');
    
    if (!data.orders || data.orders.length === 0) {
        container.innerHTML = '<p>No orders found for this customer</p>';
        return;
    }

    let html = '<table class="orders-table"><thead><tr>';
    html += '<th>Order ID</th><th>Date</th><th>Status</th><th>Payment</th><th>Subtotal</th><th>VAT</th><th>Total</th><th>Actions</th></tr></thead><tbody>';
    
    data.orders.forEach(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString();
        const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
        const vat = parseFloat(order.vat_amount || 0).toFixed(2);
        const total = parseFloat(order.total_value).toFixed(2);
        // Every DB-sourced field is escaped, and the two action buttons carry their data
        // in data-* attributes read via .dataset (see the delegated listener below)
        // instead of the old onclick="viewOrderDetails('${order.order_id}', ...)" pattern
        // — embedding DB content straight into an inline handler's JS string literal isn't
        // made safe by HTML-entity escaping alone, since the browser decodes entities in
        // an attribute back to the original text before that inline handler ever runs.
        html += `<tr>
            <td><strong>${escapeHtml(order.order_id)}</strong></td>
            <td>${orderDate}</td>
            <td><span class="status-badge ${escapeHtml((order.order_status || '').toLowerCase())}">${escapeHtml(order.order_status)}</span></td>
            <td>${escapeHtml(order.payment_method)}</td>
            <td>£${subtotal}</td>
            <td>£${vat} (20%)</td>
            <td><strong>£${total}</strong></td>
            <td>
                <button class="action-btn view-receipt-btn" data-order-id="${escapeHtml(order.order_id)}">🖨️ Receipt</button>
                <button class="action-btn view-details-btn" data-order-id="${escapeHtml(order.order_id)}" data-order-date="${escapeHtml(order.order_date)}" data-order-status="${escapeHtml(order.order_status)}" data-subtotal="${subtotal}" data-vat="${vat}" data-total="${total}">📋 Details</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

document.getElementById('orders-container')?.addEventListener('click', function(event) {
    const receiptBtn = event.target.closest('.view-receipt-btn');
    if (receiptBtn) {
        viewOrderReceipt(receiptBtn.dataset.orderId);
        return;
    }
    const detailsBtn = event.target.closest('.view-details-btn');
    if (detailsBtn) {
        const d = detailsBtn.dataset;
        viewOrderDetails(d.orderId, d.orderDate, d.orderStatus, d.subtotal, d.vat, d.total);
    }
});

function viewOrderDetails(orderId, orderDate, status, subtotal, vat, total) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'order-details-modal';
    
    const dateObj = new Date(orderDate);
    const formattedDate = dateObj.toLocaleString();
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Order Details</h2>
                <button class="modal-close" onclick="closeModal('order-details-modal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="order-details-info">
                    <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
                    <p><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${escapeHtml(status.toLowerCase())}">${escapeHtml(status)}</span></p>
                </div>
                <div class="order-details-breakdown">
                    <div class="breakdown-item">
                        <span>Subtotal:</span>
                        <strong>£${parseFloat(subtotal).toFixed(2)}</strong>
                    </div>
                    <div class="breakdown-item">
                        <span>VAT (20%):</span>
                        <strong>£${parseFloat(vat).toFixed(2)}</strong>
                    </div>
                    <div class="breakdown-item total">
                        <span>Total:</span>
                        <strong>£${parseFloat(total).toFixed(2)}</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('order-details-modal')">Close</button>
                <button class="btn-primary view-receipt-btn" data-order-id="${escapeHtml(orderId)}">View Full Receipt</button>
            </div>
        </div>
    `;

    // Delegated rather than a second onclick="viewOrderReceipt('${orderId}')" — same
    // reasoning as the table's action buttons above.
    modal.addEventListener('click', function(event) {
        const receiptBtn = event.target.closest('.view-receipt-btn');
        if (receiptBtn) { viewOrderReceipt(receiptBtn.dataset.orderId); }
    });

    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

async function viewOrderReceipt(orderId) {
    console.log('viewOrderReceipt called with orderId:', orderId);
    showLoadingOverlay();

    const User = get_localStorage('user');
    const Token = get_localStorage('token');
    
    if (!User || !Token) {
        hideLoadingOverlay();
        showToast('Not authenticated', 'error');
        return;
    }

    try {
        const jsonData = await apiCall('getreceipt', { order_id: orderId });

        if (jsonData.error) {
            showToast(jsonData.error, 'error');
            return;
        }

        await displayReceipt(jsonData);
    } catch (error) {
        console.error('Error loading receipt:', error);
        showToast('Error loading receipt: ' + error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function displayReceipt(receiptData) {
    try {
        console.log('displayReceipt called with data:', !!receiptData);
    // Reuses printer.js's cached config (loaded once, same "Boudica POS"/localhost:8001
    // fallback) rather than duplicating the fetch — was hardcoded "The Curiosity Cabins",
    // a leftover from a specific prior deployment (CODE_VERIFIED_AUDIT.md §10).
    const printerConfig = await loadPrinterConfig();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'receipt-modal';
    
    const items = receiptData.items || [];
    const total = parseFloat(receiptData.total || 0).toFixed(2);
    const subtotal = parseFloat(receiptData.subtotal || 0).toFixed(2);
    const vat = parseFloat(receiptData.vat_amount || 0).toFixed(2);
    const vatRate = receiptData.vat_rate_percent || 20;

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `<tr>
            <td>${escapeHtml(item.description)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>£${parseFloat(item.price).toFixed(2)}</td>
            <td>£${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
        </tr>`;
    });

    modal.innerHTML = `
        <div class="modal-content receipt-modal-content">
            <div class="modal-header">
                <h2>Order Receipt</h2>
                <button class="modal-close" onclick="closeModal('receipt-modal')">&times;</button>
            </div>
            <div class="modal-body receipt-content">
                <div class="receipt-header">
                    <h3>${escapeHtml(printerConfig.storeName)}</h3>
                    <p>Professional Receipt</p>
                </div>
                
                <div class="receipt-details">
                    <p><strong>Order ID:</strong> ${escapeHtml(receiptData.order_id)}</p>
                    <p><strong>Date:</strong> ${new Date(receiptData.order_date).toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${escapeHtml(receiptData.payment_method)}</p>
                    <p><strong>Status:</strong> ${escapeHtml(receiptData.order_status)}</p>
                </div>
                
                <table class="receipt-items">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="receipt-totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>£${subtotal}</span>
                    </div>
                    <div class="total-row">
                        <span>VAT (${vatRate}%):</span>
                        <span>£${vat}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span><strong>TOTAL:</strong></span>
                        <span><strong>£${total}</strong></span>
                    </div>
                </div>
                
                <div class="receipt-footer">
                    <p>Thank you for your purchase</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('receipt-modal')">Close</button>
                <button class="btn-primary print-receipt-btn" data-order-id="${escapeHtml(receiptData.order_id)}">🖨️ Print</button>
                <button class="btn-primary download-receipt-btn" data-order-id="${escapeHtml(receiptData.order_id)}">📥 PDF</button>
            </div>
        </div>
    `;

    // Delegated rather than embedding receiptData.order_id into an inline onclick's JS
    // string literal — same reasoning as the other action buttons in this file.
    modal.addEventListener('click', function(event) {
        const printBtn = event.target.closest('.print-receipt-btn');
        if (printBtn) { printOrderReceipt(printBtn.dataset.orderId); return; }
        const downloadBtn = event.target.closest('.download-receipt-btn');
        if (downloadBtn) { downloadReceiptPDF(downloadBtn.dataset.orderId); }
    });

    document.body.appendChild(modal);
    console.log('Modal appended to DOM. ID:', modal.id);
    console.log('Modal in DOM now?', !!document.getElementById('receipt-modal'));
    modal.style.display = 'flex';
    } catch (error) {
        console.error('Error in displayReceipt:', error);
        showToast('Error displaying receipt', 'error');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

function printOrderReceipt(orderId) {
    const modal = document.getElementById('receipt-modal');
    console.log('Modal found:', !!modal);
    if (modal) {
        console.log('Modal HTML:', modal.innerHTML.substring(0, 300));
        console.log('Modal classes:', modal.className);
        console.log('Modal children:', modal.children.length);
        const allDivs = modal.querySelectorAll('div');
        console.log('All divs in modal:', allDivs.length);
        allDivs.forEach((div, i) => console.log(`  Div ${i}:`, div.className));
    }
    
    const receiptContent = modal ? modal.querySelector('.receipt-content') : null;
    console.log('Receipt content found:', !!receiptContent);
    
    if (!receiptContent) {
        // Try to find it by modal-body instead
        const modalBody = modal ? modal.querySelector('.modal-body') : null;
        console.log('Modal-body found:', !!modalBody);
        if (modalBody) {
            console.log('Using modal-body instead');
            const printWindow = window.open('', '', 'width=600,height=800');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt - ${escapeHtml(orderId)}</title>
                    <style>
                        body { font-family: Courier New, monospace; padding: 20px; }
                        .receipt-header { text-align: center; margin-bottom: 20px; }
                        .receipt-details { font-size: 12px; margin-bottom: 20px; }
                        .receipt-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .receipt-items th, .receipt-items td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
                        .receipt-totals { margin-bottom: 20px; }
                        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
                        .grand-total { font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; }
                        .receipt-footer { text-align: center; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    ${modalBody.innerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
            return;
        }
        showToast('Receipt content not found', 'error');
        return;
    }    
    const printWindow = window.open('', '', 'width=600,height=800');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${escapeHtml(orderId)}</title>
            <style>
                body { font-family: Courier New, monospace; padding: 20px; }
                .receipt-header { text-align: center; margin-bottom: 20px; }
                .receipt-details { font-size: 12px; margin-bottom: 20px; }
                .receipt-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .receipt-items th, .receipt-items td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
                .receipt-totals { margin-bottom: 20px; }
                .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
                .grand-total { font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; }
                .receipt-footer { text-align: center; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            ${receiptContent.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function downloadReceiptPDF(orderId) {
    showToast('PDF download feature coming soon', 'info');
    // TODO: Implement PDF download using html2pdf library
}

// Allow viewing order history from orders tab
document.addEventListener('DOMContentLoaded', function() {
    const orderEmailInput = document.getElementById('order-customer-email');
    if (orderEmailInput) {
        // Allow Enter key to search
        orderEmailInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                loadOrderHistory();
            }
        });
    }
});
