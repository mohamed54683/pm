/**
 * Projects API - Secure CRUD operations for PMP database
 * Protected with authentication and input sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch projects with filtering (requires projects.view permission)
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const status = searchParams.get('status');
      const search = searchParams.get('search');

      // If fetching a single project
      if (id) {
        const projects = await query<any[]>(
          `SELECT p.*, u.name as owner_name, m.name as manager_name,
            (SELECT COUNT(*) FROM project_phases WHERE project_id = p.id) as phase_count,
            (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as task_count,
            (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as completed_task_count,
            (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
           FROM projects p
           LEFT JOIN users u ON p.owner_id = u.id
           LEFT JOIN users m ON p.manager_id = m.id
           WHERE p.id = ? AND p.deleted_at IS NULL`,
          [id]
        );

        if (!projects || projects.length === 0) {
          return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
        }

        const project = projects[0];

        // Fetch phases
        const phases = await query<any[]>(
          `SELECT * FROM project_phases WHERE project_id = ? ORDER BY order_index`,
          [id]
        );

        // Fetch members
        const members = await query<any[]>(
          `SELECT pm.*, u.name as user_name, u.email as user_email
           FROM project_members pm
           JOIN users u ON pm.user_id = u.id
           WHERE pm.project_id = ?`,
          [id]
        );

        // Fetch milestones
        const milestones = await query<any[]>(
          `SELECT m.*, ph.name as phase_name
           FROM milestones m
           LEFT JOIN project_phases ph ON m.phase_id = ph.id
           WHERE m.project_id = ?
           ORDER BY m.due_date`,
          [id]
        );

        return NextResponse.json({
          success: true,
          data: {
            ...project,
            tags: project.tags ? JSON.parse(project.tags) : [],
            settings: project.settings ? JSON.parse(project.settings) : {},
            phases,
            members,
            milestones
          }
        });
      }

      // Build query for listing projects
      let sql = `
        SELECT p.*, u.name as owner_name, m.name as manager_name,
          (SELECT COUNT(*) FROM project_phases WHERE project_id = p.id) as phase_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as task_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as completed_task_count,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN users m ON p.manager_id = m.id
        WHERE p.deleted_at IS NULL AND p.is_template = FALSE
      `;
      const params: any[] = [];

      if (status && status !== 'all') {
        sql += ` AND p.status = ?`;
        params.push(status);
      }

      if (search) {
        sql += ` AND (p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY p.updated_at DESC`;

      const projects = await query<any[]>(sql, params);

      // Get summary counts
      const summaryResult = await query<any[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
          SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold
        FROM projects
        WHERE deleted_at IS NULL AND is_template = FALSE
      `);

      return NextResponse.json({
        success: true,
        data: projects.map(p => ({
          ...p,
          tags: p.tags ? JSON.parse(p.tags) : [],
          settings: p.settings ? JSON.parse(p.settings) : {},
        })),
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Projects API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Create a new project (requires projects.create permission)
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        name, description, status, priority, health, methodology,
        start_date, end_date, budget, owner_id, manager_id, department, category, tags
      } = body;

      // Sanitize inputs
      const sanitizedName = sanitizeString(name);
      const sanitizedDescription = stripDangerousTags(description);
      const sanitizedDepartment = sanitizeString(department);
      const sanitizedCategory = sanitizeString(category);

      if (!sanitizedName) {
        return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
      }

      // Generate project code
      const codeResult = await query<any[]>(`SELECT MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)) as max_num FROM projects WHERE code LIKE 'PRJ-%'`);
      const nextNum = (codeResult[0]?.max_num || 0) + 1;
      const code = `PRJ-${String(nextNum).padStart(3, '0')}`;

      const result = await query<any>(
        `INSERT INTO projects (uuid, code, name, description, status, priority, health, methodology, start_date, end_date, budget, owner_id, manager_id, department, category, tags, created_by)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code, sanitizedName, sanitizedDescription || null,
          status || 'planning', priority || 'medium', health || 'on_track',
          methodology || 'agile', start_date || null, end_date || null,
          budget || 0, owner_id || user.userId, manager_id || null,
          sanitizedDepartment || null, sanitizedCategory || null,
          tags ? JSON.stringify(tags) : null, user.userId
        ]
      );

      const projectId = result.insertId;

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'created', 'project', ?, ?)`,
        [user.userId, projectId, projectId, `Created project: ${sanitizedName}`]
      );

      return NextResponse.json({
        success: true,
        data: { id: projectId, code, name: sanitizedName }
      }, { status: 201 });
    } catch (error) {
      console.error('Create project error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.create'] }
);

// PUT - Update a project (requires projects.edit permission)
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        id, name, description, status, priority, health, methodology,
        start_date, end_date, budget, actual_cost, progress,
        owner_id, manager_id, department, category, tags
      } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizedName = name ? sanitizeString(name) : null;
      const sanitizedDescription = description ? stripDangerousTags(description) : null;
      const sanitizedDepartment = department ? sanitizeString(department) : null;
      const sanitizedCategory = category ? sanitizeString(category) : null;

      await query(
        `UPDATE projects SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          health = COALESCE(?, health),
          methodology = COALESCE(?, methodology),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          budget = COALESCE(?, budget),
          actual_cost = COALESCE(?, actual_cost),
          progress = COALESCE(?, progress),
          owner_id = COALESCE(?, owner_id),
          manager_id = COALESCE(?, manager_id),
          department = COALESCE(?, department),
          category = COALESCE(?, category),
          tags = COALESCE(?, tags),
          updated_at = NOW()
         WHERE id = ?`,
        [
          sanitizedName, sanitizedDescription, status, priority, health, methodology,
          start_date, end_date, budget, actual_cost, progress,
          owner_id, manager_id, sanitizedDepartment, sanitizedCategory,
          tags ? JSON.stringify(tags) : null, id
        ]
      );

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'updated', 'project', ?, ?)`,
        [user.userId, id, id, `Updated project`]
      );

      return NextResponse.json({ success: true, message: 'Project updated successfully' });
    } catch (error) {
      console.error('Update project error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE - Soft delete a project (requires projects.delete permission)
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
      }

      await query(`UPDATE projects SET deleted_at = NOW() WHERE id = ?`, [id]);

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description)
         VALUES (?, ?, 'deleted', 'project', ?, ?)`,
        [user.userId, id, id, `Deleted project`]
      );

      return NextResponse.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete project', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.delete'] }
);
