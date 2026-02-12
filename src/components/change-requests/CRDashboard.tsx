"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DashboardData {
  summary: {
    total: number;
    draft: number;
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
    implemented: number;
    closed: number;
  };
  statusBreakdown: Array<{ status: string; count: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  monthlyTrend: Array<{ month: string; submitted: number; approved: number; rejected: number }>;
  avgApprovalDays: number;
  pendingMyApproval: number;
  myRequests: { total: number; draft: number; pending: number; approved: number; rejected: number };
  recentRequests: Array<any>;
  topProjects: Array<any>;
  impactAnalysis: Array<any>;
}

const statusColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-300' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-400' },
  pending_approval: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400' },
  implemented: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-400' },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-500', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-500' },
};

const priorityColors: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-blue-600 dark:text-blue-400',
  low: 'text-gray-600 dark:text-gray-400',
};

export default function ChangeRequestsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/change-requests/dashboard', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error || 'Failed to load dashboard'}</p>
      </div>
    );
  }

  // Chart configurations
  const statusChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Implemented'],
    colors: ['#9CA3AF', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'],
    legend: { position: 'bottom', labels: { colors: '#6B7280' } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '70%' } } },
    theme: { mode: 'light' }
  };

  const statusChartSeries = [
    data.summary.draft || 0,
    data.summary.submitted || 0,
    data.summary.under_review || 0,
    data.summary.approved || 0,
    data.summary.rejected || 0,
    data.summary.implemented || 0
  ];

  const trendChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    colors: ['#3B82F6', '#10B981', '#EF4444'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
    xaxis: { 
      categories: data.monthlyTrend.map(m => m.month),
      labels: { style: { colors: '#6B7280' } }
    },
    yaxis: { labels: { style: { colors: '#6B7280' } } },
    legend: { position: 'top', labels: { colors: '#6B7280' } },
    grid: { borderColor: '#E5E7EB' },
    dataLabels: { enabled: false }
  };

  const trendChartSeries = [
    { name: 'Submitted', data: data.monthlyTrend.map(m => m.submitted) },
    { name: 'Approved', data: data.monthlyTrend.map(m => m.approved) },
    { name: 'Rejected', data: data.monthlyTrend.map(m => m.rejected) }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl text-white">
        <div>
          <h2 className="text-xl font-bold">Change Requests Overview</h2>
          <p className="text-brand-100 text-sm">Track and manage all project change requests</p>
        </div>
        <div className="flex items-center gap-3">
          {data.pendingMyApproval > 0 && (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <span className="text-2xl font-bold">{data.pendingMyApproval}</span>
              <span className="text-sm">Pending My Approval</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'Total', value: data.summary.total, icon: '📋', color: 'from-gray-500 to-gray-600' },
          { label: 'Draft', value: data.summary.draft, icon: '📝', color: 'from-gray-400 to-gray-500' },
          { label: 'Submitted', value: data.summary.submitted, icon: '📤', color: 'from-blue-400 to-blue-500' },
          { label: 'Under Review', value: data.summary.under_review, icon: '🔍', color: 'from-yellow-400 to-yellow-500' },
          { label: 'Approved', value: data.summary.approved, icon: '✅', color: 'from-green-400 to-green-500' },
          { label: 'Rejected', value: data.summary.rejected, icon: '❌', color: 'from-red-400 to-red-500' },
          { label: 'Implemented', value: data.summary.implemented, icon: '🚀', color: 'from-purple-400 to-purple-500' },
          { label: 'Closed', value: data.summary.closed, icon: '🔒', color: 'from-gray-400 to-gray-500' },
        ].map((item) => (
          <div key={item.label} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${item.color} opacity-10 rounded-bl-full`}></div>
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="page-title">{item.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h3>
          {typeof window !== 'undefined' && (
            <ApexChart
              options={statusChartOptions}
              series={statusChartSeries}
              type="donut"
              height={280}
            />
          )}
        </div>

        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Trend</h3>
          {typeof window !== 'undefined' && data.monthlyTrend.length > 0 ? (
            <ApexChart
              options={trendChartOptions}
              series={trendChartSeries}
              type="area"
              height={280}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Metrics & My Requests Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg. Approval Time</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {Math.round(data.avgApprovalDays)} days
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Approval Rate</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {data.summary.approved + data.summary.rejected > 0 
                  ? Math.round((data.summary.approved / (data.summary.approved + data.summary.rejected)) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Implementation Rate</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {data.summary.approved > 0 
                  ? Math.round((data.summary.implemented / data.summary.approved) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* My Requests Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Requests</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <div className="page-title">{data.myRequests.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.myRequests.pending}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.myRequests.approved}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Approved</div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.myRequests.rejected}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Rejected</div>
            </div>
          </div>
        </div>

        {/* Top Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Projects</h3>
          {data.topProjects.length > 0 ? (
            <div className="space-y-3">
              {data.topProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{project.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {project.total_requests}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No project data</div>
          )}
        </div>
      </div>

      {/* Recent Change Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">Recent Change Requests</h3>
          <a href="/changes" className="text-sm text-brand-500 hover:text-brand-600">View All →</a>
        </div>
        {data.recentRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requester</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.recentRequests.map((cr) => {
                  const statusStyle = statusColors[cr.status] || statusColors.draft;
                  return (
                    <tr key={cr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-brand-600 dark:text-brand-400">{cr.change_key}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 dark:text-white">{cr.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{cr.project_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.darkBg} ${statusStyle.darkText}`}>
                          {cr.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium capitalize ${priorityColors[cr.priority]}`}>
                          {cr.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{cr.requester_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(cr.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No change requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
