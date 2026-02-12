/**
 * Project Templates API - CRUD operations for project templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Fetch templates
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const category = searchParams.get('category');
      const active_only = searchParams.get('active_only') !== 'false';

      if (id) {
        const templates = await query<any[]>(
          'SELECT * FROM project_templates WHERE id = ?',
          [id]
        );

        if (!templates || templates.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Template not found' },
            { status: 404 }
          );
        }

        const template = templates[0];
        return NextResponse.json({
          success: true,
          data: {
            ...template,
            phases: template.phases ? JSON.parse(template.phases) : [],
            tasks: template.tasks ? JSON.parse(template.tasks) : [],
            milestones: template.milestones ? JSON.parse(template.milestones) : []
          }
        });
      }

      let sql = 'SELECT * FROM project_templates WHERE 1=1';
      const params: any[] = [];

      if (active_only) {
        sql += ' AND deleted_at IS NULL';
      }

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      sql += ' ORDER BY name';

      const templates = await query<any[]>(sql, params);

      const formattedTemplates = templates.map((t: any) => ({
        ...t,
        phases: t.phases ? JSON.parse(t.phases) : [],
        tasks: t.tasks ? JSON.parse(t.tasks) : [],
        milestones: t.milestones ? JSON.parse(t.milestones) : []
      }));

      return NextResponse.json({
        success: true,
        data: formattedTemplates
      });

    } catch (error: any) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Create a template
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { name, description, category, phases, tasks, milestones, estimated_duration_days } = body;

      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Template name is required' },
          { status: 400 }
        );
      }

      const id = generateId('tpl');

      await query(
        `INSERT INTO project_templates (id, name, description, category, phases, tasks, milestones, estimated_duration_days, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          description || null,
          category || null,
          phases ? JSON.stringify(phases) : null,
          tasks ? JSON.stringify(tasks) : null,
          milestones ? JSON.stringify(milestones) : null,
          estimated_duration_days || null,
          user.email
        ]
      );

      return NextResponse.json({
        success: true,
        data: { id },
        message: 'Template created successfully'
      });

    } catch (error: any) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.create'] }
);

// PUT - Update a template
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Template ID is required' },
          { status: 400 }
        );
      }

      const updateFields: string[] = [];
      const params: any[] = [];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        params.push(updates.description);
      }

      if (updates.category !== undefined) {
        updateFields.push('category = ?');
        params.push(updates.category);
      }

      if (updates.phases !== undefined) {
        updateFields.push('phases = ?');
        params.push(JSON.stringify(updates.phases));
      }

      if (updates.tasks !== undefined) {
        updateFields.push('tasks = ?');
        params.push(JSON.stringify(updates.tasks));
      }

      if (updates.milestones !== undefined) {
        updateFields.push('milestones = ?');
        params.push(JSON.stringify(updates.milestones));
      }

      if (updates.estimated_duration_days !== undefined) {
        updateFields.push('estimated_duration_days = ?');
        params.push(updates.estimated_duration_days);
      }

      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(updates.is_active);
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      params.push(id);
      await query(
        `UPDATE project_templates SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      return NextResponse.json({
        success: true,
        message: 'Template updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE - Delete a template
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Template ID is required' },
          { status: 400 }
        );
      }

      await query('DELETE FROM project_templates WHERE id = ?', [id]);

      return NextResponse.json({
        success: true,
        message: 'Template deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.delete'] }
);
