import Toast from './toast.js';
import * as StripeCheckout from './stripe-checkout.js';

document.addEventListener('DOMContentLoaded', () => {
    const cartList = document.getElementById('cart-list');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const buyNowBtn = document.getElementById('buy-now-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const paymentModal = document.getElementById('payment-modal');
    const paymentModalClose = document.getElementById('payment-modal-close');
    const sumupCardContainer = document.getElementById('sumup-card');
    const customerEmailInput = document.getElementById('customer-email');
    const toast = Toast();

    // ============ CART MANAGEMENT FUNCTIONS ============

    // Get all saved carts
    function getSavedCarts() {
        const carts = localStorage.getItem('savedCarts');
        return carts ? JSON.parse(carts) : {};
    }

    // Save named cart
    function saveNamedCart(name, cart) {
        const carts = getSavedCarts();
        carts[name] = {
            items: cart,
            created: new Date().toISOString(),
            itemCount: cart.length,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };
        localStorage.setItem('savedCarts', JSON.stringify(carts));
        return true;
    }

    // Delete named cart
    function deleteNamedCart(name) {
        const carts = getSavedCarts();
        delete carts[name];
        localStorage.setItem('savedCarts', JSON.stringify(carts));
        return true;
    }

    // Load named cart
    function loadNamedCart(name) {
        const carts = getSavedCarts();
        if (carts[name]) {
            saveCart(carts[name].items);
            displayCart();
            toast.showToast(`Loaded cart: ${name}`, 'success');
            return true;
        }
        return false;
    }

    // Get wishlist
    function getWishlist() {
        const wishlist = localStorage.getItem('wishlist');
        return wishlist ? JSON.parse(wishlist) : [];
    }

    // Add to wishlist
    function addToWishlist(item) {
        const wishlist = getWishlist();
        const exists = wishlist.find(w => w.id === item.id);
        if (!exists) {
            wishlist.push({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                added: new Date().toISOString()
            });
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            toast.showToast(`${item.name} added to wishlist!`, 'success');
            return true;
        }
        return false;
    }

    // Remove from wishlist
    function removeFromWishlist(itemId) {
        let wishlist = getWishlist();
        wishlist = wishlist.filter(w => w.id !== itemId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        return true;
    }

    // Add wishlist item to cart
    function addWishlistItemToCart(itemId) {
        const wishlist = getWishlist();
        const item = wishlist.find(w => w.id === itemId);
        if (item) {
            const cart = getCart();
            const existingItem = cart.find(c => c.id === item.id);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    image: item.image
                });
            }
            saveCart(cart);
            removeFromWishlist(itemId);
            displayCart();
            toast.showToast(`${item.name} added to cart from wishlist!`, 'success');
            return true;
        }
        return false;
    }

    // Validate cart inventory
    async function validateCartInventory(cartItems) {
        try {
            const itemsArray = cartItems.map(item => ({
                barcode: item.id,
                quantity: item.quantity.toString()
            }));
            const itemsJson = JSON.stringify(itemsArray);

            const params = new URLSearchParams({
                username: 'web_store_user',
                password: 'web_store_pass',
                command: 'validatecart',
                items: itemsJson
            });

            const response = await fetch(`https://demo.pgbc.ai/cgi-bin/boudica_pos?${params.toString()}`);
            if (!response.ok) {
                console.error('Validation failed:', response.status);
                return { valid: false, items: [] };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error validating cart:', error);
            return { valid: false, items: [] };
        }
    }

    // ============ ORIGINAL CART FUNCTIONS ============

    // Function to retrieve cart from local storage
    function getCart() {
        const cartData = localStorage.getItem('cart');
        return cartData ? JSON.parse(cartData) : [];
    }

    // Function to save cart to local storage
    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Function to display cart items
    function displayCart() {
        const cart = getCart();
        if (!cartList) return;
        if (cart.length === 0) {
            cartList.innerHTML = '<p class="empty-cart-message">Your cart is empty.</p>';
            if (buyNowBtn) buyNowBtn.style.display = 'none';
            if (clearCartBtn) clearCartBtn.style.display = 'none';
        } else {
            if (buyNowBtn) buyNowBtn.style.display = 'inline-block';
            if (clearCartBtn) clearCartBtn.style.display = 'inline-block';
            cartList.innerHTML = cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <p class="product-price">£${item.price.toFixed(2)} each</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrease-quantity" data-id="${item.id}">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}" readonly>
                        <button class="quantity-btn increase-quantity" data-id="${item.id}">+</button>
                    </div>
                    <div class="cart-item-subtotal">
                        <p>£${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}">Remove</button>
                </div>
            `).join('');
        }

        updateCartTotal(cart);
    }

    // Function to update cart total
    function updateCartTotal(cart) {
        if (!cartTotalPrice) return;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalPrice.textContent = `£${total.toFixed(2)}`;
    }

    function updateItemQuantity(productId, change) {
        let cart = getCart();
        const itemIndex = cart.findIndex(item => String(item.id) === productId);

        if (itemIndex > -1) {
            cart[itemIndex].quantity += change;

            if (cart[itemIndex].quantity <= 0) {
                const itemToRemove = cart[itemIndex];
                cart.splice(itemIndex, 1);
                toast.showToast(`${itemToRemove.name} removed from cart.`, 'info');
            }
            saveCart(cart);
            displayCart();
        }
    }

    // Event listener for all cart actions (increase, decrease, remove)
    cartList?.addEventListener('click', (e) => {
        const target = e.target;
        const productId = target.dataset.id;
        if (!productId) return;

        if (target.classList.contains('increase-quantity')) {
            updateItemQuantity(productId, 1);
        } else if (target.classList.contains('decrease-quantity')) {
            updateItemQuantity(productId, -1);
        } else if (target.classList.contains('cart-item-remove')) {
            updateItemQuantity(productId, -Infinity); // Set quantity to 0 or less to remove
        }
    });

    // Event listener for the "Clear Cart" button
    clearCartBtn?.addEventListener('click', () => {
        const cart = getCart();
        if (cart.length > 0) {
            if (confirm('Are you sure you want to remove all items from your cart?')) {
                saveCart([]); // Clear the cart
                displayCart(); // Re-render the empty cart view
                toast.showToast('Your cart has been cleared.', 'info');
            }
        }
    });

    // Initial display of cart items
    displayCart();

    /**
     * Simulates sending an email receipt.
     * @param {string} email The customer's email address.
     * @param {Array} cart The array of items in the cart.
     * @param {number} total The total cost of the order.
     */
    function sendReceipt(email, cart, total) {
        // --- IMPORTANT ---
        // In a real application, you would send this data to a secure backend server.
        // The backend would then use a service (like SendGrid, Mailgun, etc.)
        // to generate and email a proper HTML receipt to the customer.
        // Exposing email sending logic or API keys in the frontend is a security risk.

        const receiptBody = `
Thank you for your purchase from The Curiosity Cabins!

Order Summary:
${cart.map(item => `- ${item.name} (x${item.quantity}): £${(item.price * item.quantity).toFixed(2)}`).join('\n')}

--------------------
Total: £${total.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}

We've sent this confirmation to ${email}.
        `;

        console.log("--- SIMULATING EMAIL RECEIPT ---");
        console.log(`To: ${email}`);
        console.log("Subject: Your receipt from The Curiosity Cabins");
        console.log(receiptBody);
        console.log("--- END OF SIMULATION ---");
    }

    // Function to generate unique order ID
    function generateOrderId() {
        return 'WEB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    // Function to submit order to backend
    async function submitOrderToBackend(orderId, cartItems, total, customerEmail) {
        try {
            // Format cart items as JSON string for backend
            const itemsArray = cartItems.map(item => ({
                barcode: item.id,
                price: item.price.toString(),
                quantity: item.quantity.toString()
            }));
            const itemsJson = JSON.stringify(itemsArray);

            const params = new URLSearchParams({
                username: 'web_store_user',
                password: 'web_store_pass',
                command: 'webstoreorder',
                order_id: orderId,
                items: itemsJson,
                total: total.toFixed(2)
            });

            const response = await fetch(`https://demo.pgbc.ai/cgi-bin/boudica_pos?${params.toString()}`);
            if (!response.ok) {
                console.error('Order submission failed:', response.status);
                return { success: false, error: 'Failed to record order' };
            }

            const data = await response.json();
            if (data.response) {
                return { success: true, order_id: data.order_id };
            } else {
                return { success: false, error: data.error || 'Unknown error' };
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            return { success: false, error: error.message };
        }
    }

    // Function to show order confirmation
    function showOrderConfirmation(orderId, cart, total) {
        // Store order info for confirmation page
        localStorage.setItem('lastOrderId', orderId);
        localStorage.setItem('lastOrderTotal', total.toFixed(2));
        localStorage.setItem('lastOrderDate', new Date().toISOString());
        localStorage.setItem('lastOrderItems', JSON.stringify(cart));
        
        // Store customer email for future use
        const customerEmail = customerEmailInput ? customerEmailInput.value : '';
        if (customerEmail) {
            localStorage.setItem('customerEmail', customerEmail);
        }
        
        // Redirect to confirmation page
        setTimeout(() => {
            window.location.href = 'order-confirmation.html?order_id=' + orderId;
        }, 2000);
    }

    // --- Payment Modal and Stripe Integration ---

    function openPaymentModal() {
        StripeCheckout.openPaymentModal();
    }

    function closePaymentModal() {
        StripeCheckout.closePaymentModal();
    }

    function prepareOrderForPayment(orderId, cartItems, total, customerEmail) {
        // Save order details to localStorage for Stripe checkout
        localStorage.setItem('currentOrderId', orderId);
        localStorage.setItem('cartTotal', total.toFixed(2));
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        localStorage.setItem('customerEmail', customerEmail);
        
        // Calculate and update payment summary
        const vat = total * 0.20 / 1.20;
        const subtotal = total - vat;
        StripeCheckout.updatePaymentSummary(subtotal, vat, total);
    }

    buyNowBtn?.addEventListener('click', async () => {
        const cart = getCart();
        if (cart.length === 0) {
            toast.showToast('Your cart is empty!', 'info');
            return;
        }

        if (!customerEmailInput || !customerEmailInput.value.includes('@')) {
            toast.showToast('Please enter a valid email for your receipt.', 'info');
            customerEmailInput?.focus();
            return;
        }

        // Validate inventory before checkout
        toast.showToast('Validating inventory...', 'info');
        const validation = await validateCartInventory(cart);
        
        if (!validation.valid) {
            let errorMsg = 'Some items are out of stock:\n';
            if (validation.items && Array.isArray(validation.items)) {
                validation.items.forEach(item => {
                    if (!item.valid) {
                        errorMsg += `\n${item.description || item.barcode}: Only ${item.available} available (you have ${item.requested})`;
                    }
                });
            }
            toast.showToast(errorMsg, 'error');
            return;
        }

        // Proceed with Stripe payment
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderId = generateOrderId();
        const customerEmail = customerEmailInput.value;

        // Prepare order for payment
        prepareOrderForPayment(orderId, cart, total, customerEmail);

        // Submit order to backend first
        toast.showToast('Creating order...', 'info');
        const orderResult = await submitOrderToBackend(orderId, cart, total, customerEmail);
        
        if (!orderResult.success) {
            toast.showToast(`Failed to create order: ${orderResult.error}`, 'error');
            return;
        }

        // Open payment modal
        toast.showToast('Opening payment form...', 'info');
        openPaymentModal();
    });

    // Save current cart with a name
    document.getElementById('save-cart-btn')?.addEventListener('click', () => {
        const cartName = document.getElementById('save-cart-name')?.value.trim();
        if (!cartName) {
            toast.showToast('Please enter a name for your cart', 'info');
            return;
        }
        const cart = getCart();
        if (cart.length === 0) {
            toast.showToast('Your cart is empty!', 'info');
            return;
        }
        if (saveNamedCart(cartName, cart)) {
            toast.showToast(`Cart saved as "${cartName}"!`, 'success');
            document.getElementById('save-cart-name').value = '';
            updateSavedCartsList();
        }
    });

    // Manage carts page
    document.getElementById('manage-carts-btn')?.addEventListener('click', () => {
        window.location.href = 'cart-management.html';
    });

    // Manage wishlist page
    document.getElementById('manage-wishlist-btn')?.addEventListener('click', () => {
        window.location.href = 'cart-management.html?tab=wishlist';
    });

    // Function to update saved carts list display
    function updateSavedCartsList() {
        const carts = getSavedCarts();
        const cartsList = document.getElementById('saved-carts-list');
        if (!cartsList) return;

        if (Object.keys(carts).length === 0) {
            cartsList.innerHTML = '<p style="color: #999; font-size: 13px;">No saved carts yet</p>';
            return;
        }

        let html = '<div class="saved-carts">';
        Object.entries(carts).forEach(([name, cartData]) => {
            html += `
                <div class="saved-cart-item">
                    <div class="cart-info">
                        <strong>${name}</strong>
                        <span class="cart-meta">${cartData.itemCount} items • £${cartData.total.toFixed(2)}</span>
                    </div>
                    <button class="btn-mini" onclick="window.location.reload()" data-action="load-cart" data-name="${name}">Load</button>
                </div>
            `;
        });
        html += '</div>';
        cartsList.innerHTML = html;
    }

    // Update on page load
    updateSavedCartsList();

    paymentModalClose?.addEventListener('click', closePaymentModal);
    paymentModal?.addEventListener('click', (e) => {
        if (e.target === paymentModal) closePaymentModal();
    });
});