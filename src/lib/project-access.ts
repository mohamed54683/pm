import { query } from "@/lib/db";

export interface AccessContext {
  userId: number;
  departmentId: number | null;
  isDeptManager: boolean;
  isAdmin: boolean;
  accessibleProjectIds: number[];
}

/**
 * Get the user's access context: department, role, accessible projects.
 * - Admins: see everything
 * - Department Managers: see all dept projects
 * - Staff: see only projects they are members of
 */
export async function getAccessContext(userId: number): Promise<AccessContext> {
  // Get user info
  const [user] = await query<any[]>(
    `SELECT u.id, u.department_id, 
            COALESCE(r.name, '') as role_name,
            (SELECT COUNT(*) FROM departments d WHERE d.manager_id = u.id) as is_dept_manager
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  if (!user) {
    return { userId, departmentId: null, isDeptManager: false, isAdmin: false, accessibleProjectIds: [] };
  }

  const isAdmin = user.role_name === "Administrator" || user.role_name === "Super Admin";
  const isDeptManager = user.is_dept_manager > 0;
  const departmentId = user.department_id || null;

  if (isAdmin) {
    return { userId, departmentId, isDeptManager: true, isAdmin: true, accessibleProjectIds: [] };
  }

  let accessibleProjectIds: number[] = [];

  if (isDeptManager && departmentId) {
    // Department manager sees all department projects + projects they're a member of
    const rows = await query<any[]>(
      `SELECT DISTINCT p.id FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.deleted_at IS NULL 
         AND (p.department_id = ? OR pm.user_id IS NOT NULL OR p.manager_id = ? OR p.owner_id = ?)`,
      [userId, departmentId, userId, userId]
    );
    accessibleProjectIds = rows.map((r) => r.id);
  } else {
    // Staff member sees only assigned projects
    const rows = await query<any[]>(
      `SELECT DISTINCT p.id FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? AND pm.is_active = 1
       WHERE p.deleted_at IS NULL
         AND (pm.user_id IS NOT NULL OR p.manager_id = ? OR p.owner_id = ? OR p.created_by = ?)`,
      [userId, userId, userId, userId]
    );
    accessibleProjectIds = rows.map((r) => r.id);
  }

  return { userId, departmentId, isDeptManager, isAdmin, accessibleProjectIds };
}

/**
 * Build a WHERE clause fragment for project-based access control.
 * Returns [sqlFragment, params[]]
 * The caller should reference the projects table alias as 'p'.
 */
export function buildProjectAccessFilter(
  ctx: AccessContext,
  projectAlias: string = "p"
): { sql: string; params: any[] } {
  if (ctx.isAdmin) {
    return { sql: "1=1", params: [] };
  }

  if (ctx.accessibleProjectIds.length === 0) {
    return { sql: "0=1", params: [] };
  }

  return {
    sql: `${projectAlias}.id IN (${ctx.accessibleProjectIds.map(() => "?").join(",")})`,
    params: [...ctx.accessibleProjectIds],
  };
}

/**
 * Build a WHERE clause for entities that belong to a project (tasks, sprints, etc).
 * The caller should use the entity table alias (default 'e') which has a project_id column.
 */
export function buildEntityAccessFilter(
  ctx: AccessContext,
  entityAlias: string = "e"
): { sql: string; params: any[] } {
  if (ctx.isAdmin) {
    return { sql: "1=1", params: [] };
  }

  if (ctx.accessibleProjectIds.length === 0) {
    return { sql: "0=1", params: [] };
  }

  return {
    sql: `${entityAlias}.project_id IN (${ctx.accessibleProjectIds.map(() => "?").join(",")})`,
    params: [...ctx.accessibleProjectIds],
  };
}

/**
 * Check if a user can access a specific project.
 */
export function canAccessProject(ctx: AccessContext, projectId: number): boolean {
  if (ctx.isAdmin) return true;
  return ctx.accessibleProjectIds.includes(projectId);
}
