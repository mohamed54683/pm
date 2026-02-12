/**
 * Sprint Tasks API - Manage tasks within a sprint
 * Add/remove tasks, update order, manage scope
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

// GET - Get all tasks in sprint
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const groupBy = searchParams.get('group_by'); // 'status', 'priority', 'type', 'assignee'

      // Get sprint
      const sprintResult = await query<{ id: number; scope_locked: boolean }[]>(
        `SELECT id, scope_locked FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      let sql = `
        SELECT t.id, t.uuid, t.task_key, t.title, t.description, t.status, t.priority, t.type,
          t.story_points, t.estimated_hours, t.actual_hours, t.blocked_reason, t.blocked_by,
          t.order_index, t.due_date, t.acceptance_criteria,
          u.id as assignee_id, u.first_name as assignee_first_name, u.last_name as assignee_last_name,
          u.avatar_url as assignee_avatar
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.sprint_id = ? AND t.deleted_at IS NULL
      `;
      const params_query: (string | number)[] = [sprint.id];

      if (status && status !== 'all') {
        sql += ` AND t.status = ?`;
        params_query.push(status);
      }

      sql += ` ORDER BY t.order_index, t.id`;

      const tasks = await query<Record<string, unknown>[]>(sql, params_query);

      // Calculate summary
      const summary = {
        total: tasks.length,
        by_status: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
        total_points: 0,
        completed_points: 0,
        blocked_count: 0
      };

      tasks.forEach((task: Record<string, unknown>) => {
        const taskStatus = task.status as string;
        const priority = task.priority as string;
        summary.by_status[taskStatus] = (summary.by_status[taskStatus] || 0) + 1;
        summary.by_priority[priority] = (summary.by_priority[priority] || 0) + 1;
        summary.total_points += (task.story_points as number) || 0;
        if (taskStatus === 'done') {
          summary.completed_points += (task.story_points as number) || 0;
        }
        if (task.blocked_reason) {
          summary.blocked_count++;
        }
      });

      // Group tasks if requested
      let groupedTasks = null;
      if (groupBy) {
        groupedTasks = {} as Record<string, unknown[]>;
        tasks.forEach((task: Record<string, unknown>) => {
          let key: string;
          switch (groupBy) {
            case 'status':
              key = task.status as string;
              break;
            case 'priority':
              key = task.priority as string;
              break;
            case 'type':
              key = task.type as string;
              break;
            case 'assignee':
              key = task.assignee_id ? `${task.assignee_first_name} ${task.assignee_last_name}` : 'Unassigned';
              break;
            default:
              key = 'all';
          }
          if (!groupedTasks![key]) {
            groupedTasks![key] = [];
          }
          groupedTasks![key].push(task);
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          tasks: groupedTasks || tasks,
          summary,
          scope_locked: sprint.scope_locked
        }
      });
    } catch (error) {
      console.error('Get sprint tasks error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sprint tasks', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

// POST - Add tasks to sprint
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { task_ids } = body; // Array of task IDs to add

      if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Task IDs are required' }, { status: 400 });
      }

      // Get sprint
      const sprintResult = await query<{ id: number; scope_locked: boolean; status: string; project_id: number }[]>(
        `SELECT id, scope_locked, status, project_id FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      // Check if scope is locked
      if (sprint.scope_locked) {
        return NextResponse.json({ success: false, error: 'Sprint scope is locked' }, { status: 400 });
      }

      // Get max order index
      const maxOrderResult = await query<{ max_order: number }[]>(
        `SELECT COALESCE(MAX(order_index), 0) as max_order FROM tasks WHERE sprint_id = ?`,
        [sprint.id]
      );
      let orderIndex = maxOrderResult[0].max_order;

      // Add tasks to sprint
      for (const taskId of task_ids) {
        orderIndex++;
        await query(
          `UPDATE tasks SET sprint_id = ?, order_index = ? WHERE id = ? AND deleted_at IS NULL`,
          [sprint.id, orderIndex, taskId]
        );

        // Log activity
        await query(`
          INSERT INTO sprint_activity_log (sprint_id, user_id, action, entity_type, entity_id, description)
          VALUES (?, ?, 'task_added', 'task', ?, 'Task added to sprint')
        `, [sprint.id, user.userId, taskId]);
      }

      // Update committed points
      await query(`
        UPDATE sprints SET 
          committed_points = (SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL),
          committed_hours = (SELECT COALESCE(SUM(estimated_hours), 0) FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL)
        WHERE id = ?
      `, [sprint.id, sprint.id, sprint.id]);

      return NextResponse.json({ 
        success: true, 
        message: `${task_ids.length} task(s) added to sprint` 
      });
    } catch (error) {
      console.error('Add tasks to sprint error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add tasks to sprint', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);

// PUT - Update task order or move between statuses
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { task_id, new_order, new_status } = body;

      // Get sprint
      const sprintResult = await query<{ id: number }[]>(
        `SELECT id FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      if (task_id && new_order !== undefined) {
        // Update order
        await query(`UPDATE tasks SET order_index = ? WHERE id = ? AND sprint_id = ?`, 
          [new_order, task_id, sprint.id]);
      }

      if (task_id && new_status) {
        // Update status and log
        await query(`UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ? AND sprint_id = ?`,
          [new_status, task_id, sprint.id]);

        // If completed, update sprint completed points
        if (new_status === 'done') {
          await query(`
            UPDATE sprints SET 
              completed_points = (SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE sprint_id = ? AND status = 'done' AND deleted_at IS NULL),
              completed_hours = (SELECT COALESCE(SUM(actual_hours), 0) FROM tasks WHERE sprint_id = ? AND status = 'done' AND deleted_at IS NULL)
            WHERE id = ?
          `, [sprint.id, sprint.id, sprint.id]);
        }
      }

      return NextResponse.json({ success: true, message: 'Task updated' });
    } catch (error) {
      console.error('Update sprint task error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);

// DELETE - Remove tasks from sprint
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const taskIds = searchParams.get('task_ids')?.split(',').map(Number);

      if (!taskIds || taskIds.length === 0) {
        return NextResponse.json({ success: false, error: 'Task IDs are required' }, { status: 400 });
      }

      // Get sprint
      const sprintResult = await query<{ id: number; scope_locked: boolean }[]>(
        `SELECT id, scope_locked FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      // Check if scope is locked
      if (sprint.scope_locked) {
        return NextResponse.json({ success: false, error: 'Sprint scope is locked' }, { status: 400 });
      }

      // Remove tasks from sprint (move to backlog)
      for (const taskId of taskIds) {
        await query(`UPDATE tasks SET sprint_id = NULL WHERE id = ? AND sprint_id = ?`, [taskId, sprint.id]);

        // Log activity
        await query(`
          INSERT INTO sprint_activity_log (sprint_id, user_id, action, entity_type, entity_id, description)
          VALUES (?, ?, 'task_removed', 'task', ?, 'Task removed from sprint')
        `, [sprint.id, user.userId, taskId]);
      }

      // Update committed points
      await query(`
        UPDATE sprints SET 
          committed_points = (SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL),
          committed_hours = (SELECT COALESCE(SUM(estimated_hours), 0) FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL)
        WHERE id = ?
      `, [sprint.id, sprint.id, sprint.id]);

      return NextResponse.json({ 
        success: true, 
        message: `${taskIds.length} task(s) removed from sprint` 
      });
    } catch (error) {
      console.error('Remove tasks from sprint error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to remove tasks from sprint', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);
