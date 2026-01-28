/**
 * Tasks API - Secure CRUD operations for PMP database
 * Protected with authentication and input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch tasks with filtering (requires tasks.view permission)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const project_id = searchParams.get('project_id');
      const sprint_id = searchParams.get('sprint_id');
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const assignee_id = searchParams.get('assignee_id');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // If fetching a single task
      if (id) {
        const tasks = await query<Record<string, unknown>[]>(
          `SELECT t.*, p.name as project_name, p.code as project_code,
            ph.name as phase_name, s.name as sprint_name,
            (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id) as assignee_names
           FROM tasks t
           LEFT JOIN projects p ON t.project_id = p.id
           LEFT JOIN project_phases ph ON t.phase_id = ph.id
           LEFT JOIN sprints s ON t.sprint_id = s.id
           WHERE t.id = ? AND t.deleted_at IS NULL`,
          [id]
        );

        if (!tasks || tasks.length === 0) {
          return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }

        const task = tasks[0];

        // Fetch assignees
        const assignees = await query<Record<string, unknown>[]>(
          `SELECT ta.*, u.name as user_name, u.email as user_email, u.avatar
           FROM task_assignees ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = ?`,
          [id]
        );

        // Fetch checklists
        const checklists = await query<Record<string, unknown>[]>(
          `SELECT tc.*, u.name as completed_by_name
           FROM task_checklists tc
           LEFT JOIN users u ON tc.completed_by = u.id
           WHERE tc.task_id = ?
           ORDER BY tc.order_index`,
          [id]
        );

        // Fetch comments
        const comments = await query<Record<string, unknown>[]>(
          `SELECT c.*, u.name as user_name, u.avatar as user_avatar
           FROM task_comments c
           JOIN users u ON c.user_id = u.id
           WHERE c.task_id = ?
           ORDER BY c.created_at DESC`,
          [id]
        );

        return NextResponse.json({
          success: true,
          data: {
            ...task,
            labels: task.labels ? JSON.parse(task.labels as string) : [],
            assignees,
            checklists,
            comments
          }
        });
      }

      // Build query for listing tasks
      let sql = `
        SELECT t.*, p.name as project_name, p.code as project_code,
          ph.name as phase_name, s.name as sprint_name,
          (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id) as assignee_names,
          (SELECT u.name FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id LIMIT 1) as assignee_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN project_phases ph ON t.phase_id = ph.id
        LEFT JOIN sprints s ON t.sprint_id = s.id
        WHERE t.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];

      if (project_id) {
        sql += ` AND t.project_id = ?`;
        params.push(project_id);
      }

      if (sprint_id) {
        sql += ` AND t.sprint_id = ?`;
        params.push(sprint_id);
      }

      if (status && status !== 'all') {
        sql += ` AND t.status = ?`;
        params.push(status);
      }

      if (priority && priority !== 'all') {
        sql += ` AND t.priority = ?`;
        params.push(priority);
      }

      if (assignee_id) {
        sql += ` AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)`;
        params.push(assignee_id);
      }

      if (search) {
        sql += ` AND (t.title LIKE ? OR t.code LIKE ? OR t.description LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY t.priority = 'critical' DESC, t.priority = 'high' DESC, t.due_date ASC, t.created_at DESC`;
      
      // Get total count for pagination (with same filters)
      const countSql = sql.replace(/SELECT[\s\S]*?FROM tasks t/, 'SELECT COUNT(*) as total FROM tasks t');
      const countResult = await query<Record<string, unknown>[]>(countSql, params);
      const totalCount = Number(countResult[0]?.total || 0);
      const totalPages = Math.ceil(totalCount / limit);
      
      // Add pagination to the query
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit.toString(), offset.toString());

      const tasks = await query<Record<string, unknown>[]>(sql, params);

      // Get summary counts
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('todo', 'backlog') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status IN ('in_progress', 'in_review', 'testing') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('done', 'cancelled') THEN 1 ELSE 0 END) as overdue
        FROM tasks
        WHERE deleted_at IS NULL
      `);

      return NextResponse.json({
        success: true,
        data: tasks.map(t => ({
          ...t,
          labels: t.labels ? JSON.parse(t.labels as string) : [],
        })),
        summary: summaryResult[0],
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages
        }
      });
    } catch (error) {
      console.error('Tasks API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Create a new task (requires tasks.create permission)
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        project_id, phase_id, sprint_id, parent_task_id, title, description,
        status, priority, task_type, start_date, due_date, estimated_hours,
        story_points, labels, assignee_ids
      } = body;

      // Sanitize inputs
      const sanitizedTitle = sanitizeString(title);
      const sanitizedDescription = stripDangerousTags(description);

      if (!project_id || !sanitizedTitle) {
        return NextResponse.json({ success: false, error: 'Project ID and title are required' }, { status: 400 });
      }

      // Generate task code
      const codeResult = await query<{ max_num: number }[]>(
        `SELECT MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)) as max_num FROM tasks WHERE code LIKE 'TSK-%'`
      );
      const nextNum = (codeResult[0]?.max_num || 0) + 1;
      const code = `TSK-${String(nextNum).padStart(3, '0')}`;

      const result = await query<{ insertId: number }>(
        `INSERT INTO tasks (uuid, code, project_id, phase_id, sprint_id, parent_task_id, title, description, status, priority, task_type, start_date, due_date, estimated_hours, story_points, labels, created_by)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code, project_id, phase_id || null, sprint_id || null, parent_task_id || null,
          sanitizedTitle, sanitizedDescription || null,
          status || 'todo', priority || 'medium', task_type || 'task',
          start_date || null, due_date || null, estimated_hours || null,
          story_points || null, labels ? JSON.stringify(labels) : null, user.userId
        ]
      );

      const taskId = result.insertId;

      // Add assignees if provided
      if (assignee_ids && Array.isArray(assignee_ids) && assignee_ids.length > 0) {
        for (const userId of assignee_ids) {
          await query(
            `INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES (?, ?, ?)`,
            [taskId, userId, user.userId]
          );
        }
      }

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, task_id, action, entity_type, entity_id, description)
         VALUES (?, ?, ?, 'created', 'task', ?, ?)`,
        [user.userId, project_id, taskId, taskId, `Created task: ${sanitizedTitle}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: taskId, code, title: sanitizedTitle }
      }, { status: 201 });
    } catch (error) {
      console.error('Create task error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create task', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.create'] }
);

// PUT - Update a task (requires tasks.edit permission)
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        id, title, description, status, priority, task_type, phase_id, sprint_id,
        start_date, due_date, estimated_hours, actual_hours, story_points, progress,
        labels, assignee_ids
      } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedTitle = title ? sanitizeString(title) : null;
      const sanitizedDescription = description ? stripDangerousTags(description) : null;

      // Update completed_date if status is done
      let completedDate = null;
      if (status === 'done') {
        completedDate = new Date().toISOString().split('T')[0];
      }

      await query(
        `UPDATE tasks SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          task_type = COALESCE(?, task_type),
          phase_id = COALESCE(?, phase_id),
          sprint_id = COALESCE(?, sprint_id),
          start_date = COALESCE(?, start_date),
          due_date = COALESCE(?, due_date),
          estimated_hours = COALESCE(?, estimated_hours),
          actual_hours = COALESCE(?, actual_hours),
          story_points = COALESCE(?, story_points),
          progress = COALESCE(?, progress),
          labels = COALESCE(?, labels),
          completed_date = COALESCE(?, completed_date),
          updated_at = NOW()
         WHERE id = ?`,
        [
          sanitizedTitle, sanitizedDescription, status, priority, task_type, phase_id, sprint_id,
          start_date, due_date, estimated_hours, actual_hours, story_points, progress,
          labels ? JSON.stringify(labels) : null, completedDate, id
        ]
      );

      // Update assignees if provided
      if (assignee_ids && Array.isArray(assignee_ids)) {
        await query(`DELETE FROM task_assignees WHERE task_id = ?`, [id]);
        for (const userId of assignee_ids) {
          await query(
            `INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES (?, ?, ?)`,
            [id, userId, user.userId]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Task updated successfully' });
    } catch (error) {
      console.error('Update task error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PATCH - Bulk update tasks (for Kanban drag-drop)
export const PATCH = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { tasks } = body;

      if (!tasks || !Array.isArray(tasks)) {
        return NextResponse.json({ success: false, error: 'Tasks array is required' }, { status: 400 });
      }

      for (const task of tasks) {
        if (task.id && task.status) {
          let completedDate = null;
          if (task.status === 'done') {
            completedDate = new Date().toISOString().split('T')[0];
          }

          await query(
            `UPDATE tasks SET status = ?, order_index = ?, completed_date = COALESCE(?, completed_date), updated_at = NOW() WHERE id = ?`,
            [task.status, task.order_index || 0, completedDate, task.id]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Tasks updated successfully' });
    } catch (error) {
      console.error('Bulk update tasks error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update tasks', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Soft delete a task (requires tasks.delete permission)
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
      }

      // Get task info for logging
      const taskInfo = await query<{ project_id: number }[]>(
        `SELECT project_id FROM tasks WHERE id = ?`,
        [id]
      );

      await query(`UPDATE tasks SET deleted_at = NOW() WHERE id = ?`, [id]);

      // Log activity
      if (taskInfo && taskInfo.length > 0) {
        await query(
          `INSERT INTO activity_log (user_id, project_id, task_id, action, entity_type, entity_id, description)
           VALUES (?, ?, ?, 'deleted', 'task', ?, ?)`,
          [user.userId, taskInfo[0].project_id, id, id, `Deleted task`]
        );
      }

      return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Delete task error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete task', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);
