-- ===== FULL-TEXT SEARCH FUNCTION =====
/**
 * Search products using full-text search
 * @param search_term - The search text (e.g., "red shirt")
 * @return JSON array of matching products
 */
CREATE OR REPLACE FUNCTION store.search_products_fulltext(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    product_description TEXT,
    barcode TEXT,
    color TEXT,
    type TEXT,
    purchase_price NUMERIC,
    rs_price NUMERIC,
    pack_size TEXT,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.color,
        p.type,
        p.purchase_price,
        p.rs_price,
        p.pack_size,
        ts_rank(p.search_vector, plainto_tsquery('english', search_term))::real AS relevance
    FROM store.products p
    WHERE p.search_vector @@ plainto_tsquery('english', search_term)
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== SEMANTIC/FUZZY SEARCH FUNCTION =====
/**
 * Search products using semantic/fuzzy matching
 * For typo-tolerant and phonetic searching
 * @param search_term - The search text
 * @param max_distance - Maximum edit distance (default 2)
 * @return JSON array of matching products
 */
CREATE OR REPLACE FUNCTION store.search_products_semantic(
    search_term TEXT,
    max_distance INTEGER DEFAULT 2
)
RETURNS TABLE (
    id INTEGER,
    product_description TEXT,
    barcode TEXT,
    color TEXT,
    type TEXT,
    purchase_price NUMERIC,
    rs_price NUMERIC,
    pack_size TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.color,
        p.type,
        p.purchase_price,
        p.rs_price,
        p.pack_size,
        GREATEST(
            similarity(p.product_description, search_term),
            similarity(p.barcode, search_term),
            similarity(p.color, search_term),
            similarity(p.type, search_term)
        )::real AS similarity
    FROM store.products p
    WHERE (
        similarity(p.product_description, search_term) > 0.3 OR
        similarity(p.barcode, search_term) > 0.3 OR
        similarity(p.color, search_term) > 0.5 OR
        similarity(p.type, search_term) > 0.5 OR
        levenshtein(p.barcode, search_term) <= max_distance
    )
    ORDER BY similarity DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== COMBINED SEARCH FUNCTION =====
/**
 * Search products using both full-text and semantic search
 * Combines results with ranking
 * @param search_term - The search text
 * @return JSON array of matching products with combined relevance score
 */
CREATE OR REPLACE FUNCTION store.search_products(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    product_description TEXT,
    barcode TEXT,
    color TEXT,
    type TEXT,
    purchase_price NUMERIC,
    rs_price NUMERIC,
    pack_size TEXT,
    search_method TEXT,
    relevance REAL
) AS $$
BEGIN
    -- Full-text search results
    RETURN QUERY
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.color,
        p.type,
        p.purchase_price,
        p.rs_price,
        p.pack_size,
        'fulltext'::TEXT,
        ts_rank(p.search_vector, plainto_tsquery('english', search_term))::real
    FROM store.products p
    WHERE p.search_vector @@ plainto_tsquery('english', search_term)
    UNION ALL
    -- Semantic search results (not already found by full-text)
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.color,
        p.type,
        p.purchase_price,
        p.rs_price,
        p.pack_size,
        'semantic'::TEXT,
        GREATEST(
            similarity(p.product_description, search_term),
            similarity(p.barcode, search_term),
            similarity(p.color, search_term),
            similarity(p.type, search_term)
        )::real
    FROM store.products p
    WHERE NOT (p.search_vector @@ plainto_tsquery('english', search_term))
    AND (
        similarity(p.product_description, search_term) > 0.3 OR
        similarity(p.barcode, search_term) > 0.3 OR
        similarity(p.color, search_term) > 0.5 OR
        similarity(p.type, search_term) > 0.5
    )
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== BARCODE SEARCH FUNCTION =====
/**
 * Quick barcode search
 * @param barcode - The barcode to search
 * @return Product details
 */
CREATE OR REPLACE FUNCTION store.search_by_barcode(barcode TEXT)
RETURNS TABLE (
    id INTEGER,
    product_description TEXT,
    barcode_found TEXT,
    color TEXT,
    type TEXT,
    purchase_price NUMERIC,
    rs_price NUMERIC,
    pack_size TEXT,
    supplier TEXT,
    quantity NUMERIC,
    available NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.color,
        p.type,
        p.purchase_price,
        p.rs_price,
        p.pack_size,
        p.supplier,
        s.quantity,
        s.available
    FROM store.products p
    LEFT JOIN store.stock s ON p.barcode = s.barcode
    WHERE p.barcode = barcode;
END;
$$ LANGUAGE plpgsql;

-- ===== INVENTORY SEARCH BY SUPPLIER =====
/**
 * Search inventory by supplier
 * @param supplier_name - The supplier name
 * @return Supplier's products with stock levels
 */
CREATE OR REPLACE FUNCTION store.search_by_supplier(supplier_name TEXT)
RETURNS TABLE (
    id INTEGER,
    product_description TEXT,
    barcode TEXT,
    color TEXT,
    type TEXT,
    purchase_price NUMERIC,
    rs_price NUMERIC,
    pack_size TEXT,
    quantity NUMERIC,
    available NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.color,
        p.type,
        p.purchase_price,
        p.rs_price,
        p.pack_size,
        s.quantity,
        s.available
    FROM store.products p
    LEFT JOIN store.stock s ON p.barcode = s.barcode
    WHERE p.supplier = supplier_name
    ORDER BY p.product_description;
END;
$$ LANGUAGE plpgsql;

-- ===== LOW STOCK ALERT FUNCTION =====
/**
 * Get products with low stock levels
 * @param threshold - Minimum quantity threshold (default 10)
 * @return Products below threshold
 */
CREATE OR REPLACE FUNCTION store.get_low_stock(threshold NUMERIC DEFAULT 10)
RETURNS TABLE (
    id INTEGER,
    product_description TEXT,
    barcode TEXT,
    supplier TEXT,
    quantity NUMERIC,
    available NUMERIC,
    purchase_price NUMERIC,
    supplier_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_description,
        p.barcode,
        p.supplier,
        s.quantity,
        s.available,
        p.purchase_price,
        sup.emailaddress
    FROM store.products p
    LEFT JOIN store.stock s ON p.barcode = s.barcode
    LEFT JOIN store.suppliers sup ON p.supplier = sup.supplier
    WHERE COALESCE(s.quantity, 0) < threshold
    ORDER BY s.quantity ASC;
END;
$$ LANGUAGE plpgsql;

-- ===== AUDIT TRIGGER FOR CHANGE TRACKING =====
/**
 * Audit trigger to log all changes to products table
 */
CREATE OR REPLACE FUNCTION store.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO store.audit_log (table_name, operation, record_id, new_values, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO store.audit_log (table_name, operation, record_id, old_values, new_values, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD), row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO store.audit_log (table_name, operation, record_id, old_values, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach audit trigger to products table
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON store.products
FOR EACH ROW EXECUTE FUNCTION store.audit_trigger();

-- Attach audit trigger to stock table
CREATE TRIGGER stock_audit AFTER INSERT OR UPDATE OR DELETE ON store.stock
FOR EACH ROW EXECUTE FUNCTION store.audit_trigger();

-- Attach audit trigger to customer_orders table
CREATE TRIGGER customer_orders_audit AFTER INSERT OR UPDATE OR DELETE ON store.customer_orders
FOR EACH ROW EXECUTE FUNCTION store.audit_trigger();

-- ===== TRANSACTION SAFETY FUNCTION =====
/**
 * Execute a query within a transaction with automatic rollback
 * Returns success status and result
 * Note: Call from application code using transaction methods
 */
CREATE OR REPLACE FUNCTION store.safe_execute(query TEXT)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    affected_rows INTEGER
) AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    BEGIN
        EXECUTE query;
        GET DIAGNOSTICS affected_count = ROW_COUNT;
        RETURN QUERY SELECT true, 'Query executed successfully'::TEXT, affected_count;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error: ' || SQLERRM, 0;
    END;
END;
$$ LANGUAGE plpgsql;

-- ===== SET FUNCTION OWNERSHIP =====
ALTER FUNCTION store.search_products_fulltext(TEXT) OWNER TO store;
ALTER FUNCTION store.search_products_semantic(TEXT, INTEGER) OWNER TO store;
ALTER FUNCTION store.search_products(TEXT) OWNER TO store;
ALTER FUNCTION store.search_by_barcode(TEXT) OWNER TO store;
ALTER FUNCTION store.search_by_supplier(TEXT) OWNER TO store;
ALTER FUNCTION store.get_low_stock(NUMERIC) OWNER TO store;
ALTER FUNCTION store.audit_trigger() OWNER TO store;
ALTER FUNCTION store.safe_execute(TEXT) OWNER TO store;

-- Grant execute permissions to store user
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA store TO store;
