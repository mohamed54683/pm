/**
 * Authentication Configuration
 * Production-ready security settings
 */

export const AUTH_CONFIG = {
  // JWT Settings
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'CHANGE_THIS_IN_PRODUCTION_ACCESS_SECRET_MIN_32_CHARS',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'CHANGE_THIS_IN_PRODUCTION_REFRESH_SECRET_MIN_32_CHARS',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'qms-system',
    audience: 'qms-users',
  },

  // Password Settings
  password: {
    bcryptRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
  },

  // Rate Limiting
  rateLimit: {
    login: {
      points: 5,           // 5 attempts
      duration: 60,        // per 60 seconds
      blockDuration: 300,  // block for 5 minutes
    },
    api: {
      points: 100,         // 100 requests
      duration: 60,        // per 60 seconds
    },
    passwordReset: {
      points: 3,
      duration: 3600,      // 3 attempts per hour
    },
  },

  // Cookie Settings
  cookie: {
    accessTokenName: 'qms_access_token',
    refreshTokenName: 'qms_refresh_token',
    csrfTokenName: 'qms_csrf_token',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: {
      accessToken: 15 * 60,           // 15 minutes
      refreshToken: 7 * 24 * 60 * 60, // 7 days
    },
  },

  // Session Settings
  session: {
    idleTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Permissions for RBAC
export const PERMISSIONS = {
  // User Management
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.edit': 'Edit users',
  'users.delete': 'Delete users',

  // Role Management
  'roles.view': 'View roles',
  'roles.create': 'Create roles',
  'roles.edit': 'Edit roles',
  'roles.delete': 'Delete roles',

  // Project Management
  'projects.view': 'View projects',
  'projects.create': 'Create projects',
  'projects.edit': 'Edit projects',
  'projects.delete': 'Delete projects',

  // Task Management
  'tasks.view': 'View tasks',
  'tasks.create': 'Create tasks',
  'tasks.edit': 'Edit tasks',
  'tasks.delete': 'Delete tasks',

  // Sprint Management
  'sprints.view': 'View sprints',
  'sprints.create': 'Create sprints',
  'sprints.edit': 'Edit sprints',
  'sprints.delete': 'Delete sprints',

  // Risk Management
  'risks.view': 'View risks',
  'risks.create': 'Create risks',
  'risks.edit': 'Edit risks',
  'risks.delete': 'Delete risks',

  // Issue Management
  'issues.view': 'View issues',
  'issues.create': 'Create issues',
  'issues.edit': 'Edit issues',
  'issues.delete': 'Delete issues',

  // Quality Audits
  'audits.view': 'View audits',
  'audits.create': 'Create audits',
  'audits.edit': 'Edit audits',
  'audits.delete': 'Delete audits',
  'audits.approve': 'Approve audits',

  // Reports
  'reports.view': 'View reports',
  'reports.create': 'Create reports',
  'reports.edit': 'Edit reports',
  'reports.delete': 'Delete reports',
  'reports.export': 'Export reports',

  // Action Plans
  'action_plans.view': 'View action plans',
  'action_plans.create': 'Create action plans',
  'action_plans.edit': 'Edit action plans',
  'action_plans.delete': 'Delete action plans',

  // Settings
  'settings.view': 'View settings',
  'settings.edit': 'Edit settings',

  // Dashboard
  'dashboard.view': 'View dashboard',
  'dashboard.analytics': 'View analytics',
} as const;

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': Object.keys(PERMISSIONS),
  'Admin': [
    'users.view', 'users.create', 'users.edit',
    'roles.view',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    'sprints.view', 'sprints.create', 'sprints.edit', 'sprints.delete',
    'risks.view', 'risks.create', 'risks.edit', 'risks.delete',
    'issues.view', 'issues.create', 'issues.edit', 'issues.delete',
    'audits.view', 'audits.create', 'audits.edit', 'audits.approve',
    'reports.view', 'reports.create', 'reports.edit', 'reports.export',
    'action_plans.view', 'action_plans.create', 'action_plans.edit',
    'settings.view',
    'dashboard.view', 'dashboard.analytics',
  ],
  'Project Manager': [
    'users.view',
    'projects.view', 'projects.create', 'projects.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    'sprints.view', 'sprints.create', 'sprints.edit', 'sprints.delete',
    'risks.view', 'risks.create', 'risks.edit',
    'issues.view', 'issues.create', 'issues.edit',
    'reports.view', 'reports.create', 'reports.edit',
    'dashboard.view', 'dashboard.analytics',
  ],
  'Manager': [
    'users.view',
    'projects.view', 'projects.edit',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'sprints.view', 'sprints.edit',
    'risks.view', 'risks.create', 'risks.edit',
    'issues.view', 'issues.create', 'issues.edit',
    'audits.view', 'audits.create', 'audits.edit',
    'reports.view', 'reports.create', 'reports.edit',
    'action_plans.view', 'action_plans.create', 'action_plans.edit',
    'dashboard.view', 'dashboard.analytics',
  ],
  'Team Member': [
    'projects.view',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'sprints.view',
    'risks.view', 'risks.create',
    'issues.view', 'issues.create',
    'reports.view',
    'dashboard.view',
  ],
  'Auditor': [
    'projects.view',
    'tasks.view',
    'audits.view', 'audits.create',
    'reports.view', 'reports.create',
    'action_plans.view',
    'dashboard.view',
  ],
  'Viewer': [
    'projects.view',
    'tasks.view',
    'sprints.view',
    'audits.view',
    'reports.view',
    'dashboard.view',
  ],
};

export type Permission = keyof typeof PERMISSIONS;
