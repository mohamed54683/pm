/**
 * Projects API - Department-based project management with access control
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sanitizeString, stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';
import { getAccessContext, buildProjectAccessFilter, canAccessProject } from '@/lib/project-access';

// GET
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const status = searchParams.get('status');
      const search = searchParams.get('search');
      const department_id = searchParams.get('department_id');

      if (id) {
        if (!canAccessProject(ctx, parseInt(id))) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
        const projects = await query<any[]>(
          `SELECT p.*, u.name as owner_name, m.name as manager_name,
            d.name as department_name, d.id as dept_id,
            (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as task_count,
            (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as completed_task_count,
            (SELECT COUNT(*) FROM project_members WHERE project_id = p.id AND is_active = 1) as member_count,
            (SELECT COUNT(*) FROM sprints WHERE project_id = p.id) as sprint_count,
            (SELECT COUNT(*) FROM risks WHERE project_id = p.id AND deleted_at IS NULL) as risk_count,
            (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND deleted_at IS NULL) as issue_count
           FROM projects p
           LEFT JOIN users u ON p.owner_id = u.id
           LEFT JOIN users m ON p.manager_id = m.id
           LEFT JOIN departments d ON p.department_id = d.id
           WHERE p.id = ? AND p.deleted_at IS NULL`, [id]
        );
        if (!projects.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        const project = projects[0];
        const [members, phases, milestones] = await Promise.all([
          query<any[]>(
            `SELECT pm.*, u.name as user_name, u.email as user_email, u.avatar, u.job_title,
              u.department_id as user_dept_id, dept.name as user_dept_name
             FROM project_members pm
             JOIN users u ON pm.user_id = u.id
             LEFT JOIN departments dept ON u.department_id = dept.id
             WHERE pm.project_id = ? AND pm.is_active = 1`, [id]
          ),
          query<any[]>(`SELECT * FROM project_phases WHERE project_id = ? ORDER BY order_index`, [id]),
          query<any[]>(
            `SELECT m.*, ph.name as phase_name FROM project_milestones m
             LEFT JOIN project_phases ph ON m.phase_id = ph.id
             WHERE m.project_id = ? ORDER BY m.due_date`, [id]
          ),
        ]);

        return NextResponse.json({
          success: true,
          data: { ...project, settings: project.settings ? JSON.parse(project.settings) : {}, members, phases, milestones }
        });
      }

      // List projects with access control
      const accessFilter = buildProjectAccessFilter(ctx, 'p');
      let sql = `
        SELECT p.*, u.name as owner_name, m.name as manager_name,
          d.name as department_name,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as task_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as completed_task_count,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id AND is_active = 1) as member_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN users m ON p.manager_id = m.id
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.deleted_at IS NULL AND p.is_template = FALSE AND ${accessFilter.sql}
      `;
      const params: any[] = [...accessFilter.params];

      if (status && status !== 'all') { sql += ` AND p.status = ?`; params.push(status); }
      if (department_id) { sql += ` AND p.department_id = ?`; params.push(department_id); }
      if (search) {
        sql += ` AND (p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)`;
        const s = `%${search}%`; params.push(s, s, s);
      }
      sql += ` ORDER BY p.updated_at DESC`;

      const projects = await query<any[]>(sql, params);

      // Summary scoped to accessible projects
      let sumSql = `SELECT COUNT(*) as total,
        SUM(CASE WHEN status IN ('active','execution','monitoring') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
        SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN health = 'on_track' THEN 1 ELSE 0 END) as on_track,
        SUM(CASE WHEN health = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
        SUM(CASE WHEN health = 'off_track' THEN 1 ELSE 0 END) as off_track
        FROM projects p WHERE p.deleted_at IS NULL AND p.is_template = FALSE AND ${accessFilter.sql}`;
      const summary = await query<any[]>(sumSql, [...accessFilter.params]);

      // Departments list for filter
      const departments = await query<any[]>(`SELECT id, name FROM departments WHERE status = 'active' ORDER BY name`);

      return NextResponse.json({
        success: true,
        data: projects.map(p => ({ ...p, settings: p.settings ? JSON.parse(p.settings) : {} })),
        summary: summary[0],
        departments
      });
    } catch (error) {
      console.error('Projects GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { name, description, status, priority, health, methodology, start_date, end_date, budget, owner_id, manager_id, department_id, category } = body;

      const sanitizedName = sanitizeString(name);
      if (!sanitizedName) return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
      if (!department_id) return NextResponse.json({ success: false, error: 'Department is required' }, { status: 400 });

      // Verify department exists
      const [dept] = await query<any[]>(`SELECT id, manager_id FROM departments WHERE id = ? AND status = 'active'`, [department_id]);
      if (!dept) return NextResponse.json({ success: false, error: 'Invalid department' }, { status: 400 });

      const codeResult = await query<any[]>(`SELECT MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)) as max_num FROM projects WHERE code LIKE 'PRJ-%'`);
      const code = `PRJ-${String((codeResult[0]?.max_num || 0) + 1).padStart(3, '0')}`;

      const result = await query<any>(
        `INSERT INTO projects (uuid, code, name, description, status, priority, health, methodology, planned_start_date, planned_end_date, budget, owner_id, manager_id, department_id, category, created_by)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, sanitizedName, stripDangerousTags(description) || null,
         status || 'planning', priority || 'medium', health || 'not_started', methodology || 'agile',
         start_date || null, end_date || null, budget || 0,
         owner_id || user.userId, manager_id || dept.manager_id || user.userId,
         department_id, sanitizeString(category) || null, user.userId]
      );

      const projectId = result.insertId;

      // Auto-add creator + dept manager as members
      await query(`INSERT IGNORE INTO project_members (project_id, user_id, role_name) VALUES (?, ?, 'manager')`, [projectId, user.userId]);
      if (dept.manager_id && dept.manager_id !== user.userId) {
        await query(`INSERT IGNORE INTO project_members (project_id, user_id, role_name) VALUES (?, ?, 'manager')`, [projectId, dept.manager_id]);
      }
      if (manager_id && manager_id !== user.userId && manager_id !== dept.manager_id) {
        await query(`INSERT IGNORE INTO project_members (project_id, user_id, role_name) VALUES (?, ?, 'manager')`, [projectId, manager_id]);
      }

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'created', 'project', ?, ?)`,
        [user.userId, projectId, projectId, `Created project: ${sanitizedName}`]);

      return NextResponse.json({ success: true, data: { id: projectId, code, name: sanitizedName } }, { status: 201 });
    } catch (error) {
      console.error('Projects POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.create'] }
);

// PUT
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { id, name, description, status, priority, health, methodology, start_date, end_date, budget, actual_cost, progress_percentage, owner_id, manager_id, department_id, category } = body;

      if (!id) return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
      if (!canAccessProject(ctx, id)) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(
        `UPDATE projects SET
          name = COALESCE(?, name), description = COALESCE(?, description),
          status = COALESCE(?, status), priority = COALESCE(?, priority),
          health = COALESCE(?, health), methodology = COALESCE(?, methodology),
          planned_start_date = COALESCE(?, planned_start_date), planned_end_date = COALESCE(?, planned_end_date),
          budget = COALESCE(?, budget), actual_cost = COALESCE(?, actual_cost),
          progress_percentage = COALESCE(?, progress_percentage), owner_id = COALESCE(?, owner_id),
          manager_id = COALESCE(?, manager_id), department_id = COALESCE(?, department_id),
          category = COALESCE(?, category), updated_at = NOW()
         WHERE id = ?`,
        [name ? sanitizeString(name) : null, description ? stripDangerousTags(description) : null,
         status, priority, health, methodology, start_date, end_date, budget, actual_cost, progress_percentage,
         owner_id, manager_id, department_id, category ? sanitizeString(category) : null, id]
      );

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'updated', 'project', ?, 'Updated project')`,
        [user.userId, id, id]);

      return NextResponse.json({ success: true, message: 'Project updated' });
    } catch (error) {
      console.error('Projects PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
      if (!canAccessProject(ctx, parseInt(id))) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      await query(`UPDATE projects SET deleted_at = NOW() WHERE id = ?`, [id]);
      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'deleted', 'project', ?, 'Deleted project')`,
        [user.userId, id, id]);

      return NextResponse.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      console.error('Projects DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.delete'] }
);
