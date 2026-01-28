/**
 * Project Milestones API - CRUD operations for project milestones
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { MilestoneFormData } from '@/types/projects';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch milestones
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const id = searchParams.get('id');
      const status = searchParams.get('status');
      const upcoming = searchParams.get('upcoming') === 'true';

      if (id) {
        const milestones = await query<any[]>(
          `SELECT m.*, p.name as project_name, ph.name as phase_name
           FROM project_milestones m
           LEFT JOIN projects p ON m.project_id = p.id
           LEFT JOIN project_phases ph ON m.phase_id = ph.id
           WHERE m.id = ?`,
          [id]
        );

        if (!milestones || milestones.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Milestone not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: milestones[0]
        });
      }

      let sql = `
        SELECT m.*, p.name as project_name, ph.name as phase_name
        FROM project_milestones m
        LEFT JOIN projects p ON m.project_id = p.id
        LEFT JOIN project_phases ph ON m.phase_id = ph.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (project_id) {
        sql += ` AND m.project_id = ?`;
        params.push(project_id);
      }

      if (status) {
        sql += ` AND m.status = ?`;
        params.push(status);
      }

      if (upcoming) {
        sql += ` AND m.due_date >= CURDATE() AND m.status = 'pending'`;
      }

      sql += ` ORDER BY m.due_date`;

      const milestones = await query<any[]>(sql, params);

      return NextResponse.json({
        success: true,
        data: milestones
      });

    } catch (error: any) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Create a milestone
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { project_id, ...milestoneData } = body as { project_id: string } & MilestoneFormData;

      if (!project_id) {
        return NextResponse.json(
          { success: false, error: 'Project ID is required' },
          { status: 400 }
        );
      }

      if (!milestoneData.name) {
        return NextResponse.json(
          { success: false, error: 'Milestone name is required' },
          { status: 400 }
        );
      }

      if (!milestoneData.due_date) {
        return NextResponse.json(
          { success: false, error: 'Due date is required' },
          { status: 400 }
        );
      }

      const id = generateId('mile');

      await query(
        `INSERT INTO project_milestones (id, project_id, phase_id, name, description, due_date, is_critical)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          project_id,
          milestoneData.phase_id || null,
          milestoneData.name,
          milestoneData.description || null,
          milestoneData.due_date,
          milestoneData.is_critical || false
        ]
      );

      // Log activity
      await query(
        `INSERT INTO project_activity_log (id, project_id, user_id, action, entity_type, entity_id, description)
         VALUES (?, ?, ?, 'create', 'milestone', ?, ?)`,
        [generateId('log'), project_id, user.userId, id, `Created milestone: ${milestoneData.name}`]
      );

      return NextResponse.json({
        success: true,
        data: { id },
        message: 'Milestone created successfully'
      });

    } catch (error: any) {
      console.error('Error creating milestone:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// PUT - Update a milestone
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Milestone ID is required' },
          { status: 400 }
        );
      }

      const existing = await query<any[]>('SELECT project_id FROM project_milestones WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Milestone not found' },
          { status: 404 }
        );
      }

      const updateFields: string[] = [];
      const params: any[] = [];

      const allowedFields = ['name', 'description', 'phase_id', 'due_date', 'completed_date', 'status', 'is_critical'];

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
        `UPDATE project_milestones SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      return NextResponse.json({
        success: true,
        message: 'Milestone updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating milestone:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE - Delete a milestone
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Milestone ID is required' },
          { status: 400 }
        );
      }

      await query('DELETE FROM project_milestones WHERE id = ?', [id]);

      return NextResponse.json({
        success: true,
        message: 'Milestone deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting milestone:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.delete'] }
);
