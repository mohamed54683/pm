"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

interface KPIs {
  projects: {
    total: number;
    active: number;
    completed: number;
    planning: number;
    on_hold: number;
    on_track: number;
    at_risk: number;
    off_track: number;
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    critical: number;
    high_priority: number;
    open_bugs: number;
    overdue: number;
  };
  sprints: {
    total: number;
    active: number;
    completed: number;
    planning: number;
  };
  risks: {
    total: number;
    open: number;
    high: number;
    resolved: number;
  };
  issues: {
    total: number;
    open: number;
    critical: number;
    resolved: number;
  };
  budget: {
    total: number;
    spent: number;
    remaining: number;
  };
  timeTracking: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  };
}

interface Project {
  id: number;
  uuid: string;
  code: string;
  name: string;
  status: string;
  health: string;
  priority: string;
  methodology: string;
  progress: number;
  end_date: string;
  budget: number;
  actual_cost: number;
  manager_name: string;
  total_tasks: number;
  completed_tasks: number;
  team_size: number;
}

interface Task {
  id: number;
  task_key: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  task_type: string;
  project_code: string;
  project_name: string;
  assignee_name: string;
}

interface Sprint {
  id: number;
  uuid: string;
  name: string;
  goal: string;
  status: string;
  start_date: string;
  end_date: string;
  velocity: number;
  capacity: number;
  project_code: string;
  project_name: string;
  total_tasks: number;
  completed_tasks: number;
  total_points: number;
  completed_points: number;
}

interface TeamMember {
  id: number;
  name: string;
  avatar: string;
  assigned_tasks: number;
  in_progress_tasks: number;
  total_estimated_hours: number;
  total_actual_hours: number;
}

interface Activity {
  id: number;
  action: string;
  entity_type: string;
  description: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
}

interface DashboardData {
  kpis: KPIs;
  recentProjects: Project[];
  upcomingDeadlines: Task[];
  activeSprints: Sprint[];
  teamWorkload: TeamMember[];
  recentActivity: Activity[];
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  planning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  on_hold: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const healthColors: Record<string, string> = {
  on_track: "text-emerald-500",
  at_risk: "text-amber-500",
  off_track: "text-red-500",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

export default function PMPDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', { credentials: 'include' });
      if (response.status === 401) {
        window.location.href = '/signin';
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Default KPIs if data is not loaded
  const kpis = data?.kpis || {
    projects: { total: 0, active: 0, completed: 0, planning: 0, on_hold: 0, on_track: 0, at_risk: 0, off_track: 0 },
    tasks: { total: 0, pending: 0, in_progress: 0, completed: 0, critical: 0, high_priority: 0, open_bugs: 0, overdue: 0 },
    sprints: { total: 0, active: 0, completed: 0, planning: 0 },
    risks: { total: 0, open: 0, high: 0, resolved: 0 },
    issues: { total: 0, open: 0, critical: 0, resolved: 0 },
    budget: { total: 0, spent: 0, remaining: 0 },
    timeTracking: { totalHours: 0, billableHours: 0, nonBillableHours: 0, approvedHours: 0, pendingHours: 0 },
  };

  const recentProjects = data?.recentProjects || [];
  const upcomingDeadlines = data?.upcomingDeadlines || [];
  const activeSprints = data?.activeSprints || [];
  const teamWorkload = data?.teamWorkload || [];

  const taskCompletionRate = kpis.tasks.total > 0 
    ? Math.round((kpis.tasks.completed / kpis.tasks.total) * 100) 
    : 0;

  const budgetUtilization = kpis.budget.total > 0 
    ? Math.round((kpis.budget.spent / kpis.budget.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Project Management Platform Overview
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/projects" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Projects Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <Link href="/projects" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View All →
              </Link>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{kpis.projects.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="text-xs text-emerald-600">{kpis.projects.active} active</span>
              <span className="text-xs text-amber-600">{kpis.projects.at_risk} at risk</span>
              <span className="text-xs text-blue-600">{kpis.projects.completed} done</span>
            </div>
          </div>

          {/* Tasks Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <Link href="/tasks" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View All →
              </Link>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{kpis.tasks.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{taskCompletionRate}% Complete</span>
                <span className="text-gray-500">{kpis.tasks.completed}/{kpis.tasks.total}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${taskCompletionRate}%` }}></div>
              </div>
            </div>
          </div>

          {/* Sprints Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <Link href="/sprints" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View All →
              </Link>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{kpis.sprints.active}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Sprints</p>
            <div className="mt-3 flex gap-2">
              <span className="text-xs text-gray-600">{kpis.sprints.total} total</span>
              <span className="text-xs text-emerald-600">{kpis.sprints.completed} completed</span>
            </div>
          </div>

          {/* Budget Card */}
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Link href="/budgets" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View All →
              </Link>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpis.budget.total)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{budgetUtilization}% Used</span>
                <span className="text-gray-500">{formatCurrency(kpis.budget.spent)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  className={`h-2 rounded-full ${budgetUtilization > 90 ? 'bg-red-500' : budgetUtilization > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Risks */}
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.risks.open}</p>
                  <p className="text-xs text-gray-500">Open Risks</p>
                </div>
              </div>
              <Link href="/risks" className="text-xs text-blue-600 hover:text-blue-700">View →</Link>
            </div>
            {kpis.risks.high > 0 && (
              <p className="mt-2 text-xs text-red-600">{kpis.risks.high} high priority</p>
            )}
          </div>

          {/* Issues */}
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                  <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.issues.open}</p>
                  <p className="text-xs text-gray-500">Open Issues</p>
                </div>
              </div>
              <Link href="/issues" className="text-xs text-blue-600 hover:text-blue-700">View →</Link>
            </div>
            {kpis.issues.critical > 0 && (
              <p className="mt-2 text-xs text-red-600">{kpis.issues.critical} critical</p>
            )}
          </div>

          {/* Overdue Tasks */}
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.tasks.overdue}</p>
                  <p className="text-xs text-gray-500">Overdue Tasks</p>
                </div>
              </div>
              <Link href="/tasks?filter=overdue" className="text-xs text-blue-600 hover:text-blue-700">View →</Link>
            </div>
          </div>

          {/* Time This Week */}
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/30">
                  <svg className="h-5 w-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.timeTracking.totalHours}h</p>
                  <p className="text-xs text-gray-500">Hours This Week</p>
                </div>
              </div>
              <Link href="/time-tracking/timesheet" className="text-xs text-blue-600 hover:text-blue-700">View →</Link>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {kpis.timeTracking.billableHours}h billable · {kpis.timeTracking.pendingHours}h pending
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Projects */}
          <div className="lg:col-span-2 rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
              <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentProjects.length > 0 ? recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500">{project.code}</span>
                      <Link href={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                        {project.name}
                      </Link>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[project.status] || statusColors.draft}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <span>{project.manager_name || 'Unassigned'}</span>
                      <span>{project.methodology}</span>
                      <span>{project.total_tasks} tasks</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${project.progress || 0}%` }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{project.progress || 0}%</span>
                      </div>
                    </div>
                    <span className={`${healthColors[project.health] || 'text-gray-400'}`}>
                      {project.health === 'on_track' && '●'}
                      {project.health === 'at_risk' && '●'}
                      {project.health === 'off_track' && '●'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No projects yet</p>
                  <Link href="/projects" className="mt-2 inline-block text-blue-600 hover:text-blue-700">Create your first project</Link>
                </div>
              )}
            </div>
          </div>

          {/* Active Sprints */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Sprints</h2>
              <Link href="/sprints" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeSprints.length > 0 ? activeSprints.map((sprint) => {
                const progress = sprint.total_tasks > 0 
                  ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100) 
                  : 0;
                const daysLeft = sprint.end_date 
                  ? Math.ceil((new Date(sprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : 0;
                
                return (
                  <div key={sprint.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{sprint.name}</p>
                        <p className="text-xs text-gray-500">{sprint.project_name}</p>
                      </div>
                      <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Ending today'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{sprint.completed_tasks}/{sprint.total_tasks} tasks</span>
                        <span className="text-gray-500">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No active sprints</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines & Team Workload */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Deadlines */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
              <Link href="/tasks" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {upcomingDeadlines.length > 0 ? upcomingDeadlines.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.project_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(task.due_date)}</p>
                    <p className="text-xs text-gray-500">{task.assignee_name || 'Unassigned'}</p>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No upcoming deadlines</p>
                </div>
              )}
            </div>
          </div>

          {/* Team Workload */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Workload</h2>
              <Link href="/resources/workload" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {teamWorkload.length > 0 ? teamWorkload.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {member.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.assigned_tasks} tasks assigned</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{member.in_progress_tasks} in progress</p>
                    <p className="text-xs text-gray-500">{member.total_estimated_hours}h estimated</p>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No team members with tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
