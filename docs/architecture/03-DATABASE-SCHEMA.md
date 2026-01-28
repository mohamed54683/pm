# Enterprise PMS - High-Level Database Schema

## Document Information
- **Version**: 1.0
- **Last Updated**: 2026-01-28
- **Database**: MySQL 8.0 / PostgreSQL 15

---

## 1. Schema Overview

### 1.1 Database Organization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA GROUPS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CORE TABLES (20)                                                            │
│  ├── System Configuration                                                    │
│  ├── Multi-Tenancy                                                          │
│  └── Identity & Access                                                      │
│                                                                              │
│  PROJECT MANAGEMENT TABLES (35)                                              │
│  ├── Projects & Portfolios                                                  │
│  ├── Tasks & WBS                                                            │
│  ├── Scheduling & Planning                                                  │
│  └── Agile & Methodology                                                    │
│                                                                              │
│  RESOURCE & TIME TABLES (15)                                                 │
│  ├── Resource Management                                                    │
│  ├── Time Tracking                                                          │
│  └── Capacity Planning                                                      │
│                                                                              │
│  GOVERNANCE TABLES (20)                                                      │
│  ├── Finance & Budget                                                       │
│  ├── Risk & Issues                                                          │
│  └── Quality Management                                                     │
│                                                                              │
│  COLLABORATION TABLES (15)                                                   │
│  ├── Documents & Knowledge                                                  │
│  ├── Communication                                                          │
│  └── Workflows                                                              │
│                                                                              │
│  ANALYTICS TABLES (10)                                                       │
│  ├── Reporting                                                              │
│  ├── Dashboards                                                             │
│  └── Analytics Cache                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity Relationship Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CORE ENTITY RELATIONSHIPS                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │ Organization │
                              └──────┬───────┘
                                     │ 1:N
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
             ┌──────────┐    ┌──────────┐    ┌──────────┐
             │   Team   │    │  User    │    │Portfolio │
             └────┬─────┘    └────┬─────┘    └────┬─────┘
                  │               │               │
                  └───────┬───────┘               │ 1:N
                          │                       │
                          ▼                       ▼
                   ┌─────────────┐         ┌──────────┐
                   │   Project   │◄────────│  Program │
                   └──────┬──────┘         └──────────┘
                          │ 1:N
         ┌────────────────┼────────────────────────────────┐
         │                │                │               │
         ▼                ▼                ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Phase  │    │   Task   │    │  Sprint  │    │   Risk   │
    └────┬────┘    └────┬─────┘    └────┬─────┘    └──────────┘
         │              │               │
         │              ▼               │
         │       ┌──────────┐          │
         └──────►│ Subtask  │◄─────────┘
                 └──────────┘
```

---

## 3. Core Tables

### 3.1 Multi-Tenancy & Organizations

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type ENUM('enterprise', 'government', 'sme', 'startup') DEFAULT 'enterprise',
    status ENUM('active', 'suspended', 'trial', 'cancelled') DEFAULT 'active',

    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    custom_domain VARCHAR(255),

    -- Settings
    settings JSON,
    features JSON,

    -- Subscription
    subscription_plan VARCHAR(50),
    subscription_status VARCHAR(20),
    trial_ends_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_slug (slug),
    INDEX idx_status (status)
);

-- Teams within Organizations
CREATE TABLE teams (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    parent_team_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('department', 'team', 'group', 'virtual') DEFAULT 'team',
    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_org (organization_id),
    INDEX idx_parent (parent_team_id)
);

-- Team Members
CREATE TABLE team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    role ENUM('leader', 'member', 'guest') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_user (team_id, user_id)
);
```

### 3.2 Identity & Access Management

```sql
-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,

    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    auth_provider ENUM('local', 'sso', 'ldap', 'oauth') DEFAULT 'local',
    external_id VARCHAR(255),

    -- Profile
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',

    -- Status
    status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'pending',
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,

    -- Settings
    preferences JSON,
    notification_settings JSON,

    -- Security
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    password_changed_at TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_email (organization_id, email),
    INDEX idx_org (organization_id),
    INDEX idx_status (status)
);

-- Roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    level INT DEFAULT 0,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_slug (organization_id, slug)
);

-- User Roles
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    scope_type ENUM('global', 'organization', 'portfolio', 'project', 'team') DEFAULT 'organization',
    scope_id VARCHAR(36),
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role_scope (user_id, role_id, scope_type, scope_id)
);

-- Permissions
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    description TEXT,

    UNIQUE KEY unique_permission (module, action, resource)
);

-- API Keys
CREATE TABLE api_keys (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    permissions JSON,
    rate_limit INT DEFAULT 1000,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    status ENUM('active', 'revoked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_prefix (key_prefix)
);

-- Sessions
CREATE TABLE sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSON,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);
```

### 3.3 System Configuration

```sql
-- System Settings
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36),
    category VARCHAR(50) NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    value JSON,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_key (organization_id, category, key_name)
);

-- Audit Logs
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    changes JSON,
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_org_entity (organization_id, entity_type, entity_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);

-- Notifications
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSON,
    channels JSON DEFAULT '["in_app"]',
    read_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, read_at)
);

-- Files
CREATE TABLE files (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    uploaded_by INT,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT,
    storage_path VARCHAR(500) NOT NULL,
    storage_provider ENUM('local', 's3', 'azure', 'gcs') DEFAULT 'local',
    checksum VARCHAR(64),
    metadata JSON,

    -- Associations
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id)
);
```

---

## 4. Project Management Tables

### 4.1 Portfolios & Programs

```sql
-- Portfolios
CREATE TABLE portfolios (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'on_hold', 'closed') DEFAULT 'active',
    owner_id INT,

    -- Strategic Alignment
    strategic_goals JSON,
    priority_score DECIMAL(5,2),

    -- Budget
    total_budget DECIMAL(15,2),
    allocated_budget DECIMAL(15,2),

    -- Dates
    start_date DATE,
    target_end_date DATE,

    -- Settings
    settings JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_org (organization_id)
);

-- Programs
CREATE TABLE programs (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    portfolio_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'on_hold', 'completed', 'cancelled') DEFAULT 'active',
    manager_id INT,

    start_date DATE,
    end_date DATE,

    budget DECIMAL(15,2),
    settings JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_portfolio (portfolio_id)
);
```

### 4.2 Projects

```sql
-- Projects
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    portfolio_id VARCHAR(36),
    program_id VARCHAR(36),
    template_id VARCHAR(36),
    parent_project_id VARCHAR(36),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,

    -- Classification
    type ENUM('internal', 'external', 'maintenance', 'research', 'other') DEFAULT 'internal',
    methodology ENUM('agile', 'waterfall', 'hybrid', 'kanban', 'custom') DEFAULT 'agile',
    category VARCHAR(100),
    tags JSON,

    -- Status
    status ENUM('draft', 'planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived') DEFAULT 'draft',
    health_status ENUM('green', 'yellow', 'red', 'unknown') DEFAULT 'unknown',

    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    completion_method ENUM('manual', 'task_based', 'milestone_based', 'weighted') DEFAULT 'task_based',

    -- Budget
    budget DECIMAL(15,2),
    budget_spent DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Priority
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    priority_score DECIMAL(5,2),
    business_value INT,

    -- Team
    owner_id INT,
    manager_id INT,

    -- Settings
    settings JSON,
    custom_fields JSON,

    -- Flags
    is_template BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_org (organization_id),
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_status (status),
    INDEX idx_dates (planned_start_date, planned_end_date)
);

-- Project Members
CREATE TABLE project_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'manager', 'lead', 'member', 'viewer', 'client') DEFAULT 'member',
    permissions JSON,
    allocation_percentage DECIMAL(5,2) DEFAULT 100,
    start_date DATE,
    end_date DATE,
    hourly_rate DECIMAL(10,2),
    added_by INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_user (project_id, user_id)
);

-- Project Phases
CREATE TABLE project_phases (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    status ENUM('pending', 'active', 'completed', 'skipped') DEFAULT 'pending',

    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Gate approval
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INT,
    approved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_order (project_id, order_index)
);

-- Project Baselines
CREATE TABLE project_baselines (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('original', 'revised', 'current') DEFAULT 'original',
    version INT DEFAULT 1,

    -- Snapshot Data
    scope_snapshot JSON,
    schedule_snapshot JSON,
    cost_snapshot JSON,

    baseline_date DATE NOT NULL,
    notes TEXT,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id)
);
```

### 4.3 Tasks & WBS

```sql
-- Tasks
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(36),
    sprint_id VARCHAR(36),
    parent_task_id VARCHAR(36),

    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type ENUM('epic', 'feature', 'story', 'task', 'subtask', 'bug', 'improvement', 'spike') DEFAULT 'task',

    -- Status & Priority
    status ENUM('backlog', 'todo', 'in_progress', 'in_review', 'testing', 'done', 'cancelled', 'blocked') DEFAULT 'backlog',
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',

    -- Ordering
    order_index INT DEFAULT 0,
    wbs_number VARCHAR(50),

    -- Dates
    due_date DATE,
    start_date DATE,
    completed_date TIMESTAMP,

    -- Estimation
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0,
    remaining_hours DECIMAL(10,2),
    story_points INT,
    effort_estimate ENUM('xs', 's', 'm', 'l', 'xl'),

    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Business Context
    business_value INT,
    risk_level ENUM('low', 'medium', 'high'),

    -- Tags & Labels
    tags JSON,
    labels JSON,

    -- Custom Fields
    custom_fields JSON,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSON,
    recurrence_parent_id VARCHAR(36),

    -- Tracking
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_parent (parent_task_id),
    INDEX idx_due (due_date),
    INDEX idx_sprint (sprint_id)
);

-- Task Assignees
CREATE TABLE task_assignees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    role ENUM('assignee', 'reviewer', 'observer') DEFAULT 'assignee',
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_user_role (task_id, user_id, role)
);

-- Task Dependencies
CREATE TABLE task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    predecessor_task_id VARCHAR(36) NOT NULL,
    successor_task_id VARCHAR(36) NOT NULL,
    dependency_type ENUM('FS', 'SS', 'FF', 'SF') DEFAULT 'FS',
    lag_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (predecessor_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (successor_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (predecessor_task_id, successor_task_id)
);

-- Milestones
CREATE TABLE milestones (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    phase_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status ENUM('pending', 'achieved', 'missed', 'cancelled') DEFAULT 'pending',
    achieved_date DATE,

    is_client_facing BOOLEAN DEFAULT FALSE,
    deliverables JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE SET NULL,
    INDEX idx_project_due (project_id, due_date)
);

-- Task Checklists
CREATE TABLE task_checklists (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by INT,
    completed_at TIMESTAMP,
    order_index INT DEFAULT 0,

    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task (task_id)
);

-- Labels
CREATE TABLE labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    description TEXT,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_label (organization_id, project_id, name)
);

-- Task Labels (Junction)
CREATE TABLE task_labels (
    task_id VARCHAR(36) NOT NULL,
    label_id INT NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- Task History
CREATE TABLE task_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    user_id INT,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task (task_id),
    INDEX idx_changed (changed_at)
);
```

### 4.4 Agile & Sprints

```sql
-- Sprints
CREATE TABLE sprints (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Capacity
    capacity_points INT,
    committed_points INT DEFAULT 0,
    completed_points INT DEFAULT 0,

    -- Velocity
    velocity DECIMAL(10,2),

    -- Retrospective
    retrospective_notes TEXT,
    what_went_well JSON,
    what_to_improve JSON,
    action_items JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_dates (start_date, end_date)
);

-- Backlog Items
CREATE TABLE backlog_items (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    backlog_type ENUM('product', 'sprint', 'release') DEFAULT 'product',
    sprint_id VARCHAR(36),
    release_id VARCHAR(36),

    priority_order INT DEFAULT 0,
    story_points INT,

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    UNIQUE KEY unique_task_backlog (task_id, backlog_type)
);

-- Boards
CREATE TABLE boards (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('kanban', 'scrum', 'custom') DEFAULT 'kanban',
    is_default BOOLEAN DEFAULT FALSE,
    settings JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Board Columns
CREATE TABLE board_columns (
    id VARCHAR(36) PRIMARY KEY,
    board_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status_mapping VARCHAR(50),
    order_index INT DEFAULT 0,
    wip_limit INT,
    color VARCHAR(7),

    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    INDEX idx_board_order (board_id, order_index)
);

-- Sprint Burndown Data
CREATE TABLE sprint_burndown (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sprint_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    remaining_points INT,
    remaining_tasks INT,
    completed_points INT,
    added_points INT,
    removed_points INT,

    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
    UNIQUE KEY unique_sprint_date (sprint_id, date)
);
```

---

## 5. Resource & Time Tables

### 5.1 Resource Management

```sql
-- Skills
CREATE TABLE skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_skill (organization_id, name)
);

-- User Skills
CREATE TABLE user_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
    years_experience DECIMAL(4,1),
    is_primary BOOLEAN DEFAULT FALSE,
    verified_by INT,
    verified_at TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skill (user_id, skill_id)
);

-- Resource Allocations
CREATE TABLE resource_allocations (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    phase_id VARCHAR(36),
    task_id VARCHAR(36),

    allocation_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planned_hours DECIMAL(10,2),

    role VARCHAR(100),
    billing_rate DECIMAL(10,2),

    status ENUM('planned', 'confirmed', 'active', 'completed') DEFAULT 'planned',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_dates (user_id, start_date, end_date)
);

-- User Capacity
CREATE TABLE user_capacity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    available_hours DECIMAL(5,2) DEFAULT 8,
    allocated_hours DECIMAL(5,2) DEFAULT 0,
    time_off_type ENUM('none', 'vacation', 'sick', 'holiday', 'training', 'other') DEFAULT 'none',
    notes TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_date (date)
);
```

### 5.2 Time Tracking

```sql
-- Time Entries
CREATE TABLE time_entries (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36),

    date DATE NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT NOT NULL,

    description TEXT,

    -- Billing
    is_billable BOOLEAN DEFAULT TRUE,
    billing_rate DECIMAL(10,2),
    billing_amount DECIMAL(15,2),

    -- Classification
    activity_type VARCHAR(50),
    is_overtime BOOLEAN DEFAULT FALSE,

    -- Status
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'billed') DEFAULT 'draft',

    -- Timer
    is_running BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,

    INDEX idx_user_date (user_id, date),
    INDEX idx_project (project_id),
    INDEX idx_status (status)
);

-- Timesheets
CREATE TABLE timesheets (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    period_type ENUM('weekly', 'biweekly', 'monthly') DEFAULT 'weekly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    total_hours DECIMAL(10,2) DEFAULT 0,
    billable_hours DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(10,2) DEFAULT 0,

    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP,

    reviewed_by INT,
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_period (user_id, period_start, period_end)
);
```

---

## 6. Governance Tables

### 6.1 Finance & Budget

```sql
-- Budgets
CREATE TABLE budgets (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    portfolio_id VARCHAR(36),

    name VARCHAR(255) NOT NULL,
    type ENUM('project', 'operational', 'capital') DEFAULT 'project',

    fiscal_year INT,
    currency VARCHAR(3) DEFAULT 'USD',

    total_amount DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,

    start_date DATE,
    end_date DATE,

    status ENUM('draft', 'approved', 'active', 'closed') DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- Budget Categories
CREATE TABLE budget_categories (
    id VARCHAR(36) PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    parent_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),

    planned_amount DECIMAL(15,2) DEFAULT 0,
    actual_amount DECIMAL(15,2) DEFAULT 0,

    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES budget_categories(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    budget_category_id VARCHAR(36),

    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    expense_date DATE NOT NULL,

    type ENUM('labor', 'material', 'equipment', 'travel', 'software', 'other') DEFAULT 'other',
    vendor VARCHAR(255),
    invoice_number VARCHAR(100),

    submitted_by INT,
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'paid') DEFAULT 'draft',
    approved_by INT,
    approved_at TIMESTAMP,

    receipt_file_id VARCHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_category_id) REFERENCES budget_categories(id) ON DELETE SET NULL
);

-- Earned Value Data
CREATE TABLE earned_value_data (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    snapshot_date DATE NOT NULL,

    -- Base values
    bac DECIMAL(15,2),  -- Budget at Completion
    pv DECIMAL(15,2),   -- Planned Value
    ev DECIMAL(15,2),   -- Earned Value
    ac DECIMAL(15,2),   -- Actual Cost

    -- Variances
    sv DECIMAL(15,2),   -- Schedule Variance
    cv DECIMAL(15,2),   -- Cost Variance

    -- Indices
    spi DECIMAL(5,4),   -- Schedule Performance Index
    cpi DECIMAL(5,4),   -- Cost Performance Index

    -- Forecasts
    eac DECIMAL(15,2),  -- Estimate at Completion
    etc DECIMAL(15,2),  -- Estimate to Complete
    vac DECIMAL(15,2),  -- Variance at Completion

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_date (project_id, snapshot_date)
);
```

### 6.2 Risk & Issues

```sql
-- Risks
CREATE TABLE risks (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    category ENUM('technical', 'schedule', 'cost', 'resource', 'scope', 'quality', 'external', 'other') DEFAULT 'other',

    -- Assessment
    probability ENUM('very_low', 'low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    impact ENUM('very_low', 'low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    risk_score INT GENERATED ALWAYS AS (
        (CASE probability WHEN 'very_low' THEN 1 WHEN 'low' THEN 2 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'very_high' THEN 5 END) *
        (CASE impact WHEN 'very_low' THEN 1 WHEN 'low' THEN 2 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'very_high' THEN 5 END)
    ) STORED,

    -- Response
    status ENUM('identified', 'analyzing', 'mitigating', 'monitoring', 'resolved', 'closed', 'occurred') DEFAULT 'identified',
    response_strategy ENUM('avoid', 'mitigate', 'transfer', 'accept') DEFAULT 'mitigate',
    mitigation_plan TEXT,
    contingency_plan TEXT,

    -- Impact
    cost_impact DECIMAL(15,2),
    schedule_impact_days INT,

    -- Ownership
    owner_id INT,
    identified_by INT,
    identified_date DATE,

    -- Dates
    target_resolution_date DATE,
    actual_resolution_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_score (risk_score DESC)
);

-- Issues
CREATE TABLE issues (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36),
    risk_id VARCHAR(36),

    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    severity ENUM('critical', 'major', 'minor', 'trivial') DEFAULT 'major',

    status ENUM('open', 'in_progress', 'resolved', 'closed', 'escalated') DEFAULT 'open',
    resolution TEXT,

    -- Impact
    impact_description TEXT,
    affected_areas JSON,

    -- Ownership
    reported_by INT,
    assigned_to INT,
    escalated_to INT,

    -- Dates
    reported_date DATE,
    target_resolution_date DATE,
    actual_resolution_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE SET NULL,

    INDEX idx_project (project_id),
    INDEX idx_status (status)
);

-- Change Requests
CREATE TABLE change_requests (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    justification TEXT,
    type ENUM('scope', 'schedule', 'cost', 'resource', 'technical', 'other') DEFAULT 'scope',

    status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented', 'cancelled') DEFAULT 'draft',
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',

    -- Impact Analysis
    scope_impact TEXT,
    schedule_impact_days INT,
    cost_impact DECIMAL(15,2),
    risk_impact TEXT,

    -- Approval
    requested_by INT,
    submitted_date DATE,
    decision_date DATE,
    decision_by INT,
    decision_notes TEXT,

    -- Implementation
    implemented_date DATE,
    implemented_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

    INDEX idx_project (project_id),
    INDEX idx_status (status)
);
```

### 6.3 Quality Management

```sql
-- Test Cases
CREATE TABLE test_cases (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36),

    title VARCHAR(500) NOT NULL,
    description TEXT,
    preconditions TEXT,
    steps JSON,
    expected_result TEXT,

    type ENUM('functional', 'integration', 'performance', 'security', 'usability', 'other') DEFAULT 'functional',
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',

    status ENUM('draft', 'ready', 'deprecated') DEFAULT 'draft',

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Test Runs
CREATE TABLE test_runs (
    id VARCHAR(36) PRIMARY KEY,
    test_case_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36),

    status ENUM('pending', 'passed', 'failed', 'blocked', 'skipped') DEFAULT 'pending',
    actual_result TEXT,
    notes TEXT,

    environment VARCHAR(100),
    browser VARCHAR(100),

    executed_by INT,
    executed_at TIMESTAMP,
    duration_seconds INT,

    FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    INDEX idx_test_case (test_case_id)
);

-- Defects
CREATE TABLE defects (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36),
    test_run_id VARCHAR(36),

    title VARCHAR(500) NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,

    severity ENUM('critical', 'major', 'minor', 'trivial') DEFAULT 'major',
    priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    status ENUM('new', 'confirmed', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix', 'duplicate') DEFAULT 'new',

    environment VARCHAR(100),
    browser VARCHAR(100),
    version VARCHAR(50),

    reported_by INT,
    assigned_to INT,

    reported_date DATE,
    fixed_date DATE,
    verified_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,

    INDEX idx_project (project_id),
    INDEX idx_status (status)
);
```

---

## 7. Collaboration Tables

### 7.1 Documents & Knowledge

```sql
-- Folders
CREATE TABLE folders (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    parent_id VARCHAR(36),

    name VARCHAR(255) NOT NULL,
    path VARCHAR(1000),

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Documents
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    folder_id VARCHAR(36),

    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('document', 'spreadsheet', 'presentation', 'pdf', 'image', 'other') DEFAULT 'document',

    current_version_id VARCHAR(36),

    status ENUM('draft', 'review', 'approved', 'archived') DEFAULT 'draft',

    tags JSON,
    metadata JSON,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

-- Document Versions
CREATE TABLE document_versions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    version_number INT NOT NULL,

    file_id VARCHAR(36) NOT NULL,
    file_size BIGINT,

    change_summary TEXT,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_doc_version (document_id, version_number)
);

-- Wiki Pages
CREATE TABLE wiki_pages (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    parent_id VARCHAR(36),

    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT,

    order_index INT DEFAULT 0,

    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',

    created_by INT,
    last_edited_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES wiki_pages(id) ON DELETE SET NULL
);
```

### 7.2 Communication

```sql
-- Comments
CREATE TABLE comments (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,

    -- Polymorphic association
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,

    parent_id VARCHAR(36),

    content TEXT NOT NULL,

    -- Mentions
    mentions JSON,

    -- Reactions
    reactions JSON,

    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,

    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,

    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_parent (parent_id)
);

-- Activity Log
CREATE TABLE activity_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),

    -- Actor
    user_id INT,

    -- Action
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36),
    entity_name VARCHAR(255),

    -- Details
    description TEXT,
    metadata JSON,

    -- Importance
    importance ENUM('low', 'normal', 'high') DEFAULT 'normal',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,

    INDEX idx_project (project_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);

-- Mentions
CREATE TABLE mentions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,

    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, read_at)
);
```

### 7.3 Workflows

```sql
-- Workflows
CREATE TABLE workflows (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('task', 'approval', 'notification', 'custom') DEFAULT 'task',

    entity_type VARCHAR(50),

    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    settings JSON,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Workflow Steps
CREATE TABLE workflow_steps (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,

    name VARCHAR(255) NOT NULL,
    type ENUM('status', 'approval', 'notification', 'action', 'condition', 'delay') DEFAULT 'status',
    order_index INT DEFAULT 0,

    config JSON,

    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    INDEX idx_workflow_order (workflow_id, order_index)
);

-- Workflow Transitions
CREATE TABLE workflow_transitions (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,

    from_step_id VARCHAR(36),
    to_step_id VARCHAR(36) NOT NULL,

    name VARCHAR(255),
    condition_expression TEXT,

    required_roles JSON,

    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (from_step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (to_step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE
);

-- Approvals
CREATE TABLE approvals (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,

    workflow_id VARCHAR(36),
    step_id VARCHAR(36),

    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',

    requested_by INT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    decided_by INT,
    decided_at TIMESTAMP,
    decision_notes TEXT,

    due_date TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (status)
);

-- Approval Steps
CREATE TABLE approval_steps (
    id VARCHAR(36) PRIMARY KEY,
    approval_id VARCHAR(36) NOT NULL,

    approver_id INT,
    approver_role VARCHAR(100),

    order_index INT DEFAULT 0,

    status ENUM('pending', 'approved', 'rejected', 'skipped') DEFAULT 'pending',
    decided_at TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (approval_id) REFERENCES approvals(id) ON DELETE CASCADE,
    INDEX idx_approval (approval_id)
);
```

---

## 8. Analytics & Reporting Tables

```sql
-- Dashboards
CREATE TABLE dashboards (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id INT,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('personal', 'project', 'portfolio', 'executive', 'team', 'custom') DEFAULT 'personal',

    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSON,

    layout JSON,
    settings JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- Dashboard Widgets
CREATE TABLE dashboard_widgets (
    id VARCHAR(36) PRIMARY KEY,
    dashboard_id VARCHAR(36) NOT NULL,

    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),

    config JSON,
    position JSON,

    is_visible BOOLEAN DEFAULT TRUE,
    refresh_interval INT DEFAULT 300,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
);

-- Reports
CREATE TABLE reports (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('project_status', 'resource_utilization', 'time_tracking', 'budget', 'risk', 'custom') DEFAULT 'custom',

    query_config JSON,
    columns JSON,
    filters JSON,
    sorting JSON,

    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_config JSON,

    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSON,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Report Executions
CREATE TABLE report_executions (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL,

    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',

    parameters JSON,
    result_file_id VARCHAR(36),
    row_count INT,

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,

    executed_by INT,

    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Analytics Cache
CREATE TABLE analytics_cache (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,

    cache_key VARCHAR(255) NOT NULL,
    cache_type VARCHAR(50),

    data JSON,

    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cache_key (organization_id, cache_key),
    INDEX idx_expires (expires_at)
);
```

---

## 9. Database Views

```sql
-- User Workload View
CREATE OR REPLACE VIEW v_user_workload AS
SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.organization_id,
    COUNT(DISTINCT ta.task_id) AS assigned_tasks,
    SUM(CASE WHEN t.status IN ('in_progress', 'in_review') THEN 1 ELSE 0 END) AS active_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) AS overdue_tasks,
    COALESCE(SUM(t.estimated_hours), 0) AS total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) AS total_actual_hours
FROM users u
LEFT JOIN task_assignees ta ON u.id = ta.user_id
LEFT JOIN tasks t ON ta.task_id = t.id
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.organization_id;

-- Project Health View
CREATE OR REPLACE VIEW v_project_health AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.organization_id,
    p.status,
    p.progress_percentage,
    COUNT(DISTINCT t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) AS overdue_tasks,
    COUNT(DISTINCT r.id) AS open_risks,
    COUNT(DISTINCT i.id) AS open_issues,
    CASE
        WHEN SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) > 5 THEN 'red'
        WHEN SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) > 0 THEN 'yellow'
        ELSE 'green'
    END AS calculated_health
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN risks r ON p.id = r.project_id AND r.status NOT IN ('resolved', 'closed')
LEFT JOIN issues i ON p.id = i.project_id AND i.status NOT IN ('resolved', 'closed')
WHERE p.status IN ('active', 'planning')
GROUP BY p.id, p.name, p.organization_id, p.status, p.progress_percentage;

-- Sprint Summary View
CREATE OR REPLACE VIEW v_sprint_summary AS
SELECT
    s.id AS sprint_id,
    s.project_id,
    s.name AS sprint_name,
    s.status,
    s.start_date,
    s.end_date,
    s.capacity_points,
    s.committed_points,
    s.completed_points,
    COUNT(DISTINCT bi.task_id) AS total_items,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_items,
    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_items,
    CASE
        WHEN s.committed_points > 0 THEN (s.completed_points / s.committed_points) * 100
        ELSE 0
    END AS completion_percentage
FROM sprints s
LEFT JOIN backlog_items bi ON s.id = bi.sprint_id
LEFT JOIN tasks t ON bi.task_id = t.id
GROUP BY s.id, s.project_id, s.name, s.status, s.start_date, s.end_date,
         s.capacity_points, s.committed_points, s.completed_points;
```

---

## 10. Indexes Summary

The schema includes optimized indexes for:
- Primary keys on all tables
- Foreign key relationships
- Frequently queried columns (status, dates, organization_id)
- Composite indexes for common query patterns
- Full-text search indexes where applicable

---

## 11. Data Migration Notes

### 11.1 From Existing Schema

The current PMP database has many tables already. The migration strategy:

1. **Keep existing tables** that align with this schema
2. **Alter existing tables** to add missing columns
3. **Create new tables** for missing functionality
4. **Create migration scripts** for data transformation

### 11.2 Multi-Tenant Migration

For existing single-tenant data:
1. Create default organization
2. Add `organization_id` to all existing records
3. Update foreign key constraints

---

## 12. Schema Statistics

| Category | Table Count | Estimated Rows (10K Users) |
|----------|-------------|---------------------------|
| Core | 12 | 50K |
| Project Management | 18 | 500K |
| Resource & Time | 8 | 2M |
| Governance | 12 | 100K |
| Collaboration | 10 | 1M |
| Analytics | 6 | 200K |
| **Total** | **66** | **~4M** |
