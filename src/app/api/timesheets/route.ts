/**
 * Timesheets API - Weekly/Monthly timesheet management with approval workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - Fetch timesheets
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const user_id = searchParams.get('user_id');
      const status = searchParams.get('status');
      const period_type = searchParams.get('period_type');
      const start_date = searchParams.get('start_date');
      const end_date = searchParams.get('end_date');

      let sql = `
        SELECT ts.id, ts.uuid, ts.user_id, ts.period_type, 
          ts.period_start, ts.period_end, ts.total_hours, ts.billable_hours,
          ts.overtime_hours, ts.status, ts.submitted_at, ts.approved_by,
          ts.approved_at, ts.rejection_reason, ts.notes, ts.created_at,
          u.first_name as user_first_name, u.last_name as user_last_name,
          a.first_name as approver_first_name, a.last_name as approver_last_name
        FROM timesheets ts
        LEFT JOIN users u ON ts.user_id = u.id
        LEFT JOIN users a ON ts.approved_by = a.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (user_id) {
        sql += ` AND ts.user_id = ?`;
        params.push(user_id);
      }

      if (status && status !== 'all') {
        sql += ` AND ts.status = ?`;
        params.push(status);
      }

      if (period_type && period_type !== 'all') {
        sql += ` AND ts.period_type = ?`;
        params.push(period_type);
      }

      if (start_date) {
        sql += ` AND ts.period_start >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND ts.period_end <= ?`;
        params.push(end_date);
      }

      sql += ` ORDER BY ts.period_start DESC`;

      const timesheets = await query<QueryRow[]>(sql, params);

      // For each timesheet, get the associated time entries
      for (const ts of timesheets) {
        const entries = await query<QueryRow[]>(`
          SELECT te.id, te.date, te.hours, te.description, te.is_billable, te.status,
            p.name as project_name, t.title as task_title
          FROM time_entries te
          LEFT JOIN projects p ON te.project_id = p.id
          LEFT JOIN tasks t ON te.task_id = t.id
          WHERE te.user_id = ? AND te.date >= ? AND te.date <= ?
          ORDER BY te.date, te.created_at
        `, [ts.user_id, ts.period_start, ts.period_end]);
        (ts as Record<string, unknown>).entries = entries;
      }

      // Get summary stats
      const summaryResult = await query<QueryRow[]>(`
        SELECT
          COALESCE(SUM(total_hours), 0) as total_hours,
          COALESCE(SUM(billable_hours), 0) as billable_hours,
          COALESCE(SUM(overtime_hours), 0) as overtime_hours,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN total_hours ELSE 0 END), 0) as approved_hours,
          COALESCE(SUM(CASE WHEN status = 'submitted' THEN total_hours ELSE 0 END), 0) as pending_hours,
          COUNT(*) as total_count
        FROM timesheets
        ${user_id ? 'WHERE user_id = ?' : ''}
      `, user_id ? [user_id] : []);

      return NextResponse.json({
        success: true,
        data: timesheets,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Timesheets API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch timesheets', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.view'], checkCsrf: false }
);

// POST - Create or auto-generate timesheet
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { period_type, period_start, period_end, notes } = body;

      if (!period_start || !period_end) {
        return NextResponse.json({ success: false, error: 'Period start and end dates are required' }, { status: 400 });
      }

      // Check if timesheet already exists for this period
      const existing = await query<QueryRow[]>(`
        SELECT id FROM timesheets 
        WHERE user_id = ? AND period_start = ? AND period_end = ?
      `, [user.userId, period_start, period_end]);

      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Timesheet already exists for this period' }, { status: 400 });
      }

      // Calculate totals from time entries
      const totals = await query<QueryRow[]>(`
        SELECT 
          COALESCE(SUM(hours), 0) as total_hours,
          COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
          COALESCE(SUM(CASE WHEN is_overtime = 1 THEN hours ELSE 0 END), 0) as overtime_hours
        FROM time_entries
        WHERE user_id = ? AND date >= ? AND date <= ?
      `, [user.userId, period_start, period_end]);

      const uuid = crypto.randomUUID();

      const result = await query<{ insertId: number }>(
        `INSERT INTO timesheets (uuid, tenant_id, user_id, period_type, period_start, period_end, 
          total_hours, billable_hours, overtime_hours, notes, status)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          uuid, user.userId, period_type || 'weekly', period_start, period_end,
          totals[0]?.total_hours || 0, totals[0]?.billable_hours || 0, 
          totals[0]?.overtime_hours || 0, notes || null
        ]
      );

      return NextResponse.json({
        success: true,
        data: { 
          id: result.insertId, 
          uuid,
          total_hours: totals[0]?.total_hours || 0,
          billable_hours: totals[0]?.billable_hours || 0,
          overtime_hours: totals[0]?.overtime_hours || 0
        }
      }, { status: 201 });
    } catch (error) {
      console.error('Create timesheet error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create timesheet', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// PUT - Update timesheet (submit/approve/reject)
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, status, notes, rejection_reason } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Timesheet ID is required' }, { status: 400 });
      }

      // Get current timesheet
      const [current] = await query<QueryRow[]>(`SELECT status, user_id FROM timesheets WHERE id = ?`, [id]);
      
      if (!current) {
        return NextResponse.json({ success: false, error: 'Timesheet not found' }, { status: 404 });
      }

      const isApprovalAction = status === 'approved' || status === 'rejected';
      const isSubmission = status === 'submitted';

      // Validate transitions
      if (isSubmission && current.status !== 'draft' && current.status !== 'rejected') {
        return NextResponse.json({ success: false, error: 'Only draft or rejected timesheets can be submitted' }, { status: 400 });
      }

      if (isApprovalAction && current.status !== 'submitted') {
        return NextResponse.json({ success: false, error: 'Only submitted timesheets can be approved or rejected' }, { status: 400 });
      }

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (status) {
        updates.push('status = ?');
        params.push(status);

        if (isSubmission) {
          updates.push('submitted_at = NOW()');
          
          // Recalculate totals on submission
          const period = await query<QueryRow[]>(`SELECT period_start, period_end FROM timesheets WHERE id = ?`, [id]);
          const totals = await query<QueryRow[]>(`
            SELECT 
              COALESCE(SUM(hours), 0) as total_hours,
              COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
              COALESCE(SUM(CASE WHEN is_overtime = 1 THEN hours ELSE 0 END), 0) as overtime_hours
            FROM time_entries
            WHERE user_id = ? AND date >= ? AND date <= ?
          `, [current.user_id, period[0]?.period_start, period[0]?.period_end]);

          updates.push('total_hours = ?');
          params.push(totals[0]?.total_hours || 0);
          updates.push('billable_hours = ?');
          params.push(totals[0]?.billable_hours || 0);
          updates.push('overtime_hours = ?');
          params.push(totals[0]?.overtime_hours || 0);
        }

        if (isApprovalAction) {
          updates.push('approved_by = ?');
          updates.push('approved_at = NOW()');
          params.push(user.userId);

          if (status === 'rejected' && rejection_reason) {
            updates.push('rejection_reason = ?');
            params.push(rejection_reason);
          }

          // Lock timesheet and associated time entries if approved
          if (status === 'approved') {
            // Update associated time entries to approved status
            const period = await query<QueryRow[]>(`SELECT period_start, period_end, user_id FROM timesheets WHERE id = ?`, [id]);
            await query(`
              UPDATE time_entries SET status = 'approved', approved_by = ?, approved_at = NOW()
              WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'submitted'
            `, [user.userId, period[0]?.user_id, period[0]?.period_start, period[0]?.period_end]);
          }
        }
      }

      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }

      if (updates.length === 0) {
        return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await query(`UPDATE timesheets SET ${updates.join(', ')} WHERE id = ?`, params);

      return NextResponse.json({ success: true, message: 'Timesheet updated successfully' });
    } catch (error) {
      console.error('Update timesheet error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update timesheet', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.edit'] }
);

// DELETE - Delete draft timesheet
export const DELETE = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Timesheet ID is required' }, { status: 400 });
      }

      const [timesheet] = await query<QueryRow[]>(`SELECT status FROM timesheets WHERE id = ?`, [id]);
      
      if (!timesheet) {
        return NextResponse.json({ success: false, error: 'Timesheet not found' }, { status: 404 });
      }

      if (timesheet.status !== 'draft') {
        return NextResponse.json({ success: false, error: 'Only draft timesheets can be deleted' }, { status: 403 });
      }

      await query(`DELETE FROM timesheets WHERE id = ?`, [id]);

      return NextResponse.json({ success: true, message: 'Timesheet deleted successfully' });
    } catch (error) {
      console.error('Delete timesheet error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete timesheet', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['tasks.delete'] }
);
