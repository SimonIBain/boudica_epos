/** 
 * Copyright (c) [2024] [OmniIndex Inc.]
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**/

#ifndef STRIPE_H
#define STRIPE_H

#include <string>
#include <map>
#include <vector>

/**! StripePayment - Stripe API integration for payment processing
 * Handles credit card payments for both web store and POS
*/
class StripePayment {
public:
    /**! Constructor - Initialize Stripe with API key
     * @param api_key - Stripe Secret Key
    */
    StripePayment(std::string api_key);
    ~StripePayment();

    /**! Create a payment intent (main payment method)
     * @param amount_cents - Amount in cents (e.g., 2999 for £29.99)
     * @param currency - Currency code (e.g., "gbp")
     * @param customer_email - Customer email address
     * @param description - Payment description
     * @param metadata - JSON string with additional data
     * @return JSON string with payment intent details including client_secret
    */
    std::string createPaymentIntent(
        int amount_cents,
        std::string currency,
        std::string customer_email,
        std::string description,
        std::string metadata = ""
    );

    /**! Confirm a payment intent (called after client-side token creation)
     * @param payment_intent_id - The payment intent ID
     * @param payment_method_id - The payment method ID from Stripe
     * @return JSON string with confirmation status
    */
    std::string confirmPaymentIntent(
        std::string payment_intent_id,
        std::string payment_method_id
    );

    /**! Retrieve payment intent status
     * @param payment_intent_id - The payment intent ID
     * @return JSON string with payment details and status
    */
    std::string getPaymentIntentStatus(std::string payment_intent_id);

    /**! Create a customer record in Stripe
     * @param email - Customer email
     * @param name - Customer name
     * @param description - Customer description
     * @return JSON string with customer ID
    */
    std::string createCustomer(
        std::string email,
        std::string name,
        std::string description = ""
    );

    /**! Save a payment method to a customer
     * @param customer_id - Stripe customer ID
     * @param payment_method_id - Payment method ID
     * @return JSON string with success/error status
    */
    std::string attachPaymentMethodToCustomer(
        std::string customer_id,
        std::string payment_method_id
    );

    /**! Create a charge (legacy method, for simple payments)
     * @param amount_cents - Amount in cents
     * @param currency - Currency code
     * @param source - Token or card ID
     * @param description - Charge description
     * @return JSON string with charge details
    */
    std::string createCharge(
        int amount_cents,
        std::string currency,
        std::string source,
        std::string description
    );

    /**! Refund a payment
     * @param payment_intent_id - Original payment intent ID (preferred)
     * @param charge_id - Or the charge ID
     * @param amount_cents - Amount to refund (optional, full refund if 0)
     * @param reason - Refund reason (requested_by_customer, duplicate, fraudulent)
     * @return JSON string with refund details
    */
    std::string refundPayment(
        std::string payment_id,
        int amount_cents = 0,
        std::string reason = "requested_by_customer"
    );

    /**! Verify webhook signature
     * @param payload - Raw webhook payload
     * @param signature - Stripe-Signature header value
     * @param endpoint_secret - Webhook endpoint secret
     * @return bool - true if signature is valid
    */
    static bool verifyWebhookSignature(
        std::string payload,
        std::string signature,
        std::string endpoint_secret
    );

    /**! Get last error message
     * @return std::string - Error message
    */
    std::string getLastError();

private:
    std::string api_key;
    std::string last_error;
    std::string base_url;

    /**! Make HTTP request to Stripe API
     * @param method - HTTP method (GET, POST, DELETE)
     * @param endpoint - API endpoint (e.g., "v1/payment_intents")
     * @param data - POST data (URL-encoded)
     * @return Response as JSON string
    */
    std::string makeRequest(
        std::string method,
        std::string endpoint,
        std::string data = ""
    );

    /**! URL encode a string for POST requests
     * @param str - String to encode
     * @return URL-encoded string
    */
    std::string urlEncode(std::string str);
};

#endif