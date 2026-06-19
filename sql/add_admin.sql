-- ===== ADD NEW ADMIN USER TO BOUDICA POS =====
-- This SQL script creates a new admin user in the store.users table
-- Usage: sudo -u postgres psql < add_admin.sql
-- Or: psql -U store -h localhost -d postgres < add_admin.sql

-- Add initial admin user (password is hashed with pgcrypto bcrypt)
-- Username: admin
-- Password: AdminPassword123! (change this to your secure password)
INSERT INTO store.users (username, email, password_hash, role, full_name, is_active)
VALUES ('admin', '<email>', 
        crypt('<PASSWORD>, gen_salt('bf')), 
        'admin', 'Administrator', true)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the user was created
SELECT id, username, email, role, full_name, is_active, created_at FROM store.users WHERE username = 'admin';
