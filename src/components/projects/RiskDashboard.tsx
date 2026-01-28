"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProjectRisk } from '@/types/projects-enhanced';
import { Modal } from '@/components/ui/modal';

interface RiskDashboardProps {
  projectId: string;
  onRiskClick?: (risk: ProjectRisk) => void;
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' }
};

const statusLabels: Record<string, { label: string; color: string }> = {
  identified: { label: 'Identified', color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  analyzing: { label: 'Analyzing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  planned: { label: 'Response Planned', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  mitigated: { label: 'Mitigated', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  occurred: { label: 'Occurred', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
};

const categoryLabels: Record<string, string> = {
  technical: 'Technical',
  resource: 'Resource',
  schedule: 'Schedule',
  budget: 'Budget',
  scope: 'Scope',
  external: 'External',
  other: 'Other'
};

export default function RiskDashboard({ projectId, onRiskClick: _onRiskClick }: RiskDashboardProps) {
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ProjectRisk | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    category: 'technical',
    probability: 3,
    impact: 3,
    mitigation_strategy: '',
    contingency_plan: '',
    trigger_conditions: ''
  });

  const fetchRisks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);

      const response = await fetch(`/api/projects/risks?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRisks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch risks:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, filterStatus, filterSeverity]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const createRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          ...newRisk
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewRisk({
          title: '',
          description: '',
          category: 'technical',
          probability: 3,
          impact: 3,
          mitigation_strategy: '',
          contingency_plan: '',
          trigger_conditions: ''
        });
        fetchRisks();
      }
    } catch (err) {
      console.error('Failed to create risk:', err);
    }
  };

  const updateRiskStatus = async (riskId: string, status: string) => {
    try {
      await fetch('/api/projects/risks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: riskId, status })
      });
      fetchRisks();
    } catch (err) {
      console.error('Failed to update risk:', err);
    }
  };

  const deleteRisk = async (riskId: string) => {
    if (!confirm('Delete this risk?')) return;
    try {
      await fetch(`/api/projects/risks?id=${riskId}`, { method: 'DELETE' });
      fetchRisks();
    } catch (err) {
      console.error('Failed to delete risk:', err);
    }
  };

  const viewRiskDetails = async (risk: ProjectRisk) => {
    try {
      const response = await fetch(`/api/projects/risks?id=${risk.id}&include_history=true`);
      const data = await response.json();
      if (data.success) {
        setSelectedRisk(data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch risk details:', err);
    }
  };

  // Calculate risk statistics
  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    active: risks.filter(r => ['identified', 'analyzing', 'planned'].includes(r.status)).length,
    avgScore: risks.length > 0 
      ? Math.round(risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / risks.length * 10) / 10 
      : 0
  };

  // Build risk matrix data (5x5 grid)
  const riskMatrix = Array(5).fill(null).map(() => Array(5).fill(0).map(() => [] as ProjectRisk[]));
  risks.forEach(risk => {
    const probIndex = Math.min(Math.max(risk.probability - 1, 0), 4);
    const impactIndex = Math.min(Math.max(risk.impact - 1, 0), 4);
    riskMatrix[4 - probIndex][impactIndex].push(risk);
  });

  const getCellColor = (prob: number, impact: number): string => {
    const score = (5 - prob) * (impact + 1);
    if (score >= 15) return 'bg-red-200 dark:bg-red-900/50';
    if (score >= 10) return 'bg-orange-200 dark:bg-orange-900/50';
    if (score >= 5) return 'bg-yellow-200 dark:bg-yellow-900/50';
    return 'bg-green-200 dark:bg-green-900/50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Risk Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Risk
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Risks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">High</p>
          <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Score</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgScore}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Matrix */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Risk Matrix</h3>
          <div className="relative">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Probability →
            </div>
            <div className="ml-6">
              <div className="grid grid-cols-5 gap-1">
                {riskMatrix.map((row, probIdx) => (
                  row.map((cell, impactIdx) => (
                    <div
                      key={`${probIdx}-${impactIdx}`}
                      className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${getCellColor(probIdx, impactIdx)} ${
                        cell.length > 0 ? 'cursor-pointer hover:ring-2 ring-brand-500' : ''
                      }`}
                      title={cell.length > 0 ? cell.map(r => r.title).join(', ') : undefined}
                    >
                      {cell.length > 0 && (
                        <span className="text-gray-700 dark:text-gray-200">{cell.length}</span>
                      )}
                    </div>
                  ))
                ))}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Impact →
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50"></div>
              <span className="text-gray-600 dark:text-gray-400">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/50"></div>
              <span className="text-gray-600 dark:text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/50"></div>
              <span className="text-gray-600 dark:text-gray-400">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50"></div>
              <span className="text-gray-600 dark:text-gray-400">Critical</span>
            </div>
          </div>
        </div>

        {/* Risk List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Risk Register</h3>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
              >
                <option value="">All Status</option>
                {Object.entries(statusLabels).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
              >
                <option value="">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {risks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No risks found. Add a risk to start tracking.
              </div>
            ) : (
              risks.map(risk => (
                <div
                  key={risk.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group"
                  onClick={() => viewRiskDetails(risk)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[risk.severity]?.bg} ${severityColors[risk.severity]?.text}`}>
                          {risk.severity.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusLabels[risk.status]?.color}`}>
                          {statusLabels[risk.status]?.label}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">{risk.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {risk.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{categoryLabels[risk.category]}</span>
                        <span>Score: {risk.probability * risk.impact}</span>
                        {risk.owner_name && <span>Owner: {risk.owner_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRisk(risk.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Risk Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Risk</h2>
          <form onSubmit={createRisk} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Title *
              </label>
              <input
                type="text"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={newRisk.category}
                  onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Probability (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newRisk.probability}
                  onChange={(e) => setNewRisk({ ...newRisk, probability: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Impact (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newRisk.impact}
                  onChange={(e) => setNewRisk({ ...newRisk, impact: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mitigation Strategy
              </label>
              <textarea
                value={newRisk.mitigation_strategy}
                onChange={(e) => setNewRisk({ ...newRisk, mitigation_strategy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contingency Plan
              </label>
              <textarea
                value={newRisk.contingency_plan}
                onChange={(e) => setNewRisk({ ...newRisk, contingency_plan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                Add Risk
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Risk Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} className="max-w-2xl">
        {selectedRisk && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[selectedRisk.severity]?.bg} ${severityColors[selectedRisk.severity]?.text}`}>
                    {selectedRisk.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusLabels[selectedRisk.status]?.color}`}>
                    {statusLabels[selectedRisk.status]?.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedRisk.title}</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Probability</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRisk.probability}/5</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Impact</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRisk.impact}/5</p>
              </div>
            </div>

            {selectedRisk.description && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Description</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedRisk.description}</p>
              </div>
            )}

            {selectedRisk.mitigation_plan && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Mitigation Strategy</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedRisk.mitigation_plan}</p>
              </div>
            )}

            {selectedRisk.contingency_plan && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Contingency Plan</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedRisk.contingency_plan}</p>
              </div>
            )}

            {/* History */}
            {selectedRisk.history && selectedRisk.history.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">History</h4>
                <div className="space-y-2">
                  {selectedRisk.history.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">
                        {new Date(h.changed_at).toLocaleString()}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{h.field_changed}</span> changed
                        {h.old_value && <> from <span className="text-gray-500">{h.old_value}</span></>}
                        {h.new_value && <> to <span className="text-gray-900 dark:text-white">{h.new_value}</span></>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusLabels).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => {
                      updateRiskStatus(selectedRisk.id, key);
                      setShowDetailModal(false);
                    }}
                    disabled={selectedRisk.status === key}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedRisk.status === key
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
