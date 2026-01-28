/**
 * Audit Logging System
 * Tracks all data changes with timestamp, user, and action details
 */

import { query } from './db';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'permission_change'
  | 'export'
  | 'approve'
  | 'reject'
  | 'submit';

export interface AuditLogEntry {
  id?: string;
  user_id?: number;
  user_email: string;
  user_role?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

/**
 * Create an audit log entry
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<string | null> {
  const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await query(
      `INSERT INTO audit_logs
       (id, user_id, user_email, user_role, action, resource_type, resource_id, resource_name, changes, metadata, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        entry.user_id || null,
        entry.user_email,
        entry.user_role || null,
        entry.action,
        entry.resource_type,
        entry.resource_id || null,
        entry.resource_name || null,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ip_address || null,
        entry.user_agent || null
      ]
    );
    return id;
  } catch (error) {
    // If audit_logs table doesn't exist, log to console
    console.log('[AUDIT]', JSON.stringify({
      ...entry,
      id,
      created_at: new Date().toISOString()
    }));
    return null;
  }
}

/**
 * Log a create action
 */
export async function logCreate(
  userEmail: string,
  resourceType: string,
  resourceId: string,
  resourceName?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: 'create',
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    metadata
  });
}

/**
 * Log an update action with changes
 */
export async function logUpdate(
  userEmail: string,
  resourceType: string,
  resourceId: string,
  changes: Record<string, { old: any; new: any }>,
  resourceName?: string
): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: 'update',
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    changes
  });
}

/**
 * Log a delete action
 */
export async function logDelete(
  userEmail: string,
  resourceType: string,
  resourceId: string,
  resourceName?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: 'delete',
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    metadata
  });
}

/**
 * Log a login attempt
 */
export async function logLogin(
  userEmail: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: success ? 'login' : 'login_failed',
    resource_type: 'auth',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata
  });
}

/**
 * Log a logout
 */
export async function logLogout(userEmail: string): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: 'logout',
    resource_type: 'auth'
  });
}

/**
 * Log an export action
 */
export async function logExport(
  userEmail: string,
  resourceType: string,
  format: string,
  recordCount: number,
  filters?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: 'export',
    resource_type: resourceType,
    metadata: {
      format,
      record_count: recordCount,
      filters
    }
  });
}

/**
 * Log an approval action
 */
export async function logApproval(
  userEmail: string,
  resourceType: string,
  resourceId: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  await logAuditEvent({
    user_email: userEmail,
    action: approved ? 'approve' : 'reject',
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: reason ? { reason } : undefined
  });
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: {
  user_email?: string;
  action?: AuditAction;
  resource_type?: string;
  resource_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  try {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (filters.user_email) {
      sql += ' AND user_email = ?';
      params.push(filters.user_email);
    }

    if (filters.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.resource_type) {
      sql += ' AND resource_type = ?';
      params.push(filters.resource_type);
    }

    if (filters.resource_id) {
      sql += ' AND resource_id = ?';
      params.push(filters.resource_id);
    }

    if (filters.from_date) {
      sql += ' AND created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      sql += ' AND created_at <= ?';
      params.push(filters.to_date);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const results = await query(sql, params);
    return (results as any[]).map(row => ({
      ...row,
      changes: row.changes ? JSON.parse(row.changes) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Get audit history for a specific resource
 */
export async function getResourceHistory(
  resourceType: string,
  resourceId: string
): Promise<AuditLogEntry[]> {
  return getAuditLogs({
    resource_type: resourceType,
    resource_id: resourceId,
    limit: 100
  });
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(
  userEmail: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  return getAuditLogs({
    user_email: userEmail,
    limit
  });
}

/**
 * SQL to create audit_logs table
 */
export const CREATE_AUDIT_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(50),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  resource_name VARCHAR(255),
  changes JSON,
  metadata JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_email (user_email),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * SQL to create notifications table
 */
export const CREATE_NOTIFICATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_role VARCHAR(50),
  related_id VARCHAR(100),
  related_type VARCHAR(100),
  is_read TINYINT(1) DEFAULT 0,
  is_email_sent TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  INDEX idx_recipient (recipient_email),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
