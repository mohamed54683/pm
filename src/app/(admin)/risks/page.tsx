"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Project {
  id: number;
  name: string;
  code: string;
}

interface Risk {
  id: number;
  uuid: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity: string;
  probability: number;
  impact: number;
  risk_score: number;
  mitigation_plan: string;
  project_code: string;
  project_name: string;
  owner_name: string;
  identified_date: string;
}

interface Stats {
  total: number;
  open_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mitigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  monitoring: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  occurred: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', severity: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRisk, setNewRisk] = useState({
    project_id: '',
    title: '',
    description: '',
    category: 'technical',
    severity: 'medium',
    probability: '3',
    impact: '3',
    mitigation_plan: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRisks();
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

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRisk.project_id || !newRisk.title) return;
    setCreating(true);
    try {
      const response = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: parseInt(newRisk.project_id),
          title: newRisk.title,
          description: newRisk.description,
          category: newRisk.category,
          severity: newRisk.severity,
          probability: parseInt(newRisk.probability),
          impact: parseInt(newRisk.impact),
          mitigation_plan: newRisk.mitigation_plan
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        setNewRisk({
          project_id: '',
          title: '',
          description: '',
          category: 'technical',
          severity: 'medium',
          probability: '3',
          impact: '3',
          mitigation_plan: ''
        });
        loadRisks();
      } else {
        alert(result.error || 'Failed to create risk');
      }
    } catch (error) {
      console.error('Error creating risk:', error);
      alert('Failed to create risk');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadRisks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.severity) params.set('severity', filter.severity);

      const response = await fetch(`/api/risks?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setRisks(result.data);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading risks:', error);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Register</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor and manage project risks
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Risk
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Risks</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">Open</p>
              <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{stats.open_count}</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4 shadow-sm dark:bg-orange-900/20">
              <p className="text-sm text-orange-600 dark:text-orange-400">Critical</p>
              <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.critical_count}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 shadow-sm dark:bg-amber-900/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">High</p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.high_count}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 shadow-sm dark:bg-blue-900/20">
              <p className="text-sm text-blue-600 dark:text-blue-400">Medium/Low</p>
              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.medium_count + stats.low_count}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="mitigating">Mitigating</option>
            <option value="monitoring">Monitoring</option>
            <option value="closed">Closed</option>
            <option value="occurred">Occurred</option>
          </select>
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Risk Matrix Visual */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Matrix</h2>
          <div className="grid grid-cols-6 gap-1 text-xs">
            {/* Y-axis label */}
            <div className="flex items-center justify-center font-medium text-gray-500">Impact</div>
            {/* Column headers */}
            {[1, 2, 3, 4, 5].map(p => (
              <div key={p} className="text-center font-medium text-gray-500">P{p}</div>
            ))}
            {/* Matrix rows */}
            {[5, 4, 3, 2, 1].map(impact => (
              <React.Fragment key={impact}>
                <div className="flex items-center justify-center font-medium text-gray-500">I{impact}</div>
                {[1, 2, 3, 4, 5].map(prob => {
                  const score = impact * prob;
                  const count = risks.filter(r => r.probability === prob && r.impact === impact).length;
                  let cellColor = 'bg-green-100';
                  if (score >= 15) cellColor = 'bg-red-200';
                  else if (score >= 10) cellColor = 'bg-orange-200';
                  else if (score >= 5) cellColor = 'bg-yellow-200';
                  
                  return (
                    <div
                      key={`${impact}-${prob}`}
                      className={`h-12 rounded flex items-center justify-center ${cellColor}`}
                    >
                      {count > 0 && (
                        <span className="font-bold text-gray-700">{count}</span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
            <div></div>
            <div className="col-span-5 text-center font-medium text-gray-500 mt-1">Probability</div>
          </div>
        </div>

        {/* Risk List */}
        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Register</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {risks.map((risk) => (
              <div key={risk.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start gap-4">
                  {/* Risk Score */}
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg font-bold text-lg ${
                    risk.risk_score >= 15 ? 'bg-red-100 text-red-700' :
                    risk.risk_score >= 10 ? 'bg-orange-100 text-orange-700' :
                    risk.risk_score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {risk.risk_score}
                  </div>

                  {/* Risk Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{risk.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[risk.severity]}`}>
                        {risk.severity}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[risk.status]}`}>
                        {risk.status}
                      </span>
                    </div>
                    {risk.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{risk.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{risk.project_code}</span>
                      <span>P:{risk.probability} × I:{risk.impact}</span>
                      {risk.owner_name && <span>Owner: {risk.owner_name}</span>}
                      <span>Identified: {new Date(risk.identified_date).toLocaleDateString()}</span>
                    </div>
                    {risk.mitigation_plan && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Mitigation:</span> {risk.mitigation_plan}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {risks.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">No risks found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Risk Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Risk</h2>
          <form onSubmit={handleCreateRisk} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={newRisk.project_id}
                onChange={(e) => setNewRisk({ ...newRisk, project_id: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Risk title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Describe the risk"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newRisk.category}
                  onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="technical">Technical</option>
                  <option value="schedule">Schedule</option>
                  <option value="cost">Cost</option>
                  <option value="resource">Resource</option>
                  <option value="external">External</option>
                  <option value="organizational">Organizational</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select
                  value={newRisk.severity}
                  onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Probability (1-5)</label>
                <select
                  value={newRisk.probability}
                  onChange={(e) => setNewRisk({ ...newRisk, probability: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="1">1 - Very Low</option>
                  <option value="2">2 - Low</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Very High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact (1-5)</label>
                <select
                  value={newRisk.impact}
                  onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="1">1 - Very Low</option>
                  <option value="2">2 - Low</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Very High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mitigation Plan</label>
              <textarea
                value={newRisk.mitigation_plan}
                onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Describe how to mitigate this risk"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newRisk.project_id || !newRisk.title}>
                {creating ? 'Creating...' : 'Add Risk'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
