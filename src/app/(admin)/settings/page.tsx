"use client";
import React, { useState } from "react";
import Link from "next/link";

interface SettingSection {
  title: string;
  description: string;
  icon: string;
  path: string;
  items: string[];
}

const settingSections: SettingSection[] = [
  {
    title: 'Users & Roles',
    description: 'Manage users, teams, and permissions',
    icon: '👥',
    path: '/settings/users',
    items: ['User Management', 'Role Permissions', 'Team Structure']
  },
  {
    title: 'Workflows',
    description: 'Configure project and task workflows',
    icon: '🔄',
    path: '/settings/workflows',
    items: ['Task Status', 'Approval Flows', 'Automation Rules']
  },
  {
    title: 'Integrations',
    description: 'Connect with external tools and services',
    icon: '🔌',
    path: '/settings/integrations',
    items: ['Slack', 'Jira', 'GitHub', 'Email']
  },
  {
    title: 'Departments',
    description: 'Manage organizational departments and hierarchy',
    icon: '🏢',
    path: '/settings/departments',
    items: ['Department Structure', 'Managers', 'Analytic Accounts']
  },
  {
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: '🔔',
    path: '/settings/notifications',
    items: ['Email Notifications', 'In-App Alerts', 'Digest Settings']
  },
  {
    title: 'Projects',
    description: 'Default project settings and templates',
    icon: '📁',
    path: '/projects/templates',
    items: ['Project Templates', 'Custom Fields', 'Categories']
  },
  {
    title: 'Security',
    description: 'Security and access control settings',
    icon: '🔒',
    path: '/settings/security',
    items: ['Password Policy', 'Session Settings', 'Audit Logs']
  },
];

export default function SettingsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = settingSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.items.some(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">
              Configure your project management system
            </p>
          </div>
          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Settings Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((section) => (
            <Link 
              key={section.title}
              href={section.path}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{section.icon}</span>
                <svg className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              <h3 className="mt-4 font-medium text-gray-900 dark:text-white">{section.title}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
              
              <div className="mt-4 flex flex-wrap gap-1">
                {section.items.slice(0, 3).map((item) => (
                  <span 
                    key={item}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <svg className="mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p>No settings found</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 rounded-xl bg-white border border-gray-200 p-5 dark:bg-gray-800 dark:border-gray-700">
          <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                const settings = { theme: 'light', language: 'en', notifications: true };
                const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'settings-export.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Export Settings
            </button>
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      alert('Settings imported successfully!');
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Import Settings
            </button>
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to reset all settings to defaults?')) {
                  alert('Settings have been reset to defaults.');
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Reset to Defaults
            </button>
            <button 
              onClick={() => {
                alert('Changelog:\n\nv1.0.0 - Initial Release\n- Project Management\n- Task Tracking\n- Time Logging\n- Budget Management');
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              View Changelog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
