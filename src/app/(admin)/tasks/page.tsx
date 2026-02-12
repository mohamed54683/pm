"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Project {
  id: number;
  name: string;
  code: string;
}

interface Task {
  id: number;
  uuid: string;
  task_key: string;
  title: string;
  description: string;
  task_type: string;
  status: string;
  priority: string;
  story_points: number;
  estimated_hours: number;
  actual_hours: number;
  due_date: string;
  project_id: number;
  project_code: string;
  project_name: string;
  sprint_name: string;
  assignee_name: string;
  assignee_avatar: string;
  subtask_count: number;
  comment_count: number;
  labels: { id: number; name: string; color: string }[];
}

const statusOptions = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const priorityOptions = ['low', 'medium', 'high', 'critical'];
const typeOptions = ['epic', 'story', 'task', 'bug', 'subtask'];

const statusBadges: Record<string, string> = {
  backlog: 'badge badge-default',
  todo: 'badge badge-info',
  in_progress: 'badge badge-warning',
  in_review: 'badge badge-purple',
  done: 'badge badge-success',
};

const priorityColors: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const typeIcons: Record<string, string> = {
  epic: '⚡',
  story: '📖',
  task: '✓',
  bug: '🐛',
  subtask: '◦',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '', type: '', search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [newTask, setNewTask] = useState({
    project_id: '',
    title: '',
    description: '',
    task_type: 'task',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    estimated_hours: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTasks();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.type) params.set('type', filter.type);
      if (filter.search) params.set('search', filter.search);
      params.set('page', pagination.page.toString());

      const response = await fetch(`/api/tasks?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setTasks(result.data || []);
        setPagination(result.pagination || { page: 1, total: result.data?.length || 0, totalPages: 1 });
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">
              {pagination.total} tasks total
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <input
            type="text"
            placeholder="Search tasks..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="form-input"
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="form-select"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className="form-select"
          >
            <option value="">All Priorities</option>
            {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="form-select"
          >
            <option value="">All Types</option>
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="page-body">
        <div className="card">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tasks.map((task) => (
              <Link
                href={`/tasks/${task.id}`}
                key={task.id}
                className="data-table-row flex items-center gap-4"
              >
                {/* Type Icon */}
                <span className="text-lg" title={task.task_type}>
                  {typeIcons[task.task_type] || '✓'}
                </span>

                {/* Priority Indicator */}
                <div className={`h-2 w-2 rounded-full ${priorityColors[task.priority]}`} title={task.priority}></div>

                {/* Task Key */}
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">
                  {task.task_key}
                </span>

                {/* Title & Meta */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">{task.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{task.project_code}</span>
                    {task.sprint_name && <span>• {task.sprint_name}</span>}
                    {task.due_date && (
                      <span className={new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500' : ''}>
                        • Due {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div className="hidden md:flex items-center gap-1">
                  {task.labels?.slice(0, 2).map((label) => (
                    <span
                      key={label.id}
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${label.color}20`, color: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>

                {/* Story Points */}
                {task.story_points && (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {task.story_points} SP
                  </span>
                )}

                {/* Status */}
                <span className={statusBadges[task.status]}>
                  {task.status.replace('_', ' ')}
                </span>

                {/* Assignee */}
                {task.assignee_name && (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {task.assignee_name.charAt(0)}
                    </div>
                  </div>
                )}

                {/* Meta Icons */}
                <div className="flex items-center gap-2 text-gray-400">
                  {task.subtask_count > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      {task.subtask_count}
                    </span>
                  )}
                  {task.comment_count > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {task.comment_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}

            {tasks.length === 0 && (
              <div className="empty-state">
                <p className="empty-state-title">No tasks found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="empty-state-text mt-4 text-blue-600 hover:underline"
                >
                  Create your first task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setPagination({ ...pagination, page })}
                className={`rounded px-3 py-1 text-sm ${
                  page === pagination.page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Task</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newTask.project_id || !newTask.title) return;
            setCreating(true);
            try {
              const response = await fetch('/api/projects/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  project_id: parseInt(newTask.project_id),
                  title: newTask.title,
                  description: newTask.description,
                  task_type: newTask.task_type,
                  priority: newTask.priority,
                  status: newTask.status,
                  due_date: newTask.due_date || null,
                  estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null
                })
              });
              const result = await response.json();
              if (result.success) {
                setShowCreateModal(false);
                setNewTask({
                  project_id: '',
                  title: '',
                  description: '',
                  task_type: 'task',
                  priority: 'medium',
                  status: 'todo',
                  due_date: '',
                  estimated_hours: ''
                });
                loadTasks();
              } else {
                alert(result.error || 'Failed to create task');
              }
            } catch (error) {
              console.error('Error creating task:', error);
              alert('Failed to create task');
            } finally {
              setCreating(false);
            }
          }} className="space-y-4">
            <div>
              <label className="form-label">Project *</label>
              <select
                value={newTask.project_id}
                onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                required
                className="form-select w-full"
              >
                <option value="">Select a project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
                className="form-input w-full"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
                className="form-input w-full"
                placeholder="Task description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Type</label>
                <select
                  value={newTask.task_type}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                  className="form-select w-full"
                >
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="form-select w-full"
                >
                  {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">Est. Hours</label>
                <input
                  type="number"
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                  className="form-input w-full"
                  placeholder="Hours"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newTask.project_id || !newTask.title}>
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
