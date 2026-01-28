"use client";

import React, { useState, useEffect } from 'react';
import { ProjectFormData, ProjectTemplate, ProjectStatus, ProjectPriority } from '@/types/projects';
import Button from '@/components/ui/button/Button';

interface ProjectFormProps {
  initialData?: ProjectFormData;
  projectId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function ProjectForm({ initialData, projectId, onSuccess, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'draft',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: undefined,
    color: '#3B82F6',
    tags: [],
    template_id: undefined,
    ...initialData
  });

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/projects/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = projectId ? '/api/projects' : '/api/projects';
      const method = projectId ? 'PUT' : 'POST';
      const body = projectId ? { id: projectId, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
      } else {
        setError(data.error || 'Failed to save project');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      handleChange('template_id', templateId);
      if (!formData.name) {
        handleChange('name', `${template.name} Project`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Template Selection (only for new projects) */}
      {!projectId && templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start from Template (Optional)
          </label>
          <select
            value={formData.template_id || ''}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Blank Project</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.estimated_duration_days} days
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter project name"
          required
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe your project..."
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Status and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as ProjectStatus)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value as ProjectPriority)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={formData.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={formData.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value)}
            min={formData.start_date || undefined}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Budget
        </label>
        <div className="relative">
          <span className="absolute left-4 top-2.5 text-gray-500">$</span>
          <input
            type="number"
            value={formData.budget || ''}
            onChange={(e) => handleChange('budget', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Color
        </label>
        <div className="flex gap-2 flex-wrap">
          {colorOptions.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => handleChange('color', color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                formData.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {formData.tags?.map(tag => (
            <span 
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-brand-900 dark:hover:text-brand-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <Button type="button" variant="outline" onClick={addTag}>
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
            projectId ? 'Update Project' : 'Create Project'
          )}
        </Button>
      </div>
    </form>
  );
}
