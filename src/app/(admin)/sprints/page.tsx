"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sprint } from '@/types/projects-enhanced';
import { Project } from '@/types/projects';

interface SprintWithProject extends Sprint {
  project_name?: string;
}

export default function SprintsPage() {
  const [sprints, setSprints] = useState<SprintWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all projects first
        const projectsRes = await fetch('/api/projects');
        const projectsData = await projectsRes.json();
        if (projectsData.success) {
          setProjects(projectsData.data);
          
          // Fetch sprints for each project
          const allSprints: SprintWithProject[] = [];
          for (const project of projectsData.data) {
            try {
              const sprintsRes = await fetch(`/api/projects/sprints?project_id=${project.id}`);
              const sprintsData = await sprintsRes.json();
              if (sprintsData.success) {
                allSprints.push(...sprintsData.data.map((s: Sprint) => ({
                  ...s,
                  project_name: project.name
                })));
              }
            } catch {
              // Skip this project
            }
          }
          setSprints(allSprints);
        }
      } catch (err) {
        console.error('Failed to fetch sprints:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSprints = sprints.filter(s => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  const statusColors: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Sprints</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage sprints across all projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {filteredSprints.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No sprints found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Create sprints from project pages
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSprints.map(sprint => (
            <Link
              key={sprint.id}
              href={`/projects/${sprint.project_id}/sprints`}
              className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-brand-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{sprint.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{sprint.project_name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[sprint.status]}`}>
                  {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-6 mt-3 text-sm text-gray-600 dark:text-gray-400">
                <span>📅 {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}</span>
                {sprint.goal && <span className="truncate">🎯 {sprint.goal}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
