/**
 * Project & Task Management Type Definitions
 * TypeScript interfaces for all project management entities
 */

// =====================================================
// PROJECT TYPES
// =====================================================

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type TaskStatus = 'not_started' | 'in_progress' | 'in_review' | 'completed' | 'cancelled' | 'blocked';
export type TaskType = 'task' | 'bug' | 'feature' | 'improvement' | 'documentation';
export type MilestoneStatus = 'pending' | 'completed' | 'overdue' | 'cancelled';
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
export type MemberRole = 'owner' | 'manager' | 'member' | 'viewer';
export type NotificationType = 'task_assigned' | 'task_completed' | 'comment_added' | 'deadline_approaching' | 'phase_completed' | 'mention' | 'status_change';

// =====================================================
// PROJECT INTERFACES
// =====================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  budget?: number;
  spent_amount?: number;
  progress_percentage: number;
  owner_id?: number;
  owner_name?: string;
  template_id?: string;
  is_template: boolean;
  template_name?: string;
  color: string;
  tags?: string[];
  settings?: ProjectSettings;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  phase_count?: number;
  task_count?: number;
  completed_task_count?: number;
  member_count?: number;
  phases?: ProjectPhase[];
  members?: ProjectMember[];
  milestones?: Milestone[];
}

export interface ProjectSettings {
  allow_subtasks?: boolean;
  enable_time_tracking?: boolean;
  require_due_dates?: boolean;
  auto_progress_calculation?: boolean;
  notification_settings?: {
    task_assigned?: boolean;
    deadline_reminder?: boolean;
    status_changes?: boolean;
  };
}

export interface ProjectMember {
  id: number;
  project_id: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  role: MemberRole;
  can_edit: boolean;
  can_delete: boolean;
  can_manage_members: boolean;
  joined_at: string;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  end_date?: string;
  budget?: number;
  owner_id?: number;
  template_id?: string;
  color?: string;
  tags?: string[];
}

// =====================================================
// PHASE INTERFACES
// =====================================================

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: PhaseStatus;
  order_index: number;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress_percentage: number;
  color: string;
  is_milestone: boolean;
  budget?: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  task_count?: number;
  completed_task_count?: number;
  tasks?: Task[];
  dependencies?: PhaseDependency[];
}

export interface PhaseDependency {
  id: number;
  phase_id: string;
  depends_on_phase_id: string;
  depends_on_phase_name?: string;
  dependency_type: DependencyType;
  lag_days: number;
}

export interface PhaseFormData {
  name: string;
  description?: string;
  status?: PhaseStatus;
  start_date?: string;
  end_date?: string;
  color?: string;
  is_milestone?: boolean;
  order_index?: number;
  budget?: number;
}

// =====================================================
// MILESTONE INTERFACES
// =====================================================

export interface Milestone {
  id: string;
  project_id: string;
  phase_id?: string;
  phase_name?: string;
  name: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  status: MilestoneStatus;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface MilestoneFormData {
  name: string;
  description?: string;
  due_date: string;
  phase_id?: string;
  is_critical?: boolean;
}

// =====================================================
// TASK INTERFACES
// =====================================================

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  phase_id?: string;
  phase_name?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType;
  start_date?: string;
  due_date?: string;
  actual_start_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage: number;
  order_index: number;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  assignees?: TaskAssignee[];
  checklists?: TaskChecklist[];
  subtasks?: Task[];
  dependencies?: TaskDependency[];
  comments_count?: number;
  attachments_count?: number;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  end_date?: string;
  occurrences?: number;
}

export interface TaskAssignee {
  id: number;
  task_id: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  assigned_by?: number;
  assigned_at: string;
}

export interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
  depends_on_task_title?: string;
  dependency_type: DependencyType;
  lag_days: number;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_by?: number;
  completed_by_name?: string;
  completed_at?: string;
  order_index: number;
}

export interface TaskFormData {
  title: string;
  description?: string;
  phase_id?: string;
  parent_task_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  task_type?: TaskType;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  assignee_ids?: number[];
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
}

// =====================================================
// TIME TRACKING INTERFACES
// =====================================================

export interface TimeEntry {
  id: string;
  task_id: string;
  task_title?: string;
  user_id: number;
  user_name?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_billable: boolean;
  created_at: string;
}

export interface TimeEntryFormData {
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_billable?: boolean;
}

// =====================================================
// COLLABORATION INTERFACES
// =====================================================

export interface Comment {
  id: string;
  project_id?: string;
  phase_id?: string;
  task_id?: string;
  parent_comment_id?: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  content: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  replies?: Comment[];
}

export interface CommentFormData {
  content: string;
  parent_comment_id?: string;
}

export interface Attachment {
  id: string;
  project_id?: string;
  phase_id?: string;
  task_id?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: number;
  project_id?: string;
  project_name?: string;
  task_id?: string;
  task_title?: string;
  type: NotificationType;
  title: string;
  message?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// =====================================================
// RESOURCE MANAGEMENT INTERFACES
// =====================================================

export interface ResourceAllocation {
  id: string;
  project_id: string;
  project_name?: string;
  phase_id?: string;
  phase_name?: string;
  task_id?: string;
  task_title?: string;
  user_id: number;
  user_name?: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  estimated_hours?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceUtilization {
  user_id: number;
  user_name: string;
  email: string;
  assigned_tasks: number;
  tasks_in_progress: number;
  tasks_completed: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  utilization_percentage?: number;
}

// =====================================================
// TEMPLATE INTERFACES
// =====================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  default_color?: string;
  default_phases?: TemplatePhase[];
  phases: TemplatePhase[];
  tasks: TemplateTask[];
  milestones: TemplateMilestone[];
  estimated_duration_days?: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplatePhase {
  name: string;
  order: number;
  duration_days: number;
}

export interface TemplateTask {
  title: string;
  phase: string;
  priority: TaskPriority;
  description?: string;
  estimated_hours?: number;
}

export interface TemplateMilestone {
  name: string;
  phase: string;
  is_critical?: boolean;
}

// =====================================================
// DASHBOARD & ANALYTICS INTERFACES
// =====================================================

export interface ProjectDashboardData {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  on_hold_projects: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  upcoming_deadlines: Milestone[];
  recent_activity: ActivityLog[];
  project_stats: ProjectStats[];
  resource_utilization: ResourceUtilization[];
}

export interface ProjectStats {
  project_id: string;
  project_name: string;
  status: ProjectStatus;
  progress_percentage: number;
  task_count: number;
  completed_task_count: number;
  overdue_task_count: number;
  days_remaining?: number;
}

export interface ActivityLog {
  id: string;
  project_id?: string;
  project_name?: string;
  phase_id?: string;
  phase_name?: string;
  task_id?: string;
  task_title?: string;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type: 'project' | 'phase' | 'task' | 'milestone' | 'comment' | 'attachment';
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  description?: string;
  created_at: string;
}

// =====================================================
// FILTER & SEARCH INTERFACES
// =====================================================

export interface ProjectFilters {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  owner_id?: number;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  search?: string;
  tags?: string[];
}

export interface TaskFilters {
  project_id?: string;
  phase_id?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  task_type?: TaskType[];
  assignee_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  tags?: string[];
  is_overdue?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProjectApiResponse extends ApiResponse<Project> {}
export interface ProjectsApiResponse extends ApiResponse<Project[]> {
  count?: number;
}
export interface TaskApiResponse extends ApiResponse<Task> {}
export interface TasksApiResponse extends ApiResponse<Task[]> {
  count?: number;
}

// =====================================================
// GANTT CHART INTERFACES
// =====================================================

export interface GanttItem {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'project' | 'phase' | 'task' | 'milestone';
  dependencies?: string[];
  color?: string;
  parent_id?: string;
}

export interface GanttViewOptions {
  view_mode: 'day' | 'week' | 'month' | 'quarter' | 'year';
  show_dependencies: boolean;
  show_progress: boolean;
  show_milestones: boolean;
  collapse_phases: boolean;
}

// =====================================================
// KANBAN INTERFACES
// =====================================================

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color?: string;
  limit?: number;
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  project_id?: string;
  phase_id?: string;
}

export interface DragResult {
  task_id: string;
  source_status: TaskStatus;
  destination_status: TaskStatus;
  source_index: number;
  destination_index: number;
}
