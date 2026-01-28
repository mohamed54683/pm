/**
 * Resources API - Secure read operations for PMP database
 * Protected with authentication - returns team members and workload
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

// GET - Fetch team members with workload (requires view permission)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const role = searchParams.get('role');

      let sql = `
        SELECT
          u.id, u.uuid, u.name, u.email, u.avatar, u.phone, u.status,
          u.created_at,
          COALESCE(r.name, 'Viewer') as roles,
          (SELECT COUNT(*) FROM task_assignees ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = u.id AND t.deleted_at IS NULL AND t.status NOT IN ('done', 'cancelled')) as assigned_tasks,
          (SELECT COUNT(*) FROM task_assignees ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = u.id AND t.status = 'in_progress' AND t.deleted_at IS NULL) as in_progress_tasks,
          (SELECT COALESCE(SUM(t.estimated_hours), 0) FROM task_assignees ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = u.id AND t.deleted_at IS NULL AND t.status NOT IN ('done', 'cancelled')) as total_estimated_hours
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];

      if (status && status !== 'all') {
        sql += ` AND u.status = ?`;
        params.push(status);
      }

      if (role && role !== 'all') {
        sql += ` AND r.name = ?`;
        params.push(role);
      }

      sql += ` ORDER BY u.name ASC`;

      const users = await query<Record<string, unknown>[]>(sql, params);

      return NextResponse.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Resources API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch resources', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);
