import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - Dashboard data from PMP database
export async function GET() {
  try {
    // Get project statistics
    const projectStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
        SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN health = 'on_track' THEN 1 ELSE 0 END) as on_track,
        SUM(CASE WHEN health = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
        SUM(CASE WHEN health = 'off_track' THEN 1 ELSE 0 END) as off_track
      FROM projects 
      WHERE deleted_at IS NULL
    `);

    // Get task statistics - separate queries to avoid any issues
    const taskTotal = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE deleted_at IS NULL`);
    const taskPending = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE status IN ('todo', 'backlog') AND deleted_at IS NULL`);
    const taskInProgress = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE status IN ('in_progress', 'in_review', 'testing') AND deleted_at IS NULL`);
    const taskCompleted = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE status = 'done' AND deleted_at IS NULL`);
    const taskCritical = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE priority = 'critical' AND deleted_at IS NULL`);
    const taskHigh = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE priority = 'high' AND deleted_at IS NULL`);
    const taskBugs = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE task_type = 'bug' AND status != 'done' AND deleted_at IS NULL`);
    const taskOverdue = await query<QueryRow[]>(`SELECT COUNT(*) as cnt FROM tasks WHERE due_date < CURDATE() AND status NOT IN ('done', 'cancelled') AND deleted_at IS NULL`);

    // Get sprint statistics
    const sprintStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning
      FROM sprints
    `);

    // Get risk statistics
    const riskStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as open_risks,
        SUM(CASE WHEN risk_score >= 9 THEN 1 ELSE 0 END) as high_risks,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
      FROM risks
      WHERE deleted_at IS NULL
    `);

    // Get issue statistics  
    const issueStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('open', 'in_progress', 'reopened') THEN 1 ELSE 0 END) as open_issues,
        SUM(CASE WHEN severity IN ('high', 'critical') THEN 1 ELSE 0 END) as critical_issues,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved
      FROM issues
      WHERE deleted_at IS NULL
    `);

    // Get recent projects with details
    const recentProjects = await query<QueryRow[]>(`
      SELECT
        p.id,
        p.uuid,
        p.code,
        p.name,
        p.status,
        p.health,
        p.priority,
        p.methodology,
        p.progress,
        p.end_date,
        p.budget,
        p.actual_cost,
        u.name as manager_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) as total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as team_size
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.updated_at DESC
      LIMIT 5
    `);

    // Get upcoming deadlines
    const upcomingDeadlines = await query<QueryRow[]>(`
      SELECT
        t.id,
        t.code as task_key,
        t.title,
        t.due_date,
        t.priority,
        t.status,
        t.task_type,
        p.code as project_code,
        p.name as project_name,
        (SELECT u.name
         FROM task_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = t.id LIMIT 1) as assignee_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.deleted_at IS NULL
        AND t.status NOT IN ('done', 'cancelled')
        AND t.due_date IS NOT NULL
        AND t.due_date >= CURDATE()
      ORDER BY t.due_date ASC
      LIMIT 10
    `);

    // Get active sprints
    const activeSprints = await query<QueryRow[]>(`
      SELECT 
        s.id,
        s.uuid,
        s.name,
        s.goal,
        s.status,
        s.start_date,
        s.end_date,
        s.velocity,
        s.capacity,
        p.code as project_code,
        p.name as project_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_tasks,
        (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.deleted_at IS NULL) as total_points,
        (SELECT COALESCE(SUM(t.story_points), 0) FROM tasks t WHERE t.sprint_id = s.id AND t.status = 'done' AND t.deleted_at IS NULL) as completed_points
      FROM sprints s
      JOIN projects p ON s.project_id = p.id
      WHERE s.status = 'active'
      ORDER BY s.end_date ASC
      LIMIT 5
    `);

    // Get budget totals
    const budgetStats = await query<QueryRow[]>(`
      SELECT 
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(actual_cost), 0) as total_spent
      FROM projects
      WHERE deleted_at IS NULL
    `);

    // Get time tracking stats
    const timeStats = await query<QueryRow[]>(`
      SELECT
        COALESCE(SUM(hours), 0) as total_hours,
        COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
        COALESCE(SUM(CASE WHEN is_billable = 0 OR is_billable IS NULL THEN hours ELSE 0 END), 0) as non_billable_hours,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN hours ELSE 0 END), 0) as approved_hours,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN hours ELSE 0 END), 0) as pending_hours
      FROM time_entries
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);

    // Get team workload
    const teamWorkload = await query<QueryRow[]>(`
      SELECT
        u.id,
        u.name,
        u.avatar,
        (SELECT COUNT(*) FROM task_assignees ta
         JOIN tasks t ON ta.task_id = t.id
         WHERE ta.user_id = u.id AND t.deleted_at IS NULL AND t.status NOT IN ('done', 'cancelled')) as assigned_tasks,
        (SELECT COUNT(*) FROM task_assignees ta
         JOIN tasks t ON ta.task_id = t.id
         WHERE ta.user_id = u.id AND t.status = 'in_progress' AND t.deleted_at IS NULL) as in_progress_tasks,
        (SELECT COALESCE(SUM(t.estimated_hours), 0) FROM task_assignees ta
         JOIN tasks t ON ta.task_id = t.id
         WHERE ta.user_id = u.id AND t.deleted_at IS NULL AND t.status NOT IN ('done', 'cancelled')) as total_estimated_hours,
        (SELECT COALESCE(SUM(t.actual_hours), 0) FROM task_assignees ta
         JOIN tasks t ON ta.task_id = t.id
         WHERE ta.user_id = u.id AND t.deleted_at IS NULL) as total_actual_hours
      FROM users u
      WHERE u.status = 'active' AND u.deleted_at IS NULL
      ORDER BY assigned_tasks DESC
      LIMIT 10
    `);

    // Build KPIs object
    const projects = projectStats[0] || {};
    const tasks = {
      total: Number(taskTotal[0]?.cnt || 0),
      pending: Number(taskPending[0]?.cnt || 0),
      in_progress: Number(taskInProgress[0]?.cnt || 0),
      completed: Number(taskCompleted[0]?.cnt || 0),
      critical: Number(taskCritical[0]?.cnt || 0),
      high_priority: Number(taskHigh[0]?.cnt || 0),
      open_bugs: Number(taskBugs[0]?.cnt || 0),
      overdue: Number(taskOverdue[0]?.cnt || 0),
    };
    const sprints = sprintStats[0] || {};
    const risks = riskStats[0] || {};
    const issues = issueStats[0] || {};
    const budget = budgetStats[0] || {};
    const time = timeStats[0] || {};

    const kpis = {
      projects: {
        total: Number(projects.total || 0),
        active: Number(projects.active || 0),
        completed: Number(projects.completed || 0),
        planning: Number(projects.planning || 0),
        on_hold: Number(projects.on_hold || 0),
        on_track: Number(projects.on_track || 0),
        at_risk: Number(projects.at_risk || 0),
        off_track: Number(projects.off_track || 0),
      },
      tasks,
      sprints: {
        total: Number(sprints.total || 0),
        active: Number(sprints.active || 0),
        completed: Number(sprints.completed || 0),
        planning: Number(sprints.planning || 0),
      },
      risks: {
        total: Number(risks.total || 0),
        open: Number(risks.open_risks || 0),
        high: Number(risks.high_risks || 0),
        resolved: Number(risks.resolved || 0),
      },
      issues: {
        total: Number(issues.total || 0),
        open: Number(issues.open_issues || 0),
        critical: Number(issues.critical_issues || 0),
        resolved: Number(issues.resolved || 0),
      },
      budget: {
        total: Number(budget.total_budget || 0),
        spent: Number(budget.total_spent || 0),
        remaining: Number(budget.total_budget || 0) - Number(budget.total_spent || 0),
      },
      timeTracking: {
        totalHours: Number(time.total_hours || 0),
        billableHours: Number(time.billable_hours || 0),
        nonBillableHours: Number(time.non_billable_hours || 0),
        approvedHours: Number(time.approved_hours || 0),
        pendingHours: Number(time.pending_hours || 0),
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        recentProjects,
        upcomingDeadlines,
        activeSprints,
        teamWorkload,
        recentActivity: [],
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to load dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
