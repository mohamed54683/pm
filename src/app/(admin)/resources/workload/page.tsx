"use client";
import React, { useState, useEffect } from "react";

interface WorkloadResource {
  id: number;
  uuid: string;
  name: string;
  avatar_url: string;
  job_title: string;
  work_hours_per_day: number;
  work_days_per_week: number;
  capacity_hours: number;
  allocated_hours: number;
  logged_hours: number;
  in_progress_tasks: number;
  backlog_tasks: number;
  overdue_tasks: number;
  utilization_percentage: number;
  available_hours: number;
  status: string;
}

interface ProjectAllocation {
  id: number;
  code: string;
  name: string;
  status: string;
  team_size: number;
  total_estimated_hours: number;
  total_actual_hours: number;
}

interface Summary {
  totalResources: number;
  totalCapacity: number;
  totalAllocated: number;
  overallUtilization: number;
  overAllocatedCount: number;
  underUtilizedCount: number;
}

const statusColors: Record<string, string> = {
  optimal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'over-allocated': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'under-utilized': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const utilizationBarColor = (percent: number) => {
  if (percent > 100) return 'bg-red-500';
  if (percent > 80) return 'bg-amber-500';
  if (percent < 50) return 'bg-blue-400';
  return 'bg-emerald-500';
};

export default function WorkloadPage() {
  const [resources, setResources] = useState<WorkloadResource[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadWorkload();
  }, [dateRange]);

  const loadWorkload = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/resources/workload?${params}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setResources(result.data.resources);
        setProjectAllocations(result.data.projectAllocations);
        setSummary(result.data.summary);
      }
    } catch (error) {
      console.error('Error loading workload:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Resource Workload</h1>
            <p className="page-subtitle">
              Capacity planning and utilization analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="form-select"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="form-select"
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="page-subtitle">Resources</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.totalResources}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="page-subtitle">Total Capacity</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.totalCapacity}h</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="page-subtitle">Allocated</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.totalAllocated}h</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 shadow-sm dark:bg-blue-900/20">
              <p className="text-sm text-blue-600 dark:text-blue-400">Utilization</p>
              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{summary.overallUtilization}%</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">Over-Allocated</p>
              <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{summary.overAllocatedCount}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 shadow-sm dark:bg-amber-900/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">Under-Utilized</p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.underUtilizedCount}</p>
            </div>
          </div>
        )}

        {/* Workload Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Workload</h2>
          <div className="space-y-4">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                  {resource.name?.charAt(0)}
                </div>
                
                {/* Name & Title */}
                <div className="w-40 flex-shrink-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{resource.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{resource.job_title}</p>
                </div>

                {/* Utilization Bar */}
                <div className="flex-1">
                  <div className="h-6 w-full rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                    <div
                      className={`h-6 rounded-full ${utilizationBarColor(resource.utilization_percentage)} transition-all`}
                      style={{ width: `${Math.min(resource.utilization_percentage, 100)}%` }}
                    ></div>
                    {resource.utilization_percentage > 100 && (
                      <div
                        className="absolute top-0 h-6 bg-red-300 opacity-50"
                        style={{ left: '100%', width: `${resource.utilization_percentage - 100}%` }}
                      ></div>
                    )}
                  </div>
                </div>

                {/* Percentage */}
                <div className="w-16 text-right">
                  <span className={`font-semibold ${
                    resource.utilization_percentage > 100 ? 'text-red-600' :
                    resource.utilization_percentage > 80 ? 'text-amber-600' :
                    resource.utilization_percentage < 50 ? 'text-blue-600' :
                    'text-emerald-600'
                  }`}>
                    {resource.utilization_percentage}%
                  </span>
                </div>

                {/* Hours */}
                <div className="w-24 text-right text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(Number(resource.allocated_hours))}h / {Math.round(Number(resource.capacity_hours))}h
                </div>

                {/* Status Badge */}
                <span className={`w-28 text-center rounded-full px-2 py-1 text-xs font-medium ${statusColors[resource.status]}`}>
                  {resource.status.replace('-', ' ')}
                </span>

                {/* Task Info */}
                <div className="w-32 flex items-center gap-2 text-xs text-gray-500">
                  <span title="In Progress">{resource.in_progress_tasks} active</span>
                  {resource.overdue_tasks > 0 && (
                    <span className="text-red-500" title="Overdue">{resource.overdue_tasks} overdue</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Allocations */}
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="card-title">Project Allocations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Team Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estimated Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actual Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {projectAllocations.map((project) => {
                  const variance = (Number(project.total_estimated_hours) || 0) - (Number(project.total_actual_hours) || 0);
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                          <p className="text-xs text-gray-500">{project.code}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {project.team_size} members
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {Math.round(Number(project.total_estimated_hours) || 0)}h
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {Math.round(Number(project.total_actual_hours) || 0)}h
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`text-sm font-medium ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {variance >= 0 ? '+' : ''}{Math.round(variance)}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
