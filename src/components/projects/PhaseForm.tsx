"use client";

import React, { useState } from 'react';
import { ProjectPhase, PhaseFormData } from '@/types/projects';
import Button from '@/components/ui/button/Button';

interface PhaseFormProps {
  projectId: string;
  phaseId?: string;
  initialData?: Partial<PhaseFormData>;
  existingPhases?: ProjectPhase[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const colorOptions = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b'
];

export default function PhaseForm({
  projectId,
  phaseId,
  initialData,
  existingPhases = [],
  onSuccess,
  onCancel
}: PhaseFormProps) {
  const [formData, setFormData] = useState<PhaseFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'not_started',
    start_date: initialData?.start_date || undefined,
    end_date: initialData?.end_date || undefined,
    budget: initialData?.budget || undefined,
    color: initialData?.color || '#6366f1'
  });
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value || undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Phase name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = '/api/projects/phases';
      const method = phaseId ? 'PUT' : 'POST';
      const body = phaseId
        ? { id: phaseId, ...formData }
        : { project_id: projectId, ...formData, dependency_ids: selectedDependencies };

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

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Phase Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="e.g., Planning, Development, Testing"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          placeholder="Brief description of this phase..."
        />
      </div>

      {/* Status & Color */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Color
          </label>
          <div className="flex flex-wrap gap-1">
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-6 h-6 rounded-md transition-transform ${
                  formData.color === color ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date ? formData.start_date.split('T')[0] : ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            End Date
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date ? formData.end_date.split('T')[0] : ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Budget
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
          <input
            type="number"
            name="budget"
            value={formData.budget || ''}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Dependencies (only for new phases) */}
      {!phaseId && existingPhases.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Depends On
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            This phase cannot start until selected phases are completed
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {existingPhases.map(phase => (
              <label
                key={phase.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDependencies.includes(phase.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDependencies(prev => [...prev, phase.id]);
                    } else {
                      setSelectedDependencies(prev => prev.filter(id => id !== phase.id));
                    }
                  }}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: phase.color || '#6366f1' }}
                />
                <span className="text-sm text-gray-900 dark:text-white">{phase.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : phaseId ? 'Update Phase' : 'Create Phase'}
        </Button>
      </div>
    </form>
  );
}
