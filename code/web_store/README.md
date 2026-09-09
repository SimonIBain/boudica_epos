# Boudica POS - Web Store

A modern, responsive e-commerce platform for The Curiosity Cabins. This web store frontend is part of the **Boudica POS** system - a comprehensive Electronic Point of Sale solution built with C++, PostgreSQL, and vanilla JavaScript.

**Boudica POS** is an open-source EPOS system designed for retail businesses, featuring:
- Complete POS terminal functionality
- Web-based e-commerce platform (this repo)
- AI-powered sales forecasting
- Stripe payment integration
- Professional reporting and analytics
- Multi-user support with role-based access

---

## ✨ Features

### Core E-Commerce
- 🛍️ **Product Catalog** - Browse products with categories, images, and descriptions
- 🛒 **Shopping Cart** - Add/remove items, persistent storage using `localStorage`
- 💳 **Stripe Payment Integration** - Secure online payment processing (June 2026)
- 📋 **Order Management** - View order history, order status tracking
- 📄 **Digital Receipts** - Professional receipt generation and email delivery
- 🔍 **Product Search** - Full-text and semantic search with typo tolerance

### User Experience
- 📱 **Responsive Design** - Works seamlessly on mobile, tablet, and desktop
- 🎨 **Modern UI** - Clean, professional interface with gradient styling
- 🔔 **Toast Notifications** - Real-time user feedback on actions
- 👤 **User Accounts** - Create account, track purchases, manage preferences
- 🔐 **Secure Authentication** - Encrypted credential handling

### Advanced Features
- 🤖 **AI Integration** - Ask Boudica (AI assistant) for product advice and recommendations
- 📊 **Order History** - Track past purchases with detailed information
- 🎁 **Workshop Management** - Browse and register for workshops
- 📰 **News & Updates** - Integrated news feed and social media links
- 💬 **Special Orders** - Request custom items through easy form submission

### Payment & Orders
- ✅ **Stripe Payment Processing** - Industry-standard secure payments
- 📧 **Order Confirmations** - Automatic email confirmations
- 🔄 **Order Tracking** - Real-time order status updates
- ↩️ **Refund Handling** - Full refund support through backend

---

## 🏗️ File Structure

```
web_store/
├── index.html                    # Home page with product showcase
├── cart.html                     # Shopping cart page
├── order-confirmation.html       # Order confirmation page
├── order-history.html           # Customer order history
├── receipt.html                 # Digital receipt display
├── reports.html                 # Customer reports (admin)
├── cart-management.html         # Advanced cart features
├── sitemap.xml                  # SEO sitemap
│
├── js/                          # JavaScript modules
│   ├── app.js                   # Homepage logic
│   ├── cart.js                  # Cart management
│   ├── epos.js                  # EPOS integration
│   ├── stripe-checkout.js       # Stripe payment processing
│   ├── toast.js                 # Notification system
│   ├── data.js                  # Backend communication
│   ├── storage.js               # LocalStorage wrapper
│   ├── users.js                 # User management
│   └── driver/                  # API drivers
│       ├── api.js               # API wrapper
│       ├── boudica.js           # Boudica AI integration
│       ├── credentials.js       # Credential management
│       ├── pgbc.js              # Database driver
│       ├── results.js           # Result processing
│       └── storage.js           # Persistent storage
│
├── styles/                      # CSS stylesheets
│   ├── styles.css               # Main stylesheet
│   ├── cart.css                 # Cart page styles
│   ├── toast.css                # Notification styles
│   └── loader.css               # Loading animation
│
├── assets/                      # Static assets
│   ├── images/                  # Product and layout images
│   ├── logos/                   # Branding assets
│   └── icons/                   # UI icons
│
└── .vscode/                     # VS Code settings
```

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Access to Boudica POS backend API
- Stripe account with API keys (for payment processing)
- Node.js (optional, for local development server)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/boudica-pos-web-store.git
   cd boudica-pos-web-store
   ```

2. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```
   REACT_APP_API_BASE_URL=http://localhost/cgi-bin
   REACT_APP_STRIPE_KEY=pk_test_xxxxxxxxxxxx
   REACT_APP_BOUDICA_SERVER=http://localhost/api/boudica
   ```

3. **Start a local server** (optional)
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Node.js with http-server
   npx http-server
   ```

4. **Open in browser**
   ```
   http://localhost:8000
   ```

---

## ⚙️ Configuration

### Stripe Setup

1. **Get API Keys**
   - Sign up at [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers > API Keys
   - Copy your publishable key (pk_...)

2. **Update Configuration**
   Edit `js/stripe-checkout.js`:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key_here';
   ```

3. **Backend Configuration**
   Ensure your Boudica POS backend has Stripe secret key configured:
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   ```

### Backend API Configuration

Update `js/data.js` with your backend URL:
```javascript
const PGBC_AGENTS = 'http://your-server/cgi-bin/boudica_pos';
```

### AI Integration (Boudica)

Configure Boudica AI endpoint in `js/driver/boudica.js`:
```javascript
const BOUDICA_API = 'http://your-server/api/boudica';
const API_KEY = 'your-boudica-api-key';
```

---

## 📖 Usage

### For Customers

**Browsing Products**
1. Visit the homepage
2. Browse product categories
3. Click on a product for details
4. Add to cart

**Checkout**
1. Click "Cart" or go to `/cart.html`
2. Review items and quantities
3. Enter shipping information
4. Select payment method
5. Process payment through Stripe

**Order History**
1. Log in to your account
2. Visit Order History page
3. View past orders and receipts
4. Track order status

**Workshop Registration**
1. Click "Workshops" modal
2. Browse available workshops
3. Click "Enroll" to register
4. Complete registration form

### For Administrators

**Viewing Reports**
Navigate to `reports.html` for:
- Sales analysis
- Revenue metrics
- Inventory reports
- Tax summaries

**Order Management**
- View all orders in Order History
- Process refunds through Stripe integration
- Track order status in real-time

---

## 🔌 API Integration

### Backend Endpoints Used

The web store communicates with the Boudica POS backend via these commands:

**Product Data**
```
GET /cgi-bin/boudica_pos?command=getdetails&barcode=xxx
GET /cgi-bin/boudica_pos?command=quantitylookup&barcode=xxx
```

**Orders**
```
POST /cgi-bin/boudica_pos?command=webstoreorder
GET /cgi-bin/boudica_pos?command=orderhistory&email=user@example.com
GET /cgi-bin/boudica_pos?command=getreceipt&order_id=xxx
```

**Payments (Stripe)**
```
POST /cgi-bin/boudica_pos?command=initiate_payment
POST /cgi-bin/boudica_pos?command=confirm_payment
POST /cgi-bin/boudica_pos?command=process_refund
```

**AI Integration**
```
POST /api/boudica?prompt=user_question&user_id=xxx
```

For complete API documentation, see [API Reference](../../../STRIPE_INTEGRATION_GUIDE.md)

---

## 🛡️ Security Considerations

### Critical Security Notes

⚠️ **PRODUCTION CHECKLIST:**

- [ ] **Never** commit `.env` or API keys to version control
- [ ] Use environment variables for all sensitive configuration
- [ ] Implement HTTPS/TLS for all communications
- [ ] Validate all user input on backend
- [ ] Use CSRF tokens for form submissions
- [ ] Implement rate limiting on backend
- [ ] Keep Stripe keys secure - rotate regularly
- [ ] Enable Stripe webhook signing verification
- [ ] Sanitize all user-provided data
- [ ] Use CSP (Content Security Policy) headers

### LocalStorage Security

⚠️ **WARNING:** Cart and user data stored in `localStorage` is **NOT encrypted**
- Use for non-sensitive data only
- Implement server-side session management for sensitive data
- Clear sensitive data on logout
- Use secure HTTP-only cookies for auth tokens

### Payment Security

✅ **Stripe handles:**
- PCI DSS compliance
- Tokenization of card data
- Fraud detection
- Secure communication

**Your responsibility:**
- Never log card details
- Never store raw card data
- Validate server-side
- Use HTTPS only
- Implement 3D Secure when needed

---

## 📦 Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Grid, Flexbox, CSS Variables, Animations
- **JavaScript ES6** - Modules, Arrow Functions, Async/Await
- **Stripe.js** - Payment processing
- **LocalStorage API** - Client-side data persistence
- **Fetch API** - HTTP requests
- **Chart.js** - Analytics visualization (via backend)

---

## 🔧 Development

### Running Tests
```bash
# Manual testing checklist available in TESTING_GUIDE.md
# Automated testing setup coming in future releases
```

### Code Style
- Use ES6 modules
- Follow naming conventions: camelCase for variables/functions, PascalCase for classes
- Include JSDoc comments for public functions
- Keep functions focused and reusable
- Use template literals for strings

### Building for Production
1. Minify CSS files
2. Minify JavaScript files
3. Optimize images
4. Set environment variables to production keys
5. Enable all security headers
6. Test payment flow end-to-end

---

## 🚨 Troubleshooting

### Cart Not Persisting
- Check browser's localStorage is enabled
- Clear localStorage and try again: `localStorage.clear()`
- Check browser's storage quota

### Stripe Not Loading
- Verify API key is set correctly in `stripe-checkout.js`
- Check console for errors: F12 > Console tab
- Ensure Stripe.js is loaded: check Network tab
- Verify domain is added to Stripe dashboard

### Backend Connection Issues
- Check API URL is correct in `js/data.js`
- Ensure backend server is running
- Verify CORS headers are set correctly
- Check network tab for 400/500 errors

### Missing Products
- Verify products exist in backend database
- Check product_active flag is set to true
- Ensure database connection is working

---

## 📚 Additional Resources

- [Boudica POS Main Repository](../../)
- [Backend API Documentation](../back_end/call.txt)
- [Stripe Documentation](https://stripe.com/docs)
- [Complete Functionality Analysis](../../COMPLETE_FUNCTIONALITY_ANALYSIS.md)
- [Stripe Integration Guide](../../STRIPE_INTEGRATION_GUIDE.md)
- [Testing Guide](../../TESTING_GUIDE.md)

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Contribution Guidelines
- Follow the code style mentioned in Development section
- Test all changes thoroughly
- Update documentation for new features
- Write clear commit messages
- Add comments for complex logic
- Ensure security best practices are followed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Issues

### Reporting Issues
1. Check existing issues on GitHub
2. Provide clear reproduction steps
3. Include browser/environment details
4. Attach screenshots or error logs
5. Security issues: Email security@boudi.ca instead of GitHub

### Getting Help
- **Documentation**: See files in root directory
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Email**: support@boudi.ca

---

## 📝 Changelog

### Version 2.0.0 (June 2026)
- ✨ Stripe payment integration
- ✨ Order history page with receipts
- ✨ Boudica AI integration
- 🐛 Bug fixes for cart persistence
- 📱 Improved mobile responsiveness

### Version 1.0.0 (Initial Release)
- 🛍️ Product catalog
- 🛒 Shopping cart
- 📧 Workshop registration
- 💬 Special orders
- 📱 Responsive design

---

## 👥 Authors

**Boudica POS Development Team**
- Simon Ian Bain (Lead Developer)
- OmniIndex Inc.

---

## 🙏 Acknowledgments

- Stripe for payment processing
- The Curiosity Cabins team
- Open-source community contributors

---

**Made with ❤️ for small businesses and artisans worldwide**