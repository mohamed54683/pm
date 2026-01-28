/**
 * Sprints API - Secure CRUD operations for PMP database
 * Protected with authentication and input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch sprints (requires sprints.view permission)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const status = searchParams.get('status');

      let sql = `
        SELECT s.*, p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
          (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_points,
          (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_points
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (project_id) {
        sql += ` AND s.project_id = ?`;
        params.push(project_id);
      }

      if (status && status !== 'all') {
        sql += ` AND s.status = ?`;
        params.push(status);
      }

      sql += ` ORDER BY s.status = 'active' DESC, s.start_date DESC`;

      const sprints = await query<Record<string, unknown>[]>(sql, params);

      // Get summary
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning
        FROM sprints
      `);

      return NextResponse.json({
        success: true,
        data: sprints,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Sprints API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sprints', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

// POST - Create a new sprint (requires sprints.create permission)
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, name, goal, status, start_date, end_date, capacity } = body;

      // Sanitize inputs
      const sanitizedName = sanitizeString(name);
      const sanitizedGoal = stripDangerousTags(goal);

      if (!project_id || !sanitizedName) {
        return NextResponse.json({ success: false, error: 'Project ID and name are required' }, { status: 400 });
      }

      const result = await query<{ insertId: number }>(
        `INSERT INTO sprints (uuid, project_id, name, goal, status, start_date, end_date, capacity)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
        [project_id, sanitizedName, sanitizedGoal || null, status || 'planning', start_date || null, end_date || null, capacity || null]
      );

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'created', 'sprint', ?, ?)`,
        [user.userId, project_id, result.insertId, `Created sprint: ${sanitizedName}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, name: sanitizedName }
      }, { status: 201 });
    } catch (error) {
      console.error('Create sprint error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create sprint', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.create'] }
);

// PUT - Update a sprint (requires sprints.edit permission)
export const PUT = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, name, goal, status, start_date, end_date, velocity, capacity } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Sprint ID is required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedName = name ? sanitizeString(name) : null;
      const sanitizedGoal = goal ? stripDangerousTags(goal) : null;

      await query(
        `UPDATE sprints SET
          name = COALESCE(?, name),
          goal = COALESCE(?, goal),
          status = COALESCE(?, status),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          velocity = COALESCE(?, velocity),
          capacity = COALESCE(?, capacity),
          updated_at = NOW()
         WHERE id = ?`,
        [sanitizedName, sanitizedGoal, status, start_date, end_date, velocity, capacity, id]
      );

      return NextResponse.json({ success: true, message: 'Sprint updated successfully' });
    } catch (error) {
      console.error('Update sprint error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update sprint', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);

// DELETE - Soft delete a sprint (requires sprints.delete permission)
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Sprint ID is required' }, { status: 400 });
      }

      // Get sprint info for logging
      const sprintInfo = await query<{ project_id: number }[]>(
        `SELECT project_id FROM sprints WHERE id = ?`,
        [id]
      );

      // Move tasks back to backlog (remove sprint assignment)
      await query(`UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?`, [id]);

      // Soft delete sprint (add deleted_at column if it exists, otherwise hard delete)
      // For now, using hard delete as sprints table may not have deleted_at
      await query(`DELETE FROM sprints WHERE id = ?`, [id]);

      // Log activity
      if (sprintInfo && sprintInfo.length > 0) {
        await query(
          `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
           VALUES (?, ?, 'deleted', 'sprint', ?, ?)`,
          [user.userId, sprintInfo[0].project_id, id, `Deleted sprint`]
        );
      }

      return NextResponse.json({ success: true, message: 'Sprint deleted successfully' });
    } catch (error) {
      console.error('Delete sprint error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete sprint', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.delete'] }
);
