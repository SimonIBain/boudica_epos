/**
 * @copyright Copyright OmniIndex inc 2025
 * @author Simon Ian Bain
 * @license MIT
 */
import LocalStore from './storage.js';

/**
 * @typedef {object} CredentialsInstance
 * @property {function(string=): (string | null | undefined)} User - Gets or sets the username in local storage.
 * @property {function(string=): (string | null | undefined)} Password - Gets or sets the password in local storage.
 */

/**
 * A factory function to manage user credentials (username and password).
 * It acts as a convenient getter/setter wrapper around the Storage module.
 *
 * @returns {CredentialsInstance} An object with methods to manage user credentials.
 */
const Credentials = () => {
    const Storage = LocalStore();
    /**
     * Gets or sets the username. If a username is provided, it's set in storage.
     * If no username is provided, the current one is returned.
     * @param {string} [username] - The username to set.
     * @returns {string | null | undefined} The current username if called as a getter.
     */
    const User = (username) => {
        if ( !username ) {
            return Storage.getItem('username');
        }
        Storage.setItem('username', username);
    };

    /**
     * Gets or sets the password. If a password is provided, it's set in storage.
     * If no password is provided, the current one is returned.
     * @param {string} [password] - The password to set.
     * @returns {string | null | undefined} The current password if called as a getter.
     */
    const Password = (password) => {
        if ( !password ) {
            return Storage.getItem('password');
        }
        Storage.setItem('password', password);
    }; 
    return {
        User,
        Password
    }
}

export default Credentials;