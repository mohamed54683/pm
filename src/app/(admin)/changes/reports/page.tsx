"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type ReportType = 'summary' | 'approval_history' | 'implementation' | 'cycle_time' | 'requester_activity';

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function CRReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, dateRange, projectId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?limit=100');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      if (projectId) params.append('projectId', projectId);

      const response = await fetch(`/api/change-requests/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format
      });
      if (projectId) params.append('projectId', projectId);

      const response = await fetch(`/api/change-requests/reports?${params}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cr-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cr-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setExporting(false);
    }
  };

  const reportTypes = [
    { value: 'summary', label: 'Summary Report', icon: '📊', description: 'Overall CR statistics and trends' },
    { value: 'approval_history', label: 'Approval History', icon: '✅', description: 'Detailed approval decisions and timelines' },
    { value: 'implementation', label: 'Implementation Status', icon: '🚀', description: 'Approved CRs awaiting or completed implementation' },
    { value: 'cycle_time', label: 'Cycle Time Analysis', icon: '⏱️', description: 'Time analysis from creation to completion' },
    { value: 'requester_activity', label: 'Requester Activity', icon: '👥', description: 'CR submissions by user' }
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="Change Request Reports" />

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {reportTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setReportType(type.value as ReportType)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              reportType === type.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-2xl mb-2">{type.icon}</div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">{type.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="form-label">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || !reportData}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting || !reportData}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Report */}
          {reportType === 'summary' && reportData.summary && (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="page-title">{reportData.summary.total_requests || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{reportData.summary.draft_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Draft</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reportData.summary.submitted_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Submitted</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{reportData.summary.under_review_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Under Review</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.summary.approved_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Approved</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{reportData.summary.rejected_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Rejected</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{reportData.summary.implemented_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Implemented</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reportData.summary.closed_count || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Closed</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Category */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Category</h3>
                  {reportData.byCategory?.length > 0 ? (
                    <Chart
                      options={{
                        chart: { type: 'bar', toolbar: { show: false } },
                        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
                        xaxis: { categories: reportData.byCategory.map((c: any) => c.category) },
                        colors: ['#3B82F6'],
                        dataLabels: { enabled: true },
                        theme: { mode: 'dark' }
                      }}
                      series={[{ name: 'Count', data: reportData.byCategory.map((c: any) => c.count) }]}
                      type="bar"
                      height={250}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
                  )}
                </div>

                {/* Monthly Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Trend</h3>
                  {reportData.monthlyTrend?.length > 0 ? (
                    <Chart
                      options={{
                        chart: { type: 'area', toolbar: { show: false } },
                        xaxis: { categories: reportData.monthlyTrend.map((m: any) => m.month) },
                        colors: ['#3B82F6', '#10B981', '#EF4444'],
                        stroke: { curve: 'smooth', width: 2 },
                        fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
                        legend: { position: 'top' },
                        theme: { mode: 'dark' }
                      }}
                      series={[
                        { name: 'Total', data: reportData.monthlyTrend.map((m: any) => m.total) },
                        { name: 'Approved', data: reportData.monthlyTrend.map((m: any) => m.approved) },
                        { name: 'Rejected', data: reportData.monthlyTrend.map((m: any) => m.rejected) }
                      ]}
                      type="area"
                      height={250}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
                  )}
                </div>
              </div>

              {/* By Project Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Project</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Project</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total CRs</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Approved</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Approval Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.byProject?.map((project: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 px-4 text-gray-900 dark:text-white">{project.project_name || 'No Project'}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{project.cr_count}</td>
                          <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{project.approved_count}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              (project.approved_count / project.cr_count * 100) >= 70
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {((project.approved_count / project.cr_count) * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Approval History Report */}
          {reportType === 'approval_history' && (
            <>
              {/* Stats */}
              {reportData.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="page-title">{reportData.statistics.total_approvals || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Decisions</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.statistics.approved_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Approved</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{reportData.statistics.rejected_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Rejected</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{reportData.statistics.pending_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(reportData.statistics.avg_decision_hours || 0)}h</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Avg Response Time</div>
                  </div>
                </div>
              )}

              {/* Top Approvers */}
              {reportData.topApprovers?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Approvers</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Approver</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Decisions</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Approved</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Rejected</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topApprovers.map((approver: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-3 px-4">
                              <div className="text-gray-900 dark:text-white font-medium">{approver.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{approver.email}</div>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{approver.total_decisions}</td>
                            <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{approver.approved_count}</td>
                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{approver.rejected_count}</td>
                            <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{Math.round(approver.avg_response_hours || 0)}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Approval History Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Approvals</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">CR</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Step</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Approver</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.history?.slice(0, 50).map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 px-4">
                            <div className="text-gray-900 dark:text-white font-medium">{item.cr_number}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{item.cr_title}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.step_name}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.approver_name || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              item.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">
                            {item.decision_date ? new Date(item.decision_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Implementation Status Report */}
          {reportType === 'implementation' && (
            <>
              {/* Stats */}
              {reportData.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="page-title">{reportData.statistics.total_approved || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Approved</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{reportData.statistics.pending_implementation || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Pending Implementation</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{reportData.statistics.implemented || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Implemented</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.statistics.closed || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Closed</div>
                  </div>
                </div>
              )}

              {/* Implementation List */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Implementation Queue</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">CR</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Project</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Priority</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Days Waiting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 px-4">
                            <div className="text-gray-900 dark:text-white font-medium">{item.cr_number}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{item.title}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.project_name || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              item.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.status === 'implemented' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              item.status === 'closed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.status === 'approved' && (
                              <span className={`font-medium ${
                                item.days_since_approval > 14 ? 'text-red-600 dark:text-red-400' :
                                item.days_since_approval > 7 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-gray-600 dark:text-gray-300'
                              }`}>
                                {item.days_since_approval} days
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Cycle Time Analysis */}
          {reportType === 'cycle_time' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Priority */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cycle Time by Priority</h3>
                  {reportData.byPriority?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Priority</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Count</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Avg Draft</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Avg Review</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.byPriority.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                              <td className="py-3 px-4 capitalize text-gray-900 dark:text-white">{item.priority}</td>
                              <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{item.count}</td>
                              <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{Math.round(item.avg_draft_hours || 0)}h</td>
                              <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{Math.round(item.avg_review_hours || 0)}h</td>
                              <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">{Math.round(item.avg_total_hours || 0)}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
                  )}
                </div>

                {/* By Category */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cycle Time by Category</h3>
                  {reportData.byCategory?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Count</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Avg Draft</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Avg Review</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.byCategory.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                              <td className="py-3 px-4 capitalize text-gray-900 dark:text-white">{item.category}</td>
                              <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{item.count}</td>
                              <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{Math.round(item.avg_draft_hours || 0)}h</td>
                              <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{Math.round(item.avg_review_hours || 0)}h</td>
                              <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">{Math.round(item.avg_total_hours || 0)}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Requester Activity */}
          {reportType === 'requester_activity' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requester Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Requester</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Draft</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Pending</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Approved</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Rejected</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Last Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.requesters?.map((requester: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="text-gray-900 dark:text-white font-medium">{requester.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{requester.email}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">{requester.total_requests}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{requester.draft_count}</td>
                        <td className="py-3 px-4 text-right text-yellow-600 dark:text-yellow-400">{requester.pending_count}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{requester.approved_count}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{requester.rejected_count}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">
                          {requester.last_request_date ? new Date(requester.last_request_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No report data available</p>
        </div>
      )}
    </div>
  );
}
