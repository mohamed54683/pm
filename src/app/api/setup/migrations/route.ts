/**
 * Database Migrations API
 * Creates necessary tables for new features
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { CREATE_AUDIT_LOGS_TABLE, CREATE_NOTIFICATIONS_TABLE } from '@/lib/audit-log';
import { CREATE_VERSIONS_TABLE } from '@/lib/versioning';

const MIGRATIONS = [
  {
    name: 'create_audit_logs_table',
    sql: CREATE_AUDIT_LOGS_TABLE
  },
  {
    name: 'create_notifications_table',
    sql: CREATE_NOTIFICATIONS_TABLE
  },
  {
    name: 'create_report_versions_table',
    sql: CREATE_VERSIONS_TABLE
  },
  {
    name: 'add_status_to_quality_audits',
    sql: `ALTER TABLE quality_audits
          MODIFY COLUMN status ENUM('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'completed')
          DEFAULT 'completed'`
  },
  {
    name: 'add_status_to_training_audits',
    sql: `ALTER TABLE training_audits
          MODIFY COLUMN status ENUM('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'completed')
          DEFAULT 'completed'`
  },
  {
    name: 'add_status_to_reports',
    sql: `ALTER TABLE reports
          MODIFY COLUMN status ENUM('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'completed')
          DEFAULT 'completed'`
  },
  {
    name: 'create_migrations_table',
    sql: `CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  }
];

// Check if migration has been executed
async function isMigrationExecuted(name: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 1 FROM migrations WHERE name = ?`,
      [name]
    );
    return Array.isArray(result) && result.length > 0;
  } catch {
    return false;
  }
}

// Mark migration as executed
async function markMigrationExecuted(name: string): Promise<void> {
  try {
    await query(
      `INSERT INTO migrations (name) VALUES (?)`,
      [name]
    );
  } catch (error) {
    console.error(`Error marking migration ${name} as executed:`, error);
  }
}

// GET - Get migration status
export const GET = withAuth(
  async (_request: NextRequest, _user: DecodedToken): Promise<NextResponse> => {
    try {
      const status = [];

      for (const migration of MIGRATIONS) {
        const executed = await isMigrationExecuted(migration.name);
        status.push({
          name: migration.name,
          executed
        });
      }

      return NextResponse.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error('Error getting migration status:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['settings.edit'], checkCsrf: false }
);

// POST - Run migrations
export const POST = withAuth(
  async (_request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const results = [];

      // First, ensure migrations table exists
      const migrationsTableMigration = MIGRATIONS.find(m => m.name === 'create_migrations_table');
      if (migrationsTableMigration) {
        try {
          await query(migrationsTableMigration.sql, []);
        } catch (error) {
          // Table might already exist
        }
      }

      // Run each migration
      for (const migration of MIGRATIONS) {
        if (migration.name === 'create_migrations_table') {
          results.push({ name: migration.name, status: 'skipped', message: 'Already handled' });
          continue;
        }

        const executed = await isMigrationExecuted(migration.name);

        if (executed) {
          results.push({ name: migration.name, status: 'skipped', message: 'Already executed' });
          continue;
        }

        try {
          await query(migration.sql, []);
          await markMigrationExecuted(migration.name);
          results.push({ name: migration.name, status: 'success', message: 'Migration executed' });
        } catch (error: any) {
          // Some migrations might fail if column already exists, etc.
          results.push({
            name: migration.name,
            status: 'error',
            message: error.message || 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Migrations completed',
        data: results,
        executedBy: user.email
      });
    } catch (error: any) {
      console.error('Error running migrations:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['settings.edit'] }
);
