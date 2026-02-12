/**
 * Dashboard API - System-wide summary from real DB data
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { getAccessContext, buildProjectAccessFilter } from '@/lib/project-access';

// Safe query wrapper - returns default on failure (missing tables etc)
async function safeQuery<T>(sql: string, params: any[] = [], fallback: T): Promise<T> {
  try {
    return await query<T>(sql, params);
  } catch {
    return fallback;
  }
}

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);

      // 1. Project summary
      const pf1 = buildProjectAccessFilter(ctx, 'p');
      const projectSummary = await safeQuery<any[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN p.status IN ('active','execution','monitoring') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN p.status = 'planning' THEN 1 ELSE 0 END) as planning,
          SUM(CASE WHEN p.status = 'on_hold' THEN 1 ELSE 0 END) as on_hold,
          SUM(CASE WHEN p.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN p.health = 'on_track' THEN 1 ELSE 0 END) as on_track,
          SUM(CASE WHEN p.health = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
          SUM(CASE WHEN p.health = 'off_track' THEN 1 ELSE 0 END) as off_track
         FROM projects p
         WHERE p.deleted_at IS NULL AND p.is_template = FALSE AND ${pf1.sql}`,
        [...pf1.params],
        [{ total: 0, active: 0, completed: 0, planning: 0, on_hold: 0, cancelled: 0, on_track: 0, at_risk: 0, off_track: 0 }]
      );

      // 2. Task summary
      const pf2 = buildProjectAccessFilter(ctx, 'p');
      const taskSummary = await safeQuery<any[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN t.status = 'to_do' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN t.status = 'in_review' THEN 1 ELSE 0 END) as in_review,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN t.due_date < CURDATE() AND t.status NOT IN ('done','cancelled') THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN t.priority = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN t.priority = 'high' THEN 1 ELSE 0 END) as highpriority
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL AND ${pf2.sql}`,
        [...pf2.params],
        [{ total: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0, overdue: 0, critical: 0, highpriority: 0 }]
      );

      // 3. Recent projects
      const pf3 = buildProjectAccessFilter(ctx, 'p');
      const recentProjects = await safeQuery<any[]>(
        `SELECT p.id, p.code, p.name, p.status, p.health, p.priority, p.progress,
          p.start_date, p.end_date,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as task_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as done_count
         FROM projects p
         WHERE p.deleted_at IS NULL AND p.is_template = FALSE AND ${pf3.sql}
         ORDER BY p.updated_at DESC LIMIT 10`,
        [...pf3.params],
        []
      );

      // 4. My tasks (upcoming / overdue)
      const myTasks = await safeQuery<any[]>(
        `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id,
          p.name as project_name, p.code as project_code
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         LEFT JOIN task_assignees ta ON t.id = ta.task_id
         WHERE ta.user_id = ? AND t.deleted_at IS NULL AND t.status NOT IN ('done','cancelled','closed')
         ORDER BY t.due_date IS NULL, t.due_date ASC LIMIT 15`,
        [user.userId],
        []
      );

      // 5. Active sprints
      const pf5 = buildProjectAccessFilter(ctx, 'p');
      const activeSprints = await safeQuery<any[]>(
        `SELECT s.id, s.name, s.start_date, s.end_date, p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_tasks,
          (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_points,
          (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_points
         FROM sprints s
         JOIN projects p ON s.project_id = p.id
         WHERE s.status = 'active' AND p.deleted_at IS NULL AND ${pf5.sql}
         ORDER BY s.end_date LIMIT 5`,
        [...pf5.params],
        []
      );

      // 6. Risk & Issue summary - consistent alias 'p' in all subqueries
      const pf6 = buildProjectAccessFilter(ctx, 'p');
      const riskSummary = await safeQuery<any[]>(
        `SELECT
          (SELECT COUNT(*) FROM risks r JOIN projects p ON r.project_id=p.id WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND r.status NOT IN ('closed','mitigated') AND ${pf6.sql}) as open_risks,
          (SELECT COUNT(*) FROM risks r JOIN projects p ON r.project_id=p.id WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND r.risk_level IN ('critical','high') AND r.status NOT IN ('closed','mitigated') AND ${pf6.sql}) as high_risks,
          (SELECT COUNT(*) FROM risks r JOIN projects p ON r.project_id=p.id WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND ${pf6.sql}) as total_risks,
          (SELECT COUNT(*) FROM issues i JOIN projects p ON i.project_id=p.id WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND i.status IN ('open','in_progress') AND ${pf6.sql}) as open_issues,
          (SELECT COUNT(*) FROM issues i JOIN projects p ON i.project_id=p.id WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND i.severity IN ('critical','high') AND i.status IN ('open','in_progress') AND ${pf6.sql}) as critical_issues,
          (SELECT COUNT(*) FROM issues i JOIN projects p ON i.project_id=p.id WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND ${pf6.sql}) as total_issues`,
        [...pf6.params, ...pf6.params, ...pf6.params, ...pf6.params, ...pf6.params, ...pf6.params],
        [{ open_risks: 0, high_risks: 0, total_risks: 0, open_issues: 0, critical_issues: 0, total_issues: 0 }]
      );

      // 7. Time tracking summary (this week) - uses duration_minutes column
      const pf7 = buildProjectAccessFilter(ctx, 'p');
      let timeSql = `SELECT
        COALESCE(ROUND(SUM(te.duration_minutes)/60.0, 1), 0) as weekly_hours,
        COALESCE(ROUND(SUM(CASE WHEN te.is_billable=1 THEN te.duration_minutes ELSE 0 END)/60.0, 1), 0) as billable_hours,
        COALESCE(ROUND(SUM(CASE WHEN te.status='submitted' THEN te.duration_minutes ELSE 0 END)/60.0, 1), 0) as pending_hours
        FROM time_entries te JOIN projects p ON te.project_id = p.id
        WHERE te.date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND p.deleted_at IS NULL AND ${pf7.sql}`;
      const timeParams = [...pf7.params];
      if (!ctx.isAdmin && !ctx.isDeptManager) { timeSql += ` AND te.user_id = ?`; timeParams.push(user.userId); }
      const timeSummary = await safeQuery<any[]>(timeSql, timeParams, [{ weekly_hours: 0, billable_hours: 0, pending_hours: 0 }]);

      // 8. Budget overview
      const pf8 = buildProjectAccessFilter(ctx, 'p');
      const budgetOverview = await safeQuery<any[]>(
        `SELECT COALESCE(SUM(pb.total_budget),0) as total_budget,
          COALESCE(SUM(pb.actual_spent),0) as actual_spent,
          COALESCE(SUM(pb.remaining),0) as remaining,
          COUNT(DISTINCT pb.project_id) as budgeted_projects
         FROM project_budgets pb
         JOIN projects p ON pb.project_id = p.id
         WHERE p.deleted_at IS NULL AND ${pf8.sql}`,
        [...pf8.params],
        [{ total_budget: 0, actual_spent: 0, remaining: 0, budgeted_projects: 0 }]
      );

      // 9. Department breakdown (for managers/admins)
      let departmentBreakdown: any[] = [];
      if (ctx.isAdmin || ctx.isDeptManager) {
        departmentBreakdown = await safeQuery<any[]>(
          `SELECT d.id, d.name as department_name,
            COUNT(DISTINCT p.id) as project_count,
            SUM(CASE WHEN p.status IN ('active','execution','monitoring') THEN 1 ELSE 0 END) as active_projects
           FROM departments d
           LEFT JOIN projects p ON p.department_id = d.id AND p.deleted_at IS NULL AND p.is_template = FALSE
           WHERE d.status = 'active'
           GROUP BY d.id, d.name ORDER BY d.name`,
          [],
          []
        );
      }

      // 10. Recent activity
      const pf10 = buildProjectAccessFilter(ctx, 'p');
      const recentActivity = await safeQuery<any[]>(
        `SELECT al.*, u.name as user_name,
          p.name as project_name, p.code as project_code
         FROM activities al
         JOIN users u ON al.user_id = u.id
         LEFT JOIN projects p ON al.project_id = p.id
         WHERE (al.project_id IS NULL OR (p.deleted_at IS NULL AND ${pf10.sql}))
         ORDER BY al.created_at DESC LIMIT 20`,
        [...pf10.params],
        []
      );

      // 11. Users summary
      const usersSummary = await safeQuery<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN u.status = 'inactive' THEN 1 ELSE 0 END) as inactive
         FROM users u WHERE u.deleted_at IS NULL`,
        [],
        [{ total: 0, active: 0, inactive: 0 }]
      );

      // 12. Teams summary
      const teamsSummary = await safeQuery<any[]>(
        `SELECT
          (SELECT COUNT(*) FROM teams WHERE deleted_at IS NULL) as total,
          (SELECT COUNT(*) FROM team_members WHERE deleted_at IS NULL) as total_members`,
        [],
        [{ total: 0, total_members: 0 }]
      );

      // 13. Asset summary (table may not exist)
      const assetSummary = await safeQuery<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status IN ('scrapped','lost') THEN 1 ELSE 0 END) as retired
         FROM assets WHERE deleted_at IS NULL`,
        [],
        [{ total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0 }]
      );

      // 14. Expense summary
      const pf13 = buildProjectAccessFilter(ctx, 'p');
      const expenseSummary = await safeQuery<any[]>(
        `SELECT COALESCE(SUM(e.amount),0) as total_amount,
          COALESCE(SUM(CASE WHEN e.status='approved' THEN e.amount ELSE 0 END),0) as approved_amount,
          COALESCE(SUM(CASE WHEN e.status='submitted' THEN e.amount ELSE 0 END),0) as pending_amount,
          COUNT(*) as total_count
         FROM expenses e
         JOIN projects p ON e.project_id = p.id
         WHERE e.deleted_at IS NULL AND p.deleted_at IS NULL AND ${pf13.sql}`,
        [...pf13.params],
        [{ total_amount: 0, approved_amount: 0, pending_amount: 0, total_count: 0 }]
      );

      // 15. Sprint summary
      const pf14 = buildProjectAccessFilter(ctx, 'p');
      const sprintSummary = await safeQuery<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN s.status = 'planning' THEN 1 ELSE 0 END) as planning
         FROM sprints s
         JOIN projects p ON s.project_id = p.id
         WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL AND ${pf14.sql}`,
        [...pf14.params],
        [{ total: 0, active: 0, completed: 0, planning: 0 }]
      );

      return NextResponse.json({
        success: true,
        data: {
          role: ctx.isAdmin ? 'admin' : ctx.isDeptManager ? 'dept_manager' : 'member',
          departmentId: ctx.departmentId,
          projects: projectSummary[0],
          tasks: taskSummary[0],
          recentProjects,
          myTasks,
          activeSprints,
          risks: riskSummary[0],
          time: timeSummary[0],
          budget: budgetOverview[0],
          departmentBreakdown,
          recentActivity,
          users: usersSummary[0],
          teams: teamsSummary[0],
          assets: assetSummary[0],
          expenses: expenseSummary[0],
          sprints: sprintSummary[0],
        }
      });
    } catch (error) {
      console.error('Dashboard GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch dashboard', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  },
  { requiredPermissions: ['dashboard.view'], checkCsrf: false }
);
