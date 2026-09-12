// Fetched once from the backend's own config (getpublicconfig, main.cpp) instead of being
// hardcoded — the printer URL, store name, and website used to be
// "http://localhost:8001/StarWebPRNT/SendMessage" / "Curiosity Cabin" /
// "www.thecuriositycabins.com" respectively, leftovers from a specific prior deployment
// that weren't configurable for a fresh install of this template
// (CODE_VERIFIED_AUDIT.md §10). Same lazy-fetch-and-cache pattern as
// till-card-payment.js's loadStripePublishableKey().
let printerConfig = null;
async function loadPrinterConfig() {
    if (printerConfig) return printerConfig;
    const json = await apiCall('getpublicconfig');
    printerConfig = {
        printerUrl: json.star_printer_url || 'http://localhost:8001/StarWebPRNT/SendMessage',
        storeName: json.store_name || 'Boudica POS',
        storeWebsite: json.store_website || ''
    };
    return printerConfig;
}

function showNowPrinting() {
    // In a real app, this would show a modal or overlay.
    // For now, we can just log to the console or show a toast.
    if (typeof showToast === 'function') {
        showToast('Printing receipt...', 'info', 5000);
    } else {
        console.log("Printing receipt...");
    }
}

function hideNowPrinting() {
    // In a real app, this would hide the modal or overlay.
    console.log("...Printing finished.");
}


function printReceipt(items, total, tax, paymentMethod, cashTendered = null, changeDue = 0) {
    // 1. Create a canvas dynamically
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Constants for styling the canvas receipt.
    const RECEIPT_WIDTH = 576; // For 58mm paper. Use 576 for 80mm paper.
    const FONT_SIZE_NORMAL = 18;
    const FONT_SIZE_LARGE = 22;
    const LINE_HEIGHT = 24;
    const MARGIN = 10;
    const LOGO_PATH = 'assets/store.png'; // Path to your logo

    // 2. Calculate canvas height based on content
    // This is an estimation. A better way is to draw and measure, but this is a good start.
    const headerHeight = 3 * LINE_HEIGHT; // Title, date/time, spacer
    const itemsHeight = items.length * LINE_HEIGHT;
    const dividerHeight = LINE_HEIGHT;
    const summaryHeight = (paymentMethod === 'Cash' && cashTendered !== null && total > 0) ? (6 * LINE_HEIGHT) : (4 * LINE_HEIGHT); // Add space for cash tendered and change
    const topBottomMargin = 2 * MARGIN;
    const totalHeight = topBottomMargin + headerHeight + itemsHeight + dividerHeight + summaryHeight;

    canvas.width = RECEIPT_WIDTH;
    canvas.height = totalHeight;
    let currentY = MARGIN;

    // 3. Draw on the canvas
    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Add Logo ---
    const img = new Image();
    img.onload = () => {
        const logoWidth = 100; // Adjust as needed
        const logoHeight = img.height * (logoWidth / img.width);
        const x = (canvas.width - logoWidth) / 2; // Center the logo
        ctx.drawImage(img, x, currentY, logoWidth, logoHeight);
        
        // Continue drawing the rest of the receipt below the logo
        currentY += logoHeight + 10; // Add some space after the logo
        drawReceiptContent(ctx, items, total, tax, paymentMethod, cashTendered, changeDue, currentY);
    };
    img.onerror = () => {
        console.error("Could not load logo image at:", LOGO_PATH);
        // Continue drawing the receipt without the logo
        drawReceiptContent(ctx, items, total, tax, paymentMethod, cashTendered, changeDue, currentY);
    };
    img.src = LOGO_PATH;
}

async function drawReceiptContent(ctx, items, total, tax, paymentMethod, cashTendered, changeDue, startY) {
    const config = await loadPrinterConfig();
    const canvas = ctx.canvas;
    const FONT_SIZE_NORMAL = 18;
    const FONT_SIZE_LARGE = 22;
    const LINE_HEIGHT = 24;
    const MARGIN = 10;
    let y = startY; // Start drawing from the provided Y position

    ctx.fillStyle = 'black';
    ctx.font = `${FONT_SIZE_NORMAL}px "Courier New", monospace`;

    // Header
    ctx.font = `bold ${FONT_SIZE_LARGE}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(config.storeName, canvas.width / 2, y += LINE_HEIGHT);
    
    ctx.font = `${FONT_SIZE_NORMAL-4}px "Courier New", monospace`; // smaller font for date
    const now = new Date();
    const dateString = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const timeString = now.toLocaleTimeString();
    ctx.fillText(`${dateString} ${timeString}`, canvas.width / 2, y += LINE_HEIGHT);

    y += LINE_HEIGHT; // Spacer

    // Items
    ctx.textAlign = 'left';
    ctx.font = `${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    items.forEach(item => {
        const quantity = item.quantity || 1;
        const quantityText = quantity > 1 ? `${quantity}x ` : '';
        const lineTotal = item.price * quantity;

        // Handle long descriptions
        const maxDescWidth = canvas.width - MARGIN - 80; // reserve 80px for price
        let fullDesc = `${quantityText}${item.description}`;
        if (ctx.measureText(fullDesc).width > maxDescWidth) {
            // A simple truncation, a more complex solution would wrap text
            let tempDesc = '';
            for (let i = 0; i < item.description.length; i++) {
                if (ctx.measureText(`${quantityText}${tempDesc}${item.description[i]}...`).width > maxDescWidth) {
                    break;
                }
                tempDesc += item.description[i];
            }
            fullDesc = `${quantityText}${tempDesc}...`;
        }

        ctx.fillText(fullDesc, MARGIN, y += LINE_HEIGHT);
        const priceText = `£${lineTotal.toFixed(2)}`;
        ctx.textAlign = 'right';
        ctx.fillText(priceText, canvas.width - MARGIN, y);
        ctx.textAlign = 'left';
    });

    y += (LINE_HEIGHT / 2); // Spacer
    ctx.fillText('-'.repeat(38), MARGIN, y += LINE_HEIGHT); // Divider

    // Summary
    ctx.textAlign = 'right';
    const subTotal = total - tax;
    ctx.fillText(`Subtotal: £${subTotal.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    ctx.fillText(`Tax: £${tax.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    ctx.font = `bold ${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    ctx.fillText(`Total: £${total.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    
    ctx.font = `${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    ctx.fillText(`Paid by: ${paymentMethod}`, canvas.width - MARGIN, y += LINE_HEIGHT);

    if (paymentMethod === 'Cash' && cashTendered !== null && total > 0) {
        ctx.fillText(`Cash Tendered: £${cashTendered.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
        ctx.fillText(`Change: £${changeDue.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    }

    let request = '';
    if (paymentMethod === 'Cash') {
        const builder = new StarWebPrintBuilder();
        try {
            request = builder.createPeripheralElement({channel: StarWebPrintBuilder.PeripheralChannel.No1}); // Open cash drawer
        } catch (error) {
            console.error('Could not build cash-drawer-open command:', error);
            showToast('Could not open the cash drawer automatically.', 'error');
        }
    }

    // 4. Send to printer
    sendCanvasToPrinter(canvas, request);

    if (config.storeWebsite) {
        ctx.textAlign = 'center';
        ctx.fillText('Visit our Website', canvas.width / 2, y += LINE_HEIGHT);
        ctx.fillText(config.storeWebsite, canvas.width / 2, y += LINE_HEIGHT);
    }
}

function printSpecialOrderReceipt(details) {
    // 1. Create a canvas dynamically
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Constants for styling
    const RECEIPT_WIDTH = 384; // 58mm paper
    const FONT_SIZE_NORMAL = 18;
    const FONT_SIZE_LARGE = 22;
    const FONT_SIZE_SMALL = 14;
    const LOGO_PATH = 'assets/store.png'; // Path to your logo
    const LINE_HEIGHT = 24;
    const MARGIN = 10;

    // 2. Calculate canvas height
    // This is an estimation.
    const productLines = details.products.split('\n').length;
    const addressLines = details.address.split('\n').length;
    const headerHeight = 4 * LINE_HEIGHT; // Title, Shop, Date, Spacer
    const customerHeight = (1 + addressLines) * LINE_HEIGHT;
    const productsHeight = (2 + productLines) * LINE_HEIGHT; // Header, products, spacer
    const summaryHeight = 6 * LINE_HEIGHT; // Total, Tax, Deposit, Balance, Due Date, Spacer
    const topBottomMargin = 2 * MARGIN;
    const totalHeight = topBottomMargin + headerHeight + customerHeight + productsHeight + summaryHeight;

    canvas.width = RECEIPT_WIDTH;
    canvas.height = totalHeight;
    let currentY = MARGIN;

    // 3. Draw on the canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'black';

     // --- Add Logo ---
     const img = new Image();
     img.onload = () => {
         const logoWidth = 100; // Adjust as needed
         const logoHeight = img.height * (logoWidth / img.width);
         const x = (canvas.width - logoWidth) / 2; // Center the logo
         ctx.drawImage(img, x, currentY, logoWidth, logoHeight);
         
         // Continue drawing the rest of the receipt below the logo
         currentY += logoHeight + 10; // Add some space after the logo
         drawSpecialOrderReceiptContent(ctx, details, currentY);
     };
     img.onerror = () => {
         console.error("Could not load logo image at:", LOGO_PATH);
         // Continue drawing the receipt without the logo
         drawSpecialOrderReceiptContent(ctx, details, currentY);
     };
     img.src = LOGO_PATH;
    
}

async function drawSpecialOrderReceiptContent(ctx, details, startY) {
    const config = await loadPrinterConfig();
    const canvas = ctx.canvas;
    const FONT_SIZE_NORMAL = 18;
    const FONT_SIZE_LARGE = 22;
    const FONT_SIZE_SMALL = 14;
    const LINE_HEIGHT = 24;
    const MARGIN = 10;
    let y = startY;

    // Header
    ctx.textAlign = 'center';
    ctx.font = `bold ${FONT_SIZE_LARGE}px "Courier New", monospace`;
    ctx.fillText('** SPECIAL ORDER **', canvas.width / 2, y += LINE_HEIGHT);
    ctx.font = `${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    ctx.fillText(config.storeName, canvas.width / 2, y += LINE_HEIGHT);
    
    ctx.font = `${FONT_SIZE_SMALL}px "Courier New", monospace`;
    const now = new Date();
    const dateTimeString = now.toLocaleString();
    ctx.fillText(dateTimeString, canvas.width / 2, y += LINE_HEIGHT);

    y += LINE_HEIGHT; // Spacer

    // Customer Details
    ctx.textAlign = 'left';
    ctx.font = `bold ${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    ctx.fillText(details.name, MARGIN, y += LINE_HEIGHT);
    ctx.font = `${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    details.address.split('\n').forEach(line => {
        ctx.fillText(line, MARGIN, y += LINE_HEIGHT);
    });

    y += LINE_HEIGHT; // Spacer

    // Products
    ctx.fillText('--- Items ---', MARGIN, y += LINE_HEIGHT);
    details.products.split('\n').forEach(line => {
        // Basic wrap for long lines
        if (ctx.measureText(line).width > canvas.width - (2 * MARGIN)) {
            // This is a simple implementation. A better one would split by words.
            ctx.fillText(line.substring(0, 35) + '...', MARGIN, y += LINE_HEIGHT);
        } else {
            ctx.fillText(line, MARGIN, y += LINE_HEIGHT);
        }
    });

    y += (LINE_HEIGHT / 2);
    ctx.fillText('-'.repeat(38), MARGIN, y += LINE_HEIGHT);

    // Summary
    ctx.textAlign = 'right';
    const tax = details.total - (details.total / (1 + (TAX_RATE / 100)));
    const balanceDue = details.total - details.deposit;

    ctx.fillText(`Total: £${details.total.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    ctx.fillText(`Tax Included: £${tax.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    ctx.fillText(`Deposit Paid: £${details.deposit.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    ctx.font = `bold ${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    ctx.fillText(`BALANCE DUE: £${balanceDue.toFixed(2)}`, canvas.width - MARGIN, y += LINE_HEIGHT);
    ctx.font = `${FONT_SIZE_NORMAL}px "Courier New", monospace`;
    ctx.fillText(`Expected By: ${new Date(details.dueDate).toLocaleDateString()}`, canvas.width - MARGIN, y += LINE_HEIGHT);

    // 4. Send to printer
    sendCanvasToPrinter(canvas);
    if (config.storeWebsite) {
        ctx.textAlign = 'center';
        ctx.fillText('Visit our Website', canvas.width / 2, y += LINE_HEIGHT);
        ctx.fillText(config.storeWebsite, canvas.width / 2, y += LINE_HEIGHT);
    }
}

async function sendCanvasToPrinter(canvas, request) {
    showNowPrinting();

    // 7.3#2/§10: was hardcoded; now the deployment's configured printer URL (or the same
    // localhost:8001 default as before, if unconfigured).
    const config = await loadPrinterConfig();
    const url = config.printerUrl;
    const papertype = 'raster';

    const trader = new StarWebPrintTrader({url:url, papertype:papertype});

    // 7.3#1: these three failure paths used to be silent — the "Printing Failed" alert()
    // was a blocking dialog (bad on a busy till), and the communication-error/exception
    // paths had their alert() calls commented out entirely, so a cashier got no feedback
    // at all if a receipt failed to print. All three now show a toast (non-blocking,
    // consistent with every other error in this codebase) with the full detail logged to
    // the console for whoever's troubleshooting the printer.
    trader.onReceive = function (response) {
        hideNowPrinting();

        if (!response.traderSuccess) {
            const problems = [];
            if (trader.isCoverOpen({traderStatus:response.traderStatus})) { problems.push('cover open'); }
            if (trader.isOffLine({traderStatus:response.traderStatus})) { problems.push('offline'); }
            if (trader.isPaperEnd({traderStatus:response.traderStatus})) { problems.push('out of paper'); }
            const summary = problems.length > 0 ? problems.join(', ') : 'unknown fault';
            console.error('Printing failed:', response);
            showToast(`Printing failed (${summary}). Check the printer.`, 'error');
        }
    }

    trader.onError = function (response) {
        hideNowPrinting();
        console.error('Printer communication error:', response, 'url:', url);
        showToast(`Could not reach the printer at ${url}. Is the Star WebPRNT service running?`, 'error');
    }

    try {
        if (canvas && canvas.getContext) {
            const context = canvas.getContext('2d');
            const builder = new StarWebPrintBuilder();
            let printRequest = request || ''; // Start with the passed-in request or an empty string.
            printRequest += builder.createInitializationElement();
            printRequest += builder.createBitImageElement({context:context, x:0, y:0, width:canvas.width, height:canvas.height});
            printRequest += builder.createCutPaperElement({feed:true});
            trader.sendMessage({request:printRequest});
        }
    }
    catch (e) {
        hideNowPrinting();
        console.error('Could not build/send the print request:', e);
        showToast('Could not send the receipt to the printer.', 'error');
    }
}