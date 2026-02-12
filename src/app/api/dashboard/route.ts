/**
 * Dashboard API - System-wide summary from real DB data
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth';
import { getAccessContext, buildProjectAccessFilter, buildEntityAccessFilter } from '@/lib/project-access';

export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const ctx = await getAccessContext(user.userId);
      const projectFilter = buildProjectAccessFilter(ctx, 'p');

      // 1. Project summary
      const projectSummary = await query<any[]>(
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
         WHERE p.deleted_at IS NULL AND p.is_template = FALSE AND ${projectFilter.sql}`,
        [...projectFilter.params]
      );

      // 2. Task summary
      const ef2 = buildEntityAccessFilter(ctx, 'p');
      const taskSummary = await query<any[]>(
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
         WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL AND ${ef2.sql}`,
        [...ef2.params]
      );

      // 3. Recent projects
      const pf3 = buildProjectAccessFilter(ctx, 'p');
      const recentProjects = await query<any[]>(
        `SELECT p.id, p.code, p.name, p.status, p.health, p.priority, p.progress,
          p.start_date, p.end_date, d.name as department_name, m.name as manager_name,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND deleted_at IS NULL) as task_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done' AND deleted_at IS NULL) as done_count
         FROM projects p
         LEFT JOIN departments d ON p.department_id = d.id
         LEFT JOIN users m ON p.manager_id = m.id
         WHERE p.deleted_at IS NULL AND p.is_template = FALSE AND ${pf3.sql}
         ORDER BY p.updated_at DESC LIMIT 10`,
        [...pf3.params]
      );

      // 4. My tasks (upcoming / overdue)
      const myTasks = await query<any[]>(
        `SELECT t.id, t.task_key, t.title, t.status, t.priority, t.due_date, t.project_id,
          p.name as project_name, p.code as project_code
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         JOIN task_assignees ta ON t.id = ta.task_id
         WHERE ta.user_id = ? AND t.deleted_at IS NULL AND t.status NOT IN ('done','cancelled','closed')
         ORDER BY t.due_date IS NULL, t.due_date ASC LIMIT 15`,
        [user.userId]
      );

      // 5. Active sprints
      const ef5 = buildEntityAccessFilter(ctx, 'p');
      const activeSprints = await query<any[]>(
        `SELECT s.id, s.name, s.start_date, s.end_date, p.name as project_name, p.code as project_code,
          (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_tasks,
          (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) as total_points,
          (SELECT SUM(story_points) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) as completed_points
         FROM sprints s
         JOIN projects p ON s.project_id = p.id
         WHERE s.status = 'active' AND p.deleted_at IS NULL AND ${ef5.sql}
         ORDER BY s.end_date LIMIT 5`,
        [...ef5.params]
      );

      // 6. Risk & Issue summary
      const ef6 = buildEntityAccessFilter(ctx, 'p');
      const riskSummary = await query<any[]>(
        `SELECT
          (SELECT COUNT(*) FROM risks r JOIN projects p ON r.project_id=p.id WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND r.status NOT IN ('closed','mitigated') AND ${ef6.sql}) as open_risks,
          (SELECT COUNT(*) FROM risks r2 JOIN projects p2 ON r2.project_id=p2.id WHERE r2.deleted_at IS NULL AND p2.deleted_at IS NULL AND r2.risk_level IN ('critical','high') AND r2.status NOT IN ('closed','mitigated') AND ${ef6.sql}) as high_risks,
          (SELECT COUNT(*) FROM risks r3 JOIN projects p3 ON r3.project_id=p3.id WHERE r3.deleted_at IS NULL AND p3.deleted_at IS NULL AND ${ef6.sql}) as total_risks,
          (SELECT COUNT(*) FROM issues i JOIN projects p4 ON i.project_id=p4.id WHERE i.deleted_at IS NULL AND p4.deleted_at IS NULL AND i.status IN ('open','in_progress') AND ${ef6.sql}) as open_issues,
          (SELECT COUNT(*) FROM issues i2 JOIN projects p5 ON i2.project_id=p5.id WHERE i2.deleted_at IS NULL AND p5.deleted_at IS NULL AND i2.severity IN ('critical','high') AND i2.status IN ('open','in_progress') AND ${ef6.sql}) as critical_issues,
          (SELECT COUNT(*) FROM issues i3 JOIN projects p6 ON i3.project_id=p6.id WHERE i3.deleted_at IS NULL AND p6.deleted_at IS NULL AND ${ef6.sql}) as total_issues`,
        [...ef6.params, ...ef6.params, ...ef6.params, ...ef6.params, ...ef6.params, ...ef6.params]
      );

      // 7. Time tracking summary (this week)
      const ef7 = buildEntityAccessFilter(ctx, 'p');
      let timeSql = `SELECT COALESCE(SUM(te.hours),0) as weekly_hours,
        COALESCE(SUM(CASE WHEN te.is_billable=1 THEN te.hours ELSE 0 END),0) as billable_hours,
        COALESCE(SUM(CASE WHEN te.status='submitted' THEN te.hours ELSE 0 END),0) as pending_hours
        FROM time_entries te JOIN projects p ON te.project_id = p.id
        WHERE te.date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND p.deleted_at IS NULL AND ${ef7.sql}`;
      const timeParams = [...ef7.params];
      if (!ctx.isAdmin && !ctx.isDeptManager) { timeSql += ` AND te.user_id = ?`; timeParams.push(user.userId); }
      const timeSummary = await query<any[]>(timeSql, timeParams);

      // 8. Budget overview
      const ef8 = buildEntityAccessFilter(ctx, 'p');
      const budgetOverview = await query<any[]>(
        `SELECT COALESCE(SUM(pb.total_budget),0) as total_budget,
          COALESCE(SUM(pb.actual_spent),0) as actual_spent,
          COALESCE(SUM(pb.remaining),0) as remaining,
          COUNT(DISTINCT pb.project_id) as budgeted_projects
         FROM project_budgets pb
         JOIN projects p ON pb.project_id = p.id
         WHERE p.deleted_at IS NULL AND ${ef8.sql}`,
        [...ef8.params]
      );

      // 9. Department breakdown (for managers/admins)
      let departmentBreakdown: any[] = [];
      if (ctx.isAdmin || ctx.isDeptManager) {
        departmentBreakdown = await query<any[]>(
          `SELECT d.id, d.name as department_name,
            COUNT(DISTINCT p.id) as project_count,
            SUM(CASE WHEN p.status IN ('active','execution','monitoring') THEN 1 ELSE 0 END) as active_projects,
            (SELECT COUNT(*) FROM tasks t2 JOIN projects p2 ON t2.project_id=p2.id
              WHERE p2.department_id=d.id AND t2.deleted_at IS NULL AND t2.status NOT IN ('done','cancelled')) as open_tasks,
            (SELECT COUNT(*) FROM users u WHERE u.department_id=d.id AND u.deleted_at IS NULL) as members
           FROM departments d
           LEFT JOIN projects p ON p.department_id = d.id AND p.deleted_at IS NULL AND p.is_template = FALSE
           WHERE d.status = 'active'
           GROUP BY d.id, d.name ORDER BY d.name`,
          []
        );
      }

      // 10. Recent activity
      const ef10 = buildEntityAccessFilter(ctx, 'p');
      const recentActivity = await query<any[]>(
        `SELECT al.*, u.name as user_name, u.avatar,
          p.name as project_name, p.code as project_code
         FROM project_activity_log al
         JOIN users u ON al.user_id = u.id
         LEFT JOIN projects p ON al.project_id = p.id
         WHERE (al.project_id IS NULL OR (p.deleted_at IS NULL AND ${ef10.sql}))
         ORDER BY al.created_at DESC LIMIT 20`,
        [...ef10.params]
      );

      // 11. Users & Teams summary
      const usersSummary = await query<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN u.status = 'inactive' THEN 1 ELSE 0 END) as inactive
         FROM users u WHERE u.deleted_at IS NULL`
      );

      const teamsSummary = await query<any[]>(
        `SELECT
          (SELECT COUNT(*) FROM teams WHERE deleted_at IS NULL) as total,
          (SELECT COUNT(*) FROM team_members WHERE deleted_at IS NULL) as total_members`
      );

      // 12. Asset summary
      const assetSummary = await query<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status IN ('scrapped','lost') THEN 1 ELSE 0 END) as retired
         FROM assets WHERE deleted_at IS NULL`
      );

      // 13. Expense summary
      const ef13 = buildEntityAccessFilter(ctx, 'p');
      const expenseSummary = await query<any[]>(
        `SELECT COALESCE(SUM(e.amount),0) as total_amount,
          COALESCE(SUM(CASE WHEN e.status='approved' THEN e.amount ELSE 0 END),0) as approved_amount,
          COALESCE(SUM(CASE WHEN e.status='submitted' THEN e.amount ELSE 0 END),0) as pending_amount,
          COUNT(*) as total_count
         FROM expenses e
         JOIN projects p ON e.project_id = p.id
         WHERE e.deleted_at IS NULL AND p.deleted_at IS NULL AND ${ef13.sql}`,
        [...ef13.params]
      );

      // 14. Sprint summary
      const ef14 = buildEntityAccessFilter(ctx, 'p');
      const sprintSummary = await query<any[]>(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN s.status = 'planning' THEN 1 ELSE 0 END) as planning
         FROM sprints s
         JOIN projects p ON s.project_id = p.id
         WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL AND ${ef14.sql}`,
        [...ef14.params]
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
      return NextResponse.json({ success: false, error: 'Failed to fetch dashboard' }, { status: 500 });
    }
  },
  { requiredPermissions: ['dashboard.view'], checkCsrf: false }
);
