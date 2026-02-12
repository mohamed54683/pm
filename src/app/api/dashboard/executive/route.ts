import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { query } from "@/lib/db";

interface QueryRow {
  [key: string]: string | number | null | Date;
}

export async function GET() {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("qms_access_token")?.value || cookieStore.get("qms_refresh_token")?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    let tenantId = 1;
    try {
      const decoded = verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "CHANGE_THIS_IN_PRODUCTION_ACCESS_SECRET_MIN_32_CHARS") as { tenant_id?: number; userId?: number };
      tenantId = decoded.tenant_id || 1;
    } catch {
      // Try refresh token secret
      try {
        const decoded = verify(token, process.env.JWT_REFRESH_SECRET || "CHANGE_THIS_IN_PRODUCTION_REFRESH_SECRET_MIN_32_CHARS") as { tenant_id?: number; userId?: number };
        tenantId = decoded.tenant_id || 1;
      } catch {
        return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
      }
    }

    // ========== PROJECT KPIs ==========
    const projectStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('execution', 'monitoring') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
        SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN health = 'on_track' THEN 1 ELSE 0 END) as on_track,
        SUM(CASE WHEN health = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
        SUM(CASE WHEN health = 'off_track' THEN 1 ELSE 0 END) as off_track,
        COALESCE(SUM(COALESCE(estimated_budget, budget, 0)), 0) as total_budget,
        COALESCE(SUM(COALESCE(actual_cost, 0)), 0) as total_spent
      FROM projects
      WHERE tenant_id = ? AND status != 'cancelled'
    `, [tenantId]);

    const projectStatusDist = await query<QueryRow[]>(`
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE tenant_id = ? AND status != 'cancelled'
      GROUP BY status
    `, [tenantId]);

    // ========== TASK KPIs ==========
    const taskStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'pending' OR t.status = 'to_do' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status IN ('completed', 'done') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.priority = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN t.priority = 'high' THEN 1 ELSE 0 END) as highPrio,
        SUM(CASE WHEN t.priority = 'medium' THEN 1 ELSE 0 END) as medPrio,
        SUM(CASE WHEN t.priority = 'low' THEN 1 ELSE 0 END) as lowPrio,
        SUM(CASE WHEN task_type = 'bug' THEN 1 ELSE 0 END) as open_bugs,
        SUM(CASE WHEN due_date < CURDATE() AND t.status NOT IN ('completed', 'done') THEN 1 ELSE 0 END) as overdue
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.tenant_id = ?
    `, [tenantId]);

    // Task completion trend (last 12 weeks) - using subquery
    const taskCompletionTrend = await query<QueryRow[]>(`
      SELECT 
        week,
        CONCAT('W', SUBSTRING(week, 5)) as week_label,
        completed
      FROM (
        SELECT 
          YEARWEEK(t.completed_date, 1) as week,
          COUNT(*) as completed
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.tenant_id = ? 
          AND t.completed_date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
          AND t.status IN ('completed', 'done')
        GROUP BY YEARWEEK(t.completed_date, 1)
      ) sub
      ORDER BY week
    `, [tenantId]);

    // Task priority distribution
    const taskPriorityDist = await query<QueryRow[]>(`
      SELECT t.priority, COUNT(*) as count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.tenant_id = ? AND t.status NOT IN ('completed', 'done')
      GROUP BY t.priority
    `, [tenantId]);

    // ========== SPRINT KPIs ==========
    const sprintStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN s.status = 'planning' THEN 1 ELSE 0 END) as planning
      FROM sprints s
      JOIN projects p ON s.project_id = p.id
      WHERE p.tenant_id = ?
    `, [tenantId]);

    // Active sprint details
    const activeSprint = await query<QueryRow[]>(`
      SELECT 
        s.id, s.name, s.start_date, s.end_date,
        p.name as project_name,
        COALESCE(SUM(t.story_points), 0) as total_points,
        COALESCE(SUM(CASE WHEN t.status IN ('completed', 'done') THEN t.story_points ELSE 0 END), 0) as completed_points,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status IN ('completed', 'done') THEN 1 ELSE 0 END) as completed_tasks
      FROM sprints s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN tasks t ON t.sprint_id = s.id
      WHERE p.tenant_id = ? AND s.status = 'active'
      GROUP BY s.id, s.name, s.start_date, s.end_date, p.name
      LIMIT 1
    `, [tenantId]);

    // ========== BUDGET & TIME TRACKING ==========
    const budgetByProject = await query<QueryRow[]>(`
      SELECT 
        p.id, p.name, COALESCE(p.code, CONCAT('P', p.id)) as code,
        COALESCE(p.estimated_budget, p.budget, 0) as budget,
        COALESCE(p.actual_cost, 0) as actual_cost
      FROM projects p
      WHERE p.tenant_id = ? AND p.status != 'cancelled'
      ORDER BY COALESCE(p.estimated_budget, p.budget, 0) DESC
      LIMIT 5
    `, [tenantId]);

    // Monthly spend using subquery to avoid GROUP BY issues
    const monthlySpend = await query<QueryRow[]>(`
      SELECT 
        month,
        DATE_FORMAT(STR_TO_DATE(CONCAT(month, '-01'), '%Y-%m-%d'), '%b %Y') as month_label,
        spend
      FROM (
        SELECT 
          DATE_FORMAT(te.date, '%Y-%m') as month,
          ROUND(COALESCE(SUM(te.duration_minutes * 50 / 60), 0), 2) as spend
        FROM time_entries te
        JOIN tasks t ON te.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE p.tenant_id = ? AND te.date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(te.date, '%Y-%m')
      ) sub
      ORDER BY month
    `, [tenantId]);

    const timeByProject = await query<QueryRow[]>(`
      SELECT 
        p.name as project_name, 
        COALESCE(p.code, CONCAT('P', p.id)) as project_code,
        ROUND(COALESCE(SUM(te.duration_minutes / 60), 0), 1) as hours
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE p.tenant_id = ? AND te.date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
      GROUP BY p.id, p.name, p.code
      ORDER BY hours DESC
      LIMIT 6
    `, [tenantId]);

    const timeStats = await query<QueryRow[]>(`
      SELECT 
        ROUND(COALESCE(SUM(te.duration_minutes / 60), 0), 1) as total_hours,
        ROUND(COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.duration_minutes / 60 ELSE 0 END), 0), 1) as billable_hours,
        ROUND(COALESCE(SUM(CASE WHEN te.is_billable = 0 OR te.is_billable IS NULL THEN te.duration_minutes / 60 ELSE 0 END), 0), 1) as non_billable_hours,
        ROUND(COALESCE(SUM(CASE WHEN te.status = 'approved' THEN te.duration_minutes / 60 ELSE 0 END), 0), 1) as approved_hours
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE p.tenant_id = ?
    `, [tenantId]);

    // ========== RISK & ISSUES ==========
    const riskStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN r.status NOT IN ('closed', 'resolved') THEN 1 ELSE 0 END) as open_risks,
        SUM(CASE WHEN probability = 'high' OR impact = 'major' THEN 1 ELSE 0 END) as highRisks,
        SUM(CASE WHEN r.status IN ('closed', 'resolved') THEN 1 ELSE 0 END) as resolved
      FROM risks r
      JOIN projects p ON r.project_id = p.id
      WHERE p.tenant_id = ?
    `, [tenantId]);

    const riskMatrix = await query<QueryRow[]>(`
      SELECT 
        probability, impact, COUNT(*) as count,
        MAX(risk_score) as max_score
      FROM risks r
      JOIN projects p ON r.project_id = p.id
      WHERE p.tenant_id = ? AND r.status NOT IN ('closed', 'resolved')
      GROUP BY probability, impact
    `, [tenantId]);

    const issueStats = await query<QueryRow[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN i.status NOT IN ('closed', 'resolved') THEN 1 ELSE 0 END) as open_issues,
        SUM(CASE WHEN severity IN ('critical', 'blocker') THEN 1 ELSE 0 END) as critical_issues,
        SUM(CASE WHEN i.status IN ('closed', 'resolved') THEN 1 ELSE 0 END) as resolved
      FROM issues i
      JOIN projects p ON i.project_id = p.id
      WHERE p.tenant_id = ?
    `, [tenantId]);

    const issuesBySeverity = await query<QueryRow[]>(`
      SELECT severity, COUNT(*) as count
      FROM issues i
      JOIN projects p ON i.project_id = p.id
      WHERE p.tenant_id = ? AND i.status NOT IN ('closed', 'resolved')
      GROUP BY severity
      ORDER BY FIELD(severity, 'blocker', 'critical', 'major', 'minor', 'trivial')
    `, [tenantId]);

    // ========== TEAM & WORKLOAD ==========
    const teamWorkload = await query<QueryRow[]>(`
      SELECT 
        u.id, u.name, COALESCE(u.avatar, '') as avatar,
        COUNT(DISTINCT CASE WHEN t.status NOT IN ('completed', 'done') THEN t.id END) as open_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress,
        0 as hours_this_week
      FROM users u
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      WHERE u.tenant_id = ? AND u.status = 'active'
      GROUP BY u.id, u.name, u.avatar
      ORDER BY open_tasks DESC
      LIMIT 8
    `, [tenantId]);

    // ========== PROJECT PROGRESS ==========
    const projectProgress = await query<QueryRow[]>(`
      SELECT 
        p.id, p.name, COALESCE(p.code, CONCAT('P', p.id)) as code,
        p.status, COALESCE(p.health, 'on_track') as health,
        COALESCE(p.progress, 0) as progress,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status IN ('completed', 'done') THEN 1 ELSE 0 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.tenant_id = ? AND p.status IN ('execution', 'monitoring')
      GROUP BY p.id, p.name, p.code, p.status, p.health, p.progress
      ORDER BY p.priority DESC, p.name
      LIMIT 6
    `, [tenantId]);

    // ========== MILESTONES & OVERDUE ==========
    const upcomingMilestones = await query<QueryRow[]>(`
      SELECT 
        m.id, m.name, m.due_date, m.is_critical,
        p.name as project_name,
        DATEDIFF(m.due_date, CURDATE()) as days_until
      FROM project_milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE p.tenant_id = ? 
        AND m.status != 'completed'
        AND m.due_date >= CURDATE()
        AND m.due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY m.due_date
      LIMIT 5
    `, [tenantId]);

    const overdueItems = await query<QueryRow[]>(`
      (SELECT 
        'task' as type, t.id, t.title as name, t.due_date, t.priority, p.name as project_name,
        DATEDIFF(CURDATE(), t.due_date) as days_overdue
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.tenant_id = ? 
        AND t.due_date < CURDATE() 
        AND t.status NOT IN ('completed', 'done')
      ORDER BY days_overdue DESC
      LIMIT 5)
      UNION ALL
      (SELECT 
        'milestone' as type, m.id, m.name, m.due_date, 'high' as priority, p.name as project_name,
        DATEDIFF(CURDATE(), m.due_date) as days_overdue
      FROM project_milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE p.tenant_id = ? 
        AND m.due_date < CURDATE() 
        AND m.status != 'completed'
      ORDER BY days_overdue DESC
      LIMIT 3)
      ORDER BY days_overdue DESC
      LIMIT 6
    `, [tenantId, tenantId]);

    // ========== RECENT ACTIVITY ==========
    const recentActivity = await query<QueryRow[]>(`
      SELECT 
        id, action, entity_type, description, created_at,
        '' as user_name, '' as project_name
      FROM project_activity_log
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // ========== BUILD RESPONSE ==========
    const ps = projectStats[0] || {};
    const ts = taskStats[0] || {};
    const ss = sprintStats[0] || {};
    const rs = riskStats[0] || {};
    const is = issueStats[0] || {};
    const tms = timeStats[0] || {};

    const totalBudget = Number(ps.total_budget) || 0;
    const totalSpent = Number(ps.total_spent) || 0;

    // Calculate health score
    const onTrack = Number(ps.on_track) || 0;
    const atRisk = Number(ps.at_risk) || 0;
    const offTrack = Number(ps.off_track) || 0;
    const totalProjects = onTrack + atRisk + offTrack;
    const healthScore = totalProjects > 0 
      ? Math.round(((onTrack * 100 + atRisk * 50 + offTrack * 0) / (totalProjects * 100)) * 100)
      : 75;

    const dashboardData = {
      healthScore,
      kpis: {
        projects: {
          total: Number(ps.total) || 0,
          active: Number(ps.active) || 0,
          completed: Number(ps.completed) || 0,
          planning: Number(ps.planning) || 0,
          on_hold: Number(ps.on_hold) || 0,
          on_track: onTrack,
          at_risk: atRisk,
          off_track: offTrack,
        },
        tasks: {
          total: Number(ts.total) || 0,
          pending: Number(ts.pending) || 0,
          in_progress: Number(ts.in_progress) || 0,
          completed: Number(ts.completed) || 0,
          critical: Number(ts.critical) || 0,
          high: Number(ts.highPrio) || 0,
          medium: Number(ts.medPrio) || 0,
          low: Number(ts.lowPrio) || 0,
          open_bugs: Number(ts.open_bugs) || 0,
          overdue: Number(ts.overdue) || 0,
        },
        sprints: {
          total: Number(ss.total) || 0,
          active: Number(ss.active) || 0,
          completed: Number(ss.completed) || 0,
          planning: Number(ss.planning) || 0,
        },
        risks: {
          total: Number(rs.total) || 0,
          open: Number(rs.open_risks) || 0,
          high: Number(rs.highRisks) || 0,
          resolved: Number(rs.resolved) || 0,
        },
        issues: {
          total: Number(is.total) || 0,
          open: Number(is.open_issues) || 0,
          critical: Number(is.critical_issues) || 0,
          resolved: Number(is.resolved) || 0,
        },
        budget: {
          total: totalBudget,
          spent: totalSpent,
          remaining: totalBudget - totalSpent,
          utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        },
        timeTracking: {
          totalHours: Number(tms.total_hours) || 0,
          billableHours: Number(tms.billable_hours) || 0,
          nonBillableHours: Number(tms.non_billable_hours) || 0,
          approvedHours: Number(tms.approved_hours) || 0,
        },
      },
      charts: {
        projectStatusDist: projectStatusDist.map(row => ({
          status: String(row.status || 'unknown'),
          count: Number(row.count) || 0
        })),
        taskCompletionTrend: taskCompletionTrend.map(row => ({
          week: String(row.week || ''),
          week_label: String(row.week_label || ''),
          completed: Number(row.completed) || 0
        })),
        taskPriorityDist: taskPriorityDist.map(row => ({
          priority: String(row.priority || 'none'),
          count: Number(row.count) || 0
        })),
        budgetByProject: budgetByProject.map(row => ({
          id: Number(row.id) || 0,
          name: String(row.name || ''),
          code: String(row.code || ''),
          budget: Number(row.budget) || 0,
          actual_cost: Number(row.actual_cost) || 0
        })),
        monthlySpend: monthlySpend.map(row => ({
          month: String(row.month || ''),
          month_label: String(row.month_label || ''),
          spend: Number(row.spend) || 0
        })),
        riskMatrix: riskMatrix.map(row => ({
          probability: String(row.probability || 'low'),
          impact: String(row.impact || 'minor'),
          count: Number(row.count) || 0,
          max_score: Number(row.max_score) || 0
        })),
        issuesBySeverity: issuesBySeverity.map(row => ({
          severity: String(row.severity || 'minor'),
          count: Number(row.count) || 0
        })),
        timeByProject: timeByProject.map(row => ({
          project_name: String(row.project_name || ''),
          project_code: String(row.project_code || ''),
          hours: Number(row.hours) || 0
        })),
      },
      activeSprint: activeSprint.length > 0 ? {
        id: Number(activeSprint[0].id),
        name: String(activeSprint[0].name || ''),
        project_name: String(activeSprint[0].project_name || ''),
        total_points: Number(activeSprint[0].total_points) || 0,
        completed_points: Number(activeSprint[0].completed_points) || 0,
        total_tasks: Number(activeSprint[0].total_tasks) || 0,
        completed_tasks: Number(activeSprint[0].completed_tasks) || 0,
        start_date: String(activeSprint[0].start_date || ''),
        end_date: String(activeSprint[0].end_date || ''),
      } : null,
      upcomingMilestones: upcomingMilestones.map(row => ({
        id: Number(row.id),
        name: String(row.name || ''),
        due_date: String(row.due_date || ''),
        is_critical: Boolean(row.is_critical),
        project_name: String(row.project_name || ''),
        days_until: Number(row.days_until) || 0,
      })),
      overdueItems: overdueItems.map(row => ({
        type: String(row.type || ''),
        id: Number(row.id),
        name: String(row.name || ''),
        due_date: String(row.due_date || ''),
        priority: String(row.priority || ''),
        project_name: String(row.project_name || ''),
        days_overdue: Number(row.days_overdue) || 0,
      })),
      teamWorkload: teamWorkload.map(row => ({
        id: Number(row.id),
        name: String(row.name || ''),
        avatar: String(row.avatar || ''),
        open_tasks: Number(row.open_tasks) || 0,
        in_progress: Number(row.in_progress) || 0,
        hours_this_week: Number(row.hours_this_week) || 0,
      })),
      projectProgress: projectProgress.map(row => ({
        id: Number(row.id),
        name: String(row.name || ''),
        code: String(row.code || ''),
        status: String(row.status || ''),
        health: String(row.health || 'on_track'),
        progress: Number(row.progress) || 0,
        total_tasks: Number(row.total_tasks) || 0,
        completed_tasks: Number(row.completed_tasks) || 0,
      })),
      recentActivity: recentActivity.map(row => ({
        id: Number(row.id),
        action: String(row.action || ''),
        entity_type: String(row.entity_type || ''),
        description: String(row.description || ''),
        created_at: String(row.created_at || ''),
        user_name: String(row.user_name || ''),
        project_name: String(row.project_name || ''),
      })),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error("Executive Dashboard API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to load executive dashboard data",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
