# Stripe Integration Setup Guide

## Overview
This document outlines the complete Stripe payment integration for the Boudica POS system, supporting both web store e-commerce and till credit card sales.

## Architecture

### Backend (C++)
The backend provides REST API endpoints for payment processing:
- **`/cgi-bin/boudica_pos?command=initiate_payment`** - Creates a Stripe Payment Intent
- **`/cgi-bin/boudica_pos?command=confirm_payment`** - Confirms payment and updates order
- **`/cgi-bin/boudica_pos?command=till_card_sale`** - Process till card transactions
- **`/cgi-bin/boudica_pos?command=process_refund`** - Handle refunds

### Frontend (JavaScript)
- **Web Store**: Stripe Elements integration for checkout
- **Till**: Stripe card element for POS transactions

### Database
- **`store.payment_transactions`** - Records all payment attempts and results

## Installation & Setup

### 1. Install Dependencies

#### Required Libraries (Linux/Ubuntu):
```bash
# For Stripe C++ library
sudo apt-get install -y libcurl4-openssl-dev libssl-dev

# Verify installation
pkg-config --cflags --libs libcurl
pkg-config --cflags --libs openssl
```

#### Optional: Build libcurl from source (if needed)
```bash
cd /tmp
curl https://curl.se/download/curl-7.91.0.tar.gz | tar xz
cd curl-7.91.0
./configure --with-openssl
make
sudo make install
```

### 2. Configure Stripe API Keys

#### Get Your Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_live_` or `sk_test_`)
3. Copy your **Publishable Key** (starts with `pk_live_` or `pk_test_`)

#### Set Environment Variables

**Production:**
```bash
export STRIPE_SECRET_KEY="sk_live_your_actual_key"
export STRIPE_PUBLISHABLE_KEY="pk_live_your_actual_key"
```

**Testing (Recommended for development):**
```bash
export STRIPE_SECRET_KEY="sk_test_your_test_key"
export STRIPE_PUBLISHABLE_KEY="pk_test_your_test_key"
```

#### Update Configuration Files

**`/code/back_end/src/boudica_pos.conf`:**
```ini
# Stripe Configuration
stripe_secret_key=sk_test_your_key_here
stripe_webhook_secret=whsec_test_your_webhook_secret_here
stripe_test_mode=1
```

**Frontend Configuration:**

Update `/code/web_store/js/stripe-checkout.js` line ~8:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key_here';
```

Update `/code/web/scripts/till-card-payment.js` line ~9:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key_here';
```

### 3. Compile Backend with Stripe Support

```bash
cd /home/sibain/boudica_pos/code/back_end

# Build with Stripe
g++ -std=c++20 -o boudica_pos \
    src/main.cpp \
    src/stripe.cpp \
    src/postgresbc.cpp \
    src/utils.cpp \
    src/logging.cpp \
    src/http.cpp \
    src/cryptography.cpp \
    src/base64pp.cpp \
    -lpq -lcurl -lssl -lcrypto -pthread

# Test
./boudica_pos
```

### 4. Update Database Schema

```bash
psql -U postgres -d your_database < /code/sql/setup.sql
```

This creates the `store.payment_transactions` table automatically.

## Testing Payments

### Test Card Numbers (Stripe Test Mode Only)

| Type | Number | Exp | CVC | Outcome |
|------|--------|-----|-----|---------|
| Success | 4242424242424242 | 12/26 | 123 | Succeeds |
| Decline | 4000000000000002 | 12/26 | 123 | Declines |
| 3D Secure | 4000002500003155 | 12/26 | 123 | Requires auth |

### Web Store Test
1. Navigate to web store and add items to cart
2. Click "Buy Now" and enter test card details
3. Check `store.payment_transactions` table for record

### Till Test
1. Log into till interface
2. Add items and click "💳 Card" button
3. Enter test card details
4. Verify payment in database

## API Endpoints

### Initiate Payment
```
POST /cgi-bin/boudica_pos
Parameters:
  - command=initiate_payment
  - order_id=WEB-12345
  - total=29.99
  - type=web_order (or till_sale)
  - username=customer@example.com

Response:
{
  "id": "pi_1234567890",
  "client_secret": "pi_1234567890_secret_xxxxx",
  "amount": 2999,
  "currency": "gbp",
  "status": "requires_payment_method"
}
```

### Confirm Payment
```
POST /cgi-bin/boudica_pos
Parameters:
  - command=confirm_payment
  - payment_intent_id=pi_1234567890
  - order_id=WEB-12345
  - username=customer@example.com

Response:
{
  "success": true,
  "payment_intent_id": "pi_1234567890",
  "status": "succeeded"
}
```

### Till Card Sale
```
POST /cgi-bin/boudica_pos
Parameters:
  - command=till_card_sale
  - total=49.99
  - operator_id=operator@store.com
  - items=[{barcode: X, qty: 1}]
  - username=till_user

Response:
{
  "success": true,
  "till_transaction_id": "TILL_1234567890",
  "payment_intent_id": "pi_0987654321"
}
```

### Process Refund
```
POST /cgi-bin/boudica_pos
Parameters:
  - command=process_refund
  - payment_intent_id=pi_1234567890
  - reason=requested_by_customer

Response:
{
  "id": "re_1234567890",
  "status": "succeeded",
  "amount": 2999
}
```

## Database Schema

### payment_transactions Table
```sql
CREATE TABLE store.payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES store.customer_orders(order_id),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  customer_email TEXT NOT NULL,
  amount_cents NUMERIC NOT NULL,
  currency TEXT DEFAULT 'gbp',
  payment_method TEXT,  -- 'card', 'ideal', etc
  payment_status TEXT DEFAULT 'pending',
  payment_type TEXT,  -- 'web_order' or 'till_sale'
  till_transaction_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refund_status TEXT,
  refund_amount_cents NUMERIC,
  refund_reason TEXT,
  refunded_at TIMESTAMP
);
```

## Webhook Configuration (Optional but Recommended)

For production, set up webhooks to handle async events:

1. Go to https://dashboard.stripe.com/webhooks
2. Create new endpoint: `https://yoursite.com/cgi-bin/boudica_pos?command=stripe_webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the Webhook Secret to your config file

## Security Considerations

1. **Never expose secret keys** - Only use server-side
2. **HTTPS only** - All payments must use HTTPS
3. **PCI compliance** - Use Stripe Elements, never handle raw card data
4. **Environment variables** - Store keys in environment, not code
5. **Database encryption** - Consider encrypting payment_intent_id in production
6. **Audit logging** - All payment operations are logged to `store.audit_log`

## Troubleshooting

### Issue: "Stripe API key not configured"
**Solution**: 
- Check environment variable is set: `echo $STRIPE_SECRET_KEY`
- Update config file with valid key
- Restart the web server

### Issue: "Card declined"
**Solution**:
- Verify test card number is correct
- Check card expiry date is valid
- Verify in Stripe dashboard that test mode is enabled

### Issue: "Payment intent creation failed"
**Solution**:
- Check API key is correct (sk_test_xxx or sk_live_xxx)
- Verify cURL and OpenSSL are installed
- Check network connectivity to api.stripe.com
- Review logs in `/var/log/boudica_pos.log`

### Issue: "3D Secure authentication required"
**Solution**:
- This is normal for high-risk transactions
- Client must complete 3D Secure challenge
- Use test card `4000002500003155` to simulate

## Performance & Limits

- **Rate Limiting**: Stripe allows 100 requests/second per API key
- **Payment Intent Timeout**: Expires after 15 minutes
- **Refund Window**: Up to 180 days after charge
- **Maximum Amount**: £999,999.99 per transaction

## Monitoring

Check payment status in database:
```sql
-- Recent payments
SELECT order_id, stripe_payment_intent_id, payment_status, created_at 
FROM store.payment_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed payments
SELECT order_id, error_message, created_at 
FROM store.payment_transactions 
WHERE payment_status = 'failed' 
ORDER BY created_at DESC;

-- Revenue today
SELECT 
  SUM(amount_cents)/100 as total_revenue,
  COUNT(*) as transaction_count
FROM store.payment_transactions 
WHERE DATE(created_at) = CURRENT_DATE 
AND payment_status = 'succeeded';
```

## Integration Timeline

- **Phase 1**: Backend API endpoints (✅ Complete)
- **Phase 2**: Web store checkout (✅ Complete)
- **Phase 3**: Till card processing (✅ Complete)
- **Phase 4**: Webhook handlers (🔄 In Progress)
- **Phase 5**: Receipt printing with payment info (📋 Planned)
- **Phase 6**: Payment reconciliation reports (📋 Planned)

## Support

For Stripe API documentation: https://stripe.com/docs/api
For PCI compliance: https://stripe.com/pci
For testing: https://stripe.com/docs/testing
