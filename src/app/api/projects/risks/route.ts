import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

function generateId(prefix: string = 'rsk'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - List risks or get single risk
async function handleGet(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const includeHistory = searchParams.get('include_history') === 'true';

    if (id) {
      // Get single risk
      const risks = await query(
        `SELECT r.*, 
                u1.name as identified_by_name,
                u2.name as owner_name
         FROM project_risks r
         LEFT JOIN users u1 ON r.identified_by = u1.id
         LEFT JOIN users u2 ON r.owner_id = u2.id
         WHERE r.id = ?`,
        [id]
      );

      if (!risks || (risks as any[]).length === 0) {
        return NextResponse.json({ success: false, error: 'Risk not found' }, { status: 404 });
      }

      const risk = (risks as any[])[0];

      // Get history if requested
      if (includeHistory) {
        const history = await query(
          `SELECT rh.*, u.name as changed_by_name
           FROM risk_history rh
           LEFT JOIN users u ON rh.changed_by = u.id
           WHERE rh.risk_id = ?
           ORDER BY rh.changed_at DESC`,
          [id]
        );
        risk.history = history;
      }

      return NextResponse.json({ success: true, data: risk });
    }

    // List risks
    let sql = `
      SELECT r.*, 
             u1.name as identified_by_name,
             u2.name as owner_name,
             (r.probability * r.impact) as risk_score
      FROM project_risks r
      LEFT JOIN users u1 ON r.identified_by = u1.id
      LEFT JOIN users u2 ON r.owner_id = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ' AND r.project_id = ?';
      params.push(projectId);
    }

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    if (severity) {
      sql += ' AND r.severity = ?';
      params.push(severity);
    }

    sql += ' ORDER BY (r.probability * r.impact) DESC, r.created_at DESC';

    const risks = await query(sql, params);

    return NextResponse.json({ success: true, data: risks });
  } catch (error: any) {
    console.error('Error fetching risks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create risk
async function handlePost(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { 
      project_id, 
      title, 
      description, 
      category, 
      probability, 
      impact, 
      severity,
      owner_id,
      mitigation_strategy,
      contingency_plan,
      trigger_conditions,
      response_plan,
      task_id
    } = body;

    if (!project_id || !title) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID and title are required' 
      }, { status: 400 });
    }

    const id = generateId('rsk');
    const riskScore = (probability || 3) * (impact || 3);
    
    // Calculate severity if not provided
    let calculatedSeverity = severity;
    if (!calculatedSeverity) {
      if (riskScore >= 15) calculatedSeverity = 'critical';
      else if (riskScore >= 10) calculatedSeverity = 'high';
      else if (riskScore >= 5) calculatedSeverity = 'medium';
      else calculatedSeverity = 'low';
    }

    await query(
      `INSERT INTO project_risks (
        id, project_id, title, description, category, probability, impact, severity,
        identified_by, owner_id, mitigation_strategy, contingency_plan,
        trigger_conditions, response_plan, task_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'identified')`,
      [
        id, project_id, title, description || null, category || 'other',
        probability || 3, impact || 3, calculatedSeverity,
        user.userId, owner_id || null, mitigation_strategy || null, contingency_plan || null,
        trigger_conditions || null, response_plan || null, task_id || null
      ]
    );

    // Log initial history
    await query(
      `INSERT INTO risk_history (id, risk_id, field_changed, new_value, changed_by)
       VALUES (?, ?, 'status', 'identified', ?)`,
      [generateId('rh'), id, user.userId]
    );

    // Log activity
    await query(
      `INSERT INTO project_activity_log (id, project_id, entity_id, entity_type, action, details, user_id)
       VALUES (?, ?, ?, 'risk', 'created', ?, ?)`,
      [generateId('act'), project_id, id, JSON.stringify({ title, severity: calculatedSeverity }), user.userId]
    );

    // Update project risk score
    await updateProjectRiskScore(project_id);

    const risks = await query(
      `SELECT r.*, u.name as identified_by_name
       FROM project_risks r
       LEFT JOIN users u ON r.identified_by = u.id
       WHERE r.id = ?`,
      [id]
    );

    return NextResponse.json({ success: true, data: (risks as any[])[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating risk:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update risk
async function handlePut(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Risk ID is required' }, { status: 400 });
    }

    // Get current risk
    const risks = await query('SELECT * FROM project_risks WHERE id = ?', [id]);
    if (!risks || (risks as any[]).length === 0) {
      return NextResponse.json({ success: false, error: 'Risk not found' }, { status: 404 });
    }
    const currentRisk = (risks as any[])[0];

    const allowedFields = [
      'title', 'description', 'category', 'probability', 'impact', 'severity',
      'owner_id', 'mitigation_strategy', 'contingency_plan', 'trigger_conditions',
      'response_plan', 'status', 'resolution_notes', 'task_id'
    ];

    const updateFields: string[] = [];
    const params: any[] = [];
    const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined && updates[field] !== currentRisk[field]) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
        changes.push({
          field,
          old_value: currentRisk[field],
          new_value: updates[field]
        });
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: true, data: currentRisk, message: 'No changes' });
    }

    // Recalculate severity if probability or impact changed
    if (updates.probability !== undefined || updates.impact !== undefined) {
      const newProb = updates.probability ?? currentRisk.probability;
      const newImpact = updates.impact ?? currentRisk.impact;
      const riskScore = newProb * newImpact;
      
      let newSeverity;
      if (riskScore >= 15) newSeverity = 'critical';
      else if (riskScore >= 10) newSeverity = 'high';
      else if (riskScore >= 5) newSeverity = 'medium';
      else newSeverity = 'low';

      if (newSeverity !== currentRisk.severity && updates.severity === undefined) {
        updateFields.push('severity = ?');
        params.push(newSeverity);
        changes.push({ field: 'severity', old_value: currentRisk.severity, new_value: newSeverity });
      }
    }

    // Handle status changes
    if (updates.status === 'mitigated' && !currentRisk.resolved_at) {
      updateFields.push('resolved_at = NOW()');
    } else if (updates.status === 'closed' && !currentRisk.resolved_at) {
      updateFields.push('resolved_at = NOW()');
    } else if (updates.status === 'occurred') {
      updateFields.push('occurred_at = NOW()');
    }

    updateFields.push('updated_at = NOW()');
    params.push(id);

    await query(
      `UPDATE project_risks SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    // Log history for each change
    for (const change of changes) {
      await query(
        `INSERT INTO risk_history (id, risk_id, field_changed, old_value, new_value, changed_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [generateId('rh'), id, change.field, String(change.old_value || ''), String(change.new_value || ''), user.userId]
      );
    }

    // Update project risk score
    await updateProjectRiskScore(currentRisk.project_id);

    const updatedRisks = await query(
      `SELECT r.*, 
              u1.name as identified_by_name,
              u2.name as owner_name
       FROM project_risks r
       LEFT JOIN users u1 ON r.identified_by = u1.id
       LEFT JOIN users u2 ON r.owner_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    return NextResponse.json({ success: true, data: (updatedRisks as any[])[0] });
  } catch (error: any) {
    console.error('Error updating risk:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete risk
async function handleDelete(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Risk ID is required' }, { status: 400 });
    }

    // Get project_id before deletion
    const risks = await query('SELECT project_id FROM project_risks WHERE id = ?', [id]);
    const projectId = (risks as any[])[0]?.project_id;

    await query('DELETE FROM project_risks WHERE id = ?', [id]);

    // Update project risk score
    if (projectId) {
      await updateProjectRiskScore(projectId);
    }

    return NextResponse.json({ success: true, message: 'Risk deleted' });
  } catch (error: any) {
    console.error('Error deleting risk:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to update project's overall risk score
async function updateProjectRiskScore(projectId: string) {
  try {
    const result = await query(
      `SELECT AVG(probability * impact) as avg_risk_score
       FROM project_risks
       WHERE project_id = ? AND status IN ('identified', 'analyzing', 'planned')`,
      [projectId]
    );
    const avgScore = (result as any[])[0]?.avg_risk_score || 0;
    await query('UPDATE projects SET risk_score = ? WHERE id = ?', [Math.round(avgScore * 10) / 10, projectId]);
  } catch (error) {
    console.error('Error updating project risk score:', error);
  }
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
export const POST = withAuth(handlePost, { requiredPermissions: ['projects.create'] });
export const PUT = withAuth(handlePut, { requiredPermissions: ['projects.edit'] });
export const DELETE = withAuth(handleDelete, { requiredPermissions: ['projects.delete'] });
