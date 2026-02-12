"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';

interface Task {
  id: number;
  uuid: string;
  task_key: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  story_points: number;
  assignee_id: number;
  assignee_first_name: string;
  assignee_last_name: string;
  is_blocked: boolean;
  blocked_reason: string;
}

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
  total_points: number;
  completed_points: number;
  total_tasks: number;
  completed_tasks: number;
  capacity_hours: number;
  velocity: number;
  scope_locked: boolean;
  scope_lock_reason: string;
  paused_at: string;
  pause_reason: string;
  extended_to: string;
  extend_reason: string;
  announcements: string;
  review_notes: string;
  completion_summary: string;
}

interface BurndownData {
  date: string;
  remaining_points: number;
  completed_points: number;
  ideal_remaining: number;
}

interface RetroItem {
  id: number;
  type: 'went_well' | 'to_improve' | 'action_item';
  content: string;
  votes: number;
  created_by_name: string;
  status: string;
}

const statusColumns = [
  { id: 'backlog', label: 'Backlog', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'todo', label: 'To Do', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'in_review', label: 'In Review', color: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'done', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
];

const priorityColors: Record<string, string> = {
  critical: 'border-red-500',
  high: 'border-orange-500',
  medium: 'border-yellow-500',
  low: 'border-green-500',
};

const typeIcons: Record<string, string> = {
  story: '📖',
  task: '✓',
  bug: '🐛',
  epic: '⚡',
  subtask: '📋',
};

const statusColors: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function SprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sprintId = params.id as string;
  
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [burndown, setBurndown] = useState<BurndownData[]>([]);
  const [retroItems, setRetroItems] = useState<RetroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'burndown' | 'retro' | 'settings'>('board');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showRetroModal, setShowRetroModal] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [newRetroItem, setNewRetroItem] = useState({ type: 'went_well', content: '' });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const fetchSprint = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sprints/${sprintId}`);
      const data = await res.json();
      if (data.success) {
        setSprint(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/sprints/${sprintId}/tasks`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [sprintId]);

  const fetchBurndown = useCallback(async () => {
    try {
      const res = await fetch(`/api/sprints/${sprintId}/burndown`);
      const data = await res.json();
      if (data.success) {
        setBurndown(data.data.burndown || []);
      }
    } catch (error) {
      console.error('Failed to fetch burndown:', error);
    }
  }, [sprintId]);

  const fetchRetro = useCallback(async () => {
    try {
      const res = await fetch(`/api/sprints/${sprintId}/retrospective`);
      const data = await res.json();
      if (data.success) {
        setRetroItems(data.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch retro:', error);
    }
  }, [sprintId]);

  const fetchBacklog = useCallback(async () => {
    if (!sprint) return;
    try {
      const res = await fetch(`/api/backlog?project_id=${sprint.project_id}`);
      const data = await res.json();
      if (data.success) {
        setBacklogTasks(data.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
    }
  }, [sprint]);

  useEffect(() => {
    fetchSprint();
    fetchTasks();
    fetchBurndown();
    fetchRetro();
  }, [fetchSprint, fetchTasks, fetchBurndown, fetchRetro]);

  const handleSprintAction = async (action: string, params: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSprint();
        fetchTasks();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Sprint action failed:', error);
    }
  };

  const handleTaskStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
        fetchBurndown();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleAddTasks = async () => {
    if (selectedTasks.size === 0) return;
    try {
      const res = await fetch(`/api/sprints/${sprintId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: Array.from(selectedTasks) }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddTaskModal(false);
        setSelectedTasks(new Set());
        fetchTasks();
        fetchSprint();
      }
    } catch (error) {
      console.error('Failed to add tasks:', error);
    }
  };

  const handleAddRetroItem = async () => {
    if (!newRetroItem.content) return;
    try {
      const res = await fetch(`/api/sprints/${sprintId}/retrospective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRetroItem),
      });
      const data = await res.json();
      if (data.success) {
        setNewRetroItem({ type: 'went_well', content: '' });
        setShowRetroModal(false);
        fetchRetro();
      }
    } catch (error) {
      console.error('Failed to add retro item:', error);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedTask && draggedTask.status !== status) {
      handleTaskStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  const getRemainingDays = () => {
    if (!sprint) return 0;
    const end = new Date(sprint.end_date);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getProgress = () => {
    if (!sprint || !sprint.total_points) return 0;
    return Math.round((sprint.completed_points / sprint.total_points) * 100);
  };

  // Render Burndown Chart
  const renderBurndownChart = () => {
    if (!sprint || burndown.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No burndown data available yet
        </div>
      );
    }

    const totalPoints = sprint.total_points || 0;
    const width = 600;
    const height = 300;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxPoints = Math.max(totalPoints, ...burndown.map(d => d.remaining_points));

    const getX = (i: number) => padding + (i / (burndown.length - 1 || 1)) * chartWidth;
    const getY = (points: number) => padding + ((maxPoints - points) / maxPoints) * chartHeight;

    const actualLine = burndown.map((d, i) => `${getX(i)},${getY(d.remaining_points)}`).join(' ');
    const idealLine = burndown.map((d, i) => `${getX(i)},${getY(d.ideal_remaining)}`).join(' ');

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Burndown</h3>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-2xl mx-auto">
          {/* Grid */}
          {[0, 25, 50, 75, 100].map(pct => (
            <g key={pct}>
              <line
                x1={padding}
                y1={getY((pct / 100) * maxPoints)}
                x2={width - padding}
                y2={getY((pct / 100) * maxPoints)}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <text
                x={padding - 10}
                y={getY((pct / 100) * maxPoints) + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {Math.round((pct / 100) * maxPoints)}
              </text>
            </g>
          ))}

          {/* Ideal Line */}
          <polyline
            points={idealLine}
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeDasharray="8"
          />

          {/* Actual Line */}
          <polyline
            points={actualLine}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
          />

          {/* Data Points */}
          {burndown.map((d, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.remaining_points)}
              r="5"
              fill="#3B82F6"
            />
          ))}

          {/* X-axis labels */}
          {burndown.filter((_, i) => i % Math.ceil(burndown.length / 5) === 0 || i === burndown.length - 1).map((d, i) => (
            <text
              key={i}
              x={getX(burndown.indexOf(d))}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}
        </svg>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-300" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-sm text-gray-600">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-blue-500"></div>
            <span className="text-sm text-gray-600">Actual</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading || !sprint) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const tasksByStatus = statusColumns.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const retroByType = {
    went_well: retroItems.filter(r => r.type === 'went_well'),
    to_improve: retroItems.filter(r => r.type === 'to_improve'),
    action_item: retroItems.filter(r => r.type === 'action_item'),
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/sprints" className="text-gray-500 hover:text-gray-700">
                ← Sprints
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="card-title text-xl">{sprint.name}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[sprint.status]}`}>
                {sprint.status}
              </span>
              {sprint.scope_locked && (
                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">🔒 Locked</span>
              )}
              {sprint.paused_at && (
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs">⏸ Paused</span>
              )}
            </div>
            {sprint.goal && (
              <p className="text-sm text-gray-500 mt-1">{sprint.goal}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sprint.status === 'planning' && (
              <>
                <button
                  onClick={() => {
                    fetchBacklog();
                    setShowAddTaskModal(true);
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Add Tasks
                </button>
                <button
                  onClick={() => handleSprintAction('start')}
                  className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  Start Sprint
                </button>
              </>
            )}
            {sprint.status === 'active' && (
              <>
                <button
                  onClick={() => handleSprintAction('lock_scope')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {sprint.scope_locked ? 'Unlock Scope' : 'Lock Scope'}
                </button>
                <button
                  onClick={() => handleSprintAction('complete')}
                  className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Complete Sprint
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Progress:</span>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${getProgress()}%` }}></div>
            </div>
            <span className="font-medium">{getProgress()}%</span>
          </div>
          <div>
            <span className="text-gray-500">Points:</span>
            <span className="font-medium ml-1">{sprint.completed_points}/{sprint.total_points}</span>
          </div>
          <div>
            <span className="text-gray-500">Tasks:</span>
            <span className="font-medium ml-1">{sprint.completed_tasks}/{sprint.total_tasks}</span>
          </div>
          <div>
            <span className="text-gray-500">Days Left:</span>
            <span className={`font-medium ml-1 ${getRemainingDays() <= 2 ? 'text-red-600' : ''}`}>
              {getRemainingDays()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="font-medium ml-1">
              {new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-t border-gray-200 pt-4 dark:border-gray-700">
          {[
            { id: 'board', label: 'Board', icon: '📋' },
            { id: 'burndown', label: 'Burndown', icon: '📉' },
            { id: 'retro', label: 'Retrospective', icon: '💭' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
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
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Board Tab - Kanban */}
        {activeTab === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map(col => (
              <div
                key={col.id}
                className={`flex-shrink-0 w-72 rounded-xl ${col.color}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.id)}
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">{col.label}</h3>
                    <span className="text-sm text-gray-500">{tasksByStatus[col.id]?.length || 0}</span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {tasksByStatus[col.id]?.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className={`bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border-l-4 ${priorityColors[task.priority] || 'border-gray-300'} cursor-move hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{typeIcons[task.type] || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-blue-600">{task.task_key}</span>
                            {task.is_blocked && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">Blocked</span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm mt-1 line-clamp-2">{task.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {task.assignee_first_name ? (
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-medium">
                              {task.assignee_first_name[0]}{task.assignee_last_name?.[0]}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                        {task.story_points > 0 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                            {task.story_points} pts
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Burndown Tab */}
        {activeTab === 'burndown' && (
          <div className="max-w-4xl mx-auto">
            {renderBurndownChart()}
            
            {/* Velocity Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Velocity</p>
                <p className="page-title">{sprint.velocity || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Completed Points</p>
                <p className="text-2xl font-bold text-green-600">{sprint.completed_points}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Remaining Points</p>
                <p className="text-2xl font-bold text-blue-600">{sprint.total_points - sprint.completed_points}</p>
              </div>
            </div>
          </div>
        )}

        {/* Retrospective Tab */}
        {activeTab === 'retro' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="card-title">Sprint Retrospective</h2>
              <button
                onClick={() => setShowRetroModal(true)}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
              >
                Add Item
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* What Went Well */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <h3 className="font-medium text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                  <span>😊</span> What Went Well
                </h3>
                <div className="space-y-2">
                  {retroByType.went_well.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                      <p className="text-gray-900 dark:text-white text-sm">{item.content}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{item.created_by_name}</span>
                        <span>👍 {item.votes}</span>
                      </div>
                    </div>
                  ))}
                  {retroByType.went_well.length === 0 && (
                    <p className="text-green-600 text-sm">No items yet</p>
                  )}
                </div>
              </div>

              {/* To Improve */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                <h3 className="font-medium text-yellow-700 dark:text-yellow-400 mb-4 flex items-center gap-2">
                  <span>🤔</span> To Improve
                </h3>
                <div className="space-y-2">
                  {retroByType.to_improve.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                      <p className="text-gray-900 dark:text-white text-sm">{item.content}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{item.created_by_name}</span>
                        <span>👍 {item.votes}</span>
                      </div>
                    </div>
                  ))}
                  {retroByType.to_improve.length === 0 && (
                    <p className="text-yellow-600 text-sm">No items yet</p>
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                  <span>🎯</span> Action Items
                </h3>
                <div className="space-y-2">
                  {retroByType.action_item.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                      <p className="text-gray-900 dark:text-white text-sm">{item.content}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{item.created_by_name}</span>
                        <span className={`px-1.5 py-0.5 rounded ${item.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {retroByType.action_item.length === 0 && (
                    <p className="text-blue-600 text-sm">No items yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Start Date</label>
                    <p className="text-gray-900 dark:text-white">{new Date(sprint.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">End Date</label>
                    <p className="text-gray-900 dark:text-white">{new Date(sprint.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Capacity</label>
                    <p className="text-gray-900 dark:text-white">{sprint.capacity_hours || 'Not set'} hours</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Velocity</label>
                    <p className="text-gray-900 dark:text-white">{sprint.velocity || 0} points</p>
                  </div>
                </div>
              </div>
            </div>

            {sprint.status === 'active' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const reason = prompt('Enter reason for extension:');
                      const newDate = prompt('Enter new end date (YYYY-MM-DD):');
                      if (reason && newDate) {
                        handleSprintAction('extend', { extend_reason: reason, extended_to: newDate });
                      }
                    }}
                    className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className="font-medium">Extend Sprint</span>
                    <p className="text-sm text-gray-500">Extend the sprint end date if more time is needed</p>
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter reason for pausing:');
                      if (reason) {
                        handleSprintAction('pause', { pause_reason: reason });
                      }
                    }}
                    className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className="font-medium">{sprint.paused_at ? 'Resume Sprint' : 'Pause Sprint'}</span>
                    <p className="text-sm text-gray-500">Temporarily pause sprint activity</p>
                  </button>
                </div>
              </div>
            )}

            {sprint.status === 'completed' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sprint Summary</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Review Notes</label>
                    <p className="text-gray-900 dark:text-white">{sprint.review_notes || 'No review notes'}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Completion Summary</label>
                    <p className="text-gray-900 dark:text-white">{sprint.completion_summary || 'No summary'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Tasks Modal */}
      <Modal isOpen={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} className="max-w-2xl">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Add Tasks to Sprint</h2>
          {backlogTasks.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No tasks available in the backlog</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
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
                    className="rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{typeIcons[task.type] || '📋'}</span>
                      <span className="text-xs text-blue-600 font-medium">{task.task_key}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                  </div>
                  <span className="text-sm text-gray-500">{task.story_points || 0} pts</span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between items-center">
            <span className="text-sm text-gray-500">{selectedTasks.size} tasks selected</span>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddTaskModal(false)}>Cancel</Button>
              <Button onClick={handleAddTasks} disabled={selectedTasks.size === 0}>Add Tasks</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Retro Item Modal */}
      <Modal isOpen={showRetroModal} onClose={() => setShowRetroModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Add Retrospective Item</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Type</label>
              <select
                value={newRetroItem.type}
                onChange={(e) => setNewRetroItem(prev => ({ ...prev, type: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="went_well">😊 What Went Well</option>
                <option value="to_improve">🤔 To Improve</option>
                <option value="action_item">🎯 Action Item</option>
              </select>
            </div>
            <div>
              <label className="form-label">Content</label>
              <textarea
                value={newRetroItem.content}
                onChange={(e) => setNewRetroItem(prev => ({ ...prev, content: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                rows={3}
                placeholder="Enter your retrospective item..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRetroModal(false)}>Cancel</Button>
            <Button onClick={handleAddRetroItem} disabled={!newRetroItem.content}>Add Item</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
