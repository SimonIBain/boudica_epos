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
├── cart-management.html         # Saved carts / wishlist
├── sitemap.xml                  # SEO sitemap
│
├── js/                          # JavaScript modules (ES modules throughout)
│   ├── app.js                   # Homepage logic
│   ├── cart.js                  # Cart management
│   ├── epos.js                  # Boudica AI advice chat
│   ├── stripe-checkout.js       # Stripe payment processing
│   ├── toast.js                 # Notification system
│   ├── data.js                  # Product catalog access (getcatalog)
│   └── session.js               # Shared session-token auth + escapeHtml helper —
│                                 # every backend call in this directory goes through
│                                 # this module. See CODE_VERIFIED_AUDIT.md §12.
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

There is no admin reports page in this directory — reporting lives in the till
(`code/web/`), behind real staff login and role checks. An earlier
`reports.html` here was a fully public, unauthenticated copy of the same
reports and has been removed (see CODE_VERIFIED_AUDIT.md §12).

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge) — this is plain HTML/CSS/ES
  modules, no build step, no framework (not React, despite an earlier version
  of this README implying otherwise)
- The boudica_pos backend + Postgres running and reachable (see the project
  root's `docker-compose.yml` — `docker compose up -d` from there brings up
  db + backend + this frontend together)
- A Stripe account (for payment processing) with `STRIPE_SECRET_KEY`/
  `STRIPE_PUBLISHABLE_KEY` set on the **backend** (see `getpublicconfig`,
  below) — nothing to configure in this directory itself

### Running it

This directory is served as static files by the `frontend` nginx container
(`docker/frontend/Dockerfile`) at the project root, at `http://localhost:8080/`,
with `/cgi-bin/` proxied to the real backend so every relative-path API call
here just works with no CORS setup needed. There is no separate local dev
server for this directory alone — `js/session.js`'s calls are same-origin
relative paths (`/cgi-bin/boudica_pos`), which only resolve correctly when
served through that same nginx origin.

---

## ⚙️ Configuration

Nothing in this directory needs editing for a normal deployment — every
piece of runtime config lives on the **backend**, not in this static
frontend, precisely so no server URL or secret has to be hardcoded and
shipped to every visitor's browser (see the credential-handling note below).

### Stripe

Set `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` as backend environment
variables (`docker-compose.yml` at the project root). `js/stripe-checkout.js`
fetches the publishable key at runtime via the `getpublicconfig` command —
there's nothing to hardcode here.

### Backend URL

All backend calls go through `js/session.js`, which uses the relative path
`/cgi-bin/boudica_pos` — same-origin through the `frontend` nginx container,
which proxies it to the real backend. There's no separate URL to configure;
deploying this behind a different origin means updating the `nginx.conf`
proxy target, not anything in this JS.

### Boudica AI

The API key lives on the backend (`BOUDICA_API_KEY`, see
`reference_boudica_slm_inference` in the main project). This frontend never
sees it — it calls the backend's own `getadvice` command (`js/epos.js`),
which calls Boudica server-side.

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

Reporting and admin functions live in the till (`code/web/`), behind real
staff login and role checks (`salesreport`/`revenuereport`/`taxsummary`
require an admin account) — not in this public-facing directory. There used
to be a `reports.html` here with no access control at all; it's been removed.

---

## 🔌 API Integration

### Backend Endpoints Used

The web store communicates with the Boudica POS backend via these commands:

**Product Catalog**
```
POST /cgi-bin/boudica_pos  (command=getcatalog, q=search_term, page, limit)
```
Returns only customer-safe fields (description/color/type/price/image_url/
availability tier) — built for the customer kiosk, shared here. See
CODE_VERIFIED_AUDIT.md §11.

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

**AI Advice**
```
POST /cgi-bin/boudica_pos  (command=getadvice, prompt=user_question, token=...)
```

Every call above is authenticated the same way: a session token obtained
once per browser session via `command=login` (the shared `web_store_user`
service account), not a resent username/password on every request. See
`js/session.js` and CODE_VERIFIED_AUDIT.md §8/§12.

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
- Check the backend has `STRIPE_PUBLISHABLE_KEY` configured (`getpublicconfig`
  should return a real `pk_...` value, not empty)
- Check console for errors: F12 > Console tab
- Ensure Stripe.js is loaded: check Network tab
- Verify domain is added to Stripe dashboard

### Backend Connection Issues
- Confirm this directory is being served through the `frontend` nginx
  container (not opened as a `file://` page or a bare static server) — the
  relative `/cgi-bin/boudica_pos` calls in `js/session.js` only resolve
  correctly same-origin through that proxy
- Ensure the backend + db containers are healthy (`docker compose ps`)
- Check the browser console/Network tab for the actual error the backend
  returned (usually a clear `{"error": "..."}` JSON body, not a generic
  network failure)

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