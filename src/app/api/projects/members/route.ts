/**
 * Project Members API - Manage project team assignments
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { getAccessContext, canAccessProject } from '@/lib/project-access';

// GET - List members of a project
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      if (!project_id) return NextResponse.json({ success: false, error: 'project_id required' }, { status: 400 });
      if (!canAccessProject(ctx, parseInt(project_id)))
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

      const members = await query<any[]>(
        `SELECT pm.id, pm.user_id, pm.role_name, pm.allocation_percentage, pm.hourly_rate,
          pm.start_date, pm.end_date, pm.is_active, pm.joined_at,
          u.name as user_name, u.email as user_email, u.avatar, u.job_title,
          u.department_id, d.name as department_name
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE pm.project_id = ?
         ORDER BY pm.role_name = 'manager' DESC, pm.is_active DESC, u.name`, [project_id]
      );

      // Available users (not yet members)
      const available = await query<any[]>(
        `SELECT u.id, u.name, u.email, u.job_title, u.department_id, d.name as department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.status = 'active' AND u.deleted_at IS NULL
           AND u.id NOT IN (SELECT user_id FROM project_members WHERE project_id = ? AND is_active = 1)
         ORDER BY u.name`, [project_id]
      );

      return NextResponse.json({ success: true, data: members, available });
    } catch (error) {
      console.error('Project Members GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Add member to project
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const body = await request.json();
      const { project_id, user_id, role_name, allocation_percentage } = body;

      if (!project_id || !user_id)
        return NextResponse.json({ success: false, error: 'project_id and user_id required' }, { status: 400 });

      // Only dept managers, project managers, or admins can add members
      if (!ctx.isAdmin && !ctx.isDeptManager) {
        const [pm] = await query<any[]>(`SELECT role_name FROM project_members WHERE project_id = ? AND user_id = ? AND is_active = 1`, [project_id, user.userId]);
        if (!pm || pm.role_name !== 'manager')
          return NextResponse.json({ success: false, error: 'Only project/department managers can add members' }, { status: 403 });
      }

      // Upsert member
      await query(
        `INSERT INTO project_members (project_id, user_id, role_name, allocation_percentage)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_active = 1, role_name = VALUES(role_name), allocation_percentage = VALUES(allocation_percentage), left_at = NULL`,
        [project_id, user_id, role_name || 'member', allocation_percentage || 100]
      );

      await query(`INSERT INTO project_activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, 'member_added', 'project', ?, ?)`,
        [user.userId, project_id, project_id, `Added member to project`]);

      return NextResponse.json({ success: true, message: 'Member added' });
    } catch (error) {
      console.error('Project Members POST error:', error);
      return NextResponse.json({ success: false, error: 'Failed to add member' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// PUT - Update member role/allocation
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, role_name, allocation_percentage, is_active } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Member id required' }, { status: 400 });

      const updates: string[] = [];
      const params: any[] = [];
      if (role_name !== undefined) { updates.push('role_name = ?'); params.push(role_name); }
      if (allocation_percentage !== undefined) { updates.push('allocation_percentage = ?'); params.push(allocation_percentage); }
      if (is_active !== undefined) {
        updates.push('is_active = ?'); params.push(is_active ? 1 : 0);
        if (!is_active) updates.push('left_at = NOW()');
      }
      if (!updates.length) return NextResponse.json({ success: false, error: 'No updates' }, { status: 400 });
      params.push(id);

      await query(`UPDATE project_members SET ${updates.join(', ')} WHERE id = ?`, params);
      return NextResponse.json({ success: true, message: 'Member updated' });
    } catch (error) {
      console.error('Project Members PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update member' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE - Remove member
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

      await query(`UPDATE project_members SET is_active = 0, left_at = NOW() WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Member removed' });
    } catch (error) {
      console.error('Project Members DELETE error:', error);
      return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
    }
  },
  { requiredPermissions: ['projects.edit'] }
);
