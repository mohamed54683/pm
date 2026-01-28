"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority, TaskFilters } from '@/types/projects';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import TaskForm from './TaskForm';
import TaskCard from './TaskCard';

interface TaskListProps {
  projectId: string;
  phaseId?: string;
  onTaskClick?: (task: Task) => void;
  showCreateButton?: boolean;
  viewMode?: 'list' | 'cards';
}

const statusColors: Record<TaskStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  blocked: 'bg-orange-100 text-orange-700'
};

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  critical: 'text-red-500'
};

export default function TaskList({
  projectId,
  phaseId,
  onTaskClick,
  showCreateButton = true,
  viewMode: initialViewMode = 'list'
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(initialViewMode);
  const [filters, setFilters] = useState<TaskFilters>({ project_id: projectId, phase_id: phaseId });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      if (phaseId) params.append('phase_id', phaseId);
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.priority?.length) params.append('priority', filters.priority.join(','));
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/projects/tasks?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, phaseId, filters, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch('/api/projects/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus })
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status Filter */}
          <select
            value={filters.status?.[0] || ''}
            onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value as TaskStatus] : undefined)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority?.[0] || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value ? [e.target.value as TaskPriority] : undefined)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 ${viewMode === 'cards' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          {showCreateButton && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No tasks yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first task to get started</p>
          {showCreateButton && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>Create Task</Button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-8">
                  <span className="sr-only">Status</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assignees</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.map(task => (
                <tr 
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, e.target.checked ? 'completed' : 'not_started');
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {task.title}
                      </div>
                      {task.phase_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{task.phase_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center border-2 border-white dark:border-gray-800"
                            title={assignee.user_name}
                          >
                            {assignee.user_name?.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs flex items-center justify-center border-2 border-white dark:border-gray-800">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {task.due_date ? (
                      <span className={new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-500' : ''}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(task.progress_percentage)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create New Task</h2>
          <TaskForm
            projectId={projectId}
            phaseId={phaseId}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateModal(false)}
          />
        </div>
      </Modal>
    </div>
  );
}
