"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, Milestone } from '@/types/projects';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import TaskList from './TaskList';
import TaskForm from './TaskForm';
import KanbanBoard from './KanbanBoard';
import GanttChart from './GanttChart';
import PhaseList from './PhaseList';
import ProjectForm from './ProjectForm';

interface ProjectDetailProps {
  projectId: string;
  onBack?: () => void;
}

type ViewTab = 'overview' | 'tasks' | 'kanban' | 'timeline' | 'phases';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700'
};

export default function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects?id=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    fetchProject();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
          {error || 'Project not found'}
        </h3>
        {onBack && (
          <Button variant="outline" onClick={onBack}>Go Back</Button>
        )}
      </div>
    );
  }

  const completedTasks = project.completed_task_count || 0;
  const totalTasks = project.task_count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: project.color }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                  {project.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {project.priority} priority
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </div>
        </div>

        {project.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">{project.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Progress</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${project.progress_percentage}%`, backgroundColor: project.color }}
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(project.progress_percentage)}%
              </span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tasks</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {completedTasks} / {totalTasks}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Phases</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.phase_count || 0}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Start Date</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">End Date</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex px-4 -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { id: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { id: 'kanban', label: 'Kanban', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
              { id: 'timeline', label: 'Timeline', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'phases', label: 'Phases', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ViewTab)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Tasks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Recent Tasks</h3>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('tasks')}>
                    View All
                  </Button>
                </div>
                <TaskList
                  projectId={projectId}
                  onTaskClick={handleTaskClick}
                  showCreateButton={false}
                  viewMode="list"
                />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Milestones</h3>
                </div>
                {project.milestones && project.milestones.length > 0 ? (
                  <div className="space-y-3">
                    {project.milestones.map((milestone: Milestone) => (
                      <div
                        key={milestone.id}
                        className={`p-4 rounded-lg border ${
                          milestone.status === 'completed'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : milestone.status === 'overdue'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              milestone.status === 'completed' ? 'bg-green-500' :
                              milestone.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {milestone.name}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(milestone.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No milestones yet
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div className="lg:col-span-2">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Team</h3>
                {project.members && project.members.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {project.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-medium">
                          {member.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.user_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {member.role}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No team members yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <TaskList
              projectId={projectId}
              onTaskClick={handleTaskClick}
              showCreateButton={true}
              viewMode="list"
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanBoard
              projectId={projectId}
              onTaskClick={handleTaskClick}
            />
          )}

          {activeTab === 'timeline' && (
            <GanttChart projectId={projectId} project={project} />
          )}

          {activeTab === 'phases' && (
            <PhaseList projectId={projectId} onRefresh={fetchProject} />
          )}
        </div>
      </div>

      {/* Edit Project Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className="max-w-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Project</h2>
          <ProjectForm
            projectId={projectId}
            initialData={{
              name: project.name,
              description: project.description,
              status: project.status,
              priority: project.priority,
              start_date: project.start_date,
              end_date: project.end_date,
              budget: project.budget,
              color: project.color,
              tags: project.tags
            }}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditModal(false)}
          />
        </div>
      </Modal>

      {/* Task Detail Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} className="max-w-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {selectedTask ? 'Edit Task' : 'Task Details'}
          </h2>
          {selectedTask && (
            <TaskForm
              projectId={projectId}
              taskId={selectedTask.id}
              initialData={{
                title: selectedTask.title,
                description: selectedTask.description,
                status: selectedTask.status,
                priority: selectedTask.priority,
                task_type: selectedTask.task_type,
                phase_id: selectedTask.phase_id,
                start_date: selectedTask.start_date,
                due_date: selectedTask.due_date,
                estimated_hours: selectedTask.estimated_hours,
                tags: selectedTask.tags,
                assignee_ids: selectedTask.assignees?.map(a => a.user_id)
              }}
              onSuccess={() => {
                setShowTaskModal(false);
                fetchProject();
              }}
              onCancel={() => setShowTaskModal(false)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
