-- =====================================================
-- EPMS Migration Script - Proper Order
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables if any
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhooks;
DROP TABLE IF EXISTS integrations;
DROP TABLE IF EXISTS automation_rules;
DROP TABLE IF EXISTS approval_steps;
DROP TABLE IF EXISTS approval_requests;
DROP TABLE IF EXISTS workflow_definitions;
DROP TABLE IF EXISTS dashboard_widgets;
DROP TABLE IF EXISTS saved_reports;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS wiki_pages;
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS test_executions;
DROP TABLE IF EXISTS test_cycles;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS test_plans;
DROP TABLE IF EXISTS change_requests;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS risks;
DROP TABLE IF EXISTS earned_value_snapshots;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS budget_line_items;
DROP TABLE IF EXISTS project_budgets;
DROP TABLE IF EXISTS budget_categories;
DROP TABLE IF EXISTS timesheets;
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS resource_allocations;
DROP TABLE IF EXISTS resource_exceptions;
DROP TABLE IF EXISTS resource_calendars;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS releases;
DROP TABLE IF EXISTS sprint_burndown;
DROP TABLE IF EXISTS sprints;
DROP TABLE IF EXISTS task_history;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS task_checklists;
DROP TABLE IF EXISTS task_watchers;
DROP TABLE IF EXISTS task_labels;
DROP TABLE IF EXISTS task_dependencies;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS task_types;
DROP TABLE IF EXISTS task_statuses;
DROP TABLE IF EXISTS project_goals;
DROP TABLE IF EXISTS project_phases;
DROP TABLE IF EXISTS project_dependencies;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS project_templates;
DROP TABLE IF EXISTS programs;
DROP TABLE IF EXISTS portfolios;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_auth_providers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS tenants;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- MODULE 01: CORE PLATFORM
-- =====================================================

CREATE TABLE tenants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    subscription_plan ENUM('free', 'starter', 'professional', 'enterprise') DEFAULT 'free',
    subscription_status ENUM('active', 'trial', 'suspended', 'cancelled') DEFAULT 'trial',
    settings JSON,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 02: IDENTITY & ACCESS
-- =====================================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    job_title VARCHAR(100),
    department VARCHAR(100),
    status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_tenant_email (tenant_id, email),
    INDEX idx_tenant (tenant_id),
    INDEX idx_email (email),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    level INT DEFAULT 0,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tenant_slug (tenant_id, slug),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    scope_type ENUM('global', 'portfolio', 'program', 'project') DEFAULT 'global',
    scope_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role_scope (user_id, role_id, scope_type, scope_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE teams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    lead_id BIGINT UNSIGNED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE team_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM('member', 'lead', 'admin') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_team_user (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 03: PORTFOLIO & PROJECT
-- =====================================================

CREATE TABLE portfolios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT UNSIGNED,
    status ENUM('active', 'on_hold', 'completed', 'cancelled') DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE programs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    portfolio_id BIGINT UNSIGNED,
    code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id BIGINT UNSIGNED,
    status ENUM('initiation', 'planning', 'execution', 'closure', 'on_hold') DEFAULT 'initiation',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(18,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    portfolio_id BIGINT UNSIGNED,
    program_id BIGINT UNSIGNED,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    methodology ENUM('agile', 'waterfall', 'hybrid', 'kanban') DEFAULT 'agile',
    category VARCHAR(100),
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    status ENUM('draft', 'planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'draft',
    health ENUM('on_track', 'at_risk', 'off_track', 'not_started') DEFAULT 'not_started',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    owner_id BIGINT UNSIGNED,
    manager_id BIGINT UNSIGNED,
    budget DECIMAL(18,2) DEFAULT 0,
    actual_cost DECIMAL(18,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    settings JSON,
    custom_fields JSON,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_tenant_code (tenant_id, code),
    INDEX idx_status (status),
    INDEX idx_health (health),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE project_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_name VARCHAR(100),
    allocation_percentage DECIMAL(5,2) DEFAULT 100,
    hourly_rate DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_user (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 06: AGILE (Sprints first, before tasks)
-- =====================================================

CREATE TABLE sprints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    capacity_points DECIMAL(8,2),
    capacity_hours DECIMAL(10,2),
    committed_points DECIMAL(8,2) DEFAULT 0,
    completed_points DECIMAL(8,2) DEFAULT 0,
    velocity DECIMAL(8,2),
    retrospective_notes TEXT,
    order_index INT DEFAULT 0,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 04: TASKS
-- =====================================================

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
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE labels (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    sprint_id BIGINT UNSIGNED,
    phase_id BIGINT UNSIGNED,
    parent_id BIGINT UNSIGNED,
    task_number INT UNSIGNED NOT NULL,
    task_key VARCHAR(30) NOT NULL,
    type ENUM('epic', 'feature', 'story', 'task', 'subtask', 'bug', 'improvement') DEFAULT 'task',
    title VARCHAR(500) NOT NULL,
    description LONGTEXT,
    acceptance_criteria TEXT,
    status VARCHAR(50) DEFAULT 'to_do',
    priority ENUM('critical', 'high', 'medium', 'low', 'none') DEFAULT 'medium',
    severity ENUM('blocker', 'critical', 'major', 'minor', 'trivial') NULL,
    assignee_id BIGINT UNSIGNED,
    reporter_id BIGINT UNSIGNED,
    story_points DECIMAL(5,2),
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2) DEFAULT 0,
    remaining_hours DECIMAL(8,2),
    planned_start_date DATE,
    planned_end_date DATE,
    due_date DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    wbs_code VARCHAR(50),
    board_column VARCHAR(50),
    board_position INT DEFAULT 0,
    custom_fields JSON,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_project_key (project_id, task_key),
    INDEX idx_project (project_id),
    INDEX idx_sprint (sprint_id),
    INDEX idx_status (status),
    INDEX idx_assignee (assignee_id),
    INDEX idx_type (type),
    FULLTEXT idx_search (title, description),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE task_dependencies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    predecessor_id BIGINT UNSIGNED NOT NULL,
    successor_id BIGINT UNSIGNED NOT NULL,
    dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
    lag_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dependency (predecessor_id, successor_id),
    FOREIGN KEY (predecessor_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (successor_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_labels (
    task_id BIGINT UNSIGNED NOT NULL,
    label_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_watchers (
    task_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_checklists (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE checklist_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    checklist_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(500) NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES task_checklists(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task (task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 07: RESOURCE MANAGEMENT
-- =====================================================

CREATE TABLE skills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_skills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    skill_id BIGINT UNSIGNED NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_skill (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
    status ENUM('tentative', 'confirmed', 'cancelled') DEFAULT 'tentative',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 08: TIME TRACKING
-- =====================================================

CREATE TABLE time_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    task_id BIGINT UNSIGNED,
    date DATE NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INT NOT NULL,
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    billable_amount DECIMAL(12,2),
    hourly_rate DECIMAL(10,2),
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, date),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    approved_by BIGINT UNSIGNED,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 09: FINANCIAL
-- =====================================================

CREATE TABLE budget_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    category_type ENUM('labor', 'materials', 'equipment', 'services', 'travel', 'overhead', 'other') DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE project_budgets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    project_id BIGINT UNSIGNED NOT NULL,
    fiscal_year INT,
    total_budget DECIMAL(18,2) DEFAULT 0,
    committed DECIMAL(18,2) DEFAULT 0,
    actual_spent DECIMAL(18,2) DEFAULT 0,
    remaining DECIMAL(18,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('draft', 'approved', 'locked') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    task_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED NOT NULL,
    expense_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    expense_type ENUM('material', 'travel', 'equipment', 'service', 'other') DEFAULT 'other',
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'paid') DEFAULT 'draft',
    approved_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 10: RISK, ISSUE, CHANGE
-- =====================================================

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
    probability ENUM('very_low', 'low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    probability_score INT DEFAULT 3,
    impact ENUM('negligible', 'minor', 'moderate', 'major', 'severe') DEFAULT 'moderate',
    impact_score INT DEFAULT 3,
    risk_score INT DEFAULT 9,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    response_strategy ENUM('avoid', 'mitigate', 'transfer', 'accept') DEFAULT 'mitigate',
    mitigation_plan TEXT,
    owner_id BIGINT UNSIGNED,
    status ENUM('identified', 'analyzing', 'monitoring', 'occurred', 'closed') DEFAULT 'identified',
    identified_date DATE,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_key (project_id, risk_key),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE issues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    task_id BIGINT UNSIGNED,
    issue_number INT UNSIGNED NOT NULL,
    issue_key VARCHAR(30) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    severity ENUM('blocker', 'critical', 'major', 'minor', 'trivial') DEFAULT 'major',
    resolution_plan TEXT,
    owner_id BIGINT UNSIGNED,
    assigned_to BIGINT UNSIGNED,
    status ENUM('open', 'in_progress', 'pending', 'resolved', 'closed') DEFAULT 'open',
    reported_date DATE,
    target_resolution_date DATE,
    actual_resolution_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_key (project_id, issue_key),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
    category ENUM('scope', 'schedule', 'cost', 'quality', 'resource', 'other') DEFAULT 'scope',
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    requested_by BIGINT UNSIGNED,
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented', 'closed') DEFAULT 'draft',
    submitted_date DATE,
    decision_date DATE,
    approved_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_key (project_id, change_key),
    INDEX idx_project (project_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 12: DOCUMENTS
-- =====================================================

CREATE TABLE folders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    parent_id BIGINT UNSIGNED,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
    current_version INT DEFAULT 1,
    status ENUM('draft', 'approved', 'archived') DEFAULT 'draft',
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 13: COLLABORATION
-- =====================================================

CREATE TABLE comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    commentable_type VARCHAR(50) NOT NULL,
    commentable_id BIGINT UNSIGNED NOT NULL,
    parent_id BIGINT UNSIGNED,
    content TEXT NOT NULL,
    mentions JSON,
    author_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_commentable (commentable_type, commentable_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_read (user_id, is_read),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    object_type VARCHAR(50),
    object_id BIGINT UNSIGNED,
    object_name VARCHAR(255),
    changes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 15: WORKFLOW
-- =====================================================

CREATE TABLE workflow_definitions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50) NOT NULL,
    states JSON NOT NULL,
    transitions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE approval_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requested_by BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approval_chain JSON,
    decided_by BIGINT UNSIGNED,
    decided_at TIMESTAMP NULL,
    decision_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 16: INTEGRATIONS
-- =====================================================

CREATE TABLE integrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE webhooks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    secret VARCHAR(255),
    events JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- MODULE 14: REPORTING
-- =====================================================

CREATE TABLE saved_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    config JSON NOT NULL,
    visibility ENUM('private', 'team', 'project', 'organization') DEFAULT 'private',
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule VARCHAR(100),
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE dashboard_widgets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED,
    project_id BIGINT UNSIGNED,
    dashboard_type ENUM('personal', 'project', 'portfolio', 'executive') DEFAULT 'personal',
    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 4,
    height INT DEFAULT 2,
    config JSON,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT UNSIGNED,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_entity (entity_type, entity_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default Permissions
INSERT INTO permissions (name, slug, module, category) VALUES
('View Projects', 'project.view', 'project', 'read'),
('Create Projects', 'project.create', 'project', 'write'),
('Edit Projects', 'project.edit', 'project', 'write'),
('Delete Projects', 'project.delete', 'project', 'delete'),
('View Tasks', 'task.view', 'task', 'read'),
('Create Tasks', 'task.create', 'task', 'write'),
('Edit Tasks', 'task.edit', 'task', 'write'),
('Delete Tasks', 'task.delete', 'task', 'delete'),
('View Sprints', 'sprint.view', 'sprint', 'read'),
('Create Sprints', 'sprint.create', 'sprint', 'write'),
('Edit Sprints', 'sprint.edit', 'sprint', 'write'),
('Delete Sprints', 'sprint.delete', 'sprint', 'delete'),
('Log Time', 'time.log', 'time', 'write'),
('View Time', 'time.view', 'time', 'read'),
('Approve Time', 'time.approve', 'time', 'admin'),
('View Budgets', 'finance.view', 'finance', 'read'),
('Manage Budgets', 'finance.manage', 'finance', 'admin'),
('View Risks', 'risk.view', 'risk', 'read'),
('Manage Risks', 'risk.manage', 'risk', 'write'),
('View Documents', 'document.view', 'document', 'read'),
('Manage Documents', 'document.manage', 'document', 'write'),
('View Reports', 'report.view', 'report', 'read'),
('Create Reports', 'report.create', 'report', 'write'),
('Manage Users', 'admin.users', 'admin', 'admin'),
('Manage Roles', 'admin.roles', 'admin', 'admin'),
('Manage Settings', 'admin.settings', 'admin', 'admin');

-- Default System Roles
INSERT INTO roles (uuid, tenant_id, name, slug, description, is_system, level, permissions) VALUES
(UUID(), NULL, 'Super Admin', 'super_admin', 'Full system access', TRUE, 100, '["*"]'),
(UUID(), NULL, 'Portfolio Manager', 'portfolio_manager', 'Portfolio oversight', TRUE, 80, '["project.*", "task.*", "sprint.*", "report.*"]'),
(UUID(), NULL, 'Project Manager', 'project_manager', 'Project management', TRUE, 70, '["project.*", "task.*", "sprint.*", "time.*", "risk.*"]'),
(UUID(), NULL, 'Team Lead', 'team_lead', 'Team coordination', TRUE, 50, '["task.*", "sprint.view", "time.*"]'),
(UUID(), NULL, 'Team Member', 'team_member', 'Task execution', TRUE, 40, '["task.view", "task.edit", "time.log", "time.view"]'),
(UUID(), NULL, 'Viewer', 'viewer', 'Read-only access', TRUE, 10, '["project.view", "task.view", "sprint.view"]');

-- Default Tenant
INSERT INTO tenants (uuid, name, slug, subscription_plan, subscription_status, is_active) VALUES
(UUID(), 'Default Organization', 'default', 'enterprise', 'active', TRUE);

-- Get tenant ID
SET @tenant_id = LAST_INSERT_ID();

-- Default Admin User (password: admin123)
INSERT INTO users (uuid, tenant_id, email, password_hash, first_name, last_name, display_name, job_title, status) VALUES
(UUID(), @tenant_id, 'admin@epms.local', '$2b$10$rZJ5CzXsD9HqkxXmXqXqXuXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'System', 'Administrator', 'Admin', 'System Administrator', 'active'),
(UUID(), @tenant_id, 'pm@epms.local', '$2b$10$rZJ5CzXsD9HqkxXmXqXqXuXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'Project', 'Manager', 'PM User', 'Project Manager', 'active'),
(UUID(), @tenant_id, 'dev@epms.local', '$2b$10$rZJ5CzXsD9HqkxXmXqXqXuXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'Developer', 'One', 'Dev1', 'Software Developer', 'active'),
(UUID(), @tenant_id, 'dev2@epms.local', '$2b$10$rZJ5CzXsD9HqkxXmXqXqXuXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'Developer', 'Two', 'Dev2', 'Software Developer', 'active'),
(UUID(), @tenant_id, 'qa@epms.local', '$2b$10$rZJ5CzXsD9HqkxXmXqXqXuXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'QA', 'Engineer', 'QA User', 'QA Engineer', 'active');

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@epms.local' AND r.slug = 'super_admin';
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'pm@epms.local' AND r.slug = 'project_manager';
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'dev@epms.local' AND r.slug = 'team_member';
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'dev2@epms.local' AND r.slug = 'team_member';
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'qa@epms.local' AND r.slug = 'team_member';

-- Sample Portfolio
INSERT INTO portfolios (uuid, tenant_id, code, name, description, status, budget) VALUES
(UUID(), @tenant_id, 'PF-2026', 'Digital Transformation 2026', 'Strategic digital transformation initiatives for 2026', 'active', 5000000.00);

SET @portfolio_id = LAST_INSERT_ID();

-- Sample Program
INSERT INTO programs (uuid, tenant_id, portfolio_id, code, name, description, status, budget) VALUES
(UUID(), @tenant_id, @portfolio_id, 'PRG-001', 'Customer Experience Program', 'Improving customer experience across all channels', 'execution', 2000000.00);

SET @program_id = LAST_INSERT_ID();

-- Get user IDs
SET @pm_id = (SELECT id FROM users WHERE email = 'pm@epms.local');
SET @dev1_id = (SELECT id FROM users WHERE email = 'dev@epms.local');
SET @dev2_id = (SELECT id FROM users WHERE email = 'dev2@epms.local');
SET @qa_id = (SELECT id FROM users WHERE email = 'qa@epms.local');

-- Sample Projects
INSERT INTO projects (uuid, tenant_id, portfolio_id, program_id, code, name, description, methodology, priority, status, health, planned_start_date, planned_end_date, manager_id, budget, progress_percentage) VALUES
(UUID(), @tenant_id, @portfolio_id, @program_id, 'EPMS-001', 'Enterprise Project Management System', 'Build a comprehensive project management platform', 'agile', 'high', 'active', 'on_track', '2026-01-01', '2026-06-30', @pm_id, 500000.00, 35.00),
(UUID(), @tenant_id, @portfolio_id, @program_id, 'CRM-001', 'Customer Portal Redesign', 'Redesign customer-facing portal with modern UX', 'agile', 'high', 'active', 'at_risk', '2026-02-01', '2026-05-31', @pm_id, 300000.00, 20.00),
(UUID(), @tenant_id, @portfolio_id, NULL, 'API-001', 'API Gateway Implementation', 'Implement centralized API gateway', 'kanban', 'medium', 'planning', 'not_started', '2026-03-01', '2026-07-31', @pm_id, 200000.00, 0.00),
(UUID(), @tenant_id, NULL, NULL, 'MOB-001', 'Mobile App Development', 'Native mobile app for iOS and Android', 'agile', 'critical', 'active', 'on_track', '2026-01-15', '2026-08-31', @pm_id, 450000.00, 45.00),
(UUID(), @tenant_id, NULL, NULL, 'SEC-001', 'Security Audit & Compliance', 'Annual security audit and compliance updates', 'waterfall', 'high', 'active', 'on_track', '2026-02-01', '2026-04-30', @pm_id, 100000.00, 60.00);

-- Get project IDs
SET @proj1_id = (SELECT id FROM projects WHERE code = 'EPMS-001');
SET @proj2_id = (SELECT id FROM projects WHERE code = 'CRM-001');
SET @proj3_id = (SELECT id FROM projects WHERE code = 'MOB-001');

-- Add project members
INSERT INTO project_members (project_id, user_id, role_name, allocation_percentage, is_active) VALUES
(@proj1_id, @pm_id, 'Project Manager', 100, TRUE),
(@proj1_id, @dev1_id, 'Senior Developer', 80, TRUE),
(@proj1_id, @dev2_id, 'Developer', 100, TRUE),
(@proj1_id, @qa_id, 'QA Engineer', 50, TRUE),
(@proj2_id, @pm_id, 'Project Manager', 50, TRUE),
(@proj2_id, @dev1_id, 'Developer', 20, TRUE),
(@proj3_id, @pm_id, 'Project Manager', 100, TRUE),
(@proj3_id, @dev2_id, 'Developer', 100, TRUE),
(@proj3_id, @qa_id, 'QA Engineer', 50, TRUE);

-- Sample Sprints
INSERT INTO sprints (uuid, tenant_id, project_id, name, goal, status, start_date, end_date, capacity_points, committed_points, completed_points, velocity, order_index) VALUES
(UUID(), @tenant_id, @proj1_id, 'Sprint 1', 'Core infrastructure setup', 'completed', '2026-01-06', '2026-01-19', 40, 38, 38, 38, 1),
(UUID(), @tenant_id, @proj1_id, 'Sprint 2', 'User authentication & authorization', 'completed', '2026-01-20', '2026-02-02', 40, 42, 40, 40, 2),
(UUID(), @tenant_id, @proj1_id, 'Sprint 3', 'Project & task management', 'active', '2026-02-03', '2026-02-16', 45, 44, 22, NULL, 3),
(UUID(), @tenant_id, @proj1_id, 'Sprint 4', 'Sprint & backlog features', 'planning', '2026-02-17', '2026-03-02', 45, 0, 0, NULL, 4),
(UUID(), @tenant_id, @proj2_id, 'Sprint 1', 'Design system setup', 'completed', '2026-02-03', '2026-02-16', 30, 28, 28, 28, 1),
(UUID(), @tenant_id, @proj2_id, 'Sprint 2', 'Core components', 'active', '2026-02-17', '2026-03-02', 35, 32, 10, NULL, 2),
(UUID(), @tenant_id, @proj3_id, 'Sprint 1', 'App architecture', 'completed', '2026-01-20', '2026-02-02', 35, 35, 35, 35, 1),
(UUID(), @tenant_id, @proj3_id, 'Sprint 2', 'Authentication flow', 'completed', '2026-02-03', '2026-02-16', 38, 36, 36, 36, 2),
(UUID(), @tenant_id, @proj3_id, 'Sprint 3', 'Dashboard screens', 'active', '2026-02-17', '2026-03-02', 40, 38, 20, NULL, 3);

-- Get sprint IDs
SET @sprint1_id = (SELECT id FROM sprints WHERE project_id = @proj1_id AND name = 'Sprint 3');
SET @sprint2_id = (SELECT id FROM sprints WHERE project_id = @proj2_id AND name = 'Sprint 2');
SET @sprint3_id = (SELECT id FROM sprints WHERE project_id = @proj3_id AND name = 'Sprint 3');

-- Default Task Statuses
INSERT INTO task_statuses (tenant_id, project_id, name, slug, color, category, order_index, is_default, is_closed) VALUES
(@tenant_id, NULL, 'Backlog', 'backlog', '#94A3B8', 'to_do', 0, TRUE, FALSE),
(@tenant_id, NULL, 'To Do', 'to_do', '#3B82F6', 'to_do', 1, FALSE, FALSE),
(@tenant_id, NULL, 'In Progress', 'in_progress', '#F59E0B', 'in_progress', 2, FALSE, FALSE),
(@tenant_id, NULL, 'In Review', 'in_review', '#8B5CF6', 'in_progress', 3, FALSE, FALSE),
(@tenant_id, NULL, 'Done', 'done', '#10B981', 'done', 4, FALSE, TRUE),
(@tenant_id, NULL, 'Cancelled', 'cancelled', '#EF4444', 'cancelled', 5, FALSE, TRUE);

-- Default Task Types
INSERT INTO task_types (tenant_id, name, slug, icon, color, is_default) VALUES
(@tenant_id, 'Epic', 'epic', '🎯', '#7C3AED', FALSE),
(@tenant_id, 'Feature', 'feature', '⭐', '#2563EB', FALSE),
(@tenant_id, 'Story', 'story', '📖', '#059669', TRUE),
(@tenant_id, 'Task', 'task', '✓', '#0891B2', FALSE),
(@tenant_id, 'Bug', 'bug', '🐛', '#DC2626', FALSE),
(@tenant_id, 'Improvement', 'improvement', '💡', '#D97706', FALSE);

-- Default Labels
INSERT INTO labels (uuid, tenant_id, project_id, name, color) VALUES
(UUID(), @tenant_id, NULL, 'Frontend', '#3B82F6'),
(UUID(), @tenant_id, NULL, 'Backend', '#10B981'),
(UUID(), @tenant_id, NULL, 'Database', '#8B5CF6'),
(UUID(), @tenant_id, NULL, 'API', '#F59E0B'),
(UUID(), @tenant_id, NULL, 'Security', '#EF4444'),
(UUID(), @tenant_id, NULL, 'Performance', '#EC4899'),
(UUID(), @tenant_id, NULL, 'Documentation', '#6366F1'),
(UUID(), @tenant_id, NULL, 'Testing', '#14B8A6');

-- Sample Tasks for EPMS Project
INSERT INTO tasks (uuid, tenant_id, project_id, sprint_id, task_number, task_key, type, title, description, status, priority, assignee_id, reporter_id, story_points, estimated_hours, progress_percentage, created_by) VALUES
-- Epic
(UUID(), @tenant_id, @proj1_id, NULL, 1, 'EPMS-1', 'epic', 'Project Management Core', 'Core project management functionality including CRUD operations', 'in_progress', 'high', @pm_id, @pm_id, 40, 160, 50, @pm_id),
-- Features under Epic
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 2, 'EPMS-2', 'feature', 'Project Dashboard', 'Main dashboard showing project overview and KPIs', 'in_progress', 'high', @dev1_id, @pm_id, 8, 32, 60, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 3, 'EPMS-3', 'feature', 'Task Board', 'Kanban board for task management', 'to_do', 'high', @dev2_id, @pm_id, 13, 52, 0, @pm_id),
-- Stories
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 4, 'EPMS-4', 'story', 'Create project form', 'As a PM, I want to create new projects with all required fields', 'done', 'medium', @dev1_id, @pm_id, 5, 20, 100, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 5, 'EPMS-5', 'story', 'Project list view', 'Display all projects in a sortable, filterable table', 'done', 'medium', @dev1_id, @pm_id, 3, 12, 100, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 6, 'EPMS-6', 'story', 'Project detail page', 'Show complete project information and metrics', 'in_progress', 'medium', @dev2_id, @pm_id, 5, 20, 40, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 7, 'EPMS-7', 'story', 'Task creation modal', 'Modal form to create new tasks with validation', 'in_review', 'medium', @dev1_id, @pm_id, 3, 12, 90, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 8, 'EPMS-8', 'story', 'Task drag and drop', 'Implement drag and drop between board columns', 'to_do', 'medium', @dev2_id, @pm_id, 5, 20, 0, @pm_id),
-- Tasks
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 9, 'EPMS-9', 'task', 'Setup database schema', 'Create all required database tables and indexes', 'done', 'high', @dev1_id, @pm_id, 3, 12, 100, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 10, 'EPMS-10', 'task', 'Implement API endpoints', 'Create REST API for project CRUD operations', 'done', 'high', @dev1_id, @pm_id, 5, 20, 100, @pm_id),
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 11, 'EPMS-11', 'task', 'Add unit tests', 'Write unit tests for project service layer', 'in_progress', 'medium', @qa_id, @pm_id, 3, 12, 50, @pm_id),
-- Bug
(UUID(), @tenant_id, @proj1_id, @sprint1_id, 12, 'EPMS-12', 'bug', 'Fix date picker timezone issue', 'Dates are showing incorrect due to timezone conversion', 'in_progress', 'high', @dev1_id, @qa_id, 2, 8, 30, @qa_id),
-- Backlog items
(UUID(), @tenant_id, @proj1_id, NULL, 13, 'EPMS-13', 'story', 'Sprint planning view', 'Dedicated view for sprint planning with drag-drop', 'backlog', 'medium', NULL, @pm_id, 8, 32, 0, @pm_id),
(UUID(), @tenant_id, @proj1_id, NULL, 14, 'EPMS-14', 'story', 'Burndown chart', 'Real-time sprint burndown chart', 'backlog', 'low', NULL, @pm_id, 5, 20, 0, @pm_id),
(UUID(), @tenant_id, @proj1_id, NULL, 15, 'EPMS-15', 'feature', 'Resource allocation', 'Team resource allocation and capacity planning', 'backlog', 'medium', NULL, @pm_id, 13, 52, 0, @pm_id);

-- Sample Tasks for CRM Project
INSERT INTO tasks (uuid, tenant_id, project_id, sprint_id, task_number, task_key, type, title, description, status, priority, assignee_id, reporter_id, story_points, estimated_hours, progress_percentage, created_by) VALUES
(UUID(), @tenant_id, @proj2_id, @sprint2_id, 1, 'CRM-1', 'feature', 'Design System Components', 'Create reusable UI component library', 'in_progress', 'high', @dev1_id, @pm_id, 13, 52, 40, @pm_id),
(UUID(), @tenant_id, @proj2_id, @sprint2_id, 2, 'CRM-2', 'story', 'Button components', 'Primary, secondary, and tertiary button variants', 'done', 'medium', @dev1_id, @pm_id, 3, 12, 100, @pm_id),
(UUID(), @tenant_id, @proj2_id, @sprint2_id, 3, 'CRM-3', 'story', 'Form input components', 'Text inputs, selects, checkboxes with validation', 'in_progress', 'medium', @dev1_id, @pm_id, 5, 20, 60, @pm_id),
(UUID(), @tenant_id, @proj2_id, @sprint2_id, 4, 'CRM-4', 'story', 'Modal component', 'Reusable modal with different sizes', 'to_do', 'medium', @dev1_id, @pm_id, 3, 12, 0, @pm_id);

-- Sample Tasks for Mobile Project
INSERT INTO tasks (uuid, tenant_id, project_id, sprint_id, task_number, task_key, type, title, description, status, priority, assignee_id, reporter_id, story_points, estimated_hours, progress_percentage, created_by) VALUES
(UUID(), @tenant_id, @proj3_id, @sprint3_id, 1, 'MOB-1', 'feature', 'Dashboard Screens', 'Main dashboard with widgets and navigation', 'in_progress', 'high', @dev2_id, @pm_id, 13, 52, 50, @pm_id),
(UUID(), @tenant_id, @proj3_id, @sprint3_id, 2, 'MOB-2', 'story', 'Home screen layout', 'Main home screen with summary cards', 'done', 'high', @dev2_id, @pm_id, 5, 20, 100, @pm_id),
(UUID(), @tenant_id, @proj3_id, @sprint3_id, 3, 'MOB-3', 'story', 'Project list screen', 'List of projects with filters', 'done', 'medium', @dev2_id, @pm_id, 5, 20, 100, @pm_id),
(UUID(), @tenant_id, @proj3_id, @sprint3_id, 4, 'MOB-4', 'story', 'Task detail screen', 'Task view with all details and actions', 'in_progress', 'medium', @dev2_id, @pm_id, 5, 20, 40, @pm_id),
(UUID(), @tenant_id, @proj3_id, @sprint3_id, 5, 'MOB-5', 'bug', 'Fix bottom navigation overlap', 'Content hidden behind bottom nav on smaller screens', 'to_do', 'high', @dev2_id, @qa_id, 2, 8, 0, @qa_id);

-- Sample Risks
INSERT INTO risks (uuid, tenant_id, project_id, risk_number, risk_key, title, description, category, probability, probability_score, impact, impact_score, risk_score, risk_level, response_strategy, mitigation_plan, owner_id, status, identified_date) VALUES
(UUID(), @tenant_id, @proj1_id, 1, 'EPMS-R1', 'Resource availability', 'Key developer may be reassigned to another project', 'Resource', 'medium', 3, 'major', 4, 12, 'high', 'mitigate', 'Cross-train team members, document all work', @pm_id, 'monitoring', '2026-01-15'),
(UUID(), @tenant_id, @proj1_id, 2, 'EPMS-R2', 'Scope creep', 'Additional features being requested without timeline adjustment', 'Scope', 'high', 4, 'moderate', 3, 12, 'high', 'avoid', 'Strict change request process, regular scope reviews', @pm_id, 'monitoring', '2026-01-20'),
(UUID(), @tenant_id, @proj2_id, 1, 'CRM-R1', 'Third-party API dependency', 'Reliance on external API with uncertain SLA', 'Technical', 'medium', 3, 'major', 4, 12, 'high', 'mitigate', 'Implement fallback mechanisms, cache responses', @pm_id, 'analyzing', '2026-02-05'),
(UUID(), @tenant_id, @proj3_id, 1, 'MOB-R1', 'App store approval delays', 'iOS app review may take longer than expected', 'External', 'medium', 3, 'minor', 2, 6, 'medium', 'accept', 'Plan buffer time, ensure compliance with guidelines', @pm_id, 'identified', '2026-02-10');

-- Sample Issues
INSERT INTO issues (uuid, tenant_id, project_id, issue_number, issue_key, title, description, category, priority, severity, owner_id, assigned_to, status, reported_date, target_resolution_date) VALUES
(UUID(), @tenant_id, @proj1_id, 1, 'EPMS-I1', 'Database connection pool exhaustion', 'During load testing, connections are not being properly released', 'Technical', 'high', 'major', @pm_id, @dev1_id, 'in_progress', '2026-01-25', '2026-01-30'),
(UUID(), @tenant_id, @proj2_id, 1, 'CRM-I1', 'Design mockups delayed', 'UI/UX designer sick leave causing design delays', 'Resource', 'medium', 'minor', @pm_id, @pm_id, 'pending', '2026-02-15', '2026-02-22');

-- Sample Time Entries
INSERT INTO time_entries (uuid, tenant_id, user_id, project_id, task_id, date, duration_minutes, description, is_billable, status) VALUES
(UUID(), @tenant_id, @dev1_id, @proj1_id, (SELECT id FROM tasks WHERE task_key = 'EPMS-9'), '2026-01-27', 480, 'Database schema implementation', TRUE, 'approved'),
(UUID(), @tenant_id, @dev1_id, @proj1_id, (SELECT id FROM tasks WHERE task_key = 'EPMS-10'), '2026-01-28', 420, 'API endpoint development', TRUE, 'submitted'),
(UUID(), @tenant_id, @dev2_id, @proj1_id, (SELECT id FROM tasks WHERE task_key = 'EPMS-6'), '2026-01-28', 360, 'Project detail page development', TRUE, 'draft'),
(UUID(), @tenant_id, @qa_id, @proj1_id, (SELECT id FROM tasks WHERE task_key = 'EPMS-11'), '2026-01-28', 240, 'Unit test writing', TRUE, 'draft');

-- Sample Activities
INSERT INTO activities (uuid, tenant_id, project_id, user_id, action, description, object_type, object_id, object_name) VALUES
(UUID(), @tenant_id, @proj1_id, @pm_id, 'created', 'Created project EPMS-001', 'project', @proj1_id, 'Enterprise Project Management System'),
(UUID(), @tenant_id, @proj1_id, @pm_id, 'created', 'Started Sprint 3', 'sprint', @sprint1_id, 'Sprint 3'),
(UUID(), @tenant_id, @proj1_id, @dev1_id, 'completed', 'Completed task EPMS-9', 'task', (SELECT id FROM tasks WHERE task_key = 'EPMS-9'), 'Setup database schema'),
(UUID(), @tenant_id, @proj1_id, @dev1_id, 'completed', 'Completed task EPMS-10', 'task', (SELECT id FROM tasks WHERE task_key = 'EPMS-10'), 'Implement API endpoints'),
(UUID(), @tenant_id, @proj1_id, @qa_id, 'created', 'Reported bug EPMS-12', 'task', (SELECT id FROM tasks WHERE task_key = 'EPMS-12'), 'Fix date picker timezone issue');

SELECT 'EPMS Migration Completed Successfully!' AS Status;
