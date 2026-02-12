/**
 * Backlog API - Manage product backlog items
 * Unassigned tasks, prioritization, bulk operations, refinement
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

interface BacklogItem {
  id: number;
  uuid: string;
  task_key: string;
  title: string;
  description: string;
  refinement_notes: string | null;
  acceptance_criteria: string | null;
  type: string;
  status: string;
  priority: string;
  story_points: number | null;
  estimated_hours: number | null;
  backlog_order: number;
  project_id: number;
  project_name: string;
  project_code: string;
  assignee_id: number | null;
  assignee_first_name: string | null;
  assignee_last_name: string | null;
  labels: string | null;
  created_at: string;
}

// GET - Get backlog items (tasks not assigned to any sprint)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get('project_id');
      const priority = searchParams.get('priority');
      const type = searchParams.get('type');
      const assigneeId = searchParams.get('assignee_id');
      const search = searchParams.get('search');
      const sortBy = searchParams.get('sort_by') || 'backlog_order'; // backlog_order, priority, created_at, story_points
      const limit = parseInt(searchParams.get('limit') || '100');
      const offset = parseInt(searchParams.get('offset') || '0');

      let sql = `
        SELECT t.id, t.uuid, t.task_key, t.title, t.description, t.refinement_notes, t.acceptance_criteria,
          t.type, t.status, t.priority, t.story_points, t.estimated_hours, t.backlog_order,
          t.project_id, p.name as project_name, p.code as project_code,
          t.assignee_id, u.first_name as assignee_first_name, u.last_name as assignee_last_name,
          t.labels, t.created_at
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.sprint_id IS NULL AND t.deleted_at IS NULL AND t.status != 'done'
      `;
      const params: (string | number)[] = [];

      if (projectId) {
        sql += ` AND t.project_id = ?`;
        params.push(projectId);
      }

      if (priority && priority !== 'all') {
        sql += ` AND t.priority = ?`;
        params.push(priority);
      }

      if (type && type !== 'all') {
        sql += ` AND t.type = ?`;
        params.push(type);
      }

      if (assigneeId) {
        if (assigneeId === 'unassigned') {
          sql += ` AND t.assignee_id IS NULL`;
        } else {
          sql += ` AND t.assignee_id = ?`;
          params.push(assigneeId);
        }
      }

      if (search) {
        sql += ` AND (t.title LIKE ? OR t.task_key LIKE ? OR t.description LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Sorting
      const orderMap: Record<string, string> = {
        backlog_order: 't.backlog_order ASC, t.id ASC',
        priority: "FIELD(t.priority, 'critical', 'high', 'medium', 'low'), t.backlog_order ASC",
        created_at: 't.created_at DESC',
        story_points: 't.story_points DESC NULLS LAST, t.backlog_order ASC'
      };
      sql += ` ORDER BY ${orderMap[sortBy] || orderMap.backlog_order}`;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const items = await query<BacklogItem[]>(sql, params);

      // Get total count
      let countSql = `
        SELECT COUNT(*) as total
        FROM tasks t
        WHERE t.sprint_id IS NULL AND t.deleted_at IS NULL AND t.status != 'done'
      `;
      const countParams: (string | number)[] = [];
      
      if (projectId) {
        countSql += ` AND t.project_id = ?`;
        countParams.push(projectId);
      }

      const countResult = await query<{ total: number }[]>(countSql, countParams);

      // Summary statistics
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(story_points), 0) as total_points,
          SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
          SUM(CASE WHEN story_points IS NULL THEN 1 ELSE 0 END) as unestimated,
          SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END) as unassigned
        FROM tasks t
        WHERE t.sprint_id IS NULL AND t.deleted_at IS NULL AND t.status != 'done'
        ${projectId ? 'AND t.project_id = ?' : ''}
      `, projectId ? [projectId] : []);

      return NextResponse.json({
        success: true,
        data: items,
        pagination: {
          total: countResult[0].total,
          limit,
          offset,
          hasMore: offset + items.length < countResult[0].total
        },
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Get backlog error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch backlog', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Bulk operations on backlog items
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { action, task_ids, sprint_id, priority, assignee_id, story_points } = body;

      if (!action || !task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Action and task IDs are required' }, { status: 400 });
      }

      switch (action) {
        case 'assign_to_sprint':
          if (!sprint_id) {
            return NextResponse.json({ success: false, error: 'Sprint ID is required' }, { status: 400 });
          }
          
          // Check if sprint scope is locked
          const sprintCheck = await query<{ scope_locked: boolean }[]>(
            `SELECT scope_locked FROM sprints WHERE id = ?`,
            [sprint_id]
          );
          
          if (sprintCheck[0]?.scope_locked) {
            return NextResponse.json({ success: false, error: 'Sprint scope is locked' }, { status: 400 });
          }

          // Get max order in sprint
          const maxOrderResult = await query<{ max_order: number }[]>(
            `SELECT COALESCE(MAX(order_index), 0) as max_order FROM tasks WHERE sprint_id = ?`,
            [sprint_id]
          );
          let orderIndex = maxOrderResult[0].max_order;

          for (const taskId of task_ids) {
            orderIndex++;
            await query(`UPDATE tasks SET sprint_id = ?, order_index = ? WHERE id = ?`, [sprint_id, orderIndex, taskId]);
            
            // Log activity
            await query(`
              INSERT INTO sprint_activity_log (sprint_id, user_id, action, entity_type, entity_id, description)
              VALUES (?, ?, 'task_added', 'task', ?, 'Task added from backlog')
            `, [sprint_id, user.userId, taskId]);
          }

          // Update sprint committed points
          await query(`
            UPDATE sprints SET 
              committed_points = (SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL)
            WHERE id = ?
          `, [sprint_id, sprint_id]);
          break;

        case 'set_priority':
          if (!priority) {
            return NextResponse.json({ success: false, error: 'Priority is required' }, { status: 400 });
          }
          await query(`UPDATE tasks SET priority = ? WHERE id IN (${task_ids.map(() => '?').join(',')})`, [priority, ...task_ids]);
          break;

        case 'assign_to_user':
          await query(`UPDATE tasks SET assignee_id = ? WHERE id IN (${task_ids.map(() => '?').join(',')})`, [assignee_id || null, ...task_ids]);
          break;

        case 'set_story_points':
          if (story_points === undefined) {
            return NextResponse.json({ success: false, error: 'Story points are required' }, { status: 400 });
          }
          await query(`UPDATE tasks SET story_points = ? WHERE id IN (${task_ids.map(() => '?').join(',')})`, [story_points, ...task_ids]);
          break;

        case 'delete':
          await query(`UPDATE tasks SET deleted_at = NOW() WHERE id IN (${task_ids.map(() => '?').join(',')})`, task_ids);
          break;

        default:
          return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `${action} completed for ${task_ids.length} item(s)` 
      });
    } catch (error) {
      console.error('Backlog bulk operation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to perform bulk operation', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PUT - Update backlog order (for drag-drop prioritization)
export const PUT = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { items } = body; // Array of { id, backlog_order }

      if (!items || !Array.isArray(items)) {
        return NextResponse.json({ success: false, error: 'Items array is required' }, { status: 400 });
      }

      // Update order for each item
      for (const item of items) {
        await query(`UPDATE tasks SET backlog_order = ? WHERE id = ?`, [item.backlog_order, item.id]);
      }

      return NextResponse.json({ success: true, message: 'Backlog order updated' });
    } catch (error) {
      console.error('Update backlog order error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update backlog order', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);
