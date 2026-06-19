/**
 * @copyright Copyright OmniIndex inc 2025
 * @author Simon Ian Bain
 * @license MIT
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
 * A factory function that creates a ResultSet object to easily iterate over
 * a JSON response from a database query. It provides an iterator-style
 * interface with `Next()` and methods to get data by column name.
 *
 * @param {object} json The raw JSON response from the server.
 * @param {Array<Object>} [json.response] An array of objects, where each object represents a row.
 * @returns {ResultSetInstance} An object with methods to access the result set data.
 */
const ResultSet = (json) => {
    let currentRow = -1;
    let Row;

    /**
     * Extracts the column names from the first row of the response.
     * @private
     * @returns {string[]} An array of column names.
     */
    const getColumns = () => {
        if (!json.response || json.response.length === 0) {
            return [];
        }
        return Object.keys(json.response[0]);
    };

    /**
     * Transforms the array of row objects into a Map of Maps for efficient access.
     * @private
     * @returns {Map<number, Map<string, *>>} A map of all rows.
     */
    const getValues = () => {
        const resultMap = new Map();
        if (!json.response) {
            return resultMap;
        }
        json.response.forEach((row, index) => {
            resultMap.set(index, new Map(Object.entries(row)));
        });
        return resultMap;
    };

    const columns = getColumns();
    const values = getValues();

    /**
     * Advances the iterator to the next row in the result set.
     * It must be called once before any data can be retrieved.
     * @returns {boolean} `true` if there is another row to process, `false` otherwise.
     */
    const Next = () => {
        currentRow++;
        if (currentRow < values.size) {
            Row = values.get(currentRow);
            return true;
        }
        Row = undefined;
        return false;
    };

    /**
     * Retrieves a value from the current row by its column name (key).
     * @param {string} key The column name.
     * @returns {*} The value associated with the key in the current row, or undefined if there is no current row.
     */
    const GetString = (key) => {
        if (!Row) {
            return undefined;
        }
        return Row.get(key);
    };

    /**
     * Alias for GetString. Retrieves a value from the current row by its column name.
     * @param {string} key The column name.
     * @returns {*} The value associated with the key in the current row.
     */
    const GetValue = (key) => {
        return GetString(key);
    };

    /**
     * Gets the entire current row as a Map.
     * @returns {Map<string, *> | undefined} The current row as a Map, or undefined if iteration has not started or has finished.
     */
    const Current = () => {
        return Row;
    };

    return {
        columns,
        values,
        Next,
        GetString,
        GetValue,
        Current
    };
};

export default ResultSet;