import Toast from './toast.js';
import Data from './data.js';
import { apiCall, escapeHtml } from './session.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Product Data ---
    let products = [];
    let dataLayer; // Initialize later
    let currentCategoryProducts = [];
    let currentSearchResults = [];

    // --- Shopping Cart ---
    let cart = [];

    // --- DOM Elements ---
    const productList = document.getElementById('product-list');
    const cartCounter = document.getElementById('cart-counter');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const toast = Toast();
    // Modal elements
    const loaderHTML = `<div class="loader-container"><img src="assets/pgbc.gif" alt="Loading..." class="loading-gif"></div>`;
    const specialOrderModal = document.getElementById('special-order-modal');
    const categoryProductsModal = document.getElementById('category-products-modal');
    const categoryModalTitle = document.getElementById('category-modal-title');
    const categoryProductList = document.getElementById('category-product-list');
    const searchResultsModal = document.getElementById('search-results-modal');
    const searchResultsModalTitle = document.getElementById('search-results-modal-title');
    const searchResultsProductList = document.getElementById('search-results-product-list');
    const searchForm = document.getElementById('product-search-form');
    const searchInput = document.getElementById('product-search-input');
    const boudicaChatModal = document.getElementById('boudica-chat-modal');
    const boudicaChatWindow = document.getElementById('boudica-chat-window');
    const boudicaChatForm = document.getElementById('boudica-chat-form');
    const boudicaChatInput = document.getElementById('boudica-chat-input');
    const specialOrderForm = document.getElementById('special-order-form');

    // --- Functions ---

    /** Renders products on the page. */
    function displayProducts() {
        if (!productList) return;
        if (products.length === 0) {
            productList.innerHTML = loaderHTML;
            return;
        }
        productList.innerHTML = products.map(product => `
            <div class="product-card" data-id="${escapeHtml(product.id)}">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-image">
                <div class="product-info">
                    <h3>${escapeHtml(product.name)}</h3>
                    <p class="product-price">Starting at £${product.price.toFixed(2)}</p>
                    <button class="btn view-collection-btn" data-category="${escapeHtml(product.searchTerm)}" data-category-name="${escapeHtml(product.name)}">View Collection</button>
                </div>
            </div>
        `).join('');
    }

    /** Updates the cart counter in the header. */
    function updateCartCounter() {
        if (!cartCounter) return;
        loadCart();
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        cartCounter.textContent = totalItems;
    }

     // Function to save cart to local storage
     function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    function loadCart() {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    }

    /** Loads and displays products for a specific category in a modal. */
    async function loadAndDisplayCategoryProducts(categorySearchTerm, categoryName) {
        if (!categoryProductsModal || !categoryModalTitle || !categoryProductList) return;

        categoryModalTitle.textContent = categoryName;
        categoryProductList.innerHTML = loaderHTML;

        currentCategoryProducts = await dataLayer.getProductsByCategory(categorySearchTerm);

        renderProductListInModal(categoryProductList, currentCategoryProducts, 'No products found in this collection.');
    }

    /** Renders a list of products inside a modal. */
    function renderProductListInModal(container, productArray, emptyMessage) {
        if (productArray.length > 0) {
            container.innerHTML = productArray.map(product => `
                <div class="product-list-item" data-id="${escapeHtml(product.id)}">
                    <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
                    <div class="product-list-item-info">
                        <h4>${escapeHtml(product.name)}</h4>
                        <p><strong>Price:</strong> £${product.price.toFixed(2)}</p>
                        ${product.availability === 'out_of_stock'
                            ? `<p title="All orders will be dispatched within 5 days">Can be Ordered</p>`
                            : product.availability === 'low_stock'
                                ? `<p title="Limited stock remaining"><strong>Low Stock</strong></p>`
                                : `<p title="Will be shipped the next working day"><strong>In Stock</strong></p>`
                        }
                    </div>
                    <button class="btn add-to-cart-btn" data-id="${escapeHtml(product.id)}">Add to cart</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<p>${escapeHtml(emptyMessage)}</p>`;
        }
    }

    /**
     * Appends a message to the chat window.
     * @param {string} htmlContent The HTML content of the message.
     * @param {string} senderClass The class for the sender ('user' or 'boudica').
     * @returns {HTMLElement} The created message element.
     */
    function appendChatMessage(htmlContent, senderClass) {
        if (!boudicaChatWindow) return;
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${senderClass}`;
        // Boudica's advice is genuinely meant to be rendered as HTML (get_advice()
        // explicitly asks the model to "Format as HTML") — DOMPurify strips anything
        // dangerous (script tags, event handlers, javascript: URLs) while keeping the
        // real formatting. See CODE_VERIFIED_AUDIT.md §12's stored-XSS finding.
        messageElement.innerHTML = window.DOMPurify ? DOMPurify.sanitize(htmlContent) : '';
        boudicaChatWindow.appendChild(messageElement);

        // Add a print button to Boudica's responses, but not the "thinking" one
        if (senderClass.includes('boudica') && !senderClass.includes('thinking')) {
            const printIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;

            // Add print button to the top
            const printBtnTop = document.createElement('button');
            printBtnTop.className = 'print-chat-btn print-chat-btn-top';
            printBtnTop.title = 'Print this response';
            printBtnTop.innerHTML = printIconSVG;
            messageElement.appendChild(printBtnTop);

            // Add print button to the bottom
            const printBtnBottom = document.createElement('button');
            printBtnBottom.className = 'print-chat-btn print-chat-btn-bottom';
            printBtnBottom.title = 'Print this response';
            printBtnBottom.innerHTML = printIconSVG;
            messageElement.appendChild(printBtnBottom);
        }

        // Scroll to the bottom to show the latest message
        boudicaChatWindow.scrollTop = boudicaChatWindow.scrollHeight;
        return messageElement;
    }


    // --- Event Listeners ---
    productList?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('view-collection-btn')) {
            const button = e.target;
            const categorySearchTerm = button.dataset.category;
            const categoryName = button.dataset.categoryName;

            if (categoryProductsModal) {
                openModal(categoryProductsModal);
                await loadAndDisplayCategoryProducts(categorySearchTerm, categoryName);
            }
        }
    });

    hamburger?.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    /** Handles adding an item to the cart from a modal product list. */
    function handleAddToCartInModal(e, productSourceArray) {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = e.target.dataset.id;
            const productToAdd = productSourceArray.find(p => String(p.id) === productId);
            if (productToAdd) {
                loadCart(); // Make sure cart is up-to-date
                const existingItem = cart.find(item => String(item.id) === String(productToAdd.id));
                if (existingItem) {
                    existingItem.quantity = (existingItem.quantity || 1) + 1;
                    toast.showToast(`${existingItem.name} quantity updated in cart.`, 'info');
                } else {
                    // Create a copy to avoid modifying the source array
                    const cartItem = { ...productToAdd, quantity: 1 };
                    cart.push(cartItem);
                    toast.showToast(`${productToAdd.name} added to cart!`, 'success');
                }
                saveCart();
                updateCartCounter();
            }
        }
    }

    // Event listener for "Add to cart" inside the category modal
    categoryProductList?.addEventListener('click', (e) => handleAddToCartInModal(e, currentCategoryProducts));

    // Event listener for "Add to cart" inside the search results modal
    searchResultsProductList?.addEventListener('click', (e) => handleAddToCartInModal(e, currentSearchResults));

    // Event listener for the search form
    searchForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            openModal(searchResultsModal);
            searchResultsModalTitle.textContent = `Results for "${searchTerm}"`;
            searchResultsProductList.innerHTML = loaderHTML;
            currentSearchResults = await dataLayer.searchProducts(searchTerm);
            renderProductListInModal(searchResultsProductList, currentSearchResults, `No results found for "${searchTerm}".`);
            searchInput.value = ''; // Clear input after search
        }
    });

    // Event listener for the Boudica chat form
    boudicaChatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = boudicaChatInput.value.trim();
        if (!prompt) return;

        // Display user's message, wrapping in a <p> tag for consistency
        appendChatMessage(`<p>${escapeHtml(prompt)}</p>`, 'user');
        boudicaChatInput.value = '';

        // Display thinking indicator
        const thinkingMessage = appendChatMessage('<p>Boudica is thinking...</p>', 'boudica thinking');

        let promptToSend = prompt;
        // Do not send previous history if we are asking for statistics
        const isStatisticCall = prompt.toLowerCase().includes('statistic');

        if (!isStatisticCall) {
            // Build a history string from previous messages to provide context
            const historyMessages = Array.from(boudicaChatWindow.querySelectorAll('.chat-message'))
                .filter(msg => !msg.classList.contains('thinking')) // Exclude the "thinking" message
                .map(msg => msg.textContent.trim()) // Get text content
                .join('\n'); // Join with newlines
            promptToSend = historyMessages;
        }

        // Get response from Boudica
        const htmlResponse = await dataLayer.askBoudica(promptToSend);

        // Remove thinking indicator and display response
        thinkingMessage.remove();
        appendChatMessage(htmlResponse, 'boudica');
    });

    // Event listener for printing a chat message
    boudicaChatWindow?.addEventListener('click', (e) => {
        const printButton = e.target.closest('.print-chat-btn');
        if (printButton) {
            const messageToPrint = printButton.closest('.chat-message');
            if (messageToPrint) {
                // Clone the node to avoid manipulating the original message
                const contentToPrint = messageToPrint.cloneNode(true);
                // Remove all print buttons from the cloned node before printing
                contentToPrint.querySelectorAll('.print-chat-btn').forEach(btn => btn.remove());

                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Print Response</title>
                            <style>
                                body { font-family: 'Montserrat', sans-serif; line-height: 1.6; color: #4A4A4A; }
                                .chat-message { padding: 1rem; border-radius: 8px; background-color: #f0f0f0; max-width: 100%; }
                                .chat-message p { margin: 0; }
                            </style>
                        </head>
                        <body><div class="chat-message">${contentToPrint.innerHTML}</div></body>
                    </html>`);
                printWindow.document.close();
                printWindow.print();
            }
        }
    });

    // --- Generic Modal Logic ---
    const openModalButtons = document.querySelectorAll('[data-modal-target]');
    const closeModalButtons = document.querySelectorAll('[data-modal-close]');
    const overlays = document.querySelectorAll('.modal-overlay');

    function openModal(modal) {
        if (modal == null) return;
        modal.classList.add('active');
    }

    function closeModal(modal) {
        if (modal == null) return;
        modal.classList.remove('active');
    }

    openModalButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.querySelector(button.dataset.modalTarget);
            openModal(modal);
        });
    });

    overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay);
        });
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => closeModal(button.closest('.modal-overlay')));
    });

    specialOrderForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const address = form.address.value.trim();
        const products = form.products.value.trim();
        const total = parseFloat(form.total.value);
        const deposit = parseFloat(form.deposit.value);
        const dueDate = form.due_date.value;

        if (Number.isNaN(total) || Number.isNaN(deposit) || deposit > total) {
            toast.showToast('The deposit cannot be greater than the total price.', 'error');
            return;
        }

        // addspecialorder has no email column — fold it into the address field
        // so the shop still has a way to contact the customer about the order.
        const addressWithEmail = address ? `${address}\nEmail: ${email}` : `Email: ${email}`;

        const data = await apiCall('addspecialorder', {
            order_number: 'SO-' + Date.now(),
            name,
            address: addressWithEmail,
            products,
            total: total.toString(),
            deposit: deposit.toString(),
            due_date: dueDate
        });

        if (data.error) {
            toast.showToast(data.error, 'error');
            return;
        }

        toast.showToast('Your special order request has been sent!', 'success');
        form.reset();
        closeModal(specialOrderModal);
    });

    // --- Initial Load ---
    loadCart();
    updateCartCounter();
    displayProducts(); // Show loading message

    try {
        dataLayer = await Data();
        products = await dataLayer.StoreFrontList();
        displayProducts();
    } catch (error) {
        console.error("Failed to load products:", error);
        if (productList) productList.innerHTML = '<p>Could not load products. Please try again later.</p>';
    }
});