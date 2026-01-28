/**
 * Project Phases API - CRUD operations for project phases
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { PhaseFormData } from '@/types/projects';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch phases for a project
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const id = searchParams.get('id');

      if (id) {
        // Fetch single phase with details
        const phases = await query<any[]>(
          `SELECT ph.*, 
            (SELECT COUNT(*) FROM tasks WHERE phase_id = ph.id) as task_count,
            (SELECT COUNT(*) FROM tasks WHERE phase_id = ph.id AND status = 'completed') as completed_task_count
           FROM project_phases ph
           WHERE ph.id = ?`,
          [id]
        );

        if (!phases || phases.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Phase not found' },
            { status: 404 }
          );
        }

        // Fetch tasks for this phase
        const tasks = await query<any[]>(
          `SELECT t.*, 
            (SELECT GROUP_CONCAT(u.name) FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id) as assignees
           FROM tasks t
           WHERE t.phase_id = ?
           ORDER BY t.order_index`,
          [id]
        );

        // Fetch dependencies
        const dependencies = await query<any[]>(
          `SELECT pd.*, ph.name as depends_on_phase_name
           FROM phase_dependencies pd
           JOIN project_phases ph ON pd.depends_on_phase_id = ph.id
           WHERE pd.phase_id = ?`,
          [id]
        );

        return NextResponse.json({
          success: true,
          data: {
            ...phases[0],
            tasks,
            dependencies
          }
        });
      }

      if (!project_id) {
        return NextResponse.json(
          { success: false, error: 'Project ID is required' },
          { status: 400 }
        );
      }

      // Fetch all phases for project
      const phases = await query<any[]>(
        `SELECT ph.*,
          (SELECT COUNT(*) FROM tasks WHERE phase_id = ph.id) as task_count,
          (SELECT COUNT(*) FROM tasks WHERE phase_id = ph.id AND status = 'completed') as completed_task_count
         FROM project_phases ph
         WHERE ph.project_id = ?
         ORDER BY ph.order_index`,
        [project_id]
      );

      return NextResponse.json({
        success: true,
        data: phases
      });

    } catch (error: any) {
      console.error('Error fetching phases:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Create a new phase
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, ...phaseData } = body as { project_id: string } & PhaseFormData;

      if (!project_id) {
        return NextResponse.json(
          { success: false, error: 'Project ID is required' },
          { status: 400 }
        );
      }

      if (!phaseData.name) {
        return NextResponse.json(
          { success: false, error: 'Phase name is required' },
          { status: 400 }
        );
      }

      // Get max order index
      const maxOrder = await query<any[]>(
        'SELECT MAX(order_index) as max_order FROM project_phases WHERE project_id = ?',
        [project_id]
      );
      const orderIndex = phaseData.order_index ?? ((maxOrder[0]?.max_order || 0) + 1);

      const id = generateId('phase');

      await query(
        `INSERT INTO project_phases (
          id, project_id, name, description, status, order_index,
          start_date, end_date, color, is_milestone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          project_id,
          phaseData.name,
          phaseData.description || null,
          phaseData.status || 'not_started',
          orderIndex,
          phaseData.start_date || null,
          phaseData.end_date || null,
          phaseData.color || '#6366F1',
          phaseData.is_milestone || false
        ]
      );

      // Log activity
      await query(
        `INSERT INTO project_activity_log (id, project_id, phase_id, user_id, action, entity_type, entity_id, description)
         VALUES (?, ?, ?, ?, 'create', 'phase', ?, ?)`,
        [generateId('log'), project_id, id, user.userId, id, `Created phase: ${phaseData.name}`]
      );

      return NextResponse.json({
        success: true,
        data: { id },
        message: 'Phase created successfully'
      });

    } catch (error: any) {
      console.error('Error creating phase:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// PUT - Update a phase
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Phase ID is required' },
          { status: 400 }
        );
      }

      // Check if phase exists
      const existing = await query<any[]>('SELECT project_id FROM project_phases WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Phase not found' },
          { status: 404 }
        );
      }

      const updateFields: string[] = [];
      const params: any[] = [];

      const allowedFields = [
        'name', 'description', 'status', 'order_index',
        'start_date', 'end_date', 'actual_start_date', 'actual_end_date',
        'progress_percentage', 'color', 'is_milestone'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      params.push(id);
      await query(
        `UPDATE project_phases SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      // Update project progress based on phase progress
      await updateProjectProgress(existing[0].project_id);

      // Log activity
      await query(
        `INSERT INTO project_activity_log (id, project_id, phase_id, user_id, action, entity_type, entity_id, description)
         VALUES (?, ?, ?, ?, 'update', 'phase', ?, ?)`,
        [generateId('log'), existing[0].project_id, id, user.userId, id, 'Updated phase']
      );

      return NextResponse.json({
        success: true,
        message: 'Phase updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating phase:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE - Delete a phase
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Phase ID is required' },
          { status: 400 }
        );
      }

      // Get project ID before deletion
      const existing = await query<any[]>('SELECT project_id, name FROM project_phases WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Phase not found' },
          { status: 404 }
        );
      }

      await query('DELETE FROM project_phases WHERE id = ?', [id]);

      // Reorder remaining phases
      await query(
        `SET @rank = 0; UPDATE project_phases SET order_index = (@rank := @rank + 1) WHERE project_id = ? ORDER BY order_index`,
        [existing[0].project_id]
      );

      return NextResponse.json({
        success: true,
        message: 'Phase deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting phase:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.delete'] }
);

// Helper to update project progress based on phases
async function updateProjectProgress(projectId: string): Promise<void> {
  const result = await query<any[]>(
    `SELECT 
      AVG(progress_percentage) as avg_progress
     FROM project_phases 
     WHERE project_id = ?`,
    [projectId]
  );

  if (result && result.length > 0) {
    await query(
      'UPDATE projects SET progress_percentage = ? WHERE id = ?',
      [result[0].avg_progress || 0, projectId]
    );
  }
}
