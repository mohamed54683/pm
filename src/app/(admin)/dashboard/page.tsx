"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardData {
  role: string;
  departmentId: number | null;
  projects: { total: number; active: number; completed: number; planning: number; on_hold: number; cancelled: number; on_track: number; at_risk: number; off_track: number };
  tasks: { total: number; todo: number; in_progress: number; in_review: number; done: number; cancelled: number; overdue: number; critical: number; highpriority: number };
  recentProjects: any[];
  myTasks: any[];
  activeSprints: any[];
  risks: { open_risks: number; high_risks: number; total_risks: number; open_issues: number; critical_issues: number; total_issues: number };
  time: { weekly_hours: number; billable_hours: number; pending_hours: number };
  budget: { total_budget: number; actual_spent: number; remaining: number; budgeted_projects: number };
  departmentBreakdown: any[];
  recentActivity: any[];
  users: { total: number; active: number; inactive: number };
  teams: { total: number; total_members: number };
  assets: { total: number; available: number; assigned: number; maintenance: number; retired: number };
  expenses: { total_amount: number; approved_amount: number; pending_amount: number; total_count: number };
  sprints: { total: number; active: number; completed: number; planning: number };
}

const statusBadge: Record<string, string> = {
  active: "badge-success", completed: "badge-info", planning: "badge-warning",
  on_hold: "badge-default", execution: "badge-success", monitoring: "badge-purple",
  to_do: "badge-default", in_progress: "badge-info", in_review: "badge-purple", done: "badge-success",
};

const priorityDot: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-400", low: "bg-blue-400",
};

const healthIcon: Record<string, { icon: string; cls: string }> = {
  on_track: { icon: "●", cls: "text-emerald-500" },
  at_risk: { icon: "▲", cls: "text-amber-500" },
  off_track: { icon: "✖", cls: "text-red-500" },
};

function fmt(n: number | null | undefined) { return n == null ? "0" : Number(n).toLocaleString(); }
function fmtCur(n: number | null | undefined) { return n == null ? "$0" : "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ──────── SVG Icon Components ──────── */
const Icons = {
  projects: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  tasks: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  risk: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
  bug: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" /></svg>,
  users: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  teams: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  money: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  expense: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
  chart: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  clock: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>,
  asset: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>,
  health: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  sprint: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  fire: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
  wrench: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>,
  clipboard: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  arrow: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>,
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = document.cookie.split("; ").find(c => c.startsWith("token="))?.split("=")[1] || localStorage.getItem("token");
        const res = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="page-header">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-2 h-4 w-32" />
      </div>
      <div className="page-body">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    </div>
  );
  if (!data) return (
    <div className="page-container">
      <div className="flex h-96 flex-col items-center justify-center">
        <div className="empty-state-icon"><Icons.risk /></div>
        <p className="empty-state-title">Failed to load dashboard</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
      </div>
    </div>
  );

  const { projects: p, tasks: t, risks: r, budget: b, users: u, assets: a, sprints: sp, expenses: ex, teams: tm } = data;
  const taskCompletion = pct(Number(t.done), Number(t.total));
  const budgetUsed = pct(Number(b.actual_spent), Number(b.total_budget));

  const roleLabel = data.role === "admin" ? "Administrator" : data.role === "dept_manager" ? "Dept. Manager" : "Team Member";
  const roleBadge = data.role === "admin" ? "badge-purple" : data.role === "dept_manager" ? "badge-info" : "badge-default";

  const donutOpts: any = {
    chart: { type: "donut", background: "transparent", fontFamily: "Outfit, sans-serif" },
    labels: ["Active", "Planning", "Completed", "On Hold"],
    colors: ["#10b981", "#f59e0b", "#3b82f6", "#94a3b8"],
    legend: { position: "bottom", labels: { colors: "#9ca3af" }, fontSize: "13px" },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: "72%", labels: { show: true, total: { show: true, label: "Total", fontSize: "14px", color: "#9ca3af", formatter: () => fmt(p.total) } } } } },
    stroke: { width: 2, colors: ["transparent"] },
    tooltip: { theme: "dark" },
  };
  const donutSeries = [Number(p.active)||0, Number(p.planning)||0, Number(p.completed)||0, Number(p.on_hold)||0];

  const barOpts: any = {
    chart: { type: "bar", background: "transparent", toolbar: { show: false }, fontFamily: "Outfit, sans-serif" },
    xaxis: { categories: ["To Do", "In Progress", "In Review", "Done", "Overdue"], labels: { style: { colors: "#9ca3af", fontSize: "12px" } } },
    yaxis: { labels: { style: { colors: "#9ca3af", fontSize: "12px" } } },
    colors: ["#6366f1"],
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#1f2937", strokeDashArray: 4 },
    tooltip: { theme: "dark" },
  };
  const barSeries = [{ name: "Tasks", data: [Number(t.todo)||0, Number(t.in_progress)||0, Number(t.in_review)||0, Number(t.done)||0, Number(t.overdue)||0] }];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {data.role === "admin" ? "System Overview" : data.role === "dept_manager" ? "Department Overview" : "My Overview"}
              {" · "}{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <span className={`badge ${roleBadge}`}>{roleLabel}</span>
        </div>
      </div>

      <div className="page-body">
        {/* Row 1: Core KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="blue" icon={Icons.projects} title="Total Projects" value={fmt(p.total)} meta={`${fmt(p.active)} active · ${fmt(p.completed)} done`} />
          <StatCard accent="green" icon={Icons.tasks} title="Total Tasks" value={fmt(t.total)} meta={`${fmt(t.done)} done · ${fmt(t.overdue)} overdue`} alert={Number(t.overdue) > 0} />
          <StatCard accent="amber" icon={Icons.risk} title="Open Risks" value={fmt(r.open_risks)} meta={`${fmt(r.high_risks)} high · ${fmt(r.total_risks)} total`} alert={Number(r.high_risks) > 0} />
          <StatCard accent="red" icon={Icons.bug} title="Open Issues" value={fmt(r.open_issues)} meta={`${fmt(r.critical_issues)} critical · ${fmt(r.total_issues)} total`} alert={Number(r.critical_issues) > 0} />
        </div>

        {/* Row 2: People & Money */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="purple" icon={Icons.users} title="Users" value={fmt(u.total)} meta={`${fmt(u.active)} active · ${fmt(u.inactive)} inactive`} />
          <StatCard accent="blue" icon={Icons.teams} title="Teams" value={fmt(tm.total)} meta={`${fmt(tm.total_members)} total members`} />
          <StatCard accent="green" icon={Icons.money} title="Total Budget" value={fmtCur(b.total_budget)} meta={`${fmtCur(b.actual_spent)} spent (${budgetUsed}%)`} />
          <StatCard accent="amber" icon={Icons.expense} title="Expenses" value={fmtCur(ex.total_amount)} meta={`${fmtCur(ex.approved_amount)} approved`} />
        </div>

        {/* Row 3: Performance */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="green" icon={Icons.chart} title="Task Completion" value={`${taskCompletion}%`} meta={`${fmt(t.done)} of ${fmt(t.total)} tasks`}>
            <div className="mt-3 progress-bar"><div className="progress-fill bg-emerald-500" style={{ width: `${taskCompletion}%` }} /></div>
          </StatCard>
          <StatCard accent="purple" icon={Icons.clock} title="Weekly Hours" value={`${Number(data.time.weekly_hours).toFixed(1)}h`} meta={`${Number(data.time.billable_hours).toFixed(1)}h billable`} />
          <StatCard accent="blue" icon={Icons.asset} title="Assets" value={fmt(a.total)} meta={`${fmt(a.available)} available · ${fmt(a.assigned)} in use`} />
          <StatCard accent="green" icon={Icons.health} title="Project Health" value={`${fmt(p.on_track)} on track`} meta={`${fmt(p.at_risk)} at risk · ${fmt(p.off_track)} off track`} alert={Number(p.off_track) > 0} />
        </div>

        {/* Row 4: Extended */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="blue" icon={Icons.sprint} title="Sprints" value={fmt(sp.total)} meta={`${fmt(sp.active)} active · ${fmt(sp.completed)} done`} />
          <StatCard accent="red" icon={Icons.fire} title="Critical Tasks" value={fmt(t.critical)} meta={`${fmt(t.highpriority)} high priority`} alert={Number(t.critical) > 0} />
          <StatCard accent="amber" icon={Icons.wrench} title="Maintenance" value={fmt(a.maintenance)} meta={`${fmt(a.retired)} retired / scrapped`} />
          <StatCard accent="green" icon={Icons.clipboard} title="Budgeted Projects" value={fmt(b.budgeted_projects)} meta={`${fmtCur(b.remaining)} remaining`} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Projects by Status</h3>
              <Link href="/projects" className="btn-ghost text-xs">View All {Icons.arrow}</Link>
            </div>
            <div className="card-body">
              <Chart options={donutOpts} series={donutSeries} type="donut" height={300} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Task Distribution</h3>
              <Link href="/tasks" className="btn-ghost text-xs">View All {Icons.arrow}</Link>
            </div>
            <div className="card-body">
              <Chart options={barOpts} series={barSeries} type="bar" height={300} />
            </div>
          </div>
        </div>

        {/* My Tasks + Active Sprints */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 card">
            <div className="card-header">
              <h3 className="card-title">My Tasks</h3>
              <Link href="/tasks/my-tasks" className="btn-ghost text-xs">View All {Icons.arrow}</Link>
            </div>
            <div className="card-body">
              {data.myTasks.length === 0 ? (
                <div className="empty-state py-10">
                  <div className="empty-state-icon">{Icons.tasks}</div>
                  <p className="empty-state-text">No assigned tasks</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {data.myTasks.map((task: any) => (
                    <Link href={`/tasks/${task.id}`} key={task.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-all hover:border-gray-200 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{task.task_key}</span>
                          <span className={`h-2 w-2 rounded-full ${priorityDot[task.priority] || "bg-gray-400"}`} />
                        </div>
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                        <p className="text-xs text-gray-400">{task.project_name}</p>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1.5">
                        <span className={`badge ${statusBadge[task.status] || "badge-default"}`}>{task.status?.replace(/_/g, " ")}</span>
                        {task.due_date && (
                          <span className={`text-xs ${new Date(task.due_date) < new Date() ? "font-semibold text-red-500" : "text-gray-400"}`}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Active Sprints</h3>
              <Link href="/sprints" className="btn-ghost text-xs">View All {Icons.arrow}</Link>
            </div>
            <div className="card-body">
              {data.activeSprints.length === 0 ? (
                <div className="empty-state py-10">
                  <div className="empty-state-icon">{Icons.sprint}</div>
                  <p className="empty-state-text">No active sprints</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.activeSprints.map((s: any) => {
                    const sp = s.total_tasks > 0 ? Math.round((s.completed_tasks / s.total_tasks) * 100) : 0;
                    return (
                      <div key={s.id} className="rounded-lg border border-gray-100 p-3.5 transition-colors hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</p>
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{sp}%</span>
                        </div>
                        <p className="text-xs text-gray-400">{s.project_name}</p>
                        <div className="mt-2.5 progress-bar"><div className="progress-fill bg-brand-500" style={{ width: `${sp}%` }} /></div>
                        <div className="mt-1.5 flex justify-between text-xs text-gray-400">
                          <span>{s.completed_tasks}/{s.total_tasks} tasks</span>
                          <span>{s.completed_points || 0}/{s.total_points || 0} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Projects Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Projects</h3>
            <Link href="/projects" className="btn-ghost text-xs">View All {Icons.arrow}</Link>
          </div>
          {data.recentProjects.length === 0 ? (
            <div className="empty-state py-12">
              <div className="empty-state-icon">{Icons.projects}</div>
              <p className="empty-state-title">No projects yet</p>
              <p className="empty-state-text">Create your first project to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead className="data-table-head">
                  <tr>
                    <th className="data-table-th">Project</th>
                    <th className="data-table-th">Department</th>
                    <th className="data-table-th">Status</th>
                    <th className="data-table-th">Health</th>
                    <th className="data-table-th">Progress</th>
                    <th className="data-table-th">Tasks</th>
                    <th className="data-table-th">Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProjects.map((proj: any) => {
                    const pp = proj.task_count > 0 ? Math.round((proj.done_count / proj.task_count) * 100) : Number(proj.progress) || 0;
                    const h = healthIcon[proj.health] || { icon: "—", cls: "text-gray-400" };
                    return (
                      <tr key={proj.id} className="data-table-row">
                        <td className="data-table-td">
                          <span className="text-[11px] font-mono text-gray-400">{proj.code}</span>
                          <p className="font-medium text-gray-900 dark:text-white">{proj.name}</p>
                        </td>
                        <td className="data-table-td">{proj.department_name || "—"}</td>
                        <td className="data-table-td">
                          <span className={`badge ${statusBadge[proj.status] || "badge-default"}`}>{proj.status?.replace(/_/g, " ")}</span>
                        </td>
                        <td className="data-table-td">
                          <span className={`font-semibold ${h.cls}`}>{h.icon} {proj.health?.replace(/_/g, " ")}</span>
                        </td>
                        <td className="data-table-td">
                          <div className="flex items-center gap-2">
                            <div className="progress-bar w-20"><div className="progress-fill bg-brand-500" style={{ width: `${pp}%` }} /></div>
                            <span className="text-xs font-medium text-gray-500">{pp}%</span>
                          </div>
                        </td>
                        <td className="data-table-td font-medium">{proj.done_count}/{proj.task_count}</td>
                        <td className="data-table-td">
                          {proj.manager_name ? (
                            <div className="flex items-center gap-2">
                              <div className="avatar avatar-sm">{proj.manager_name.charAt(0)}</div>
                              <span>{proj.manager_name}</span>
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Department Breakdown */}
        {data.departmentBreakdown.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Department Breakdown</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.departmentBreakdown.map((dept: any) => (
                  <div key={dept.id} className="rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{dept.department_name}</h4>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Projects", val: dept.project_count || 0, cls: "text-blue-600 dark:text-blue-400" },
                        { label: "Active", val: dept.active_projects || 0, cls: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Tasks", val: dept.open_tasks || 0, cls: "text-amber-600 dark:text-amber-400" },
                        { label: "Members", val: dept.members || 0, cls: "text-purple-600 dark:text-purple-400" },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className={`text-lg font-bold ${item.cls}`}>{item.val}</p>
                          <p className="text-[11px] text-gray-400">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          <div className="card-body">
            {data.recentActivity.length === 0 ? (
              <div className="empty-state py-10">
                <p className="empty-state-text">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {data.recentActivity.map((act: any) => (
                  <div key={act.id} className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                    <div className="avatar avatar-sm flex-shrink-0 mt-0.5">
                      {act.user_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        <span className="font-semibold text-gray-900 dark:text-white">{act.user_name}</span>{" "}
                        <span className="text-gray-500 dark:text-gray-400">{act.description || act.action}</span>
                      </p>
                      {act.project_name && (
                        <p className="text-xs text-gray-400">{act.project_code} — {act.project_name}</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(act.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────── Stat Card Component ──────── */
function StatCard({ title, value, meta, icon, accent, alert, children }: {
  title: string; value: string; meta: string; icon: React.ReactNode; accent: string;
  alert?: boolean; children?: React.ReactNode;
}) {
  const accentMap: Record<string, string> = {
    blue: "gradient-blue", green: "gradient-green", amber: "gradient-amber",
    red: "gradient-red", purple: "gradient-purple",
  };
  const iconBg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  };
  return (
    <div className={`stat-card ${accentMap[accent] || ""} ${alert ? "ring-1 ring-red-200 dark:ring-red-800/50" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="stat-label">{title}</p>
          <p className="stat-value mt-2 animate-count-up">{value}</p>
          <p className={`stat-meta mt-1 ${alert ? "font-medium text-red-500 dark:text-red-400" : ""}`}>{meta}</p>
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg[accent] || "bg-gray-50 text-gray-500"}`}>
          {icon}
        </div>
      </div>
      {children}
    </div>
  );
}
