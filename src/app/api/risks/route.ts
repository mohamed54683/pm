/**
 * Risks API - Secure CRUD operations for PMP database
 * Protected with authentication and input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch risks (requires risks.view permission)
export const GET = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const status = searchParams.get('status');

      let sql = `
        SELECT r.*, p.name as project_name, p.code as project_code,
          u.name as owner_name
        FROM risks r
        LEFT JOIN projects p ON r.project_id = p.id
        LEFT JOIN users u ON r.owner_id = u.id
        WHERE r.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];

      if (project_id) {
        sql += ` AND r.project_id = ?`;
        params.push(project_id);
      }

      if (status && status !== 'all') {
        sql += ` AND r.status = ?`;
        params.push(status);
      }

      sql += ` ORDER BY r.risk_score DESC, r.created_at DESC`;

      const risks = await query<Record<string, unknown>[]>(sql, params);

      // Get summary
      const summaryResult = await query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as open_risks,
          SUM(CASE WHEN risk_score >= 9 THEN 1 ELSE 0 END) as high_risks,
          SUM(CASE WHEN risk_score >= 6 AND risk_score < 9 THEN 1 ELSE 0 END) as medium_risks,
          SUM(CASE WHEN risk_score < 6 THEN 1 ELSE 0 END) as low_risks
        FROM risks WHERE deleted_at IS NULL
      `);

      return NextResponse.json({
        success: true,
        data: risks,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Risks API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch risks', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.view'], checkCsrf: false }
);

// POST - Create a new risk (requires risks.create permission)
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        project_id, title, description, category, status, probability, impact,
        mitigation_plan, contingency_plan, owner_id, identified_date, target_resolution_date
      } = body;

      // Sanitize inputs
      const sanitizedTitle = sanitizeString(title);
      const sanitizedDescription = stripDangerousTags(description);
      const sanitizedMitigation = stripDangerousTags(mitigation_plan);
      const sanitizedContingency = stripDangerousTags(contingency_plan);

      if (!project_id || !sanitizedTitle) {
        return NextResponse.json({ success: false, error: 'Project ID and title are required' }, { status: 400 });
      }

      const result = await query<{ insertId: number }>(
        `INSERT INTO risks (uuid, project_id, title, description, category, status, probability, impact, mitigation_plan, contingency_plan, owner_id, identified_date, target_resolution_date)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project_id, sanitizedTitle, sanitizedDescription || null,
          category || 'other', status || 'identified',
          probability || 'medium', impact || 'medium',
          sanitizedMitigation || null, sanitizedContingency || null,
          owner_id || user.userId,
          identified_date || new Date().toISOString().split('T')[0],
          target_resolution_date || null
        ]
      );

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'created', 'risk', ?, ?)`,
        [user.userId, project_id, result.insertId, `Created risk: ${sanitizedTitle}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, title: sanitizedTitle }
      }, { status: 201 });
    } catch (error) {
      console.error('Create risk error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create risk', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.create'] }
);

// PUT - Update a risk (requires risks.edit permission)
export const PUT = withAuth(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        id, title, description, category, status, probability, impact,
        mitigation_plan, contingency_plan, owner_id, target_resolution_date
      } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Risk ID is required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedTitle = title ? sanitizeString(title) : null;
      const sanitizedDescription = description ? stripDangerousTags(description) : null;
      const sanitizedMitigation = mitigation_plan ? stripDangerousTags(mitigation_plan) : null;
      const sanitizedContingency = contingency_plan ? stripDangerousTags(contingency_plan) : null;

      await query(
        `UPDATE risks SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          status = COALESCE(?, status),
          probability = COALESCE(?, probability),
          impact = COALESCE(?, impact),
          mitigation_plan = COALESCE(?, mitigation_plan),
          contingency_plan = COALESCE(?, contingency_plan),
          owner_id = COALESCE(?, owner_id),
          target_resolution_date = COALESCE(?, target_resolution_date),
          updated_at = NOW()
         WHERE id = ?`,
        [
          sanitizedTitle, sanitizedDescription, category, status, probability, impact,
          sanitizedMitigation, sanitizedContingency, owner_id, target_resolution_date, id
        ]
      );

      return NextResponse.json({ success: true, message: 'Risk updated successfully' });
    } catch (error) {
      console.error('Update risk error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update risk', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.edit'] }
);

// DELETE - Soft delete a risk (requires risks.delete permission)
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Risk ID is required' }, { status: 400 });
      }

      // Get risk info for logging
      const riskInfo = await query<{ project_id: number }[]>(
        `SELECT project_id FROM risks WHERE id = ?`,
        [id]
      );

      await query(`UPDATE risks SET deleted_at = NOW() WHERE id = ?`, [id]);

      // Log activity
      if (riskInfo && riskInfo.length > 0) {
        await query(
          `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
           VALUES (?, ?, 'deleted', 'risk', ?, ?)`,
          [user.userId, riskInfo[0].project_id, id, `Deleted risk`]
        );
      }

      return NextResponse.json({ success: true, message: 'Risk deleted successfully' });
    } catch (error) {
      console.error('Delete risk error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete risk', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.delete'] }
);
