/**
 * Tasks API - CRUD operations for project tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { TaskFormData, TaskStatus } from '@/types/projects';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch tasks with filtering
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const project_id = searchParams.get('project_id');
      const phase_id = searchParams.get('phase_id');
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const assignee_id = searchParams.get('assignee_id');
      const search = searchParams.get('search');
      const is_overdue = searchParams.get('is_overdue') === 'true';
      const parent_task_id = searchParams.get('parent_task_id');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Fetch single task with full details
      if (id) {
        const tasks = await query<any[]>(
          `SELECT t.*, p.name as project_name, ph.name as phase_name
           FROM tasks t
           LEFT JOIN projects p ON t.project_id = p.id
           LEFT JOIN project_phases ph ON t.phase_id = ph.id
           WHERE t.id = ?`,
          [id]
        );

        if (!tasks || tasks.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Task not found' },
            { status: 404 }
          );
        }

        const task = tasks[0];

        // Fetch assignees
        const assignees = await query<any[]>(
          `SELECT ta.*, u.name as user_name, u.email as user_email
           FROM task_assignees ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = ?`,
          [id]
        );

        // Fetch checklists
        const checklists = await query<any[]>(
          `SELECT tc.*, u.name as completed_by_name
           FROM task_checklists tc
           LEFT JOIN users u ON tc.completed_by = u.id
           WHERE tc.task_id = ?
           ORDER BY tc.order_index`,
          [id]
        );

        // Fetch subtasks
        const subtasks = await query<any[]>(
          `SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY order_index`,
          [id]
        );

        // Fetch dependencies
        const dependencies = await query<any[]>(
          `SELECT td.*, t.title as depends_on_task_title
           FROM task_dependencies td
           JOIN tasks t ON td.depends_on_task_id = t.id
           WHERE td.task_id = ?`,
          [id]
        );

        // Fetch comments count
        const commentsResult = await query<any[]>(
          'SELECT COUNT(*) as count FROM project_comments WHERE task_id = ?',
          [id]
        );

        // Fetch attachments count
        const attachmentsResult = await query<any[]>(
          'SELECT COUNT(*) as count FROM project_attachments WHERE task_id = ?',
          [id]
        );

        return NextResponse.json({
          success: true,
          data: {
            ...task,
            tags: task.tags ? JSON.parse(task.tags) : [],
            recurrence_pattern: task.recurrence_pattern ? JSON.parse(task.recurrence_pattern) : null,
            assignees,
            checklists,
            subtasks,
            dependencies,
            comments_count: commentsResult[0]?.count || 0,
            attachments_count: attachmentsResult[0]?.count || 0
          }
        });
      }

      // Build query for listing tasks
      let sql = `
        SELECT t.*, p.name as project_name, ph.name as phase_name,
          (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') 
           FROM task_assignees ta 
           JOIN users u ON ta.user_id = u.id 
           WHERE ta.task_id = t.id) as assignee_names,
          (SELECT COUNT(*) FROM task_checklists WHERE task_id = t.id) as checklist_count,
          (SELECT COUNT(*) FROM task_checklists WHERE task_id = t.id AND is_completed = TRUE) as completed_checklist_count
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN project_phases ph ON t.phase_id = ph.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (project_id) {
        sql += ` AND t.project_id = ?`;
        params.push(project_id);
      }

      if (phase_id) {
        sql += ` AND t.phase_id = ?`;
        params.push(phase_id);
      }

      if (parent_task_id) {
        sql += ` AND t.parent_task_id = ?`;
        params.push(parent_task_id);
      } else if (!id) {
        // By default, only fetch top-level tasks (not subtasks)
        sql += ` AND t.parent_task_id IS NULL`;
      }

      if (status) {
        const statuses = status.split(',');
        sql += ` AND t.status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      }

      if (priority) {
        const priorities = priority.split(',');
        sql += ` AND t.priority IN (${priorities.map(() => '?').join(',')})`;
        params.push(...priorities);
      }

      if (assignee_id) {
        sql += ` AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)`;
        params.push(assignee_id);
      }

      if (search) {
        sql += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      if (is_overdue) {
        sql += ` AND t.due_date < CURDATE() AND t.status NOT IN ('completed', 'cancelled')`;
      }

      // Count total
      const countSql = sql.replace(/SELECT.*FROM tasks t/, 'SELECT COUNT(*) as total FROM tasks t');
      const countResult = await query<any[]>(countSql, params);
      const total = countResult[0]?.total || 0;

      // Add sorting and pagination
      sql += ` ORDER BY t.order_index, t.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const tasks = await query<any[]>(sql, params);

      const formattedTasks = tasks.map((t: any) => ({
        ...t,
        tags: t.tags ? JSON.parse(t.tags) : []
      }));

      return NextResponse.json({
        success: true,
        data: formattedTasks,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      });

    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Create a new task
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, assignee_ids, ...taskData } = body as { 
        project_id: string; 
        assignee_ids?: number[];
      } & TaskFormData;

      if (!project_id) {
        return NextResponse.json(
          { success: false, error: 'Project ID is required' },
          { status: 400 }
        );
      }

      if (!taskData.title) {
        return NextResponse.json(
          { success: false, error: 'Task title is required' },
          { status: 400 }
        );
      }

      // Get max order index for the phase/project
      const orderQuery = taskData.phase_id
        ? 'SELECT MAX(order_index) as max_order FROM tasks WHERE phase_id = ?'
        : 'SELECT MAX(order_index) as max_order FROM tasks WHERE project_id = ? AND phase_id IS NULL';
      const orderParams = taskData.phase_id ? [taskData.phase_id] : [project_id];
      const maxOrder = await query<any[]>(orderQuery, orderParams);
      const orderIndex = (maxOrder[0]?.max_order || 0) + 1;

      const id = generateId('task');

      await query(
        `INSERT INTO tasks (
          id, project_id, phase_id, parent_task_id, title, description,
          status, priority, task_type, start_date, due_date,
          estimated_hours, order_index, is_recurring, recurrence_pattern,
          tags, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          project_id,
          taskData.phase_id || null,
          taskData.parent_task_id || null,
          taskData.title,
          taskData.description || null,
          taskData.status || 'not_started',
          taskData.priority || 'medium',
          taskData.task_type || 'task',
          taskData.start_date || null,
          taskData.due_date || null,
          taskData.estimated_hours || null,
          orderIndex,
          taskData.is_recurring || false,
          taskData.recurrence_pattern ? JSON.stringify(taskData.recurrence_pattern) : null,
          taskData.tags ? JSON.stringify(taskData.tags) : null,
          user.email
        ]
      );

      // Assign users to task
      if (assignee_ids && assignee_ids.length > 0) {
        for (const userId of assignee_ids) {
          await query(
            `INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES (?, ?, ?)`,
            [id, userId, user.userId]
          );

          // Create notification for assignee
          await query(
            `INSERT INTO project_notifications (id, user_id, project_id, task_id, type, title, message)
             VALUES (?, ?, ?, ?, 'task_assigned', ?, ?)`,
            [
              generateId('notif'),
              userId,
              project_id,
              id,
              'New Task Assigned',
              `You have been assigned to task: ${taskData.title}`
            ]
          );
        }
      }

      // Log activity
      await query(
        `INSERT INTO project_activity_log (id, project_id, phase_id, task_id, user_id, action, entity_type, entity_id, description)
         VALUES (?, ?, ?, ?, ?, 'create', 'task', ?, ?)`,
        [generateId('log'), project_id, taskData.phase_id || null, id, user.userId, id, `Created task: ${taskData.title}`]
      );

      return NextResponse.json({
        success: true,
        data: { id },
        message: 'Task created successfully'
      });

    } catch (error: any) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.create'] }
);

// PUT - Update a task
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, assignee_ids, ...updates } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required' },
          { status: 400 }
        );
      }

      // Check if task exists
      const existing = await query<any[]>('SELECT * FROM tasks WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        );
      }

      const oldTask = existing[0];

      const updateFields: string[] = [];
      const params: any[] = [];

      const allowedFields = [
        'title', 'description', 'phase_id', 'parent_task_id',
        'status', 'priority', 'task_type', 'start_date', 'due_date',
        'actual_start_date', 'completed_date', 'estimated_hours', 'actual_hours',
        'progress_percentage', 'order_index', 'is_recurring'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }

      if (updates.tags !== undefined) {
        updateFields.push('tags = ?');
        params.push(JSON.stringify(updates.tags));
      }

      if (updates.recurrence_pattern !== undefined) {
        updateFields.push('recurrence_pattern = ?');
        params.push(JSON.stringify(updates.recurrence_pattern));
      }

      // Handle status change to completed
      if (updates.status === 'completed' && oldTask.status !== 'completed') {
        updateFields.push('completed_date = CURDATE()');
      }

      if (updateFields.length > 0) {
        params.push(id);
        await query(
          `UPDATE tasks SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );
      }

      // Update assignees if provided
      if (assignee_ids !== undefined) {
        // Remove existing assignees
        await query('DELETE FROM task_assignees WHERE task_id = ?', [id]);
        
        // Add new assignees
        for (const userId of assignee_ids) {
          await query(
            `INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES (?, ?, ?)`,
            [id, userId, user.userId]
          );
        }
      }

      // Update phase and project progress
      if (updates.status || updates.progress_percentage !== undefined) {
        await updatePhaseProgress(oldTask.phase_id);
        await updateProjectProgress(oldTask.project_id);
      }

      // Log activity
      await query(
        `INSERT INTO project_activity_log (id, project_id, task_id, user_id, action, entity_type, entity_id, old_value, new_value, description)
         VALUES (?, ?, ?, ?, 'update', 'task', ?, ?, ?, ?)`,
        [
          generateId('log'),
          oldTask.project_id,
          id,
          user.userId,
          id,
          JSON.stringify({ status: oldTask.status }),
          JSON.stringify({ status: updates.status }),
          'Updated task'
        ]
      );

      // Notify on status change
      if (updates.status && updates.status !== oldTask.status) {
        await notifyStatusChange(id, oldTask, updates.status);
      }

      return NextResponse.json({
        success: true,
        message: 'Task updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Delete a task
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required' },
          { status: 400 }
        );
      }

      const existing = await query<any[]>('SELECT * FROM tasks WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        );
      }

      await query('DELETE FROM tasks WHERE id = ?', [id]);

      // Update progress
      await updatePhaseProgress(existing[0].phase_id);
      await updateProjectProgress(existing[0].project_id);

      return NextResponse.json({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);

// Helper functions
async function updatePhaseProgress(phaseId: string | null): Promise<void> {
  if (!phaseId) return;

  const result = await query<any[]>(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM tasks WHERE phase_id = ?`,
    [phaseId]
  );

  if (result && result.length > 0 && result[0].total > 0) {
    const progress = (result[0].completed / result[0].total) * 100;
    await query(
      'UPDATE project_phases SET progress_percentage = ? WHERE id = ?',
      [progress, phaseId]
    );
  }
}

async function updateProjectProgress(projectId: string): Promise<void> {
  const result = await query<any[]>(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM tasks WHERE project_id = ?`,
    [projectId]
  );

  if (result && result.length > 0 && result[0].total > 0) {
    const progress = (result[0].completed / result[0].total) * 100;
    await query(
      'UPDATE projects SET progress_percentage = ? WHERE id = ?',
      [progress, projectId]
    );
  }
}

async function notifyStatusChange(taskId: string, task: any, newStatus: TaskStatus): Promise<void> {
  // Get all assignees
  const assignees = await query<any[]>(
    'SELECT user_id FROM task_assignees WHERE task_id = ?',
    [taskId]
  );

  for (const assignee of assignees) {
    await query(
      `INSERT INTO project_notifications (id, user_id, project_id, task_id, type, title, message)
       VALUES (?, ?, ?, ?, 'status_change', ?, ?)`,
      [
        generateId('notif'),
        assignee.user_id,
        task.project_id,
        taskId,
        'Task Status Updated',
        `Task "${task.title}" status changed to ${newStatus}`
      ]
    );
  }
}
