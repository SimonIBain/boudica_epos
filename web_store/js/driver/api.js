/**
 * @copyright Copyright OmniIndex inc 2025
 * @author Simon Ian Bain
 * @license MIT
 */
import LocalStore from './storage.js';
import Credentials from './credentials.js';

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
 * A factory function that provides methods for user and administration tasks.
 * This is typically accessed via `pgbc.Api()`.
 * @returns {APIInstance} An object containing methods for API interactions.
 */
const API = () => {
    const Storage = LocalStore();
    const Creds = Credentials();

    /**
     * A private helper function to execute API calls to the PGBC server.
     * @private
     * @param {URLSearchParams} params - The parameters for the API call.
     * @param {string} [server] - The server URL. If not provided, it's retrieved from storage.
     * @returns {Promise<Response>} The raw response from the fetch call.
     * @throws {Error} If the network request fails or the response is not ok.
     */
    const ExecuteCall = async (params, server) => {
        if ( !params ) {
            throw new Error ('No params have been passed')
        }
        const serverUrl = server || Storage.getItem('server');
        const resp = await fetch(`${serverUrl}/cgi-bin/pgbcadmin?${params.toString()}`);
        if (!resp.ok) {
            const error = new ErrorEvent('Connection Error', {
                error : new Error(`Could not connect to ${serverUrl}. Please retry.`),
                message : `Could not connect to ${serverUrl}. Please retry.`,
                lineno : 18,
                filename : 'api.js'
            });
            throw error            
        }
        if ( resp.status === 200) {
            return resp;
        }                    
        throw new Error("Response was malformed");
    };


    /**
     * Registers the initial administrative user for the PGBC instance.
     * This should only be called once during setup.
     * @param {string} user - The desired username for the initial admin.
     * @param {string} password - The desired password for the initial admin.
     * @param {string} server - The server URL (e.g., "http://localhost:8080").
     * @returns {Promise<Map<string, string>>} A map containing the new user and database, or an error message.
     */
    const SignUp = async (user, password, server) => {
        if ( !user || !password || !server) {
            throw new Error ('Please provide all of teh required details');
        }
        Creds.Password(password);
        Creds.User(user);
        const params = new URLSearchParams({ username: Creds.User(), password: Creds.Password(), command: 'registerinitialuser', type: "0" });
        try {
            const resp = await ExecuteCall(params, server);
            if ( resp.status === 200) {
                const json = await resp.json();
                if ( json.user != "" && json.user != null && json.user != undefined ) {
                    const user_map = new Map();
                    user_map.set('user', json.user);
                    user_map.set('database', json.database);
                    return user_map;
                } else {
                    const map = new Map();
                    map.set('error', json.response || json.errors);
                    return map; 
                }
            }
        }catch ( error ){
            const map = new Map();
            map.set('error', error.message);
            return map;
        }  
    };

    /**
     * Creates a new user. Requires an active connection.
     * @param {string} user - The username for the new user.
     * @param {string} password - The password for the new user.
     * @param {boolean} [isAdmin=false] - Whether the new user should have admin privileges.
     * @returns {Promise<string>} A success message or an error message.
     * @throws {Error} If not connected or if parameters are missing.
     */
    const CreateUser = async (user, password, isAdmin) => {
        if ( !user || !password ) {
            throw new Error ('Please provide a username and password');
        }
        if ( Storage.getItem('connected') != 'true' ) {
            throw new Error ('No active PGBC connection.')
        
        }
        const admin = isAdmin ? "true" : "false";
        const params = new URLSearchParams({ username: Creds.User(), password: Creds.Password(), command: 'createuser', newuser: user, newpassword: password, isadmin: admin });
        try {
            const resp = await ExecuteCall(params, Storage.getItem('server'));
            if ( resp.status === 200) {
                const json = await resp.json();
                if ( json.errors === "" || json.errors === null ) {
                    return json.response;
                } else {
                    return json.errors;
                }
            }
        }catch ( error ){
            return error.message;
        }  
    };  
    
    /**
     * A private helper function for enabling/disabling/dropping users to reduce duplication.
     * @private
     * @param {string} user - The target username.
     * @param {string} command - The command to execute ('enableuser', 'disableuser', 'dropuser').
     * @returns {Promise<boolean>} True on success, false on failure.
     * @throws {Error} If not connected or if the user is not provided.
     */
    const manageUserStatus = async (user, command) => {
        if (!user) {
            throw new Error('Please provide a username');
        }
        if (Storage.getItem('connected') !== 'true') {
            throw new Error('No active PGBC connection.');
        }
        const params = new URLSearchParams({
            username: Creds.User(),
            password: Creds.Password(),
            command: command,
            queryuser: user
        });
        try {
            const resp = await ExecuteCall(params, Storage.getItem('server'));
            const text = await resp.text();
            return text.trim().toLowerCase() === "success";
        } catch (error) {
            throw error;
        }
    };

    /**
     * Disables a user, preventing them from logging in. Requires an active connection.
     * @param {string} user - The username to disable.
     * @returns {Promise<boolean>} True on success, false on failure.
     */
    const DisableUser = async (user) => {
        return manageUserStatus(user, 'disableuser');
    };
    
    /**
     * Enables a previously disabled user. Requires an active connection.
     * @param {string} user - The username to enable.
     * @returns {Promise<boolean>} True on success, false on failure.
     */
    const EnableUser = async (user) => {
        return manageUserStatus(user, 'enableuser');
    }; 
    
    /**
     * Permanently deletes a user. Requires an active connection.
     * @param {string} user - The username to drop.
     * @returns {Promise<boolean>} True on success, false on failure.
     */
    const DropUser = async (user) => {
        return manageUserStatus(user, 'dropuser');
    }; 
    
    /**
     * Updates the password for the currently logged-in user. Requires an active connection.
     * @param {string} newpassword - The new password.
     * @returns {Promise<boolean>} True on success.
     * @throws {Error} If not connected, password not provided, or if the API returns an error.
     */
    const UpdatePassword = async (newpassword) => {
        if ( !newpassword ) {
            throw new Error ('Please provide a new password');
        }
        if ( Storage.getItem('connected') != 'true' ) {
            throw new Error ('No active PGBC connection.')
        
        }
        const params = new URLSearchParams({ username: Creds.User(), password: Creds.Password(), command: 'updatepassword', newpassword: newpassword });
        try {
            const resp = await ExecuteCall(params, Storage.getItem('server'));
            if ( resp.status === 200) {
                const json = await resp.json();
                if ( json.errors === "" || json.errors === null ) {
                    return true;
                } else {
                    throw new Error(json.errors);
                }
            }
        }catch ( error ){
            throw error
        }  
    };     

    return {
        SignUp,
        CreateUser,
        EnableUser,
        DisableUser,
        DropUser,
        UpdatePassword
    };
};

export default API;