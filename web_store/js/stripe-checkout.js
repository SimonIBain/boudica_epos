/**
 * Stripe Checkout Module
 * Handles payment processing for web store orders
 */

// Initialize Stripe (replace with actual publishable key)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51234567890'; // TODO: Set to actual key from config
let stripe = null;
let elements = null;
let cardElement = null;

// Initialize Stripe on page load
function initializeStripe() {
    if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
        console.warn('Stripe publishable key not configured');
        return false;
    }

    try {
        stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        elements = stripe.elements();
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    fontFamily: '"Montserrat", sans-serif'
                },
                invalid: {
                    color: '#dc3545'
                }
            }
        });

        cardElement.mount('#card-element');

        // Handle card errors
        cardElement.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.className = 'payment-error';
            } else {
                displayError.textContent = '';
                displayError.className = '';
            }
        });

        return true;
    } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        return false;
    }
}

/**
 * Create a Payment Intent with the backend
 */
async function createPaymentIntent(orderId, totalAmount, customerEmail) {
    try {
        const response = await fetch('/cgi-bin/boudica_pos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'command': 'initiate_payment',
                'order_id': orderId,
                'total': totalAmount.toString(),
                'type': 'web_order',
                'username': customerEmail
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Extract client_secret and payment_intent_id from response
        const clientSecret = data.client_secret;
        const paymentIntentId = data.id;

        return { clientSecret, paymentIntentId };
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}

/**
 * Confirm payment after getting token
 */
async function confirmPayment(paymentIntentId, orderId, customerEmail) {
    try {
        const response = await fetch('/cgi-bin/boudica_pos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'command': 'confirm_payment',
                'payment_intent_id': paymentIntentId,
                'order_id': orderId,
                'username': customerEmail
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error confirming payment:', error);
        throw error;
    }
}

/**
 * Handle payment form submission
 */
document.getElementById('payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!stripe || !cardElement) {
        showPaymentError('Stripe is not initialized');
        return;
    }

    // Get form values
    const cardholderName = document.getElementById('cardholder-name').value;
    const email = document.getElementById('payment-email').value;
    const cartTotal = parseFloat(localStorage.getItem('cartTotal') || '0');
    const orderId = localStorage.getItem('currentOrderId') || 'order_' + Date.now();

    if (!email || !cardholderName) {
        showPaymentError('Please fill in all required fields');
        return;
    }

    // Show processing state
    showProcessing(true);

    try {
        // Step 1: Create payment intent
        const { clientSecret, paymentIntentId } = await createPaymentIntent(orderId, cartTotal, email);

        // Step 2: Confirm payment with Stripe
        const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: cardholderName,
                    email: email
                }
            }
        });

        if (error) {
            showPaymentError(error.message);
            showProcessing(false);
            return;
        }

        // Step 3: Confirm with backend
        const confirmResult = await confirmPayment(paymentIntentId, orderId, email);

        if (confirmResult.success && paymentIntent.status === 'succeeded') {
            showPaymentSuccess('Payment successful! Your order is confirmed.');
            
            // Save order confirmation
            localStorage.setItem('orderConfirmed', 'true');
            localStorage.setItem('paymentIntentId', paymentIntentId);
            
            // Redirect to confirmation page after delay
            setTimeout(() => {
                window.location.href = 'order-confirmation.html?order_id=' + orderId;
            }, 2000);
        } else if (paymentIntent.status === 'requires_action') {
            // 3D Secure or similar authentication required
            showPaymentError('Please complete the authentication step');
            showProcessing(false);
        } else {
            showPaymentError('Payment failed. Please try again.');
            showProcessing(false);
        }
    } catch (error) {
        showPaymentError(error.message);
        showProcessing(false);
    }
});

/**
 * Show payment error message
 */
function showPaymentError(message) {
    const messageDiv = document.getElementById('payment-message');
    messageDiv.textContent = message;
    messageDiv.className = 'payment-error';
}

/**
 * Show payment success message
 */
function showPaymentSuccess(message) {
    const messageDiv = document.getElementById('payment-message');
    messageDiv.textContent = message;
    messageDiv.className = 'payment-success';
}

/**
 * Show/hide processing indicator
 */
function showProcessing(show) {
    const processingDiv = document.getElementById('payment-processing');
    const submitBtn = document.getElementById('submit-payment-btn');
    
    if (show) {
        processingDiv.style.display = 'block';
        submitBtn.disabled = true;
    } else {
        processingDiv.style.display = 'none';
        submitBtn.disabled = false;
    }
}

/**
 * Update payment summary in modal
 */
export function updatePaymentSummary(subtotal, vat, total) {
    document.getElementById('payment-subtotal').textContent = '£' + subtotal.toFixed(2);
    document.getElementById('payment-vat').textContent = '£' + vat.toFixed(2);
    document.getElementById('payment-total').textContent = '£' + total.toFixed(2);
}

/**
 * Open payment modal
 */
export function openPaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.style.display = 'flex';
    
    // Initialize Stripe if not already done
    if (!stripe) {
        initializeStripe();
    }
    
    // Pre-fill email if available
    const savedEmail = localStorage.getItem('customerEmail');
    if (savedEmail) {
        document.getElementById('payment-email').value = savedEmail;
    }
    
    // Focus on cardholder name
    document.getElementById('cardholder-name').focus();
}

/**
 * Close payment modal
 */
export function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.style.display = 'none';
    document.getElementById('payment-message').textContent = '';
    showProcessing(false);
}

/**
 * Modal close button handler
 */
document.getElementById('payment-modal-close')?.addEventListener('click', closePaymentModal);

/**
 * Close modal when clicking outside
 */
document.getElementById('payment-modal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closePaymentModal();
    }
});

// Initialize Stripe when module loads
window.addEventListener('load', initializeStripe);

export { initializeStripe, createPaymentIntent, confirmPayment };
