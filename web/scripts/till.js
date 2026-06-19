
let interval;
let barcode;
let currentSaleItems = [];
let lastSaleDetails = null;

document.getElementById('till').addEventListener('keyup', async function(ev) {
    ev.preventDefault();
    if ( interval ) {
        clearInterval(interval);
    }
    if ( ev.key === 'Tab' ) {
        if ( barcode) {
            handleBarCode(barcode);
        }
        barcode = '';
        return;
    }
    if ( EventTarget.code != 'Shift') {
         barcode += ev.key;
    }
    interval = setInterval(() => barcode = '', 20);
});

async function handleBarCode(scanned_barcode) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    showToast(`Looking up barcode: ${scanned_barcode}`, 'info');
    let response = await fetch(`${PGBC_Agents}?username=${User}&command=getdetails&password=${Password}&barcode=${scanned_barcode}`);
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
                showToast('Please manually add the price of the item', 'error');   
            } else {
                addItemToReceipt(json.description, json.rs_price, scanned_barcode);
            }
        } catch {/** Do nothing it is the expected result */}
        return;
    }
    showToast('Sorry the service is currently unavailable. Please retry', 'error');
}

// Make this function globally available for other scripts like product_lookup.js
window.addItemToReceipt = function(description, price, barcode = null, isManualEntry = false) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return;

    // Find an existing item to group with, but only if it's not a manual entry.
    // If isManualEntry is true, we always create a new item.
    const existingItem = isManualEntry
        ? null
        : currentSaleItems.find(
            item => !item.isRefund && ((barcode && item.barcode === barcode) || (!barcode && item.originalDescription === description))
          );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        const item = {
            description: description,
            originalDescription: description,
            price: Math.abs(parsedPrice),
            barcode: barcode,
            isRefund: false,
            quantity: 1
        };
        currentSaleItems.push(item);
    }
    renderReceipt();
};

function renderReceipt() {
    const receiptItemsList = document.getElementById('receipt-items');
    const subtotalAmountSpan = document.getElementById('receipt-subtotal-amount');
    const totalAmountSpan = document.getElementById('receipt-total-amount');
    const taxAmountSpan = document.getElementById('receipt-tax-amount');
    const tillUserNameDisplay = document.getElementById('till-user-name-display');

    if (tillUserNameDisplay) {
        const userEmail = get_localStorage('user');
        if (userEmail) {
            // Take the part of the email before the '@' and capitalize it for a clean look.
            const userName = userEmail.split('@')[0];
            const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
            tillUserNameDisplay.textContent = `operator ${formattedName}`;
        } else {
            // If no user is logged in, keep it empty.
            tillUserNameDisplay.textContent = '';
        }
    }

    if (!receiptItemsList || !totalAmountSpan || !taxAmountSpan) {
        console.error('Receipt elements not found!');
        return;
    }

    // Clear current list
    receiptItemsList.innerHTML = '';

    let total = 0;
    let subtotal = 0;
    let tax = 0;

    // Add items to list
    currentSaleItems.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'receipt-item';
        listItem.dataset.index = index;
        
        if (item.isRefund) {
            listItem.classList.add('is-refund');
        }

        const descSpan = document.createElement('span');
        descSpan.className = 'receipt-item-desc';
        const quantityText = item.quantity > 1 ? `${item.quantity}x ` : '';
        descSpan.textContent = `${quantityText}${item.description}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'receipt-item-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.dataset.action = 'remove-item';
        removeBtn.title = 'Remove Item';

        const refundBtn = document.createElement('button');
        refundBtn.className = 'receipt-item-refund-btn';
        refundBtn.textContent = '⮌';
        refundBtn.dataset.action = 'refund-item';
        refundBtn.dataset.index = index;
        refundBtn.title = 'Toggle Refund';

        const priceSpan = document.createElement('span');
        priceSpan.className = 'receipt-item-price';
        const lineTotal = item.price * item.quantity;
        priceSpan.textContent = `£${lineTotal.toFixed(2)}`;

        listItem.appendChild(descSpan);
        listItem.appendChild(priceSpan);
        listItem.appendChild(removeBtn);
        listItem.appendChild(refundBtn);
        receiptItemsList.appendChild(listItem);
        
        total += (item.price * item.quantity);
    });

    // Calculate subtotal and tax
    // Tax is back-calculated from total: tax = total * rate / (1 + rate)
    tax = total - (total / (1 + (TAX_RATE / 100)));
    subtotal = total - tax;

    // Update display elements
    const totalLabel = document.querySelector('.receipt-total strong');

    if (total < 0) {
        totalLabel.textContent = 'Refund Due:';
        if (subtotalAmountSpan) subtotalAmountSpan.textContent = `£${(-subtotal).toFixed(2)}`;
        totalAmountSpan.textContent = `£${(-total).toFixed(2)}`;
        taxAmountSpan.textContent = `£${(-tax).toFixed(2)}`; // Show tax as a positive value being refunded
    } else {
        totalLabel.textContent = 'Total:';
        if (subtotalAmountSpan) subtotalAmountSpan.textContent = `£${subtotal.toFixed(2)}`;
        totalAmountSpan.textContent = `£${total.toFixed(2)}`;
        taxAmountSpan.textContent = `£${tax.toFixed(2)}`;
    }
}

function removeItemFromSale(index) {
    if (index < 0 || index >= currentSaleItems.length) return;

    const itemToRemove = currentSaleItems[index];

    // Check if the item being removed is a product (not a discount) and if the next item is its discount.
    const isProduct = !itemToRemove.originalDescription?.includes('Discount');

    if (isProduct && (index + 1) < currentSaleItems.length) {
        const nextItem = currentSaleItems[index + 1];
        if (nextItem.price < 0 && nextItem.originalDescription?.includes('Discount')) {
            // Remove both the item and its discount.
            currentSaleItems.splice(index, 2);
        } else {
            // Just remove the single item.
            currentSaleItems.splice(index, 1);
        }
    } else {
        // The item is a discount itself, or it's the last item on the receipt.
        currentSaleItems.splice(index, 1);
    }
    renderReceipt();
}

function clearSale() {
    currentSaleItems = [];
    renderReceipt();
    // Reset the keypad display using the new global function from keypad.js
    if (typeof window.resetKeypadDisplay === 'function') {
        window.resetKeypadDisplay();
    } else {
        document.getElementById('keypad-display').innerText = '0'; // Fallback
    }
}

function toggleRefundState(index) {
    if (index < 0 || index >= currentSaleItems.length) return;

    const item = currentSaleItems[index];

    // Don't allow refunding a discount item.
    if (item.originalDescription?.includes('Discount')) {
        showToast('Cannot refund a discount item.', 'error');
        return;
    }

    item.isRefund = !item.isRefund;

    if (item.isRefund) {
        item.price = -Math.abs(item.price);
        item.description = `${item.originalDescription} (Refund)`;
    } else {
        item.price = Math.abs(item.price);
        item.description = item.originalDescription;
    }

    // If an item has a discount, it should be removed when the refund state is toggled.
    const nextItemIndex = index + 1;
    if (nextItemIndex < currentSaleItems.length) {
        const nextItem = currentSaleItems[nextItemIndex];
        if (nextItem.price < 0 && nextItem.originalDescription?.includes('Discount')) {
            currentSaleItems.splice(nextItemIndex, 1);
            showToast('Discount removed from item.', 'info');
        }
    }

    renderReceipt();
}

function applyPercentageDiscount(percentage) {
    const percentageValue = parseFloat(percentage);
    if (isNaN(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
        showToast('Please enter a valid percentage (1-100).', 'error');
        return;
    }

    if (currentSaleItems.length === 0) {
        showToast('Add an item before applying a discount.', 'info');
        return;
    }

    const lastItemIndex = currentSaleItems.length - 1;
    const lastItem = currentSaleItems[lastItemIndex];

    // Prevent applying a discount to a refunded item, another discount, or a zero/negative priced item.
    if (lastItem.isRefund || lastItem.originalDescription?.includes('Discount')) {
        showToast('Cannot apply a discount to this item.', 'error');
        return;
    }

    const discountAmount = (lastItem.price * lastItem.quantity) * (percentageValue / 100);

    // Insert a new discount item right after the item it applies to.
    const discountItem = { 
        description: `  - ${percentageValue}% Discount`, 
        price: -discountAmount,
        quantity: 1,
        isRefund: false // A discount is not a refundable item
    };
    discountItem.originalDescription = discountItem.description; // For consistency
    currentSaleItems.splice(lastItemIndex + 1, 0, discountItem);
    renderReceipt();

    showToast(`Applied ${percentageValue}% discount.`, 'success');
    if (typeof window.resetKeypadDisplay === 'function') {
        window.resetKeypadDisplay();
    } else {
        document.getElementById('keypad-display').innerText = '0';
    }
}

function overrideLastItemPrice(newPrice) {
    if (currentSaleItems.length === 0) {
        showToast('Add an item before overriding the price.', 'info');
        return;
    }

    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue < 0) {
        showToast('Please enter a valid price.', 'error');
        return;
    }

    // Find the last item that is a product (not a discount)
    let lastItemIndex = -1;
    for (let i = currentSaleItems.length - 1; i >= 0; i--) {
        if (!currentSaleItems[i].originalDescription?.includes('Discount')) {
            lastItemIndex = i;
            break;
        }
    }

    if (lastItemIndex === -1) {
        showToast('No item available to override price.', 'error');
        return;
    }
    
    const item = currentSaleItems[lastItemIndex];
    const originalPrice = item.price;

    // If the item was a refund, keep it a refund but with the new price
    if (item.isRefund) {
        item.price = -Math.abs(priceValue);
    } else {
        item.price = Math.abs(priceValue);
    }

    // If the item had a discount applied, remove it as it's no longer valid.
    if ((lastItemIndex + 1) < currentSaleItems.length && currentSaleItems[lastItemIndex + 1].originalDescription?.includes('Discount')) {
        currentSaleItems.splice(lastItemIndex + 1, 1);
        showToast('Existing discount removed due to price override.', 'info');
    }

    renderReceipt();
    showToast(`Price updated from £${originalPrice.toFixed(2)} to £${priceValue.toFixed(2)}.`, 'success');
    if (typeof window.resetKeypadDisplay === 'function') {
        window.resetKeypadDisplay();
    } else {
        document.getElementById('keypad-display').innerText = '0';
    }
}

function handleManualEntry() {
    const display = document.getElementById('keypad-display');
    const enteredValue = parseFloat(display.innerText);

    if (enteredValue > 0) {
        // Pass a 'true' flag for isManualEntry to ensure it's treated as a distinct item.
        addItemToReceipt('Product', enteredValue, null, true);
        // Reset the keypad display using the new global function from keypad.js
        if (typeof window.resetKeypadDisplay === 'function') {
            window.resetKeypadDisplay();
        } else {
            display.innerText = '0'; // Fallback
        }
    }
}

function setLastItemQuantity(quantity) {
    if (currentSaleItems.length === 0) {
        showToast("No item to set quantity for.", "info");
        return;
    }

    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity <= 0) {
        showToast("Please enter a valid quantity.", "error");
        return;
    }

    let lastProductIndex = -1;
    // Find the last item that is not a refund and not a discount.
    for (let i = currentSaleItems.length - 1; i >= 0; i--) {
        const item = currentSaleItems[i];
        if (!item.isRefund && !item.originalDescription?.includes('Discount')) {
            lastProductIndex = i;
            break;
        }
    }

    if (lastProductIndex === -1) {
        showToast("No item to set quantity for.", "info");
        return;
    }

    const itemToUpdate = currentSaleItems[lastProductIndex];
    const oldQuantity = itemToUpdate.quantity;
    itemToUpdate.quantity = numQuantity;

    // Check if there is a discount applied to this item and update it.
    const nextItemIndex = lastProductIndex + 1;
    if (nextItemIndex < currentSaleItems.length) {
        const nextItem = currentSaleItems[nextItemIndex];
        if (nextItem.price < 0 && nextItem.originalDescription?.includes('Discount')) {
            // The discount price was for the old quantity. We need to adjust it for the new quantity.
            nextItem.price = (nextItem.price / oldQuantity) * numQuantity;
        }
    }

    renderReceipt();
    showToast(`Quantity for ${itemToUpdate.originalDescription} set to ${numQuantity}.`, 'success');
    if (typeof window.resetKeypadDisplay === 'function') {
        window.resetKeypadDisplay();
    } else {
        document.getElementById('keypad-display').innerText = '0';
    }
}

function printLastReceipt() {
    if (!lastSaleDetails) {
        showToast('No previous sale to print.', 'info');
        return;
    }

    if (typeof printReceipt === 'function') {
        printReceipt(
            lastSaleDetails.items,
            lastSaleDetails.total,
            lastSaleDetails.tax,
            lastSaleDetails.paymentMethod,
            lastSaleDetails.cashTendered,
            lastSaleDetails.changeDue
        );
    } else {
        showToast('Printing function is not available.', 'error');
        console.error('printReceipt function not found.');
    }
}

async function handlePayment(method, cashTendered = null) {
    const total = currentSaleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (currentSaleItems.length > 0) {
        // Handle card payment via Stripe
        if (method === "Card") {
            if (typeof window.tillCardPayment === 'undefined' || typeof window.tillCardPayment.openCardPaymentModal !== 'function') {
                showToast('Card payment module not loaded. Please refresh the page.', 'error');
                return;
            }
            
            const operatorId = get_localStorage('user') || 'unknown';
            const reference = 'TILL_' + Date.now();
            
            try {
                window.tillCardPayment.openCardPaymentModal(total, operatorId, reference);
                // The payment module will handle the rest
                return;
            } catch (error) {
                showToast('Error opening card payment: ' + error.message, 'error');
                return;
            }
        }

        // Handle stock updates for any refunded items
        await updateStockForTransaction(currentSaleItems, method);

        if (total !== 0) {
            const tax = total - (total / (1 + (TAX_RATE / 100)));
            let changeDue = 0;
            if (method === "Cash" && cashTendered !== null && total > 0) {
                changeDue = cashTendered - total;
            }

            // Store details for re-printing
            lastSaleDetails = {
                items: JSON.parse(JSON.stringify(currentSaleItems)), // Deep copy of items
                total: total,
                tax: tax,
                paymentMethod: method,
                cashTendered: cashTendered,
                changeDue: changeDue
            };

            // Automatically print the receipt
            if (typeof printReceipt === 'function') {
                printReceipt(
                    lastSaleDetails.items,
                    lastSaleDetails.total,
                    lastSaleDetails.tax,
                    lastSaleDetails.paymentMethod,
                    lastSaleDetails.cashTendered,
                    lastSaleDetails.changeDue
                );
            } else {
                showToast('Printing function is not available.', 'error');
            }

            if (total > 0) {
                 showToast(`Sale complete. Change due: £${changeDue.toFixed(2) || 0.00}`, 'success');
            } else {
                 showToast(`Refund of £${(-total).toFixed(2)} processed.`, 'success');
            }
        } else {
            showToast('Even exchange completed.', 'success');
        }

        // After the transaction is processed and the receipt is printed, clear the sale for the next customer.
        clearSale();
    } else {
        showToast('No items in the current sale.', 'info');
    }
}

async function updateStockForTransaction(items, method) {
    // Filter for items sold (positive price) and items refunded (negative price).
    // This now includes items without a barcode, such as manual entries.
    const soldItems = items.filter(item => item.price > 0);
    const refundedItems = items.filter(item => item.price < 0);

    const stockPromises = [];

    if (soldItems.length > 0) {
        showToast(`Updating stock for ${soldItems.length} sold item(s)...`, 'info');
        soldItems.forEach(item => {
            stockPromises.push(removeFromStock(item.barcode, item.quantity, item.price, method));
        });
    }

    if (refundedItems.length > 0) {
        showToast(`Restocking ${refundedItems.length} refunded item(s)...`, 'info');
        refundedItems.forEach(item => {
            stockPromises.push(restockItem(item.barcode, item.quantity));
        });
    }

    if (stockPromises.length === 0) return;

    try {
        await Promise.all(stockPromises);
        showToast('Stock levels updated successfully.', 'success');
    } catch (error) {
        console.error('One or more stock updates failed:', error);
        showToast('Error updating stock levels. Please check manually.', 'error');
    }
}

async function removeFromStock(barcode, quantity, price, method) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) throw new Error("User not logged in");
    if ( !barcode ) { barcode = 'manual sale'; }

    const params = new URLSearchParams({ username: User, password: Password, command: 'sellitem', quantity: quantity.toString(), barcode: barcode, price: price.toString(), type: method });
    let updateStockResponse = await fetch(`${PGBC_Agents}?${params.toString()}`);
    if (!updateStockResponse.ok) throw new Error(`Failed to update stock for ${barcode}`);
}

async function restockItem(barcode, quantity) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) throw new Error("User not logged in");
    // To add an item back to stock (refund), the API expects a negative quantity.
    const apiQuantity = -Math.abs(quantity);
    const apiBarcode = barcode || 'manual refund'; // Handle manual refunds

    const params = new URLSearchParams({ username: User, password: Password, command: 'updatestock', quantity: apiQuantity.toString(), barcode: apiBarcode });
    let updateStockResponse = await fetch(`${PGBC_Agents}?${params.toString()}`);
    if (!updateStockResponse.ok) throw new Error(`Failed to update stock for ${apiBarcode}`);
}

async function loadWorkshops() {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    
    try {
        const response = await fetch(`${PGBC_Agents}?username=${User}&command=getworkshops&password=${Password}`, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (response.status !== 200) {
            console.error('Failed to fetch workshops');
            return;
        }
        
        const responseText = await response.text();
        if (DEBUG) {
            console.log('Workshops response:', responseText);
        }
        
        const endIndex = responseText.indexOf("}]}") + 3;
        const jsonStr = responseText.substring(0, endIndex);
        
        const json = JSON.parse(jsonStr);
        
        if (json.error || !json.workshops) {
            console.error('Error fetching workshops:', json.error);
            return;
        }
        
        const quickAddGrid = document.querySelector('.quick-add-grid');
        if (!quickAddGrid) {
            console.error('Quick add grid not found');
            return;
        }
        
        // Clear existing buttons
        quickAddGrid.innerHTML = '';
        
        // Add workshop buttons
        json.workshops.forEach(workshop => {
            const button = document.createElement('button');
            button.className = 'quick-add-btn';
            button.dataset.description = workshop.title;
            button.dataset.price = workshop.price;
            
            // Format date - extract just YYYY-MM-DD
            const dateStr = workshop.when_date.substring(0, 10);
            const price = parseFloat(workshop.price).toFixed(2);
            
            // Create multi-line button content
            button.innerHTML = `
                <div class="workshop-btn-content">
                    <div class="workshop-title">${workshop.title}</div>
                    <div class="workshop-info">
                        <span class="workshop-date">${dateStr}</span>
                        <span class="workshop-price">£${price}</span>
                    </div>
                </div>
            `;
            
            quickAddGrid.appendChild(button);
        });
        
        if (json.workshops.length === 0) {
            const noWorkshops = document.createElement('p');
            noWorkshops.textContent = 'No upcoming workshops';
            noWorkshops.style.gridColumn = 'span 2';
            noWorkshops.style.textAlign = 'center';
            noWorkshops.style.color = 'var(--text-dark)';
            quickAddGrid.appendChild(noWorkshops);
        }
    } catch (error) {
        console.error('Error loading workshops:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const tillTab = document.getElementById('till');
    if (!tillTab) return;

    // Load workshops from database
    await loadWorkshops();

    // Use event delegation to handle clicks on buttons within the till
    tillTab.addEventListener('click', async function(event) {
        const target = event.target.closest('button'); // Find the button that was clicked
        if (!target) return;

        const action = target.dataset.action;
        const method = target.dataset.method;

        if (action === 'multiply') { // This is the 'x' button for quantity
            setLastItemQuantity(parseFloat(document.getElementById('keypad-display').innerText));
        } else if (action === 'enter') {
            handleManualEntry();
        } else if (action === 'clear') {
            clearSale();
        } else if (method) { // This is a payment button
            await handlePayment(method, parseFloat(document.getElementById('keypad-display').innerText));
        } else if (action === 'discount') { // This is the discount button
            const percentage = document.getElementById('keypad-display').innerText;
            applyPercentageDiscount(percentage);
        } else if (action === 'price-override') {
            const newPrice = document.getElementById('keypad-display').innerText;
            overrideLastItemPrice(newPrice);
        } else if (action === 'refund-item') {
            toggleRefundState(parseInt(target.dataset.index, 10));
        } else if (action === 'remove-item') {
            const listItem = target.closest('.receipt-item');
            if (listItem && listItem.dataset.index) {
                removeItemFromSale(parseInt(listItem.dataset.index, 10));
            }
        } else if (action === 'print-receipt') {
            printLastReceipt();
        }
    });

    tillTab.addEventListener('click', function(event) {
        const quickAddBtn = event.target.closest('.quick-add-btn');
        if (quickAddBtn) {
            addItemToReceipt(quickAddBtn.dataset.description, quickAddBtn.dataset.price);
        }
    });
});