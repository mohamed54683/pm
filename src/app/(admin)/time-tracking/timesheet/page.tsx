"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Project {
  id: number;
  name: string;
  code: string;
}

interface Task {
  id: number;
  task_key: string;
  title: string;
}

interface TimeEntry {
  id: number;
  uuid: string;
  task_id: number;
  task_key: string;
  task_title: string;
  project_id: number;
  project_name: string;
  project_code: string;
  user_id: number;
  user_first_name: string;
  user_last_name: string;
  hours: number;
  work_date: string;
  description: string;
  billable: boolean;
  status: string;
  created_at: string;
}

interface TimeSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  pendingHours: number;
  approvedHours: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString().split('T')[0],
    end: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 6)).toISOString().split('T')[0],
  });
  const [groupBy, setGroupBy] = useState<'date' | 'project' | 'task'>('date');
  const [newEntry, setNewEntry] = useState({
    project_id: '',
    task_id: '',
    hours: '',
    work_date: new Date().toISOString().split('T')[0],
    description: '',
    billable: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTimeEntries();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async (projectId: string) => {
    try {
      const response = await fetch(`/api/tasks?project_id=${projectId}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.project_id || !newEntry.hours) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: parseInt(newEntry.project_id),
          task_id: newEntry.task_id ? parseInt(newEntry.task_id) : null,
          hours: parseFloat(newEntry.hours),
          work_date: newEntry.work_date,
          description: newEntry.description,
          billable: newEntry.billable
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowLogModal(false);
        setNewEntry({
          project_id: '',
          task_id: '',
          hours: '',
          work_date: new Date().toISOString().split('T')[0],
          description: '',
          billable: true
        });
        loadTimeEntries();
      } else {
        alert(result.error || 'Failed to log time');
      }
    } catch (error) {
      console.error('Error logging time:', error);
      alert('Failed to log time');
    } finally {
      setSubmitting(false);
    }
  };

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      
      const response = await fetch(`/api/time-entries?${params}`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setEntries(result.data);
        calculateSummary(result.data);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: TimeEntry[]) => {
    const summary = data.reduce(
      (acc, entry) => {
        acc.totalHours += entry.hours;
        if (entry.billable) {
          acc.billableHours += entry.hours;
        } else {
          acc.nonBillableHours += entry.hours;
        }
        if (entry.status === 'approved') {
          acc.approvedHours += entry.hours;
        } else if (entry.status === 'submitted' || entry.status === 'draft') {
          acc.pendingHours += entry.hours;
        }
        return acc;
      },
      { totalHours: 0, billableHours: 0, nonBillableHours: 0, pendingHours: 0, approvedHours: 0 }
    );
    setSummary(summary);
  };

  const goToPreviousWeek = () => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() - 7);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const goToNextWeek = () => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() + 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() + 7);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const start = new Date(today.setDate(today.getDate() - today.getDay()));
    const end = new Date(new Date(start).setDate(start.getDate() + 6));
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const groupedEntries = React.useMemo(() => {
    if (groupBy === 'date') {
      return entries.reduce((acc, entry) => {
        const date = entry.work_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(entry);
        return acc;
      }, {} as Record<string, TimeEntry[]>);
    } else if (groupBy === 'project') {
      return entries.reduce((acc, entry) => {
        const key = `${entry.project_code} - ${entry.project_name}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
      }, {} as Record<string, TimeEntry[]>);
    } else {
      return entries.reduce((acc, entry) => {
        const key = `${entry.task_key} - ${entry.task_title}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
      }, {} as Record<string, TimeEntry[]>);
    }
  }, [entries, groupBy]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Log and manage your time entries
            </p>
          </div>
          <button 
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log Time
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Week Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </p>
            </div>
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToCurrentWeek}
              className="ml-2 rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="date">Date</option>
              <option value="project">Project</option>
              <option value="task">Task</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(summary.totalHours || 0).toFixed(1)}h</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4 shadow-sm dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-400">Billable</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{(summary.billableHours || 0).toFixed(1)}h</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 shadow-sm dark:bg-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Non-Billable</p>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{(summary.nonBillableHours || 0).toFixed(1)}h</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 shadow-sm dark:bg-amber-900/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">Pending</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{(summary.pendingHours || 0).toFixed(1)}h</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 shadow-sm dark:bg-blue-900/20">
              <p className="text-sm text-blue-600 dark:text-blue-400">Approved</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{(summary.approvedHours || 0).toFixed(1)}h</p>
            </div>
          </div>
        )}

        {/* Time Entries */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No time entries for this period</p>
            <button 
              onClick={() => setShowLogModal(true)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Log Your First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([group, groupEntries]) => {
              const groupTotal = groupEntries.reduce((sum, e) => sum + e.hours, 0);
              return (
                <div key={group} className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
                  <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {groupBy === 'date' ? formatDate(group) : group}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {groupTotal.toFixed(1)}h
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {groupEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex-1">
                          {groupBy !== 'task' && (
                            <p className="font-medium text-gray-900 dark:text-white">
                              <span className="text-blue-600">{entry.task_key}</span> {entry.task_title}
                            </p>
                          )}
                          {groupBy !== 'project' && (
                            <p className="text-sm text-gray-500">
                              {entry.project_code} - {entry.project_name}
                            </p>
                          )}
                          {groupBy !== 'date' && (
                            <p className="text-sm text-gray-500">{formatDate(entry.work_date)}</p>
                          )}
                          {entry.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-1">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">{entry.hours}h</p>
                            <div className="flex items-center gap-2">
                              {entry.billable && (
                                <span className="text-xs text-green-600">Billable</span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status]}`}>
                                {entry.status}
                              </span>
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Time Modal */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Log Time Entry</h2>
          <form onSubmit={handleLogTime} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={newEntry.project_id}
                onChange={(e) => {
                  setNewEntry({ ...newEntry, project_id: e.target.value, task_id: '' });
                  if (e.target.value) loadTasks(e.target.value);
                }}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task (Optional)</label>
              <select
                value={newEntry.task_id}
                onChange={(e) => setNewEntry({ ...newEntry, task_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={!newEntry.project_id}
              >
                <option value="">General project time</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.task_key} - {t.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours *</label>
                <input
                  type="number"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                  required
                  min="0.25"
                  step="0.25"
                  max="24"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={newEntry.work_date}
                  onChange={(e) => setNewEntry({ ...newEntry, work_date: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable"
                checked={newEntry.billable}
                onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="billable" className="text-sm text-gray-700 dark:text-gray-300">Billable time</label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowLogModal(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !newEntry.project_id || !newEntry.hours}>
                {submitting ? 'Saving...' : 'Log Time'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
