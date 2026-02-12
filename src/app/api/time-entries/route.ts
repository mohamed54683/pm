/**
 * Time Entries API - Department-based access control
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
      const user_id = searchParams.get('user_id');
      const date_from = searchParams.get('date_from');
      const date_to = searchParams.get('date_to');
      const status = searchParams.get('status');

      if (id) {
        const entries = await query<any[]>(
          `SELECT te.*, u.name as user_name, p.name as project_name, p.code as project_code,
            t.name as task_name, t.task_key
           FROM time_entries te
           JOIN users u ON te.user_id = u.id
           JOIN projects p ON te.project_id = p.id
           LEFT JOIN tasks t ON te.task_id = t.id
           WHERE te.id = ?`, [id]
        );
        if (!entries.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        if (!canAccessProject(ctx, entries[0].project_id))
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        return NextResponse.json({ success: true, data: entries[0] });
      }

      const accessFilter = buildEntityAccessFilter(ctx, 'p');
      let sql = `
        SELECT te.*, u.name as user_name, u.email as user_email,
          p.name as project_name, p.code as project_code,
          t.name as task_name, t.task_key
        FROM time_entries te
        JOIN users u ON te.user_id = u.id
        JOIN projects p ON te.project_id = p.id
        LEFT JOIN tasks t ON te.task_id = t.id
        WHERE p.deleted_at IS NULL AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];

      // Non-admin, non-dept-manager: only own entries
      if (!ctx.isAdmin && !ctx.isDeptManager) {
        sql += ` AND te.user_id = ?`; params.push(user.userId);
      } else if (user_id) {
        sql += ` AND te.user_id = ?`; params.push(user_id);
      }

      if (project_id) { sql += ` AND te.project_id = ?`; params.push(project_id); }
      if (date_from) { sql += ` AND te.date >= ?`; params.push(date_from); }
      if (date_to) { sql += ` AND te.date <= ?`; params.push(date_to); }
      if (status && status !== 'all') { sql += ` AND te.status = ?`; params.push(status); }

      sql += ` ORDER BY te.date DESC, te.created_at DESC`;
      const entries = await query<any[]>(sql, params);

      // Summary
      const sumAccessFilter = buildEntityAccessFilter(ctx, 'p');
      let sumSql = `SELECT COUNT(*) as total_entries,
        COALESCE(SUM(te.hours),0) as total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END),0) as billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = 0 THEN te.hours ELSE 0 END),0) as non_billable_hours,
        COALESCE(SUM(CASE WHEN te.status = 'pending' THEN te.hours ELSE 0 END),0) as pending_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' THEN te.hours ELSE 0 END),0) as approved_hours
        FROM time_entries te JOIN projects p ON te.project_id = p.id
        WHERE p.deleted_at IS NULL AND ${sumAccessFilter.sql}`;
      const sumParams = [...sumAccessFilter.params];
      if (!ctx.isAdmin && !ctx.isDeptManager) { sumSql += ` AND te.user_id = ?`; sumParams.push(user.userId); }
      const summary = await query<any[]>(sumSql, sumParams);

      return NextResponse.json({ success: true, data: entries, summary: summary[0] });
    } catch (error) {
      console.error('Time Entries GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch time entries' }, { status: 500 });
    }
  },
  { requiredPermissions: ['time_entries.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { project_id, task_id, date, hours, description, is_billable } = body;

      if (!project_id || !date || !hours)
        return NextResponse.json({ success: false, error: 'Project, date, and hours required' }, { status: 400 });
      if (!canAccessProject(ctx, project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const duration_minutes = Math.round(parseFloat(hours) * 60);
      const result = await query<any>(
        `INSERT INTO time_entries (user_id, project_id, task_id, date, duration_minutes, description, is_billable, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [user.userId, project_id, task_id || null, date, duration_minutes,
         stripDangerousTags(description) || null, is_billable ? 1 : 0]
      );

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'created', 'time_entry', ?, ?)`,
        [user.userId, project_id, result.insertId, `Logged ${hours}h`]);

      return NextResponse.json({ success: true, data: { id: result.insertId } }, { status: 201 });
    } catch (error) {
      console.error('Time Entries POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create time entry' }, { status: 500 });
    }
  },
  { requiredPermissions: ['time_entries.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, hours, description, is_billable, status, rejection_reason } = body;

      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [entry] = await query<any[]>(`SELECT * FROM time_entries WHERE id = ?`, [id]);
      if (!entry) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

      // Approval: only managers/admins
      if (status && ['approved', 'rejected'].includes(status)) {
        if (!ctx.isAdmin && !ctx.isDeptManager) {
          return NextResponse.json({ success: false, error: 'Only managers can approve/reject' }, { status: 403 });
        }
        await query(`UPDATE time_entries SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?, updated_at = NOW() WHERE id = ?`,
          [status, user.userId, status === 'rejected' ? stripDangerousTags(rejection_reason) || 'Rejected' : null, id]);
      } else {
        // Own entry edit
        if (entry.user_id !== user.userId && !ctx.isAdmin)
          return NextResponse.json({ success: false, error: 'Can only edit own entries' }, { status: 403 });
        if (entry.status === 'approved')
          return NextResponse.json({ success: false, error: 'Cannot edit approved entries' }, { status: 400 });

        const updates: string[] = [];
        const params: any[] = [];
        if (hours !== undefined) { updates.push('duration_minutes = ?'); params.push(Math.round(parseFloat(hours) * 60)); }
        if (description !== undefined) { updates.push('description = ?'); params.push(stripDangerousTags(description)); }
        if (is_billable !== undefined) { updates.push('is_billable = ?'); params.push(is_billable ? 1 : 0); }
        if (updates.length) {
          updates.push('updated_at = NOW()');
          params.push(id);
          await query(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`, params);
        }
      }

      return NextResponse.json({ success: true, message: 'Time entry updated' });
    } catch (error) {
      console.error('Time Entries PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update time entry' }, { status: 500 });
    }
  },
  { requiredPermissions: ['time_entries.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [entry] = await query<any[]>(`SELECT * FROM time_entries WHERE id = ?`, [id]);
      if (!entry) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (entry.user_id !== user.userId) return NextResponse.json({ success: false, error: 'Can only delete own entries' }, { status: 403 });
      if (entry.status === 'approved') return NextResponse.json({ success: false, error: 'Cannot delete approved entries' }, { status: 400 });

      await query(`DELETE FROM time_entries WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Deleted' });
    } catch (error) {
      console.error('Time Entries DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }
  },
  { requiredPermissions: ['time_entries.delete'] }
);
