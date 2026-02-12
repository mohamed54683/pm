/**
 * Sprints API - Department-based access control
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

      if (id) {
        const sprints = await query<any[]>(
          `SELECT s.*, p.name as project_name, p.code as project_code, p.department_id,
            (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_tasks,
            (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_tasks,
            (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_points,
            (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_points,
            (SELECT SUM(estimated_hours) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_hours
           FROM sprints s
           JOIN projects p ON s.project_id = p.id
           WHERE s.id = ?`, [id]
        );
        if (!sprints.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        if (!canAccessProject(ctx, sprints[0].project_id))
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        const tasks = await query<any[]>(
          `SELECT t.id, t.task_key, t.name, t.type, t.status, t.priority, t.story_points,
            t.estimated_hours, t.actual_hours, t.due_date,
            GROUP_CONCAT(DISTINCT u.name) as assignee_names
           FROM tasks t
           LEFT JOIN task_assignees ta ON t.id = ta.task_id
           LEFT JOIN users u ON ta.user_id = u.id
           WHERE t.sprint_id = ? AND t.deleted_at IS NULL
           GROUP BY t.id
           ORDER BY t.priority = 'critical' DESC, t.priority = 'high' DESC, t.created_at`, [id]
        );

        return NextResponse.json({ success: true, data: { ...sprints[0], tasks } });
      }

      // List
      const accessFilter = buildEntityAccessFilter(ctx, 'p');
      let sql = `
        SELECT s.*, p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_tasks,
          (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_points,
          (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_points
        FROM sprints s
        JOIN projects p ON s.project_id = p.id
        WHERE p.deleted_at IS NULL AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];

      if (project_id) { sql += ` AND s.project_id = ?`; params.push(project_id); }
      if (status && status !== 'all') { sql += ` AND s.status = ?`; params.push(status); }

      sql += ` ORDER BY s.start_date DESC`;
      const sprints = await query<any[]>(sql, params);

      return NextResponse.json({ success: true, data: sprints });
    } catch (error) {
      console.error('Sprints GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch sprints' }, { status: 500 });
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { project_id, name, goal, start_date, end_date, capacity } = body;

      if (!project_id || !sanitizeString(name))
        return NextResponse.json({ success: false, error: 'Project and name required' }, { status: 400 });
      if (!canAccessProject(ctx, project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const result = await query<any>(
        `INSERT INTO sprints (project_id, name, goal, start_date, end_date, capacity_points, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'planning', ?)`,
        [project_id, sanitizeString(name), stripDangerousTags(goal) || null,
         start_date || null, end_date || null, body.capacity_points || null, user.userId]
      );

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'created', 'sprint', ?, ?)`,
        [user.userId, project_id, result.insertId, `Created sprint: ${sanitizeString(name)}`]);

      return NextResponse.json({ success: true, data: { id: result.insertId } }, { status: 201 });
    } catch (error) {
      console.error('Sprints POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create sprint' }, { status: 500 });
    }
  },
  { requiredPermissions: ['sprints.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, name, goal, status, start_date, end_date, capacity_points, capacity_hours, velocity, what_went_well, what_to_improve, retrospective_notes } = body;

      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [sprint] = await query<any[]>(`SELECT project_id FROM sprints WHERE id = ?`, [id]);
      if (!sprint) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, sprint.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const updates: string[] = [];
      const params: any[] = [];
      const fields: [string, any][] = [
        ['name', name ? sanitizeString(name) : undefined], ['goal', goal !== undefined ? stripDangerousTags(goal) : undefined],
        ['status', status], ['start_date', start_date], ['end_date', end_date],
        ['capacity_points', capacity_points], ['capacity_hours', capacity_hours], ['velocity', velocity],
        ['what_went_well', what_went_well ? stripDangerousTags(what_went_well) : undefined],
        ['what_to_improve', what_to_improve ? stripDangerousTags(what_to_improve) : undefined],
        ['retrospective_notes', retrospective_notes ? stripDangerousTags(retrospective_notes) : undefined],
      ];
      for (const [field, value] of fields) {
        if (value !== undefined) { updates.push(`${field} = ?`); params.push(value); }
      }

      if (status === 'active') { updates.push('actual_start_date = COALESCE(actual_start_date, NOW())'); }
      if (status === 'completed') { updates.push('actual_end_date = NOW()'); }

      if (updates.length) {
        updates.push('updated_at = NOW()');
        params.push(id);
        await query(`UPDATE sprints SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      return NextResponse.json({ success: true, message: 'Sprint updated' });
    } catch (error) {
      console.error('Sprints PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update sprint' }, { status: 500 });
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [sprint] = await query<any[]>(`SELECT project_id FROM sprints WHERE id = ?`, [id]);
      if (!sprint) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, sprint.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(`UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?`, [id]);
      await query(`DELETE FROM sprints WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Sprint deleted' });
    } catch (error) {
      console.error('Sprints DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete sprint' }, { status: 500 });
    }
  },
  { requiredPermissions: ['sprints.delete'] }
);
