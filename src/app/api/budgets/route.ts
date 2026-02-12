/**
 * Budgets API - Department-based access control
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

      if (id) {
        const budgets = await query<any[]>(
          `SELECT pb.*, p.name as project_name, p.code as project_code, p.budget as project_budget, p.actual_cost,
            u.name as approved_by_name,
            (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE project_id = p.id AND status = 'approved') as total_expenses,
            (SELECT COALESCE(SUM(hours * COALESCE(pm2.hourly_rate,0)),0) FROM time_entries te
              LEFT JOIN project_members pm2 ON te.user_id = pm2.user_id AND te.project_id = pm2.project_id
              WHERE te.project_id = p.id AND te.status = 'approved') as labor_cost
           FROM project_budgets pb
           JOIN projects p ON pb.project_id = p.id
           LEFT JOIN users u ON pb.approved_by = u.id
           WHERE pb.id = ?`, [id]
        );
        if (!budgets.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        if (!canAccessProject(ctx, budgets[0].project_id))
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        return NextResponse.json({ success: true, data: budgets[0] });
      }

      const accessFilter = buildEntityAccessFilter(ctx, 'p');
      let sql = `
        SELECT pb.*, p.name as project_name, p.code as project_code, p.budget as project_budget,
          p.actual_cost, p.department_id, d.name as department_name,
          (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE project_id = p.id AND status = 'approved') as total_expenses
        FROM project_budgets pb
        JOIN projects p ON pb.project_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.deleted_at IS NULL AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];
      if (project_id) { sql += ` AND pb.project_id = ?`; params.push(project_id); }
      sql += ` ORDER BY pb.fiscal_year DESC, p.name`;

      const budgets = await query<any[]>(sql, params);

      // Budget overview
      const ovAccessFilter = buildEntityAccessFilter(ctx, 'p');
      const overview = await query<any[]>(
        `SELECT COALESCE(SUM(pb.total_budget),0) as total_budget,
          COALESCE(SUM(pb.approved_budget),0) as approved_budget,
          COALESCE(SUM(pb.actual_spent),0) as actual_spent,
          COALESCE(SUM(pb.remaining),0) as remaining,
          COUNT(DISTINCT pb.project_id) as project_count
         FROM project_budgets pb
         JOIN projects p ON pb.project_id = p.id
         WHERE p.deleted_at IS NULL AND ${ovAccessFilter.sql}`, [...ovAccessFilter.params]
      );

      return NextResponse.json({ success: true, data: budgets, overview: overview[0] });
    } catch (error) {
      console.error('Budgets GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch budgets' }, { status: 500 });
    }
  },
  { requiredPermissions: ['budgets.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { project_id, fiscal_year, total_budget, approved_budget, notes } = body;

      if (!project_id || !total_budget)
        return NextResponse.json({ success: false, error: 'Project and total budget required' }, { status: 400 });
      if (!canAccessProject(ctx, project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const result = await query<any>(
        `INSERT INTO project_budgets (project_id, fiscal_year, total_budget, approved_budget, remaining, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [project_id, fiscal_year || new Date().getFullYear(), total_budget,
         approved_budget || total_budget, total_budget, stripDangerousTags(notes) || null]
      );

      return NextResponse.json({ success: true, data: { id: result.insertId } }, { status: 201 });
    } catch (error) {
      console.error('Budgets POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create budget' }, { status: 500 });
    }
  },
  { requiredPermissions: ['budgets.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, total_budget, approved_budget, actual_spent, status, notes } = body;

      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [budget] = await query<any[]>(`SELECT project_id FROM project_budgets WHERE id = ?`, [id]);
      if (!budget) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, budget.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const updates: string[] = [];
      const params: any[] = [];
      if (total_budget !== undefined) { updates.push('total_budget = ?'); params.push(total_budget); }
      if (approved_budget !== undefined) { updates.push('approved_budget = ?'); params.push(approved_budget); }
      if (actual_spent !== undefined) { updates.push('actual_spent = ?'); params.push(actual_spent); }
      if (status) {
        updates.push('status = ?'); params.push(status);
        if (status === 'approved') { updates.push('approved_by = ?, approved_at = NOW()'); params.push(user.userId); }
      }
      if (notes !== undefined) { updates.push('notes = ?'); params.push(stripDangerousTags(notes)); }

      // Recalculate remaining
      if (total_budget !== undefined || actual_spent !== undefined) {
        updates.push('remaining = COALESCE(?, total_budget) - COALESCE(?, actual_spent)');
        params.push(total_budget ?? null, actual_spent ?? null);
      }

      if (updates.length) {
        updates.push('updated_at = NOW()');
        params.push(id);
        await query(`UPDATE project_budgets SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      return NextResponse.json({ success: true, message: 'Budget updated' });
    } catch (error) {
      console.error('Budgets PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update budget' }, { status: 500 });
    }
  },
  { requiredPermissions: ['budgets.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [budget] = await query<any[]>(`SELECT project_id FROM project_budgets WHERE id = ?`, [id]);
      if (!budget) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, budget.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(`DELETE FROM project_budgets WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Deleted' });
    } catch (error) {
      console.error('Budgets DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }
  },
  { requiredPermissions: ['budgets.delete'] }
);
