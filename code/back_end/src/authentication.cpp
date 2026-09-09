#include "includes/authentication.h"
#include "includes/jsonobject.h"
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

    // Fixed: this used to build the WHERE clause by concatenating username/password
    // directly into the SQL text (a second, parallel SQL injection point alongside
    // check_user_credentials() in main.cpp, since `login` uses this class instead).
    std::string query = "SELECT id, username, email, role, full_name, is_active "
                       "FROM store.users "
                       "WHERE username = $1 AND is_active = true "
                       "AND password_hash = crypt($2, password_hash)";

    const char* json_response = db_connection->runCommandParams(query, {username, password});

    if (json_response && std::strlen(json_response) > 0) {
        std::string response_str(json_response);
        JSON<std::string,std::string> jUser(response_str);

        // Fixed: this used to check for the literal substring "\"id\": \"1\"" (only ever
        // matching user id 1) as a stand-in for "a row came back", then hardcoded
        // result["id"] = "1" and result["role"] = "admin" for every successful login
        // regardless of who actually logged in — every user was reported back as admin.
        // Now genuinely parses the row the query returned.
        std::string id = jUser["id"];
        if (!id.empty()) {
            result["authenticated"] = "true";
            result["id"] = id;
            result["username"] = jUser["username"];
            result["email"] = jUser["email"];
            result["role"] = jUser["role"];
            result["full_name"] = jUser["full_name"];

            updateLastLogin(username);
        }
    }

    return result;
}

std::map<std::string, std::string> Authentication::getUserById(int user_id) {
    std::map<std::string, std::string> result;

    if (!db_connection) {
        return result;
    }

    std::string query = "SELECT id, username, email, role, full_name, is_active "
                       "FROM store.users WHERE id = $1";

    const char* json_response = db_connection->runCommandParams(query, {std::to_string(user_id)});

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
                       "FROM store.users WHERE username = $1";

    const char* json_response = db_connection->runCommandParams(query, {username});

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

    // Fixed: this used to run the COUNT(*) query via exec() (which reports success/failure
    // of statement execution, not the row's value) and then discard the result entirely,
    // unconditionally returning true for any existing username regardless of its actual
    // role. Now genuinely checks the count.
    std::string query = "SELECT COUNT(*) AS n FROM store.users "
                       "WHERE username = $1 AND role = $2";

    const char* json_response = db_connection->runCommandParams(query, {username, role});
    if (!json_response) {
        return false;
    }
    std::string resp_str(json_response);
    JSON<std::string,std::string> jCount(resp_str);
    std::string n = jCount["n"];
    return (!n.empty() && n != "0");
}

bool Authentication::verifyPassword(const std::string& username, const std::string& password) {
    if (!db_connection) {
        return false;
    }

    // Fixed: this used to run a SELECT COUNT(*) through exec(), which only reports
    // PGRES_COMMAND_OK vs not — a SELECT always comes back PGRES_TUPLES_OK, so exec()
    // here always returned 1 (its "not command-ok" fallthrough) and this function always
    // returned false, regardless of whether the password was actually correct.
    std::string query = "SELECT COUNT(*) AS n FROM store.users "
                       "WHERE username = $1 "
                       "AND password_hash = crypt($2, password_hash)";

    const char* json_response = db_connection->runCommandParams(query, {username, password});
    if (!json_response) {
        return false;
    }
    std::string resp_str(json_response);
    JSON<std::string,std::string> jCount(resp_str);
    std::string n = jCount["n"];
    return (!n.empty() && n != "0");
}

bool Authentication::updateLastLogin(const std::string& username) {
    if (!db_connection) {
        return false;
    }

    std::string query = "UPDATE store.users SET last_login = CURRENT_TIMESTAMP "
                       "WHERE username = $1";

    int result = db_connection->execParams(query, {username});
    return (result == 0);
}
