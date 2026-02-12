"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageBreadCrumb from '@/components/common/PageBreadCrumb';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { ProjectTemplate } from '@/types/projects';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
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
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/projects/templates?id=${templateId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchTemplates();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (template: ProjectTemplate) => {
    try {
      const response = await fetch('/api/projects/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          is_active: !template.is_active
        })
      });
      const data = await response.json();

      if (data.success) {
        fetchTemplates();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6">
      <PageBreadCrumb pageTitle="Project Templates" />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="card-title text-xl">Templates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create and manage project templates for quick project setup
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No templates yet</h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first template to speed up project creation
            </p>
            <Button onClick={() => setShowCreateModal(true)}>Create First Template</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className={`rounded-xl border p-5 transition-all ${
                  template.is_active
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: template.default_color || '#6366f1' }}
                  >
                    {template.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {template.category && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {template.category}
                    </span>
                  )}
                  {template.default_phases && Array.isArray(template.default_phases) && (
                    <span className="px-2 py-0.5 text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded">
                      {template.default_phases.length} phases
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.is_active}
                      onChange={() => handleToggleActive(template)}
                      className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                  </label>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create Template</h2>
          <TemplateForm
            onSuccess={() => {
              setShowCreateModal(false);
              fetchTemplates();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </div>
      </Modal>

      {/* Edit Template Modal */}
      <Modal isOpen={!!editingTemplate} onClose={() => setEditingTemplate(null)} className="max-w-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Template</h2>
          {editingTemplate && (
            <TemplateForm
              templateId={editingTemplate.id}
              initialData={{
                name: editingTemplate.name,
                description: editingTemplate.description || '',
                category: editingTemplate.category || '',
                default_color: editingTemplate.default_color || '#6366f1',
                default_phases: editingTemplate.default_phases || [],
                is_active: editingTemplate.is_active
              }}
              onSuccess={() => {
                setEditingTemplate(null);
                fetchTemplates();
              }}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

// Template Form Component
interface TemplateFormProps {
  templateId?: string;
  initialData?: {
    name: string;
    description: string;
    category: string;
    default_color: string;
    default_phases: any[];
    is_active: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const colorOptions = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b'
];

function TemplateForm({ templateId, initialData, onSuccess, onCancel }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    default_color: initialData?.default_color || '#6366f1',
    is_active: initialData?.is_active ?? true
  });
  const [phases, setPhases] = useState<{ name: string; color: string }[]>(
    initialData?.default_phases || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addPhase = () => {
    setPhases(prev => [...prev, { name: '', color: '#6366f1' }]);
  };

  const updatePhase = (index: number, field: string, value: string) => {
    setPhases(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePhase = (index: number) => {
    setPhases(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = '/api/projects/templates';
      const method = templateId ? 'PUT' : 'POST';
      const body = {
        ...(templateId && { id: templateId }),
        ...formData,
        default_phases: phases.filter(p => p.name.trim())
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Template Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g., Software Development"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Category
          </label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g., Development, Marketing"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          placeholder="Brief description of this template..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Default Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, default_color: color }))}
              className={`w-8 h-8 rounded-lg transition-transform ${
                formData.default_color === color ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Default Phases
          </label>
          <Button type="button" size="sm" variant="outline" onClick={addPhase}>
            Add Phase
          </Button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {phases.map((phase, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={phase.name}
                onChange={(e) => updatePhase(index, 'name', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="Phase name"
              />
              <input
                type="color"
                value={phase.color}
                onChange={(e) => updatePhase(index, 'color', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
              />
              <button
                type="button"
                onClick={() => removePhase(index)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {phases.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No phases defined. Click &quot;Add Phase&quot; to create default phases.
            </p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Active (available for new projects)</span>
      </label>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}
