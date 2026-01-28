"use client";
import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface EarnedValueMetrics {
  project_name: string;
  bac: number; // Budget at Completion
  pv: number;  // Planned Value
  ev: number;  // Earned Value
  ac: number;  // Actual Cost
  sv: number;  // Schedule Variance
  cv: number;  // Cost Variance
  spi: number; // Schedule Performance Index
  cpi: number; // Cost Performance Index
  eac: number; // Estimate at Completion
  etc: number; // Estimate to Complete
  vac: number; // Variance at Completion
}

export default function EarnedValuePage() {
  const [projects, setProjects] = useState<EarnedValueMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    loadEarnedValueData();
  }, []);

  const loadEarnedValueData = async () => {
    try {
      setLoading(true);
      // Mock EVM data
      const mockData: EarnedValueMetrics[] = [
        {
          project_name: 'Website Redesign',
          bac: 150000,
          pv: 75000,
          ev: 70000,
          ac: 72000,
          sv: -5000,
          cv: -2000,
          spi: 0.93,
          cpi: 0.97,
          eac: 154639,
          etc: 82639,
          vac: -4639
        },
        {
          project_name: 'Mobile App Development',
          bac: 200000,
          pv: 100000,
          ev: 110000,
          ac: 95000,
          sv: 10000,
          cv: 15000,
          spi: 1.10,
          cpi: 1.16,
          eac: 172414,
          etc: 77414,
          vac: 27586
        },
        {
          project_name: 'API Integration',
          bac: 80000,
          pv: 60000,
          ev: 55000,
          ac: 58000,
          sv: -5000,
          cv: -3000,
          spi: 0.92,
          cpi: 0.95,
          eac: 84211,
          etc: 26211,
          vac: -4211
        },
      ];
      setProjects(mockData);
    } catch (error) {
      console.error('Error loading EVM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (value: number, isIndex: boolean = false) => {
    if (isIndex) {
      if (value >= 1) return 'text-green-600';
      if (value >= 0.9) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (value >= 0) return 'text-green-600';
    return 'text-red-600';
  };

  const filteredProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(p => p.project_name === selectedProject);

  // Calculate totals
  const totals = filteredProjects.reduce((acc, p) => ({
    bac: acc.bac + p.bac,
    pv: acc.pv + p.pv,
    ev: acc.ev + p.ev,
    ac: acc.ac + p.ac,
  }), { bac: 0, pv: 0, ev: 0, ac: 0 });

  return (
    <div>
      <PageBreadcrumb pageTitle="Earned Value Analysis" />
      
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Budget at Completion (BAC)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.bac)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Planned Value (PV)</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(totals.pv)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Earned Value (EV)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totals.ev)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Actual Cost (AC)</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(totals.ac)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Earned Value Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Project performance measurement using EVM methodology
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.project_name} value={p.project_name}>{p.project_name}</option>
              ))}
            </select>
            
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Metrics Table */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Project</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">BAC</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">PV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">EV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">AC</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">SV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">CV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">SPI</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">CPI</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">EAC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {filteredProjects.map((project) => (
                  <tr key={project.project_name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {project.project_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                      {formatCurrency(project.bac)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-blue-600">
                      {formatCurrency(project.pv)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-green-600">
                      {formatCurrency(project.ev)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-orange-600">
                      {formatCurrency(project.ac)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getStatusColor(project.sv)}`}>
                      {formatCurrency(project.sv)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getStatusColor(project.cv)}`}>
                      {formatCurrency(project.cv)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getStatusColor(project.spi, true)}`}>
                      {project.spi.toFixed(2)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getStatusColor(project.cpi, true)}`}>
                      {project.cpi.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                      {formatCurrency(project.eac)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">EVM Glossary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 md:grid-cols-5">
            <div><strong>BAC:</strong> Budget at Completion</div>
            <div><strong>PV:</strong> Planned Value</div>
            <div><strong>EV:</strong> Earned Value</div>
            <div><strong>AC:</strong> Actual Cost</div>
            <div><strong>SV:</strong> Schedule Variance (EV-PV)</div>
            <div><strong>CV:</strong> Cost Variance (EV-AC)</div>
            <div><strong>SPI:</strong> Schedule Performance Index (EV/PV)</div>
            <div><strong>CPI:</strong> Cost Performance Index (EV/AC)</div>
            <div><strong>EAC:</strong> Estimate at Completion</div>
          </div>
        </div>
      </div>
    </div>
  );
}
