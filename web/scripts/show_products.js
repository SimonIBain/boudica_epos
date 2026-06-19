document.addEventListener('DOMContentLoaded', function() {

    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if ( !User || !Password ) {
        document.getElementById('login_div').style.display = 'flex'; 
        //showToast('You must be logged in to add a supplier.', 'error');
        return; 
    }


    const showProductsTab = document.getElementById('showProducts');
    const productListContainer = document.getElementById('product-list-container');
    const supplierFilter = document.getElementById('show-products-supplier-filter');

    if ( !productListContainer || !supplierFilter) {
        return;
    }

    let allProducts = []; // To store all products fetched from the API

    const filterAndRenderProducts = () => {
        let selectedSupplier = supplierFilter.value.toLowerCase();
        let productsToRender = allProducts;

        if (selectedSupplier) {
            productsToRender = allProducts.filter(product => product.supplier.toLowerCase() === selectedSupplier);
        }
        renderProducts(productsToRender);
    };

    const renderProducts = (products = []) => {
        productListContainer.innerHTML = ''; // Clear previous content

        if (!products || products.length === 0) {
            productListContainer.innerHTML = '<p>No products found.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'product-list-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Barcode</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => `
                    <tr data-barcode="${product.barcode}">
                        <td>${product.description}</td>
                        <td><div contenteditable="true">£${parseFloat(product.price).toFixed(2)}</div></td>
                        <td><input type="text" value="${product.barcode}" /></td>
                        <td><button class="update-product-btn" data-barcode="${product.barcode}">Update</button></td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        productListContainer.appendChild(table);
    };        

    // Add event listener to the dropdown
    supplierFilter.addEventListener('change', async function (ev) {
        ev.preventDefault();
        const selectedSupplier = supplierFilter.value;

        if (!selectedSupplier) {
            allProducts = [];
            filterAndRenderProducts();
            return;
        }

        showLoadingOverlay();
        try {
            const query = `SELECT supplierencrypt, barcode, rs_price, product_description FROM store.products WHERE ~ store.products.supplierencrypt = '${selectedSupplier}' ~ ;`;
            let response = await fetch(`${PGBC_Manager}?username=${User}&command=runquery&password=${Password}&query=${query}&explain=false&display=false`);
            
            if (!response.ok) {
                showToast('The application returned an unrecognized error. Please retry.', 'error');
                allProducts = [];
            } else {
                let response_text = await response.text();
                response_text = response_text.replaceAll('\n', ' ');
                if (DEBUG) console.log(response_text);

                const json = JSON.parse(response_text);
                if (json.error) {
                    showToast(json.error, 'error');
                    allProducts = [];
                } else {
                    const products = json.response || [];
                    allProducts = products.map(p => ({
                        supplier: p.supplierencrypt,
                        description: p.product_description,
                        price: p.rs_price,
                        barcode: p.barcode
                    }));
                }
            }
        } catch (error) {
            console.error("Error parsing or fetching products list:", error);
            showToast('Failed to load product data from the server.', 'error');
            allProducts = [];
        } finally {
            filterAndRenderProducts();
            hideLoadingOverlay();
        }
    });
});