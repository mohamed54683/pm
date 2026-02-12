/**
 * Individual Risk API - GET, PUT, DELETE for single risk
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// Risk level calculation
function calculateRiskLevel(score: number): string {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

const probabilityScores: Record<string, number> = {
  'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5
};
const impactScores: Record<string, number> = {
  'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5
};

// GET - Fetch single risk with full details
export const GET = withAuth(
  async (request: NextRequest, _user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      
      const risks = await query<Record<string, unknown>[]>(`
        SELECT r.*, 
          p.name as project_name, p.code as project_code,
          u.name as owner_name, u.email as owner_email,
          bu.name as backup_owner_name, bu.email as backup_owner_email,
          iu.name as identified_by_name,
          eu.name as escalated_to_name
        FROM risks r
        LEFT JOIN projects p ON r.project_id = p.id
        LEFT JOIN users u ON r.owner_id = u.id
        LEFT JOIN users bu ON r.backup_owner_id = bu.id
        LEFT JOIN users iu ON r.identified_by = iu.id
        LEFT JOIN users eu ON r.escalated_to = eu.id
        WHERE r.id = ? AND r.deleted_at IS NULL
      `, [id]);

      if (!risks.length) {
        return NextResponse.json({ success: false, error: 'Risk not found' }, { status: 404 });
      }

      // Get mitigation actions
      const actions = await query<Record<string, unknown>[]>(`
        SELECT ma.*, u.name as responsible_name
        FROM risk_mitigation_actions ma
        LEFT JOIN users u ON ma.responsible_id = u.id
        WHERE ma.risk_id = ?
        ORDER BY ma.target_date ASC, ma.created_at DESC
      `, [id]);

      // Get reviews
      const reviews = await query<Record<string, unknown>[]>(`
        SELECT rr.*, u.name as reviewer_name
        FROM risk_reviews rr
        LEFT JOIN users u ON rr.reviewer_id = u.id
        WHERE rr.risk_id = ?
        ORDER BY rr.review_date DESC
      `, [id]);

      // Get attachments
      const attachments = await query<Record<string, unknown>[]>(`
        SELECT ra.*, u.name as uploaded_by_name
        FROM risk_attachments ra
        LEFT JOIN users u ON ra.uploaded_by = u.id
        WHERE ra.risk_id = ?
        ORDER BY ra.created_at DESC
      `, [id]);

      // Get activity log
      const activity = await query<Record<string, unknown>[]>(`
        SELECT ral.*, u.name as user_name
        FROM risk_activity_log ral
        LEFT JOIN users u ON ral.user_id = u.id
        WHERE ral.risk_id = ?
        ORDER BY ral.created_at DESC
        LIMIT 50
      `, [id]);

      // Get ownership history
      const ownershipHistory = await query<Record<string, unknown>[]>(`
        SELECT roh.*, 
          pu.name as previous_owner_name,
          nu.name as new_owner_name,
          cu.name as changed_by_name
        FROM risk_ownership_history roh
        LEFT JOIN users pu ON roh.previous_owner_id = pu.id
        LEFT JOIN users nu ON roh.new_owner_id = nu.id
        LEFT JOIN users cu ON roh.changed_by = cu.id
        WHERE roh.risk_id = ?
        ORDER BY roh.created_at DESC
      `, [id]);

      return NextResponse.json({
        success: true,
        data: {
          ...risks[0],
          mitigation_actions: actions,
          reviews,
          attachments,
          activity,
          ownership_history: ownershipHistory
        }
      });
    } catch (error) {
      console.error('Get risk error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch risk', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.view'], checkCsrf: false }
);

// PUT - Update a risk
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Get current risk for comparison
      const currentRisk = await query<Record<string, unknown>[]>(
        `SELECT * FROM risks WHERE id = ? AND deleted_at IS NULL`, [id]
      );
      
      if (!currentRisk.length) {
        return NextResponse.json({ success: false, error: 'Risk not found' }, { status: 404 });
      }

      const old = currentRisk[0];
      const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];

      // Extract and sanitize fields
      const {
        title, description, category, source, status,
        probability, impact, priority,
        response_strategy, mitigation_plan, target_mitigation_date,
        contingency_plan, trigger_conditions,
        owner_id, backup_owner_id, due_date,
        review_frequency, next_review_date,
        schedule_impact, cost_impact, quality_impact, scope_impact,
        escalation_reason, escalated_to
      } = body;

      const sanitizedTitle = title ? sanitizeString(title) : null;
      const sanitizedDescription = description !== undefined ? stripDangerousTags(description) : null;
      const sanitizedMitigation = mitigation_plan !== undefined ? stripDangerousTags(mitigation_plan) : null;
      const sanitizedContingency = contingency_plan !== undefined ? stripDangerousTags(contingency_plan) : null;

      // Calculate new risk score if probability or impact changed
      let newProbScore = old.probability_score as number;
      let newImpScore = old.impact_score as number;
      let newRiskScore = old.risk_score as number;
      let newRiskLevel = old.risk_level as string;

      if (probability && probability !== old.probability) {
        newProbScore = probabilityScores[probability] || 3;
        changes.push({ field: 'probability', oldValue: old.probability, newValue: probability });
      }
      if (impact && impact !== old.impact) {
        newImpScore = impactScores[impact] || 3;
        changes.push({ field: 'impact', oldValue: old.impact, newValue: impact });
      }
      if (probability || impact) {
        newRiskScore = newProbScore * newImpScore;
        newRiskLevel = calculateRiskLevel(newRiskScore);
      }

      // Track other changes
      if (sanitizedTitle && sanitizedTitle !== old.title) {
        changes.push({ field: 'title', oldValue: old.title, newValue: sanitizedTitle });
      }
      if (status && status !== old.status) {
        changes.push({ field: 'status', oldValue: old.status, newValue: status });
      }
      if (priority && priority !== old.priority) {
        changes.push({ field: 'priority', oldValue: old.priority, newValue: priority });
      }
      if (owner_id && owner_id !== old.owner_id) {
        changes.push({ field: 'owner_id', oldValue: old.owner_id, newValue: owner_id });
        // Record ownership change
        await query(
          `INSERT INTO risk_ownership_history (uuid, risk_id, previous_owner_id, new_owner_id, changed_by, reason)
           VALUES (UUID(), ?, ?, ?, ?, ?)`,
          [id, old.owner_id || null, owner_id, user.userId, body.owner_change_reason || null]
        );
      }

      await query(`
        UPDATE risks SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          source = COALESCE(?, source),
          status = COALESCE(?, status),
          probability = COALESCE(?, probability),
          probability_score = ?,
          impact = COALESCE(?, impact),
          impact_score = ?,
          risk_score = ?,
          risk_level = ?,
          priority = COALESCE(?, priority),
          response_strategy = COALESCE(?, response_strategy),
          mitigation_plan = COALESCE(?, mitigation_plan),
          target_mitigation_date = COALESCE(?, target_mitigation_date),
          contingency_plan = COALESCE(?, contingency_plan),
          trigger_conditions = COALESCE(?, trigger_conditions),
          owner_id = COALESCE(?, owner_id),
          backup_owner_id = COALESCE(?, backup_owner_id),
          due_date = COALESCE(?, due_date),
          review_frequency = COALESCE(?, review_frequency),
          next_review_date = COALESCE(?, next_review_date),
          schedule_impact = COALESCE(?, schedule_impact),
          cost_impact = COALESCE(?, cost_impact),
          quality_impact = COALESCE(?, quality_impact),
          scope_impact = COALESCE(?, scope_impact),
          escalation_reason = COALESCE(?, escalation_reason),
          escalated_to = COALESCE(?, escalated_to),
          escalated_date = CASE WHEN ? IS NOT NULL AND escalated_to IS NULL THEN CURDATE() ELSE escalated_date END,
          closed_date = CASE WHEN ? IN ('closed', 'mitigated') AND closed_date IS NULL THEN CURDATE() ELSE closed_date END,
          updated_at = NOW()
        WHERE id = ?
      `, [
        sanitizedTitle, sanitizedDescription, category, source, status,
        probability, newProbScore, impact, newImpScore, newRiskScore, newRiskLevel,
        priority, response_strategy, sanitizedMitigation, target_mitigation_date,
        sanitizedContingency, trigger_conditions,
        owner_id, backup_owner_id, due_date,
        review_frequency, next_review_date,
        schedule_impact, cost_impact, quality_impact, scope_impact,
        escalation_reason, escalated_to, escalated_to, status,
        id
      ]);

      // Log changes
      for (const change of changes) {
        await query(
          `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, field_name, old_value, new_value, description)
           VALUES (UUID(), ?, ?, 'updated', ?, ?, ?, ?)`,
          [id, user.userId, change.field, String(change.oldValue || ''), String(change.newValue || ''), 
           `Changed ${change.field} from "${change.oldValue}" to "${change.newValue}"`]
        );
      }

      if (changes.length > 0) {
        await query(
          `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, description)
           VALUES (UUID(), ?, ?, 'updated', ?)`,
          [id, user.userId, `Updated ${changes.length} field(s): ${changes.map(c => c.field).join(', ')}`]
        );
      }

      return NextResponse.json({ success: true, message: 'Risk updated successfully', changes: changes.length });
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

// DELETE - Soft delete a risk
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      // Get risk info for logging
      const riskInfo = await query<{ project_id: number; risk_key: string; title: string }[]>(
        `SELECT project_id, risk_key, title FROM risks WHERE id = ? AND deleted_at IS NULL`, [id]
      );

      if (!riskInfo.length) {
        return NextResponse.json({ success: false, error: 'Risk not found' }, { status: 404 });
      }

      await query(`UPDATE risks SET deleted_at = NOW() WHERE id = ?`, [id]);

      // Log activity
      await query(
        `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, description)
         VALUES (UUID(), ?, ?, 'deleted', ?)`,
        [id, user.userId, `Deleted risk: ${riskInfo[0].risk_key}`]
      );

      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'deleted', 'risk', ?, ?)`,
        [user.userId, riskInfo[0].project_id, id, `Deleted risk: ${riskInfo[0].risk_key} - ${riskInfo[0].title}`]
      );

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
