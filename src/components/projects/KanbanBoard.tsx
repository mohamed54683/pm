"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, KanbanColumn } from '@/types/projects';
import TaskCard from './TaskCard';
import { Modal } from '@/components/ui/modal';
import TaskForm from './TaskForm';

interface KanbanBoardProps {
  projectId: string;
  phaseId?: string;
  onTaskClick?: (task: Task) => void;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'not_started', title: 'To Do', tasks: [], color: '#6B7280' },
  { id: 'in_progress', title: 'In Progress', tasks: [], color: '#3B82F6' },
  { id: 'in_review', title: 'In Review', tasks: [], color: '#8B5CF6' },
  { id: 'completed', title: 'Done', tasks: [], color: '#10B981' }
];

export default function KanbanBoard({ projectId, phaseId, onTaskClick }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<TaskStatus>('not_started');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      if (phaseId) params.append('phase_id', phaseId);
      params.append('limit', '100');

      const response = await fetch(`/api/projects/tasks?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Group tasks by status
        const tasksByStatus: Record<TaskStatus, Task[]> = {
          not_started: [],
          in_progress: [],
          in_review: [],
          completed: [],
          cancelled: [],
          blocked: []
        };

        data.data.forEach((task: Task) => {
          if (tasksByStatus[task.status]) {
            tasksByStatus[task.status].push(task);
          }
        });

        // Update columns with tasks
        setColumns(prev =>
          prev.map(col => ({
            ...col,
            tasks: tasksByStatus[col.id] || []
          }))
        );
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, phaseId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    // Optimistically update UI
    setColumns(prev =>
      prev.map(col => {
        if (col.id === draggedTask.status) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== draggedTask.id) };
        }
        if (col.id === targetColumnId) {
          return { ...col, tasks: [...col.tasks, { ...draggedTask, status: targetColumnId }] };
        }
        return col;
      })
    );

    // Update on server
    try {
      const response = await fetch('/api/projects/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedTask.id, status: targetColumnId })
      });

      if (!response.ok) {
        // Revert on failure
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      fetchTasks();
    }

    setDraggedTask(null);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistically update UI
    let movedTask: Task | undefined;

    setColumns(prev =>
      prev.map(col => {
        const taskIndex = col.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          movedTask = { ...col.tasks[taskIndex], status: newStatus };
          return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
        }
        if (col.id === newStatus && movedTask) {
          return { ...col, tasks: [...col.tasks, movedTask] };
        }
        return col;
      })
    );

    try {
      const response = await fetch('/api/projects/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus })
      });

      if (!response.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      fetchTasks();
    }
  };

  const openCreateModal = (columnId: TaskStatus) => {
    setCreateInColumn(columnId);
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchTasks();
  };

  if (loading && columns.every(c => c.tasks.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map(column => (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors ${
              dragOverColumn === column.id ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/20' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {column.title}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {column.tasks.length}
                </span>
              </div>
              <button
                onClick={() => openCreateModal(column.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {column.tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Drop tasks here
                </div>
              ) : (
                column.tasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className={`cursor-grab active:cursor-grabbing ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Add Task Button */}
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
          </div>
        ))}

        {/* Add Column (optional) */}
        <div className="flex-shrink-0 w-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex flex-col items-center gap-2 p-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">Add Column</span>
          </button>
        </div>
      </div>

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
    </div>
  );
}
