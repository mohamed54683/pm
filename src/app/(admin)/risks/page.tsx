"use client";
import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";

// Types
interface Project {
  id: number;
  name: string;
  code: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Risk {
  id: number;
  uuid: string;
  risk_key: string;
  title: string;
  description: string;
  category: string;
  source: string;
  probability: string;
  probability_score: number;
  impact: string;
  impact_score: number;
  risk_score: number;
  risk_level: string;
  priority: string;
  status: string;
  response_strategy: string;
  mitigation_plan: string;
  contingency_plan: string;
  trigger_conditions: string;
  owner_id: number;
  owner_name: string;
  backup_owner_id: number;
  backup_owner_name: string;
  project_id: number;
  project_name: string;
  project_code: string;
  identified_date: string;
  due_date: string;
  next_review_date: string;
  last_review_date: string;
  review_frequency: string;
  review_status: string;
  action_count: number;
  completed_action_count: number;
  attachment_count: number;
  created_at: string;
}

interface MitigationAction {
  id: number;
  action_description: string;
  responsible_id: number;
  responsible_name: string;
  target_date: string;
  completion_date: string;
  status: string;
  notes: string;
}

interface Review {
  id: number;
  reviewer_name: string;
  review_date: string;
  assessment: string;
  recommendations: string;
  next_steps: string;
  previous_score: number;
  current_score: number;
}

interface DashboardData {
  summary: {
    total_risks: number;
    open_risks: number;
    closed_risks: number;
    critical_open: number;
    high_open: number;
    medium_open: number;
    low_open: number;
    escalated: number;
    overdue_reviews: number;
    reviews_due_this_week: number;
    avg_open_risk_score: number;
  };
  matrix: Record<string, Record<string, { count: number; risks: string[] }>>;
  topRisks: Risk[];
  attentionNeeded: (Risk & { attention_reason: string })[];
  statusDistribution: { status: string; count: number }[];
  categoryDistribution: { category: string; count: number; open_count: number }[];
  mitigationProgress: {
    total_actions: number;
    completed_actions: number;
    in_progress_actions: number;
    pending_actions: number;
    overdue_actions: number;
  };
}

type ViewMode = 'dashboard' | 'list' | 'detail' | 'new';

// Color mappings
const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
};

const statusColors: Record<string, string> = {
  identified: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  analyzed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  mitigation_planned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  mitigated: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  escalated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const actionStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// Heat map cell color based on score
function getHeatMapColor(prob: number, impact: number): string {
  const score = prob * impact;
  if (score >= 20) return 'bg-red-500';
  if (score >= 15) return 'bg-red-400';
  if (score >= 12) return 'bg-orange-400';
  if (score >= 9) return 'bg-orange-300';
  if (score >= 6) return 'bg-yellow-300';
  if (score >= 4) return 'bg-yellow-200';
  return 'bg-green-200';
}

const probLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const impactLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const probKeys = ['very_low', 'low', 'medium', 'high', 'very_high'];

export default function RisksPage() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [risks, setRisks] = useState<Risk[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [riskDetails, setRiskDetails] = useState<{
    mitigation_actions: MitigationAction[];
    reviews: Review[];
    activity: { action: string; description: string; user_name: string; created_at: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ status: '', priority: '', project_id: '', search: '' });
  
  // Form state for new risk
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    category: 'technical',
    source: '',
    probability: 'medium',
    impact: 'medium',
    priority: 'medium',
    response_strategy: 'mitigate',
    mitigation_plan: '',
    contingency_plan: '',
    trigger_conditions: '',
    owner_id: '',
    backup_owner_id: '',
    identified_date: new Date().toISOString().split('T')[0],
    due_date: '',
    review_frequency: 'monthly'
  });

  // Action form state
  const [newAction, setNewAction] = useState({
    action_description: '',
    responsible_id: '',
    target_date: '',
    notes: ''
  });
  const [showActionForm, setShowActionForm] = useState(false);

  // Review form state
  const [newReview, setNewReview] = useState({
    assessment: '',
    recommendations: '',
    next_steps: ''
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/risks/dashboard', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }, []);

  const loadRisks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.project_id) params.set('project_id', filter.project_id);
      if (filter.search) params.set('search', filter.search);

      const response = await fetch(`/api/risks?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setRisks(result.data);
      }
    } catch (error) {
      console.error('Error loading risks:', error);
    }
  }, [filter]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setProjects(result.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users?status=active', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setUsers(result.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRiskDetails = async (riskId: number) => {
    try {
      const response = await fetch(`/api/risks/${riskId}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setSelectedRisk(result.data);
        setRiskDetails({
          mitigation_actions: result.data.mitigation_actions || [],
          reviews: result.data.reviews || [],
          activity: result.data.activity || []
        });
      }
    } catch (error) {
      console.error('Error loading risk details:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadProjects(), loadUsers()]);
      await loadRisks();
      setLoading(false);
    };
    init();
  }, [loadDashboard, loadRisks]);

  useEffect(() => {
    if (view === 'list') loadRisks();
    if (view === 'dashboard') loadDashboard();
  }, [view, filter, loadRisks, loadDashboard]);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.title) {
      alert('Project and title are required');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          project_id: parseInt(formData.project_id),
          owner_id: formData.owner_id ? parseInt(formData.owner_id) : null,
          backup_owner_id: formData.backup_owner_id ? parseInt(formData.backup_owner_id) : null
        })
      });
      const result = await response.json();
      if (result.success) {
        setFormData({
          project_id: '', title: '', description: '', category: 'technical', source: '',
          probability: 'medium', impact: 'medium', priority: 'medium',
          response_strategy: 'mitigate', mitigation_plan: '', contingency_plan: '',
          trigger_conditions: '', owner_id: '', backup_owner_id: '',
          identified_date: new Date().toISOString().split('T')[0], due_date: '',
          review_frequency: 'monthly'
        });
        await loadRisks();
        await loadDashboard();
        setView('list');
      } else {
        alert(result.error || 'Failed to create risk');
      }
    } catch (error) {
      console.error('Error creating risk:', error);
      alert('Failed to create risk');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRisk = async (updates: Partial<Risk>) => {
    if (!selectedRisk) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/risks/${selectedRisk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (result.success) {
        await loadRiskDetails(selectedRisk.id);
        await loadRisks();
        await loadDashboard();
      } else {
        alert(result.error || 'Failed to update risk');
      }
    } catch (error) {
      console.error('Error updating risk:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRisk || !newAction.action_description) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/risks/${selectedRisk.id}/mitigation-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...newAction,
          responsible_id: newAction.responsible_id ? parseInt(newAction.responsible_id) : null
        })
      });
      const result = await response.json();
      if (result.success) {
        setNewAction({ action_description: '', responsible_id: '', target_date: '', notes: '' });
        setShowActionForm(false);
        await loadRiskDetails(selectedRisk.id);
      }
    } catch (error) {
      console.error('Error adding action:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAction = async (actionId: number, updates: Partial<MitigationAction>) => {
    if (!selectedRisk) return;
    try {
      await fetch(`/api/risks/${selectedRisk.id}/mitigation-actions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action_id: actionId, ...updates })
      });
      await loadRiskDetails(selectedRisk.id);
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRisk) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/risks/${selectedRisk.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newReview)
      });
      const result = await response.json();
      if (result.success) {
        setNewReview({ assessment: '', recommendations: '', next_steps: '' });
        setShowReviewForm(false);
        await loadRiskDetails(selectedRisk.id);
      }
    } catch (error) {
      console.error('Error adding review:', error);
    } finally {
      setSaving(false);
    }
  };

  const openRiskDetail = (risk: Risk) => {
    loadRiskDetails(risk.id);
    setView('detail');
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
            <h1 className="page-title">Risk Management</h1>
            <p className="page-subtitle">
              {view === 'dashboard' && 'Overview and analytics'}
              {view === 'list' && 'Risk register and tracking'}
              {view === 'detail' && selectedRisk?.risk_key}
              {view === 'new' && 'Create new risk'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {view !== 'dashboard' && (
              <Button variant="outline" onClick={() => setView('dashboard')}>
                Dashboard
              </Button>
            )}
            {view !== 'list' && view !== 'new' && (
              <Button variant="outline" onClick={() => setView('list')}>
                Risk Register
              </Button>
            )}
            {view !== 'new' && (
              <Button onClick={() => setView('new')}>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Risk
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Dashboard View */}
        {view === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 border-l-4 border-blue-500">
                <p className="page-subtitle">Total Risks</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{dashboard.summary.total_risks}</p>
                <p className="text-xs text-gray-400">{dashboard.summary.open_risks} open</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 border-l-4 border-red-500">
                <p className="page-subtitle">Critical</p>
                <p className="mt-1 text-3xl font-bold text-red-600">{dashboard.summary.critical_open}</p>
                <p className="text-xs text-gray-400">requires immediate attention</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 border-l-4 border-orange-500">
                <p className="page-subtitle">High Priority</p>
                <p className="mt-1 text-3xl font-bold text-orange-600">{dashboard.summary.high_open}</p>
                <p className="text-xs text-gray-400">needs action soon</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 border-l-4 border-amber-500">
                <p className="page-subtitle">Overdue Reviews</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">{dashboard.summary.overdue_reviews}</p>
                <p className="text-xs text-gray-400">{dashboard.summary.reviews_due_this_week} due this week</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 border-l-4 border-purple-500">
                <p className="page-subtitle">Escalated</p>
                <p className="mt-1 text-3xl font-bold text-purple-600">{dashboard.summary.escalated}</p>
                <p className="text-xs text-gray-400">awaiting resolution</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Risk Matrix Heat Map */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Matrix</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="p-2 text-xs text-gray-500 font-medium text-left">Impact →</th>
                        {impactLabels.map((label, i) => (
                          <th key={i} className="p-1 text-xs text-gray-500 font-medium text-center">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {probLabels.map((probLabel, pi) => (
                        <tr key={pi}>
                          <td className="p-2 text-xs text-gray-500 font-medium">{probLabel}</td>
                          {impactLabels.map((_, ii) => {
                            const probKey = probKeys[pi];
                            const impactKey = probKeys[ii];
                            const cell = dashboard.matrix?.[probKey]?.[impactKey] || { count: 0, risks: [] };
                            return (
                              <td key={ii} className="p-1">
                                <div 
                                  className={`h-12 w-full rounded flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${getHeatMapColor(pi + 1, ii + 1)}`}
                                  title={cell.risks.join('\n')}
                                >
                                  {cell.count > 0 && (
                                    <span className="font-bold text-gray-800">{cell.count}</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )).reverse()}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 text-center mt-2">↓ Probability</p>
                </div>
              </div>

              {/* Mitigation Progress */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mitigation Progress</h2>
                {dashboard.mitigationProgress && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Actions</span>
                      <span className="font-semibold">{dashboard.mitigationProgress.total_actions}</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${dashboard.mitigationProgress.total_actions > 0 ? (dashboard.mitigationProgress.completed_actions / dashboard.mitigationProgress.total_actions) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Completed: {dashboard.mitigationProgress.completed_actions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>In Progress: {dashboard.mitigationProgress.in_progress_actions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span>Pending: {dashboard.mitigationProgress.pending_actions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Overdue: {dashboard.mitigationProgress.overdue_actions}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attention Needed & Top Risks */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h2 className="card-title">⚠️ Needs Attention</h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                  {dashboard.attentionNeeded?.slice(0, 8).map((risk) => (
                    <div 
                      key={risk.id} 
                      className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => openRiskDetail(risk)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[risk.priority]}`}>
                            {risk.priority}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{risk.risk_key}</span>
                        </div>
                        <span className="text-xs text-red-500">{risk.attention_reason?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{risk.title}</p>
                    </div>
                  ))}
                  {(!dashboard.attentionNeeded || dashboard.attentionNeeded.length === 0) && (
                    <div className="px-6 py-8 text-center text-gray-500">No items need attention</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h2 className="card-title">🔥 Top Risks by Score</h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                  {dashboard.topRisks?.slice(0, 8).map((risk) => (
                    <div 
                      key={risk.id} 
                      className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => openRiskDetail(risk)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                            risk.risk_score >= 20 ? 'bg-red-100 text-red-700' :
                            risk.risk_score >= 12 ? 'bg-orange-100 text-orange-700' :
                            risk.risk_score >= 6 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {risk.risk_score}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{risk.risk_key}</p>
                            <p className="text-xs text-gray-500">{risk.project_name}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[risk.status]}`}>
                          {risk.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{risk.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
              <input
                type="text"
                placeholder="Search risks..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="identified">Identified</option>
                <option value="analyzed">Analyzed</option>
                <option value="mitigation_planned">Mitigation Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="mitigated">Mitigated</option>
                <option value="escalated">Escalated</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filter.project_id}
                onChange={(e) => setFilter({ ...filter, project_id: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Risk List */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {risks.map((risk) => (
                      <tr 
                        key={risk.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => openRiskDetail(risk)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">{risk.risk_key}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{risk.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{risk.category}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm ${
                            risk.risk_score >= 20 ? 'bg-red-100 text-red-700' :
                            risk.risk_score >= 12 ? 'bg-orange-100 text-orange-700' :
                            risk.risk_score >= 6 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {risk.risk_score}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[risk.priority]}`}>
                            {risk.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[risk.status]}`}>
                            {risk.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{risk.owner_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{risk.project_code}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-500">{risk.action_count || 0} / {risk.completed_action_count || 0}</span>
                        </td>
                      </tr>
                    ))}
                    {risks.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No risks found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Detail View */}
        {view === 'detail' && selectedRisk && (
          <div className="space-y-6">
            <button onClick={() => setView('list')} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
              ← Back to Risk Register
            </button>

            {/* Risk Header Card */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-lg font-bold text-blue-600">{selectedRisk.risk_key}</span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${priorityColors[selectedRisk.priority]}`}>
                      {selectedRisk.priority}
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[selectedRisk.status]}`}>
                      {selectedRisk.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="page-title">{selectedRisk.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{selectedRisk.description}</p>
                </div>
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold ${
                  selectedRisk.risk_score >= 20 ? 'bg-red-100 text-red-700' :
                  selectedRisk.risk_score >= 12 ? 'bg-orange-100 text-orange-700' :
                  selectedRisk.risk_score >= 6 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedRisk.risk_score}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Probability</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedRisk.probability?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Impact</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedRisk.impact?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Category</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedRisk.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Response Strategy</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedRisk.response_strategy}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Owner</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRisk.owner_name || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Backup Owner</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRisk.backup_owner_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Project</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRisk.project_code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRisk.due_date ? new Date(selectedRisk.due_date).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <select
                  value={selectedRisk.status}
                  onChange={(e) => handleUpdateRisk({ status: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  disabled={saving}
                >
                  <option value="identified">Identified</option>
                  <option value="analyzed">Analyzed</option>
                  <option value="mitigation_planned">Mitigation Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="mitigated">Mitigated</option>
                  <option value="escalated">Escalated</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={selectedRisk.priority}
                  onChange={(e) => handleUpdateRisk({ priority: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  disabled={saving}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Mitigation Plan */}
            {selectedRisk.mitigation_plan && (
              <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Mitigation Plan</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedRisk.mitigation_plan}</p>
              </div>
            )}

            {/* Mitigation Actions */}
            <div className="card">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700 flex items-center justify-between">
                <h3 className="card-title">Mitigation Actions</h3>
                <Button size="sm" onClick={() => setShowActionForm(!showActionForm)}>
                  {showActionForm ? 'Cancel' : '+ Add Action'}
                </Button>
              </div>
              
              {showActionForm && (
                <form onSubmit={handleAddAction} className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="form-label">Action Description *</label>
                      <textarea
                        value={newAction.action_description}
                        onChange={(e) => setNewAction({ ...newAction, action_description: e.target.value })}
                        required
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="form-label">Responsible Person</label>
                      <select
                        value={newAction.responsible_id}
                        onChange={(e) => setNewAction({ ...newAction, responsible_id: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">Select person</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Target Date</label>
                      <input
                        type="date"
                        value={newAction.target_date}
                        onChange={(e) => setNewAction({ ...newAction, target_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Action'}</Button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {riskDetails?.mitigation_actions?.map((action) => (
                  <div key={action.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white">{action.action_description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {action.responsible_name && <span>Assigned to: {action.responsible_name}</span>}
                          {action.target_date && <span>Due: {new Date(action.target_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <select
                        value={action.status}
                        onChange={(e) => handleUpdateAction(action.id, { status: e.target.value })}
                        className={`rounded-lg px-2 py-1 text-xs font-medium border-0 ${actionStatusColors[action.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
                {(!riskDetails?.mitigation_actions || riskDetails.mitigation_actions.length === 0) && (
                  <div className="px-6 py-8 text-center text-gray-500">No mitigation actions defined</div>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="card">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="card-title">Risk Reviews</h3>
                  {selectedRisk.next_review_date && (
                    <p className="text-xs text-gray-500">Next review: {new Date(selectedRisk.next_review_date).toLocaleDateString()}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                  {showReviewForm ? 'Cancel' : '+ Add Review'}
                </Button>
              </div>

              {showReviewForm && (
                <form onSubmit={handleAddReview} className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Assessment</label>
                      <textarea
                        value={newReview.assessment}
                        onChange={(e) => setNewReview({ ...newReview, assessment: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        placeholder="Current assessment of this risk..."
                      />
                    </div>
                    <div>
                      <label className="form-label">Recommendations</label>
                      <textarea
                        value={newReview.recommendations}
                        onChange={(e) => setNewReview({ ...newReview, recommendations: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="form-label">Next Steps</label>
                      <textarea
                        value={newReview.next_steps}
                        onChange={(e) => setNewReview({ ...newReview, next_steps: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Submit Review'}</Button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {riskDetails?.reviews?.map((review) => (
                  <div key={review.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{review.reviewer_name}</span>
                      <span className="text-xs text-gray-500">{new Date(review.review_date).toLocaleDateString()}</span>
                    </div>
                    {review.assessment && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{review.assessment}</p>}
                    {review.recommendations && (
                      <p className="text-xs text-gray-500"><span className="font-medium">Recommendations:</span> {review.recommendations}</p>
                    )}
                  </div>
                ))}
                {(!riskDetails?.reviews || riskDetails.reviews.length === 0) && (
                  <div className="px-6 py-8 text-center text-gray-500">No reviews yet</div>
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div className="card">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="card-title">Activity Log</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {riskDetails?.activity?.map((item, i) => (
                    <div key={i} className="px-6 py-3 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-gray-500">{item.user_name} · {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Risk Form */}
        {view === 'new' && (
          <div className="max-w-4xl mx-auto">
            <button onClick={() => setView('list')} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
              ← Back to Risk Register
            </button>

            <form onSubmit={handleCreateRisk} className="rounded-xl bg-white shadow-sm dark:bg-gray-800 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create New Risk</h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <div className="md:col-span-2">
                  <label className="form-label">Project *</label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select a project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="form-label">Risk Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    placeholder="Brief description of the risk"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    placeholder="Detailed description of the risk and its potential consequences"
                  />
                </div>

                {/* Risk Assessment */}
                <div>
                  <label className="form-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="technical">Technical</option>
                    <option value="schedule">Schedule</option>
                    <option value="cost">Cost</option>
                    <option value="resource">Resource</option>
                    <option value="external">External</option>
                    <option value="organizational">Organizational</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Probability</label>
                  <select
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="very_low">Very Low (1)</option>
                    <option value="low">Low (2)</option>
                    <option value="medium">Medium (3)</option>
                    <option value="high">High (4)</option>
                    <option value="very_high">Very High (5)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Impact</label>
                  <select
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="very_low">Very Low (1)</option>
                    <option value="low">Low (2)</option>
                    <option value="medium">Medium (3)</option>
                    <option value="high">High (4)</option>
                    <option value="very_high">Very High (5)</option>
                  </select>
                </div>

                {/* Response Strategy */}
                <div>
                  <label className="form-label">Response Strategy</label>
                  <select
                    value={formData.response_strategy}
                    onChange={(e) => setFormData({ ...formData, response_strategy: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="avoid">Avoid</option>
                    <option value="mitigate">Mitigate</option>
                    <option value="transfer">Transfer</option>
                    <option value="accept">Accept</option>
                    <option value="exploit">Exploit (Opportunity)</option>
                    <option value="share">Share</option>
                    <option value="enhance">Enhance</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Review Frequency</label>
                  <select
                    value={formData.review_frequency}
                    onChange={(e) => setFormData({ ...formData, review_frequency: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>

                {/* Mitigation */}
                <div className="md:col-span-2">
                  <label className="form-label">Mitigation Plan</label>
                  <textarea
                    value={formData.mitigation_plan}
                    onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    placeholder="Actions to reduce probability or impact"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="form-label">Contingency Plan</label>
                  <textarea
                    value={formData.contingency_plan}
                    onChange={(e) => setFormData({ ...formData, contingency_plan: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    placeholder="Fallback plan if risk occurs"
                  />
                </div>

                {/* Ownership */}
                <div>
                  <label className="form-label">Risk Owner</label>
                  <select
                    value={formData.owner_id}
                    onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select owner</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Backup Owner</label>
                  <select
                    value={formData.backup_owner_id}
                    onChange={(e) => setFormData({ ...formData, backup_owner_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select backup owner</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="form-label">Identified Date</label>
                  <input
                    type="date"
                    value={formData.identified_date}
                    onChange={(e) => setFormData({ ...formData, identified_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setView('list')}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Risk'}</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
