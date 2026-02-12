"use client";
import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface Workflow {
  id: number;
  name: string;
  description: string;
  type: string;
  statuses: string[];
  isActive: boolean;
}

const defaultWorkflows: Workflow[] = [
  {
    id: 1,
    name: 'Standard Task Workflow',
    description: 'Default workflow for all tasks',
    type: 'task',
    statuses: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    isActive: true
  },
  {
    id: 2,
    name: 'Bug Tracking',
    description: 'Workflow for bug reports and fixes',
    type: 'bug',
    statuses: ['New', 'Confirmed', 'In Progress', 'Fixed', 'Verified', 'Closed'],
    isActive: true
  },
  {
    id: 3,
    name: 'Change Request',
    description: 'Workflow for change request approvals',
    type: 'change',
    statuses: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Implemented'],
    isActive: true
  },
  {
    id: 4,
    name: 'Project Lifecycle',
    description: 'Stages for project progression',
    type: 'project',
    statuses: ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closing'],
    isActive: false
  },
];

const statusColors = [
  'bg-gray-400',
  'bg-blue-400',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-green-400',
  'bg-red-400',
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(defaultWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const toggleWorkflow = (id: number) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Workflows" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Workflow Configuration
            </h2>
            <p className="page-subtitle">
              Define status transitions and approval processes
            </p>
          </div>
          
          <button
            onClick={() => setShowEditor(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Workflow
          </button>
        </div>

        {/* Workflow List */}
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div 
              key={workflow.id}
              className={`rounded-xl border p-5 transition-all ${
                workflow.isActive 
                  ? 'border-gray-200 dark:border-gray-700' 
                  : 'border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-800/50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{workflow.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      workflow.isActive 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {workflow.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{workflow.description}</p>
                  
                  {/* Status Flow */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {workflow.statuses.map((status, idx) => (
                      <React.Fragment key={status}>
                        <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white ${statusColors[idx % statusColors.length]}`}>
                          {status}
                        </span>
                        {idx < workflow.statuses.length - 1 && (
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleWorkflow(workflow.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      workflow.isActive
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {workflow.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Automation Rules Section */}
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Automation Rules</h3>
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Create automation rules to automatically trigger actions based on workflow transitions
            </p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Automation Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
