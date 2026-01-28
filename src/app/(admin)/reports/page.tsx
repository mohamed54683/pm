"use client";
import React, { useState, useEffect } from "react";

interface ReportSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalHoursLogged: number;
  totalBudget: number;
  actualCost: number;
  openRisks: number;
  openIssues: number;
  avgProjectProgress: number;
}

interface ProjectStatusReport {
  id: number;
  code: string;
  name: string;
  status: string;
  health: string;
  priority: string;
  progress_percentage: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  estimated_budget: number;
  actual_cost: number;
  manager_name: string;
  open_tasks: number;
  completed_tasks: number;
  open_risks: number;
  open_issues: number;
}

interface EarnedValueReport {
  projectId: number;
  projectName: string;
  projectCode: string;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  planning: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-gray-100 text-gray-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const healthColors: Record<string, string> = {
  on_track: 'text-emerald-600 bg-emerald-50',
  at_risk: 'text-amber-600 bg-amber-50',
  off_track: 'text-red-600 bg-red-50',
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'project-status' | 'earned-value' | 'resource'>('summary');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatusReport[]>([]);
  const [earnedValue, setEarnedValue] = useState<EarnedValueReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=${activeTab.replace('-', '_')}`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        if (activeTab === 'summary') {
          setSummary(result.data);
        } else if (activeTab === 'project-status') {
          setProjectStatus(result.data);
        } else if (activeTab === 'earned-value') {
          setEarnedValue(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const tabs = [
    { id: 'summary', label: 'Executive Summary' },
    { id: 'project-status', label: 'Project Status' },
    { id: 'earned-value', label: 'Earned Value' },
    { id: 'resource', label: 'Resource Utilization' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Comprehensive project analytics and insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                // Export report as JSON
                const data = { summary, projectStatus, earnedValue };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button 
              onClick={() => loadData()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Executive Summary Tab */}
            {activeTab === 'summary' && summary && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalProjects}</p>
                      </div>
                      <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm">
                      <span className="text-emerald-600">{summary.activeProjects} Active</span>
                      <span className="text-blue-600">{summary.completedProjects} Completed</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalTasks}</p>
                      </div>
                      <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                        <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm">
                      <span className="text-emerald-600">{summary.completedTasks} Done</span>
                      <span className="text-red-600">{summary.overdueTasks} Overdue</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Budget vs Actual</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalBudget)}</p>
                      </div>
                      <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
                        <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-sm">
                      <span className={summary.actualCost > summary.totalBudget ? 'text-red-600' : 'text-emerald-600'}>
                        {formatCurrency(summary.actualCost)} Spent ({Math.round((summary.actualCost / summary.totalBudget) * 100)}%)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Hours Logged</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalHoursLogged.toFixed(0)}</p>
                      </div>
                      <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      Across all projects
                    </div>
                  </div>
                </div>

                {/* Risk & Issues Summary */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Risk & Issues Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                        <p className="text-sm text-red-600">Open Risks</p>
                        <p className="text-2xl font-bold text-red-700">{summary.openRisks}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                        <p className="text-sm text-amber-600">Open Issues</p>
                        <p className="text-2xl font-bold text-amber-700">{summary.openIssues}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Average Project Progress</h3>
                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 rounded-full border-8 border-blue-500" style={{
                        background: `conic-gradient(#3b82f6 ${summary.avgProjectProgress * 3.6}deg, #e5e7eb ${summary.avgProjectProgress * 3.6}deg)`
                      }}>
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-gray-800">
                          <span className="text-xl font-bold">{Math.round(summary.avgProjectProgress)}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Overall portfolio completion</p>
                        <p className="text-sm text-gray-400">Based on {summary.activeProjects} active projects</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Project Status Tab */}
            {activeTab === 'project-status' && (
              <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
                {projectStatus.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No projects found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Health</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Progress</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Budget</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tasks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Risks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Issues</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Manager</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {projectStatus.map((project) => (
                          <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="whitespace-nowrap px-4 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                              <p className="text-xs text-gray-500">{project.code}</p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[project.status]}`}>
                                {project.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${healthColors[project.health] || 'bg-gray-100 text-gray-600'}`}>
                                {project.health?.replace('_', ' ') || 'N/A'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                                  <div
                                    className="h-2 rounded-full bg-blue-500"
                                    style={{ width: `${project.progress_percentage || 0}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-500">{project.progress_percentage || 0}%</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <p className="text-gray-900 dark:text-white">{formatCurrency(project.estimated_budget || 0)}</p>
                              <p className={`text-xs ${(project.actual_cost || 0) > (project.estimated_budget || 0) ? 'text-red-500' : 'text-gray-500'}`}>
                                {formatCurrency(project.actual_cost || 0)} spent
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                              {project.completed_tasks}/{project.open_tasks + project.completed_tasks}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className={`text-sm ${project.open_risks > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                {project.open_risks}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className={`text-sm ${project.open_issues > 0 ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                                {project.open_issues}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                              {project.manager_name || 'Unassigned'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Earned Value Tab */}
            {activeTab === 'earned-value' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Earned Value Analysis (EVM)</h3>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Performance metrics for project cost and schedule tracking
                  </p>
                  
                  {earnedValue.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">No earned value data available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">BAC</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">PV</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">EV</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">AC</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">SPI</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">CPI</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">EAC</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">VAC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {earnedValue.map((ev) => (
                            <tr key={ev.projectId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="whitespace-nowrap px-4 py-3">
                                <p className="font-medium text-gray-900 dark:text-white">{ev.projectName}</p>
                                <p className="text-xs text-gray-500">{ev.projectCode}</p>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                                {formatCurrency(ev.bac)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                                {formatCurrency(ev.pv)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                                {formatCurrency(ev.ev)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                                {formatCurrency(ev.ac)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <span className={`text-sm font-medium ${ev.spi >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {ev.spi.toFixed(2)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <span className={`text-sm font-medium ${ev.cpi >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {ev.cpi.toFixed(2)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                                {formatCurrency(ev.eac)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <span className={`text-sm font-medium ${ev.vac >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatCurrency(ev.vac)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                  <h4 className="mb-4 font-medium text-gray-900 dark:text-white">EVM Metrics Legend</h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">BAC</p>
                      <p className="text-gray-500">Budget at Completion</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">PV</p>
                      <p className="text-gray-500">Planned Value</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">EV</p>
                      <p className="text-gray-500">Earned Value</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">AC</p>
                      <p className="text-gray-500">Actual Cost</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">SPI</p>
                      <p className="text-gray-500">Schedule Performance Index</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">CPI</p>
                      <p className="text-gray-500">Cost Performance Index</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">EAC</p>
                      <p className="text-gray-500">Estimate at Completion</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">VAC</p>
                      <p className="text-gray-500">Variance at Completion</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resource Utilization Tab */}
            {activeTab === 'resource' && (
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Resource Utilization</h3>
                <p className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Resource utilization report - see <a href="/resources/workload" className="text-blue-600 hover:underline">Workload Analysis</a> for detailed resource data
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
