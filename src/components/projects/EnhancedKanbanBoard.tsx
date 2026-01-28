"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/projects';
import { Label } from '@/types/projects-enhanced';
import { Modal } from '@/components/ui/modal';
import TaskForm from './TaskForm';

interface EnhancedKanbanBoardProps {
  projectId: string;
  phaseId?: string;
  sprintId?: string;
  onTaskClick?: (task: Task) => void;
  showWipLimits?: boolean;
  swimlaneType?: 'none' | 'assignee' | 'priority' | 'label' | 'phase';
  enableQuickActions?: boolean;
}

interface TaskWithLabels extends Task {
  labels?: Label[];
  assignee_name?: string;
  phase_name?: string;
  story_points?: number;
  assignee_id?: string;
}

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: TaskWithLabels[];
  color: string;
  wipLimit?: number;
  storyPoints: number;
}

interface Swimlane {
  id: string;
  name: string;
  color?: string;
  taskCount: number;
  isCollapsed: boolean;
}

const priorityLabels: Record<string, { name: string; color: string }> = {
  critical: { name: 'Critical', color: '#DC2626' },
  high: { name: 'High', color: '#EA580C' },
  medium: { name: 'Medium', color: '#CA8A04' },
  low: { name: 'Low', color: '#16A34A' }
};

const defaultColumns: KanbanColumn[] = [
  { id: 'not_started', title: 'To Do', tasks: [], color: '#6B7280', wipLimit: undefined, storyPoints: 0 },
  { id: 'in_progress', title: 'In Progress', tasks: [], color: '#3B82F6', wipLimit: 5, storyPoints: 0 },
  { id: 'in_review', title: 'In Review', tasks: [], color: '#8B5CF6', wipLimit: 3, storyPoints: 0 },
  { id: 'completed', title: 'Done', tasks: [], color: '#10B981', wipLimit: undefined, storyPoints: 0 }
];

export default function EnhancedKanbanBoard({
  projectId,
  phaseId,
  sprintId,
  onTaskClick,
  showWipLimits = true,
  swimlaneType = 'none',
  enableQuickActions = true
}: EnhancedKanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [tasks, setTasks] = useState<TaskWithLabels[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<TaskWithLabels | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOverSwimlane, setDragOverSwimlane] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<TaskStatus>('not_started');
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Set<string>>(new Set());
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [quickEditTask, setQuickEditTask] = useState<TaskWithLabels | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      if (phaseId) params.append('phase_id', phaseId);
      if (sprintId) params.append('sprint_id', sprintId);
      params.append('limit', '200');

      const response = await fetch(`/api/projects/tasks?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, phaseId, sprintId]);

  const fetchLabels = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/labels?project_id=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setAvailableLabels(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    fetchLabels();
  }, [fetchTasks, fetchLabels]);

  // Generate swimlanes based on type - declared before useEffect that uses it
  const getSwimlanes = useCallback((taskList: TaskWithLabels[]): Swimlane[] => {
    if (swimlaneType === 'none') return [];

    const lanesMap = new Map<string, Swimlane>();

    taskList.forEach(task => {
      let laneId: string;
      let laneName: string;
      let laneColor: string | undefined;

      switch (swimlaneType) {
        case 'assignee':
          laneId = task.assignee_id || 'unassigned';
          laneName = task.assignee_name || 'Unassigned';
          break;
        case 'priority':
          laneId = task.priority;
          laneName = priorityLabels[task.priority]?.name || task.priority;
          laneColor = priorityLabels[task.priority]?.color;
          break;
        case 'label':
          if (task.labels && task.labels.length > 0) {
            laneId = String(task.labels[0].id);
            laneName = task.labels[0].name;
            laneColor = task.labels[0].color;
          } else {
            laneId = 'no-label';
            laneName = 'No Label';
          }
          break;
        case 'phase':
          laneId = task.phase_id || 'no-phase';
          laneName = task.phase_name || 'No Phase';
          break;
        default:
          laneId = 'default';
          laneName = 'All Tasks';
      }

      if (!lanesMap.has(laneId)) {
        lanesMap.set(laneId, {
          id: laneId,
          name: laneName,
          color: laneColor,
          taskCount: 0,
          isCollapsed: false
        });
      }

      const lane = lanesMap.get(laneId)!;
      lane.taskCount++;
    });

    // Sort lanes by name (with priority having special order)
    return Array.from(lanesMap.values()).sort((a, b) => {
      if (swimlaneType === 'priority') {
        const order = ['critical', 'high', 'medium', 'low'];
        return order.indexOf(a.id) - order.indexOf(b.id);
      }
      return a.name.localeCompare(b.name);
    });
  }, [swimlaneType]);

  const swimlanes = useMemo(() => getSwimlanes(tasks), [tasks, getSwimlanes]);

  // Build columns from tasks - now after getSwimlanes is declared
  useEffect(() => {
    const tasksByStatus: Record<string, TaskWithLabels[]> = {};
    const storyPointsByStatus: Record<string, number> = {};

    defaultColumns.forEach(col => {
      tasksByStatus[col.id] = [];
      storyPointsByStatus[col.id] = 0;
    });

    tasks.forEach(task => {
      // Apply filters
      if (filterLabel && (!task.labels || !task.labels.some(l => String(l.id) === filterLabel))) {
        return;
      }

      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
        storyPointsByStatus[task.status] += task.story_points || 0;
      }
    });

    setColumns(prev =>
      prev.map(col => ({
        ...col,
        tasks: tasksByStatus[col.id] || [],
        storyPoints: storyPointsByStatus[col.id] || 0
      }))
    );

    // Initialize all swimlanes as expanded
    if (swimlaneType !== 'none') {
      const lanes = getSwimlanes(tasks);
      setExpandedSwimlanes(new Set(lanes.map(l => l.id)));
    }
  }, [tasks, filterLabel, swimlaneType, getSwimlanes]);

  const getTasksForSwimlane = useCallback((laneId: string, columnTasks: TaskWithLabels[]): TaskWithLabels[] => {
    return columnTasks.filter(task => {
      switch (swimlaneType) {
        case 'assignee':
          return (task.assignee_id || 'unassigned') === laneId;
        case 'priority':
          return task.priority === laneId;
        case 'label':
          if (laneId === 'no-label') return !task.labels || task.labels.length === 0;
          return task.labels?.some(l => String(l.id) === laneId);
        case 'phase':
          return (task.phase_id || 'no-phase') === laneId;
        default:
          return true;
      }
    });
  }, [swimlaneType]);

  const handleDragStart = (e: React.DragEvent, task: TaskWithLabels) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus, swimlaneId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
    if (swimlaneId) setDragOverSwimlane(swimlaneId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
    setDragOverSwimlane(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverSwimlane(null);

    if (!draggedTask || draggedTask.status === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    // Check WIP limit
    const targetColumn = columns.find(c => c.id === targetColumnId);
    if (showWipLimits && targetColumn?.wipLimit && targetColumn.tasks.length >= targetColumn.wipLimit) {
      alert(`WIP limit of ${targetColumn.wipLimit} reached for "${targetColumn.title}". Complete or move existing tasks first.`);
      setDraggedTask(null);
      return;
    }

    // Optimistically update
    setTasks(prev =>
      prev.map(t => t.id === draggedTask.id ? { ...t, status: targetColumnId } : t)
    );

    try {
      const response = await fetch('/api/projects/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedTask.id, status: targetColumnId })
      });

      if (!response.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      fetchTasks();
    }

    setDraggedTask(null);
  };

  const handleQuickPriorityChange = async (taskId: string, priority: TaskPriority) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, priority } : t)
    );

    try {
      await fetch('/api/projects/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, priority })
      });
    } catch (err) {
      console.error('Failed to update priority:', err);
      fetchTasks();
    }
  };

  const handleQuickLabelToggle = async (taskId: string, labelId: string, isAdding: boolean) => {
    try {
      if (isAdding) {
        await fetch('/api/projects/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, label_id: labelId })
        });
      } else {
        await fetch(`/api/projects/labels?id=${labelId}&task_id=${taskId}`, {
          method: 'DELETE'
        });
      }
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle label:', err);
    }
  };

  const toggleSwimlane = (laneId: string) => {
    setExpandedSwimlanes(prev => {
      const next = new Set(prev);
      if (next.has(laneId)) {
        next.delete(laneId);
      } else {
        next.add(laneId);
      }
      return next;
    });
  };

  const toggleColumn = (columnId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const openCreateModal = (columnId: TaskStatus) => {
    setCreateInColumn(columnId);
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchTasks();
  };

  const renderTaskCard = (task: TaskWithLabels) => (
    <div
      key={task.id}
      draggable
      onDragStart={(e) => handleDragStart(e, task)}
      className={`cursor-grab active:cursor-grabbing ${
        draggedTask?.id === task.id ? 'opacity-50' : ''
      }`}
    >
      <div className="bg-white dark:bg-gray-750 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-all group">
        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.slice(0, 3).map(label => (
              <span
                key={label.id}
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h4
          className="font-medium text-gray-900 dark:text-white text-sm mb-2 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400"
          onClick={() => onTaskClick?.(task)}
        >
          {task.title}
        </h4>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            {/* Priority indicator */}
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: priorityLabels[task.priority]?.color || '#6B7280' }}
              title={priorityLabels[task.priority]?.name || task.priority}
            />

            {/* Story points */}
            {task.story_points && (
              <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                {task.story_points} SP
              </span>
            )}

            {/* Due date */}
            {task.due_date && (
              <span className={`flex items-center gap-1 ${
                new Date(task.due_date) < new Date() ? 'text-red-500' : ''
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Assignee avatar */}
          {task.assignee_name && (
            <div
              className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium"
              title={task.assignee_name}
            >
              {task.assignee_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Quick actions - visible on hover */}
        {enableQuickActions && (
          <div className="hidden group-hover:flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQuickEditTask(task);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              title="Quick edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleQuickPriorityChange(task.id, task.priority === 'high' ? 'medium' : 'high');
              }}
              className="p-1 text-gray-400 hover:text-orange-500 rounded"
              title="Toggle priority"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick?.(task);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              title="View details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderColumn = (column: KanbanColumn, swimlaneId?: string) => {
    const isCollapsed = collapsedColumns.has(column.id);
    const columnTasks = swimlaneId ? getTasksForSwimlane(swimlaneId, column.tasks) : column.tasks;
    const isOverWipLimit = showWipLimits && column.wipLimit && columnTasks.length > column.wipLimit;
    const isAtWipLimit = showWipLimits && column.wipLimit && columnTasks.length === column.wipLimit;

    if (isCollapsed) {
      return (
        <div
          key={`${column.id}-${swimlaneId || 'all'}`}
          className="flex-shrink-0 w-12 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl cursor-pointer"
          onClick={() => toggleColumn(column.id)}
        >
          <div className="p-2 flex flex-col items-center">
            <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: column.color }} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 writing-mode-vertical transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
              {column.title}
            </span>
            <span className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {columnTasks.length}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${column.id}-${swimlaneId || 'all'}`}
        className={`flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors ${
          dragOverColumn === column.id && (!swimlaneId || dragOverSwimlane === swimlaneId)
            ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : ''
        } ${isOverWipLimit ? 'ring-2 ring-red-400' : ''}`}
        onDragOver={(e) => handleDragOver(e, column.id, swimlaneId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        {/* Column Header */}
        {!swimlaneId && (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleColumn(column.id)}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{column.title}</h3>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                isOverWipLimit
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : isAtWipLimit
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {columnTasks.length}
                {column.wipLimit && ` / ${column.wipLimit}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {column.storyPoints !== undefined && column.storyPoints > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                  {column.storyPoints} SP
                </span>
              )}
              <button
                onClick={() => openCreateModal(column.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className={`flex-1 overflow-y-auto px-4 pb-4 space-y-3 ${swimlaneId ? 'pt-2' : ''}`}>
          {columnTasks.length === 0 ? (
            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
              {swimlaneId ? 'No tasks' : (
                <>
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Drop tasks here
                </>
              )}
            </div>
          ) : (
            columnTasks.map(task => renderTaskCard(task))
          )}
        </div>

        {/* Add Task Button */}
        {!swimlaneId && (
          <div className="p-4 pt-0">
            <button
              onClick={() => openCreateModal(column.id)}
              className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          {/* Label filter */}
          <select
            value={filterLabel || ''}
            onChange={(e) => setFilterLabel(e.target.value || null)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">All Labels</option>
            {availableLabels.map(label => (
              <option key={label.id} value={label.id}>{label.name}</option>
            ))}
          </select>

          {/* Swimlane indicator */}
          {swimlaneType !== 'none' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Grouped by: <span className="font-medium capitalize">{swimlaneType}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{tasks.length} tasks</span>
          {showWipLimits && (
            <span className="text-xs text-gray-400">• WIP limits enabled</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Board */}
      {swimlaneType === 'none' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {columns.map(column => renderColumn(column))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {swimlanes.map(lane => (
            <div key={lane.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Swimlane header */}
              <button
                onClick={() => toggleSwimlane(lane.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedSwimlanes.has(lane.id) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {lane.color && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lane.color }} />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{lane.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({lane.taskCount} tasks)
                  </span>
                </div>
              </button>

              {/* Swimlane content */}
              {expandedSwimlanes.has(lane.id) && (
                <div className="flex gap-4 overflow-x-auto p-4 bg-white dark:bg-gray-900">
                  {columns.map(column => renderColumn(column, lane.id))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create New Task</h2>
          <TaskForm
            projectId={projectId}
            phaseId={phaseId}
            initialData={{ title: '', status: createInColumn }}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateModal(false)}
          />
        </div>
      </Modal>

      {/* Quick Edit Modal */}
      {quickEditTask && (
        <Modal isOpen={true} onClose={() => setQuickEditTask(null)} className="max-w-md">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Edit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={quickEditTask.priority}
                  onChange={(e) => {
                    const newPriority = e.target.value as TaskPriority;
                    handleQuickPriorityChange(quickEditTask.id, newPriority);
                    setQuickEditTask({ ...quickEditTask, priority: newPriority });
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Labels
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map(label => {
                    const hasLabel = quickEditTask.labels?.some(l => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleQuickLabelToggle(quickEditTask.id, String(label.id), !hasLabel)}
                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all ${
                          hasLabel
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        style={hasLabel ? { backgroundColor: label.color } : {}}
                      >
                        {hasLabel && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setQuickEditTask(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onTaskClick?.(quickEditTask);
                  setQuickEditTask(null);
                }}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                Full Edit
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
