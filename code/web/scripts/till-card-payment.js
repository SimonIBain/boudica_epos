/**
 * Till Card Payment Module
 * Handles Stripe card payments for POS transactions
 */

// 7.1#5: was hardcoded to the placeholder 'pk_test_1234567890', so card payments could
// never actually initialize. Now fetched from the backend's own config (getpublicconfig,
// main.cpp) — a Stripe *publishable* key is safe to expose to the client by design, it's
// the secret key that must never leave the server, but it still needs to come from real
// per-deployment config rather than be baked into source.
let STRIPE_PUBLISHABLE_KEY = '';
let stripe = null;
let elements = null;
let cardElement = null;

async function loadStripePublishableKey() {
    if (STRIPE_PUBLISHABLE_KEY) return STRIPE_PUBLISHABLE_KEY;
    const json = await apiCall('getpublicconfig');
    STRIPE_PUBLISHABLE_KEY = json.stripe_publishable_key || '';
    return STRIPE_PUBLISHABLE_KEY;
}

// Initialize Stripe on page load
async function initializeTillStripe() {
    await loadStripePublishableKey();
    if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        console.warn('Stripe publishable key not configured for till');
        return false;
    }

    try {
        if (!stripe) {
            stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        }
        if (!elements) {
            elements = stripe.elements();
        }
        if (!cardElement) {
            cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '14px',
                        color: '#32325d',
                        fontFamily: 'Montserrat, sans-serif'
                    },
                    invalid: {
                        color: '#dc3545'
                    }
                }
            });
            cardElement.mount('#till-card-element');

            // Handle card errors
            cardElement.addEventListener('change', function(event) {
                const displayError = document.getElementById('till-card-errors');
                if (displayError) {
                    if (event.error) {
                        displayError.textContent = event.error.message;
                        displayError.className = 'till-payment-error';
                    } else {
                        displayError.textContent = '';
                        displayError.className = '';
                    }
                }
            });
        }
        return true;
    } catch (error) {
        console.error('Failed to initialize Stripe for till:', error);
        return false;
    }
}

/**
 * Process a till card sale
 */
async function processTillCardSale(total, operatorId, customerEmail = '') {
    if (!stripe || !cardElement) {
        throw new Error('Stripe is not initialized');
    }

    try {
        // Create the PaymentIntent via the backend's dedicated till command. This
        // previously called `initiate_payment` instead, which requires an `order_id`
        // referencing a store.customer_orders row (the web store always creates one before
        // opening its payment modal) — a till sale has no such row, so this failed with
        // "order_id is required" on every attempt, before even reaching Stripe. It also
        // never sent a `password` (only `username`), which alone would have failed the
        // auth check. `till_card_sale` is main.cpp's purpose-built equivalent for a till
        // sale (operator_id instead of order_id) — apiCall() sends the logged-in
        // operator's own credentials, same as every other till command.
        const paymentData = await apiCall('till_card_sale', {
            total: total.toString(),
            operator_id: operatorId
        });

        if (paymentData.error) {
            throw new Error(paymentData.error);
        }

        const clientSecret = paymentData.client_secret;
        const paymentIntentId = paymentData.payment_intent_id;

        // Confirm payment with Stripe
        const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: operatorId,
                    email: customerEmail || 'till@pos.local'
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        if (paymentIntent.status === 'succeeded') {
            return {
                success: true,
                paymentIntentId: paymentIntentId,
                status: 'succeeded'
            };
        } else if (paymentIntent.status === 'requires_action') {
            throw new Error('3D Secure authentication required');
        } else {
            throw new Error('Payment failed with status: ' + paymentIntent.status);
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Create card payment modal for till
 */
async function createCardPaymentModal() {
    const modalHTML = `
        <div id="till-card-payment-modal" class="modal-overlay" style="display: none; z-index: 1000;">
            <div class="modal" style="max-width: 450px;">
                <button class="modal-close" onclick="document.getElementById('till-card-payment-modal').style.display = 'none';">&times;</button>
                <h2>Card Payment</h2>
                
                <form id="till-card-payment-form">
                    <!-- Payment Summary -->
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Total:</span>
                            <span id="till-payment-total" style="font-weight: bold;">£0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
                            <span>Reference:</span>
                            <span id="till-payment-ref">--</span>
                        </div>
                    </div>

                    <!-- Operator Info -->
                    <div class="form-group">
                        <label for="till-operator-name">Operator:</label>
                        <input type="text" id="till-operator-name" disabled style="background: #f0f0f0; cursor: not-allowed;">
                    </div>

                    <!-- Card Element -->
                    <div class="form-group">
                        <label for="till-card-element">Card Details</label>
                        <div id="till-card-element" style="border: 1px solid #ddd; padding: 12px; border-radius: 4px; margin-bottom: 12px; min-height: 40px;">
                            <!-- Stripe Card Element will be inserted here -->
                        </div>
                        <div id="till-card-errors" class="till-payment-error"></div>
                    </div>

                    <!-- Processing Indicator -->
                    <div id="till-payment-processing" style="display: none; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 4px; margin: 15px 0;">
                        <div class="spinner"></div>
                        <p>Processing payment...</p>
                    </div>

                    <!-- Status Message -->
                    <div id="till-payment-message" style="margin: 15px 0;"></div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('till-card-payment-modal').style.display = 'none'; document.getElementById('till-payment-message').textContent = '';" style="flex: 1;">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-success" id="till-submit-payment-btn" style="flex: 1;">
                            Charge Card
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <style>
            .till-payment-error {
                color: #dc3545;
                margin-top: 8px;
                font-size: 14px;
            }
            .till-payment-success {
                color: #28a745;
                margin-top: 8px;
                font-size: 14px;
            }
        </style>
    `;

    // Insert modal into page if not already present
    if (!document.getElementById('till-card-payment-modal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        await initializeTillStripe();
    }

    // Setup form handler
    const form = document.getElementById('till-card-payment-form');
    form.addEventListener('submit', handleTillCardPayment);
}

/**
 * Handle till card payment submission
 */
async function handleTillCardPayment(e) {
    e.preventDefault();

    const modal = document.getElementById('till-card-payment-modal');
    const messageDiv = document.getElementById('till-payment-message');
    const processingDiv = document.getElementById('till-payment-processing');
    const submitBtn = document.getElementById('till-submit-payment-btn');
    const operatorName = document.getElementById('till-operator-name').value;

    if (!operatorName) {
        messageDiv.textContent = 'Operator information missing';
        messageDiv.className = 'till-payment-error';
        return;
    }

    // Show processing state
    processingDiv.style.display = 'block';
    submitBtn.disabled = true;

    try {
        // Get total from modal
        const totalText = document.getElementById('till-payment-total').textContent;
        const total = parseFloat(totalText.replace('£', ''));

        // Process payment
        const result = await processTillCardSale(total, operatorName, '');

        // Show success message
        messageDiv.textContent = 'Payment successful! Transaction: ' + result.paymentIntentId;
        messageDiv.className = 'till-payment-success';

        // Store payment details in window for receipt
        window.lastCardPayment = {
            paymentIntentId: result.paymentIntentId,
            amount: total,
            timestamp: new Date().toISOString(),
            operator: operatorName
        };

        // 7.1#4: previously nothing here ever recorded the sale — the card was charged
        // but stock/sales went unrecorded and the till never printed a receipt or cleared
        // the cart. completeSale() (till.js) is the same completion path every other
        // payment method already uses.
        if (typeof window.completeSale === 'function') {
            await window.completeSale('Card', null);
        } else {
            console.error('completeSale() not found — card was charged but the sale was not recorded.');
            showToast('Card charged, but the sale could not be recorded. Please record it manually.', 'error');
        }

        // Close modal after delay
        setTimeout(() => {
            modal.style.display = 'none';
            messageDiv.textContent = '';
            document.getElementById('till-card-payment-form').reset();
            processingDiv.style.display = 'none';
            submitBtn.disabled = false;
        }, 2000);
    } catch (error) {
        messageDiv.textContent = error.message || 'Payment failed. Please try again.';
        messageDiv.className = 'till-payment-error';
        processingDiv.style.display = 'none';
        submitBtn.disabled = false;
    }
}

/**
 * Open card payment modal for a specific transaction
 */
async function openCardPaymentModal(total, operatorId, reference = '') {
    await createCardPaymentModal(); // Ensure modal exists

    const modal = document.getElementById('till-card-payment-modal');
    document.getElementById('till-payment-total').textContent = '£' + total.toFixed(2);
    document.getElementById('till-payment-ref').textContent = reference || 'NEW';
    document.getElementById('till-operator-name').value = operatorId;
    document.getElementById('till-payment-message').textContent = '';
    document.getElementById('till-payment-message').className = '';

    modal.style.display = 'flex';

    // Reinitialize Stripe elements if needed
    if (!stripe) {
        await initializeTillStripe();
    }
}

/**
 * Close card payment modal
 */
function closeCardPaymentModal() {
    const modal = document.getElementById('till-card-payment-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('till-payment-message').textContent = '';
    }
}

/**
 * Add card payment button to till interface
 * Call this when setting up payment options
 */
function addCardPaymentOption() {
    // This would be called by till.js to add the card payment button
    // Return HTML for the card payment button
    return `
        <button id="till-card-payment-btn" class="btn btn-primary" onclick="window.tillCardPayment.handleCardPaymentClick()">
            💳 Card Payment
        </button>
    `;
}

/**
 * Handle card payment button click
 */
function handleCardPaymentClick() {
    // Get current receipt total
    const totalElement = document.querySelector('[data-receipt-total]');
    if (!totalElement) {
        alert('No items in receipt. Please add items before paying by card.');
        return;
    }

    const total = parseFloat(totalElement.dataset.receiptTotal);
    const operatorId = localStorage.getItem('currentOperator') || 'unknown';

    openCardPaymentModal(total, operatorId, 'CARD_' + Date.now());
}

// Make functions available globally for inline onclick handlers
window.tillCardPayment = {
    openCardPaymentModal,
    closeCardPaymentModal,
    handleCardPaymentClick,
    processTillCardSale,
    initializeTillStripe
};

// Initialize when module loads
window.addEventListener('load', () => {
    // Module will be manually initialized when needed
    console.log('Till Card Payment module loaded');
});
