"use client";
import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  type: string;
  lastRun: string;
  schedule: string;
}

const reportTemplates: ReportTemplate[] = [
  { id: 1, name: 'Project Status Summary', description: 'Overview of all projects with status, progress, and key metrics', type: 'project', lastRun: '2026-01-28', schedule: 'Weekly' },
  { id: 2, name: 'Resource Utilization', description: 'Team member workload and allocation across projects', type: 'resource', lastRun: '2026-01-27', schedule: 'Monthly' },
  { id: 3, name: 'Task Completion Trend', description: 'Historical analysis of task completion rates', type: 'task', lastRun: '2026-01-25', schedule: 'Weekly' },
  { id: 4, name: 'Budget vs Actual', description: 'Financial comparison of planned vs actual spending', type: 'finance', lastRun: '2026-01-20', schedule: 'Monthly' },
  { id: 5, name: 'Risk Register', description: 'All identified risks with status and mitigation plans', type: 'risk', lastRun: '2026-01-26', schedule: 'Bi-weekly' },
  { id: 6, name: 'Sprint Velocity', description: 'Team velocity across sprints with trend analysis', type: 'agile', lastRun: '2026-01-24', schedule: 'Per Sprint' },
];

const typeIcons: Record<string, string> = {
  project: '📊',
  resource: '👥',
  task: '✅',
  finance: '💰',
  risk: '⚠️',
  agile: '🔄',
};

export default function CustomReportsPage() {
  const [reports] = useState<ReportTemplate[]>(reportTemplates);
  const [showBuilder, setShowBuilder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || r.type === selectedType;
    return matchesSearch && matchesType;
  });

  const runReport = (report: ReportTemplate) => {
    alert(`Running report: ${report.name}`);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Custom Reports" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Report Templates
            </h2>
            <p className="page-subtitle">
              Create and manage custom report templates
            </p>
          </div>
          
          <button
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Report
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="all">All Types</option>
            <option value="project">Project</option>
            <option value="resource">Resource</option>
            <option value="task">Task</option>
            <option value="finance">Finance</option>
            <option value="risk">Risk</option>
            <option value="agile">Agile</option>
          </select>
        </div>

        {/* Report Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <div 
              key={report.id}
              className="rounded-xl border border-gray-200 p-4 transition-all hover:border-brand-200 hover:shadow-md dark:border-gray-700 dark:hover:border-brand-700"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{typeIcons[report.type] || '📄'}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {report.schedule}
                </span>
              </div>
              
              <h3 className="mt-3 font-medium text-gray-900 dark:text-white">{report.name}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{report.description}</p>
              
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <span className="text-xs text-gray-500">
                  Last run: {new Date(report.lastRun).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => runReport(report)}
                    className="rounded-lg bg-brand-500 px-3 py-1 text-xs text-white hover:bg-brand-600"
                  >
                    Run
                  </button>
                  <button className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg className="mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No reports found</p>
          </div>
        )}
      </div>
    </div>
  );
}
