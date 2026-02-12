"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface DashboardStats {
  project_stats: {
    total: number;
    active: number;
    completed: number;
    on_hold: number;
    overdue: number;
  };
  task_stats: {
    total: number;
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    overdue: number;
  };
  user_tasks: {
    assigned_to_me: number;
    created_by_me: number;
    due_today: number;
    due_this_week: number;
  } | null;
  upcoming_deadlines: Array<{
    id: string;
    name: string;
    type: string;
    due_date: string;
    project_name: string;
  }>;
  overdue_milestones: Array<{
    id: string;
    name: string;
    due_date: string;
    project_name: string;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_name: string;
    user_name: string;
    created_at: string;
  }>;
  project_progress: Array<{
    id: string;
    name: string;
    progress: number;
    color: string;
  }>;
  tasks_by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export default function ProjectDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects/dashboard');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
          {error || 'Failed to load dashboard'}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Projects"
          value={stats.project_stats.total}
          icon="📊"
          color="bg-gray-100 dark:bg-gray-800"
        />
        <StatCard
          title="Active"
          value={stats.project_stats.active}
          icon="🚀"
          color="bg-green-50 dark:bg-green-900/20"
          textColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Completed"
          value={stats.project_stats.completed}
          icon="✅"
          color="bg-blue-50 dark:bg-blue-900/20"
          textColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="On Hold"
          value={stats.project_stats.on_hold}
          icon="⏸️"
          color="bg-yellow-50 dark:bg-yellow-900/20"
          textColor="text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          title="Overdue"
          value={stats.project_stats.overdue}
          icon="⚠️"
          color="bg-red-50 dark:bg-red-900/20"
          textColor="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Task Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="page-title">{stats.task_stats.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{stats.task_stats.overdue}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Overdue</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Task Status</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {stats.task_stats.total > 0 && (
                <>
                  <div
                    className="h-full bg-gray-400"
                    style={{ width: `${(stats.task_stats.todo / stats.task_stats.total) * 100}%` }}
                    title={`To Do: ${stats.task_stats.todo}`}
                  />
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(stats.task_stats.in_progress / stats.task_stats.total) * 100}%` }}
                    title={`In Progress: ${stats.task_stats.in_progress}`}
                  />
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${(stats.task_stats.in_review / stats.task_stats.total) * 100}%` }}
                    title={`In Review: ${stats.task_stats.in_review}`}
                  />
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(stats.task_stats.done / stats.task_stats.total) * 100}%` }}
                    title={`Done: ${stats.task_stats.done}`}
                  />
                </>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{stats.task_stats.todo} todo</span>
            <span>{stats.task_stats.in_progress} in progress</span>
            <span>{stats.task_stats.done} done</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">My Tasks</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="page-title">{stats.user_tasks?.assigned_to_me ?? 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Assigned to Me</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-500">{stats.user_tasks?.due_today ?? 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Due Today</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Priority Distribution</h3>
          <div className="flex items-end gap-1 h-12">
            <PriorityBar label="Critical" value={stats.tasks_by_priority.critical} max={Math.max(...Object.values(stats.tasks_by_priority))} color="bg-red-500" />
            <PriorityBar label="High" value={stats.tasks_by_priority.high} max={Math.max(...Object.values(stats.tasks_by_priority))} color="bg-orange-500" />
            <PriorityBar label="Medium" value={stats.tasks_by_priority.medium} max={Math.max(...Object.values(stats.tasks_by_priority))} color="bg-yellow-500" />
            <PriorityBar label="Low" value={stats.tasks_by_priority.low} max={Math.max(...Object.values(stats.tasks_by_priority))} color="bg-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Progress</h3>
          {stats.project_progress.length > 0 ? (
            <div className="space-y-4">
              {stats.project_progress.slice(0, 5).map(project => (
                <div key={project.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{project.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(project.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%`, backgroundColor: project.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No active projects</div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h3>
          {stats.upcoming_deadlines.length > 0 ? (
            <div className="space-y-3">
              {stats.upcoming_deadlines.slice(0, 5).map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                    item.type === 'milestone' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {item.type === 'milestone' ? '🏁' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.project_name}</div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatRelativeDate(item.due_date)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No upcoming deadlines</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Milestones */}
        {stats.overdue_milestones.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 p-5">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
              <span>⚠️</span> Overdue Milestones
            </h3>
            <div className="space-y-3">
              {stats.overdue_milestones.map(milestone => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{milestone.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{milestone.project_name}</div>
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {formatRelativeDate(milestone.due_date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          {stats.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_activity.slice(0, 8).map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">
                      {activity.action === 'created' ? '➕' :
                       activity.action === 'updated' ? '✏️' :
                       activity.action === 'deleted' ? '🗑️' :
                       activity.action === 'completed' ? '✅' : '📝'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.user_name}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-gray-600 dark:text-gray-400">{activity.entity_type}</span>
                      {' '}<span className="font-medium">{activity.entity_name}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(activity.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  textColor = 'text-gray-900 dark:text-white'
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  textColor?: string;
}) {
  return (
    <div className={`${color} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
    </div>
  );
}

function PriorityBar({
  label,
  value,
  max,
  color
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const height = max > 0 ? Math.max((value / max) * 100, 10) : 10;
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div
        className={`w-full ${color} rounded-t transition-all duration-300`}
        style={{ height: `${height}%` }}
        title={`${label}: ${value}`}
      />
      <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
