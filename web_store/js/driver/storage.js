/**
 * @copyright Copyright OmniIndex inc 2025
 * @author Simon Ian Bain
 * @license MIT
 */

/**
 * @typedef {object} StorageInstance
 * @property {function(): void} clear - Removes all items from local storage.
 * @property {function(string): (string | null)} getItem - Retrieves an item from local storage by key.
 * @property {function(string): void} removeItem - Removes an item from local storage by key.
 * @property {function(string, string): void} setItem - Adds or updates an item in local storage.
 */

/**
 * A factory function that creates a wrapper around the browser's localStorage API.
 * This provides a consistent interface for storing and retrieving data locally.
 *
 * @returns {StorageInstance} An object with methods to interact with localStorage.
 */
const Storage = () => {
  /**
   * Removes all key/value pairs from localStorage.
   */
  const clear = () => {
    localStorage.clear();
  }

  /**
   * Retrieves an item from localStorage.
   * @param {string} key The key of the item to retrieve.
   * @returns {string | null} The value of the item, or null if the key does not exist.
   */
  const getItem = key => {
    return localStorage.getItem(key);
  }

  /**
   * Removes an item from localStorage.
   * @param {string} key The key of the item to remove.
   */
  const removeItem = key => {
    localStorage.removeItem(key);
  }

  /**
   * Adds a key/value pair to localStorage, or updates the value if the key already exists.
   * @param {string} key The key of the item to set.
   * @param {string} value The value to store.
   */
  const setItem = (key, value) => {
    localStorage.setItem(key, value);
  }

  return {
    clear,
    getItem,
    removeItem,
    setItem,
  }
}
export default Storage;