/**
 * This is teh main interface to yuor products catalog
 */

import Credentials from './driver/credentials.js';

const EPOS = () => {
    const catalog = 'https://demo.pgbc.ai/cgi-bin/boudica_pos';
    const User = Credentials();

    const SearchStore = async (search_phrase) => {
        if (!search_phrase) {
            return [];
        }
        try {
            const params = new URLSearchParams({
                username: User.User(),
                password: User.Password(),
                command: 'getdetails',
                barcode: search_phrase // The API is expected to handle a search term here
            });
            const response = await fetch(`${catalog}?${params.toString()}`);
            if (!response.ok) {
                console.error("Error fetching item details:", response.status, response.statusText);
                return [];
            }
            const data = await response.json();

            // Map the returned fields to the format expected by the UI, providing defaults where needed.
            if (Array.isArray(data.products_search_details)) { 
                const seen = new Set();
                // Use reduce to filter out duplicates (by description and price) and items with a price less than 0.01.
                return data.products_search_details.reduce((acc, item) => {
                    const price = parseFloat(item.price) || 0.00;
                    const description = item.description;
                    const uniqueKey = `${description}|${price.toFixed(2)}`;

                    if (price >= 0.01 && description && !seen.has(uniqueKey)) {
                        seen.add(uniqueKey);
                        acc.push({
                            id: item.barcode,
                            name: description,
                            price: price,
                            image: 'assets/logo.png', // Default image as it's not in the response
                            quantity: 0 // Default quantity, UI will show "Can be Ordered"
                        });
                    }
                    return acc;
                }, []);
            }
            return [];
        } catch (error) {
            console.error("Error fetching item details:", error);
            return [];
        }
    };

    const AskBoudica = async (prompt) => {
        if (!prompt) {
            return '';
        }
        try {
            const params = new URLSearchParams({
                username: User.User(),
                password: User.Password(),
                command: 'getadvice',
                prompt: prompt 
            });
            const response = await fetch(`${catalog}?${params.toString()}`);
            if (!response.ok) {
                console.error("Error asking Boudica:", response.status, response.statusText);
                return '<p>Sorry, I seem to be having trouble connecting. Please try again later.</p>';
            }
            // The 'getadvice' command returns raw HTML, which can cause JSON parsing errors.
            // By reading the response as text, we avoid trying to parse it as JSON.
            let htmlResponse = await response.text();
            let find = htmlResponse.indexOf('{"response": "');
            if (find >= 0) {
                htmlResponse = htmlResponse.substring(find + 14); 
            }
            find = htmlResponse.lastIndexOf('"}');
            if (find > 0) {
                htmlResponse = htmlResponse.substring(0, find); 
            }            
            return htmlResponse || '<p>Sorry, I received an unexpected response. Please try again.</p>';
        } catch (error) {
            console.error("Error asking Boudica:", error);
            return '<p>Sorry, an error occurred while I was thinking. Please check your connection and try again.</p>';
        }
    };

    return {
        SearchStore,
        AskBoudica
    }

};

export default EPOS;