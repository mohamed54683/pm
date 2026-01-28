"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, ProjectPhase, Task, Milestone } from '@/types/projects';

interface GanttChartProps {
  projectId: string;
  project?: Project;
}

type ViewMode = 'day' | 'week' | 'month';

const viewModeConfig = {
  day: { columnWidth: 40, format: 'dd', headerFormat: 'MMM dd' },
  week: { columnWidth: 100, format: 'Week', headerFormat: 'MMM dd' },
  month: { columnWidth: 150, format: 'MMM', headerFormat: 'MMM yyyy' }
};

export default function GanttChart({ projectId, project: initialProject }: GanttChartProps) {
  const [project, setProject] = useState<Project | null>(initialProject || null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch project with phases
      const projectRes = await fetch(`/api/projects?id=${projectId}`);
      const projectData = await projectRes.json();
      if (projectData.success) {
        setProject(projectData.data);
        setPhases(projectData.data.phases || []);
        setMilestones(projectData.data.milestones || []);
        // Expand all phases by default
        setExpandedPhases(new Set((projectData.data.phases || []).map((p: ProjectPhase) => p.id)));
      }

      // Fetch tasks
      const tasksRes = await fetch(`/api/projects/tasks?project_id=${projectId}&limit=100`);
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        setTasks(tasksData.data);
      }
    } catch (err) {
      console.error('Failed to fetch Gantt data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate date range
  const getDateRange = () => {
    const allDates: Date[] = [];

    if (project?.start_date) allDates.push(new Date(project.start_date));
    if (project?.end_date) allDates.push(new Date(project.end_date));

    phases.forEach(phase => {
      if (phase.start_date) allDates.push(new Date(phase.start_date));
      if (phase.end_date) allDates.push(new Date(phase.end_date));
    });

    tasks.forEach(task => {
      if (task.start_date) allDates.push(new Date(task.start_date));
      if (task.due_date) allDates.push(new Date(task.due_date));
    });

    milestones.forEach(m => {
      if (m.due_date) allDates.push(new Date(m.due_date));
    });

    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0)
      };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    return { start: minDate, end: maxDate };
  };

  const dateRange = getDateRange();

  // Generate time columns based on view mode
  const getTimeColumns = () => {
    const columns: { date: Date; label: string; isWeekend: boolean }[] = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;
      let label = '';

      if (viewMode === 'day') {
        label = current.getDate().toString();
      } else if (viewMode === 'week') {
        label = `${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        label = current.toLocaleDateString('en-US', { month: 'short' });
      }

      columns.push({ date: new Date(current), label, isWeekend });

      if (viewMode === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return columns;
  };

  const timeColumns = getTimeColumns();
  const columnWidth = viewModeConfig[viewMode].columnWidth;
  const totalWidth = timeColumns.length * columnWidth;

  // Calculate bar position and width
  const getBarStyle = (startDate?: string, endDate?: string) => {
    if (!startDate) return { left: 0, width: 0, visible: false };

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);

    const rangeStart = dateRange.start.getTime();
    const rangeEnd = dateRange.end.getTime();
    const totalDuration = rangeEnd - rangeStart;

    const barStart = start.getTime() - rangeStart;
    const barEnd = end.getTime() - rangeStart;

    const left = (barStart / totalDuration) * totalWidth;
    const width = Math.max(((barEnd - barStart) / totalDuration) * totalWidth, 20);

    return { left, width, visible: true };
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: '#9CA3AF',
      in_progress: '#3B82F6',
      in_review: '#8B5CF6',
      completed: '#10B981',
      on_hold: '#F59E0B',
      cancelled: '#EF4444',
      blocked: '#F97316'
    };
    return colors[status] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Timeline</h3>
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm capitalize ${
                  viewMode === mode
                    ? 'bg-brand-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rotate-45 bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Milestone</span>
          </div>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="flex overflow-hidden" ref={containerRef}>
        {/* Left Panel - Item Names */}
        <div className="flex-shrink-0 w-64 border-r border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="h-12 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center px-4">
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Name</span>
          </div>

          {/* Items */}
          <div className="overflow-y-auto max-h-[500px]">
            {/* Project */}
            <div className="h-10 flex items-center px-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                📁 {project?.name}
              </span>
            </div>

            {/* Phases and Tasks */}
            {phases.map(phase => (
              <React.Fragment key={phase.id}>
                {/* Phase */}
                <div
                  className="h-10 flex items-center px-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => togglePhase(phase.id)}
                >
                  <svg
                    className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${expandedPhases.has(phase.id) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {phase.name}
                  </span>
                </div>

                {/* Tasks in Phase */}
                {expandedPhases.has(phase.id) &&
                  tasks
                    .filter(t => t.phase_id === phase.id)
                    .map(task => (
                      <div
                        key={task.id}
                        className="h-10 flex items-center pl-10 pr-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {task.title}
                        </span>
                      </div>
                    ))}
              </React.Fragment>
            ))}

            {/* Tasks without phase */}
            {tasks.filter(t => !t.phase_id).map(task => (
              <div
                key={task.id}
                className="h-10 flex items-center px-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate pl-6">
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: totalWidth }}>
            {/* Time Header */}
            <div className="h-12 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex">
              {timeColumns.map((col, idx) => (
                <div
                  key={idx}
                  className={`flex-shrink-0 flex items-center justify-center border-r border-gray-200 dark:border-gray-600 text-xs font-medium ${
                    col.isWeekend && viewMode === 'day' ? 'bg-gray-100 dark:bg-gray-600' : ''
                  } text-gray-600 dark:text-gray-300`}
                  style={{ width: columnWidth }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Timeline Rows */}
            <div className="relative overflow-y-auto max-h-[500px]">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {timeColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`flex-shrink-0 border-r border-gray-100 dark:border-gray-700 ${
                      col.isWeekend && viewMode === 'day' ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                    }`}
                    style={{ width: columnWidth }}
                  />
                ))}
              </div>

              {/* Today Line */}
              {(() => {
                const today = new Date();
                if (today >= dateRange.start && today <= dateRange.end) {
                  const position = ((today.getTime() - dateRange.start.getTime()) / 
                    (dateRange.end.getTime() - dateRange.start.getTime())) * totalWidth;
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: position }}
                    >
                      <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  );
                }
                return null;
              })()}

              {/* Rows */}
              {/* Project Row */}
              <div className="h-10 relative border-b border-gray-100 dark:border-gray-700">
                {(() => {
                  const style = getBarStyle(project?.start_date, project?.end_date);
                  if (!style.visible) return null;
                  return (
                    <div
                      className="absolute top-2 h-6 rounded-lg shadow-sm"
                      style={{
                        left: style.left,
                        width: style.width,
                        backgroundColor: project?.color || '#3B82F6'
                      }}
                    >
                      <div
                        className="h-full rounded-lg bg-white/30"
                        style={{ width: `${project?.progress_percentage || 0}%` }}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Phase and Task Rows */}
              {phases.map(phase => (
                <React.Fragment key={phase.id}>
                  {/* Phase Row */}
                  <div className="h-10 relative border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30">
                    {(() => {
                      const style = getBarStyle(phase.start_date, phase.end_date);
                      if (!style.visible) return null;
                      return (
                        <div
                          className="absolute top-2 h-6 rounded-md shadow-sm"
                          style={{
                            left: style.left,
                            width: style.width,
                            backgroundColor: phase.color || '#6366F1'
                          }}
                        >
                          <div
                            className="h-full rounded-md bg-white/30"
                            style={{ width: `${phase.progress_percentage}%` }}
                          />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Task Rows */}
                  {expandedPhases.has(phase.id) &&
                    tasks
                      .filter(t => t.phase_id === phase.id)
                      .map(task => (
                        <div key={task.id} className="h-10 relative border-b border-gray-100 dark:border-gray-700">
                          {(() => {
                            const style = getBarStyle(task.start_date, task.due_date);
                            if (!style.visible) return null;
                            return (
                              <div
                                className="absolute top-2.5 h-5 rounded shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  left: style.left,
                                  width: style.width,
                                  backgroundColor: getStatusColor(task.status)
                                }}
                                title={`${task.title} (${task.status})`}
                              >
                                <div
                                  className="h-full rounded bg-white/30"
                                  style={{ width: `${task.progress_percentage}%` }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                </React.Fragment>
              ))}

              {/* Tasks without phase */}
              {tasks.filter(t => !t.phase_id).map(task => (
                <div key={task.id} className="h-10 relative border-b border-gray-100 dark:border-gray-700">
                  {(() => {
                    const style = getBarStyle(task.start_date, task.due_date);
                    if (!style.visible) return null;
                    return (
                      <div
                        className="absolute top-2.5 h-5 rounded shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          left: style.left,
                          width: style.width,
                          backgroundColor: getStatusColor(task.status)
                        }}
                        title={`${task.title} (${task.status})`}
                      >
                        <div
                          className="h-full rounded bg-white/30"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                    );
                  })()}
                </div>
              ))}

              {/* Milestones */}
              {milestones.map(milestone => {
                const style = getBarStyle(milestone.due_date, milestone.due_date);
                if (!style.visible) return null;
                return (
                  <div
                    key={milestone.id}
                    className="absolute w-4 h-4 rotate-45 cursor-pointer z-20"
                    style={{
                      left: style.left - 8,
                      top: 8,
                      backgroundColor: milestone.status === 'completed' ? '#10B981' : 
                        milestone.status === 'overdue' ? '#EF4444' : '#F59E0B'
                    }}
                    title={`${milestone.name} - ${new Date(milestone.due_date).toLocaleDateString()}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
