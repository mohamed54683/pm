/**
 * Report Versioning System
 * Tracks edit history and allows rollback
 */

import { query } from './db';

export interface ReportVersion {
  id: string;
  report_id: string;
  report_type: string;
  version_number: number;
  data: any;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

/**
 * Save a new version of a report
 */
export async function saveVersion(
  reportId: string,
  reportType: string,
  data: any,
  createdBy: string,
  changeSummary?: string
): Promise<string | null> {
  try {
    // Get the current highest version number
    const versions = await query(
      `SELECT MAX(version_number) as max_version FROM report_versions WHERE report_id = ?`,
      [reportId]
    );

    const maxVersion = (versions as any[])[0]?.max_version || 0;
    const newVersion = maxVersion + 1;
    const versionId = `ver-${reportId}-${newVersion}`;

    await query(
      `INSERT INTO report_versions
       (id, report_id, report_type, version_number, data, created_by, change_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        versionId,
        reportId,
        reportType,
        newVersion,
        JSON.stringify(data),
        createdBy,
        changeSummary || null
      ]
    );

    return versionId;
  } catch (error) {
    console.error('Error saving version:', error);
    return null;
  }
}

/**
 * Get all versions for a report
 */
export async function getVersionHistory(reportId: string): Promise<ReportVersion[]> {
  try {
    const versions = await query(
      `SELECT * FROM report_versions
       WHERE report_id = ?
       ORDER BY version_number DESC`,
      [reportId]
    );

    return (versions as any[]).map(v => ({
      ...v,
      data: v.data ? JSON.parse(v.data) : null
    }));
  } catch (error) {
    console.error('Error getting version history:', error);
    return [];
  }
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string): Promise<ReportVersion | null> {
  try {
    const versions = await query(
      `SELECT * FROM report_versions WHERE id = ?`,
      [versionId]
    );

    if (!Array.isArray(versions) || versions.length === 0) {
      return null;
    }

    const version = (versions as any[])[0];
    return {
      ...version,
      data: version.data ? JSON.parse(version.data) : null
    };
  } catch (error) {
    console.error('Error getting version:', error);
    return null;
  }
}

/**
 * Compare two versions
 */
export function compareVersions(
  oldVersion: any,
  newVersion: any
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  const allKeys = new Set([
    ...Object.keys(oldVersion || {}),
    ...Object.keys(newVersion || {})
  ]);

  for (const key of allKeys) {
    const oldVal = oldVersion?.[key];
    const newVal = newVersion?.[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return changes;
}

/**
 * SQL to create report_versions table
 */
export const CREATE_VERSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS report_versions (
  id VARCHAR(100) PRIMARY KEY,
  report_id VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  version_number INT NOT NULL,
  data JSON,
  created_by VARCHAR(255) NOT NULL,
  change_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_id (report_id),
  INDEX idx_version (report_id, version_number),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Data Retention Policy
 * Archive and delete old records based on policy
 */

export interface RetentionPolicy {
  tableName: string;
  retentionDays: number;
  archiveBeforeDelete: boolean;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { tableName: 'audit_logs', retentionDays: 365, archiveBeforeDelete: true },
  { tableName: 'notifications', retentionDays: 90, archiveBeforeDelete: false },
  { tableName: 'report_versions', retentionDays: 730, archiveBeforeDelete: true }, // 2 years
];

/**
 * Archive old records before deletion
 */
export async function archiveOldRecords(
  tableName: string,
  cutoffDate: string
): Promise<number> {
  try {
    // Create archive table if not exists
    await query(
      `CREATE TABLE IF NOT EXISTS ${tableName}_archive LIKE ${tableName}`,
      []
    );

    // Move old records to archive
    const result = await query(
      `INSERT INTO ${tableName}_archive SELECT * FROM ${tableName} WHERE created_at < ?`,
      [cutoffDate]
    );

    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error(`Error archiving ${tableName}:`, error);
    return 0;
  }
}

/**
 * Delete old records based on retention policy
 */
export async function deleteOldRecords(
  tableName: string,
  cutoffDate: string
): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM ${tableName} WHERE created_at < ?`,
      [cutoffDate]
    );

    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error(`Error deleting old ${tableName}:`, error);
    return 0;
  }
}

/**
 * Apply retention policy to a table
 */
export async function applyRetentionPolicy(policy: RetentionPolicy): Promise<{
  archived: number;
  deleted: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
  const cutoffString = cutoffDate.toISOString().split('T')[0];

  let archived = 0;
  let deleted = 0;

  if (policy.archiveBeforeDelete) {
    archived = await archiveOldRecords(policy.tableName, cutoffString);
  }

  deleted = await deleteOldRecords(policy.tableName, cutoffString);

  console.log(`Retention policy applied to ${policy.tableName}: ${archived} archived, ${deleted} deleted`);

  return { archived, deleted };
}

/**
 * Run all retention policies
 */
export async function runRetentionPolicies(
  policies: RetentionPolicy[] = DEFAULT_POLICIES
): Promise<void> {
  console.log('Starting data retention cleanup...');

  for (const policy of policies) {
    try {
      await applyRetentionPolicy(policy);
    } catch (error) {
      console.error(`Error applying retention policy for ${policy.tableName}:`, error);
    }
  }

  console.log('Data retention cleanup completed.');
}

/**
 * Get retention status for all tables
 */
export async function getRetentionStatus(): Promise<{
  tableName: string;
  totalRecords: number;
  oldRecords: number;
  retentionDays: number;
}[]> {
  const status = [];

  for (const policy of DEFAULT_POLICIES) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffString = cutoffDate.toISOString().split('T')[0];

      const [totalResult, oldResult] = await Promise.all([
        query(`SELECT COUNT(*) as count FROM ${policy.tableName}`, []),
        query(`SELECT COUNT(*) as count FROM ${policy.tableName} WHERE created_at < ?`, [cutoffString])
      ]);

      status.push({
        tableName: policy.tableName,
        totalRecords: (totalResult as any[])[0]?.count || 0,
        oldRecords: (oldResult as any[])[0]?.count || 0,
        retentionDays: policy.retentionDays
      });
    } catch (error) {
      // Table might not exist
      status.push({
        tableName: policy.tableName,
        totalRecords: 0,
        oldRecords: 0,
        retentionDays: policy.retentionDays
      });
    }
  }

  return status;
}
