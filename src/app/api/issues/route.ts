/**
 * Issues API - Secure CRUD operations for PMP database
 * Protected with authentication and input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch issues (requires issues.view permission)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const status = searchParams.get('status');
      const severity = searchParams.get('severity');

      let sql = `
        SELECT i.*, p.name as project_name, p.code as project_code,
          t.title as task_title, t.code as task_code,
          rep.name as reporter_name, asg.name as assignee_name
        FROM issues i
        LEFT JOIN projects p ON i.project_id = p.id
        LEFT JOIN tasks t ON i.task_id = t.id
        LEFT JOIN users rep ON i.reporter_id = rep.id
        LEFT JOIN users asg ON i.assignee_id = asg.id
        WHERE i.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];

      if (project_id) {
        sql += ` AND i.project_id = ?`;
        params.push(project_id);
      }

      if (status && status !== 'all') {
        sql += ` AND i.status = ?`;
        params.push(status);
      }

      if (severity && severity !== 'all') {
        sql += ` AND i.severity = ?`;
        params.push(severity);
      }

      sql += ` ORDER BY i.severity = 'critical' DESC, i.severity = 'high' DESC, i.created_at DESC`;

      const issues = await query<Record<string, unknown>[]>(sql, params);

      // Get summary
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('open', 'in_progress', 'reopened') THEN 1 ELSE 0 END) as open_issues,
          SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low
        FROM issues WHERE deleted_at IS NULL
      `);

      return NextResponse.json({
        success: true,
        data: issues,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Issues API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch issues', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['issues.view'], checkCsrf: false }
);

// POST - Create a new issue (requires issues.create permission)
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        project_id, task_id, title, description, category, status,
        severity, priority, assignee_id
      } = body;

      // Sanitize inputs
      const sanitizedTitle = sanitizeString(title);
      const sanitizedDescription = stripDangerousTags(description);

      if (!project_id || !sanitizedTitle) {
        return NextResponse.json({ success: false, error: 'Project ID and title are required' }, { status: 400 });
      }

      const result = await query<{ insertId: number }>(
        `INSERT INTO issues (uuid, project_id, task_id, title, description, category, status, severity, priority, reporter_id, assignee_id)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project_id, task_id || null, sanitizedTitle, sanitizedDescription || null,
          category || 'other', status || 'open',
          severity || 'medium', priority || 'medium',
          user.userId, assignee_id || null
        ]
      );

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'created', 'issue', ?, ?)`,
        [user.userId, project_id, result.insertId, `Created issue: ${sanitizedTitle}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, title: sanitizedTitle }
      }, { status: 201 });
    } catch (error) {
      console.error('Create issue error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create issue', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['issues.create'] }
);

// PUT - Update an issue (requires issues.edit permission)
export const PUT = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        id, title, description, category, status, severity, priority,
        assignee_id, resolution
      } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Issue ID is required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedTitle = title ? sanitizeString(title) : null;
      const sanitizedDescription = description ? stripDangerousTags(description) : null;
      const sanitizedResolution = resolution ? stripDangerousTags(resolution) : null;

      // Set resolved_date if status is resolved or closed
      let resolvedDate = null;
      if (status === 'resolved' || status === 'closed') {
        resolvedDate = new Date().toISOString().split('T')[0];
      }

      await query(
        `UPDATE issues SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          status = COALESCE(?, status),
          severity = COALESCE(?, severity),
          priority = COALESCE(?, priority),
          assignee_id = COALESCE(?, assignee_id),
          resolution = COALESCE(?, resolution),
          resolved_date = COALESCE(?, resolved_date),
          updated_at = NOW()
         WHERE id = ?`,
        [
          sanitizedTitle, sanitizedDescription, category, status, severity, priority,
          assignee_id, sanitizedResolution, resolvedDate, id
        ]
      );

      return NextResponse.json({ success: true, message: 'Issue updated successfully' });
    } catch (error) {
      console.error('Update issue error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update issue', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['issues.edit'] }
);

// DELETE - Soft delete an issue (requires issues.delete permission)
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Issue ID is required' }, { status: 400 });
      }

      // Get issue info for logging
      const issueInfo = await query<{ project_id: number }[]>(
        `SELECT project_id FROM issues WHERE id = ?`,
        [id]
      );

      await query(`UPDATE issues SET deleted_at = NOW() WHERE id = ?`, [id]);

      // Log activity
      if (issueInfo && issueInfo.length > 0) {
        await query(
          `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
           VALUES (?, ?, 'deleted', 'issue', ?, ?)`,
          [user.userId, issueInfo[0].project_id, id, `Deleted issue`]
        );
      }

      return NextResponse.json({ success: true, message: 'Issue deleted successfully' });
    } catch (error) {
      console.error('Delete issue error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete issue', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['issues.delete'] }
);
