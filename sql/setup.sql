-- ===== DATABASE USER & SECURITY =====
CREATE USER IF NOT EXISTS store WITH PASSWORD 'Th3Cur1051tyP455word';
GRANT CONNECT ON DATABASE postgres TO store;

-- ===== REQUIRED EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS store;

-- ===== SUPPLIER MANAGEMENT =====
CREATE TABLE store.suppliers (
    id SERIAL PRIMARY KEY,
    supplier TEXT UNIQUE NOT NULL,
    telephone TEXT,
    address TEXT,
    postcode TEXT,
    emailaddress TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store.suppliers_payments (
    id SERIAL PRIMARY KEY,
    supplier TEXT REFERENCES store.suppliers(supplier),
    cumulative NUMERIC,
    paid_out NUMERIC,
    outstanding NUMERIC,
    paid_on TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store.suppliers_invoices (
    id SERIAL PRIMARY KEY,
    supplier TEXT REFERENCES store.suppliers(supplier),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_details TEXT,
    invoice_amount NUMERIC,
    paid_on TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== PRODUCT CATALOG WITH SEARCH CAPABILITIES =====
CREATE TABLE store.products (
    id SERIAL PRIMARY KEY,
    supplier TEXT REFERENCES store.suppliers(supplier),
    product_description TEXT NOT NULL,
    color TEXT,
    type TEXT,
    purchase_price NUMERIC,
    rs_price NUMERIC,
    pack_size TEXT,
    barcode TEXT UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(product_description, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(color, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(type, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(barcode, '')), 'C')
    ) STORED
);

-- Full-text search index on products
CREATE INDEX idx_products_search_vector ON store.products USING gin(search_vector);

-- Semantic search indexes for individual fields
CREATE INDEX idx_products_description_trgm ON store.products USING gin(product_description gin_trgm_ops);
CREATE INDEX idx_products_barcode_trgm ON store.products USING gin(barcode gin_trgm_ops);
CREATE INDEX idx_products_color ON store.products (color);
CREATE INDEX idx_products_type ON store.products (type);

-- ===== INVENTORY MANAGEMENT =====
CREATE TABLE store.stock (
    id SERIAL PRIMARY KEY,
    barcode TEXT REFERENCES store.products(barcode),
    quantity NUMERIC NOT NULL DEFAULT 0,
    available NUMERIC NOT NULL DEFAULT 0,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barcode)
);

CREATE INDEX idx_stock_barcode ON store.stock(barcode);

CREATE TABLE store.stock_take (
    id SERIAL PRIMARY KEY,
    barcode TEXT REFERENCES store.products(barcode),
    quantity NUMERIC,
    available NUMERIC,
    counted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store.stock_removal (
    id SERIAL PRIMARY KEY,
    barcode TEXT REFERENCES store.products(barcode),
    quantity NUMERIC,
    reason TEXT,
    removed_on TEXT,
    return_back TEXT,
    returned_quantity NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== SALES TRACKING =====
CREATE TABLE store.period_sales (
    id SERIAL PRIMARY KEY,
    supplier TEXT REFERENCES store.suppliers(supplier),
    barcode TEXT REFERENCES store.products(barcode),
    quantity NUMERIC,
    running_total NUMERIC,
    type TEXT,
    completed CHAR(1) DEFAULT '0',
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_period_sales_date (sale_date),
    INDEX idx_period_sales_barcode (barcode)
);

-- ===== TILL OPERATIONS =====
CREATE TABLE store.till_float (
    id SERIAL PRIMARY KEY,
    cash_float NUMERIC NOT NULL,
    float_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store.cash_up (
    id SERIAL PRIMARY KEY,
    cash_float NUMERIC,
    takings NUMERIC,
    cash_sales NUMERIC,
    card_sales NUMERIC,
    cashup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== CUSTOMER MANAGEMENT =====
CREATE TABLE store.customers (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    address TEXT,
    postcode TEXT,
    telephone TEXT,
    name TEXT,
    surname TEXT,
    point_number NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON store.customers(email);
CREATE INDEX idx_customers_point_number ON store.customers(point_number);

-- ===== ORDER MANAGEMENT WITH TAX FIELDS =====
CREATE TABLE store.customer_orders (
    id SERIAL PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    email TEXT REFERENCES store.customers(email),
    items TEXT NOT NULL,
    deposit NUMERIC,
    total_value NUMERIC NOT NULL,
    outstanding NUMERIC,
    fulfilled CHAR(1) DEFAULT '0',
    payment_method TEXT,
    order_status TEXT DEFAULT 'pending',
    order_date TEXT NOT NULL,
    subtotal NUMERIC NOT NULL,
    vat_amount NUMERIC NOT NULL,
    vat_rate NUMERIC DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_orders_email ON store.customer_orders(email);
CREATE INDEX idx_customer_orders_order_id ON store.customer_orders(order_id);
CREATE INDEX idx_customer_orders_date ON store.customer_orders(order_date);
CREATE INDEX idx_customer_orders_status ON store.customer_orders(order_status);

-- ===== PAYMENT TRANSACTIONS (STRIPE) =====
CREATE TABLE store.payment_transactions (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES store.customer_orders(order_id),
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    stripe_customer_id TEXT,
    customer_email TEXT NOT NULL,
    amount_cents NUMERIC NOT NULL,
    currency TEXT DEFAULT 'gbp',
    payment_method TEXT,  -- 'card', 'ideal', etc
    payment_status TEXT DEFAULT 'pending',  -- pending, processing, succeeded, failed, refunded
    payment_type TEXT,  -- 'web_order' or 'till_sale'
    till_transaction_id TEXT,  -- For till sales
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- For refunds
    refund_status TEXT,  -- null, 'pending', 'succeeded', 'failed'
    refund_amount_cents NUMERIC,
    refund_reason TEXT,
    refunded_at TIMESTAMP
);

CREATE INDEX idx_payment_transactions_order_id ON store.payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_stripe_pi ON store.payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_payment_transactions_status ON store.payment_transactions(payment_status);
CREATE INDEX idx_payment_transactions_email ON store.payment_transactions(customer_email);
CREATE INDEX idx_payment_transactions_date ON store.payment_transactions(created_at);

-- ===== LOYALTY PROGRAM =====
CREATE TABLE store.reward_points (
    id SERIAL PRIMARY KEY,
    point_number NUMERIC,
    points_earned NUMERIC DEFAULT 0,
    points_used NUMERIC DEFAULT 0,
    points_remaining NUMERIC DEFAULT 0,
    points_expiry TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== WEB STORE =====
CREATE TABLE store.web_store_front (
    id SERIAL PRIMARY KEY,
    clauses TEXT,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== WORKSHOPS/EVENTS =====
CREATE TABLE store.workshops (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    when_date TEXT NOT NULL,
    when_time TEXT,
    price NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== DATABASE AUDIT TRAIL =====
CREATE TABLE store.audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
    record_id INTEGER,
    old_values JSON,
    new_values JSON,
    changed_by TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_table ON store.audit_log(table_name);
CREATE INDEX idx_audit_log_date ON store.audit_log(changed_at);
CREATE INDEX idx_audit_log_operation ON store.audit_log(operation);

-- ===== USER MANAGEMENT & AUTHENTICATION =====
CREATE TABLE store.users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'operator',  -- admin, manager, operator
    full_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON store.users(username);
CREATE INDEX idx_users_email ON store.users(email);
CREATE INDEX idx_users_role ON store.users(role);

-- ===== LOGGING & AUDIT =====
CREATE TABLE store.logs (
    id SERIAL PRIMARY KEY,
    log_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    message TEXT,
    log_level TEXT DEFAULT 'info',  -- debug, info, warning, error
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_timestamp ON store.logs(log_timestamp);
CREATE INDEX idx_logs_reason ON store.logs(reason);
CREATE INDEX idx_logs_level ON store.logs(log_level);

ALTER TABLE store.logs OWNER TO store;
GRANT ALL PRIVILEGES ON store.logs TO store;
GRANT USAGE, SELECT ON SEQUENCE store.logs_id_seq TO store;

-- ===== ENABLE REQUIRED EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;   -- For semantic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;         -- For trigram similarity search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- For UUID support

-- ===== SCHEMA OWNERSHIP =====
ALTER SCHEMA store OWNER TO store;
GRANT ALL PRIVILEGES ON SCHEMA store TO store;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA store TO store;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA store TO store;

-- Set users table ownership
ALTER TABLE store.users OWNER TO store;