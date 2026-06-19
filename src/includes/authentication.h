#ifndef AUTHENTICATION_H
#define AUTHENTICATION_H

#include <string>
#include <map>
#include <memory>
#include "postgresbc.h"

class Authentication {
private:
    std::shared_ptr<Postgresql> db_connection;
    std::string database;
    
public:
    Authentication(std::shared_ptr<Postgresql> db_conn, const std::string& db_name);
    ~Authentication();
    
    /**
     * Authenticate a user with username and password
     * @param username The username to authenticate
     * @param password The plain text password
     * @return Map with user details if successful, empty map if failed
     */
    std::map<std::string, std::string> authenticate(const std::string& username, const std::string& password);
    
    /**
     * Get user by ID
     * @param user_id The user ID
     * @return Map with user details, empty if not found
     */
    std::map<std::string, std::string> getUserById(int user_id);
    
    /**
     * Get user by username
     * @param username The username
     * @return Map with user details, empty if not found
     */
    std::map<std::string, std::string> getUserByUsername(const std::string& username);
    
    /**
     * Check if user has specific role
     * @param username The username
     * @param role The role to check (admin, manager, operator)
     * @return true if user has that role
     */
    bool hasRole(const std::string& username, const std::string& role);
    
    /**
     * Verify password against hashed password using pgcrypto crypt function
     * @param username The username
     * @param password The plain text password to verify
     * @return true if password matches
     */
    bool verifyPassword(const std::string& username, const std::string& password);
    
    /**
     * Update last login timestamp
     * @param username The username
     * @return true if successful
     */
    bool updateLastLogin(const std::string& username);
};

#endif // AUTHENTICATION_H
