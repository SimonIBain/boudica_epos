#include <iostream>
#include <string>
#include <map>
#include <sstream>
#include <curl/curl.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <iomanip>

#include "includes/stripe.h"
#include "includes/utils.h"
#include "includes/logging.h"

// Curl callback for capturing response
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

StripePayment::StripePayment(std::string api_key) 
    : api_key(api_key), base_url("https://api.stripe.com") {
    if (api_key.empty()) {
        last_error = "Stripe API key not provided";
        OmniIndex::Utils::Logging::log("Stripe", last_error);
    }
}

StripePayment::~StripePayment() {
}

std::string StripePayment::urlEncode(std::string str) {
    std::string encoded;
    for (char c : str) {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encoded += c;
        } else {
            encoded += '%';
            encoded += "0123456789ABCDEF"[c >> 4];
            encoded += "0123456789ABCDEF"[c & 15];
        }
    }
    return encoded;
}

std::string StripePayment::makeRequest(std::string method, std::string endpoint, std::string data) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        last_error = "Failed to initialize CURL";
        return "{\"error\": \"" + last_error + "\"}";
    }

    std::string url = base_url + "/" + endpoint;
    std::string response;

    // Prepare authentication header
    std::string auth = ":" + api_key;
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/x-www-form-urlencoded");

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    curl_easy_setopt(curl, CURLOPT_USERPWD, auth.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    if (method == "POST") {
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        if (!data.empty()) {
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
        }
    } else if (method == "DELETE") {
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    }

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        last_error = "CURL error: " + std::string(curl_easy_strerror(res));
        OmniIndex::Utils::Logging::log("Stripe", last_error);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        return "{\"error\": \"" + last_error + "\"}";
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return response;
}

std::string StripePayment::createPaymentIntent(
    int amount_cents,
    std::string currency,
    std::string customer_email,
    std::string description,
    std::string metadata) {
    
    std::string data = "amount=" + std::to_string(amount_cents);
    data += "&currency=" + urlEncode(currency);
    data += "&description=" + urlEncode(description);
    data += "&receipt_email=" + urlEncode(customer_email);
    data += "&confirm=false";  // Client will confirm after getting client_secret
    
    if (!metadata.empty()) {
        data += "&metadata=" + urlEncode(metadata);
    }

    std::string response = makeRequest("POST", "v1/payment_intents", data);
    
    OmniIndex::Utils::Logging::log("Stripe", "Payment intent created for £" + 
        std::to_string(amount_cents/100) + "." + 
        std::to_string(amount_cents%100));
    
    return response;
}

std::string StripePayment::confirmPaymentIntent(
    std::string payment_intent_id,
    std::string payment_method_id) {
    
    std::string endpoint = "v1/payment_intents/" + urlEncode(payment_intent_id) + "/confirm";
    std::string data = "payment_method=" + urlEncode(payment_method_id);

    std::string response = makeRequest("POST", endpoint, data);
    
    OmniIndex::Utils::Logging::log("Stripe", "Payment intent confirmed: " + payment_intent_id);
    
    return response;
}

std::string StripePayment::getPaymentIntentStatus(std::string payment_intent_id) {
    std::string endpoint = "v1/payment_intents/" + urlEncode(payment_intent_id);
    return makeRequest("GET", endpoint);
}

std::string StripePayment::createCustomer(
    std::string email,
    std::string name,
    std::string description) {
    
    std::string data = "email=" + urlEncode(email);
    data += "&name=" + urlEncode(name);
    
    if (!description.empty()) {
        data += "&description=" + urlEncode(description);
    }

    std::string response = makeRequest("POST", "v1/customers", data);
    
    OmniIndex::Utils::Logging::log("Stripe", "Customer created: " + email);
    
    return response;
}

std::string StripePayment::attachPaymentMethodToCustomer(
    std::string customer_id,
    std::string payment_method_id) {
    
    std::string endpoint = "v1/payment_methods/" + urlEncode(payment_method_id) + "/attach";
    std::string data = "customer=" + urlEncode(customer_id);

    return makeRequest("POST", endpoint, data);
}

std::string StripePayment::createCharge(
    int amount_cents,
    std::string currency,
    std::string source,
    std::string description) {
    
    std::string data = "amount=" + std::to_string(amount_cents);
    data += "&currency=" + urlEncode(currency);
    data += "&source=" + urlEncode(source);
    data += "&description=" + urlEncode(description);

    return makeRequest("POST", "v1/charges", data);
}

std::string StripePayment::refundPayment(
    std::string payment_id,
    int amount_cents,
    std::string reason) {
    
    std::string data = "charge=" + urlEncode(payment_id);
    data += "&reason=" + urlEncode(reason);
    
    if (amount_cents > 0) {
        data += "&amount=" + std::to_string(amount_cents);
    }

    std::string response = makeRequest("POST", "v1/refunds", data);
    
    OmniIndex::Utils::Logging::log("Stripe", "Refund processed for: " + payment_id);
    
    return response;
}

std::string StripePayment::getLastError() {
    return last_error;
}

bool StripePayment::verifyWebhookSignature(
    std::string payload,
    std::string signature,
    std::string endpoint_secret) {
    
    if (payload.empty() || signature.empty() || endpoint_secret.empty()) {
        return false;
    }

    // Extract timestamp and signature from header
    // Format: t=timestamp,v1=signature
    std::size_t t_pos = signature.find("t=");
    std::size_t v_pos = signature.find("v1=");
    
    if (t_pos == std::string::npos || v_pos == std::string::npos) {
        return false;
    }

    std::string timestamp = signature.substr(t_pos + 2, v_pos - t_pos - 3);
    std::string received_sig = signature.substr(v_pos + 3);

    // Create signed content
    std::string signed_content = timestamp + "." + payload;

    // Compute HMAC-SHA256
    unsigned char hash[SHA256_DIGEST_LENGTH];
    unsigned int hash_len;
    
    HMAC(EVP_sha256(),
        (unsigned char*)endpoint_secret.c_str(),
        endpoint_secret.length(),
        (unsigned char*)signed_content.c_str(),
        signed_content.length(),
        hash,
        &hash_len);

    // Convert to hex string
    std::ostringstream ss;
    for (unsigned int i = 0; i < hash_len; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    std::string computed_sig = ss.str();

    // Compare signatures
    return computed_sig == received_sig;
}
