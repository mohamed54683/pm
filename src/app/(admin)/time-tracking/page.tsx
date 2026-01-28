"use client";

import React, { useState, useEffect } from 'react';
import { TimeEntry } from '@/types/projects-enhanced';

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('week');
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        const params = new URLSearchParams();
        
        // Calculate date range based on filter
        const now = new Date();
        let startDate: Date;
        switch (filterPeriod) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        
        params.append('start_date', startDate.toISOString().split('T')[0]);
        params.append('limit', '100');

        const res = await fetch(`/api/projects/time-entries?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setEntries(data.data);
          // Calculate total hours
          const total = data.data.reduce((sum: number, entry: TimeEntry) => {
            return sum + (entry.duration_minutes || 0);
          }, 0);
          setTotalHours(Math.round(total / 60 * 10) / 10);
        }
      } catch (err) {
        console.error('Failed to fetch time entries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeEntries();
  }, [filterPeriod]);

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View all time entries across projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-lg">
            <span className="text-sm text-brand-600 dark:text-brand-400">Total: </span>
            <span className="font-bold text-brand-700 dark:text-brand-300">{totalHours} hours</span>
          </div>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No time entries found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Start tracking time from project pages
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Billable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {new Date(entry.start_time).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {entry.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {entry.project_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {entry.task_title || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-medium">
                    {formatDuration(entry.duration_minutes || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.is_billable ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
