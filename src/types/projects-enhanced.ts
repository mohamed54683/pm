/**
 * Enhanced Project & Task Management Type Definitions
 * Extended interfaces for advanced features
 */

// =====================================================
// ENHANCED PROJECT TYPES
// =====================================================

export type ProjectMethodology = 'agile' | 'waterfall' | 'hybrid' | 'kanban' | 'custom';
export type HealthScore = 'green' | 'yellow' | 'red';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskProbability = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type RiskCategory = 'technical' | 'schedule' | 'budget' | 'resource' | 'scope' | 'external' | 'quality' | 'other';
export type RiskStatus = 'identified' | 'analyzing' | 'mitigating' | 'monitoring' | 'resolved' | 'occurred' | 'closed';
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type EffortSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type TimeEntryType = 'timer' | 'manual' | 'automatic';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type WatchType = 'all' | 'status' | 'comments' | 'mentions';
export type CustomFieldType = 'text' | 'number' | 'date' | 'datetime' | 'dropdown' | 'multi_select' | 'user' | 'url' | 'email' | 'phone' | 'currency' | 'percentage' | 'checkbox' | 'rating' | 'file' | 'formula';
export type EntityType = 'project' | 'task' | 'phase' | 'milestone';
export type StatusCategory = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TriggerType = 'status_change' | 'field_change' | 'due_date' | 'created' | 'assigned' | 'comment_added' | 'scheduled' | 'manual';
export type ActionType = 'update_field' | 'change_status' | 'assign_user' | 'send_notification' | 'create_task' | 'add_comment' | 'webhook' | 'custom';

// =====================================================
// ENHANCED PROJECT INTERFACE
// =====================================================

export interface EnhancedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
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
  color: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Enhanced fields
  health_score: HealthScore;
  health_notes?: string;
  methodology: ProjectMethodology;
  workflow_id?: string;
  portfolio_id?: string;
  risk_score: number;
  current_sprint_id?: string;
  // Computed
  phase_count?: number;
  task_count?: number;
  completed_task_count?: number;
  overdue_task_count?: number;
  blocked_task_count?: number;
  active_risks?: number;
  high_risks?: number;
  budget_utilization?: number;
}

// =====================================================
// SPRINT/AGILE INTERFACES
// =====================================================

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  velocity_planned?: number;
  velocity_completed?: number;
  capacity_hours?: number;
  retrospective_notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // Computed
  total_tasks?: number;
  completed_tasks?: number;
  total_story_points?: number;
  completed_story_points?: number;
  days_remaining?: number;
  burndown_data?: SprintBurndownData[];
}

export interface SprintTask {
  sprint_id: string;
  task_id: string;
  story_points?: number;
  added_at: string;
  added_by?: number;
}

export interface SprintBurndownData {
  date: string;
  remaining_points: number;
  completed_points: number;
  remaining_tasks: number;
  completed_tasks: number;
  ideal_remaining: number;
}

export interface SprintFormData {
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  capacity_hours?: number;
}

// =====================================================
// TIME TRACKING INTERFACES
// =====================================================

export interface TimeEntry {
  id: string;
  task_id?: string;
  task_title?: string;
  project_id: string;
  project_name?: string;
  user_id: number;
  user_name?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_billable: boolean;
  billing_rate?: number;
  is_running: boolean;
  entry_type: TimeEntryType;
  approved_by?: number;
  approved_at?: string;
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryFormData {
  task_id?: string;
  project_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_billable?: boolean;
  billing_rate?: number;
}

export interface Timesheet {
  id: string;
  user_id: number;
  user_name?: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  billable_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  entries?: TimeEntry[];
}

export interface TimeTrackingSummary {
  project_id: string;
  user_id: number;
  entry_date: string;
  total_minutes: number;
  billable_minutes: number;
  billable_amount: number;
  entry_count: number;
}

// =====================================================
// RISK MANAGEMENT INTERFACES
// =====================================================

export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  category: RiskCategory;
  probability: number; // 1-5 scale
  impact: number; // 1-5 scale
  risk_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical'; // Computed from risk_score
  status: RiskStatus;
  mitigation_plan?: string;
  mitigation_strategy?: string; // Alias for mitigation_plan
  contingency_plan?: string;
  owner_id?: number;
  owner_name?: string;
  identified_by?: number;
  identified_by_name?: string;
  identified_date: string;
  target_resolution_date?: string;
  actual_resolution_date?: string;
  cost_impact?: number;
  schedule_impact_days?: number;
  linked_task_id?: string;
  linked_task_title?: string;
  created_at: string;
  updated_at: string;
  history?: RiskHistory[];
}

export interface RiskHistory {
  id: number;
  risk_id: string;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by: number;
  changed_by_name?: string;
  changed_at: string;
}

export interface RiskFormData {
  title: string;
  description?: string;
  category: RiskCategory;
  probability: number; // 1-5 scale
  impact: number; // 1-5 scale
  status?: RiskStatus;
  mitigation_plan?: string;
  contingency_plan?: string;
  owner_id?: number;
  target_resolution_date?: string;
  cost_impact?: number;
  schedule_impact_days?: number;
  linked_task_id?: string;
}

// =====================================================
// SKILLS & RESOURCE INTERFACES
// =====================================================

export interface Skill {
  id: number;
  name: string;
  category?: string;
  description?: string;
  is_active: boolean;
}

export interface UserSkill {
  id: number;
  user_id: number;
  skill_id: number;
  skill_name?: string;
  skill_category?: string;
  proficiency_level: ProficiencyLevel;
  years_experience?: number;
  is_primary: boolean;
  verified_by?: number;
  verified_at?: string;
}

export interface UserCapacity {
  id: number;
  user_id: number;
  date: string;
  available_hours: number;
  allocated_hours: number;
  time_off_type: 'none' | 'vacation' | 'sick' | 'holiday' | 'training' | 'other';
  notes?: string;
}

export interface UserWorkload {
  user_id: number;
  user_name: string;
  assigned_tasks: number;
  tasks_in_progress: number;
  tasks_completed: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  overdue_tasks: number;
  utilization_percentage?: number;
}

// =====================================================
// CUSTOM FIELDS INTERFACES
// =====================================================

export interface CustomFieldDefinition {
  id: string;
  name: string;
  field_key: string;
  field_type: CustomFieldType;
  entity_type: EntityType;
  description?: string;
  is_required: boolean;
  is_active: boolean;
  options?: CustomFieldOption[];
  validation_rules?: CustomFieldValidation;
  default_value?: string;
  formula?: string;
  display_order: number;
  show_in_list: boolean;
  show_in_card: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
}

export interface CustomFieldValue {
  id: number;
  field_id: string;
  field_key?: string;
  field_name?: string;
  field_type?: CustomFieldType;
  entity_id: string;
  entity_type: EntityType;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_datetime?: string;
  value_json?: any;
  // Computed display value
  display_value?: string;
}

export interface CustomFieldFormData {
  name: string;
  field_key: string;
  field_type: CustomFieldType;
  entity_type: EntityType;
  description?: string;
  is_required?: boolean;
  options?: CustomFieldOption[];
  validation_rules?: CustomFieldValidation;
  default_value?: string;
  show_in_list?: boolean;
  show_in_card?: boolean;
}

// =====================================================
// WORKFLOW INTERFACES
// =====================================================

export interface StatusWorkflow {
  id: string;
  name: string;
  entity_type: 'project' | 'task';
  is_default: boolean;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  statuses?: WorkflowStatus[];
  transitions?: StatusTransition[];
}

export interface WorkflowStatus {
  id: string;
  workflow_id: string;
  name: string;
  status_key: string;
  color: string;
  icon?: string;
  category: StatusCategory;
  order_index: number;
  is_initial: boolean;
  is_final: boolean;
  wip_limit?: number;
  auto_assign_on_enter?: number;
}

export interface StatusTransition {
  id: number;
  workflow_id: string;
  from_status_id: string;
  from_status_name?: string;
  to_status_id: string;
  to_status_name?: string;
  requires_comment: boolean;
  requires_assignee: boolean;
  requires_approval: boolean;
  allowed_roles?: string[];
}

// =====================================================
// AUTOMATION INTERFACES
// =====================================================

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  entity_type: EntityType;
  project_id?: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  conditions?: Record<string, any>;
  is_active: boolean;
  run_count: number;
  last_run_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: number;
  rule_id: string;
  rule_name?: string;
  entity_id: string;
  entity_type: string;
  trigger_data: Record<string, any>;
  action_result: Record<string, any>;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
  execution_time_ms: number;
  executed_at: string;
}

export interface AutomationRuleFormData {
  name: string;
  description?: string;
  entity_type: EntityType;
  project_id?: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  conditions?: Record<string, any>;
  is_active?: boolean;
}

// =====================================================
// LABELS INTERFACE
// =====================================================

export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
  project_id?: string;
  is_active: boolean;
}

export interface TaskLabel {
  task_id: string;
  label_id: number;
  label_name?: string;
  label_color?: string;
  added_at: string;
  added_by?: number;
}

// =====================================================
// TASK WATCHER INTERFACE
// =====================================================

export interface TaskWatcher {
  id: number;
  task_id: string;
  user_id: number;
  user_name?: string;
  watch_type: WatchType;
  created_at: string;
}

// =====================================================
// ENHANCED TASK INTERFACE
// =====================================================

export interface EnhancedTask {
  id: string;
  project_id: string;
  project_name?: string;
  phase_id?: string;
  phase_name?: string;
  parent_task_id?: string;
  sprint_id?: string;
  sprint_name?: string;
  title: string;
  description?: string;
  status: string;
  workflow_status_id?: string;
  priority: string;
  task_type: string;
  start_date?: string;
  due_date?: string;
  actual_start_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage: number;
  order_index: number;
  is_recurring: boolean;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  story_points?: number;
  effort_estimate?: EffortSize;
  business_value?: number;
  risk_level: RiskLevel;
  blocked_reason?: string;
  blocked_by_task_id?: string;
  cycle_time_hours?: number;
  lead_time_hours?: number;
  // Relations
  assignees?: any[];
  checklists?: any[];
  labels?: TaskLabel[];
  watchers?: TaskWatcher[];
  custom_fields?: CustomFieldValue[];
  time_entries?: TimeEntry[];
}

// =====================================================
// PORTFOLIO INTERFACE
// =====================================================

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  owner_id?: number;
  owner_name?: string;
  strategic_goal?: string;
  budget_total?: number;
  budget_allocated: number;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  project_count?: number;
  total_progress?: number;
}

// =====================================================
// DASHBOARD INTERFACES
// =====================================================

export interface EnhancedDashboardData {
  // Project stats
  projects: {
    total: number;
    active: number;
    completed: number;
    on_hold: number;
    overdue: number;
    health_green: number;
    health_yellow: number;
    health_red: number;
  };
  // Task stats
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    blocked: number;
    overdue: number;
  };
  // Time tracking
  time_tracking: {
    today_hours: number;
    week_hours: number;
    month_hours: number;
    billable_ratio: number;
  };
  // Sprint metrics (if applicable)
  current_sprint?: {
    id: string;
    name: string;
    days_remaining: number;
    velocity_target: number;
    velocity_current: number;
    completion_percentage: number;
  };
  // Risk summary
  risks: {
    total: number;
    high_priority: number;
    mitigating: number;
    resolved: number;
  };
  // Workload
  team_workload: UserWorkload[];
  // Charts data
  burndown?: SprintBurndownData[];
  velocity_trend?: { sprint: string; velocity: number }[];
  task_distribution?: { status: string; count: number; color: string }[];
  upcoming_deadlines: any[];
  recent_activity: any[];
}

// =====================================================
// KANBAN ENHANCED INTERFACES
// =====================================================

export interface EnhancedKanbanColumn {
  id: string;
  status_key: string;
  name: string;
  color: string;
  category: StatusCategory;
  order_index: number;
  wip_limit?: number;
  tasks: EnhancedTask[];
  collapsed?: boolean;
}

export interface KanbanSwimlane {
  id: string;
  type: 'assignee' | 'priority' | 'phase' | 'sprint' | 'custom';
  value: string;
  label: string;
  color?: string;
  columns: EnhancedKanbanColumn[];
}

export interface EnhancedKanbanBoard {
  project_id: string;
  workflow_id?: string;
  columns: EnhancedKanbanColumn[];
  swimlanes?: KanbanSwimlane[];
  show_swimlanes: boolean;
  swimlane_type?: 'assignee' | 'priority' | 'phase' | 'sprint';
}

// =====================================================
// ACTIVITY FEED INTERFACES
// =====================================================

export interface ActivityFeedItem {
  id: string;
  project_id?: string;
  project_name?: string;
  entity_id: string;
  entity_type: string;
  entity_name?: string;
  entity_title?: string;
  action: string;
  details?: Record<string, unknown>;
  importance: 'low' | 'normal' | 'high';
  is_system: boolean;
  user_id?: number;
  user_name?: string;
  user_avatar?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
