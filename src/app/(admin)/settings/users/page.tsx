"use client";
import React, { useState, useEffect } from "react";

interface User {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
  role_name: string;
  role_id: number;
  status: string;
  last_login_at: string | null;
  created_at: string;
  avatar_url: string | null;
}

interface Role {
  id: number;
  uuid: string;
  name: string;
  description: string;
  user_count: number;
  is_system: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadRoles();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (filterRole) params.set('roleId', filterRole);
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`/api/settings/users?${params}`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/roles', { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Users & Roles</h1>
            <p className="page-subtitle">
              Manage system users and role-based access control
            </p>
          </div>
          <button className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {activeTab === 'users' ? 'Invite User' : 'Create Role'}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Roles & Permissions
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'users' && (
          <>
            {/* Filters */}
            <div className="filter-bar mb-6">
              <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
                <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
                  Search
                </button>
              </form>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); }}
                className="form-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="card">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50/80 dark:bg-gray-800/50">
                      <tr>
                        <th className="data-table-th">User</th>
                        <th className="data-table-th">Role</th>
                        <th className="data-table-th">Department</th>
                        <th className="data-table-th">Status</th>
                        <th className="data-table-th">Last Login</th>
                        <th className="data-table-th">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {user.role_name}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {user.department || '—'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[user.status]}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <button className="text-sm text-blue-600 hover:underline">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'roles' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              </div>
            ) : roles.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">No roles found</p>
              </div>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="card p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                    </div>
                    {role.is_system && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">System</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{role.user_count} users</span>
                    <button className="text-sm text-blue-600 hover:underline">
                      {role.is_system ? 'View' : 'Edit'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
