"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Release {
  id: number;
  name: string;
  version: string;
  status: string;
  targetDate: string;
  description: string;
}

export default function ReleasesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [creating, setCreating] = useState(false);
  const [newRelease, setNewRelease] = useState({
    name: '',
    version: '',
    targetDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  const handleCreateRelease = async () => {
    if (!newRelease.name || !newRelease.version) {
      alert('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const release: Release = {
        id: Date.now(),
        name: newRelease.name,
        version: newRelease.version,
        status: 'planned',
        targetDate: newRelease.targetDate,
        description: newRelease.description,
      };
      setReleases(prev => [release, ...prev]);
      setShowCreateModal(false);
      setNewRelease({
        name: '',
        version: '',
        targetDate: new Date().toISOString().split('T')[0],
        description: '',
      });
    } catch (error) {
      console.error('Error creating release:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Releases</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage release versions and deployments
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Release
          </button>
        </div>
      </div>

      <div className="p-6">
        {releases.length > 0 ? (
          <div className="space-y-4">
            {releases.map((release) => (
              <div key={release.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{release.name}</h3>
                    <p className="text-sm text-gray-500">Version: {release.version}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">{release.status}</span>
                </div>
                {release.description && (
                  <p className="mt-2 text-sm text-gray-500">{release.description}</p>
                )}
                <p className="mt-2 text-xs text-gray-400">Target: {new Date(release.targetDate).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No releases yet</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Releases track version deployments across your projects.
            </p>
            <Link href="/sprints" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Back to Sprints
            </Link>
          </div>
        )}
      </div>

      {/* Create Release Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Create New Release</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Release Name *</label>
              <input
                type="text"
                value={newRelease.name}
                onChange={(e) => setNewRelease(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="e.g., Sprint 1 Release"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Version *</label>
              <input
                type="text"
                value={newRelease.version}
                onChange={(e) => setNewRelease(prev => ({ ...prev, version: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="e.g., 1.0.0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target Date</label>
              <input
                type="date"
                value={newRelease.targetDate}
                onChange={(e) => setNewRelease(prev => ({ ...prev, targetDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={newRelease.description}
                onChange={(e) => setNewRelease(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                rows={3}
                placeholder="Release description"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRelease} disabled={creating}>
              {creating ? 'Creating...' : 'Create Release'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
