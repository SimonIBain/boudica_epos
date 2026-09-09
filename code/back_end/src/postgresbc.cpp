
#include <string>
#include <iostream>
#include <ctime>

#include "includes/postgresbc.h"
#include "includes/utils.h"
#include "includes/logging.h"


#include <fstream>
#include </usr/include/postgresql/libpq-fe.h>
#include <string.h>

#define _DEBUG

// ===== ConnectionPool Implementation =====

ConnectionPool& ConnectionPool::getInstance() {
    static ConnectionPool instance;
    return instance;
}

bool ConnectionPool::initialize(std::string user, std::string password, std::string uri, 
                               std::string port, std::string database) {
    std::cerr << "[PGPOOL] initialize() ENTER - acquiring lock..." << std::endl;
    std::cerr.flush();
    
    std::lock_guard<std::mutex> lock(pool_mutex);
    
    std::cerr << "[PGPOOL] initialize() - lock acquired, checking if initialized..." << std::endl;
    std::cerr.flush();
    
    if (initialized) {
        std::cerr << "[PGPOOL] initialize() - already initialized, returning TRUE" << std::endl;
        std::cerr.flush();
        return true;
    }
    
    std::cerr << "[PGPOOL] initialize() - setting db parameters..." << std::endl;
    std::cerr.flush();
    
    db_user = user;
    db_password = password;
    db_uri = uri;
    db_port = port;
    db_database = database;
    
    std::cerr << "[PGPOOL] initialize() - creating " << MIN_POOL_SIZE << " pool connections..." << std::endl;
    std::cerr.flush();
    
    // Create minimum pool connections
    for (int i = 0; i < MIN_POOL_SIZE; i++) {
        PGconn* conn = createConnection();
        if (conn) {
            available_connections.push(std::make_shared<PooledConnection>(conn));
            all_connections.push_back(std::make_shared<PooledConnection>(conn));
        }
    }
    
    std::cerr << "[PGPOOL] initialize() - pool connections created, setting initialized flag..." << std::endl;
    std::cerr.flush();
    
    initialized = !available_connections.empty();
    
    if (initialized) {
        std::cerr << "[PGPOOL] initialize() - pool initialized successfully" << std::endl;
        std::cerr.flush();
        
        // Skip OmniIndex::Utils::Logging::log() - it hangs indefinitely
        // std::string log_msg = "Connection pool initialized with " + std::to_string(MIN_POOL_SIZE) + " connections";
        // OmniIndex::Utils::Logging::log("ConnectionPool", log_msg);
    }
    
    std::cerr << "[PGPOOL] initialize() EXIT - returning true" << std::endl;
    std::cerr.flush();
    
    return initialized;
}

PGconn* ConnectionPool::createConnection() {
    std::string conn_str;
    
    // Use Unix socket for localhost connections instead of TCP
    if (db_uri == "localhost" || db_uri == "127.0.0.1") {
        // Use Unix socket - PostgreSQL typically listens at /var/run/postgresql or /tmp
        conn_str = "host=/var/run/postgresql user=" + db_user + 
                   " password=" + db_password + " dbname=" + db_database + 
                   " connect_timeout=" + std::to_string(CONNECTION_TIMEOUT);
    } else {
        // Use TCP connection for remote servers
        conn_str = "host=" + db_uri + " port=" + db_port + " user=" + db_user + 
                   " password=" + db_password + " dbname=" + db_database + 
                   " connect_timeout=" + std::to_string(CONNECTION_TIMEOUT);
    }
    
    std::cerr << "[PGPOOL] Connection string: " << conn_str << std::endl;
    std::cerr.flush();
    
    PGconn* conn = PQconnectdb(conn_str.c_str());
    
    if (PQstatus(conn) == CONNECTION_BAD) {
        std::string error = "Failed to create connection: ";
        error += PQerrorMessage(conn);
        std::cerr << "[PGPOOL] " << error << std::endl;
        std::cerr.flush();
        // Skip OmniIndex::Utils::Logging::log() - it hangs
        // OmniIndex::Utils::Logging::log("ConnectionPool", error);
        PQfinish(conn);
        return nullptr;
    }
    
    std::cerr << "[PGPOOL] Connection successful" << std::endl;
    std::cerr.flush();
    
    return conn;
}

bool ConnectionPool::validateConnection(PGconn* conn) {
    if (!conn) return false;
    
    // Test connection with a simple query
    std::cerr << "[PGPOOL] Validating connection..." << std::endl;
    std::cerr.flush();
    
    PGresult* result = PQexec(conn, "SELECT 1");
    
    std::cerr << "[PGPOOL] Validation query returned" << std::endl;
    std::cerr.flush();
    
    bool valid = (PQresultStatus(result) == PGRES_TUPLES_OK);
    PQclear(result);
    
    if (!valid) {
        std::cerr << "[PGPOOL] Connection validation FAILED" << std::endl;
        std::cerr.flush();
        // Skip OmniIndex::Utils::Logging::log() - it hangs
        // OmniIndex::Utils::Logging::log("ConnectionPool", "Connection validation failed");
        return false;
    }
    
    std::cerr << "[PGPOOL] Connection validation SUCCESSFUL" << std::endl;
    std::cerr.flush();
    
    return true;
}

PGconn* ConnectionPool::getConnection() {
    std::cerr << "[PGPOOL] getConnection() called - acquiring lock..." << std::endl;
    std::cerr.flush();
    
    std::lock_guard<std::mutex> lock(pool_mutex);
    
    std::cerr << "[PGPOOL] getConnection() - lock acquired, checking available connections..." << std::endl;
    std::cerr.flush();
    
    // Try to get an available connection
    while (!available_connections.empty()) {
        auto pooled = available_connections.front();
        available_connections.pop();
        
        std::cerr << "[PGPOOL] getConnection() - validating connection..." << std::endl;
        std::cerr.flush();
        
        if (validateConnection(pooled->connection)) {
            pooled->in_use = true;
            pooled->last_used = time(nullptr);
            std::cerr << "[PGPOOL] getConnection() - returning validated connection" << std::endl;
            std::cerr.flush();
            return pooled->connection;
        } else {
            // Connection is bad, create a new one
            PQfinish(pooled->connection);
        }
    }
    
    // Create new connection if pool not at max
    if (all_connections.size() < MAX_POOL_SIZE) {
        std::cerr << "[PGPOOL] getConnection() - creating new connection" << std::endl;
        std::cerr.flush();
        
        PGconn* conn = createConnection();
        if (conn) {
            auto pooled = std::make_shared<PooledConnection>(conn);
            pooled->in_use = true;
            pooled->last_used = time(nullptr);
            all_connections.push_back(pooled);
            std::cerr << "[PGPOOL] getConnection() - returning new connection" << std::endl;
            std::cerr.flush();
            return conn;
        }
    }
    
    std::cerr << "[PGPOOL] getConnection() - No available connections - pool exhausted" << std::endl;
    std::cerr.flush();
    // Skip OmniIndex::Utils::Logging::log() - it hangs
    // OmniIndex::Utils::Logging::log("ConnectionPool", "No available connections - pool exhausted");
    return nullptr;
}

void ConnectionPool::releaseConnection(PGconn* conn) {
    std::lock_guard<std::mutex> lock(pool_mutex);
    
    if (!conn) return;
    
    // Find and release the connection
    for (auto& pooled : all_connections) {
        if (pooled->connection == conn) {
            pooled->in_use = false;
            pooled->last_used = time(nullptr);
            available_connections.push(pooled);
            return;
        }
    }
}

int ConnectionPool::getPoolSize() {
    std::lock_guard<std::mutex> lock(pool_mutex);
    return all_connections.size();
}

void ConnectionPool::shutdown() {
    std::lock_guard<std::mutex> lock(pool_mutex);
    
    for (auto& pooled : all_connections) {
        if (pooled->connection) {
            PQfinish(pooled->connection);
        }
    }
    
    all_connections.clear();
    while (!available_connections.empty()) {
        available_connections.pop();
    }
    
    initialized = false;
    std::cerr << "[PGPOOL] Connection pool shutdown complete" << std::endl;
    std::cerr.flush();
    // Skip OmniIndex::Utils::Logging::log() - it hangs
    // OmniIndex::Utils::Logging::log("ConnectionPool", "Connection pool shutdown complete");
}

ConnectionPool::~ConnectionPool() {
    shutdown();
}

// ===== Postgresql Implementation =====

Postgresql::Postgresql(std::string instanceUser, std::string instancePassword, std::string instanceUri, std::string port, std::string database) 
    : _instanceUser(instanceUser), _instancePassword(instancePassword), _instanceUri(instanceUri), _port(port), in_transaction(false) {
    
    std::cerr << "[PGBC] Constructor called" << std::endl;
    std::cerr.flush();
    
    _PGBCConnection = 0;
    
    std::cerr << "[PGBC] Getting ConnectionPool instance..." << std::endl;
    std::cerr.flush();
    
    // Initialize pool if needed
    ConnectionPool& pool = ConnectionPool::getInstance();
    
    std::cerr << "[PGBC] getInstance() returned, checking pool size..." << std::endl;
    std::cerr.flush();
    
    if (!pool.getPoolSize()) {
        std::cerr << "[PGBC] Pool size is 0, calling initialize()..." << std::endl;
        std::cerr.flush();
        
        pool.initialize(instanceUser, instancePassword, instanceUri, port, database);
        
        std::cerr << "[PGBC] initialize() returned" << std::endl;
        std::cerr.flush();
    }
    
    std::cerr << "[PGBC] Calling getConnection()..." << std::endl;
    std::cerr.flush();
    
    // Get connection from pool
    _PGBCConnection = pool.getConnection();
    
    std::cerr << "[PGBC] getConnection() returned with conn=" << (void*)_PGBCConnection << std::endl;
    std::cerr.flush();
    
    if (_PGBCConnection && PQstatus(_PGBCConnection) == CONNECTION_OK) {
        _isConnected = true;
    } else {
        _isConnected = false;
        std::string error = "PGBC Pool connection failed";
        std::cerr << "[PGBC] " << error << std::endl;
        std::cerr.flush();
        // Skip OmniIndex::Utils::Logging::log() - it hangs
        // OmniIndex::Utils::Logging::log("PGBC", error);
    }
}

Postgresql::~Postgresql() {
    close();
}

void Postgresql::setWarning(void *arg, const PGresult *res) {
    std::string warning(PQresultErrorField(res,
                PG_DIAG_MESSAGE_PRIMARY));
    std::string ch_warn = warning.c_str();
    OmniIndex::Utils::Utils::trim(ch_warn);
    char *pbuff;
    char* quot = strdup ("\"");
    char* empty = strdup("");
    ch_warn = OmniIndex::Utils::Utils::replace(ch_warn, quot, empty);
    ch_warn = warning.c_str();
    OmniIndex::Utils::Utils::trim(ch_warn);
   ch_warn = OmniIndex::Utils::Utils::replace(ch_warn, quot, empty);
    warning.assign(ch_warn.c_str());
    warning = "{\"notice\": \"" + warning + "\"},";
    free ( quot );
    free( empty );
    std::ofstream file;
    file.open("./warnings", std::ios_base::app | std::ios_base::out);
    if ( file.is_open() ) {
        file << warning.c_str();   
        file.close();
    }        
}

std::string Postgresql::getWarnings() {
    std::string warnings = "";
    std::ifstream strm ("./warnings");
    if( strm.is_open() ) {
        std::string line;
        for ( std::string line; getline(strm, line);) {
            warnings += line + " ";
        }
    }
    remove("./warnings");  
    size_t sz_find = warnings.find_last_of ( ",");
    if ( sz_find != std::string::npos ) {
        warnings.erase(sz_find);
    }  
    return warnings;
}

int Postgresql::exec(std::string query) {
    PQsetNoticeReceiver(_PGBCConnection, setWarning, NULL);
    PGresult* results = 0;
    try {
        results = PQexec(_PGBCConnection, query.c_str());
#ifdef DEBUG
    printf("The exec result was %i\n", PQresultStatus(results));
#endif
        bool ok = (PQresultStatus(results) == PGRES_COMMAND_OK);
        PQclear(results);
        return ok ? 0 : 1;
    } catch ( std::exception &e ) {
        std::string error = "PGBC exec caused a std::exception. The message was: ";
        error += e.what();
        OmniIndex::Utils::Logging::log("PGBC", error);
        return 1;
    }
    return 1;
}

/** Shared PGresult -> JSON conversion used by both runCommand() and runCommandParams(),
 * so the parameterized path returns byte-identical output to the string-built path
 * (callers throughout main.cpp parse this JSON and must not need to change). */
static std::string pgresultToJson(PGresult* results, const std::string& lastError) {
    long recCount = 0;
    std::string s_results;
    std::string res = "{";
    bool has_columns = false;
    if (PQresultStatus(results) == PGRES_TUPLES_OK) {
        int cols = PQnfields(results);
        if ( cols > 0 ) { has_columns = true; }
        int rows = PQntuples(results);
        if ( rows == 0 && cols > 0 ) {
            for ( int col = 0; col <= rows; ++col ) {
                recCount++;
                for ( int col = 0; col < cols; col++ ) {
                    std::string column = PQfname(results, col);
                    if ( col > 0 ) {res += ",";}
                    res += "\"" + column + "\": \"\"";
                    s_results = res;
                }
            }
            res = s_results;
        }
        for ( int row = 0; row < rows; row++ ) {
            res += "{";
            recCount++;
            for ( int col = 0; col < cols; col++ ) {
                std::string column = PQfname(results, col);
                std::string value = PQgetvalue(results, row, col);
                if ( col == cols -1 ) {
                    res += "\"" + column + "\": \"" + value+ "\"";
                    s_results = value;
                } else {
                    res += "\"" + column + "\": \"" + value+ "\",";
                }
            }
            if ( row == rows -1 ) {
                res += "}";
            } else {
                res += "},\n";
            }
        }
        res += "}";
    } else {
        std::string err = lastError;
        size_t start = err.find(" '");
        if ( start != std::string::npos ) {
            size_t end = err.find(", ", start);
            if ( end != std::string::npos ) {
                err.erase ( start, end - start );
            }
        }
        if ( res.find("}") != std::string::npos ) {
            res = "{\"Success\" : \"Fail\", \"message\" : \"" + err + "\"}";
        }
    }
    return res;
}

const char* Postgresql::runCommandParams(std::string sql, const std::vector<std::string>& params) {
    PQsetNoticeReceiver(_PGBCConnection, setWarning, NULL);
    std::vector<const char*> values;
    values.reserve(params.size());
    for (const auto& p : params) { values.push_back(p.c_str()); }
    PGresult* results = PQexecParams(_PGBCConnection, sql.c_str(),
        static_cast<int>(values.size()), nullptr, values.data(), nullptr, nullptr, 0);
    std::string res = pgresultToJson(results, getLastError());
    PQclear(results);
    const char* ret = (char*) malloc(res.size() + 1);
    strcpy((char*)ret, res.c_str());
    return ret;
}

int Postgresql::execParams(std::string sql, const std::vector<std::string>& params) {
    PQsetNoticeReceiver(_PGBCConnection, setWarning, NULL);
    std::vector<const char*> values;
    values.reserve(params.size());
    for (const auto& p : params) { values.push_back(p.c_str()); }
    PGresult* results = PQexecParams(_PGBCConnection, sql.c_str(),
        static_cast<int>(values.size()), nullptr, values.data(), nullptr, nullptr, 0);
    bool ok = (PQresultStatus(results) == PGRES_COMMAND_OK);
    PQclear(results);
    return ok ? 0 : 1;
}

const char* Postgresql::runCommand(std::string commandData) {
    PGresult* results = 0;
    PQsetNoticeReceiver(_PGBCConnection, setWarning, NULL);
    try {
        results = PQexec(_PGBCConnection, commandData.c_str());
    } catch ( ... ) {}
    std::string res = pgresultToJson(results, getLastError());
    PQclear(results);
    const char* ret = (char *) malloc( res.size()+1 );
    strcpy((char*)ret, res.c_str());
    return ret;
}

std::string Postgresql::getLastError() {
    std::string err = "";
    try {
        err =  PQerrorMessage(_PGBCConnection);
    } catch ( std::exception& e ) { return e.what(); }
    size_t start = err.find(" '");
    if ( start != std::string::npos ) {
        size_t end = err.find("' ", start);
        if ( end != std::string::npos ) {err.erase ( start, end - start );}
    } 
    size_t pos = err.find("LINE ");
    if ( pos != std::string::npos ) {
        err.erase ( pos );
    }     
    return err;
}

std::string Postgresql::getDetailedError() {
    if (!_PGBCConnection) {
        return "Connection not established";
    }
    
    PGresult* empty = PQmakeEmptyPGresult(_PGBCConnection, PGRES_FATAL_ERROR);
    std::string error = "ERROR [";
    error += PQresultErrorField(empty, PG_DIAG_SQLSTATE);
    error += "]: ";
    error += PQerrorMessage(_PGBCConnection);
    PQclear(empty);

    std::cerr << "[PGBC] " << error << std::endl;
    return error;
}

bool Postgresql::isValid() {
    if (!_PGBCConnection) return false;
    return (PQstatus(_PGBCConnection) == CONNECTION_OK);
}

// NOTE: these deliberately use std::cerr, not OmniIndex::Utils::Logging::log() — that
// function makes its own DB call via the same connection pool, and every other caller of
// the pool in this file has its Logging::log() calls commented out with a note that it
// "hangs indefinitely". Since begin/commit/rollback are now on the hot path for every
// multi-statement write, they stay off that landmine rather than re-testing it under load.
bool Postgresql::beginTransaction() {
    if (in_transaction) {
        std::cerr << "[PGBC] beginTransaction() - transaction already in progress" << std::endl;
        return false;
    }

    PGresult* result = PQexec(_PGBCConnection, "BEGIN TRANSACTION");
    bool success = (PQresultStatus(result) == PGRES_COMMAND_OK);

    if (success) {
        in_transaction = true;
    } else {
        std::cerr << "[PGBC] beginTransaction() failed: " << PQerrorMessage(_PGBCConnection) << std::endl;
    }

    PQclear(result);
    return success;
}

bool Postgresql::commitTransaction() {
    if (!in_transaction) {
        std::cerr << "[PGBC] commitTransaction() - no active transaction" << std::endl;
        return false;
    }

    PGresult* result = PQexec(_PGBCConnection, "COMMIT");
    bool success = (PQresultStatus(result) == PGRES_COMMAND_OK);

    if (success) {
        in_transaction = false;
    } else {
        std::cerr << "[PGBC] commitTransaction() failed: " << PQerrorMessage(_PGBCConnection) << std::endl;
        // Attempt rollback on commit failure
        rollbackTransaction();
    }

    PQclear(result);
    return success;
}

bool Postgresql::rollbackTransaction() {
    if (!in_transaction) {
        std::cerr << "[PGBC] rollbackTransaction() - no active transaction" << std::endl;
        return true;  // Not an error if no transaction active
    }

    PGresult* result = PQexec(_PGBCConnection, "ROLLBACK");
    bool success = (PQresultStatus(result) == PGRES_COMMAND_OK);

    if (success) {
        in_transaction = false;
    } else {
        std::cerr << "[PGBC] rollbackTransaction() failed: " << PQerrorMessage(_PGBCConnection) << std::endl;
    }

    PQclear(result);
    return success;
}

void Postgresql::close() {
    // Auto-rollback any active transaction
    if (in_transaction) {
        rollbackTransaction();
    }
    
    // Return connection to pool instead of closing
    if (_PGBCConnection) {
        ConnectionPool& pool = ConnectionPool::getInstance();
        pool.releaseConnection(_PGBCConnection);
    }
    
    _PGBCConnection = nullptr;
}