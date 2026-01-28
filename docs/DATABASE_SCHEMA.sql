-- =====================================================
-- ENTERPRISE PROJECT MANAGEMENT SYSTEM (EPMS)
-- Complete Database Schema
-- Version: 1.0.0
-- Date: January 28, 2026
-- Database: MySQL 8.0 / MariaDB 10.6+
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS epms_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE epms_system;

-- =====================================================
-- MODULE 01: CORE PLATFORM (Multi-Tenancy)
-- =====================================================

-- Tenants (Organizations/Companies)
CREATE TABLE tenants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    subscription_plan ENUM('free', 'starter', 'professional', 'enterprise', 'government') DEFAULT 'free',
    subscription_status ENUM('active', 'trial', 'suspended', 'cancelled') DEFAULT 'trial',
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    settings JSON,
    metadata JSON,
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_slug (slug),
    INDEX idx_domain (domain),
    INDEX idx_subscription (subscription_plan, subscription_status)
) ENGINE=InnoDB;

-- System Configuration
CREATE TABLE system_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NULL, -- NULL = global config
    config_key VARCHAR(100) NOT NULL,
    config_value JSON,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_config (tenant_id, config_key),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Feature Flags
CREATE TABLE feature_flags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NULL,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INT DEFAULT 0,
    conditions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_feature (tenant_id, feature_key),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 02: IDENTITY & ACCESS MANAGEMENT
-- =====================================================

-- Users
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    job_title VARCHAR(100),
    department VARCHAR(100),
    employee_id VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(10) DEFAULT '24h',
    status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'pending',
    last_login_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_recovery_codes JSON,
    preferences JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_tenant_email (tenant_id, email),
    INDEX idx_tenant (tenant_id),
    INDEX idx_email (email),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User Authentication Methods (SSO, OAuth)
CREATE TABLE user_auth_providers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft', 'saml', 'ldap'
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    profile_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_provider_user (provider, provider_user_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSON,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Roles
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NULL, -- NULL = system role
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    level INT DEFAULT 0, -- Hierarchy level
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_slug (tenant_id, slug),
    INDEX idx_tenant (tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Permissions
CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_module (module),
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- Role-Permission Mapping
CREATE TABLE role_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User-Role Mapping
CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    scope_type ENUM('global', 'portfolio', 'program', 'project') DEFAULT 'global',
    scope_id BIGINT UNSIGNED NULL,
    granted_by BIGINT UNSIGNED,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role_scope (user_id, role_id, scope_type, scope_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role_id),
    INDEX idx_scope (scope_type, scope_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Teams
CREATE TABLE teams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    lead_id BIGINT UNSIGNED,
    parent_team_id BIGINT UNSIGNED,
    settings JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_lead (lead_id),
    INDEX idx_parent (parent_team_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Team Members
CREATE TABLE team_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM('member', 'lead', 'admin') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    UNIQUE KEY unique_team_user (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Audit Logs
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT UNSIGNED,
    entity_uuid CHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 03: PROJECT & PORTFOLIO MANAGEMENT
-- =====================================================

-- Portfolios
CREATE TABLE portfolios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT,
    owner_id BIGINT UNSIGNED,
    status ENUM('active', 'on_hold', 'completed', 'cancelled') DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'USD',
    strategic_alignment JSON,
    kpis JSON,
    settings JSON,
    metadata JSON,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_owner (owner_id),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Programs
CREATE TABLE programs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    portfolio_id BIGINT UNSIGNED,
    code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT,
    manager_id BIGINT UNSIGNED,
    status ENUM('initiation', 'planning', 'execution', 'monitoring', 'closure', 'on_hold', 'cancelled') DEFAULT 'initiation',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'USD',
    benefits JSON,
    kpis JSON,
    settings JSON,
    metadata JSON,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_manager (manager_id),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Project Templates
CREATE TABLE project_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    methodology ENUM('agile', 'waterfall', 'hybrid', 'kanban', 'custom') DEFAULT 'agile',
    template_data JSON, -- Contains phases, default tasks, etc.
    settings JSON,
    is_public BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_methodology (methodology),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Projects
CREATE TABLE projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    portfolio_id BIGINT UNSIGNED,
    program_id BIGINT UNSIGNED,
    template_id BIGINT UNSIGNED,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT,
    scope TEXT,
    deliverables TEXT,
    success_criteria TEXT,
    
    -- Classification
    methodology ENUM('agile', 'waterfall', 'hybrid', 'kanban', 'custom') DEFAULT 'agile',
    category VARCHAR(100),
    type VARCHAR(100),
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    
    -- Lifecycle
    status ENUM('draft', 'initiation', 'planning', 'execution', 'monitoring', 'closure', 'completed', 'on_hold', 'cancelled') DEFAULT 'draft',
    phase VARCHAR(100),
    health ENUM('on_track', 'at_risk', 'off_track', 'not_started') DEFAULT 'not_started',
    
    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Team
    owner_id BIGINT UNSIGNED,
    manager_id BIGINT UNSIGNED,
    sponsor_id BIGINT UNSIGNED,
    
    -- Budget
    budget DECIMAL(18,2) DEFAULT 0,
    actual_cost DECIMAL(18,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Settings
    settings JSON,
    custom_fields JSON,
    metadata JSON,
    
    -- Baselines
    baseline_scope TEXT,
    baseline_schedule JSON,
    baseline_cost DECIMAL(18,2),
    baseline_created_at TIMESTAMP NULL,
    
    -- Audit
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_tenant_code (tenant_id, code),
    INDEX idx_tenant (tenant_id),
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_program (program_id),
    INDEX idx_status (status),
    INDEX idx_methodology (methodology),
    INDEX idx_health (health),
    INDEX idx_manager (manager_id),
    INDEX idx_dates (planned_start_date, planned_end_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Project Members
CREATE TABLE project_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED,
    role_name VARCHAR(100), -- 'Project Manager', 'Developer', etc.
    allocation_percentage DECIMAL(5,2) DEFAULT 100,
    hourly_rate DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    UNIQUE KEY unique_project_user (project_id, user_id),
    INDEX idx_project (project_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Project Dependencies
CREATE TABLE project_dependencies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    predecessor_id BIGINT UNSIGNED NOT NULL,
    successor_id BIGINT UNSIGNED NOT NULL,
    dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
    lag_days INT DEFAULT 0,
    description TEXT,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dependency (predecessor_id, successor_id),
    FOREIGN KEY (predecessor_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (successor_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Project Phases
CREATE TABLE project_phases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    project_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    status ENUM('not_started', 'in_progress', 'completed', 'skipped') DEFAULT 'not_started',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    deliverables TEXT,
    exit_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    INDEX idx_order (order_index),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Project Goals/KPIs
CREATE TABLE project_goals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    project_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('objective', 'kpi', 'milestone', 'deliverable') DEFAULT 'objective',
    metric_name VARCHAR(100),
    target_value DECIMAL(18,4),
    current_value DECIMAL(18,4),
    unit VARCHAR(50),
    target_date DATE,
    status ENUM('not_started', 'in_progress', 'achieved', 'missed', 'cancelled') DEFAULT 'not_started',
    owner_id BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 04: TASK & WORK BREAKDOWN STRUCTURE
-- =====================================================

-- Task Statuses (Configurable per project)
CREATE TABLE task_statuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    category ENUM('to_do', 'in_progress', 'done', 'cancelled') DEFAULT 'to_do',
    order_index INT DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Task Types
CREATE TABLE task_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_slug (tenant_id, slug),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Labels/Tags
CREATE TABLE labels (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tasks (Unified: Epic, Feature, Story, Task, Subtask, Bug)
CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    sprint_id BIGINT UNSIGNED,
    phase_id BIGINT UNSIGNED,
    parent_id BIGINT UNSIGNED, -- For subtasks and hierarchy
    
    -- Identification
    task_number INT UNSIGNED NOT NULL,
    task_key VARCHAR(30) NOT NULL, -- PROJECT-123
    
    -- Classification
    task_type_id BIGINT UNSIGNED,
    type ENUM('epic', 'feature', 'story', 'task', 'subtask', 'bug', 'improvement', 'milestone') DEFAULT 'task',
    
    -- Content
    title VARCHAR(500) NOT NULL,
    description LONGTEXT,
    acceptance_criteria TEXT,
    
    -- Status & Priority
    status_id BIGINT UNSIGNED,
    status VARCHAR(50) DEFAULT 'to_do',
    priority ENUM('critical', 'high', 'medium', 'low', 'none') DEFAULT 'medium',
    severity ENUM('blocker', 'critical', 'major', 'minor', 'trivial') NULL, -- For bugs
    
    -- Assignment
    assignee_id BIGINT UNSIGNED,
    reporter_id BIGINT UNSIGNED,
    
    -- Estimation
    story_points DECIMAL(5,2),
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2) DEFAULT 0,
    remaining_hours DECIMAL(8,2),
    
    -- Scheduling
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    due_date DATE,
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Flags
    is_milestone BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_blocking BOOLEAN DEFAULT FALSE,
    
    -- Recurrence
    recurrence_pattern JSON,
    recurrence_end_date DATE,
    
    -- WBS
    wbs_code VARCHAR(50),
    level INT DEFAULT 0,
    order_index INT DEFAULT 0,
    
    -- Board Position
    board_column VARCHAR(50),
    board_position INT DEFAULT 0,
    
    -- Definition of Done/Ready
    dod_checklist JSON,
    dor_checklist JSON,
    
    -- Custom Fields
    custom_fields JSON,
    metadata JSON,
    
    -- Audit
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_project_key (project_id, task_key),
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_sprint (sprint_id),
    INDEX idx_parent (parent_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_assignee (assignee_id),
    INDEX idx_due_date (due_date),
    INDEX idx_wbs (wbs_code),
    FULLTEXT idx_search (title, description),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (task_type_id) REFERENCES task_types(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES task_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Task Dependencies
CREATE TABLE task_dependencies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    predecessor_id BIGINT UNSIGNED NOT NULL,
    successor_id BIGINT UNSIGNED NOT NULL,
    dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
    lag_days INT DEFAULT 0,
    lag_hours DECIMAL(8,2) DEFAULT 0,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dependency (predecessor_id, successor_id),
    FOREIGN KEY (predecessor_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (successor_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Task Labels (Many-to-Many)
CREATE TABLE task_labels (
    task_id BIGINT UNSIGNED NOT NULL,
    label_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Task Watchers
CREATE TABLE task_watchers (
    task_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Task Checklists
CREATE TABLE task_checklists (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INT DEFAULT 0,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task (task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Checklist Items
CREATE TABLE checklist_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    checklist_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(500) NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    checked_by BIGINT UNSIGNED,
    checked_at TIMESTAMP NULL,
    due_date DATE,
    assignee_id BIGINT UNSIGNED,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_checklist (checklist_id),
    FOREIGN KEY (checklist_id) REFERENCES task_checklists(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Task History/Changelog
CREATE TABLE task_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', etc.
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task (task_id),
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 06: AGILE ENGINE (Sprints, Backlogs)
-- =====================================================

-- Sprints
CREATE TABLE sprints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',
    
    -- Dates
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Capacity
    capacity_points DECIMAL(8,2),
    capacity_hours DECIMAL(10,2),
    
    -- Metrics
    committed_points DECIMAL(8,2) DEFAULT 0,
    completed_points DECIMAL(8,2) DEFAULT 0,
    committed_hours DECIMAL(10,2) DEFAULT 0,
    completed_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Velocity
    velocity DECIMAL(8,2),
    
    -- Retrospective
    retrospective_notes TEXT,
    what_went_well TEXT,
    what_to_improve TEXT,
    action_items JSON,
    
    -- Definition of Done
    definition_of_done TEXT,
    
    order_index INT DEFAULT 0,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sprint Burndown Data
CREATE TABLE sprint_burndown (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sprint_id BIGINT UNSIGNED NOT NULL,
    date DATE NOT NULL,
    remaining_points DECIMAL(8,2),
    remaining_hours DECIMAL(10,2),
    completed_points DECIMAL(8,2),
    completed_hours DECIMAL(10,2),
    ideal_remaining DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_sprint_date (sprint_id, date),
    INDEX idx_sprint (sprint_id),
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Releases
CREATE TABLE releases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    version VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    status ENUM('planning', 'in_progress', 'released', 'archived') DEFAULT 'planning',
    release_date DATE,
    actual_release_date DATE,
    release_notes TEXT,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 07: RESOURCE MANAGEMENT
-- =====================================================

-- Skills/Competencies
CREATE TABLE skills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_skill (tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User Skills
CREATE TABLE user_skills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    skill_id BIGINT UNSIGNED NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
    years_experience DECIMAL(4,1),
    certified BOOLEAN DEFAULT FALSE,
    certification_date DATE,
    certification_expiry DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_skill (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Resource Calendars
CREATE TABLE resource_calendars (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    working_days JSON, -- {"monday": true, "tuesday": true, ...}
    working_hours JSON, -- {"start": "09:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Resource Exceptions (Holidays, Time Off)
CREATE TABLE resource_exceptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    calendar_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED,
    title VARCHAR(255) NOT NULL,
    exception_type ENUM('holiday', 'vacation', 'sick_leave', 'personal', 'training', 'other') DEFAULT 'holiday',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_all_day BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSON,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    approved_by BIGINT UNSIGNED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_calendar (calendar_id),
    INDEX idx_user (user_id),
    INDEX idx_dates (start_date, end_date),
    FOREIGN KEY (calendar_id) REFERENCES resource_calendars(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Resource Allocations
CREATE TABLE resource_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    task_id BIGINT UNSIGNED,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_per_day DECIMAL(4,2) DEFAULT 8,
    allocation_percentage DECIMAL(5,2) DEFAULT 100,
    role VARCHAR(100),
    status ENUM('tentative', 'confirmed', 'cancelled') DEFAULT 'tentative',
    notes TEXT,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_project (project_id),
    INDEX idx_task (task_id),
    INDEX idx_dates (start_date, end_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 08: TIME TRACKING
-- =====================================================

-- Time Entries
CREATE TABLE time_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    task_id BIGINT UNSIGNED,
    
    -- Time Data
    date DATE NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INT NOT NULL,
    
    -- Description
    description TEXT,
    
    -- Billing
    is_billable BOOLEAN DEFAULT TRUE,
    billable_amount DECIMAL(12,2),
    hourly_rate DECIMAL(10,2),
    
    -- Overtime
    is_overtime BOOLEAN DEFAULT FALSE,
    overtime_rate DECIMAL(4,2) DEFAULT 1.5,
    
    -- Status
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'invoiced') DEFAULT 'draft',
    
    -- Timer
    is_running BOOLEAN DEFAULT FALSE,
    timer_started_at DATETIME,
    
    -- Approval
    submitted_at TIMESTAMP NULL,
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Source
    source ENUM('manual', 'timer', 'import', 'integration') DEFAULT 'manual',
    external_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_project (project_id),
    INDEX idx_task (task_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Timesheets (Weekly/Monthly aggregation)
CREATE TABLE timesheets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    period_type ENUM('weekly', 'biweekly', 'monthly') DEFAULT 'weekly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_hours DECIMAL(10,2) DEFAULT 0,
    billable_hours DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(10,2) DEFAULT 0,
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'locked') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_period (user_id, period_start, period_end),
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_period (period_start, period_end),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 09: FINANCIAL MANAGEMENT
-- =====================================================

-- Budget Categories
CREATE TABLE budget_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    parent_id BIGINT UNSIGNED,
    category_type ENUM('labor', 'materials', 'equipment', 'services', 'travel', 'overhead', 'contingency', 'other') DEFAULT 'other',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES budget_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Project Budgets
CREATE TABLE project_budgets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    project_id BIGINT UNSIGNED NOT NULL,
    fiscal_year INT,
    total_budget DECIMAL(18,2) DEFAULT 0,
    approved_budget DECIMAL(18,2) DEFAULT 0,
    committed DECIMAL(18,2) DEFAULT 0,
    actual_spent DECIMAL(18,2) DEFAULT 0,
    remaining DECIMAL(18,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('draft', 'pending_approval', 'approved', 'locked') DEFAULT 'draft',
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Budget Line Items
CREATE TABLE budget_line_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED,
    description VARCHAR(500) NOT NULL,
    planned_amount DECIMAL(18,2) DEFAULT 0,
    committed_amount DECIMAL(18,2) DEFAULT 0,
    actual_amount DECIMAL(18,2) DEFAULT 0,
    variance DECIMAL(18,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_budget (budget_id),
    INDEX idx_category (category_id),
    FOREIGN KEY (budget_id) REFERENCES project_budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Expenses
CREATE TABLE expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    task_id BIGINT UNSIGNED,
    budget_category_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED NOT NULL,
    
    expense_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    
    expense_type ENUM('material', 'travel', 'equipment', 'service', 'other') DEFAULT 'other',
    vendor VARCHAR(255),
    receipt_url VARCHAR(500),
    
    is_billable BOOLEAN DEFAULT FALSE,
    is_reimbursable BOOLEAN DEFAULT FALSE,
    
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'paid') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_user (user_id),
    INDEX idx_date (expense_date),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (budget_category_id) REFERENCES budget_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Earned Value Management
CREATE TABLE earned_value_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    snapshot_date DATE NOT NULL,
    
    -- Planned Values
    planned_value DECIMAL(18,2), -- PV (BCWS)
    
    -- Earned Values
    earned_value DECIMAL(18,2), -- EV (BCWP)
    
    -- Actual Cost
    actual_cost DECIMAL(18,2), -- AC (ACWP)
    
    -- Budget
    budget_at_completion DECIMAL(18,2), -- BAC
    
    -- Variances
    schedule_variance DECIMAL(18,2), -- SV = EV - PV
    cost_variance DECIMAL(18,2), -- CV = EV - AC
    
    -- Indices
    schedule_performance_index DECIMAL(8,4), -- SPI = EV / PV
    cost_performance_index DECIMAL(8,4), -- CPI = EV / AC
    
    -- Forecasts
    estimate_at_completion DECIMAL(18,2), -- EAC
    estimate_to_complete DECIMAL(18,2), -- ETC
    variance_at_completion DECIMAL(18,2), -- VAC = BAC - EAC
    to_complete_performance_index DECIMAL(8,4), -- TCPI
    
    -- Progress
    percent_complete DECIMAL(5,2),
    percent_spent DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_project_date (project_id, snapshot_date),
    INDEX idx_project (project_id),
    INDEX idx_date (snapshot_date),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 10: RISK, ISSUE & CHANGE MANAGEMENT
-- =====================================================

-- Risks
CREATE TABLE risks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    risk_number INT UNSIGNED NOT NULL,
    risk_key VARCHAR(30) NOT NULL,
    
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    source VARCHAR(100),
    
    -- Assessment
    probability ENUM('very_low', 'low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    probability_score INT DEFAULT 3, -- 1-5
    impact ENUM('negligible', 'minor', 'moderate', 'major', 'severe') DEFAULT 'moderate',
    impact_score INT DEFAULT 3, -- 1-5
    risk_score INT DEFAULT 9, -- probability_score * impact_score
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Impact Areas
    schedule_impact TEXT,
    cost_impact DECIMAL(18,2),
    quality_impact TEXT,
    scope_impact TEXT,
    
    -- Response
    response_strategy ENUM('avoid', 'mitigate', 'transfer', 'accept', 'exploit', 'share', 'enhance') DEFAULT 'mitigate',
    mitigation_plan TEXT,
    contingency_plan TEXT,
    trigger_conditions TEXT,
    
    -- Ownership
    owner_id BIGINT UNSIGNED,
    identified_by BIGINT UNSIGNED,
    
    -- Status
    status ENUM('identified', 'analyzing', 'planning', 'monitoring', 'occurred', 'closed') DEFAULT 'identified',
    
    -- Dates
    identified_date DATE,
    due_date DATE,
    closed_date DATE,
    
    -- Residual Risk
    residual_probability INT,
    residual_impact INT,
    residual_score INT,
    
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_project_key (project_id, risk_key),
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_level (risk_level),
    INDEX idx_owner (owner_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (identified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Issues
CREATE TABLE issues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    task_id BIGINT UNSIGNED,
    risk_id BIGINT UNSIGNED, -- If issue arose from a risk
    issue_number INT UNSIGNED NOT NULL,
    issue_key VARCHAR(30) NOT NULL,
    
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    root_cause TEXT,
    
    -- Severity
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    severity ENUM('blocker', 'critical', 'major', 'minor', 'trivial') DEFAULT 'major',
    
    -- Impact
    impact_description TEXT,
    schedule_impact_days INT,
    cost_impact DECIMAL(18,2),
    
    -- Resolution
    resolution_plan TEXT,
    resolution_notes TEXT,
    workaround TEXT,
    
    -- Ownership
    owner_id BIGINT UNSIGNED,
    reported_by BIGINT UNSIGNED,
    assigned_to BIGINT UNSIGNED,
    
    -- Status
    status ENUM('open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated') DEFAULT 'open',
    
    -- Dates
    reported_date DATE,
    target_resolution_date DATE,
    actual_resolution_date DATE,
    
    -- Escalation
    escalation_level INT DEFAULT 0,
    escalated_to BIGINT UNSIGNED,
    escalated_at TIMESTAMP NULL,
    
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_project_key (project_id, issue_key),
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_owner (owner_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (escalated_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Change Requests
CREATE TABLE change_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    change_number INT UNSIGNED NOT NULL,
    change_key VARCHAR(30) NOT NULL,
    
    title VARCHAR(500) NOT NULL,
    description TEXT,
    justification TEXT,
    category ENUM('scope', 'schedule', 'cost', 'quality', 'resource', 'risk', 'other') DEFAULT 'scope',
    
    -- Request Details
    current_state TEXT,
    proposed_change TEXT,
    benefits TEXT,
    
    -- Impact Analysis
    scope_impact TEXT,
    schedule_impact_days INT,
    cost_impact DECIMAL(18,2),
    risk_impact TEXT,
    quality_impact TEXT,
    resource_impact TEXT,
    
    -- Priority
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    urgency ENUM('immediate', 'urgent', 'normal', 'low') DEFAULT 'normal',
    
    -- Ownership
    requested_by BIGINT UNSIGNED,
    assigned_to BIGINT UNSIGNED,
    
    -- Status
    status ENUM('draft', 'submitted', 'under_review', 'impact_analysis', 'pending_approval', 'approved', 'rejected', 'implemented', 'closed', 'withdrawn') DEFAULT 'draft',
    
    -- Dates
    submitted_date DATE,
    target_decision_date DATE,
    decision_date DATE,
    implementation_date DATE,
    
    -- Approval
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    approval_notes TEXT,
    
    -- Implementation
    implementation_plan TEXT,
    implementation_notes TEXT,
    
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_project_key (project_id, change_key),
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 11: QUALITY MANAGEMENT
-- =====================================================

-- Test Plans
CREATE TABLE test_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    release_id BIGINT UNSIGNED,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT,
    scope TEXT,
    test_strategy TEXT,
    entry_criteria TEXT,
    exit_criteria TEXT,
    environment_requirements TEXT,
    status ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft',
    owner_id BIGINT UNSIGNED,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Test Cases
CREATE TABLE test_cases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    test_plan_id BIGINT UNSIGNED,
    task_id BIGINT UNSIGNED, -- Linked requirement/story
    
    test_case_number INT UNSIGNED NOT NULL,
    test_case_key VARCHAR(30) NOT NULL,
    
    title VARCHAR(500) NOT NULL,
    description TEXT,
    preconditions TEXT,
    test_steps JSON, -- [{step: 1, action: "", expected: ""}]
    expected_result TEXT,
    
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    test_type ENUM('functional', 'integration', 'regression', 'performance', 'security', 'usability', 'acceptance') DEFAULT 'functional',
    automation_status ENUM('not_automated', 'automated', 'cannot_automate') DEFAULT 'not_automated',
    
    status ENUM('draft', 'ready', 'deprecated') DEFAULT 'draft',
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_project_key (project_id, test_case_key),
    INDEX idx_project (project_id),
    INDEX idx_test_plan (test_plan_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (test_plan_id) REFERENCES test_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Test Cycles
CREATE TABLE test_cycles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    test_plan_id BIGINT UNSIGNED,
    sprint_id BIGINT UNSIGNED,
    release_id BIGINT UNSIGNED,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
    
    -- Metrics
    total_tests INT DEFAULT 0,
    passed_tests INT DEFAULT 0,
    failed_tests INT DEFAULT 0,
    blocked_tests INT DEFAULT 0,
    not_executed INT DEFAULT 0,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (test_plan_id) REFERENCES test_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Test Executions
CREATE TABLE test_executions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_cycle_id BIGINT UNSIGNED NOT NULL,
    test_case_id BIGINT UNSIGNED NOT NULL,
    executed_by BIGINT UNSIGNED,
    
    status ENUM('not_executed', 'in_progress', 'passed', 'failed', 'blocked', 'skipped') DEFAULT 'not_executed',
    
    execution_date DATETIME,
    duration_seconds INT,
    
    actual_result TEXT,
    notes TEXT,
    
    environment VARCHAR(100),
    build_version VARCHAR(50),
    
    defect_ids JSON, -- Links to bugs found
    attachments JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cycle (test_cycle_id),
    INDEX idx_test_case (test_case_id),
    INDEX idx_status (status),
    FOREIGN KEY (test_cycle_id) REFERENCES test_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 12: DOCUMENT MANAGEMENT
-- =====================================================

-- Folders
CREATE TABLE folders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    parent_id BIGINT UNSIGNED,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1000),
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Documents
CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    folder_id BIGINT UNSIGNED,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    file_size BIGINT,
    file_path VARCHAR(1000),
    storage_provider VARCHAR(50) DEFAULT 'local',
    
    current_version INT DEFAULT 1,
    
    -- Access Control
    visibility ENUM('private', 'project', 'public') DEFAULT 'project',
    
    -- Status
    status ENUM('draft', 'in_review', 'approved', 'archived') DEFAULT 'draft',
    
    -- Metadata
    tags JSON,
    custom_metadata JSON,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_folder (folder_id),
    INDEX idx_type (file_type),
    FULLTEXT idx_search (name, description),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Document Versions
CREATE TABLE document_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(1000),
    file_size BIGINT,
    change_summary TEXT,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doc_version (document_id, version_number),
    INDEX idx_document (document_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Wiki Pages
CREATE TABLE wiki_pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    parent_id BIGINT UNSIGNED,
    
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content LONGTEXT,
    
    order_index INT DEFAULT 0,
    
    is_home BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    
    created_by BIGINT UNSIGNED,
    last_edited_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_parent (parent_id),
    INDEX idx_slug (slug),
    FULLTEXT idx_search (title, content),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES wiki_pages(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 13: COLLABORATION & COMMUNICATION
-- =====================================================

-- Comments (Polymorphic)
CREATE TABLE comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    
    -- Polymorphic relation
    commentable_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'risk', 'issue', etc.
    commentable_id BIGINT UNSIGNED NOT NULL,
    
    parent_id BIGINT UNSIGNED, -- For replies
    
    content TEXT NOT NULL,
    content_html TEXT,
    
    -- Mentions
    mentions JSON, -- [{user_id: 1, offset: 10, length: 15}]
    
    -- Attachments
    attachments JSON,
    
    -- Reactions
    reactions JSON,
    
    is_internal BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    edited_at TIMESTAMP NULL,
    
    author_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_commentable (commentable_type, commentable_id),
    INDEX idx_parent (parent_id),
    INDEX idx_author (author_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    
    -- Data
    data JSON,
    
    -- Channels
    channels JSON DEFAULT '["in_app"]', -- ['in_app', 'email', 'push', 'slack']
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Delivery
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_push BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Activity Feed
CREATE TABLE activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    
    action VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Subject (what performed the action)
    subject_type VARCHAR(50),
    subject_id BIGINT UNSIGNED,
    
    -- Object (what was acted upon)
    object_type VARCHAR(50),
    object_id BIGINT UNSIGNED,
    object_name VARCHAR(255),
    
    -- Details
    changes JSON,
    metadata JSON,
    
    is_system BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_subject (subject_type, subject_id),
    INDEX idx_object (object_type, object_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 15: WORKFLOW ENGINE
-- =====================================================

-- Workflow Definitions
CREATE TABLE workflow_definitions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'timesheet', 'expense', 'change_request'
    
    -- Workflow Configuration
    states JSON NOT NULL, -- [{name: "draft", is_initial: true, is_final: false}]
    transitions JSON NOT NULL, -- [{from: "draft", to: "submitted", conditions: [], actions: []}]
    
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    version INT DEFAULT 1,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_entity (entity_type),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Approval Requests
CREATE TABLE approval_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    workflow_id BIGINT UNSIGNED,
    
    -- Entity being approved
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    
    -- Request Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Requester
    requested_by BIGINT UNSIGNED NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Current State
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'expired') DEFAULT 'pending',
    current_step INT DEFAULT 1,
    
    -- Approval Chain
    approval_chain JSON, -- [{step: 1, approvers: [1,2], type: "any|all", deadline: ""}]
    
    -- Decision
    decided_by BIGINT UNSIGNED,
    decided_at TIMESTAMP NULL,
    decision_notes TEXT,
    
    -- Deadlines
    deadline TIMESTAMP NULL,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (status),
    INDEX idx_requester (requested_by),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Approval Steps
CREATE TABLE approval_steps (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    approval_request_id BIGINT UNSIGNED NOT NULL,
    step_number INT NOT NULL,
    approver_id BIGINT UNSIGNED NOT NULL,
    
    status ENUM('pending', 'approved', 'rejected', 'delegated', 'expired') DEFAULT 'pending',
    
    decision_at TIMESTAMP NULL,
    comments TEXT,
    
    delegated_to BIGINT UNSIGNED,
    delegated_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_request (approval_request_id),
    INDEX idx_approver (approver_id),
    INDEX idx_status (status),
    FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (delegated_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Automation Rules
CREATE TABLE automation_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Trigger
    trigger_type VARCHAR(50) NOT NULL, -- 'event', 'schedule', 'condition'
    trigger_event VARCHAR(100), -- 'task.created', 'task.status_changed'
    trigger_schedule VARCHAR(100), -- Cron expression
    trigger_conditions JSON,
    
    -- Actions
    actions JSON NOT NULL, -- [{type: "update_field", config: {}}]
    
    is_active BOOLEAN DEFAULT TRUE,
    execution_count INT DEFAULT 0,
    last_executed_at TIMESTAMP NULL,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    INDEX idx_trigger (trigger_type, trigger_event),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 16: INTEGRATION HUB
-- =====================================================

-- Integrations
CREATE TABLE integrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    
    provider VARCHAR(50) NOT NULL, -- 'slack', 'teams', 'jira', 'github'
    name VARCHAR(255) NOT NULL,
    
    -- Configuration
    config JSON,
    credentials JSON, -- Encrypted
    
    -- OAuth
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP NULL,
    last_error TEXT,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_provider (provider),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Webhooks
CREATE TABLE webhooks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    secret VARCHAR(255),
    
    events JSON NOT NULL, -- ['task.created', 'task.updated']
    
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Headers
    headers JSON,
    
    -- Retry Configuration
    max_retries INT DEFAULT 3,
    retry_delay_seconds INT DEFAULT 60,
    
    -- Stats
    total_deliveries INT DEFAULT 0,
    successful_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    last_delivery_at TIMESTAMP NULL,
    last_response_code INT,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Webhook Deliveries
CREATE TABLE webhook_deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    webhook_id BIGINT UNSIGNED NOT NULL,
    
    event VARCHAR(100) NOT NULL,
    payload JSON,
    
    -- Request
    request_headers JSON,
    
    -- Response
    response_code INT,
    response_body TEXT,
    response_time_ms INT,
    
    -- Status
    status ENUM('pending', 'success', 'failed', 'retrying') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    
    delivered_at TIMESTAMP NULL,
    next_retry_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_webhook (webhook_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 14: REPORTING & ANALYTICS (Saved Reports)
-- =====================================================

-- Saved Reports
CREATE TABLE saved_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    
    -- Configuration
    config JSON NOT NULL, -- Filters, groupings, columns, etc.
    
    -- Sharing
    visibility ENUM('private', 'team', 'project', 'organization') DEFAULT 'private',
    shared_with JSON, -- User IDs or team IDs
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule VARCHAR(100), -- Cron expression
    recipients JSON,
    last_generated_at TIMESTAMP NULL,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_type (report_type),
    INDEX idx_creator (created_by),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Dashboard Widgets
CREATE TABLE dashboard_widgets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED,
    project_id BIGINT UNSIGNED,
    
    dashboard_type ENUM('personal', 'project', 'portfolio', 'executive') DEFAULT 'personal',
    
    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    
    -- Position & Size
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 4,
    height INT DEFAULT 2,
    
    -- Configuration
    config JSON,
    
    is_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default Permissions
INSERT INTO permissions (name, slug, module, category) VALUES
-- Project
('View Projects', 'project.view', 'project', 'read'),
('Create Projects', 'project.create', 'project', 'write'),
('Edit Projects', 'project.edit', 'project', 'write'),
('Delete Projects', 'project.delete', 'project', 'delete'),
('Archive Projects', 'project.archive', 'project', 'write'),
('Manage Project Team', 'project.manage_team', 'project', 'admin'),
('Manage Project Settings', 'project.manage_settings', 'project', 'admin'),

-- Portfolio
('View Portfolios', 'portfolio.view', 'portfolio', 'read'),
('Create Portfolios', 'portfolio.create', 'portfolio', 'write'),
('Edit Portfolios', 'portfolio.edit', 'portfolio', 'write'),
('Delete Portfolios', 'portfolio.delete', 'portfolio', 'delete'),

-- Task
('View Tasks', 'task.view', 'task', 'read'),
('Create Tasks', 'task.create', 'task', 'write'),
('Edit Tasks', 'task.edit', 'task', 'write'),
('Delete Tasks', 'task.delete', 'task', 'delete'),
('Assign Tasks', 'task.assign', 'task', 'write'),
('Change Task Status', 'task.change_status', 'task', 'write'),

-- Sprint
('View Sprints', 'sprint.view', 'sprint', 'read'),
('Create Sprints', 'sprint.create', 'sprint', 'write'),
('Edit Sprints', 'sprint.edit', 'sprint', 'write'),
('Delete Sprints', 'sprint.delete', 'sprint', 'delete'),
('Start Sprints', 'sprint.start', 'sprint', 'write'),
('Complete Sprints', 'sprint.complete', 'sprint', 'write'),

-- Resource
('View Resources', 'resource.view', 'resource', 'read'),
('Manage Resources', 'resource.manage', 'resource', 'admin'),
('Allocate Resources', 'resource.allocate', 'resource', 'write'),

-- Time
('Log Time', 'time.log', 'time', 'write'),
('View Own Time', 'time.view_own', 'time', 'read'),
('View Team Time', 'time.view_team', 'time', 'read'),
('View All Time', 'time.view_all', 'time', 'read'),
('Approve Timesheets', 'time.approve', 'time', 'admin'),

-- Finance
('View Budgets', 'finance.view_budget', 'finance', 'read'),
('Manage Budgets', 'finance.manage_budget', 'finance', 'admin'),
('View Costs', 'finance.view_costs', 'finance', 'read'),
('Manage Costs', 'finance.manage_costs', 'finance', 'write'),
('Approve Expenses', 'finance.approve_expenses', 'finance', 'admin'),

-- Risk
('View Risks', 'risk.view', 'risk', 'read'),
('Create Risks', 'risk.create', 'risk', 'write'),
('Edit Risks', 'risk.edit', 'risk', 'write'),
('Delete Risks', 'risk.delete', 'risk', 'delete'),

-- Document
('View Documents', 'document.view', 'document', 'read'),
('Upload Documents', 'document.upload', 'document', 'write'),
('Edit Documents', 'document.edit', 'document', 'write'),
('Delete Documents', 'document.delete', 'document', 'delete'),
('Approve Documents', 'document.approve', 'document', 'admin'),

-- Report
('View Reports', 'report.view', 'report', 'read'),
('Create Reports', 'report.create', 'report', 'write'),
('Export Reports', 'report.export', 'report', 'read'),

-- Admin
('Manage Users', 'admin.users', 'admin', 'admin'),
('Manage Roles', 'admin.roles', 'admin', 'admin'),
('Manage Settings', 'admin.settings', 'admin', 'admin'),
('View Audit Logs', 'admin.audit', 'admin', 'admin'),
('Manage Integrations', 'admin.integrations', 'admin', 'admin');

-- Default System Roles
INSERT INTO roles (uuid, tenant_id, name, slug, description, is_system, level) VALUES
(UUID(), NULL, 'Super Admin', 'super_admin', 'Full system access', TRUE, 100),
(UUID(), NULL, 'Tenant Admin', 'tenant_admin', 'Tenant-level administration', TRUE, 90),
(UUID(), NULL, 'Portfolio Manager', 'portfolio_manager', 'Portfolio oversight', TRUE, 80),
(UUID(), NULL, 'Program Manager', 'program_manager', 'Program management', TRUE, 75),
(UUID(), NULL, 'Project Manager', 'project_manager', 'Project management', TRUE, 70),
(UUID(), NULL, 'Scrum Master', 'scrum_master', 'Agile facilitation', TRUE, 60),
(UUID(), NULL, 'Product Owner', 'product_owner', 'Backlog management', TRUE, 60),
(UUID(), NULL, 'Team Lead', 'team_lead', 'Team coordination', TRUE, 50),
(UUID(), NULL, 'Team Member', 'team_member', 'Task execution', TRUE, 40),
(UUID(), NULL, 'Resource Manager', 'resource_manager', 'Resource allocation', TRUE, 65),
(UUID(), NULL, 'Finance Manager', 'finance_manager', 'Financial oversight', TRUE, 65),
(UUID(), NULL, 'QA Manager', 'qa_manager', 'Quality assurance', TRUE, 55),
(UUID(), NULL, 'Stakeholder', 'stakeholder', 'View-only access', TRUE, 20),
(UUID(), NULL, 'External Client', 'external_client', 'Limited portal access', TRUE, 10),
(UUID(), NULL, 'Auditor', 'auditor', 'Audit access', TRUE, 85);

-- Default Task Types
-- (To be inserted per tenant)

-- Default Task Statuses
-- (To be inserted per tenant)

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Project Summary View
CREATE OR REPLACE VIEW v_project_summary AS
SELECT 
    p.id,
    p.uuid,
    p.tenant_id,
    p.code,
    p.name,
    p.status,
    p.health,
    p.methodology,
    p.priority,
    p.planned_start_date,
    p.planned_end_date,
    p.actual_start_date,
    p.actual_end_date,
    p.budget,
    p.actual_cost,
    p.progress_percentage,
    pm.first_name AS manager_first_name,
    pm.last_name AS manager_last_name,
    po.name AS portfolio_name,
    pr.name AS program_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done' AND t.deleted_at IS NULL) AS completed_tasks,
    (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.is_active = TRUE) AS team_size,
    (SELECT COUNT(*) FROM risks r WHERE r.project_id = p.id AND r.status NOT IN ('closed')) AS open_risks,
    (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id AND i.status NOT IN ('closed', 'resolved')) AS open_issues
FROM projects p
LEFT JOIN users pm ON p.manager_id = pm.id
LEFT JOIN portfolios po ON p.portfolio_id = po.id
LEFT JOIN programs pr ON p.program_id = pr.id
WHERE p.deleted_at IS NULL;

-- Task Summary View
CREATE OR REPLACE VIEW v_task_summary AS
SELECT 
    t.id,
    t.uuid,
    t.tenant_id,
    t.project_id,
    t.sprint_id,
    t.task_key,
    t.title,
    t.type,
    t.status,
    t.priority,
    t.story_points,
    t.estimated_hours,
    t.actual_hours,
    t.due_date,
    t.progress_percentage,
    p.name AS project_name,
    p.code AS project_code,
    s.name AS sprint_name,
    a.first_name AS assignee_first_name,
    a.last_name AS assignee_last_name,
    r.first_name AS reporter_first_name,
    r.last_name AS reporter_last_name,
    parent.task_key AS parent_key
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN sprints s ON t.sprint_id = s.id
LEFT JOIN users a ON t.assignee_id = a.id
LEFT JOIN users r ON t.reporter_id = r.id
LEFT JOIN tasks parent ON t.parent_id = parent.id
WHERE t.deleted_at IS NULL;

-- Sprint Metrics View
CREATE OR REPLACE VIEW v_sprint_metrics AS
SELECT 
    s.id,
    s.uuid,
    s.tenant_id,
    s.project_id,
    s.name,
    s.status,
    s.start_date,
    s.end_date,
    s.capacity_points,
    s.committed_points,
    s.completed_points,
    s.velocity,
    p.name AS project_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) AS completed_tasks,
    (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) AS total_points,
    (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) AS points_completed
FROM sprints s
LEFT JOIN projects p ON s.project_id = p.id;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status, deleted_at);
CREATE INDEX idx_tasks_assignee_status ON tasks(assignee_id, status, deleted_at);
CREATE INDEX idx_tasks_sprint_status ON tasks(sprint_id, status, deleted_at);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, date, deleted_at);
CREATE INDEX idx_activities_tenant_created ON activities(tenant_id, created_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);

-- =====================================================
-- END OF SCHEMA
-- =====================================================

SELECT 'EPMS Database Schema Created Successfully!' AS Status;
