"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Sprint, SprintBurndownData } from '@/types/projects-enhanced';
import { Task } from '@/types/projects';

interface SprintBoardProps {
  projectId: string;
  sprintId?: string;
  onSprintChange?: (sprintId: string | null) => void;
}

interface SprintWithStats extends Sprint {
  total_tasks?: number;
  completed_tasks?: number;
  total_story_points?: number;
  completed_story_points?: number;
  days_remaining?: number;
}

export default function SprintBoard({ projectId, sprintId, onSprintChange }: SprintBoardProps) {
  const [sprints, setSprints] = useState<SprintWithStats[]>([]);
  const [activeSprint, setActiveSprint] = useState<SprintWithStats | null>(null);
  const [burndownData, setBurndownData] = useState<SprintBurndownData[]>([]);
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    capacity_hours: ''
  });

  const fetchSprints = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/sprints?project_id=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setSprints(data.data);

        // Set active sprint
        const active = data.data.find((s: SprintWithStats) => s.status === 'active');
        if (active) {
          setActiveSprint(active);
          onSprintChange?.(active.id);
        } else if (sprintId) {
          const selected = data.data.find((s: SprintWithStats) => s.id === sprintId);
          if (selected) setActiveSprint(selected);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sprints:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId, onSprintChange]);

  const fetchSprintDetails = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/projects/sprints?id=${id}&include_tasks=true&include_burndown=true`);
      const data = await response.json();
      if (data.success) {
        setActiveSprint(data.data);
        setSprintTasks(data.data.tasks || []);
        setBurndownData(data.data.burndown_data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sprint details:', err);
    }
  }, []);

  const fetchBacklog = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/tasks?project_id=${projectId}&no_sprint=true&status=not_started,in_progress`);
      const data = await response.json();
      if (data.success) {
        setBacklogTasks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch backlog:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  useEffect(() => {
    if (activeSprint) {
      fetchSprintDetails(activeSprint.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSprint?.id, fetchSprintDetails]);

  const selectSprint = (sprint: SprintWithStats) => {
    setActiveSprint(sprint);
    onSprintChange?.(sprint.id);
  };

  const createSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          ...newSprint,
          capacity_hours: newSprint.capacity_hours ? parseInt(newSprint.capacity_hours) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewSprint({ name: '', goal: '', start_date: '', end_date: '', capacity_hours: '' });
        fetchSprints();
      }
    } catch (err) {
      console.error('Failed to create sprint:', err);
    }
  };

  const startSprint = async () => {
    if (!activeSprint) return;
    try {
      await fetch('/api/projects/sprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSprint.id, start_sprint: true })
      });
      fetchSprints();
    } catch (err) {
      console.error('Failed to start sprint:', err);
    }
  };

  const completeSprint = async () => {
    if (!activeSprint || !confirm('Complete this sprint? Incomplete tasks will remain in the backlog.')) return;
    try {
      await fetch('/api/projects/sprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSprint.id, complete_sprint: true })
      });
      fetchSprints();
    } catch (err) {
      console.error('Failed to complete sprint:', err);
    }
  };

  const addTasksToSprint = async () => {
    if (!activeSprint || selectedTasks.size === 0) return;
    try {
      const tasks = Array.from(selectedTasks).map(taskId => ({ task_id: taskId }));
      await fetch('/api/projects/sprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSprint.id, add_tasks: tasks })
      });
      setSelectedTasks(new Set());
      setShowBacklogModal(false);
      fetchSprintDetails(activeSprint.id);
    } catch (err) {
      console.error('Failed to add tasks:', err);
    }
  };

  const removeTaskFromSprint = async (taskId: string) => {
    if (!activeSprint) return;
    try {
      await fetch('/api/projects/sprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSprint.id, remove_tasks: [taskId] })
      });
      fetchSprintDetails(activeSprint.id);
    } catch (err) {
      console.error('Failed to remove task:', err);
    }
  };

  const calculateProgress = (sprint: SprintWithStats): number => {
    if (!sprint.total_story_points) return 0;
    return Math.round((sprint.completed_story_points || 0) / sprint.total_story_points * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Simple burndown chart using SVG
  const renderBurndownChart = () => {
    if (!burndownData.length || !activeSprint) return null;

    const startDate = new Date(activeSprint.start_date);
    const endDate = new Date(activeSprint.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPoints = activeSprint.total_story_points || 0;

    const width = 400;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Ideal burndown line
    const idealStart = { x: padding, y: padding };
    const idealEnd = { x: width - padding, y: height - padding };

    // Actual burndown line points
    const actualPoints = burndownData.map((d) => {
      const dayIndex = Math.ceil((new Date(d.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const x = padding + (dayIndex / totalDays) * chartWidth;
      const y = padding + ((totalPoints - d.remaining_points) / totalPoints) * chartHeight;
      return `${x},${height - y + padding}`;
    });

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Burndown</h3>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-lg">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <g key={pct}>
              <line
                x1={padding}
                y1={padding + (pct / 100) * chartHeight}
                x2={width - padding}
                y2={padding + (pct / 100) * chartHeight}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <text
                x={padding - 5}
                y={padding + (pct / 100) * chartHeight}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {totalPoints - (pct / 100) * totalPoints}
              </text>
            </g>
          ))}

          {/* Ideal line */}
          <line
            x1={idealStart.x}
            y1={idealStart.y}
            x2={idealEnd.x}
            y2={idealEnd.y}
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeDasharray="8"
          />

          {/* Actual line */}
          {actualPoints.length > 1 && (
            <polyline
              points={actualPoints.join(' ')}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
            />
          )}

          {/* Data points */}
          {burndownData.map((d, i) => {
            const dayIndex = Math.ceil((new Date(d.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const x = padding + (dayIndex / totalDays) * chartWidth;
            const y = height - (padding + ((totalPoints - d.remaining_points) / totalPoints) * chartHeight) + padding;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#3B82F6"
              />
            );
          })}

          {/* Labels */}
          <text x={padding} y={height - 10} className="text-xs fill-gray-500">
            {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
          <text x={width - padding} y={height - 10} textAnchor="end" className="text-xs fill-gray-500">
            {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        </svg>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-300" style={{ strokeDasharray: '8' }}></div>
            <span className="text-gray-600 dark:text-gray-400">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Actual</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sprint Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sprints</h2>
          <div className="flex gap-2 overflow-x-auto">
            {sprints.map(sprint => (
              <button
                key={sprint.id}
                onClick={() => selectSprint(sprint)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSprint?.id === sprint.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {sprint.name}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${getStatusColor(sprint.status)}`}>
                  {sprint.status}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sprint
        </button>
      </div>

      {activeSprint ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sprint Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{activeSprint.name}</h3>
                  {activeSprint.goal && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{activeSprint.goal}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeSprint.status)}`}>
                  {activeSprint.status}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {activeSprint.completed_story_points || 0} / {activeSprint.total_story_points || 0} story points
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${calculateProgress(activeSprint)}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <p className="page-title">{activeSprint.total_tasks || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{activeSprint.completed_tasks || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{activeSprint.total_story_points || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Story Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{activeSprint.days_remaining || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Days Left</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {activeSprint.status === 'planning' && (
                  <>
                    <button
                      onClick={() => {
                        fetchBacklog();
                        setShowBacklogModal(true);
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add Tasks from Backlog
                    </button>
                    <button
                      onClick={startSprint}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Start Sprint
                    </button>
                  </>
                )}
                {activeSprint.status === 'active' && (
                  <button
                    onClick={completeSprint}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Complete Sprint
                  </button>
                )}
              </div>
            </div>

            {/* Sprint Tasks */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Tasks</h3>
              {sprintTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No tasks in this sprint yet. Add tasks from the backlog to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {sprintTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {task.status.replace('_', ' ')}
                        </span>
                        {activeSprint.status === 'planning' && (
                          <button
                            onClick={() => removeTaskFromSprint(task.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Burndown Chart */}
          <div className="lg:col-span-1">
            {renderBurndownChart()}

            {/* Sprint Dates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Start Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(activeSprint.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">End Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(activeSprint.end_date).toLocaleDateString()}
                  </span>
                </div>
                {activeSprint.capacity_hours && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Capacity</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {activeSprint.capacity_hours} hours
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Sprints Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first sprint to start tracking work</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Create Sprint
          </button>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Sprint</h2>
            <form onSubmit={createSprint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sprint Name *
                </label>
                <input
                  type="text"
                  value={newSprint.name}
                  onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sprint Goal
                </label>
                <textarea
                  value={newSprint.goal}
                  onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newSprint.start_date}
                    onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={newSprint.end_date}
                    onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacity (hours)
                </label>
                <input
                  type="number"
                  value={newSprint.capacity_hours}
                  onChange={(e) => setNewSprint({ ...newSprint, capacity_hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backlog Modal */}
      {showBacklogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Tasks to Sprint</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select tasks from the backlog to add to {activeSprint?.name}
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {backlogTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No tasks in backlog. All tasks are already assigned to sprints.
                </p>
              ) : (
                <div className="space-y-2">
                  {backlogTasks.map(task => (
                    <label
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={(e) => {
                          const next = new Set(selectedTasks);
                          if (e.target.checked) {
                            next.add(task.id);
                          } else {
                            next.delete(task.id);
                          }
                          setSelectedTasks(next);
                        }}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {task.priority} priority • {task.status.replace('_', ' ')}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTasks.size} tasks selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBacklogModal(false);
                    setSelectedTasks(new Set());
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addTasksToSprint}
                  disabled={selectedTasks.size === 0}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Sprint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
