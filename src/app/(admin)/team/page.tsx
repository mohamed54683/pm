"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface TeamMember {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  job_title: string;
  department: string;
  phone: string;
  avatar_url: string | null;
  hourly_rate: number;
  created_at: string;
  last_login: string | null;
  projects_count: number;
  tasks_count: number;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  byRole: { role: string; count: number }[];
  byDepartment: { department: string; count: number }[];
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  developer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  designer: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  qa: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  analyst: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
  on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemberDetail, setShowMemberDetail] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadTeam();
  }, [searchTerm, roleFilter, departmentFilter, statusFilter]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (roleFilter) params.set("role", roleFilter);
      if (departmentFilter) params.set("department", departmentFilter);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/team?${params}`, {
        credentials: "include",
      });
      const result = await response.json();

      if (result.success) {
        setMembers(result.data.members || []);
        setStats(result.data.stats || null);
      }
    } catch (error) {
      console.error("Error loading team:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    return roleColors[role?.toLowerCase()] || roleColors.default;
  };

  const getStatusColor = (status: string) => {
    return statusColors[status?.toLowerCase()] || statusColors.inactive;
  };

  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))];
  const roles = [...new Set(members.map((m) => m.role).filter(Boolean))];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Team</h1>
            <p className="page-subtitle">
              Manage team members and their assignments
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <span className="text-xl">👥</span>
                </div>
                <div>
                  <p className="page-title">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Members</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <p className="page-title">{stats.active}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <span className="text-xl">⏸️</span>
                </div>
                <div>
                  <p className="page-title">{stats.inactive}</p>
                  <p className="text-sm text-gray-500">Inactive</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <span className="text-xl">🏢</span>
                </div>
                <div>
                  <p className="page-title">{stats.byDepartment?.length || 0}</p>
                  <p className="text-sm text-gray-500">Departments</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-gray-100 dark:bg-gray-700" : ""}`}
            >
              <svg
                className="h-5 w-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-gray-100 dark:bg-gray-700" : ""}`}
            >
              <svg
                className="h-5 w-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <span className="text-6xl">👥</span>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No team members found</p>
            <p className="text-sm text-gray-400">Add team members to get started</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => setShowMemberDetail(member)}
                className="cursor-pointer rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
              >
                <div className="flex flex-col items-center text-center">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold text-white">
                      {getInitials(member.first_name, member.last_name)}
                    </div>
                  )}
                  <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                    {member.first_name} {member.last_name}
                  </h3>
                  <p className="page-subtitle">{member.job_title || member.role}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>📁 {member.projects_count || 0} projects</span>
                    <span>✅ {member.tasks_count || 0} tasks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50">
                <tr>
                  <th className="data-table-th">Member</th>
                  <th className="data-table-th">Role</th>
                  <th className="data-table-th">Department</th>
                  <th className="data-table-th">Status</th>
                  <th className="data-table-th">Projects</th>
                  <th className="data-table-th">Tasks</th>
                  <th className="data-table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => setShowMemberDetail(member)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                            {getInitials(member.first_name, member.last_name)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {member.department || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {member.projects_count || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {member.tasks_count || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Detail Modal */}
      <Modal
        isOpen={!!showMemberDetail}
        onClose={() => setShowMemberDetail(null)}
        className="max-w-lg"
      >
        {showMemberDetail && (
          <div className="p-6">
            <div className="flex items-center gap-4">
              {showMemberDetail.avatar_url ? (
                <img
                  src={showMemberDetail.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-xl font-bold text-white">
                  {getInitials(showMemberDetail.first_name, showMemberDetail.last_name)}
                </div>
              )}
              <div>
                <h2 className="card-title text-xl">
                  {showMemberDetail.first_name} {showMemberDetail.last_name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {showMemberDetail.job_title || showMemberDetail.role}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">📧</span>
                <span className="text-gray-700 dark:text-gray-300">{showMemberDetail.email}</span>
              </div>
              {showMemberDetail.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">📱</span>
                  <span className="text-gray-700 dark:text-gray-300">{showMemberDetail.phone}</span>
                </div>
              )}
              {showMemberDetail.department && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">🏢</span>
                  <span className="text-gray-700 dark:text-gray-300">{showMemberDetail.department}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">💰</span>
                <span className="text-gray-700 dark:text-gray-300">
                  ${showMemberDetail.hourly_rate || 0}/hr
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="page-title">
                  {showMemberDetail.projects_count || 0}
                </p>
                <p className="text-sm text-gray-500">Active Projects</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="page-title">
                  {showMemberDetail.tasks_count || 0}
                </p>
                <p className="text-sm text-gray-500">Assigned Tasks</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMemberDetail(null)}>
                Close
              </Button>
              <Button>Edit Member</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Team Member</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Team member management is available through Settings → Users.
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowAddModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
