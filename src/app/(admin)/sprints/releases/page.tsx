"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';

interface Release {
  id: number;
  uuid: string;
  name: string;
  version: string;
  description: string;
  status: string;
  release_type: string;
  target_date: string;
  release_date: string;
  approval_status: string;
  approved_by: number;
  approver_name: string;
  approved_at: string;
  auto_release_notes: string;
  scope_changes_count: number;
  project_id: number;
  project_name: string;
  created_at: string;
  total_sprints: number;
  total_tasks: number;
  completed_tasks: number;
  total_points: number;
  completed_points: number;
}

interface Sprint {
  id: number;
  name: string;
  status: string;
  total_points: number;
}

interface Project {
  id: number;
  name: string;
  code: string;
}

const statusColors: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  staging: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  released: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const approvalColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const releaseTypeLabels: Record<string, string> = {
  major: '🚀 Major',
  minor: '📦 Minor',
  patch: '🔧 Patch',
  hotfix: '🔥 Hotfix',
};

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [releaseDetail, setReleaseDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'timeline'>('overview');
  
  const [newRelease, setNewRelease] = useState({
    name: '',
    version: '',
    description: '',
    release_type: 'minor',
    target_date: '',
    project_id: '',
  });

  const fetchReleases = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/releases?';
      if (filterStatus !== 'all') url += `status=${filterStatus}&`;
      if (filterProject !== 'all') url += `project_id=${filterProject}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReleases(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterProject]);

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

  const fetchReleaseDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/releases/${id}`);
      const data = await res.json();
      if (data.success) {
        setReleaseDetail(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch release detail:', error);
    }
  };

  useEffect(() => {
    fetchReleases();
    fetchProjects();
  }, [fetchReleases, fetchProjects]);

  const handleCreateRelease = async () => {
    if (!newRelease.name || !newRelease.project_id) {
      alert('Please fill in required fields');
      return;
    }
    
    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRelease,
          project_id: parseInt(newRelease.project_id),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewRelease({
          name: '',
          version: '',
          description: '',
          release_type: 'minor',
          target_date: '',
          project_id: '',
        });
        fetchReleases();
      } else {
        alert(data.message || 'Failed to create release');
      }
    } catch (error) {
      console.error('Failed to create release:', error);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/releases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReleases();
        if (selectedRelease) {
          fetchReleaseDetail(id);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleApprove = async (id: number, approved: boolean) => {
    try {
      const res = await fetch(`/api/releases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approval_status: approved ? 'approved' : 'rejected',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReleases();
        if (selectedRelease) {
          fetchReleaseDetail(id);
        }
      }
    } catch (error) {
      console.error('Failed to update approval:', error);
    }
  };

  const openReleaseDetail = (release: Release) => {
    setSelectedRelease(release);
    fetchReleaseDetail(release.id);
    setShowDetailModal(true);
  };

  // Calculate stats
  const stats = {
    total: releases.length,
    inProgress: releases.filter(r => r.status === 'in_progress').length,
    staging: releases.filter(r => r.status === 'staging').length,
    released: releases.filter(r => r.status === 'released').length,
    pendingApproval: releases.filter(r => r.approval_status === 'pending').length,
  };

  // Upcoming releases (next 30 days)
  const upcomingReleases = releases
    .filter(r => r.target_date && new Date(r.target_date) > new Date() && r.status !== 'released')
    .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
    .slice(0, 5);

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
              <h1 className="page-title">Releases</h1>
            </div>
            <p className="page-subtitle">
              Plan, track, and deliver product releases
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Release
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'calendar'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'timeline'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400'
            }`}
          >
            📈 Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="page-title">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Releases</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-yellow-600">{stats.staging}</div>
                <div className="text-sm text-gray-500">In Staging</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600">{stats.released}</div>
                <div className="text-sm text-gray-500">Released</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-orange-600">{stats.pendingApproval}</div>
                <div className="text-sm text-gray-500">Pending Approval</div>
              </div>
            </div>

            {/* Upcoming Releases */}
            {upcomingReleases.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Releases</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingReleases.map(release => {
                    const daysLeft = Math.ceil((new Date(release.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const progress = release.total_tasks > 0 
                      ? Math.round((release.completed_tasks / release.total_tasks) * 100)
                      : 0;
                    
                    return (
                      <div
                        key={release.id}
                        onClick={() => openReleaseDetail(release)}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-brand-300 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-xs text-gray-500">{release.project_name}</span>
                            <h3 className="font-medium text-gray-900 dark:text-white">{release.name}</h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{release.version}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[release.status]}`}>
                            {release.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className={daysLeft <= 7 ? 'text-red-500 font-medium' : ''}>
                            📅 {daysLeft} days left
                          </span>
                          <span>{releaseTypeLabels[release.release_type] || release.release_type}</span>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="staging">Staging</option>
                <option value="released">Released</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Releases Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Release</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {releases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        No releases found
                      </td>
                    </tr>
                  ) : (
                    releases.map(release => {
                      const progress = release.total_tasks > 0 
                        ? Math.round((release.completed_tasks / release.total_tasks) * 100)
                        : 0;
                      
                      return (
                        <tr key={release.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openReleaseDetail(release)}
                              className="text-left"
                            >
                              <div className="font-medium text-gray-900 dark:text-white hover:text-brand-600">
                                {release.name}
                              </div>
                              <div className="text-sm text-gray-500">{release.version}</div>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {release.project_name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {releaseTypeLabels[release.release_type] || release.release_type}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[release.status]}`}>
                              {release.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${approvalColors[release.approval_status]}`}>
                              {release.approval_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {release.target_date ? new Date(release.target_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openReleaseDetail(release)}
                              className="text-sm text-brand-600 hover:text-brand-700"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Release Calendar</h2>
            <div className="space-y-4">
              {releases
                .filter(r => r.target_date)
                .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
                .map(release => {
                  const targetDate = new Date(release.target_date);
                  const isPast = targetDate < new Date();
                  const isToday = targetDate.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={release.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        isToday
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : isPast && release.status !== 'released'
                          ? 'border-red-200 bg-red-50 dark:bg-red-900/10'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="text-center w-16">
                        <div className="page-title">
                          {targetDate.getDate()}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">
                          {targetDate.toLocaleString('default', { month: 'short' })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{release.name}</h3>
                          <span className="text-sm text-gray-500">{release.version}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {release.project_name} • {releaseTypeLabels[release.release_type]}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[release.status]}`}>
                        {release.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Release Timeline</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              <div className="space-y-8">
                {releases
                  .filter(r => r.status === 'released' && r.release_date)
                  .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
                  .map(release => (
                    <div key={release.id} className="relative pl-10">
                      <div className="absolute left-2 w-4 h-4 rounded-full bg-green-500 border-4 border-white dark:border-gray-800"></div>
                      <div>
                        <div className="text-sm text-gray-500">
                          {new Date(release.release_date).toLocaleDateString('default', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{release.name}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {release.version} • {release.project_name} • {release.total_tasks} tasks
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Release Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create Release</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Project *
              </label>
              <select
                value={newRelease.project_id}
                onChange={(e) => setNewRelease({ ...newRelease, project_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">Select project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Release Name *
                </label>
                <input
                  type="text"
                  value={newRelease.name}
                  onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  placeholder="e.g., Q1 2024 Release"
                />
              </div>
              <div>
                <label className="form-label">
                  Version
                </label>
                <input
                  type="text"
                  value={newRelease.version}
                  onChange={(e) => setNewRelease({ ...newRelease, version: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  placeholder="e.g., v1.2.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Release Type
                </label>
                <select
                  value={newRelease.release_type}
                  onChange={(e) => setNewRelease({ ...newRelease, release_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="major">🚀 Major</option>
                  <option value="minor">📦 Minor</option>
                  <option value="patch">🔧 Patch</option>
                  <option value="hotfix">🔥 Hotfix</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  Target Date
                </label>
                <input
                  type="date"
                  value={newRelease.target_date}
                  onChange={(e) => setNewRelease({ ...newRelease, target_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            </div>
            <div>
              <label className="form-label">
                Description
              </label>
              <textarea
                value={newRelease.description}
                onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                rows={3}
                placeholder="Release objectives and highlights..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRelease}>Create Release</Button>
          </div>
        </div>
      </Modal>

      {/* Release Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} className="max-w-4xl">
        <div className="p-6">
          {selectedRelease && (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-sm text-gray-500">{selectedRelease.project_name}</span>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedRelease.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-600 dark:text-gray-400">{selectedRelease.version}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selectedRelease.status]}`}>
                      {selectedRelease.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${approvalColors[selectedRelease.approval_status]}`}>
                      {selectedRelease.approval_status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRelease.approval_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedRelease.id, true)}
                        className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRelease.id, false)}
                        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                  {selectedRelease.status === 'staging' && selectedRelease.approval_status === 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRelease.id, 'released')}
                      className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                    >
                      🚀 Deploy Release
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="page-title">{selectedRelease.total_sprints || 0}</div>
                  <div className="text-xs text-gray-500">Sprints</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="page-title">{selectedRelease.total_tasks || 0}</div>
                  <div className="text-xs text-gray-500">Total Tasks</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedRelease.completed_tasks || 0}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedRelease.total_points || 0}</div>
                  <div className="text-xs text-gray-500">Story Points</div>
                </div>
              </div>

              {/* Release Notes */}
              {releaseDetail?.auto_release_notes && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Release Notes</h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {releaseDetail.auto_release_notes}
                    </pre>
                  </div>
                </div>
              )}

              {/* Linked Sprints */}
              {releaseDetail?.sprints && releaseDetail.sprints.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Linked Sprints</h3>
                  <div className="space-y-2">
                    {releaseDetail.sprints.map((sprint: any) => (
                      <div
                        key={sprint.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{sprint.name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColors[sprint.status]}`}>
                            {sprint.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{sprint.total_points || 0} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {['planning', 'in_progress', 'staging', 'released', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedRelease.id, status)}
                      disabled={selectedRelease.status === status}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        selectedRelease.status === status
                          ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
