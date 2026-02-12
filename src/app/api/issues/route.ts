/**
 * Issues API - Department-based access control
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';
import { getAccessContext, buildEntityAccessFilter, canAccessProject } from '@/lib/project-access';

// GET
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const project_id = searchParams.get('project_id');
      const status = searchParams.get('status');
      const severity = searchParams.get('severity');

      if (id) {
        const issues = await query<any[]>(
          `SELECT i.*, p.name as project_name, p.code as project_code,
            t.title as task_name, t.task_key,
            r.title as risk_title, r.risk_key,
            u.name as reporter_name, a.name as assignee_name, o.name as owner_name
           FROM issues i
           JOIN projects p ON i.project_id = p.id
           LEFT JOIN tasks t ON i.task_id = t.id
           LEFT JOIN risks r ON i.risk_id = r.id
           LEFT JOIN users u ON i.reported_by = u.id
           LEFT JOIN users a ON i.assigned_to = a.id
           LEFT JOIN users o ON i.owner_id = o.id
           WHERE i.id = ? AND i.deleted_at IS NULL`, [id]
        );
        if (!issues.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        if (!canAccessProject(ctx, issues[0].project_id))
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        return NextResponse.json({ success: true, data: issues[0] });
      }

      const accessFilter = buildEntityAccessFilter(ctx, 'p');
      let sql = `
        SELECT i.*, p.name as project_name, p.code as project_code,
          t.task_key, u.name as reporter_name, a.name as assignee_name
        FROM issues i
        JOIN projects p ON i.project_id = p.id
        LEFT JOIN tasks t ON i.task_id = t.id
        LEFT JOIN users u ON i.reported_by = u.id
        LEFT JOIN users a ON i.assigned_to = a.id
        WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];

      if (project_id) { sql += ` AND i.project_id = ?`; params.push(project_id); }
      if (status && status !== 'all') { sql += ` AND i.status = ?`; params.push(status); }
      if (severity && severity !== 'all') { sql += ` AND i.severity = ?`; params.push(severity); }

      sql += ` ORDER BY i.severity = 'critical' DESC, i.severity = 'high' DESC, i.created_at DESC`;
      const issues = await query<any[]>(sql, params);

      // Summary
      const sumFilter = buildEntityAccessFilter(ctx, 'p');
      const summary = await query<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN i.status = 'open' THEN 1 ELSE 0 END) as open_issues,
          SUM(CASE WHEN i.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN i.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN i.status = 'closed' THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN i.severity = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN i.severity = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN i.severity = 'medium' THEN 1 ELSE 0 END) as medium
         FROM issues i JOIN projects p ON i.project_id = p.id
         WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND ${sumFilter.sql}`,
        [...sumFilter.params]
      );

      return NextResponse.json({ success: true, data: issues, summary: summary[0] });
    } catch (error) {
      console.error('Issues GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch issues' }, { status: 500 });
    }
  },
  { requiredPermissions: ['issues.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { project_id, task_id, risk_id, title, description, severity, priority, assigned_to, category } = body;

      if (!project_id || !sanitizeString(title))
        return NextResponse.json({ success: false, error: 'Project and title required' }, { status: 400 });
      if (!canAccessProject(ctx, project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const countRes = await query<any[]>(`SELECT COUNT(*) as cnt FROM issues WHERE project_id = ?`, [project_id]);
      const num = (countRes[0]?.cnt || 0) + 1;
      const [project] = await query<any[]>(`SELECT code FROM projects WHERE id = ?`, [project_id]);
      const issueKey = `${project?.code || 'ISS'}-I${num}`;

      const result = await query<any>(
        `INSERT INTO issues (issue_number, issue_key, project_id, task_id, risk_id, title, description, severity, priority, assigned_to, category, status, reported_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [num, issueKey, project_id, task_id || null, risk_id || null,
         sanitizeString(title), stripDangerousTags(description) || null,
         severity || 'medium', priority || 'medium',
         assigned_to || null, sanitizeString(category) || null, user.userId]
      );

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'created', 'issue', ?, ?)`,
        [user.userId, project_id, result.insertId, `Created issue: ${sanitizeString(title)}`]);

      return NextResponse.json({ success: true, data: { id: result.insertId, issue_key: issueKey } }, { status: 201 });
    } catch (error) {
      console.error('Issues POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create issue' }, { status: 500 });
    }
  },
  { requiredPermissions: ['issues.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, title, description, severity, priority, status, assigned_to, category, resolution_plan, resolution_notes } = body;

      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [issue] = await query<any[]>(`SELECT project_id FROM issues WHERE id = ? AND deleted_at IS NULL`, [id]);
      if (!issue) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, issue.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const updates: string[] = [];
      const params: any[] = [];
      const fields: [string, any][] = [
        ['title', title ? sanitizeString(title) : undefined],
        ['description', description !== undefined ? stripDangerousTags(description) : undefined],
        ['severity', severity], ['priority', priority], ['status', status],
        ['assigned_to', assigned_to], ['category', category ? sanitizeString(category) : undefined],
        ['resolution_plan', resolution_plan ? sanitizeString(resolution_plan) : undefined],
        ['resolution_notes', resolution_notes ? stripDangerousTags(resolution_notes) : undefined],
      ];
      for (const [field, value] of fields) {
        if (value !== undefined) { updates.push(`${field} = ?`); params.push(value); }
      }

      if (status === 'resolved' || status === 'closed') {
        updates.push('actual_resolution_date = NOW()');
      }

      if (updates.length) {
        updates.push('updated_at = NOW()');
        params.push(id);
        await query(`UPDATE issues SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      return NextResponse.json({ success: true, message: 'Issue updated' });
    } catch (error) {
      console.error('Issues PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update issue' }, { status: 500 });
    }
  },
  { requiredPermissions: ['issues.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [issue] = await query<any[]>(`SELECT project_id FROM issues WHERE id = ? AND deleted_at IS NULL`, [id]);
      if (!issue) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, issue.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(`UPDATE issues SET deleted_at = NOW() WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Issue deleted' });
    } catch (error) {
      console.error('Issues DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }
  },
  { requiredPermissions: ['issues.delete'] }
);
