"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';

interface BacklogItem {
  id: number;
  uuid: string;
  task_key: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  story_points: number;
  backlog_order: number;
  refinement_notes: string;
  acceptance_criteria: string;
  project_id: number;
  project_name: string;
  assignee_id: number;
  assignee_first_name: string;
  assignee_last_name: string;
  created_at: string;
}

interface Sprint {
  id: number;
  name: string;
  status: string;
  project_id: number;
  project_name: string;
  total_points: number;
}

interface Project {
  id: number;
  name: string;
  code: string;
}

interface RefinementSession {
  id: number;
  title: string;
  scheduled_date: string;
  status: string;
  items_refined: number;
  total_items: number;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const typeIcons: Record<string, string> = {
  story: '📖',
  task: '✓',
  bug: '🐛',
  epic: '⚡',
  subtask: '📋',
};

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refinementSessions, setRefinementSessions] = useState<RefinementSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [estimatePoints, setEstimatePoints] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'backlog' | 'refinement'>('backlog');
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchBacklog = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/backlog?';
      if (filterProject !== 'all') url += `project_id=${filterProject}&`;
      if (filterPriority !== 'all') url += `priority=${filterPriority}&`;
      if (filterType !== 'all') url += `type=${filterType}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterPriority, filterType]);

  const fetchSprints = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/sprints?status=planning,active');
      const data = await res.json();
      if (data.success) {
        setSprints(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchRefinement = useCallback(async () => {
    try {
      const res = await fetch('/api/backlog/refinement');
      const data = await res.json();
      if (data.success) {
        setRefinementSessions(data.data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch refinement:', error);
    }
  }, []);

  useEffect(() => {
    fetchBacklog();
    fetchSprints();
    fetchProjects();
    fetchRefinement();
  }, [fetchBacklog, fetchSprints, fetchProjects, fetchRefinement]);

  const handleBulkAction = async (action: string, params: Record<string, unknown> = {}) => {
    if (selectedItems.size === 0) return;
    
    try {
      const res = await fetch('/api/backlog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          task_ids: Array.from(selectedItems),
          ...params,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItems(new Set());
        fetchBacklog();
        if (action === 'assign_to_sprint') {
          setShowAssignModal(false);
        }
        if (action === 'estimate') {
          setShowEstimateModal(false);
          setEstimatePoints('');
        }
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          refinement_notes: editingItem.refinement_notes,
          acceptance_criteria: editingItem.acceptance_criteria,
          story_points: editingItem.story_points,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingItem(null);
        fetchBacklog();
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const toggleSelectItem = (id: number) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !item.task_key.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPoints = filteredItems.reduce((sum, item) => sum + (item.story_points || 0), 0);
  const unestimatedCount = filteredItems.filter(i => !i.story_points).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/sprints" className="text-gray-500 hover:text-gray-700">
                ← Sprints
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="page-title">Backlog</h1>
            </div>
            <p className="page-subtitle">
              Manage and prioritize work items
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/tasks/create"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Item
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div>
            <span className="text-gray-500">Total Items:</span>
            <span className="font-medium ml-1">{filteredItems.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Total Points:</span>
            <span className="font-medium ml-1">{totalPoints}</span>
          </div>
          <div>
            <span className="text-gray-500">Unestimated:</span>
            <span className={`font-medium ml-1 ${unestimatedCount > 0 ? 'text-orange-600' : ''}`}>{unestimatedCount}</span>
          </div>
          {selectedItems.size > 0 && (
            <div className="text-brand-600 font-medium">
              {selectedItems.size} selected
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('backlog')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'backlog'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400'
            }`}
          >
            📋 Product Backlog
          </button>
          <button
            onClick={() => setActiveTab('refinement')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'refinement'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400'
            }`}
          >
            🔍 Refinement Sessions
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'backlog' && (
          <>
            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 w-64"
                />
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="all">All Types</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="epic">Epic</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                  >
                    Add to Sprint
                  </button>
                  <button
                    onClick={() => setShowEstimateModal(true)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Estimate
                  </button>
                  <button
                    onClick={() => handleBulkAction('set_priority', { priority: 'high' })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Set High Priority
                  </button>
                </div>
              )}
            </div>

            {/* Backlog Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No backlog items found
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{typeIcons[item.type] || '📋'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-blue-600">{item.task_key}</span>
                              </div>
                              <Link
                                href={`/tasks/${item.uuid}`}
                                className="font-medium text-gray-900 dark:text-white hover:text-brand-600 line-clamp-1"
                              >
                                {item.title}
                              </Link>
                              {item.refinement_notes && (
                                <p className="text-xs text-gray-500 mt-1">📝 Has refinement notes</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {item.project_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[item.priority]}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.story_points ? (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                              {item.story_points}
                            </span>
                          ) : (
                            <span className="text-orange-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                          {item.status.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowEditModal(true);
                            }}
                            className="text-sm text-brand-600 hover:text-brand-700"
                          >
                            Refine
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'refinement' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="card-title">Refinement Sessions</h2>
              <button
                onClick={() => setShowRefinementModal(true)}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
              >
                Schedule Session
              </button>
            </div>

            {refinementSessions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-4xl">🔍</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Refinement Sessions</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Schedule a refinement session to review and estimate backlog items
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {refinementSessions.map(session => (
                  <div
                    key={session.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{session.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          📅 {new Date(session.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          session.status === 'completed' ? 'bg-green-100 text-green-700' :
                          session.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {session.status}
                        </span>
                        <p className="text-sm text-gray-500 mt-2">
                          {session.items_refined}/{session.total_items} items refined
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${session.total_items ? (session.items_refined / session.total_items) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign to Sprint Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Add to Sprint</h2>
          <p className="text-gray-500 mb-4">{selectedItems.size} items selected</p>
          <select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 mb-4"
          >
            <option value="">Select a sprint</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status}) - {s.total_points || 0} pts
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button 
              onClick={() => handleBulkAction('assign_to_sprint', { sprint_id: parseInt(selectedSprint) })}
              disabled={!selectedSprint}
            >
              Add to Sprint
            </Button>
          </div>
        </div>
      </Modal>

      {/* Estimate Modal */}
      <Modal isOpen={showEstimateModal} onClose={() => setShowEstimateModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Estimate Story Points</h2>
          <p className="text-gray-500 mb-4">{selectedItems.size} items selected</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {[1, 2, 3, 5, 8, 13, 21].map(pts => (
              <button
                key={pts}
                onClick={() => setEstimatePoints(pts.toString())}
                className={`px-4 py-2 rounded-lg border ${
                  estimatePoints === pts.toString()
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {pts}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEstimateModal(false)}>Cancel</Button>
            <Button 
              onClick={() => handleBulkAction('estimate', { story_points: parseInt(estimatePoints) })}
              disabled={!estimatePoints}
            >
              Set Estimate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit/Refine Item Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className="max-w-2xl">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Refine Item</h2>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span>{typeIcons[editingItem.type] || '📋'}</span>
                  <span className="text-sm text-blue-600 font-medium">{editingItem.task_key}</span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">{editingItem.title}</h3>
                {editingItem.description && (
                  <p className="text-sm text-gray-500 mt-1">{editingItem.description}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Story Points
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 8, 13, 21].map(pts => (
                    <button
                      key={pts}
                      onClick={() => setEditingItem({ ...editingItem, story_points: pts })}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${
                        editingItem.story_points === pts
                          ? 'border-brand-500 bg-brand-50 text-brand-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">
                  Acceptance Criteria
                </label>
                <textarea
                  value={editingItem.acceptance_criteria || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, acceptance_criteria: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  rows={4}
                  placeholder="Define the acceptance criteria for this item..."
                />
              </div>

              <div>
                <label className="form-label">
                  Refinement Notes
                </label>
                <textarea
                  value={editingItem.refinement_notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, refinement_notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  rows={3}
                  placeholder="Add notes from refinement discussions..."
                />
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateItem}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Refinement Modal */}
      <Modal isOpen={showRefinementModal} onClose={() => setShowRefinementModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Schedule Refinement Session</h2>
          <p className="text-gray-500 text-sm mb-4">
            Refinement sessions help the team review, discuss, and estimate backlog items.
          </p>
          <div className="space-y-4">
            <div>
              <label className="form-label">Title</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="e.g., Sprint 5 Refinement"
              />
            </div>
            <div>
              <label className="form-label">Date</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRefinementModal(false)}>Cancel</Button>
            <Button onClick={() => setShowRefinementModal(false)}>Schedule Session</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
