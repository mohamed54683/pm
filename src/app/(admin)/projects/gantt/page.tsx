"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

interface Task {
  id: number;
  uuid: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  assignee_names: string | null;
  parent_task_id: number | null;
  story_points: number | null;
}

interface Project {
  id: number;
  uuid: string;
  code: string;
  name: string;
}

const statusColors: Record<string, string> = {
  backlog: '#9CA3AF',
  todo: '#3B82F6',
  in_progress: '#F59E0B',
  in_review: '#8B5CF6',
  done: '#10B981',
  blocked: '#EF4444',
};

export default function GanttChartPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [startDate, setStartDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects?status=active', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/signin';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setProjects(result.data);
        setSelectedProject(result.data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = useCallback(async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks?projectId=${selectedProject}&limit=100`, { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/signin';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      const result = await response.json();
      if (result.success) {
        // Sort tasks by start date
        const sortedTasks = result.data.sort((a: Task, b: Task) => {
          const aStart = a.start_date ? new Date(a.start_date).getTime() : Date.now();
          const bStart = b.start_date ? new Date(b.start_date).getTime() : Date.now();
          return aStart - bStart;
        });
        setTasks(sortedTasks);
        
        // Set view start date to earliest task
        if (sortedTasks.length > 0) {
          const tasksWithDates = sortedTasks.filter((t: Task) => t.start_date);
          if (tasksWithDates.length > 0) {
            const earliest = new Date(tasksWithDates.reduce((min: string, t: Task) => 
              new Date(t.start_date!) < new Date(min) ? t.start_date! : min, 
              tasksWithDates[0].start_date!
            ));
            earliest.setDate(earliest.getDate() - 7);
            setStartDate(earliest);
          }
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    }
  }, [selectedProject, loadTasks]);

  // Generate date headers
  const getDates = () => {
    const dates: Date[] = [];
    const numDays = viewMode === 'day' ? 30 : viewMode === 'week' ? 90 : 180;
    
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getDates();
  
  const getColumnWidth = () => {
    switch (viewMode) {
      case 'day': return 40;
      case 'week': return 20;
      case 'month': return 8;
    }
  };

  const columnWidth = getColumnWidth();

  const getTaskBarPosition = (task: Task) => {
    const taskStart = task.start_date ? new Date(task.start_date) : new Date();
    const taskEnd = task.due_date ? new Date(task.due_date) : new Date(taskStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const daysDiff = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      left: Math.max(0, daysDiff * columnWidth),
      width: Math.max(columnWidth, duration * columnWidth),
    };
  };

  const formatDateHeader = (date: Date, index: number) => {
    if (viewMode === 'day') {
      return date.getDate();
    } else if (viewMode === 'week') {
      if (index % 7 === 0) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return '';
    } else {
      if (date.getDate() === 1) {
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      return '';
    }
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const scrollLeft = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() - (viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30));
    setStartDate(newStart);
  };

  const scrollRight = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + (viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30));
    setStartDate(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    setStartDate(today);
  };

  if (loading && tasks.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gantt Chart</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visual project timeline and task scheduling
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={scrollLeft}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
            >
              Today
            </button>
            <button
              onClick={scrollRight}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Task List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Name</span>
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 230px)' }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                style={{ paddingLeft: '16px' }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusColors[task.status] }}
                ></span>
                <span className="text-xs text-blue-600">{task.code}</span>
                <span className="flex-1 truncate text-sm text-gray-900 dark:text-white" title={task.title}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto" ref={containerRef}>
          {/* Date Headers */}
          <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
            {dates.map((date, index) => (
              <div
                key={index}
                className={`flex-shrink-0 border-r border-gray-100 py-3 text-center text-xs dark:border-gray-600 ${
                  isToday(date) ? 'bg-blue-100 dark:bg-blue-900/30' : isWeekend(date) ? 'bg-gray-100 dark:bg-gray-600' : ''
                }`}
                style={{ width: `${columnWidth}px` }}
              >
                {formatDateHeader(date, index)}
              </div>
            ))}
          </div>

          {/* Task Bars */}
          <div className="relative" style={{ width: `${dates.length * columnWidth}px` }}>
            {/* Grid Lines */}
            <div className="absolute inset-0 flex">
              {dates.map((date, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 border-r border-gray-100 dark:border-gray-700 ${
                    isToday(date) ? 'bg-blue-50 dark:bg-blue-900/10' : isWeekend(date) ? 'bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                  style={{ width: `${columnWidth}px`, height: `${tasks.length * 40}px` }}
                ></div>
              ))}
            </div>

            {/* Today Line */}
            {dates.some(d => isToday(d)) && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{
                  left: `${dates.findIndex(d => isToday(d)) * columnWidth + columnWidth / 2}px`,
                  height: `${tasks.length * 40}px`
                }}
              ></div>
            )}

            {/* Task Bars */}
            {tasks.map((task, index) => {
              const pos = getTaskBarPosition(task);
              return (
                <div
                  key={task.id}
                  className="absolute flex items-center"
                  style={{
                    top: `${index * 40 + 8}px`,
                    left: `${pos.left}px`,
                    width: `${pos.width}px`,
                    height: '24px',
                  }}
                >
                  <div
                    className="relative h-full w-full rounded cursor-pointer group"
                    style={{ backgroundColor: statusColors[task.status] }}
                    title={`${task.title} (${task.progress || 0}%)`}
                  >
                    {/* Progress */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-l bg-white/30"
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                    
                    {/* Label */}
                    {pos.width > 60 && (
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
                        {task.title}
                      </span>
                    )}

                    {/* Tooltip */}
                    <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-30 w-48 rounded-lg bg-gray-900 p-2 text-xs text-white shadow-lg">
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-gray-300">
                        {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'No start'} - {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No end'}
                      </p>
                      <p className="text-gray-300">Progress: {task.progress || 0}%</p>
                      {task.assignee_names && (
                        <p className="text-gray-300">Assignee: {task.assignee_names}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
