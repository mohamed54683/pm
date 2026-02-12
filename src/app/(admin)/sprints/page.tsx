"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';

interface Sprint {
  id: number;
  uuid: string;
  name: string;
  goal: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  project_id: number;
  project_name?: string;
  project_code?: string;
  total_points: number;
  completed_points: number;
  total_tasks: number;
  completed_tasks: number;
  velocity?: number;
  scope_locked?: boolean;
  paused_at?: string;
  extended_to?: string;
}

interface SprintDashboard {
  active_sprints_count: number;
  total_points_committed: number;
  total_points_completed: number;
  average_velocity: number;
  at_risk_sprints: number;
  velocity_trend: { sprint_name: string; velocity: number }[];
  upcoming_deadlines: { id: number; name: string; end_date: string; days_remaining: number }[];
  health_summary: { healthy: number; at_risk: number; critical: number };
}

interface Project {
  id: number;
  name: string;
  code: string;
}

const statusColors: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const healthColors = {
  healthy: 'text-green-500',
  at_risk: 'text-yellow-500',
  critical: 'text-red-500',
};

export default function SprintsPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [dashboard, setDashboard] = useState<SprintDashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'planning' | 'dashboard'>('dashboard');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    project_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    capacity_hours: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch projects first
      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      if (projectsData.success) {
        setProjects(projectsData.data);
      }

      // Fetch all sprints
      const allSprints: Sprint[] = [];
      for (const project of projectsData.data || []) {
        try {
          const sprintsRes = await fetch(`/api/projects/sprints?project_id=${project.id}`);
          const sprintsData = await sprintsRes.json();
          if (sprintsData.success) {
            allSprints.push(...sprintsData.data.map((s: Sprint) => ({
              ...s,
              project_name: project.name,
              project_code: project.code
            })));
          }
        } catch {
          // Skip this project
        }
      }
      setSprints(allSprints);

      // Fetch dashboard data
      try {
        const dashRes = await fetch('/api/sprints/dashboard');
        const dashData = await dashRes.json();
        if (dashData.success) {
          setDashboard(dashData.data);
        }
      } catch {
        console.error('Failed to fetch dashboard');
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSprints = sprints.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterProject !== 'all' && s.project_id.toString() !== filterProject) return false;
    return true;
  });

  const activeSprints = sprints.filter(s => s.status === 'active');
  const planningSprints = sprints.filter(s => s.status === 'planning');

  const getProgress = (sprint: Sprint) => {
    if (!sprint.total_points) return 0;
    return Math.round((sprint.completed_points / sprint.total_points) * 100);
  };

  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSprintHealth = (sprint: Sprint): 'healthy' | 'at_risk' | 'critical' => {
    if (sprint.status !== 'active') return 'healthy';
    const daysRemaining = getRemainingDays(sprint.end_date);
    const progress = getProgress(sprint);
    const expectedProgress = sprint.total_points > 0 
      ? Math.round(((new Date().getTime() - new Date(sprint.start_date).getTime()) / 
         (new Date(sprint.end_date).getTime() - new Date(sprint.start_date).getTime())) * 100)
      : 0;
    
    if (daysRemaining < 0) return 'critical';
    if (progress < expectedProgress - 20) return 'critical';
    if (progress < expectedProgress - 10) return 'at_risk';
    return 'healthy';
  };

  const handleCreateSprint = async () => {
    if (!newSprint.name || !newSprint.project_id || !newSprint.start_date || !newSprint.end_date) {
      alert('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/projects/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSprint,
          project_id: parseInt(newSprint.project_id),
          capacity_hours: newSprint.capacity_hours ? parseInt(newSprint.capacity_hours) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewSprint({
          name: '',
          goal: '',
          project_id: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          capacity_hours: '',
        });
        fetchData();
      } else {
        alert(data.message || 'Failed to create sprint');
      }
    } catch (error) {
      console.error('Error creating sprint:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleSprintAction = async (sprintId: number, action: string) => {
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Sprint action failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Sprint Management</h1>
            <p className="page-subtitle">
              Plan, track, and deliver work across all projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sprints/backlog"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Backlog
            </Link>
            <Link
              href="/sprints/releases"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Releases
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Sprint
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-t border-gray-200 pt-4 dark:border-gray-700">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'active', label: `Active (${activeSprints.length})`, icon: '🏃' },
            { id: 'planning', label: `Planning (${planningSprints.length})`, icon: '📋' },
            { id: 'all', label: 'All Sprints', icon: '📅' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="page-subtitle">Active Sprints</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dashboard.active_sprints_count}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="page-subtitle">Points Committed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{dashboard.total_points_committed}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="page-subtitle">Points Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{dashboard.total_points_completed}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="page-subtitle">Avg Velocity</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{dashboard.average_velocity.toFixed(1)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="page-subtitle">At Risk</p>
                <p className={`text-2xl font-bold mt-1 ${dashboard.at_risk_sprints > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {dashboard.at_risk_sprints}
                </p>
              </div>
            </div>

            {/* Health & Velocity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sprint Health Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Health</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">Healthy:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{dashboard.health_summary.healthy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">At Risk:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{dashboard.health_summary.at_risk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">Critical:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{dashboard.health_summary.critical}</span>
                  </div>
                </div>
              </div>

              {/* Velocity Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Velocity Trend</h3>
                {dashboard.velocity_trend.length > 0 ? (
                  <div className="flex items-end gap-2 h-24">
                    {dashboard.velocity_trend.slice(-6).map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-brand-500 rounded-t"
                          style={{ height: `${Math.min((v.velocity / (Math.max(...dashboard.velocity_trend.map(x => x.velocity)) || 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-gray-500 truncate w-full text-center">{v.velocity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No velocity data yet</p>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            {dashboard.upcoming_deadlines.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h3>
                <div className="space-y-3">
                  {dashboard.upcoming_deadlines.map(sprint => (
                    <Link
                      key={sprint.id}
                      href={`/sprints/${sprint.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{sprint.name}</span>
                      <span className={`text-sm ${sprint.days_remaining <= 2 ? 'text-red-600' : sprint.days_remaining <= 5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {sprint.days_remaining} days left
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Active Sprints Quick View */}
            {activeSprints.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Active Sprints</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {activeSprints.map(sprint => (
                    <Link
                      key={sprint.id}
                      href={`/sprints/${sprint.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${healthColors[getSprintHealth(sprint)]}`}></span>
                          <h4 className="font-medium text-gray-900 dark:text-white">{sprint.name}</h4>
                          <span className="text-xs text-gray-500">({sprint.project_name})</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 max-w-xs">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 rounded-full"
                                style={{ width: `${getProgress(sprint)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{getProgress(sprint)}%</span>
                          <span className="text-sm text-gray-500">{sprint.completed_points}/{sprint.total_points} pts</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-sm font-medium ${getRemainingDays(sprint.end_date) <= 2 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                          {getRemainingDays(sprint.end_date)} days left
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeSprints.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-4xl">🏃</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Active Sprints</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Start a sprint from the planning tab to begin tracking work</p>
              </div>
            ) : (
              activeSprints.map(sprint => (
                <div
                  key={sprint.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${healthColors[getSprintHealth(sprint)]}`}></span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[sprint.status]}`}>
                          {sprint.status}
                        </span>
                        {sprint.scope_locked && (
                          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">🔒 Scope Locked</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {sprint.project_name} • {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </p>
                      {sprint.goal && <p className="text-gray-600 dark:text-gray-400 mt-2">{sprint.goal}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sprints/${sprint.id}`}
                        className="px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg"
                      >
                        View Board →
                      </Link>
                      <button
                        onClick={() => handleSprintAction(sprint.id, 'complete')}
                        className="px-3 py-1.5 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        Complete
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="page-title">{sprint.total_tasks}</p>
                      <p className="text-xs text-gray-500">Total Tasks</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{sprint.completed_tasks}</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{sprint.completed_points}/{sprint.total_points}</p>
                      <p className="text-xs text-gray-500">Story Points</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className={`text-2xl font-bold ${getRemainingDays(sprint.end_date) <= 2 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {getRemainingDays(sprint.end_date)}
                      </p>
                      <p className="text-xs text-gray-500">Days Left</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{getProgress(sprint)}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${getProgress(sprint)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Planning Tab */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            {planningSprints.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-4xl">📋</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Sprints in Planning</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Create a new sprint to start planning</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  Create Sprint
                </button>
              </div>
            ) : (
              planningSprints.map(sprint => (
                <div
                  key={sprint.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[sprint.status]}`}>
                          {sprint.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {sprint.project_name} • {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </p>
                      {sprint.goal && <p className="text-gray-600 dark:text-gray-400 mt-2">{sprint.goal}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sprints/${sprint.id}`}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                      >
                        Edit Sprint
                      </Link>
                      <button
                        onClick={() => handleSprintAction(sprint.id, 'start')}
                        className="px-3 py-1.5 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                      >
                        Start Sprint
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span>📊 {sprint.total_tasks} tasks</span>
                    <span>⭐ {sprint.total_points} story points</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* All Sprints Tab */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">{filteredSprints.length} sprints</span>
            </div>

            {filteredSprints.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 mt-2">No sprints found</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sprint</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredSprints.map(sprint => (
                      <tr key={sprint.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <Link href={`/sprints/${sprint.id}`} className="font-medium text-gray-900 dark:text-white hover:text-brand-600">
                            {sprint.name}
                          </Link>
                          {sprint.goal && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">{sprint.goal}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{sprint.project_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[sprint.status]}`}>
                            {sprint.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sprint.status === 'completed' ? 'bg-green-500' : 'bg-brand-500'}`}
                                style={{ width: `${getProgress(sprint)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{getProgress(sprint)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/sprints/${sprint.id}`}
                            className="text-sm text-brand-600 hover:text-brand-700"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Sprint Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Create New Sprint</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
              <select
                value={newSprint.project_id}
                onChange={(e) => setNewSprint(prev => ({ ...prev, project_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sprint Name *</label>
              <input
                type="text"
                value={newSprint.name}
                onChange={(e) => setNewSprint(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., Sprint 1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sprint Goal</label>
              <textarea
                value={newSprint.goal}
                onChange={(e) => setNewSprint(prev => ({ ...prev, goal: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={2}
                placeholder="What should this sprint achieve?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
                <input
                  type="date"
                  value={newSprint.start_date}
                  onChange={(e) => setNewSprint(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">End Date *</label>
                <input
                  type="date"
                  value={newSprint.end_date}
                  onChange={(e) => setNewSprint(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity (hours)</label>
              <input
                type="number"
                value={newSprint.capacity_hours}
                onChange={(e) => setNewSprint(prev => ({ ...prev, capacity_hours: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSprint} disabled={creating}>
              {creating ? 'Creating...' : 'Create Sprint'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
