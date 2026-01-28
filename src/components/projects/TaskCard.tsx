"use client";

import React from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/projects';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

const statusColors: Record<TaskStatus, { bg: string; border: string; text: string }> = {
  not_started: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
  in_progress: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  in_review: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  blocked: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' }
};

const priorityConfig: Record<TaskPriority, { color: string; icon: React.ReactNode }> = {
  low: {
    color: 'text-gray-400',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 14l-5-5h10l-5 5z" /></svg>
  },
  medium: {
    color: 'text-blue-500',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 10h14" strokeWidth="2" /></svg>
  },
  high: {
    color: 'text-orange-500',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6l5 5H5l5-5z" /></svg>
  },
  critical: {
    color: 'text-red-500',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" /></svg>
  }
};

const taskTypeIcons: Record<string, React.ReactNode> = {
  task: (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  bug: (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  feature: (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  improvement: (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  documentation: (
    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
};

export default function TaskCard({ task, onClick, onStatusChange }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const statusStyle = statusColors[task.status];
  const priorityStyle = priorityConfig[task.priority];
  
  const checklistProgress = task.checklists 
    ? (task.checklists.filter(c => c.is_completed).length / task.checklists.length) * 100 
    : 0;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onStatusChange?.(task.id, e.target.checked ? 'completed' : 'not_started');
  };

  return (
    <div
      onClick={onClick}
      className={`${statusStyle.bg} dark:bg-gray-800 border ${statusStyle.border} dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={handleCheckboxChange}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {taskTypeIcons[task.task_type]}
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.text} bg-white/50 dark:bg-gray-700`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
          <h4 className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </h4>
        </div>
        <span className={priorityStyle.color} title={`${task.priority} priority`}>
          {priorityStyle.icon}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Progress bar */}
      {task.progress_percentage > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(task.progress_percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist progress */}
      {task.checklists && task.checklists.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full"
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
          <span className="text-xs">
            {task.checklists.filter(c => c.is_completed).length}/{task.checklists.length}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700">
        {/* Assignees */}
        <div className="flex -space-x-2">
          {task.assignees?.slice(0, 3).map((assignee, idx) => (
            <div
              key={idx}
              className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center border-2 border-white dark:border-gray-800"
              title={assignee.user_name}
            >
              {assignee.user_name?.charAt(0).toUpperCase()}
            </div>
          ))}
          {(task.assignees?.length || 0) > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs flex items-center justify-center border-2 border-white dark:border-gray-800">
              +{task.assignees!.length - 3}
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {/* Comments count */}
          {task.comments_count !== undefined && task.comments_count > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {task.comments_count}
            </span>
          )}

          {/* Due date */}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {task.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-white/50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
