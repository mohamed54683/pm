/**
 * Individual Task API - Full CRUD with status transitions and audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  backlog: ['to_do', 'archived'],
  to_do: ['in_progress', 'blocked', 'backlog', 'archived'],
  in_progress: ['in_review', 'blocked', 'to_do', 'completed'],
  in_review: ['in_progress', 'completed', 'blocked'],
  blocked: ['to_do', 'in_progress', 'in_review'],
  completed: ['archived'],
  archived: []
};

// PUT - Update a single task
export const PUT = withAuth(
  async (request: NextRequest, { user, params }: { user: DecodedToken; params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Get current task
      const tasks = await query<Record<string, unknown>[]>(
        `SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL`, [id]
      );
      if (!tasks.length) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      }
      const currentTask = tasks[0];

      // Check if completed - read-only
      if (currentTask.status === 'completed' && body.status !== 'archived') {
        return NextResponse.json({ success: false, error: 'Completed tasks are read-only' }, { status: 400 });
      }

      // Validate status transition
      if (body.status && body.status !== currentTask.status) {
        const allowedTransitions = STATUS_TRANSITIONS[currentTask.status as string] || [];
        if (!allowedTransitions.includes(body.status)) {
          return NextResponse.json({ 
            success: false, 
            error: `Cannot transition from ${currentTask.status} to ${body.status}` 
          }, { status: 400 });
        }

        // Blocked requires reason
        if (body.status === 'blocked' && !body.blocked_reason) {
          return NextResponse.json({ success: false, error: 'Blocked status requires a reason' }, { status: 400 });
        }
      }

      const updateFields: string[] = [];
      const updateParams: (string | number | null)[] = [];
      const changes: { field: string; old: unknown; new: unknown }[] = [];

      const allowedFields = [
        'title', 'description', 'acceptance_criteria', 'type',
        'status', 'priority', 'severity',
        'sprint_id', 'phase_id',
        'story_points', 'estimated_hours', 'remaining_hours',
        'planned_start_date', 'planned_end_date', 'due_date',
        'progress_percentage', 'is_blocked', 'blocked_reason',
        'board_column', 'board_position'
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined && body[field] !== currentTask[field]) {
          changes.push({ field, old: currentTask[field], new: body[field] });
          
          if (['title', 'description', 'acceptance_criteria'].includes(field)) {
            updateFields.push(`${field} = ?`);
            updateParams.push(field === 'title' ? sanitizeString(body[field]) : stripDangerousTags(body[field] || ''));
          } else {
            updateFields.push(`${field} = ?`);
            updateParams.push(body[field]);
          }
        }
      }

      // Handle status-specific fields
      if (body.status === 'blocked') {
        updateFields.push('is_blocked = 1', 'blocked_by = ?', 'blocked_date = NOW()');
        updateParams.push(user.userId);
        if (body.blocked_reason) {
          updateFields.push('blocked_reason = ?');
          updateParams.push(body.blocked_reason);
        }
      } else if (body.status && currentTask.status === 'blocked') {
        updateFields.push('is_blocked = 0', 'blocked_by = NULL', 'blocked_date = NULL', 'blocked_reason = NULL');
      }

      if (body.status === 'completed') {
        updateFields.push('completed_at = NOW()', 'progress_percentage = 100');
      }

      if (body.status === 'in_progress' && !currentTask.actual_start_date) {
        updateFields.push('actual_start_date = CURDATE()');
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateParams.push(id);

        await query(
          `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );

        // Log changes
        for (const change of changes) {
          await query(
            `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value, created_at)
             VALUES (?, ?, 'updated', ?, ?, ?, NOW())`,
            [id, user.userId, change.field, String(change.old || ''), String(change.new || '')]
          );
        }
      }

      // Handle assignees
      if (body.assignee_ids !== undefined) {
        const currentAssignees = await query<Record<string, unknown>[]>(
          `SELECT user_id FROM task_assignees WHERE task_id = ?`, [id]
        );
        const currentIds = currentAssignees.map(a => a.user_id);
        const newIds = body.assignee_ids || [];

        // Remove old
        for (const uid of currentIds) {
          if (!newIds.includes(uid)) {
            await query(`DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?`, [id, uid]);
          }
        }
        // Add new
        for (const uid of newIds) {
          if (!currentIds.includes(uid)) {
            await query(`INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)`, [id, uid]);
          }
        }

        if (JSON.stringify(currentIds.sort()) !== JSON.stringify(newIds.sort())) {
          await query(
            `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value, created_at)
             VALUES (?, ?, 'updated', 'assignees', ?, ?, NOW())`,
            [id, user.userId, currentIds.join(','), newIds.join(',')]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Task updated' });
    } catch (error) {
      console.error('Task PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Soft delete task
export const DELETE = withAuth(
  async (request: NextRequest, { user, params }: { user: DecodedToken; params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      await query(
        `UPDATE tasks SET deleted_at = NOW(), status = 'archived' WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );

      await query(
        `INSERT INTO task_history (task_id, user_id, action, new_value, created_at)
         VALUES (?, ?, 'deleted', 'Task archived', NOW())`,
        [id, user.userId]
      );

      return NextResponse.json({ success: true, message: 'Task deleted' });
    } catch (error) {
      console.error('Task DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);
