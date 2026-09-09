# Boudica POS - Till Dashboard

The modern, professional point-of-sale (POS) terminal interface for **Boudica POS** - a comprehensive Electronic Point of Sale system built for retail businesses.

The Till Dashboard is a responsive, feature-rich POS interface that empowers cashiers and managers with tools for sales transactions, inventory management, reporting, and AI-powered forecasting.

---

## ✨ Features

### 📊 Sales Operations
- **Till Transactions** - Record sales with barcode scanning or manual entry
- **Multiple Payment Types** - Cash, card (Stripe), and undisclosed payments
- **Receipt Generation** - Print professional receipts to Star printers
- **Refund Management** - Process refunds with full audit trail
- **Daily Float** - Manage till float and reconciliation
- **End-of-Day Settlement** - Automated cash-up and reporting

### 🏪 Inventory Management
- **Stock Management** - View real-time inventory levels
- **Stock Taking** - Physical inventory counting with discrepancy reporting
- **Stock In** - Receive inventory from suppliers
- **Product Management** - Add/edit products with barcode generation
- **Supplier Integration** - Link products to suppliers
- **Stock Alerts** - Low stock warnings and reorder predictions

### 📈 Analytics & Reporting
- **Dashboard** - Real-time sales metrics and 7-day trends
- **Sales Reports** - Detailed sales analysis by product
- **Revenue Analysis** - Profit margins, COGS, transaction metrics
- **Inventory Reports** - Stock valuation and supplier breakdown
- **Tax Summary** - VAT calculations and compliance reporting
- **Order History** - Track customer orders and receipts

### 🤖 AI-Powered Forecasting (NEW - June 2026)
- **Daily Sales Forecast** - Predict today's sales based on historical patterns
- **Weekly Forecast** - Analyze trends for the week
- **Monthly Forecast** - Seasonal analysis and projections
- **Inventory Reorder Predictions** - AI-driven reorder timing and quantities
- **Confidence Levels** - Statistical confidence in predictions
- **Actionable Insights** - Business recommendations from Boudica AI

### 💳 Payment Processing (NEW - June 2026)
- **Stripe Integration** - Secure card payments at the till
- **Payment Intent Creation** - Real-time payment processing
- **Refund Handling** - Process refunds directly from till
- **PCI Compliance** - Stripe handles all security requirements
- **Transaction Logging** - Complete audit trail for all payments

### 🎯 User Experience
- **11-Tab Interface** - Organized workflow for all operations
- **Barcode Scanning** - USB scanner support for rapid entry
- **Keypad Entry** - Manual product entry with visual keyboard
- **Toast Notifications** - Real-time feedback for all actions
- **Modal Dialogs** - Clean, focused user interactions
- **Responsive Design** - Works on tablets, desktops, and touch devices
- **Professional Styling** - Modern UI with gradient buttons and emoji icons

### 👥 User Management
- **Staff Accounts** - Create and manage user accounts
- **Role-Based Access** - Cashier and manager permissions
- **Activity Logging** - Complete audit trail of transactions
- **Secure Authentication** - Encrypted credentials

---

## 🏗️ File Structure

```
web/
├── index.html                      # Main POS interface
├── .vscode/                        # VS Code settings
│
├── scripts/                        # JavaScript modules (11 feature areas)
│   ├── application.js              # Main application initialization
│   ├── login.js                    # User authentication
│   ├── tabs.js                     # Tab navigation controller
│   ├── till.js                     # Till transaction processing
│   ├── keypad.js                   # Numeric keypad input
│   ├── printer.js                  # Star printer integration
│   ├── toast.js                    # Notification system
│   │
│   ├── dashboard.js                # TAB 1: Sales dashboard & metrics
│   ├── till.js                     # TAB 2: Till (main POS)
│   ├── reports.js                  # TAB 3: Sales, revenue, inventory, tax reports
│   ├── order-history.js            # TAB 4: Customer orders and receipts
│   ├── show_products.js            # TAB 5: Stock management
│   ├── add_stock_item.js           # TAB 5: Add products
│   ├── stock_in.js                 # TAB 5: Receive stock
│   ├── add_float.js                # TAB 6: Set daily float
│   ├── supplier_management.js      # TAB 7: Supplier operations
│   ├── product_lookup.js           # TAB 8: Product search
│   ├── eod.js                      # TAB 9: End-of-day settlement
│   ├── stock_take.js               # TAB 10: Physical stock counting
│   ├── forecasting.js              # TAB 11: AI forecasting & predictions
│   │
│   ├── till-card-payment.js        # Stripe card payment processing
│   ├── special_orders.js           # Special order form
│   ├── invoice_in.js               # Supplier invoice management
│   │
│   └── star/                       # Star printer SDK
│       ├── StarWebPrintBuilder.js  # Printer command builder
│       └── StarWebPrintTrader.js   # Printer communication
│
├── styles/                         # CSS stylesheets
│   ├── modern.css                  # Main stylesheet (responsive, gradients, emojis)
│   ├── toast.css                   # Notification styling
│   └── loader.css                  # Loading animation
│
└── assets/                         # Static assets
    ├── images/                     # UI images and graphics
    ├── icons/                      # UI icons (arrow left, arrow right, etc.)
    └── dropblock.ico               # Favicon
```

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Boudica POS backend server running
- Stripe account with publishable key (for card payments)
- Star printer (optional, for receipt printing)
- Barcode scanner (optional, for faster entry)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/boudica-pos.git
   cd boudica-pos/code/web
   ```

2. **Configure environment**
   Create `config.js` or update scripts with your server details:
   ```javascript
   // In scripts/application.js
   const API_BASE = 'http://your-server/cgi-bin';
   const BOUDICA_SERVER = 'http://your-server/api/boudica';
   ```

3. **Stripe Configuration**
   Edit `scripts/till-card-payment.js`:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key_here';
   ```

4. **Deploy to web server**
   ```bash
   # Copy to web server document root
   cp -r /home/sibain/Boudica/boudica_pos/code/web /var/www/html/till
   
   # Set proper permissions
   chmod -R 755 /var/www/html/till
   ```

5. **Access in browser**
   ```
   http://your-server/till/index.html
   ```

---

## ⚙️ Configuration

### Backend API Configuration

Edit `scripts/application.js`:
```javascript
// Backend server URL
const PGBC_AGENTS = 'http://localhost/cgi-bin/boudica_pos';

// Optional Boudica AI server
const BOUDICA_SERVER = 'http://localhost/api/boudica';
const BOUDICA_API_KEY = 'your-api-key';
```

### Stripe Setup

1. **Get Publishable Key**
   - Sign in to [Stripe Dashboard](https://dashboard.stripe.com)
   - Go to Developers > API Keys
   - Copy your publishable key (pk_...)

2. **Configure in code**
   Update `scripts/till-card-payment.js`:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key_here';
   ```

3. **Backend Stripe Secret**
   Configure on backend server (see backend README)

### Star Printer Setup

1. **Install Printer**
   ```bash
   # Connect Star printer to network
   # Note printer IP address (e.g., 192.168.1.100)
   ```

2. **Configure in code**
   Edit `scripts/printer.js`:
   ```javascript
   const STAR_PRINTER_IP = '192.168.1.100';
   const STAR_PRINTER_PORT = 9100;
   ```

3. **Test Connection**
   - Go to Till tab
   - Complete a test transaction
   - Click "Print Receipt" button

### Database Configuration

Configure on backend - Till communicates via REST API, see Backend Setup.

---

## 📖 Usage Guide

### For Cashiers

#### Making a Sale
1. **Login** - Enter your email and password
2. **Till Tab** - Click the 💳 Till tab
3. **Add Items**:
   - Barcode: Scan barcode or enter manually
   - Manual: Click product or use keypad
   - Quantity: Enter quantity or press '+' repeatedly
4. **Review Cart** - Check items and prices
5. **Checkout**:
   - Select payment type (Cash/Card/Undisclosed)
   - Click "Process Payment"
   - For cards: Follow Stripe payment flow
6. **Receipt** - Print or skip
7. **Complete** - Transaction recorded

#### Processing Refunds
1. **Order History Tab** - 📦 Orders
2. **Find Order** - Search by customer email
3. **View Details** - Click order to expand
4. **Process Refund** - Click refund button
5. **Confirm** - Review refund details
6. **Complete** - Refund processed immediately

#### Stock Lookup
1. **Lookup Tab** - 🔍 Lookup
2. **Search** - Enter barcode or product name
3. **View Details** - See price, quantity, supplier
4. **Add to Till** - Click to add to current transaction

#### End of Day
1. **EOD Tab** - 📋 End of Day
2. **Review** - See cash and card totals
3. **Float Reconciliation** - Enter actual cash count
4. **Discrepancies** - Investigate any differences
5. **Settlement** - Click "Complete Settlement"

### For Managers

#### Dashboard
1. **Dashboard Tab** - 📊 View sales overview
2. **Metrics** - See today's sales, daily average, transaction count
3. **Trends** - Check 7-day sales graph
4. **Export** - Download data as needed

#### Stock Management
1. **Stock Tab** - 🏪 Stock
2. **View Stock** - See current inventory levels
3. **Add Products** - New products with barcodes
4. **Stock In** - Receive shipments from suppliers
5. **Stock Take** - Physical inventory counting

#### Reports
1. **Reports Tab** - 📈 Access reports
2. **Sales Report** - Products sold, quantities, revenue
3. **Revenue Analysis** - Profit margins, COGS metrics
4. **Inventory Report** - Stock valuation by supplier
5. **Tax Summary** - VAT calculations and compliance
6. **Export** - Download as CSV for accounting

#### AI Forecasting
1. **Forecasting Tab** - 🤖 Boudica AI Forecasting
2. **Daily Forecast** - Predict today's sales
3. **Weekly Forecast** - Analyze this week
4. **Monthly Forecast** - Seasonal projections
5. **Reorder Predictions** - When to reorder products
6. **Insights** - AI-generated business recommendations

#### Suppliers
1. **Suppliers Tab** - 🏢 Supplier Management
2. **List Suppliers** - View all suppliers
3. **Add Supplier** - Create new supplier entry
4. **Invoices** - Track supplier invoices
5. **Payment Status** - Mark invoices as paid

---

## 🔌 API Integration

### Backend Commands Used

The Till Dashboard communicates with Boudica POS backend using these commands:

**Authentication**
```javascript
// Login (handled by backend)
POST /cgi-bin/boudica_pos?command=login&username=user@example.com&password=pass
```

**Sales**
```javascript
// Record sale
POST /cgi-bin/boudica_pos?command=sellitem&barcode=123&price=10.00&quantity=1&type=cash

// Get price lookup
GET /cgi-bin/boudica_pos?command=pricelookup&barcode=123

// End of day
POST /cgi-bin/boudica_pos?command=cashup
```

**Inventory**
```javascript
// Update stock
POST /cgi-bin/boudica_pos?command=updatestock&barcode=123&quantity=5

// Stock take
POST /cgi-bin/boudica_pos?command=stocktake&barcode=123

// Complete stock take
POST /cgi-bin/boudica_pos?command=completestocktake
```

**Reporting**
```javascript
// Sales report
GET /cgi-bin/boudica_pos?command=salesreport&start_date=2026-01-01&end_date=2026-06-19

// Revenue report
GET /cgi-bin/boudica_pos?command=revenuereport&start_date=2026-01-01&end_date=2026-06-19

// Inventory report
GET /cgi-bin/boudica_pos?command=inventoryreport

// Tax summary
GET /cgi-bin/boudica_pos?command=taxsummary&start_date=2026-01-01&end_date=2026-06-19
```

**Payments (Stripe)**
```javascript
// Initiate payment
POST /cgi-bin/boudica_pos?command=initiate_payment&order_id=TILL-xxx&total=10.00&type=till_sale

// Confirm payment
POST /cgi-bin/boudica_pos?command=confirm_payment&payment_intent_id=pi_xxx&order_id=TILL-xxx

// Process refund
POST /cgi-bin/boudica_pos?command=process_refund&payment_intent_id=pi_xxx&reason=requested_by_customer
```

**Forecasting (Boudica AI)**
```javascript
// Daily sales forecast
POST /cgi-bin/boudica_pos?command=predict_daily_sales

// Weekly forecast
POST /cgi-bin/boudica_pos?command=predict_weekly_sales

// Monthly forecast
POST /cgi-bin/boudica_pos?command=predict_monthly_sales

// Reorder prediction
POST /cgi-bin/boudica_pos?command=predict_reorder_date&barcode=123
```

**Orders**
```javascript
// Order history
GET /cgi-bin/boudica_pos?command=orderhistory&email=customer@example.com

// Get receipt
GET /cgi-bin/boudica_pos?command=getreceipt&order_id=WEB-123
```

For complete API documentation, see [API Reference](../back_end/call.txt)

---

## 🖨️ Printer Integration

### Star Printer Setup

The Till Dashboard integrates with Star Micronics printers for receipt printing.

**Supported Models**
- Star mC-Print2
- Star mC-Print3
- Star SM-S210i
- Other models supporting Star WebPRNT

**Network Configuration**
1. Connect printer to network
2. Get printer IP address (check printer menu)
3. Update `scripts/printer.js`:
   ```javascript
   const STAR_PRINTER_IP = '192.168.1.100';
   ```

**Receipt Format**
- Width: 58mm (default)
- Text: UTF-8 encoded
- Images: Thermal printer compatible
- QR Codes: Supported

**Testing**
```javascript
// In browser console
// Test print function
testPrinterConnection();

// Print test receipt
printReceipt({
    items: [{description: "Test Item", quantity: 1, price: 10.00}],
    total: 10.00,
    paymentType: "cash"
});
```

---

## ⌨️ Barcode Scanner Setup

### USB Scanner Configuration

Most USB barcode scanners work as keyboard input. No special configuration needed.

**Setup Steps**
1. Connect USB scanner to computer
2. Open Till tab in POS
3. Click in barcode input field
4. Scan barcode - it appears in field
5. Press Enter to add item

**Troubleshooting Scanner**
- Ensure scanner is in keyboard mode (not USB HID)
- Check scanner beep settings (usually enabled)
- Test with a known barcode
- Verify scanner is recognized in system settings

---

## 🛡️ Security Considerations

### Critical Security Notes

⚠️ **PRODUCTION CHECKLIST:**

- [ ] Enable HTTPS/TLS for all connections
- [ ] Implement proper backend authentication
- [ ] Use environment variables for API keys
- [ ] Never commit secrets to version control
- [ ] Enable CORS protection on backend
- [ ] Implement rate limiting on backend
- [ ] Use secure HTTP-only cookies for sessions
- [ ] Validate all input on backend (not just frontend)
- [ ] Implement CSRF protection
- [ ] Enable Content Security Policy (CSP) headers
- [ ] Log all transactions and access
- [ ] Regular security audits and penetration testing
- [ ] Keep all dependencies updated

### User Authentication

⚠️ **Security Responsibilities:**

- Store passwords securely (hashed, salted)
- Implement session timeouts
- Use secure session tokens
- Implement 2FA for manager accounts
- Log all login attempts
- Monitor for suspicious activity

### Payment Security (Stripe)

✅ **Stripe handles:**
- PCI DSS compliance
- Card tokenization
- Fraud detection
- Encryption

**Your responsibility:**
- Never store raw card data
- Always use HTTPS
- Validate payments server-side
- Implement 3D Secure when needed
- Monitor chargeback rates

### LocalStorage Security

⚠️ **Notes:**
- Cart data stored locally for UX
- Not encrypted - use for non-sensitive data only
- Clear on logout
- Implement server-side session management

---

## 🔧 Development

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/yourusername/boudica-pos.git
cd boudica-pos/code/web

# Start local server (for development)
python -m http.server 8000
# or
npx http-server

# Access at http://localhost:8000
```

### Code Structure

- **Modular Design** - Each tab is a separate module
- **ES6 Modules** - Modern JavaScript features
- **Fetch API** - For all HTTP requests
- **LocalStorage** - Client-side data persistence
- **Chart.js** - For analytics visualization

### Code Style Guidelines

- Use camelCase for variables and functions
- Use PascalCase for classes
- Include JSDoc comments for public functions
- Keep functions focused and reusable
- Use template literals for strings
- Avoid global variables
- Use const/let, not var

### Adding New Features

1. **Create Module**
   ```javascript
   // scripts/my-feature.js
   const MyFeature = (() => {
       const init = () => {
           // Initialize
       };
       return { init };
   })();
   ```

2. **Update HTML**
   - Add tab or UI element
   - Add script defer tag

3. **Integrate with Backend**
   - Use fetch to call API
   - Handle errors gracefully

4. **Test Thoroughly**
   - Desktop browser
   - Tablet (responsive)
   - Payment flow
   - Error scenarios

### Running Tests

```bash
# Manual testing checklist
# See TESTING_GUIDE.md in root directory

# Automated tests (coming in future releases)
npm test
```

---

## 🚀 Deployment

### Production Build

1. **Minify Assets**
   ```bash
   # Minify CSS
   csso styles/modern.css -o styles/modern.min.css
   
   # Minify JavaScript
   uglifyjs scripts/application.js -o scripts/application.min.js
   ```

2. **Optimize Images**
   ```bash
   # Compress images
   imagemin assets/images/* --out-dir=assets/images-optimized
   ```

3. **Update References**
   - Point to minified files
   - Update CDN references if using

4. **Deploy to Server**
   ```bash
   scp -r . user@server:/var/www/html/till
   ```

5. **Set Permissions**
   ```bash
   chmod -R 755 /var/www/html/till
   chmod -R 644 /var/www/html/till/*.*
   ```

6. **Configure Web Server**
   ```apache
   # Apache configuration
   <VirtualHost *:443>
       ServerName till.example.com
       DocumentRoot /var/www/html/till
       Protocols http/1.1  # HTTP/2 conflicts with CGI
       SSLEngine on
       SSLCertificateFile /path/to/certificate.crt
       SSLCertificateKeyFile /path/to/key.key
   </VirtualHost>
   ```

### Environment Variables

Create `.env` file (not committed to git):
```
API_BASE=https://api.example.com/cgi-bin
STRIPE_KEY=pk_live_xxxxxxxxxxxxx
BOUDICA_SERVER=https://api.example.com/boudica
DEBUG=false
```

---

## 🚨 Troubleshooting

### Login Issues
- Verify backend server is running
- Check network connection to backend
- Ensure CORS headers are correct
- Verify username/password in database
- Check browser console for errors: F12 > Console

### Cart Not Persisting
- Check localStorage is enabled
- Clear localStorage: `localStorage.clear()`
- Check browser storage quota
- Try in private/incognito mode

### Barcode Scanner Not Working
- Ensure scanner is connected
- Check scanner keyboard mode setting
- Test scanner on another application
- Verify USB port connection
- Check device manager for scanner recognition

### Printer Not Printing
- Verify printer IP in `scripts/printer.js`
- Check printer is connected to network
- Ping printer: `ping 192.168.1.100`
- Check printer power and paper
- View printer status page (usually IP in browser)
- Check browser console for JavaScript errors

### Stripe Payment Failing
- Verify API key is correct in `scripts/till-card-payment.js`
- Check test card numbers: See Stripe test documentation
- Ensure backend Stripe secret key is configured
- Check network tab for payment requests
- Review Stripe dashboard for webhook logs

### Reports Not Loading
- Verify date range is valid
- Check backend database has data for date range
- Verify user has permission to access reports
- Check network tab for API response
- Review backend error logs

### Forecasting Not Working
- Verify backend has sufficient historical sales data
- Check Boudica AI server is running
- Verify API key is set in code
- Check network connection to AI server
- Review backend logs for errors

---

## 📚 Additional Resources

- [Boudica POS Main Repository](../../)
- [Backend API Documentation](../back_end/call.txt)
- [Backend README](../back_end/README.md)
- [Web Store Frontend](../web_store/README.md)
- [Stripe Documentation](https://stripe.com/docs)
- [Complete Functionality Analysis](../../COMPLETE_FUNCTIONALITY_ANALYSIS.md)
- [Stripe Integration Guide](../../STRIPE_INTEGRATION_GUIDE.md)
- [Till Modernization Summary](../../TILL_MODERNIZATION_SUMMARY.md)
- [Testing Guide](../../TESTING_GUIDE.md)

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Test thoroughly
   - Update documentation

3. **Commit with clear messages**
   ```bash
   git commit -m 'Add feature: description'
   ```

4. **Push and create Pull Request**
   ```bash
   git push origin feature/my-feature
   ```

### Contribution Guidelines
- Test on multiple browsers
- Test on mobile/tablet devices
- Ensure accessibility standards
- Update documentation
- Add comments for complex logic
- Follow security best practices
- No hardcoded credentials

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

## 🆘 Support & Issues

### Reporting Issues
1. Check existing issues on GitHub
2. Provide clear reproduction steps
3. Include browser/environment details
4. Attach screenshots or error logs
5. Security issues: Email security@boudi.ca

### Getting Help
- **Documentation**: See files in root directory
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Email**: support@boudi.ca

---

## 📝 Changelog

### Version 2.1.0 (June 2026)
- ✨ Boudica AI Forecasting module
- ✨ Stripe card payment at till
- ✨ Refund processing UI
- 🐛 Fixed responsive layout issues
- 📱 Improved mobile experience
- 🚀 Performance optimizations

### Version 2.0.0 (June 2026)
- ✨ Till modernization complete
- ✨ 11 organized tabs
- ✨ Professional dashboard
- ✨ Advanced reporting
- ✨ Order history management

### Version 1.0.0 (Initial Release)
- Basic POS functionality
- Till transactions
- Stock management
- Simple reporting

---

## 👥 Authors

**Boudica POS Development Team**
- Simon Ian Bain (Lead Developer)
- OmniIndex Inc.

---

## 🙏 Acknowledgments

- Star Micronics for printer SDK
- Stripe for payment processing
- Chart.js for data visualization
- The Curiosity Cabins team
- Open-source community

---

**Made with ❤️ for retail businesses worldwide**
