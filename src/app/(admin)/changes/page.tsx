"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CRDashboard, CRList, CRForm } from '@/components/change-requests';

type ViewMode = 'dashboard' | 'list' | 'new';

export default function ChangeRequestsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  const handleViewCR = (cr: any) => {
    router.push(`/changes/${cr.id}`);
  };

  const handleNewCR = () => {
    setViewMode('new');
  };

  const handleFormSuccess = (result: any) => {
    setViewMode('list');
  };

  const handleFormCancel = () => {
    setViewMode('dashboard');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Change Requests</h1>
            <p className="page-subtitle">
              {viewMode === 'dashboard' && 'Overview and analytics'}
              {viewMode === 'list' && 'All change requests'}
              {viewMode === 'new' && 'Create new request'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/changes/reports')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reports
            </button>
            {viewMode !== 'new' && (
              <button
                onClick={handleNewCR}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Request
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
          <nav className="-mb-px flex gap-1">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                viewMode === 'dashboard'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              All Requests
            </button>
            {viewMode === 'new' && (
              <button
                className="flex items-center gap-2 border-b-2 border-blue-500 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Request
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'dashboard' && <CRDashboard />}

        {viewMode === 'list' && <CRList onViewCR={handleViewCR} />}

        {viewMode === 'new' && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <h2 className="card-title">Create New Change Request</h2>
              <button
                onClick={handleFormCancel}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CRForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
