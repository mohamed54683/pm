"use client";

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';

interface Project {
  id: number;
  name: string;
}

interface CRFormProps {
  initialData?: any;
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

export default function CRForm({ initialData, onSuccess, onCancel }: CRFormProps) {
  const isEdit = !!initialData?.id;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [formData, setFormData] = useState({
    project_id: initialData?.project_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    justification: initialData?.justification || '',
    category: initialData?.category || 'scope',
    current_state: initialData?.current_state || '',
    proposed_change: initialData?.proposed_change || '',
    benefits: initialData?.benefits || '',
    scope_impact: initialData?.scope_impact || '',
    schedule_impact_days: initialData?.schedule_impact_days || '',
    cost_impact: initialData?.cost_impact || '',
    risk_impact: initialData?.risk_impact || '',
    quality_impact: initialData?.quality_impact || '',
    resource_impact: initialData?.resource_impact || '',
    priority: initialData?.priority || 'medium',
    impact_level: initialData?.impact_level || 'moderate',
    urgency: initialData?.urgency || 'normal',
    target_decision_date: initialData?.target_decision_date || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitAsDraft, setSubmitAsDraft] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects?limit=100');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/change-requests/${initialData.id}` : '/api/change-requests';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          submit: !submitAsDraft
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.data);
      } else {
        setErrors({ form: result.error || 'Failed to save change request' });
      }
    } catch (error: any) {
      setErrors({ form: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.form && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {errors.form}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => handleChange('project_id', e.target.value)}
                disabled={loadingProjects}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 ${
                  errors.project_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">{loadingProjects ? 'Loading projects...' : 'Select Project'}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.project_id && <p className="mt-1 text-sm text-red-500">{errors.project_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="scope">📐 Scope Change</option>
                <option value="schedule">📅 Schedule Change</option>
                <option value="cost">💰 Cost Change</option>
                <option value="quality">✨ Quality Change</option>
                <option value="resource">👥 Resource Change</option>
                <option value="risk">⚠️ Risk Related</option>
                <option value="other">📋 Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief title for the change request"
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detailed description of the proposed change"
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Justification
            </label>
            <textarea
              value={formData.justification}
              onChange={(e) => handleChange('justification', e.target.value)}
              placeholder="Why is this change needed?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Change Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            Change Details
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current State
            </label>
            <textarea
              value={formData.current_state}
              onChange={(e) => handleChange('current_state', e.target.value)}
              placeholder="Describe the current situation before the change"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Proposed Change
            </label>
            <textarea
              value={formData.proposed_change}
              onChange={(e) => handleChange('proposed_change', e.target.value)}
              placeholder="Describe the proposed changes in detail"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Benefits
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              placeholder="What are the expected benefits of this change?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Impact Assessment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            Impact Assessment
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Impact Level
              </label>
              <select
                value={formData.impact_level}
                onChange={(e) => handleChange('impact_level', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="minimal">Minimal</option>
                <option value="moderate">Moderate</option>
                <option value="significant">Significant</option>
                <option value="major">Major</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => handleChange('urgency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="immediate">Immediate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schedule Impact (Days)
              </label>
              <input
                type="number"
                value={formData.schedule_impact_days}
                onChange={(e) => handleChange('schedule_impact_days', e.target.value)}
                placeholder="e.g., 5 or -3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Impact ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_impact}
                onChange={(e) => handleChange('cost_impact', e.target.value)}
                placeholder="e.g., 5000 or -2000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Decision Date
            </label>
            <input
              type="date"
              value={formData.target_decision_date}
              onChange={(e) => handleChange('target_decision_date', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Submit Options */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={submitAsDraft}
              onChange={(e) => setSubmitAsDraft(e.target.checked)}
              className="w-4 h-4 text-brand-500 rounded focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Save as draft</span>
          </label>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : submitAsDraft ? 'Save Draft' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
