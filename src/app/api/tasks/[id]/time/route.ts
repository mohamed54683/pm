/**
 * Task Time Entries API - Log and track work time
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch time entries for a task
export const GET = withAuth(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      
      const entries = await query<Record<string, unknown>[]>(
        `SELECT te.*, u.name as user_name, u.email as user_email
         FROM task_time_entries te
         JOIN users u ON te.user_id = u.id
         WHERE te.task_id = ?
         ORDER BY te.work_date DESC, te.created_at DESC`,
        [id]
      );

      // Summary
      const summary = await query<Record<string, unknown>[]>(
        `SELECT 
           SUM(hours) as total_hours,
           COUNT(*) as entry_count,
           MIN(work_date) as first_entry,
           MAX(work_date) as last_entry
         FROM task_time_entries WHERE task_id = ?`,
        [id]
      );

      // By user
      const byUser = await query<Record<string, unknown>[]>(
        `SELECT u.id, u.name, SUM(te.hours) as hours
         FROM task_time_entries te
         JOIN users u ON te.user_id = u.id
         WHERE te.task_id = ?
         GROUP BY u.id, u.name
         ORDER BY hours DESC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        data: {
          entries,
          summary: summary[0],
          byUser
        }
      });
    } catch (error) {
      console.error('Time entries GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch time entries' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.view'] }
);

// POST - Log time
export const POST = withAuth(
  async (request: NextRequest, { user, params }: { user: DecodedToken; params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { hours, work_date, description, billable = true } = body;

      if (!hours || hours <= 0) {
        return NextResponse.json({ success: false, error: 'Hours must be greater than 0' }, { status: 400 });
      }

      const result = await query<Record<string, unknown>>(
        `INSERT INTO task_time_entries (uuid, task_id, user_id, hours, work_date, description, billable, created_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
        [id, user.userId, hours, work_date || new Date().toISOString().split('T')[0], description || null, billable ? 1 : 0]
      );

      // Update actual hours on task
      await query(
        `UPDATE tasks SET 
           actual_hours = COALESCE(actual_hours, 0) + ?,
           remaining_hours = GREATEST(0, COALESCE(remaining_hours, estimated_hours, 0) - ?),
           updated_at = NOW()
         WHERE id = ?`,
        [hours, hours, id]
      );

      // Log activity
      await query(
        `INSERT INTO task_history (task_id, user_id, action, new_value, created_at)
         VALUES (?, ?, 'time_logged', ?, NOW())`,
        [id, user.userId, `${hours} hours logged`]
      );

      return NextResponse.json({
        success: true,
        data: { id: (result as any).insertId },
        message: 'Time logged successfully'
      });
    } catch (error) {
      console.error('Time entry POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to log time' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PUT - Update time entry
export const PUT = withAuth(
  async (request: NextRequest, { user }: { user: DecodedToken }): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { entry_id, hours, work_date, description, billable } = body;

      if (!entry_id) {
        return NextResponse.json({ success: false, error: 'Entry ID required' }, { status: 400 });
      }

      // Check ownership
      const existing = await query<Record<string, unknown>[]>(
        `SELECT user_id, hours, task_id FROM task_time_entries WHERE id = ?`, [entry_id]
      );
      if (!existing.length || existing[0].user_id !== user.userId) {
        return NextResponse.json({ success: false, error: 'Cannot edit this entry' }, { status: 403 });
      }

      const oldHours = parseFloat(existing[0].hours as string) || 0;
      const newHours = hours !== undefined ? hours : oldHours;
      const hoursDiff = newHours - oldHours;

      const updateFields: string[] = [];
      const updateParams: (string | number)[] = [];

      if (hours !== undefined) {
        updateFields.push('hours = ?');
        updateParams.push(hours);
      }
      if (work_date) {
        updateFields.push('work_date = ?');
        updateParams.push(work_date);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateParams.push(description);
      }
      if (billable !== undefined) {
        updateFields.push('billable = ?');
        updateParams.push(billable ? 1 : 0);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateParams.push(entry_id);
        await query(`UPDATE task_time_entries SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);

        // Update task actual hours if hours changed
        if (hoursDiff !== 0) {
          await query(
            `UPDATE tasks SET actual_hours = COALESCE(actual_hours, 0) + ? WHERE id = ?`,
            [hoursDiff, existing[0].task_id]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Time entry updated' });
    } catch (error) {
      console.error('Time entry PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update entry' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Delete time entry
export const DELETE = withAuth(
  async (request: NextRequest, { user }: { user: DecodedToken }): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const entry_id = searchParams.get('entry_id');

      if (!entry_id) {
        return NextResponse.json({ success: false, error: 'Entry ID required' }, { status: 400 });
      }

      // Check ownership
      const existing = await query<Record<string, unknown>[]>(
        `SELECT user_id, hours, task_id FROM task_time_entries WHERE id = ?`, [entry_id]
      );
      if (!existing.length || existing[0].user_id !== user.userId) {
        return NextResponse.json({ success: false, error: 'Cannot delete this entry' }, { status: 403 });
      }

      await query(`DELETE FROM task_time_entries WHERE id = ?`, [entry_id]);

      // Update task actual hours
      await query(
        `UPDATE tasks SET actual_hours = GREATEST(0, COALESCE(actual_hours, 0) - ?) WHERE id = ?`,
        [existing[0].hours, existing[0].task_id]
      );

      return NextResponse.json({ success: true, message: 'Time entry deleted' });
    } catch (error) {
      console.error('Time entry DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete entry' }, { status: 500 });
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);
