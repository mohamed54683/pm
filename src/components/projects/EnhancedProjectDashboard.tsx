"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task } from '@/types/projects';
import ActivityFeed from './ActivityFeed';
import TimeTracker from './TimeTracker';

interface EnhancedProjectDashboardProps {
  projectId: string;
}

interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  total_story_points: number;
  completed_story_points: number;
  team_members: number;
  total_time_hours: number;
  active_risks: number;
  health_score: number;
}

export default function EnhancedProjectDashboard({ projectId }: EnhancedProjectDashboardProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'activity'>('overview');

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/projects?id=${projectId}`);
      const projectData = await projectRes.json();
      if (projectData.success) {
        setProject(projectData.data);
      }

      // Fetch tasks for stats
      const tasksRes = await fetch(`/api/projects/tasks?project_id=${projectId}&limit=100`);
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        const tasks = tasksData.data as Task[];
        const now = new Date();

        // Story points are an optional extension - cast through unknown for flexibility
        const getStoryPoints = (task: Task): number => {
          const extendedTask = task as unknown as { story_points?: number };
          return extendedTask.story_points || 0;
        };

        setStats({
          total_tasks: tasks.length,
          completed_tasks: tasks.filter(t => t.status === 'completed').length,
          in_progress_tasks: tasks.filter(t => t.status === 'in_progress').length,
          overdue_tasks: tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length,
          total_story_points: tasks.reduce((sum, t) => sum + getStoryPoints(t), 0),
          completed_story_points: tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + getStoryPoints(t), 0),
          team_members: new Set(tasks.map(t => t.assignees?.[0]?.id).filter(Boolean)).size,
          total_time_hours: 0, // Would come from time entries
          active_risks: 0, // Would come from risks API
          health_score: projectData.data?.health_score || 0
        });

        // Recent tasks (last 5 updated)
        setRecentTasks(
          [...tasks]
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 5)
        );
      }

      // Fetch risks count
      try {
        const risksRes = await fetch(`/api/projects/risks?project_id=${projectId}&status=identified,analyzing,planned`);
        const risksData = await risksRes.json();
        if (risksData.success) {
          setStats(prev => prev ? { ...prev, active_risks: risksData.data.length } : null);
        }
      } catch {
        // Risks might not be set up yet
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number): string => {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'At Risk';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  const getProgressColor = (completed: number, total: number): string => {
    if (total === 0) return 'bg-gray-300 dark:bg-gray-600';
    const pct = (completed / total) * 100;
    if (pct >= 75) return 'bg-green-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!project || !stats) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Failed to load project dashboard
      </div>
    );
  }

  const completionPercentage = stats.total_tasks > 0 
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              project.status === 'active' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : project.status === 'completed'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {project.status}
            </span>
            {stats.health_score > 0 && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(stats.health_score)} bg-gray-100 dark:bg-gray-700`}>
                {getHealthLabel(stats.health_score)} ({stats.health_score}%)
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{completionPercentage}% complete</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(stats.completed_tasks, stats.total_tasks)}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total_tasks}
          icon="📋"
        />
        <StatCard
          title="Completed"
          value={stats.completed_tasks}
          icon="✅"
          color="text-green-600"
        />
        <StatCard
          title="In Progress"
          value={stats.in_progress_tasks}
          icon="🔄"
          color="text-blue-600"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue_tasks}
          icon="⚠️"
          color="text-red-600"
        />
        <StatCard
          title="Active Risks"
          value={stats.active_risks}
          icon="⚡"
          color="text-orange-600"
        />
        <StatCard
          title="Team Size"
          value={stats.team_members}
          icon="👥"
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'time', label: 'Time Tracking' },
            { id: 'activity', label: 'Activity' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tasks */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Tasks</h3>
              <a href={`/projects/${projectId}/tasks`} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
                View all
              </a>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No tasks yet
                </div>
              ) : (
                recentTasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'blocked' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{task.status.replace('_', ' ')}</span>
                        {task.due_date && (
                          <span className={new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-500' : ''}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            {/* Story Points Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Story Points</h3>
              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-brand-600">{stats.completed_story_points}</span>
                <span className="text-2xl text-gray-400"> / {stats.total_story_points}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ 
                    width: `${stats.total_story_points > 0 ? (stats.completed_story_points / stats.total_story_points) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Timeline</h3>
              <div className="space-y-3">
                {project.start_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Start Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(project.start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {project.end_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Target End</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(project.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {project.end_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Days Remaining</span>
                    <span className={`font-medium ${
                      Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) < 0
                        ? 'text-red-600'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tasks by Priority</h3>
              <div className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map(priority => {
                  const count = recentTasks.filter(t => t.priority === priority).length;
                  const colors: Record<string, string> = {
                    critical: 'bg-red-500',
                    high: 'bg-orange-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500'
                  };
                  return (
                    <div key={priority} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors[priority]}`} />
                      <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 capitalize">{priority}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <TimeTracker projectId={projectId} />
      )}

      {activeTab === 'activity' && (
        <ActivityFeed projectId={projectId} />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  color = 'text-gray-900 dark:text-white' 
}: { 
  title: string; 
  value: number | string; 
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
