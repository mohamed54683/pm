-- ===========================================
-- QMS Database Migration Script
-- Password Security & Performance Indexes
-- ===========================================

-- Run this script to:
-- 1. Add necessary columns for security
-- 2. Create indexes for performance
-- 3. Update table structure

-- ===========================================
-- 1. ADD UPDATED_AT COLUMN TO USERS TABLE
-- ===========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- ===========================================
-- 2. CREATE USER_AUTH TABLE IF NOT EXISTS
-- ===========================================
CREATE TABLE IF NOT EXISTS user_auth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_authenticated TINYINT(1) DEFAULT 0,
    last_login TIMESTAMP NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_last_login (last_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 3. CREATE REFRESH_TOKENS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 4. CREATE AUDIT_LOG TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 5. PERFORMANCE INDEXES
-- ===========================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Quality audits indexes
CREATE INDEX IF NOT EXISTS idx_qa_restaurant ON quality_audits(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_qa_audit_date ON quality_audits(audit_date);
CREATE INDEX IF NOT EXISTS idx_qa_created_at ON quality_audits(created_at);
CREATE INDEX IF NOT EXISTS idx_qa_status ON quality_audits(status);

-- Training audits indexes
CREATE INDEX IF NOT EXISTS idx_ta_restaurant ON training_audits(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_ta_audit_date ON training_audits(audit_date);
CREATE INDEX IF NOT EXISTS idx_ta_created_at ON training_audits(created_at);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_restaurant ON reports(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_audit_date ON reports(audit_date);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Action plans indexes
CREATE INDEX IF NOT EXISTS idx_ap_status ON action_plan_items(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date ON action_plan_items(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_store ON action_plan_items(store_name);
CREATE INDEX IF NOT EXISTS idx_ap_created_at ON action_plan_items(created_at);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Restaurants indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);

-- ===========================================
-- 6. MIGRATE EXISTING PASSWORDS
-- ===========================================
-- Note: Passwords will be automatically migrated to bcrypt
-- when users log in. This is handled by the application.

-- Insert user_auth records for existing users (without hashing - app handles this)
INSERT IGNORE INTO user_auth (email, password_hash, is_authenticated)
SELECT email, COALESCE(password, ''), 0 FROM users;

-- ===========================================
-- 7. SHOW MIGRATION STATUS
-- ===========================================
SELECT 'Migration completed successfully!' as Status;

SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM user_auth) as user_auth_records,
    (SELECT COUNT(*) FROM user_auth WHERE password_hash LIKE '$2%') as bcrypt_passwords;
