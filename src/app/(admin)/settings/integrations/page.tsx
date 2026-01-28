"use client";
import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: 'connected' | 'disconnected' | 'coming_soon';
  lastSync?: string;
}

const integrations: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Send notifications and updates to Slack channels', icon: '💬', category: 'Communication', status: 'disconnected' },
  { id: 'teams', name: 'Microsoft Teams', description: 'Integrate with Microsoft Teams for collaboration', icon: '👥', category: 'Communication', status: 'connected', lastSync: '2026-01-28 10:30' },
  { id: 'jira', name: 'Jira', description: 'Sync issues and projects with Jira', icon: '🎯', category: 'Project Management', status: 'disconnected' },
  { id: 'github', name: 'GitHub', description: 'Link commits and PRs to tasks', icon: '🐙', category: 'Development', status: 'connected', lastSync: '2026-01-28 09:15' },
  { id: 'gitlab', name: 'GitLab', description: 'Connect GitLab repositories and CI/CD', icon: '🦊', category: 'Development', status: 'disconnected' },
  { id: 'google', name: 'Google Calendar', description: 'Sync project milestones with Google Calendar', icon: '📅', category: 'Calendar', status: 'disconnected' },
  { id: 'outlook', name: 'Outlook Calendar', description: 'Sync with Outlook and Microsoft 365', icon: '📆', category: 'Calendar', status: 'coming_soon' },
  { id: 'figma', name: 'Figma', description: 'Embed and link Figma designs', icon: '🎨', category: 'Design', status: 'disconnected' },
  { id: 'drive', name: 'Google Drive', description: 'Attach files from Google Drive', icon: '📁', category: 'Storage', status: 'connected', lastSync: '2026-01-27 14:00' },
  { id: 'dropbox', name: 'Dropbox', description: 'Connect Dropbox for file storage', icon: '📦', category: 'Storage', status: 'coming_soon' },
  { id: 'zapier', name: 'Zapier', description: 'Connect with 5000+ apps via Zapier', icon: '⚡', category: 'Automation', status: 'disconnected' },
  { id: 'webhook', name: 'Webhooks', description: 'Custom webhooks for external systems', icon: '🔗', category: 'Developer', status: 'disconnected' },
];

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', ...new Set(integrations.map(i => i.category))];

  const filteredIntegrations = integrations.filter(i => {
    const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory;
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConnect = (integration: Integration) => {
    alert(`Connecting to ${integration.name}...`);
  };

  const handleDisconnect = (integration: Integration) => {
    if (confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
      alert(`Disconnected from ${integration.name}`);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Integrations" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Integrations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect your favorite tools and services
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Connected Integrations */}
        {filteredIntegrations.some(i => i.status === 'connected') && (
          <div className="mb-8">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Connected</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredIntegrations.filter(i => i.status === 'connected').map((integration) => (
                <div 
                  key={integration.id}
                  className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{integration.name}</h4>
                        <p className="text-xs text-green-600 dark:text-green-400">Connected</p>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{integration.description}</p>
                  {integration.lastSync && (
                    <p className="mt-2 text-xs text-gray-500">Last sync: {integration.lastSync}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300">
                      Configure
                    </button>
                    <button 
                      onClick={() => handleDisconnect(integration)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Available</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.filter(i => i.status === 'disconnected').map((integration) => (
              <div 
                key={integration.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{integration.name}</h4>
                      <p className="text-xs text-gray-500">{integration.category}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{integration.description}</p>
                <button 
                  onClick={() => handleConnect(integration)}
                  className="mt-4 w-full rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        {filteredIntegrations.some(i => i.status === 'coming_soon') && (
          <div>
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Coming Soon</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredIntegrations.filter(i => i.status === 'coming_soon').map((integration) => (
                <div 
                  key={integration.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-70 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl grayscale">{integration.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">{integration.name}</h4>
                      <p className="text-xs text-gray-500">Coming Soon</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{integration.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
