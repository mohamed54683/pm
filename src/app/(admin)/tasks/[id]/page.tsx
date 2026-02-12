"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button/Button";

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
  start_date: string;
  due_date: string;
  completed_date: string;
  project_id: number;
  project_code: string;
  project_name: string;
  phase_name: string;
  sprint_name: string;
  assignee_names: string;
  labels: { id: number; name: string; color: string }[];
  assignees: { user_id: number; user_name: string; user_email: string; avatar: string }[];
  checklists: { id: number; title: string; is_completed: boolean; completed_by_name: string }[];
  comments: { id: number; content: string; user_name: string; user_avatar: string; created_at: string }[];
}

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  todo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const priorityColors: Record<string, string> = {
  low: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  critical: 'text-red-600 bg-red-100 dark:bg-red-900/30',
};

const typeIcons: Record<string, string> = {
  epic: '⚡',
  story: '📖',
  task: '✓',
  bug: '🐛',
  subtask: '◦',
};

const statusOptions = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const loadTask = async () => {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setTask(result.data);
      } else {
        setError(result.error || 'Task not found');
      }
    } catch (err) {
      console.error('Error loading task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: task.id, status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        setTask({ ...task, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task_id: task.id, content: newComment })
      });
      const result = await response.json();
      if (result.success) {
        setNewComment('');
        loadTask();
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || 'Task not found'}</p>
        <Button onClick={() => router.push('/tasks')}>Back to Tasks</Button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeIcons[task.task_type] || '✓'}</span>
            <span className="font-mono text-sm text-gray-500">{task.task_key}</span>
          </div>
        </div>
        <h1 className="page-title">{task.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <Link
            href={`/projects/${task.project_id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {task.project_code} - {task.project_name}
          </Link>
          {task.sprint_name && (
            <span className="text-sm text-gray-500">• Sprint: {task.sprint_name}</span>
          )}
          {task.phase_name && (
            <span className="text-sm text-gray-500">• Phase: {task.phase_name}</span>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
              {task.description ? (
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                  {task.description}
                </div>
              ) : (
                <p className="text-gray-400">No description provided</p>
              )}
            </div>

            {/* Checklist */}
            {task.checklists && task.checklists.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Checklist</h2>
                <div className="space-y-2">
                  {task.checklists.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className={item.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Comments ({task.comments?.length || 0})
              </h2>
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="form-input"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {comment.user_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{comment.user_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-4">No comments yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Status</h3>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium ${statusColors[task.status]} border-0`}
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>

              <h3 className="text-sm font-medium text-gray-500 mt-4 mb-2">Priority</h3>
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </div>

            {/* Details */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
              <dl className="space-y-3 text-sm">
                {task.story_points && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Story Points</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{task.story_points}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Estimated</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{task.estimated_hours || 0}h</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Logged</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{task.actual_hours || 0}h</dd>
                </div>
                {task.due_date && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Due Date</dt>
                    <dd className={`font-medium ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {task.completed_date && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Completed</dt>
                    <dd className="font-medium text-green-600">{new Date(task.completed_date).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Assignees */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assignees</h3>
              {task.assignees && task.assignees.length > 0 ? (
                <div className="space-y-2">
                  {task.assignees.map((assignee) => (
                    <div key={assignee.user_id} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {assignee.user_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{assignee.user_name}</p>
                        <p className="text-xs text-gray-500">{assignee.user_email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No assignees</p>
              )}
            </div>

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Labels</h3>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${label.color}20`, color: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
