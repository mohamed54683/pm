import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

function generateId(prefix: string = 'wf'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - List workflows, statuses, or transitions
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflow_id');
    const projectId = searchParams.get('project_id');
    const includeStatuses = searchParams.get('include_statuses') !== 'false';
    const includeTransitions = searchParams.get('include_transitions') === 'true';

    if (workflowId) {
      // Get single workflow with statuses and optionally transitions
      const workflows = await query(
        `SELECT * FROM status_workflows WHERE id = ?`,
        [workflowId]
      );

      if (!workflows || (workflows as any[]).length === 0) {
        return NextResponse.json({ success: false, error: 'Workflow not found' }, { status: 404 });
      }

      const workflow = (workflows as any[])[0];

      if (includeStatuses) {
        const statuses = await query(
          `SELECT * FROM workflow_statuses WHERE workflow_id = ? ORDER BY order_index`,
          [workflowId]
        );
        workflow.statuses = statuses;
      }

      if (includeTransitions) {
        const transitions = await query(
          `SELECT st.*, 
                  ws1.name as from_status_name,
                  ws2.name as to_status_name
           FROM status_transitions st
           LEFT JOIN workflow_statuses ws1 ON st.from_status_id = ws1.id
           LEFT JOIN workflow_statuses ws2 ON st.to_status_id = ws2.id
           WHERE st.workflow_id = ?`,
          [workflowId]
        );
        
        // Parse conditions for each transition
        workflow.transitions = (transitions as any[]).map(t => ({
          ...t,
          conditions: t.conditions ? JSON.parse(t.conditions) : null
        }));
      }

      return NextResponse.json({ success: true, data: workflow });
    }

    // List workflows
    let sql = `
      SELECT sw.*,
             (SELECT COUNT(*) FROM workflow_statuses ws WHERE ws.workflow_id = sw.id) as status_count,
             (SELECT COUNT(*) FROM projects p WHERE p.workflow_id = sw.id) as project_count
      FROM status_workflows sw
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ' AND (sw.project_id = ? OR sw.is_default = TRUE)';
      params.push(projectId);
    }

    sql += ' ORDER BY sw.is_default DESC, sw.name';

    const workflows = await query(sql, params);

    // Optionally include statuses for each workflow
    if (includeStatuses) {
      for (const workflow of workflows as any[]) {
        const statuses = await query(
          `SELECT * FROM workflow_statuses WHERE workflow_id = ? ORDER BY order_index`,
          [workflow.id]
        );
        workflow.statuses = statuses;
      }
    }

    return NextResponse.json({ success: true, data: workflows });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create workflow, status, or transition
async function handlePost(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { type = 'workflow' } = body;

    if (type === 'status') {
      // Create status
      const { workflow_id, name, color, category, description, order_index, wip_limit } = body;

      if (!workflow_id || !name) {
        return NextResponse.json({ 
          success: false, 
          error: 'Workflow ID and name are required' 
        }, { status: 400 });
      }

      const id = generateId('ws');

      await query(
        `INSERT INTO workflow_statuses 
         (id, workflow_id, name, color, category, description, order_index, wip_limit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, workflow_id, name, color || '#6b7280', category || 'in_progress', 
         description || null, order_index || 0, wip_limit || null]
      );

      const statuses = await query('SELECT * FROM workflow_statuses WHERE id = ?', [id]);
      return NextResponse.json({ success: true, data: (statuses as any[])[0] }, { status: 201 });
    }

    if (type === 'transition') {
      // Create transition
      const { workflow_id, from_status_id, to_status_id, name, conditions } = body;

      if (!workflow_id || !to_status_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Workflow ID and to_status_id are required' 
        }, { status: 400 });
      }

      const id = generateId('st');

      await query(
        `INSERT INTO status_transitions 
         (id, workflow_id, from_status_id, to_status_id, name, conditions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, workflow_id, from_status_id || null, to_status_id, name || null,
         conditions ? JSON.stringify(conditions) : null]
      );

      const transitions = await query(
        `SELECT st.*, ws1.name as from_status_name, ws2.name as to_status_name
         FROM status_transitions st
         LEFT JOIN workflow_statuses ws1 ON st.from_status_id = ws1.id
         LEFT JOIN workflow_statuses ws2 ON st.to_status_id = ws2.id
         WHERE st.id = ?`,
        [id]
      );
      const transition = (transitions as any[])[0];
      transition.conditions = transition.conditions ? JSON.parse(transition.conditions) : null;

      return NextResponse.json({ success: true, data: transition }, { status: 201 });
    }

    // Create workflow
    const { name, description, project_id, entity_type, is_default, statuses } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Workflow name is required' }, { status: 400 });
    }

    const workflowId = generateId('wf');

    // If this is default, unset other defaults for this entity type
    if (is_default) {
      await query(
        `UPDATE status_workflows SET is_default = FALSE WHERE entity_type = ?`,
        [entity_type || 'task']
      );
    }

    await query(
      `INSERT INTO status_workflows (id, name, description, project_id, entity_type, is_default, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workflowId, name, description || null, project_id || null, entity_type || 'task', is_default || false, user.id]
    );

    // Create default statuses if provided
    if (statuses && Array.isArray(statuses)) {
      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const statusId = generateId('ws');
        await query(
          `INSERT INTO workflow_statuses 
           (id, workflow_id, name, color, category, description, order_index, wip_limit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [statusId, workflowId, status.name, status.color || '#6b7280', 
           status.category || 'in_progress', status.description || null, 
           status.order_index ?? i, status.wip_limit || null]
        );
      }
    }

    // Fetch created workflow with statuses
    const workflows = await query('SELECT * FROM status_workflows WHERE id = ?', [workflowId]);
    const workflow = (workflows as any[])[0];
    
    const workflowStatuses = await query(
      'SELECT * FROM workflow_statuses WHERE workflow_id = ? ORDER BY order_index',
      [workflowId]
    );
    workflow.statuses = workflowStatuses;

    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update workflow, status, or transition
async function handlePut(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { id, type = 'workflow', ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (type === 'status') {
      const allowedFields = ['name', 'color', 'category', 'description', 'order_index', 'wip_limit', 'is_initial', 'is_final'];
      const updateFields: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }

      if (updateFields.length > 0) {
        params.push(id);
        await query(`UPDATE workflow_statuses SET ${updateFields.join(', ')} WHERE id = ?`, params);
      }

      const statuses = await query('SELECT * FROM workflow_statuses WHERE id = ?', [id]);
      return NextResponse.json({ success: true, data: (statuses as any[])[0] });
    }

    if (type === 'transition') {
      const allowedFields = ['from_status_id', 'to_status_id', 'name', 'conditions'];
      const updateFields: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          if (field === 'conditions') {
            params.push(JSON.stringify(updates[field]));
          } else {
            params.push(updates[field]);
          }
        }
      }

      if (updateFields.length > 0) {
        params.push(id);
        await query(`UPDATE status_transitions SET ${updateFields.join(', ')} WHERE id = ?`, params);
      }

      const transitions = await query(
        `SELECT st.*, ws1.name as from_status_name, ws2.name as to_status_name
         FROM status_transitions st
         LEFT JOIN workflow_statuses ws1 ON st.from_status_id = ws1.id
         LEFT JOIN workflow_statuses ws2 ON st.to_status_id = ws2.id
         WHERE st.id = ?`,
        [id]
      );
      const transition = (transitions as any[])[0];
      transition.conditions = transition.conditions ? JSON.parse(transition.conditions) : null;

      return NextResponse.json({ success: true, data: transition });
    }

    // Update workflow
    const allowedFields = ['name', 'description', 'is_default', 'is_active'];
    const updateFields: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    // Handle is_default
    if (updates.is_default === true) {
      const current = await query('SELECT entity_type FROM status_workflows WHERE id = ?', [id]);
      if (current && (current as any[]).length > 0) {
        await query(
          `UPDATE status_workflows SET is_default = FALSE WHERE entity_type = ? AND id != ?`,
          [(current as any[])[0].entity_type, id]
        );
      }
    }

    updateFields.push('updated_at = NOW()');
    params.push(id);

    await query(`UPDATE status_workflows SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const workflows = await query('SELECT * FROM status_workflows WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: (workflows as any[])[0] });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete workflow, status, or transition
async function handleDelete(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'workflow';

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (type === 'status') {
      // Check if status is in use
      const usage = await query(
        'SELECT COUNT(*) as count FROM tasks WHERE workflow_status_id = ?',
        [id]
      );
      if ((usage as any[])[0].count > 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot delete status that is in use by tasks' 
        }, { status: 400 });
      }

      await query('DELETE FROM workflow_statuses WHERE id = ?', [id]);
      return NextResponse.json({ success: true, message: 'Status deleted' });
    }

    if (type === 'transition') {
      await query('DELETE FROM status_transitions WHERE id = ?', [id]);
      return NextResponse.json({ success: true, message: 'Transition deleted' });
    }

    // Check if workflow is in use
    const usage = await query(
      'SELECT COUNT(*) as count FROM projects WHERE workflow_id = ?',
      [id]
    );
    if ((usage as any[])[0].count > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete workflow that is in use by projects' 
      }, { status: 400 });
    }

    // Delete workflow (cascade will handle statuses and transitions)
    await query('DELETE FROM status_workflows WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Workflow deleted' });
  } catch (error: any) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
export const POST = withAuth(handlePost, { requiredPermissions: ['projects.create'] });
export const PUT = withAuth(handlePut, { requiredPermissions: ['projects.edit'] });
export const DELETE = withAuth(handleDelete, { requiredPermissions: ['projects.delete'] });
