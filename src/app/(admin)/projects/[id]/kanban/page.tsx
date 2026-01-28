"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EnhancedKanbanBoard } from '@/components/projects';
import { Project } from '@/types/projects';

export default function ProjectKanbanPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [swimlaneType, setSwimlaneType] = useState<'none' | 'assignee' | 'priority' | 'label' | 'phase'>('none');

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
    <div className="p-6 h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {project?.name || 'Project'} - Kanban Board
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Drag and drop tasks to update their status
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 dark:text-gray-400">Swimlanes:</label>
          <select
            value={swimlaneType}
            onChange={(e) => setSwimlaneType(e.target.value as typeof swimlaneType)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
          >
            <option value="none">None</option>
            <option value="assignee">By Assignee</option>
            <option value="priority">By Priority</option>
            <option value="label">By Label</option>
            <option value="phase">By Phase</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <EnhancedKanbanBoard
        projectId={projectId}
        showWipLimits={true}
        swimlaneType={swimlaneType}
        enableQuickActions={true}
      />
    </div>
  );
}
