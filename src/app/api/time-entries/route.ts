/**
 * Time Entries API - Secure CRUD operations for PMP database
 * Protected with authentication and input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch time entries (requires view permission)
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const user_id = searchParams.get('user_id');
      const status = searchParams.get('status');
      const start_date = searchParams.get('start_date') || searchParams.get('startDate');
      const end_date = searchParams.get('end_date') || searchParams.get('endDate');

      let sql = `
        SELECT te.id, te.uuid, te.task_id, te.project_id, te.user_id,
          te.hours, te.date as work_date, te.description, 
          COALESCE(te.is_billable, te.billable, 0) as billable,
          COALESCE(te.status, 'pending') as status, te.created_at,
          p.name as project_name, p.code as project_code,
          t.title as task_title, t.task_key,
          u.first_name as user_first_name, u.last_name as user_last_name,
          a.name as approved_by_name
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        LEFT JOIN tasks t ON te.task_id = t.id
        LEFT JOIN users u ON te.user_id = u.id
        LEFT JOIN users a ON te.approved_by = a.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (project_id) {
        sql += ` AND te.project_id = ?`;
        params.push(project_id);
      }

      if (user_id) {
        sql += ` AND te.user_id = ?`;
        params.push(user_id);
      }

      if (status && status !== 'all') {
        sql += ` AND te.status = ?`;
        params.push(status);
      }

      if (start_date) {
        sql += ` AND te.date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND te.date <= ?`;
        params.push(end_date);
      }

      sql += ` ORDER BY te.date DESC, te.created_at DESC`;

      const entries = await query<Record<string, unknown>[]>(sql, params);

      // Get summary
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT
          COALESCE(SUM(hours), 0) as total_hours,
          COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
          COALESCE(SUM(CASE WHEN is_billable = 0 OR is_billable IS NULL THEN hours ELSE 0 END), 0) as non_billable_hours,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN hours ELSE 0 END), 0) as approved_hours,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN hours ELSE 0 END), 0) as pending_hours
        FROM time_entries
      `);

      return NextResponse.json({
        success: true,
        data: entries,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Time Entries API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch time entries', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Create a new time entry
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        project_id, task_id, date, hours, description, is_billable
      } = body;

      // Sanitize inputs
      const sanitizedDescription = stripDangerousTags(description);

      if (!date || !hours) {
        return NextResponse.json({ success: false, error: 'Date and hours are required' }, { status: 400 });
      }

      if (hours <= 0 || hours > 24) {
        return NextResponse.json({ success: false, error: 'Hours must be between 0 and 24' }, { status: 400 });
      }

      const result = await query<{ insertId: number }>(
        `INSERT INTO time_entries (uuid, user_id, project_id, task_id, date, hours, description, is_billable, status)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          user.userId, project_id || null, task_id || null, date, hours,
          sanitizedDescription || null, is_billable !== false ? 1 : 0
        ]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId }
      }, { status: 201 });
    } catch (error) {
      console.error('Create time entry error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create time entry', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PUT - Update a time entry
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, date, hours, description, is_billable, status } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Time entry ID is required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedDescription = description ? stripDangerousTags(description) : null;

      // Check if this is an approval action
      const isApproval = status === 'approved' || status === 'rejected';

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (date) {
        updates.push('date = ?');
        params.push(date);
      }

      if (hours !== undefined) {
        if (hours <= 0 || hours > 24) {
          return NextResponse.json({ success: false, error: 'Hours must be between 0 and 24' }, { status: 400 });
        }
        updates.push('hours = ?');
        params.push(hours);
      }

      if (sanitizedDescription !== null) {
        updates.push('description = ?');
        params.push(sanitizedDescription);
      }

      if (is_billable !== undefined) {
        updates.push('is_billable = ?');
        params.push(is_billable ? 1 : 0);
      }

      if (status) {
        updates.push('status = ?');
        params.push(status);

        if (isApproval) {
          updates.push('approved_by = ?');
          updates.push('approved_at = NOW()');
          params.push(user.userId);
        }
      }

      if (updates.length === 0) {
        return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await query(
        `UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return NextResponse.json({ success: true, message: 'Time entry updated successfully' });
    } catch (error) {
      console.error('Update time entry error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update time entry', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Delete a time entry
export const DELETE = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Time entry ID is required' }, { status: 400 });
      }

      await query(`DELETE FROM time_entries WHERE id = ?`, [id]);

      return NextResponse.json({ success: true, message: 'Time entry deleted successfully' });
    } catch (error) {
      console.error('Delete time entry error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete time entry', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);
