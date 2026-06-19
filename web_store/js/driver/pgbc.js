/**
 * @copyright Copyright OmniIndex inc 2025
 * @author Simon Ian Bain
 * @license MIT
 */
import LocalStore from './storage.js';
import Credentials from './credentials.js';
import ResultSet from './results.js';
import API from './api.js';

/**
 * @typedef {object} APIInstance
 * @property {function(string, string, string): Promise<Map<string, string>>} SignUp - Registers the initial administrative user for the PGBC instance.
 * @property {function(string, string, boolean=): Promise<string>} CreateUser - Creates a new user.
 * @property {function(string): Promise<boolean>} EnableUser - Enables a previously disabled user.
 * @property {function(string): Promise<boolean>} DisableUser - Disables a user, preventing them from logging in.
 * @property {function(string): Promise<boolean>} DropUser - Permanently deletes a user.
 * @property {function(string): Promise<boolean>} UpdatePassword - Updates the password for the currently logged-in user.
 */

/**
 * @typedef {object} ResultSetInstance
 * @property {string[]} columns - An array of column names from the result set.
 * @property {Map<number, Map<string, *>>} values - A Map of all rows, keyed by row index.
 * @property {function(): boolean} Next - Advances the iterator to the next row.
 * @property {function(string): *} GetString - Retrieves a value from the current row by column name.
 * @property {function(string): *} GetValue - An alias for GetString.
 * @property {function(): (Map<string, *> | undefined)} Current - Gets the entire current row as a Map.
 */

/**
 * @typedef {object} PGBCInstance
 * @property {function(string): Promise<boolean>} Connect - Establishes a connection to the PGBC server.
 * @property {function(string): Promise<number>} Exec - Executes a non-returning SQL query (e.g., INSERT, UPDATE, DELETE).
 * @property {function(string): Promise<Array<Object>>} ExecuteQuery - Executes a SQL query that returns data.
 * @property {function(): ResultSetInstance} Results - Gets the results of the last `ExecuteQuery` call as a ResultSet object.
 * @property {function(): APIInstance} Api - Returns an instance of the API module for user management.
 * @property {function(): boolean} Close - Clears all stored connection data and disconnects.
 * @property {function(): boolean} IsActive - Checks if there is an active connection.
 */

/**
 * The main factory function for the PGBC driver.
 * It provides a complete interface for connecting to, querying, and managing a PGBC instance.
 *
 * @example
 * // Basic Connection and Query
 * import PGBC from './pgbc.js';
 *
 * const pgbc = PGBC();
 * const connStr = "host=http://localhost:8080 user=admin password=secret dbname=mydatabase";
 *
 * async function runQuery() {
 *   try {
 *     if (await pgbc.Connect(connStr)) {
 *       console.log("Successfully connected!");
 *       const data = await pgbc.ExecuteQuery("SELECT * FROM users;");
 *       const results = pgbc.Results();
 *       while (results.Next()) {
 *         console.log(`User: ${results.GetValue('name')}`);
 *       }
 *     }
 *   } catch (error) {
 *     console.error("An error occurred:", error.message);
 *   } finally {
 *     pgbc.Close();
 *   }
 * }
 *
 * runQuery();
 *
 * @returns {PGBCInstance} An object containing the full PGBC driver API.
 */
const PGBC = () => {
    const Storage = LocalStore();
    const Creds = Credentials();
    let JResults;

    let IsConnected = false;

    /**
     * A private getter/setter for the database name.
     * @private
     * @param {string} [database] - The database name to set.
     */
    const Database = (database) => {
        if ( !database ) {
            return Storage.getItem('database');
        }
        Storage.setItem('database', database);
    }; 

    /**
     * A private getter/setter for the server URL.
     * @private
     * @param {string} [server] - The server URL to set.
     */
    const Server = (server) => {
        if ( !server ) {
            return Storage.getItem('server');
        }
        Storage.setItem('server', server);
    }; 
    
    /**
     * A private getter/setter for the port number.
     * @private
     * @param {string} [port] - The port number to set.
     */
    const Port = (port) => {
        if ( !port ) {
            return Storage.getItem('port');
        }
        Storage.setItem('port', port);
    }; 
    
    /**
     * Establishes a connection to the PGBC server using a connection string.
     * On success, stores connection details for subsequent calls.
     * @param {string} connection_string - The connection string (e.g., "host=... user=... password=... dbname=...").
     * @returns {Promise<boolean>} True if the connection is successful, false otherwise.
     * @throws {ErrorEvent} If the connection fails or the response is malformed.
     */
    const Connect = async (connection_string) => {
        if ( !connection_string ) {
            const error = new ErrorEvent('Connection Error', {
                error : new Error(`Could not connect to PGBC. Please check your connection properties.`),
                message : `Could not connect to PGBC. Please check your connection properties.`,
                lineno : 33,
                filename : 'pgbc.js'
            });
            throw error
        }
        const parts = connection_string.split(' ');
        parts.forEach(element => {
            let tmp = element.split('=');
            switch ( tmp[0] ) {
                case 'host':
                    Server(tmp[1]);
                    break;
                case 'port':
                    Port(tmp[1]);
                    break;
                case 'password':
                    Creds.Password(tmp[1]);
                    break;
                case 'user':
                    Creds.User(tmp[1]);
                    break;
                case 'dbname':
                    Database(tmp[1]);
                    break;                                        
                default:
                    break;
            }
        });
        const params = new URLSearchParams({ username: Creds.User(), password: Creds.Password(), command: 'login', database: Database(), port: Port() });
        const resp = await fetch(`${Server()}/cgi-bin/pgbcadmin?${params.toString()}`);
        if (!resp.ok) {
            const error = new ErrorEvent('Connection Error', {
                error : new Error(`Could not connect to ${Server()}. Please check your connection properties.`),
                message : `Could not connect to ${Server()}. Please check your connection properties.`,
                lineno : 67,
                filename : 'pgbc.js'
            });
            throw error            
        }
        if ( resp.status === 200) {
            const json = await resp.json();
            if ( json.connected === 'true') { 
                IsConnected = true;
                Storage.setItem('connected', 'true');
                return true; 
            }
            else { 
                IsConnected = false;
                Storage.setItem('connected', 'false');
                return false;
            }
        }
        const error = new ErrorEvent('Connection Error', {
            error : new Error(`Could not connect to ${Server()}. The response was ${resp.status}. Please check your connection properties.`),
            message : `Could not connect to ${Server()}. The response was ${resp.status}. Please check your connection properties.`,
            lineno : 77,
            filename : 'pgbc.js'
        });
        throw error        
    }

    /**
     * A private helper to execute queries against the PGBC server.
     * @private
     * @param {string} query - The SQL query to execute.
     * @returns {Promise<any>} The JSON response from the server.
     * @throws {Error|ErrorEvent} If the request fails or the server returns an error.
     */
    const _executeQuery = async (query) => {
        if (!IsConnected) {
            throw new Error('No active PGBC connection.');
        }
        if (!query) {
            throw new Error('A query must be provided.');
        }
        const params = new URLSearchParams({
            username: Creds.User(),
            password: Creds.Password(),
            command: 'command',
            database: Database(),
            port: Port(),
            query: query
        });

        const resp = await fetch(`${Server()}/cgi-bin/pgbcadmin?${params.toString()}`);

        if (!resp.ok) {
            IsConnected = false;
            Storage.setItem('connected', 'false');
            throw new ErrorEvent('Connection Error', {
                error: new Error(`Could not connect to ${Server()}. Please retry.`),
                message: `Could not connect to ${Server()}. Please retry.`
            });
        }
        const json = await resp.json();
        if (json.return === "0") {
            return json;
        } else {
            throw new Error(json.errors);
        }
    };

    /**
     * Executes a non-returning SQL query (e.g., INSERT, UPDATE, CREATE TABLE).
     * @param {string} query - The SQL query to execute.
     * @returns {Promise<number>} 0 on success.
     * @throws {Error} If not connected, no query is provided, or the server returns an error.
     */
    const Exec = async (query) => {
        await _executeQuery(query);
        return 0;
    };

    /**
     * Executes a SQL query that returns data (e.g., SELECT).
     * The results are stored internally and can be accessed via the `Results()` method.
     * @param {string} query - The SQL query to execute.
     * @returns {Promise<Array<Object>>} An array of row objects on success.
     * @throws {Error} If not connected, no query is provided, or the server returns an error.
     */
    const ExecuteQuery = async (query) => {
        const json = await _executeQuery(query);
        JResults = json;
        return json.response;
    };

    /**
     * Gets the results of the last `ExecuteQuery` call.
     * @returns {ResultSetInstance} A ResultSet object for iterating over the data.
     */
    const Results = () => {
        return ResultSet(JResults);
    }

    /**
     * Returns an instance of the API module for user management and other admin tasks.
     * @returns {APIInstance}
     */
    const Api = () => {
        return API();
    }
    
    /**
     * Clears all stored connection data (user, password, server, etc.) from local storage and marks the connection as inactive.
     * @returns {boolean} Always returns true.
     */
    const Close = () => {
        Storage.clear();
        IsConnected = false;
        return true;
    };

    /**
     * Checks if there is an active connection to the PGBC server.
     * @returns {boolean} True if connected, false otherwise.
     */
    const IsActive = () => {
        return IsConnected;
    };

    return {
        Connect,
        Exec,
        ExecuteQuery,
        Close,
        IsActive,
        Results,
        Api
    }

};

export default PGBC;
