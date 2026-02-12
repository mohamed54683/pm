/**
 * Tasks API - Department-based access control
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
      const sprint_id = searchParams.get('sprint_id');
      const assignee_id = searchParams.get('assignee_id');
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const type = searchParams.get('type');
      const search = searchParams.get('search');

      if (id) {
        const tasks = await query<any[]>(
          `SELECT t.*, p.name as project_name, p.code as project_code, p.department_id,
            s.name as sprint_name, ph.name as phase_name,
            parent.title as parent_title,
            GROUP_CONCAT(DISTINCT u.name) as assignee_names,
            GROUP_CONCAT(DISTINCT CONCAT(u.id, ':', u.name, ':', COALESCE(u.email,''))) as assignee_details
           FROM tasks t
           JOIN projects p ON t.project_id = p.id
           LEFT JOIN sprints s ON t.sprint_id = s.id
           LEFT JOIN project_phases ph ON t.phase_id = ph.id
           LEFT JOIN tasks parent ON t.parent_id = parent.id
           LEFT JOIN task_assignees ta ON t.id = ta.task_id
           LEFT JOIN users u ON ta.user_id = u.id
           WHERE t.id = ? AND t.deleted_at IS NULL
           GROUP BY t.id`, [id]
        );
        if (!tasks.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        if (!canAccessProject(ctx, tasks[0].project_id))
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        const task = tasks[0];
        const [comments, attachments, dependencies, subtasks] = await Promise.all([
          query<any[]>(`SELECT c.*, u.name as user_name, u.avatar FROM task_comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at DESC`, [id]),
          Promise.resolve([]),
          query<any[]>(`SELECT td.*, t.title as dep_name, t.status as dep_status FROM task_dependencies td JOIN tasks t ON td.depends_on_task_id = t.id WHERE td.task_id = ?`, [id]),
          query<any[]>(`SELECT id, title, task_key, status, priority FROM tasks WHERE parent_id = ? AND deleted_at IS NULL ORDER BY created_at`, [id]),
        ]);

        return NextResponse.json({
          success: true,
          data: { ...task, custom_fields: task.custom_fields ? JSON.parse(task.custom_fields) : {}, comments, attachments, dependencies, subtasks }
        });
      }

      // List
      const accessFilter = buildEntityAccessFilter(ctx, 'p');
      let sql = `
        SELECT t.id, t.task_number, t.task_key, t.title, t.type, t.status, t.priority, t.severity,
          t.story_points, t.estimated_hours, t.actual_hours, t.due_date, t.planned_start_date,
          t.project_id, t.sprint_id, t.phase_id, t.parent_id, t.progress_percentage, t.created_at, t.updated_at,
          p.name as project_name, p.code as project_code, p.department_id,
          s.name as sprint_name,
          GROUP_CONCAT(DISTINCT u.name) as assignee_names,
          GROUP_CONCAT(DISTINCT ta.user_id) as assignee_ids,
          (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_id = t.id AND sub.deleted_at IS NULL) as subtask_count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN sprints s ON t.sprint_id = s.id
        LEFT JOIN task_assignees ta ON t.id = ta.task_id
        LEFT JOIN users u ON ta.user_id = u.id
        WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];

      if (project_id) { sql += ` AND t.project_id = ?`; params.push(project_id); }
      if (sprint_id) { sql += ` AND t.sprint_id = ?`; params.push(sprint_id); }
      if (status && status !== 'all') { sql += ` AND t.status = ?`; params.push(status); }
      if (priority && priority !== 'all') { sql += ` AND t.priority = ?`; params.push(priority); }
      if (type && type !== 'all') { sql += ` AND t.type = ?`; params.push(type); }
      if (assignee_id) { sql += ` AND ta.user_id = ?`; params.push(assignee_id); }
      if (search) {
        sql += ` AND (t.title LIKE ? OR t.task_key LIKE ? OR t.description LIKE ?)`;
        const s = `%${search}%`; params.push(s, s, s);
      }
      sql += ` GROUP BY t.id ORDER BY t.updated_at DESC`;

      const tasks = await query<any[]>(sql, params);

      // Summary
      const sumFilter = buildEntityAccessFilter(ctx, 'p');
      const summary = await query<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN t.status = 'to_do' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN t.status = 'in_review' THEN 1 ELSE 0 END) as in_review,
          SUM(CASE WHEN t.priority = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('done','cancelled') THEN 1 ELSE 0 END) as overdue
         FROM tasks t JOIN projects p ON t.project_id = p.id
         WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL AND ${sumFilter.sql}`,
        [...sumFilter.params]
      );

      return NextResponse.json({ success: true, data: tasks, summary: summary[0] });
    } catch (error) {
      console.error('Tasks GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { title, description, project_id, sprint_id, phase_id, parent_id, type, status, priority, severity, story_points, estimated_hours, start_date, due_date, assignee_ids } = body;

      if (!sanitizeString(title)) return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
      if (!project_id) return NextResponse.json({ success: false, error: 'Project is required' }, { status: 400 });
      if (!canAccessProject(ctx, project_id))
        return NextResponse.json({ success: false, error: 'Access denied to project' }, { status: 403 });

      // Generate task key
      const [project] = await query<any[]>(`SELECT code FROM projects WHERE id = ?`, [project_id]);
      const taskCount = await query<any[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE project_id = ?`, [project_id]);
      const taskNum = (taskCount[0]?.cnt || 0) + 1;
      const taskKey = `${project?.code || 'TSK'}-${taskNum}`;

      const result = await query<any>(
        `INSERT INTO tasks (task_number, task_key, title, description, project_id, sprint_id, phase_id, parent_id, type, status, priority, severity, story_points, estimated_hours, planned_start_date, due_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [taskNum, taskKey, sanitizeString(title), stripDangerousTags(description) || null,
         project_id, sprint_id || null, phase_id || null, parent_id || null,
         type || 'task', status || 'to_do', priority || 'medium', severity || null,
         story_points || null, estimated_hours || null, start_date || null, due_date || null,
         user.userId]
      );

      const taskId = result.insertId;

      if (assignee_ids?.length) {
        const values = assignee_ids.map((aid: number) => `(${taskId}, ${aid})`).join(',');
        await query(`INSERT INTO task_assignees (task_id, user_id) VALUES ${values}`);
      }

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'created', 'task', ?, ?)`,
        [user.userId, project_id, taskId, `Created task: ${sanitizeString(title)}`]);

      return NextResponse.json({ success: true, data: { id: taskId, task_key: taskKey } }, { status: 201 });
    } catch (error) {
      console.error('Tasks POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, title, description, status, priority, severity, type, sprint_id, phase_id, parent_id, story_points, estimated_hours, actual_hours, start_date, due_date, progress_percentage, assignee_ids } = body;

      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [task] = await query<any[]>(`SELECT project_id FROM tasks WHERE id = ? AND deleted_at IS NULL`, [id]);
      if (!task) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, task.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const updates: string[] = [];
      const params: any[] = [];

      const fields: [string, any][] = [
        ['title', title ? sanitizeString(title) : undefined],
        ['description', description !== undefined ? stripDangerousTags(description) : undefined],
        ['status', status], ['priority', priority], ['severity', severity], ['type', type],
        ['sprint_id', sprint_id], ['phase_id', phase_id], ['parent_id', parent_id],
        ['story_points', story_points], ['estimated_hours', estimated_hours],
        ['actual_hours', actual_hours], ['planned_start_date', start_date], ['due_date', due_date],
        ['progress_percentage', progress_percentage],
      ];

      for (const [field, value] of fields) {
        if (value !== undefined) { updates.push(`${field} = ?`); params.push(value); }
      }

      if (updates.length) {
        updates.push('updated_at = NOW()');
        params.push(id);
        await query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      if (assignee_ids !== undefined) {
        await query(`DELETE FROM task_assignees WHERE task_id = ?`, [id]);
        if (assignee_ids.length) {
          const values = assignee_ids.map((aid: number) => `(${id}, ${aid})`).join(',');
          await query(`INSERT INTO task_assignees (task_id, user_id) VALUES ${values}`);
        }
      }

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'updated', 'task', ?, 'Updated task')`,
        [user.userId, task.project_id, id]);

      return NextResponse.json({ success: true, message: 'Task updated' });
    } catch (error) {
      console.error('Tasks PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [task] = await query<any[]>(`SELECT project_id FROM tasks WHERE id = ? AND deleted_at IS NULL`, [id]);
      if (!task) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, task.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(`UPDATE tasks SET deleted_at = NOW() WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Task deleted' });
    } catch (error) {
      console.error('Tasks DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);
