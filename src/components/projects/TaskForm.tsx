"use client";

import React, { useState, useEffect } from 'react';
import { TaskFormData, TaskStatus, TaskPriority, TaskType, ProjectPhase } from '@/types/projects';
import Button from '@/components/ui/button/Button';

interface TaskFormProps {
  projectId: string;
  phaseId?: string;
  parentTaskId?: string;
  taskId?: string;
  initialData?: TaskFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function TaskForm({
  projectId,
  phaseId,
  parentTaskId,
  taskId,
  initialData,
  onSuccess,
  onCancel
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    task_type: 'task',
    phase_id: phaseId,
    parent_task_id: parentTaskId,
    start_date: '',
    due_date: '',
    estimated_hours: undefined,
    tags: [],
    assignee_ids: [],
    ...initialData
  });

  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchPhases();
    fetchUsers();
  }, [projectId]);

  const fetchPhases = async () => {
    try {
      const response = await fetch(`/api/projects/phases?project_id=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setPhases(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch phases:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/qms/users-by-role');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = '/api/projects/tasks';
      const method = taskId ? 'PUT' : 'POST';
      const body = taskId
        ? { id: taskId, ...formData }
        : { project_id: projectId, ...formData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
      } else {
        setError(data.error || 'Failed to save task');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    handleChange('tags', formData.tags?.filter(t => t !== tag) || []);
  };

  const toggleAssignee = (userId: number) => {
    const current = formData.assignee_ids || [];
    if (current.includes(userId)) {
      handleChange('assignee_ids', current.filter(id => id !== userId));
    } else {
      handleChange('assignee_ids', [...current, userId]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Task Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter task title"
          required
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe the task..."
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Phase Selection */}
      {phases.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Phase
          </label>
          <select
            value={formData.phase_id || ''}
            onChange={(e) => handleChange('phase_id', e.target.value || undefined)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">No Phase</option>
            {phases.map(phase => (
              <option key={phase.id} value={phase.id}>{phase.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status, Priority, Type */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Type
          </label>
          <select
            value={formData.task_type}
            onChange={(e) => handleChange('task_type', e.target.value as TaskType)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          >
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="documentation">Documentation</option>
          </select>
        </div>
      </div>

      {/* Dates and Estimated Hours */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            value={formData.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Due Date
          </label>
          <input
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => handleChange('due_date', e.target.value)}
            min={formData.start_date || undefined}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Est. Hours
          </label>
          <input
            type="number"
            value={formData.estimated_hours || ''}
            onChange={(e) => handleChange('estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0"
            min="0"
            step="0.5"
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Assignees */}
      {users.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Assign To
          </label>
          <div className="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-h-32 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleAssignee(user.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  formData.assignee_ids?.includes(user.id)
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Tags
        </label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {formData.tags?.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-brand-900"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            taskId ? 'Update Task' : 'Create Task'
          )}
        </Button>
      </div>
    </form>
  );
}
