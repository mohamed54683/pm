/**
 * Risks API - Department-based access control
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
      const status = searchParams.get('status');
      const risk_level = searchParams.get('risk_level');

      if (id) {
        const risks = await query<any[]>(
          `SELECT r.*, p.name as project_name, p.code as project_code,
            u.name as owner_name
           FROM risks r
           JOIN projects p ON r.project_id = p.id
           LEFT JOIN users u ON r.owner_id = u.id
           WHERE r.id = ? AND r.deleted_at IS NULL`, [id]
        );
        if (!risks.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        if (!canAccessProject(ctx, risks[0].project_id))
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        return NextResponse.json({ success: true, data: risks[0] });
      }

      const accessFilter = buildEntityAccessFilter(ctx, 'p');
      let sql = `
        SELECT r.*, p.name as project_name, p.code as project_code,
          u.name as owner_name
        FROM risks r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN users u ON r.owner_id = u.id
        WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];

      if (project_id) { sql += ` AND r.project_id = ?`; params.push(project_id); }
      if (status && status !== 'all') { sql += ` AND r.status = ?`; params.push(status); }
      if (risk_level && risk_level !== 'all') { sql += ` AND r.risk_level = ?`; params.push(risk_level); }

      sql += ` ORDER BY r.risk_score DESC, r.created_at DESC`;
      const risks = await query<any[]>(sql, params);

      // Summary
      const sumFilter = buildEntityAccessFilter(ctx, 'p');
      const summary = await query<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN r.status NOT IN ('closed','mitigated') THEN 1 ELSE 0 END) as open_risks,
          SUM(CASE WHEN r.status IN ('in_progress','mitigation_planned') THEN 1 ELSE 0 END) as mitigating,
          SUM(CASE WHEN r.status = 'closed' THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN r.risk_level = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN r.risk_level = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN r.risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN r.risk_level = 'low' THEN 1 ELSE 0 END) as low,
          AVG(r.risk_score) as avg_score
         FROM risks r JOIN projects p ON r.project_id = p.id
         WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND ${sumFilter.sql}`,
        [...sumFilter.params]
      );

      return NextResponse.json({ success: true, data: risks, summary: summary[0] });
    } catch (error) {
      console.error('Risks GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch risks' }, { status: 500 });
    }
  },
  { requiredPermissions: ['risks.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { project_id, title, description, category, probability, impact, risk_level, mitigation_plan, contingency_plan, owner_id } = body;

      if (!project_id || !sanitizeString(title))
        return NextResponse.json({ success: false, error: 'Project and title required' }, { status: 400 });
      if (!canAccessProject(ctx, project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const countRes = await query<any[]>(`SELECT COUNT(*) as cnt FROM risks WHERE project_id = ?`, [project_id]);
      const num = (countRes[0]?.cnt || 0) + 1;
      const [project] = await query<any[]>(`SELECT code FROM projects WHERE id = ?`, [project_id]);
      const riskKey = `${project?.code || 'RSK'}-R${num}`;
      const riskScore = (probability || 3) * (impact || 3);

      const result = await query<any>(
        `INSERT INTO risks (risk_number, risk_key, project_id, title, description, category, probability, impact, risk_score, risk_level, mitigation_plan, contingency_plan, owner_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'identified')`,
        [num, riskKey, project_id, sanitizeString(title), stripDangerousTags(description) || null,
         sanitizeString(category) || null, probability || 3, impact || 3, riskScore,
         risk_level || (riskScore >= 20 ? 'critical' : riskScore >= 12 ? 'high' : riskScore >= 6 ? 'medium' : 'low'),
         stripDangerousTags(mitigation_plan) || null, stripDangerousTags(contingency_plan) || null,
         owner_id || user.userId]
      );

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'created', 'risk', ?, ?)`,
        [user.userId, project_id, result.insertId, `Created risk: ${sanitizeString(title)}`]);

      return NextResponse.json({ success: true, data: { id: result.insertId, risk_key: riskKey } }, { status: 201 });
    } catch (error) {
      console.error('Risks POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create risk' }, { status: 500 });
    }
  },
  { requiredPermissions: ['risks.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, title, description, category, probability, impact, risk_level, status, mitigation_plan, contingency_plan, owner_id } = body;

      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [risk] = await query<any[]>(`SELECT project_id FROM risks WHERE id = ? AND deleted_at IS NULL`, [id]);
      if (!risk) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, risk.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const updates: string[] = [];
      const params: any[] = [];
      const fields: [string, any][] = [
        ['title', title ? sanitizeString(title) : undefined],
        ['description', description !== undefined ? stripDangerousTags(description) : undefined],
        ['category', category ? sanitizeString(category) : undefined],
        ['probability', probability], ['impact', impact],
        ['risk_level', risk_level], ['status', status],
        ['mitigation_plan', mitigation_plan !== undefined ? stripDangerousTags(mitigation_plan) : undefined],
        ['contingency_plan', contingency_plan !== undefined ? stripDangerousTags(contingency_plan) : undefined],
        ['owner_id', owner_id],
      ];
      for (const [field, value] of fields) {
        if (value !== undefined) { updates.push(`${field} = ?`); params.push(value); }
      }

      if (probability !== undefined || impact !== undefined) {
        updates.push('risk_score = ? * ?');
        params.push(probability || 3, impact || 3);
      }
      if (status === 'closed') { updates.push('closed_date = NOW()'); }

      if (updates.length) {
        updates.push('updated_at = NOW()');
        params.push(id);
        await query(`UPDATE risks SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      return NextResponse.json({ success: true, message: 'Risk updated' });
    } catch (error) {
      console.error('Risks PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update risk' }, { status: 500 });
    }
  },
  { requiredPermissions: ['risks.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

      const [risk] = await query<any[]>(`SELECT project_id FROM risks WHERE id = ? AND deleted_at IS NULL`, [id]);
      if (!risk) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (!canAccessProject(ctx, risk.project_id))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(`UPDATE risks SET deleted_at = NOW() WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Risk deleted' });
    } catch (error) {
      console.error('Risks DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }
  },
  { requiredPermissions: ['risks.delete'] }
);
