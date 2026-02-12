/**
 * Sprint Individual API - CRUD operations for a single sprint
 * Includes start, complete, pause, extend, and scope lock operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

interface SprintRow {
  id: number;
  uuid: string;
  project_id: number;
  release_id: number | null;
  name: string;
  goal: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  capacity_points: number | null;
  capacity_hours: number | null;
  committed_points: number;
  completed_points: number;
  committed_hours: number;
  completed_hours: number;
  velocity: number | null;
  scope_locked: boolean;
  scope_lock_reason: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  extended_to: string | null;
  extend_reason: string | null;
  announcements: string | null;
  retrospective_notes: string | null;
  review_notes: string | null;
  what_went_well: string | null;
  what_to_improve: string | null;
  action_items: string | null;
  definition_of_done: string | null;
  project_name: string;
  project_code: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  total_points: number;
  completed_points_calc: number;
}

// GET - Get sprint details
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      const sprintResult = await query<SprintRow[]>(`
        SELECT s.*, 
          p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'in_progress' AND t.deleted_at IS NULL) as in_progress_tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.blocked_reason IS NOT NULL AND t.deleted_at IS NULL) as blocked_tasks,
          (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_points,
          (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_points_calc
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.id = ? OR s.uuid = ?
      `, [id, id]);

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      // Get tasks in sprint
      const tasks = await query<Record<string, unknown>[]>(`
        SELECT t.id, t.uuid, t.task_key, t.title, t.status, t.priority, t.type,
          t.story_points, t.estimated_hours, t.blocked_reason, t.order_index,
          u.first_name as assignee_first_name, u.last_name as assignee_last_name
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.sprint_id = ? AND t.deleted_at IS NULL
        ORDER BY t.order_index, t.id
      `, [sprint.id]);

      // Get activity log
      const activities = await query<Record<string, unknown>[]>(`
        SELECT sal.*, u.first_name, u.last_name
        FROM sprint_activity_log sal
        LEFT JOIN users u ON sal.user_id = u.id
        WHERE sal.sprint_id = ?
        ORDER BY sal.created_at DESC
        LIMIT 20
      `, [sprint.id]);

      // Calculate days remaining
      const today = new Date();
      const endDate = new Date(sprint.extended_to || sprint.end_date || today);
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return NextResponse.json({
        success: true,
        data: {
          ...sprint,
          tasks,
          activities,
          metrics: {
            daysRemaining: Math.max(0, daysRemaining),
            completionRate: sprint.total_tasks > 0 
              ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100) 
              : 0,
            pointsCompletionRate: sprint.total_points > 0
              ? Math.round((sprint.completed_points_calc / sprint.total_points) * 100)
              : 0
          }
        }
      });
    } catch (error) {
      console.error('Get sprint error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sprint', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

// PUT - Update sprint (including start, complete, pause, extend operations)
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { 
        action, // 'update', 'start', 'complete', 'pause', 'resume', 'extend', 'lock_scope', 'unlock_scope', 'cancel'
        name, goal, start_date, end_date, capacity_points, capacity_hours,
        reason, extended_to, announcements,
        retrospective_notes, review_notes, what_went_well, what_to_improve, action_items,
        definition_of_done
      } = body;

      // Get current sprint
      const sprintResult = await query<{ id: number; status: string; project_id: number; scope_locked: boolean }[]>(
        `SELECT id, status, project_id, scope_locked FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];
      let logAction = 'updated';
      let logDescription = '';

      switch (action) {
        case 'start':
          if (sprint.status !== 'planning') {
            return NextResponse.json({ success: false, error: 'Only planning sprints can be started' }, { status: 400 });
          }
          await query(`UPDATE sprints SET status = 'active', actual_start_date = CURDATE() WHERE id = ?`, [sprint.id]);
          logAction = 'started';
          logDescription = 'Sprint started';
          break;

        case 'complete':
          if (sprint.status !== 'active') {
            return NextResponse.json({ success: false, error: 'Only active sprints can be completed' }, { status: 400 });
          }
          // Calculate completion summary
          const summaryResult = await query<{ total: number; completed: number; points: number; completed_points: number }[]>(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
              COALESCE(SUM(story_points), 0) as points,
              COALESCE(SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END), 0) as completed_points
            FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL
          `, [sprint.id]);
          
          const summary = summaryResult[0];
          const velocity = summary.completed_points;
          
          await query(`
            UPDATE sprints SET 
              status = 'completed', 
              actual_end_date = CURDATE(),
              velocity = ?,
              completed_points = ?,
              completion_summary = ?
            WHERE id = ?
          `, [velocity, summary.completed_points, JSON.stringify(summary), sprint.id]);
          
          logAction = 'completed';
          logDescription = `Sprint completed with velocity ${velocity}`;
          break;

        case 'pause':
          if (sprint.status !== 'active') {
            return NextResponse.json({ success: false, error: 'Only active sprints can be paused' }, { status: 400 });
          }
          await query(`UPDATE sprints SET paused_at = NOW(), pause_reason = ? WHERE id = ?`, 
            [sanitizeString(reason || ''), sprint.id]);
          logAction = 'paused';
          logDescription = `Sprint paused: ${reason || 'No reason provided'}`;
          break;

        case 'resume':
          await query(`UPDATE sprints SET paused_at = NULL, pause_reason = NULL WHERE id = ?`, [sprint.id]);
          logAction = 'updated';
          logDescription = 'Sprint resumed';
          break;

        case 'extend':
          if (!extended_to) {
            return NextResponse.json({ success: false, error: 'New end date is required' }, { status: 400 });
          }
          await query(`UPDATE sprints SET extended_to = ?, extend_reason = ? WHERE id = ?`,
            [extended_to, sanitizeString(reason || ''), sprint.id]);
          logAction = 'extended';
          logDescription = `Sprint extended to ${extended_to}: ${reason || 'No reason provided'}`;
          break;

        case 'lock_scope':
          await query(`UPDATE sprints SET scope_locked = TRUE, scope_lock_reason = ? WHERE id = ?`,
            [sanitizeString(reason || ''), sprint.id]);
          logAction = 'scope_locked';
          logDescription = `Scope locked: ${reason || 'No reason provided'}`;
          break;

        case 'unlock_scope':
          await query(`UPDATE sprints SET scope_locked = FALSE, scope_lock_reason = NULL WHERE id = ?`, [sprint.id]);
          logAction = 'scope_unlocked';
          logDescription = 'Scope unlocked';
          break;

        case 'cancel':
          await query(`UPDATE sprints SET status = 'cancelled' WHERE id = ?`, [sprint.id]);
          // Move tasks back to backlog
          await query(`UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?`, [sprint.id]);
          logAction = 'cancelled';
          logDescription = `Sprint cancelled: ${reason || 'No reason provided'}`;
          break;

        default:
          // Regular update
          const updates: string[] = [];
          const values: (string | number | null)[] = [];

          if (name) { updates.push('name = ?'); values.push(sanitizeString(name)); }
          if (goal !== undefined) { updates.push('goal = ?'); values.push(stripDangerousTags(goal)); }
          if (start_date) { updates.push('start_date = ?'); values.push(start_date); }
          if (end_date) { updates.push('end_date = ?'); values.push(end_date); }
          if (capacity_points !== undefined) { updates.push('capacity_points = ?'); values.push(capacity_points); }
          if (capacity_hours !== undefined) { updates.push('capacity_hours = ?'); values.push(capacity_hours); }
          if (announcements !== undefined) { updates.push('announcements = ?'); values.push(stripDangerousTags(announcements)); }
          if (retrospective_notes !== undefined) { updates.push('retrospective_notes = ?'); values.push(stripDangerousTags(retrospective_notes)); }
          if (review_notes !== undefined) { updates.push('review_notes = ?'); values.push(stripDangerousTags(review_notes)); }
          if (what_went_well !== undefined) { updates.push('what_went_well = ?'); values.push(stripDangerousTags(what_went_well)); }
          if (what_to_improve !== undefined) { updates.push('what_to_improve = ?'); values.push(stripDangerousTags(what_to_improve)); }
          if (action_items !== undefined) { updates.push('action_items = ?'); values.push(JSON.stringify(action_items)); }
          if (definition_of_done !== undefined) { updates.push('definition_of_done = ?'); values.push(stripDangerousTags(definition_of_done)); }

          if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(sprint.id);
            await query(`UPDATE sprints SET ${updates.join(', ')} WHERE id = ?`, values);
            logDescription = 'Sprint details updated';
          }
      }

      // Log activity
      await query(`
        INSERT INTO sprint_activity_log (sprint_id, user_id, action, description, reason)
        VALUES (?, ?, ?, ?, ?)
      `, [sprint.id, user.userId, logAction, logDescription, reason || null]);

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

// DELETE - Delete sprint
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      const sprintResult = await query<{ id: number; project_id: number; name: string }[]>(
        `SELECT id, project_id, name FROM sprints WHERE id = ? OR uuid = ?`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];

      // Move tasks back to backlog
      await query(`UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?`, [sprint.id]);

      // Delete sprint
      await query(`DELETE FROM sprints WHERE id = ?`, [sprint.id]);

      // Log activity
      await query(`
        INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
        VALUES (?, ?, 'deleted', 'sprint', ?, ?)
      `, [user.userId, sprint.project_id, sprint.id, `Deleted sprint: ${sprint.name}`]);

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
