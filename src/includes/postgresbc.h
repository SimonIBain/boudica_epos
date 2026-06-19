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
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
**/

#ifndef POSTGRESBC_H
#define POSTGRESBC_H

#include <string>
#include <queue>
#include <mutex>
#include <memory>
#include <vector>
#include </usr/include/postgresql/libpq-fe.h>

// Connection pool configuration constants
#define MAX_POOL_SIZE 20
#define MIN_POOL_SIZE 5
#define CONNECTION_TIMEOUT 30

/**! PooledConnection - Wrapper for database connection with pool management
*/
struct PooledConnection {
    PGconn* connection;
    bool in_use;
    time_t last_used;
    
    PooledConnection(PGconn* conn) : connection(conn), in_use(false), last_used(0) {}
};

/**! ConnectionPool - Thread-safe connection pooling manager
*/
class ConnectionPool {
public:
    static ConnectionPool& getInstance();
    
    /**! Initialize pool with connection parameters
     * @param user - Database user
     * @param password - Database password
     * @param uri - Database server URI
     * @param port - Database port
     * @param database - Database name
     * @return bool - true if initialized successfully
    */
    bool initialize(std::string user, std::string password, std::string uri, 
                   std::string port, std::string database);
    
    /**! Get connection from pool
     * @return PGconn* - Available database connection
    */
    PGconn* getConnection();
    
    /**! Return connection to pool
     * @param conn - Connection to return
    */
    void releaseConnection(PGconn* conn);
    
    /**! Close all connections and clear pool
    */
    void shutdown();
    
    /**! Get current pool size
     * @return int - Number of connections in pool
    */
    int getPoolSize();
    
private:
    ConnectionPool() : initialized(false) {}
    ~ConnectionPool();
    
    std::queue<std::shared_ptr<PooledConnection>> available_connections;
    std::vector<std::shared_ptr<PooledConnection>> all_connections;
    std::mutex pool_mutex;
    
    std::string db_user, db_password, db_uri, db_port, db_database;
    bool initialized;
    
    /**! Create new connection
     * @return PGconn* - New database connection or nullptr
    */
    PGconn* createConnection();
    
    /**! Validate connection is still active
     * @param conn - Connection to validate
     * @return bool - true if connection is valid
    */
    bool validateConnection(PGconn* conn);
};

/**! Postgresql - Main database class with pool support and transaction management
*/
class Postgresql {
    public: 
    /*! The ctor for the class (uses connection pool)
     * @param std::string user
     * @param std::string password
     * @param std::string uri
     * @param std::string port
     * @std::string database
    */
    Postgresql(std::string , std::string , std::string , std::string , std::string );
    ~Postgresql();

    /**! This method will return the last message from the PostgreSQL server
     * @return std::string 
    */
    std::string getLastError();
    
    /*! This method will capture the Notices that Postgresql
    * sends to the console
    * @param void
    * @param PGResult
    */
    static void setWarning(void*, const PGresult*);
    
    /*! This method will return all notices from a given call
    * clearing the cache as it does so
    * @return std::string 
    */
    std::string getWarnings();
    
    /**! This method will run a command against the PGBC instance
     * returning the json from the call
     * @param std::string sql
     * @return const char* json string
    */
    const char* runCommand(std::string commandData);
    
    /**! Method to run a query without passing back a result set
     * @param std::string query
     * @return int - 0 on success, 1 on error
    */
    int exec(std::string );
    
    /**! Start a transaction
     * @return bool - true if transaction started successfully
    */
    bool beginTransaction();
    
    /**! Commit current transaction
     * @return bool - true if commit successful
    */
    bool commitTransaction();
    
    /**! Rollback current transaction
     * @return bool - true if rollback successful
    */
    bool rollbackTransaction();
    
    /**! Method to close the current connection and return it to pool
     * @return void
    */
    void close();
    
    /**! Check if connection is still active
     * @return bool - true if connection is valid
    */
    bool isValid();
    
    /**! Get detailed error information with error code
     * @return std::string - Formatted error message with code
    */
    std::string getDetailedError();

    bool _isConnected;
    
    private:
    PGconn * _PGBCConnection;
    std::string _instanceUser, _instancePassword, _instanceUri, _port;
    bool in_transaction;
};
#endif