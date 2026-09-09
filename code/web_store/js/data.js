import PGBC from './driver/pgbc.js';
import Credentials from './driver/credentials.js';
import EPOS from './epos.js';

const Data = async() =>  {

    const pgbc = PGBC();
    const creds = Credentials();
    // Use credentials for the web store's public-facing user from boudica_pos.conf
    creds.User('sibain@omniindex.io');
    creds.Password('Ch35t3rP455w0rd');//Only for testing on an none whitelist box

    let isConnected = false;
    // Use postgres as dbname from boudica_pos.conf
    const connStr = `host=https://demo.pgbc.ai port=5435 user=${creds.User()} password=${creds.Password()} dbname=postgres`;
    
    try {
        const connected = await pgbc.Connect(connStr);
        if (connected) {
            isConnected = true;
            console.log("Connected to the database successfully.");
        } else {
            console.error("Failed to connect to the database.");
        }
    } catch (error) {
        console.error("Error during database connection:", error);
    }

    const StoreFrontList = async (supplier = '', description = '') => {
        if (!isConnected) {
            console.error("Not connected to database. Cannot fetch products.");
            return [];
        }

        try {
            // Fetch the featured categories dynamically from the database.
            const categoriesSql = `SELECT name, clauses FROM store.web_store_front ORDER BY name;`;
            const categoriesData = await pgbc.ExecuteQuery(categoriesSql);

            if (!categoriesData || categoriesData.length === 0) {
                console.log("No featured categories found in store.web_store_front table.");
                return [];
            }

            const featuredCategories = categoriesData.map(cat => ({
                name: cat.name,
                whereClause: cat.clauses
            }));

            // Create an array of query promises. Each promise fetches the cheapest
            // product with an image for a given category.
            const queryPromises = featuredCategories.map(category => {
                const sql = `
                    SELECT 
                        MIN(rs_price) price, 
                        image_url as image
                    FROM store.products 
                    WHERE 
                        ${category.whereClause}
                        AND image_url IS NOT NULL AND image_url != '' AND rs_price > 0.01
                    GROUP BY image_url
                    LIMIT 1;
                `;
                // Return a promise that resolves to an object containing both the result and the original category info.
                return pgbc.ExecuteQuery(sql).then(result => ({ result, category }));
            });

            // Execute all queries in parallel for efficiency.
            const resultsWithCategory = await Promise.all(queryPromises);

            // Use flatMap to process the results. For each category that returned a product,
            // we create a new object for our product list.
            return resultsWithCategory.flatMap(({ result, category }) => {
                if (!result || result.length === 0) {
                    return []; // If no product found, flatMap will discard this empty array.
                }
                const item = result[0];
                const price = parseFloat(item.price) || 0.00;

                // Do not display the item if the price is less than 0.01
                if (price < 0.01) {
                    return [];
                }

                return [{
                    id: category.name, // Use category name as a unique ID for the card
                    name: `${category.name.toUpperCase()}`,
                    price: price, // Return price as a number for correct formatting in the frontend
                    image: item.image || 'assets/logo.png',
                    category: 'featured',
                    searchTerm: category.whereClause // Pass the full where clause for the collection modal
                }];
            });
        } catch (error) {
            console.error("Error fetching storefront list:", error);
            return [];
        }
    };

    const getProductsByCategory = async (categoryWhereClause = '') => {
        if (!isConnected || !categoryWhereClause) {
            return [];
        }
        const sql = `
            SELECT
                p.barcode as id,
                p.product_description as name,
                p.rs_price as price,
                p.image_url as image,
                s.available as quantity
            FROM store.products AS p
            LEFT JOIN store.stock AS s ON p.barcode = s.barcode
            WHERE ${categoryWhereClause}
              AND p.image_url IS NOT NULL AND p.image_url != ''
              AND p.rs_price >= 0.01
            ORDER BY p.rs_price;
        `;
        try {
            const data = await pgbc.ExecuteQuery(sql);
            return data.map(item => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price) || 0.00,
                image: item.image || 'assets/logo.png',
                quantity: parseInt(item.quantity, 10) || 0
            }));
        } catch (error) {
            console.error(`Error fetching products for category:`, error);
            return [];
        }
    };

    /**
     * Searches for products using the EPOS API.
     * @param {string} searchTerm The term to search for.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of product objects.
     */
    const searchProducts = async (searchTerm = '') => {
        const epos = EPOS();
        return await epos.SearchStore(searchTerm);
    };

    const askBoudica = async (prompt = '') => {
        const epos = EPOS();
        return await epos.AskBoudica(prompt);
    };

    return {
        StoreFrontList,
        getProductsByCategory,
        searchProducts,
        askBoudica
    };
};

export default Data;