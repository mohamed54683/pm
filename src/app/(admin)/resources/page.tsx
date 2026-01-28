"use client";
import React, { useState, useEffect } from "react";

interface Resource {
  id: number;
  uuid: string;
  email: string;
  name: string;
  avatar: string;
  phone: string;
  status: string;
  roles: string;
  assigned_tasks: number;
  in_progress_tasks: number;
  total_estimated_hours: number;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const response = await fetch('/api/resources', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setResources(result.data);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(r => 
    `${r.name} ${r.email} ${r.roles}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {resources.length} team members
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-700">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-2 ${view === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 ${view === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="p-6">
        {view === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                    {resource.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {resource.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{resource.roles}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{resource.assigned_tasks || 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{resource.in_progress_tasks || 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(Number(resource.total_estimated_hours) || 0)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Est. Hours</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    resource.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {resource.status}
                  </span>
                </div>

                {/* Contact */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{resource.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tasks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Est. Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                          {resource.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {resource.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{resource.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {resource.roles}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">-</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{resource.assigned_tasks || 0}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{Math.round(Number(resource.total_estimated_hours) || 0)}h</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        resource.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {resource.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
}
