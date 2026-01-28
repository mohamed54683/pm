"use client";

import React from 'react';
import { Project, ProjectStatus, ProjectPriority } from '@/types/projects';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const priorityColors: Record<ProjectPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  critical: 'text-red-500'
};

const priorityIcons: Record<ProjectPriority, React.ReactNode> = {
  low: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" transform="rotate(180 10 10)" />
    </svg>
  ),
  medium: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  high: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
  critical: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
};

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const completedTasks = project.completed_task_count || 0;
  const totalTasks = project.task_count || 0;

  const getDaysRemaining = () => {
    if (!project.end_date) return null;
    const endDate = new Date(project.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
              {project.name}
            </h3>
            <span className={`inline-flex items-center gap-1 text-xs ${priorityColors[project.priority]}`}>
              {priorityIcons[project.priority]}
              {project.priority}
            </span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {Math.round(project.progress_percentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${project.progress_percentage}%`,
              backgroundColor: project.color
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{completedTasks}/{totalTasks}</span>
          </div>
          {project.member_count !== undefined && project.member_count > 0 && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{project.member_count}</span>
            </div>
          )}
        </div>

        {/* Deadline */}
        {daysRemaining !== null && (
          <div className={`flex items-center gap-1 text-xs ${
            daysRemaining < 0 
              ? 'text-red-500' 
              : daysRemaining <= 7 
                ? 'text-orange-500' 
                : 'text-gray-500 dark:text-gray-400'
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {daysRemaining < 0 
                ? `${Math.abs(daysRemaining)}d overdue`
                : daysRemaining === 0 
                  ? 'Due today'
                  : `${daysRemaining}d left`}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-4">
          {project.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
