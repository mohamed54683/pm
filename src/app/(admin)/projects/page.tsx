"use client";

import React, { useState } from 'react';
import PageBreadCrumb from '@/components/common/PageBreadCrumb';
import { ProjectDashboard, ProjectList, ProjectDetail } from '@/components/projects';
import { Project } from '@/types/projects';

type ViewMode = 'dashboard' | 'projects' | 'project-detail';

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleProjectClick = (project: Project) => {
    setSelectedProjectId(project.id);
    setViewMode('project-detail');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setViewMode('projects');
  };

  return (
    <div className="p-6">
      <PageBreadCrumb pageTitle="Project Management" />

      {/* Navigation Tabs */}
      {viewMode !== 'project-detail' && (
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewMode === 'dashboard'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </span>
            </button>
            <button
              onClick={() => setViewMode('projects')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewMode === 'projects'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                All Projects
              </span>
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      {viewMode === 'dashboard' && (
        <ProjectDashboard />
      )}

      {viewMode === 'projects' && (
        <ProjectList onProjectClick={handleProjectClick} />
      )}

      {viewMode === 'project-detail' && selectedProjectId && (
        <ProjectDetail
          projectId={selectedProjectId}
          onBack={handleBackToProjects}
        />
      )}
    </div>
  );
}
