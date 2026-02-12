"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProjectPhase } from '@/types/projects';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import PhaseForm from './PhaseForm';

interface PhaseListProps {
  projectId: string;
  onRefresh?: () => void;
}

const statusColors: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
};

export default function PhaseList({ projectId, onRefresh }: PhaseListProps) {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const fetchPhases = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/phases?project_id=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setPhases(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPhases();
  }, [fetchPhases]);

  const handleDelete = async (phaseId: string) => {
    if (!confirm('Are you sure you want to delete this phase? All tasks in this phase will be unassigned.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/phases?id=${phaseId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchPhases();
        onRefresh?.();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReorder = async (phaseId: string, direction: 'up' | 'down') => {
    const currentIndex = phases.findIndex(p => p.id === phaseId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === phases.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newPhases = [...phases];
    [newPhases[currentIndex], newPhases[newIndex]] = [newPhases[newIndex], newPhases[currentIndex]];

    // Update order values
    const updates = newPhases.map((phase, index) => ({
      id: phase.id,
      order_index: index
    }));

    try {
      // Update each phase order
      for (const update of updates) {
        await fetch('/api/projects/phases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: update.id,
            order_index: update.order_index
          })
        });
      }
      fetchPhases();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="card-title">
          Phases ({phases.length})
        </h3>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Phase
        </Button>
      </div>

      {phases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No phases yet</h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Organize your project into phases to track progress better
          </p>
          <Button onClick={() => setShowCreateModal(true)}>Create First Phase</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              >
                {/* Expand Icon */}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedPhase === phase.id ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* Color Bar */}
                <div
                  className="w-1 h-10 rounded-full"
                  style={{ backgroundColor: phase.color || '#6366f1' }}
                />

                {/* Phase Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{phase.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[phase.status]}`}>
                      {phase.status.replace('_', ' ')}
                    </span>
                  </div>
                  {phase.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{phase.description}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {phase.task_count || 0} tasks
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${phase.progress_percentage || 0}%`,
                            backgroundColor: phase.color || '#6366f1'
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(phase.progress_percentage || 0)}%
                      </span>
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleReorder(phase.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReorder(phase.id, 'down')}
                      disabled={index === phases.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingPhase(phase)}
                      className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedPhase === phase.id && (
                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Start Date</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {phase.start_date ? new Date(phase.start_date).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">End Date</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {phase.end_date ? new Date(phase.end_date).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Budget</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {phase.budget ? `$${phase.budget.toLocaleString()}` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Tasks Complete</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {phase.completed_task_count || 0} / {phase.task_count || 0}
                      </div>
                    </div>
                  </div>

                  {/* Dependencies */}
                  {phase.dependencies && phase.dependencies.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Dependencies</div>
                      <div className="flex flex-wrap gap-2">
                        {phase.dependencies.map((dep, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-sm"
                          >
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                            </svg>
                            {phases.find(p => p.id === dep.depends_on_phase_id)?.name || 'Unknown phase'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Phase Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create Phase</h2>
          <PhaseForm
            projectId={projectId}
            existingPhases={phases}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchPhases();
              onRefresh?.();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </div>
      </Modal>

      {/* Edit Phase Modal */}
      <Modal isOpen={!!editingPhase} onClose={() => setEditingPhase(null)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Phase</h2>
          {editingPhase && (
            <PhaseForm
              projectId={projectId}
              phaseId={editingPhase.id}
              initialData={{
                name: editingPhase.name,
                description: editingPhase.description,
                status: editingPhase.status,
                start_date: editingPhase.start_date,
                end_date: editingPhase.end_date,
                budget: editingPhase.budget,
                color: editingPhase.color
              }}
              existingPhases={phases.filter(p => p.id !== editingPhase.id)}
              onSuccess={() => {
                setEditingPhase(null);
                fetchPhases();
                onRefresh?.();
              }}
              onCancel={() => setEditingPhase(null)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
