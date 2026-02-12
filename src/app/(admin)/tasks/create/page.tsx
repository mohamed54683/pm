"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button/Button";

interface Project {
  id: number;
  name: string;
  code: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Sprint {
  id: number;
  name: string;
  project_id: number;
  status: string;
}

const typeOptions = ["epic", "story", "task", "bug", "subtask"];
const priorityOptions = ["low", "medium", "high", "critical"];
const statusOptions = ["backlog", "todo", "in_progress", "in_review", "done"];

const typeIcons: Record<string, string> = {
  epic: "⚡",
  story: "📖",
  task: "✓",
  bug: "🐛",
  subtask: "◦",
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function CreateTaskPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    project_id: "",
    title: "",
    description: "",
    task_type: "task",
    priority: "medium",
    status: "todo",
    start_date: "",
    due_date: "",
    estimated_hours: "",
    story_points: "",
    tags: "",
    assignee_ids: [] as number[],
  });

  useEffect(() => {
    loadProjects();
    loadMembers();
  }, []);

  useEffect(() => {
    if (form.project_id) {
      loadSprints(form.project_id);
    } else {
      setSprints([]);
    }
  }, [form.project_id]);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      const result = await res.json();
      if (result.success) setProjects(result.data || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await fetch("/api/team", { credentials: "include" });
      const result = await res.json();
      if (result.success) setMembers(result.data || []);
    } catch (err) {
      console.error("Failed to load team", err);
    }
  };

  const loadSprints = async (projectId: string) => {
    try {
      const res = await fetch(`/api/sprints?project_id=${projectId}`, { credentials: "include" });
      const result = await res.json();
      if (result.success) setSprints(result.data || []);
    } catch (err) {
      console.error("Failed to load sprints", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.title) return;

    setCreating(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        project_id: parseInt(form.project_id),
        title: form.title,
        description: form.description || null,
        task_type: form.task_type,
        priority: form.priority,
        status: form.status,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        story_points: form.story_points ? parseInt(form.story_points) : null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      };

      if (form.assignee_ids.length > 0) {
        payload.assignee_ids = form.assignee_ids;
      }

      const res = await fetch("/api/projects/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        router.push("/tasks");
      } else {
        setError(result.error || "Failed to create task");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      setError("Failed to create task. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const toggleAssignee = (userId: number) => {
    setForm((prev) => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter((id) => id !== userId)
        : [...prev.assignee_ids, userId],
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link
            href="/tasks"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="page-title">Create New Task</h1>
            <p className="page-subtitle">Add a new task to a project</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="page-body">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Project & Type */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  required
                  className="form-select w-full"
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="form-input w-full"
                  placeholder="Enter task title"
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="form-input w-full"
                  placeholder="Describe the task..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    value={form.task_type}
                    onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                    className="form-select w-full"
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {typeIcons[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="form-select w-full"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${priorityColors[form.priority]}`}>
                      {form.priority}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="form-select w-full"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Schedule & Effort</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">Estimated Hours</label>
                <input
                  type="number"
                  value={form.estimated_hours}
                  onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                  className="form-input w-full"
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="form-label">Story Points</label>
                <input
                  type="number"
                  value={form.story_points}
                  onChange={(e) => setForm({ ...form, story_points: e.target.value })}
                  className="form-input w-full"
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Assignees</h2>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No team members available</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleAssignee(m.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      form.assignee_ids.includes(m.id)
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-medium text-white">
                      {m.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                    </div>
                    {form.assignee_ids.includes(m.id) && (
                      <svg className="h-5 w-5 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Tags</h2>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="form-input w-full"
              placeholder="Comma-separated tags (e.g. frontend, urgent, refactor)"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Link href="/tasks">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={creating || !form.project_id || !form.title}>
              {creating ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
