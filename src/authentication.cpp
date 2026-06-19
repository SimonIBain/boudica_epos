#include "includes/authentication.h"
#include <iostream>
#include <libpq-fe.h>
#include <cstring>

Authentication::Authentication(std::shared_ptr<Postgresql> db_conn, const std::string& db_name)
    : db_connection(db_conn), database(db_name) {
}

Authentication::~Authentication() {
}

std::map<std::string, std::string> Authentication::authenticate(const std::string& username, const std::string& password) {
    std::map<std::string, std::string> result;
    
    if (!db_connection) {
        return result;
    }
    
    // Query to verify password using pgcrypto crypt function
    std::string query = "SELECT id, username, email, role, full_name, is_active "
                       "FROM store.users "
                       "WHERE username = '" + username + "' AND is_active = true "
                       "AND password_hash = crypt('" + password + "', password_hash);";
    
    // NOTE: Do NOT log the query - it contains the password in plaintext
    
    // runCommand returns JSON response
    const char* json_response = db_connection->runCommand(query);
    
    std::cerr << "[AUTH DEBUG] Response: " << (json_response ? json_response : "NULL") << std::endl;
    std::cerr.flush();
    
    if (json_response && std::strlen(json_response) > 0) {
        std::string response_str(json_response);
        
        // Check if response contains actual data (non-empty id field indicates a match)
        // Successful response format: {{"id": "1","username": "admin",...}}
        // Failed response format: {"id": "","username": "",...}
        if (response_str.find("\"id\": \"1\"") != std::string::npos ||
            (response_str.find("\"id\": \"") != std::string::npos && 
             response_str.find("\"id\": \"\"") == std::string::npos)) {
            
            result["authenticated"] = "true";
            result["username"] = username;
            result["id"] = "1";  // TODO: Parse from JSON response
            result["role"] = "admin";  // TODO: Parse from JSON response
            
            // Update last login
            updateLastLogin(username);
            
            std::cerr << "[AUTH DEBUG] Authentication SUCCESSFUL" << std::endl;
            std::cerr.flush();
        } else {
            std::cerr << "[AUTH DEBUG] Authentication FAILED - no matching credentials" << std::endl;
            std::cerr.flush();
        }
    } else {
        std::cerr << "[AUTH DEBUG] Authentication FAILED - empty response" << std::endl;
        std::cerr.flush();
    }
    
    return result;
}

std::map<std::string, std::string> Authentication::getUserById(int user_id) {
    std::map<std::string, std::string> result;
    
    if (!db_connection) {
        return result;
    }
    
    std::string query = "SELECT id, username, email, role, full_name, is_active "
                       "FROM store.users WHERE id = " + std::to_string(user_id) + ";";
    
    const char* json_response = db_connection->runCommand(query);
    
    if (json_response && std::strlen(json_response) > 0) {
        std::string response_str(json_response);
        if (response_str.find("\"username\"") != std::string::npos) {
            result["found"] = "true";
            result["id"] = std::to_string(user_id);
        }
    }
    
    return result;
}

std::map<std::string, std::string> Authentication::getUserByUsername(const std::string& username) {
    std::map<std::string, std::string> result;
    
    if (!db_connection) {
        return result;
    }
    
    std::string query = "SELECT id, username, email, role, full_name, is_active "
                       "FROM store.users WHERE username = '" + username + "';";
    
    const char* json_response = db_connection->runCommand(query);
    
    if (json_response && std::strlen(json_response) > 0) {
        std::string response_str(json_response);
        if (response_str.find("\"username\"") != std::string::npos) {
            result["found"] = "true";
            result["username"] = username;
        }
    }
    
    return result;
}

bool Authentication::hasRole(const std::string& username, const std::string& role) {
    auto user = getUserByUsername(username);
    
    if (user.empty()) {
        return false;
    }
    
    std::string query = "SELECT COUNT(*) FROM store.users "
                       "WHERE username = '" + username + "' AND role = '" + role + "';";
    
    db_connection->exec(query);
    return true;
}

bool Authentication::verifyPassword(const std::string& username, const std::string& password) {
    if (!db_connection) {
        return false;
    }
    
    // Query using pgcrypto crypt to verify password
    std::string query = "SELECT COUNT(*) FROM store.users "
                       "WHERE username = '" + username + "' "
                       "AND password_hash = crypt('" + password + "', password_hash);";
    
    int result = db_connection->exec(query);
    return (result == 0);
}

bool Authentication::updateLastLogin(const std::string& username) {
    if (!db_connection) {
        return false;
    }
    
    std::string query = "UPDATE store.users SET last_login = CURRENT_TIMESTAMP "
                       "WHERE username = '" + username + "';";
    
    int result = db_connection->exec(query);
    return (result == 0);
}
