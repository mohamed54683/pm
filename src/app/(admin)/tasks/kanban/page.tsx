"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Task {
  id: number;
  uuid: string;
  task_key: string;
  title: string;
  priority: string;
  status: string;
  assignee_name: string;
  story_points: number;
}

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-400' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'in_review', title: 'In Review', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' },
];

const priorityColors: Record<string, string> = {
  low: 'border-l-blue-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks?limit=200', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = useCallback(async (newStatus: string) => {
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === draggedTask.id ? { ...t, status: newStatus } : t
    ));

    try {
      await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert on error
      loadTasks();
    }

    setDraggedTask(null);
  }, [draggedTask]);

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Kanban Board</h1>
        <p className="page-subtitle">
          Drag and drop tasks to update status
        </p>
      </div>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            const totalPoints = columnTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

            return (
              <div
                key={column.id}
                className="w-80 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${column.color}`}></div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{column.title}</h3>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {columnTasks.length}
                    </span>
                  </div>
                  {totalPoints > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{totalPoints} SP</span>
                  )}
                </div>

                {/* Column Content */}
                <div className="space-y-3 rounded-lg bg-gray-100 p-3 min-h-[500px] dark:bg-gray-800/50">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className={`cursor-grab rounded-lg border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 ${priorityColors[task.priority] || 'border-l-gray-300'} ${
                        draggedTask?.id === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {task.task_key}
                        </span>
                        {task.story_points && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {task.story_points}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {task.title}
                      </p>
                      {task.assignee_name && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-medium">
                            {task.assignee_name.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {task.assignee_name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <p className="text-sm text-gray-400">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
