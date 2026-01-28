"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Project {
  id: number;
  name: string;
  code: string;
}

interface Issue {
  id: number;
  uuid: string;
  issue_key: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  category: string;
  impact: string;
  resolution: string;
  resolution_date: string | null;
  due_date: string | null;
  reported_date: string;
  project_id: number;
  project_name: string;
  project_code: string;
  owner_id: number;
  owner_first_name: string;
  owner_last_name: string;
  reporter_id: number;
  reporter_first_name: string;
  reporter_last_name: string;
  related_task_id: number | null;
  task_title: string | null;
}

interface IssueStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-700',
  escalated: 'bg-purple-100 text-purple-700',
};

const severityColors: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-green-500 text-white',
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIssue, setNewIssue] = useState({
    project_id: '',
    title: '',
    description: '',
    severity: 'medium',
    category: 'bug',
    impact: 'minor'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadIssues();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status, filters.severity]);

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

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue.project_id || !newIssue.title) return;
    setCreating(true);
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: parseInt(newIssue.project_id),
          title: newIssue.title,
          description: newIssue.description,
          severity: newIssue.severity,
          category: newIssue.category,
          impact: newIssue.impact
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        setNewIssue({
          project_id: '',
          title: '',
          description: '',
          severity: 'medium',
          category: 'bug',
          impact: 'minor'
        });
        loadIssues();
      } else {
        alert(result.error || 'Failed to report issue');
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      alert('Failed to report issue');
    } finally {
      setCreating(false);
    }
  };

  const loadIssues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.search && { search: filters.search }),
      });
      
      const response = await fetch(`/api/issues?${params}`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setIssues(result.data);
        setStats(result.stats);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadIssues();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issue Tracker</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track and resolve project issues
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report Issue
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">Open</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.open}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 shadow-sm dark:bg-amber-900/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">In Progress</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.in_progress}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 shadow-sm dark:bg-blue-900/20">
              <p className="text-sm text-blue-600 dark:text-blue-400">Resolved</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.resolved}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">Critical</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.critical}</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4 shadow-sm dark:bg-orange-900/20">
              <p className="text-sm text-orange-600 dark:text-orange-400">High</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.high}</p>
            </div>
            <div className="rounded-xl bg-yellow-50 p-4 shadow-sm dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Medium</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.medium}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4 shadow-sm dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-400">Low</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.low}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search issues..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
              Search
            </button>
          </form>
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="escalated">Escalated</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Issues Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            </div>
          ) : issues.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-500 dark:text-gray-400">No issues found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Issue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Reporter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-xs font-medium text-blue-600">{issue.issue_key}</span>
                          <p className="font-medium text-gray-900 dark:text-white">{issue.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{issue.description}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-white">{issue.project_name}</span>
                        <p className="text-xs text-gray-500">{issue.project_code}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[issue.status]}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[issue.severity]}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {issue.owner_first_name ? (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {issue.owner_first_name} {issue.owner_last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {issue.reporter_first_name} {issue.reporter_last_name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {issue.due_date ? (
                          <span className={new Date(issue.due_date) < new Date() ? 'text-red-500 font-medium' : ''}>
                            {new Date(issue.due_date).toLocaleDateString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Issue Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Report New Issue</h2>
          <form onSubmit={handleCreateIssue} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={newIssue.project_id}
                onChange={(e) => setNewIssue({ ...newIssue, project_id: e.target.value })}
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
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Issue title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Describe the issue"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select
                  value={newIssue.severity}
                  onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newIssue.category}
                  onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="bug">Bug</option>
                  <option value="requirement">Requirement</option>
                  <option value="process">Process</option>
                  <option value="resource">Resource</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact</label>
                <select
                  value={newIssue.impact}
                  onChange={(e) => setNewIssue({ ...newIssue, impact: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newIssue.project_id || !newIssue.title}>
                {creating ? 'Submitting...' : 'Report Issue'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
