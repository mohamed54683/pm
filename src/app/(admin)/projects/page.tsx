"use client";

import React, { useState } from 'react';
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Project Management</h1>
            <p className="page-subtitle">
              {viewMode === 'dashboard' && 'Overview and analytics'}
              {viewMode === 'projects' && 'All projects'}
              {viewMode === 'project-detail' && 'Project details'}
            </p>
          </div>
          {viewMode === 'project-detail' && (
            <button
              onClick={handleBackToProjects}
              className="btn-secondary"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Projects
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        {viewMode !== 'project-detail' && (
          <div className="mt-4 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
            <nav className="tab-nav">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`tab-item ${
                  viewMode === 'dashboard'
                    ? 'tab-item-active'
                    : 'tab-item-inactive'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </button>
              <button
                onClick={() => setViewMode('projects')}
                className={`tab-item ${
                  viewMode === 'projects'
                    ? 'tab-item-active'
                    : 'tab-item-inactive'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                All Projects
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="page-body">
        {viewMode === 'dashboard' && <ProjectDashboard />}
        {viewMode === 'projects' && <ProjectList onProjectClick={handleProjectClick} />}
        {viewMode === 'project-detail' && selectedProjectId && (
          <ProjectDetail projectId={selectedProjectId} onBack={handleBackToProjects} />
        )}
      </div>
    </div>
  );
}
