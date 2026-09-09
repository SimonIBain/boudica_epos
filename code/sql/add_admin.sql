-- ===== ADD NEW ADMIN USER TO BOUDICA POS =====
-- This SQL script creates a new admin user in the store.users table
-- Usage (set the two variables, then pipe this file in):
--   psql -U store -h localhost -d postgres \
--     -v admin_email="'admin@example.com'" -v admin_password="'ReplaceWithARealPassword!'" \
--     -f add_admin.sql
--
-- The previous version of this file had literal "<email>"/"<PASSWORD>" placeholder tokens
-- and an unclosed string literal inside the crypt() call — not valid SQL as shipped, it
-- would fail with a syntax error if piped into psql directly. Uses psql variables instead
-- of hand-edited placeholders so there's no quoting to get wrong.
INSERT INTO store.users (username, email, password_hash, role, full_name, is_active)
VALUES ('admin', :admin_email,
        crypt(:admin_password, gen_salt('bf')),
        'admin', 'Administrator', true)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the user was created
SELECT id, username, email, role, full_name, is_active, created_at FROM store.users WHERE username = 'admin';
