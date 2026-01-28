"use client";
import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface ChangeRequest {
  id: number;
  code: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  impact: string;
  project_name: string;
  requested_by: string;
  requested_date: string;
  target_date: string | null;
}

interface Project {
  id: number;
  name: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  implemented: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-600',
};

const impactColors: Record<string, string> = {
  minimal: 'text-green-600',
  moderate: 'text-yellow-600',
  significant: 'text-orange-600',
  major: 'text-red-600',
};

export default function ChangeRequestsPage() {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [newChange, setNewChange] = useState({
    project_id: '',
    title: '',
    description: '',
    type: 'enhancement',
    priority: 'medium',
    impact: 'moderate',
    target_date: ''
  });

  useEffect(() => {
    loadChangeRequests();
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setProjects(result.data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadChangeRequests = async () => {
    try {
      setLoading(true);
      // Mock data for now
      const mockChanges: ChangeRequest[] = [
        { 
          id: 1, 
          code: 'CR-001', 
          title: 'Add two-factor authentication', 
          description: 'Implement 2FA for enhanced security',
          type: 'enhancement',
          priority: 'high',
          status: 'approved',
          impact: 'moderate',
          project_name: 'Website Redesign',
          requested_by: 'Security Team',
          requested_date: '2026-01-20',
          target_date: '2026-02-15'
        },
        { 
          id: 2, 
          code: 'CR-002', 
          title: 'Extend project deadline by 2 weeks', 
          description: 'Due to additional scope requirements',
          type: 'schedule',
          priority: 'medium',
          status: 'under_review',
          impact: 'significant',
          project_name: 'Mobile App',
          requested_by: 'Project Manager',
          requested_date: '2026-01-22',
          target_date: null
        },
        { 
          id: 3, 
          code: 'CR-003', 
          title: 'Replace payment gateway provider', 
          description: 'Switch from Stripe to PayPal',
          type: 'technical',
          priority: 'critical',
          status: 'submitted',
          impact: 'major',
          project_name: 'E-commerce Platform',
          requested_by: 'Finance Team',
          requested_date: '2026-01-25',
          target_date: null
        },
        { 
          id: 4, 
          code: 'CR-004', 
          title: 'Update branding colors', 
          description: 'Align with new corporate identity',
          type: 'scope',
          priority: 'low',
          status: 'implemented',
          impact: 'minimal',
          project_name: 'Website Redesign',
          requested_by: 'Marketing',
          requested_date: '2026-01-10',
          target_date: '2026-01-18'
        },
      ];
      
      const filtered = filter === 'all' 
        ? mockChanges 
        : mockChanges.filter(c => c.status === filter);
      
      setChanges(filtered);
    } catch (error) {
      console.error('Error loading change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const countByStatus = (status: string) => changes.filter(c => c.status === status).length;

  const handleCreateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChange.project_id || !newChange.title) return;
    
    setCreating(true);
    try {
      // For now, add to local state (would be API call in production)
      const newItem: ChangeRequest = {
        id: changes.length + 1,
        code: `CR-${String(changes.length + 1).padStart(3, '0')}`,
        title: newChange.title,
        description: newChange.description,
        type: newChange.type,
        priority: newChange.priority,
        status: 'submitted',
        impact: newChange.impact,
        project_name: projects.find(p => p.id === parseInt(newChange.project_id))?.name || 'Unknown',
        requested_by: 'Current User',
        requested_date: new Date().toISOString().split('T')[0],
        target_date: newChange.target_date || null
      };
      
      setChanges([newItem, ...changes]);
      setShowCreateModal(false);
      setNewChange({
        project_id: '',
        title: '',
        description: '',
        type: 'enhancement',
        priority: 'medium',
        impact: 'moderate',
        target_date: ''
      });
      alert('Change request created successfully!');
    } catch (error) {
      console.error('Error creating change request:', error);
      alert('Failed to create change request');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = (change: ChangeRequest) => {
    setChanges(changes.map(c => 
      c.id === change.id ? { ...c, status: 'approved' } : c
    ));
    alert(`Change request ${change.code} has been approved!`);
  };

  const handleReject = (change: ChangeRequest) => {
    if (confirm(`Are you sure you want to reject ${change.code}?`)) {
      setChanges(changes.map(c => 
        c.id === change.id ? { ...c, status: 'rejected' } : c
      ));
      alert(`Change request ${change.code} has been rejected.`);
    }
  };

  const handleView = (change: ChangeRequest) => {
    setSelectedChange(change);
    setShowViewModal(true);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Change Requests" />
      
      {/* Status Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {['draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'].map((status) => (
          <div 
            key={status}
            className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
              filter === status ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'
            }`}
            onClick={() => setFilter(filter === status ? 'all' : status)}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{status.replace('_', ' ')}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{countByStatus(status)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Change Requests
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track and manage project change requests
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Change Request
          </button>
        </div>

        {/* Change Request List */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : changes.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg className="mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No change requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {changes.map((change) => (
              <div 
                key={change.id} 
                className="rounded-xl border border-gray-200 p-4 hover:border-brand-200 hover:shadow-sm dark:border-gray-700 dark:hover:border-brand-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-brand-600">{change.code}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[change.status]}`}>
                        {change.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[change.priority]}`}>
                        {change.priority}
                      </span>
                    </div>
                    <h3 className="mt-1 text-lg font-medium text-gray-900 dark:text-white">{change.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{change.description}</p>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>📁 {change.project_name}</span>
                      <span>👤 {change.requested_by}</span>
                      <span>📅 {new Date(change.requested_date).toLocaleDateString()}</span>
                      <span className={impactColors[change.impact]}>Impact: {change.impact}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleView(change)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      View
                    </button>
                    {change.status === 'submitted' || change.status === 'under_review' ? (
                      <>
                        <button 
                          onClick={() => handleApprove(change)}
                          className="rounded-lg bg-green-500 px-3 py-1.5 text-sm text-white hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(change)}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Change Request Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Change Request</h3>
          <form onSubmit={handleCreateChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={newChange.project_id}
                onChange={(e) => setNewChange({ ...newChange, project_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={newChange.title}
                onChange={(e) => setNewChange({ ...newChange, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newChange.description}
                onChange={(e) => setNewChange({ ...newChange, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={newChange.type}
                  onChange={(e) => setNewChange({ ...newChange, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="enhancement">Enhancement</option>
                  <option value="scope">Scope Change</option>
                  <option value="schedule">Schedule Change</option>
                  <option value="technical">Technical Change</option>
                  <option value="budget">Budget Change</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={newChange.priority}
                  onChange={(e) => setNewChange({ ...newChange, priority: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact</label>
                <select
                  value={newChange.impact}
                  onChange={(e) => setNewChange({ ...newChange, impact: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="minimal">Minimal</option>
                  <option value="moderate">Moderate</option>
                  <option value="significant">Significant</option>
                  <option value="major">Major</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
                <input
                  type="date"
                  value={newChange.target_date}
                  onChange={(e) => setNewChange({ ...newChange, target_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View Change Request Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)}>
        {selectedChange && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg font-medium text-brand-600">{selectedChange.code}</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[selectedChange.status]}`}>
                {selectedChange.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{selectedChange.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedChange.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Project</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedChange.project_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested By</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedChange.requested_by}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedChange.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[selectedChange.priority]}`}>
                  {selectedChange.priority}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Impact</p>
                <p className={`font-medium ${impactColors[selectedChange.impact]}`}>{selectedChange.impact}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedChange.requested_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
              {(selectedChange.status === 'submitted' || selectedChange.status === 'under_review') && (
                <>
                  <Button 
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => { handleApprove(selectedChange); setShowViewModal(false); }}
                  >
                    Approve
                  </Button>
                  <Button 
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => { handleReject(selectedChange); setShowViewModal(false); }}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
