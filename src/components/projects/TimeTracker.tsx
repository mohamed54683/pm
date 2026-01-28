"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimeEntry } from '@/types/projects-enhanced';

interface TimeTrackerProps {
  projectId?: string;
  taskId?: string;
  userId?: string;
  onEntryCreated?: (entry: TimeEntry) => void;
}

interface ActiveTimer {
  id: string;
  task_id: string | null;
  task_title?: string;
  project_id: string;
  project_name?: string;
  start_time: string;
  description: string;
  elapsed: number;
}

export default function TimeTracker({
  projectId,
  taskId,
  userId: _userId,
  onEntryCreated
}: TimeTrackerProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [timerDescription, setTimerDescription] = useState('');
  const [manualEntry, setManualEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    minutes: '',
    description: '',
    billable: true
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      if (taskId) params.append('task_id', taskId);
      params.append('limit', '10');

      const response = await fetch(`/api/projects/time-entries?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRecentEntries(data.data);

        // Check for active timer
        const activeEntry = data.data.find((e: TimeEntry) => !e.end_time);
        if (activeEntry) {
          const elapsed = Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 1000);
          setActiveTimer({
            id: activeEntry.id,
            task_id: activeEntry.task_id,
            task_title: activeEntry.task_title,
            project_id: activeEntry.project_id,
            project_name: activeEntry.project_name,
            start_time: activeEntry.start_time,
            description: activeEntry.description || '',
            elapsed
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch time entries:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Update timer every second
  // Start interval when timer is active
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setActiveTimer(prev => prev ? { ...prev, elapsed: prev.elapsed + 1 } : null);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer?.id]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const startTimer = async () => {
    if (!projectId) {
      alert('Please select a project first');
      return;
    }

    try {
      const response = await fetch('/api/projects/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          task_id: taskId || null,
          description: timerDescription,
          start_timer: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setActiveTimer({
          id: data.data.id,
          task_id: data.data.task_id,
          project_id: data.data.project_id,
          start_time: data.data.start_time,
          description: timerDescription,
          elapsed: 0
        });
        setTimerDescription('');
      }
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    try {
      const response = await fetch('/api/projects/time-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTimer.id,
          stop_timer: true,
          description: activeTimer.description
        })
      });

      const data = await response.json();

      if (data.success) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setActiveTimer(null);
        fetchEntries();
        onEntryCreated?.(data.data);
      }
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      alert('Please select a project first');
      return;
    }

    const hours = parseInt(manualEntry.hours) || 0;
    const minutes = parseInt(manualEntry.minutes) || 0;
    const duration = hours * 60 + minutes;

    if (duration <= 0) {
      alert('Please enter a valid duration');
      return;
    }

    try {
      const response = await fetch('/api/projects/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          task_id: taskId || null,
          description: manualEntry.description,
          duration_minutes: duration,
          date: manualEntry.date,
          billable: manualEntry.billable
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowManualEntry(false);
        setManualEntry({
          date: new Date().toISOString().split('T')[0],
          hours: '',
          minutes: '',
          description: '',
          billable: true
        });
        fetchEntries();
        onEntryCreated?.(data.data);
      }
    } catch (err) {
      console.error('Failed to create time entry:', err);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;

    try {
      await fetch(`/api/projects/time-entries?id=${entryId}`, { method: 'DELETE' });
      fetchEntries();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Timer Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        {activeTimer ? (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                  {formatTime(activeTimer.elapsed)}
                </span>
              </div>
              <input
                type="text"
                value={activeTimer.description}
                onChange={(e) => setActiveTimer({ ...activeTimer, description: e.target.value })}
                placeholder="What are you working on?"
                className="mt-2 w-full bg-transparent border-none text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-0 p-0"
              />
              {activeTimer.task_title && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Task: {activeTimer.task_title}
                </p>
              )}
            </div>
            <button
              onClick={stopTimer}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={startTimer}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Start Timer
            </button>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Manual entry"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        )}

        {/* Manual Entry Form */}
        {showManualEntry && !activeTimer && (
          <form onSubmit={handleManualEntry} className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add Manual Entry</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={manualEntry.date}
                  onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={manualEntry.hours}
                    onChange={(e) => setManualEntry({ ...manualEntry, hours: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualEntry.minutes}
                    onChange={(e) => setManualEntry({ ...manualEntry, minutes: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={manualEntry.description}
                onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                placeholder="What did you work on?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={manualEntry.billable}
                  onChange={(e) => setManualEntry({ ...manualEntry, billable: e.target.checked })}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Billable
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualEntry(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  Add Entry
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Recent Entries */}
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Time Entries</h3>
        {recentEntries.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No time entries yet. Start the timer to track your work!
          </p>
        ) : (
          <div className="space-y-3">
            {recentEntries.filter(e => e.end_time).map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {entry.description || 'No description'}
                    </span>
                    {entry.is_billable && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                        Billable
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {entry.task_title && <span>📋 {entry.task_title}</span>}
                    <span>📅 {new Date(entry.start_time).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {entry.duration_minutes ? formatDuration(entry.duration_minutes) : '--'}
                  </span>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
