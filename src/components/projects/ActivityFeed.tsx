"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ActivityFeedItem } from '@/types/projects-enhanced';

interface ActivityFeedProps {
  projectId?: string;
  taskId?: string;
  entityType?: 'project' | 'task' | 'phase' | 'milestone';
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

const actionIcons: Record<string, { icon: string; color: string }> = {
  created: { icon: '✨', color: 'text-green-500' },
  updated: { icon: '✏️', color: 'text-blue-500' },
  deleted: { icon: '🗑️', color: 'text-red-500' },
  commented: { icon: '💬', color: 'text-purple-500' },
  status_changed: { icon: '🔄', color: 'text-orange-500' },
  assigned: { icon: '👤', color: 'text-cyan-500' },
  completed: { icon: '✅', color: 'text-green-600' },
  started: { icon: '▶️', color: 'text-blue-600' },
  archived: { icon: '📦', color: 'text-gray-500' },
  restored: { icon: '♻️', color: 'text-teal-500' }
};

const entityTypeLabels: Record<string, string> = {
  project: 'Project',
  task: 'Task',
  phase: 'Phase',
  milestone: 'Milestone',
  sprint: 'Sprint',
  comment: 'Comment',
  risk: 'Risk',
  time_entry: 'Time Entry'
};

export default function ActivityFeed({
  projectId,
  taskId,
  entityType,
  limit = 20,
  showFilters = true,
  compact = false
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams();
      
      if (projectId) params.append('project_id', projectId);
      if (taskId) params.append('entity_id', taskId);
      if (entityType) params.append('entity_type', entityType);
      if (filterType) params.append('action', filterType);
      params.append('limit', String(limit));
      params.append('offset', String((currentPage - 1) * limit));

      const response = await fetch(`/api/projects/activity?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setActivities(data.data);
          setPage(1);
        } else {
          setActivities(prev => [...prev, ...data.data]);
        }
        setHasMore(data.data.length === limit);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, entityType, filterType, limit, page]);

  useEffect(() => {
    fetchActivities(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId, entityType, filterType]);

  const loadMore = () => {
    setPage(p => p + 1);
    fetchActivities(false);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatActivityMessage = (activity: ActivityFeedItem): React.ReactNode => {
    const entityLabel = entityTypeLabels[activity.entity_type] || activity.entity_type;
    
    switch (activity.action) {
      case 'created':
        return <>created {entityLabel.toLowerCase()} <strong>{activity.entity_title || ''}</strong></>;
      case 'updated':
        return <>updated {entityLabel.toLowerCase()} <strong>{activity.entity_title || ''}</strong></>;
      case 'deleted':
        return <>deleted {entityLabel.toLowerCase()} <strong>{activity.entity_title || ''}</strong></>;
      case 'commented':
        return <>commented on <strong>{activity.entity_title || entityLabel}</strong></>;
      case 'status_changed':
        const details = activity.details as Record<string, string> | undefined;
        return (
          <>
            changed status of <strong>{activity.entity_title}</strong>
            {details?.old_status && details?.new_status && (
              <> from <span className="text-gray-500">{details.old_status}</span> to <span className="font-medium">{details.new_status}</span></>
            )}
          </>
        );
      case 'assigned':
        return <>assigned <strong>{activity.entity_title}</strong></>;
      case 'completed':
        return <>completed <strong>{activity.entity_title}</strong></>;
      case 'started':
        return <>started working on <strong>{activity.entity_title}</strong></>;
      default:
        return <>{activity.action} {entityLabel.toLowerCase()} <strong>{activity.entity_title || ''}</strong></>;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'}>
      {/* Header */}
      {!compact && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Activity</h3>
          {showFilters && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
            >
              <option value="">All Activities</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="status_changed">Status Changed</option>
              <option value="commented">Comments</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>
      )}

      {/* Activity List */}
      <div className={compact ? '' : 'p-4'}>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No activity yet
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id || index}
                className={`flex gap-3 ${compact ? 'py-2' : ''}`}
              >
                {/* Icon/Avatar */}
                <div className="flex-shrink-0">
                  {activity.user_avatar ? (
                    <Image
                      src={activity.user_avatar}
                      alt={activity.user_name || 'User avatar'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm">
                      {activity.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {activity.user_name || 'Unknown'}
                    </span>
                    {' '}
                    <span className={actionIcons[activity.action]?.color || 'text-gray-600 dark:text-gray-400'}>
                      {actionIcons[activity.action]?.icon || '•'}
                    </span>
                    {' '}
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatActivityMessage(activity)}
                    </span>
                  </div>
                  
                  {/* Details preview */}
                  {activity.details && typeof activity.details === 'object' && activity.action === 'commented' && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-gray-900 rounded p-2">
                      {(activity.details as Record<string, string>).comment || ''}
                    </p>
                  )}

                  {/* Timestamp */}
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {formatTimeAgo(activity.created_at)}
                    {!compact && activity.entity_type && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {entityTypeLabels[activity.entity_type] || activity.entity_type}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
              >
                Load more activities
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
