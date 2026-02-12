"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ActivityFeed } from '@/components/projects';
import { Project } from '@/types/projects';

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects?id=${projectId}`);
        const data = await res.json();
        if (data.success) {
          setProject(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch project:', err);
      }
    };
    fetchProject();
  }, [projectId]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">
          {project?.name || 'Project'} - Activity
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View all project activity and updates
        </p>
      </div>

      {/* Activity Feed */}
      <ActivityFeed projectId={projectId} showFilters={true} limit={20} />
    </div>
  );
}
