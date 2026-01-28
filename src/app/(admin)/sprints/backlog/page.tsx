"use client";
import React, { useState, useEffect } from "react";

interface Sprint {
  id: number;
  uuid: string;
  name: string;
  goal: string;
  status: string;
  start_date: string;
  end_date: string;
  project_id: number;
  project_name: string;
  project_code: string;
  total_points: number;
  completed_points: number;
  velocity: number;
}

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
  assignee_id: number;
  assignee_first_name: string;
  assignee_last_name: string;
  sprint_id: number;
  labels: string[];
}

const statusColors: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const taskStatusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  todo: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  in_review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};

const priorityColors: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-amber-600',
  low: 'text-green-600',
};

const typeIcons: Record<string, string> = {
  story: '📖',
  task: '✓',
  bug: '🐛',
  epic: '⚡',
  subtask: '📋',
};

export default function SprintBacklogPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [productBacklog, setProductBacklog] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sprint' | 'product'>('sprint');

  useEffect(() => {
    loadSprints();
  }, []);

  useEffect(() => {
    if (selectedSprint) {
      loadSprintBacklog(selectedSprint.id);
    }
  }, [selectedSprint]);

  const loadSprints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects/sprints?status=active,planning', { credentials: 'include' });
      const result = await response.json();
      
      if (result.success && result.data) {
        setSprints(result.data);
        // Select the active sprint by default
        const activeSprint = result.data.find((s: Sprint) => s.status === 'active');
        if (activeSprint) {
          setSelectedSprint(activeSprint);
        } else if (result.data.length > 0) {
          setSelectedSprint(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSprintBacklog = async (sprintId: number) => {
    try {
      const response = await fetch(`/api/tasks?sprint_id=${sprintId}`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setBacklogItems(result.data || []);
      }
    } catch (error) {
      console.error('Error loading backlog:', error);
    }
  };

  const loadProductBacklog = async () => {
    try {
      const response = await fetch('/api/tasks?status=backlog&sprint_id=null', { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setProductBacklog(result.data || []);
      }
    } catch (error) {
      console.error('Error loading product backlog:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'product') {
      loadProductBacklog();
    }
  }, [activeTab]);

  const getSprintProgress = (sprint: Sprint) => {
    if (!sprint.total_points) return 0;
    return Math.round((sprint.completed_points / sprint.total_points) * 100);
  };

  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const groupedByStatus = backlogItems.reduce((acc, item) => {
    const status = item.status || 'backlog';
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    return acc;
  }, {} as Record<string, BacklogItem[]>);

  const statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sprint Backlog</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage sprint and product backlog items
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedSprint?.id || ''}
              onChange={(e) => {
                const sprint = sprints.find(s => s.id === parseInt(e.target.value));
                setSelectedSprint(sprint || null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} {sprint.status === 'active' && '(Active)'}
                </option>
              ))}
            </select>
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('sprint')}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === 'sprint'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Sprint Backlog
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === 'product'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Product Backlog
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'sprint' && selectedSprint && (
          <>
            {/* Sprint Info */}
            <div className="mb-6 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedSprint.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[selectedSprint.status]}`}>
                      {selectedSprint.status}
                    </span>
                  </div>
                  {selectedSprint.goal && (
                    <p className="mt-1 text-gray-500 dark:text-gray-400">{selectedSprint.goal}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {new Date(selectedSprint.start_date).toLocaleDateString()} - {new Date(selectedSprint.end_date).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSprint.completed_points || 0}</p>
                    <p className="text-sm text-gray-500">/ {selectedSprint.total_points || 0} points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{getRemainingDays(selectedSprint.end_date)}</p>
                    <p className="text-sm text-gray-500">days left</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{backlogItems.length}</p>
                    <p className="text-sm text-gray-500">items</p>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">{getSprintProgress(selectedSprint)}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${getSprintProgress(selectedSprint)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Sprint Items by Status */}
            <div className="space-y-4">
              {statuses.map((status) => {
                const items = groupedByStatus[status] || [];
                const statusPoints = items.reduce((sum, item) => sum + (item.story_points || 0), 0);
                
                return (
                  <div key={status} className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${taskStatusColors[status]}`}>
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">{items.length} items</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{statusPoints} pts</span>
                    </div>
                    
                    {items.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-400">No items</div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{typeIcons[item.type] || '📋'}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-blue-600">{item.task_key}</span>
                                  <span className={`text-xs ${priorityColors[item.priority]}`}>●</span>
                                </div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {item.assignee_first_name && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                                  {item.assignee_first_name[0]}{item.assignee_last_name?.[0]}
                                </div>
                              )}
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                {item.story_points || 0} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'product' && (
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Product Backlog</h2>
              <p className="text-sm text-gray-500">Items not assigned to any sprint</p>
            </div>
            
            {productBacklog.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">Product backlog is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {productBacklog.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{typeIcons[item.type] || '📋'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-600">{item.task_key}</span>
                          <span className={`text-xs ${priorityColors[item.priority]}`}>●</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {item.story_points || 0} pts
                      </span>
                      <button className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                        Add to Sprint
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
