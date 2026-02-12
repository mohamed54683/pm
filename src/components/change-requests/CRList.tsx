"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import CRForm from './CRForm';

interface ChangeRequest {
  id: number;
  uuid: string;
  change_key: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  impact_level: string;
  status: string;
  project_id: number;
  project_name: string;
  requested_by: number;
  requester_name: string;
  submitted_date: string;
  target_decision_date: string;
  created_at: string;
  attachment_count: number;
  comment_count: number;
}

interface Project {
  id: number;
  name: string;
}

const statusColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-300' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-400' },
  impact_analysis: { bg: 'bg-indigo-100', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400' },
  pending_approval: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400' },
  implemented: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-400' },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-500', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-500' },
};

const priorityColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  low: { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-300' },
};

const impactColors: Record<string, string> = {
  minimal: 'text-green-600 dark:text-green-400',
  moderate: 'text-yellow-600 dark:text-yellow-400',
  significant: 'text-orange-600 dark:text-orange-400',
  major: 'text-red-600 dark:text-red-400',
};

const categoryIcons: Record<string, string> = {
  scope: '📐',
  schedule: '📅',
  cost: '💰',
  quality: '✨',
  resource: '👥',
  risk: '⚠️',
  other: '📋',
};

interface CRListProps {
  onViewCR?: (cr: ChangeRequest) => void;
}

export default function CRList({ onViewCR }: CRListProps) {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [myRequestsOnly, setMyRequestsOnly] = useState(false);
  const [pendingApprovalOnly, setPendingApprovalOnly] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchChangeRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (projectFilter) params.append('project_id', projectFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (myRequestsOnly) params.append('my_requests', 'true');
      if (pendingApprovalOnly) params.append('pending_approval', 'true');

      const response = await fetch(`/api/change-requests?${params.toString()}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setChangeRequests(result.data);
        setTotalPages(result.pagination.total_pages);
        setTotal(result.pagination.total);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, projectFilter, searchQuery, myRequestsOnly, pendingApprovalOnly]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects?limit=100', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setProjects(result.data || []);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchChangeRequests();
  }, [fetchChangeRequests]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchChangeRequests();
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setProjectFilter('');
    setSearchQuery('');
    setMyRequestsOnly(false);
    setPendingApprovalOnly(false);
    setPage(1);
  };

  const hasFilters = statusFilter || priorityFilter || categoryFilter || projectFilter || searchQuery || myRequestsOnly || pendingApprovalOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Change Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} total request{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Change Request
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by ID, title, or description..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="implemented">Implemented</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="scope">Scope</option>
            <option value="schedule">Schedule</option>
            <option value="cost">Cost</option>
            <option value="quality">Quality</option>
            <option value="resource">Resource</option>
            <option value="risk">Risk</option>
            <option value="other">Other</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={myRequestsOnly}
              onChange={(e) => { setMyRequestsOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 text-brand-500 rounded focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">My Requests Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pendingApprovalOnly}
              onChange={(e) => { setPendingApprovalOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 text-brand-500 rounded focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Pending My Approval</span>
          </label>
          
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-brand-500 hover:text-brand-600 ml-auto"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : changeRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No change requests found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {hasFilters ? 'Try adjusting your filters' : 'Create your first change request to get started'}
          </p>
          {!hasFilters && (
            <Button onClick={() => setShowCreateModal(true)}>Create Change Request</Button>
          )}
        </div>
      ) : (
        <>
          {/* Change Requests List */}
          <div className="space-y-4">
            {changeRequests.map((cr) => {
              const statusStyle = statusColors[cr.status] || statusColors.draft;
              const priorityStyle = priorityColors[cr.priority] || priorityColors.medium;
              
              return (
                <div
                  key={cr.id}
                  onClick={() => onViewCR?.(cr)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{cr.change_key}</span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.darkBg} ${statusStyle.darkText}`}>
                          {cr.status.replace(/_/g, ' ')}
                        </span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.darkBg} ${priorityStyle.darkText}`}>
                          {cr.priority}
                        </span>
                        {cr.category && (
                          <span className="text-sm">
                            {categoryIcons[cr.category] || '📋'} {cr.category}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{cr.title}</h3>
                      
                      {/* Description */}
                      {cr.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{cr.description}</p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <span>📁</span> {cr.project_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>👤</span> {cr.requester_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>📅</span> {new Date(cr.created_at).toLocaleDateString()}
                        </span>
                        {cr.impact_level && (
                          <span className={`flex items-center gap-1 ${impactColors[cr.impact_level]}`}>
                            <span>📊</span> {cr.impact_level} impact
                          </span>
                        )}
                        {cr.attachment_count > 0 && (
                          <span className="flex items-center gap-1">
                            <span>📎</span> {cr.attachment_count}
                          </span>
                        )}
                        {cr.comment_count > 0 && (
                          <span className="flex items-center gap-1">
                            <span>💬</span> {cr.comment_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewCR?.(cr); }}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-3xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">New Change Request</h2>
          <CRForm 
            projects={projects}
            onSuccess={handleCreateSuccess} 
            onCancel={() => setShowCreateModal(false)} 
          />
        </div>
      </Modal>
    </div>
  );
}
