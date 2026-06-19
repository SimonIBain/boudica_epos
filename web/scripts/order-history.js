// Order History and Receipt functionality for Till Dashboard

async function loadOrderHistory() {
    const customerEmail = document.getElementById('order-customer-email').value;
    
    if (!customerEmail || customerEmail.trim() === '') {
        showToast('Please enter a customer email', 'warning');
        return;
    }

    showLoadingOverlay();

    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    
    if (!User || !Password) {
        hideLoadingOverlay();
        showToast('Not authenticated', 'error');
        return;
    }

    try {
        const params = new URLSearchParams({
            username: User,
            password: Password,
            command: 'orderhistory',
            email: customerEmail
        });

        let response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let responseText = await response.text();
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            if (jsonData.error) {
                showToast(jsonData.error, 'error');
                document.getElementById('orders-container').innerHTML = '<p>No orders found for this customer</p>';
                return;
            }

            displayOrderHistory(jsonData);
        }
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
        
        html += `<tr>
            <td><strong>${order.order_id}</strong></td>
            <td>${orderDate}</td>
            <td><span class="status-badge ${order.order_status.toLowerCase()}">${order.order_status}</span></td>
            <td>${order.payment_method}</td>
            <td>£${subtotal}</td>
            <td>£${vat} (20%)</td>
            <td><strong>£${total}</strong></td>
            <td>
                <button class="action-btn" onclick="viewOrderReceipt('${order.order_id}')">🖨️ Receipt</button>
                <button class="action-btn" onclick="viewOrderDetails('${order.order_id}', '${order.order_date}', '${order.order_status}', ${subtotal}, ${vat}, ${total})">📋 Details</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

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
                    <p><strong>Order ID:</strong> ${orderId}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${status.toLowerCase()}">${status}</span></p>
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
                <button class="btn-primary" onclick="viewOrderReceipt('${orderId}')">View Full Receipt</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

async function viewOrderReceipt(orderId) {
    console.log('viewOrderReceipt called with orderId:', orderId);
    showLoadingOverlay();

    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    
    if (!User || !Password) {
        hideLoadingOverlay();
        showToast('Not authenticated', 'error');
        return;
    }

    try {
        const params = new URLSearchParams({
            username: User,
            password: Password,
            command: 'getreceipt',
            order_id: orderId
        });

        let response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let responseText = await response.text();
        console.log('Response received, length:', responseText.length);
        console.log('Response text:', responseText.substring(0, 500));
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        console.log('jsonMatch:', !!jsonMatch);
        
        if (jsonMatch) {
            console.log('JSON extracted, attempting parse...');
            try {
                const jsonData = JSON.parse(jsonMatch[0]);
                console.log('JSON parsed successfully');
                console.log('jsonData keys:', Object.keys(jsonData));
                console.log('has error?', !!jsonData.error);
                console.log('has items?', !!jsonData.items, jsonData.items ? jsonData.items.length : 'N/A');
                
                if (jsonData.error) {
                    console.log('ERROR in response:', jsonData.error);
                    showToast(jsonData.error, 'error');
                    return;
                }

                console.log('About to call displayReceipt with:', jsonData);
                displayReceipt(jsonData);
                console.log('displayReceipt returned');
            } catch (parseError) {
                console.error('JSON.parse() failed:', parseError);
                console.error('String that failed to parse:', jsonMatch[0].substring(0, 200));
                throw parseError;
            }
        } else {
            console.log('No JSON match found in response');
        }
    } catch (error) {
        console.error('Error loading receipt:', error);
        showToast('Error loading receipt: ' + error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function displayReceipt(receiptData) {
    try {
        console.log('displayReceipt called with data:', !!receiptData);
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
            <td>${item.description}</td>
            <td>${item.quantity}</td>
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
                    <h3>The Curiosity Cabins</h3>
                    <p>Professional Receipt</p>
                </div>
                
                <div class="receipt-details">
                    <p><strong>Order ID:</strong> ${receiptData.order_id}</p>
                    <p><strong>Date:</strong> ${new Date(receiptData.order_date).toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${receiptData.payment_method}</p>
                    <p><strong>Status:</strong> ${receiptData.order_status}</p>
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
                <button class="btn-primary" onclick="printOrderReceipt('${receiptData.order_id}')">🖨️ Print</button>
                <button class="btn-primary" onclick="downloadReceiptPDF('${receiptData.order_id}')">📥 PDF</button>
            </div>
        </div>
    `;
    
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
                    <title>Receipt - ${orderId}</title>
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
            <title>Receipt - ${orderId}</title>
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
