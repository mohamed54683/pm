# Feature-to-Module Mapping

## Document Information
- **Version**: 1.0
- **Last Updated**: 2026-01-28
- **Status**: Approved for Implementation

---

## 1. Module Legend

| Code | Module Name | Description |
|------|-------------|-------------|
| M01 | Core Platform | Foundation services, logging, caching, events |
| M02 | Identity & Access | Authentication, authorization, user management |
| M03 | Tenant Management | Multi-tenancy, organizations, subscriptions |
| M04 | Project & Portfolio | Projects, portfolios, programs, templates |
| M05 | Task & WBS | Tasks, work breakdown, dependencies |
| M06 | Planning & Scheduling | Gantt, timeline, scheduling engine |
| M07 | Agile & Methodology | Scrum, Kanban, sprints, backlogs |
| M08 | Resource Management | Resources, skills, capacity, allocation |
| M09 | Time Tracking | Time entries, timesheets, approvals |
| M10 | Finance & Budget | Budgets, costs, EVM, invoicing |
| M11 | Risk & Compliance | Risks, issues, changes, compliance |
| M12 | Quality Management | Quality plans, testing, defects |
| M13 | Document & Knowledge | Documents, wiki, version control |
| M14 | Collaboration & Workflow | Communication, workflows, automation |
| M15 | Reporting & Analytics | Reports, dashboards, analytics |

---

## 2. Feature-to-Module Mapping Matrix

### 2.1 Core Project & Portfolio Management (Section 1)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F1.01 | Project creation, editing, archiving | M04 | M02, M03 | P0 |
| F1.02 | Project lifecycle management | M04 | M14 | P0 |
| F1.03 | Project templates (Agile, Waterfall, Hybrid) | M04 | M07 | P0 |
| F1.04 | Multi-project portfolio management | M04 | M15 | P1 |
| F1.05 | Project prioritization and scoring | M04 | M15 | P1 |
| F1.06 | Project dependencies and links | M04 | M05 | P1 |
| F1.07 | Project baselines (scope, cost, schedule) | M04 | M10, M06 | P1 |
| F1.08 | Planned vs actual tracking | M04 | M15, M09 | P0 |
| F1.09 | Project health indicators | M04 | M15, M11 | P0 |
| F1.10 | Project goals, KPIs, success criteria | M04 | M15 | P1 |
| F1.11 | Program and portfolio dashboards | M15 | M04 | P1 |

### 2.2 Task & Work Breakdown Structure (Section 2)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F2.01 | Epic → Feature → Task → Subtask hierarchy | M05 | M04 | P0 |
| F2.02 | Drag-and-drop task management | M05 | M01 | P0 |
| F2.03 | Task dependencies (FS, SS, FF, SF) | M05 | M06 | P0 |
| F2.04 | Milestones | M05 | M04 | P0 |
| F2.05 | Due dates, priorities, reminders | M05 | M14 | P0 |
| F2.06 | Task checklists | M05 | - | P0 |
| F2.07 | Tags, labels, categories | M05 | M01 | P0 |
| F2.08 | Recurring tasks | M05 | M14 | P1 |
| F2.09 | Task cloning and bulk operations | M05 | - | P1 |
| F2.10 | Task history and audit trail | M05 | M01 | P0 |

### 2.3 Planning, Scheduling & Timeline (Section 3)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F3.01 | Interactive Gantt charts | M06 | M05 | P0 |
| F3.02 | Timeline and roadmap views | M06 | M04 | P0 |
| F3.03 | Critical path method (CPM) | M06 | M05 | P1 |
| F3.04 | Automatic scheduling | M06 | M05, M08 | P1 |
| F3.05 | Manual schedule override | M06 | - | P0 |
| F3.06 | Sprint and iteration planning | M07 | M06 | P0 |
| F3.07 | Calendar views (daily, weekly, monthly) | M06 | M09 | P0 |
| F3.08 | Capacity-based planning | M06 | M08 | P1 |
| F3.09 | What-if and scenario planning | M06 | M10 | P2 |
| F3.10 | Schedule variance and forecasting | M06 | M15 | P1 |

### 2.4 Agile, Scrum & Kanban (Section 4)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F4.01 | Scrum boards | M07 | M05 | P0 |
| F4.02 | Kanban boards | M07 | M05 | P0 |
| F4.03 | Product backlog management | M07 | M05 | P0 |
| F4.04 | Sprint backlog | M07 | M05 | P0 |
| F4.05 | Sprint planning and goals | M07 | M06 | P0 |
| F4.06 | Story points and estimation | M07 | M05 | P0 |
| F4.07 | Velocity tracking | M07 | M15 | P1 |
| F4.08 | Burndown and burnup charts | M07 | M15 | P0 |
| F4.09 | Release planning | M07 | M04 | P1 |
| F4.10 | Retrospectives | M07 | M14 | P1 |
| F4.11 | Definition of Ready/Done | M07 | M12 | P1 |

### 2.5 Resource Management (Section 5)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F5.01 | Central resource pool | M08 | M02 | P0 |
| F5.02 | Skill and competency matrix | M08 | M02 | P1 |
| F5.03 | Resource allocation by project/task | M08 | M04, M05 | P0 |
| F5.04 | Resource availability calendars | M08 | M06 | P1 |
| F5.05 | Workload visualization | M08 | M15 | P0 |
| F5.06 | Capacity planning and forecasting | M08 | M06, M15 | P1 |
| F5.07 | Over/under-allocation alerts | M08 | M14 | P1 |
| F5.08 | Resource cost rates | M08 | M10 | P1 |
| F5.09 | Role-based resource assignment | M08 | M02 | P1 |

### 2.6 Time Tracking & Timesheets (Section 6)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F6.01 | Manual time entry | M09 | M05 | P0 |
| F6.02 | Timer-based tracking | M09 | M05 | P0 |
| F6.03 | Timesheet submission/approval workflows | M09 | M14 | P0 |
| F6.04 | Billable vs non-billable hours | M09 | M10 | P0 |
| F6.05 | Overtime tracking | M09 | M08 | P1 |
| F6.06 | Time reports by user/project/task | M09 | M15 | P0 |
| F6.07 | Integration with payroll/accounting | M09 | M10 | P2 |

### 2.7 Budgeting, Cost & Financial Management (Section 7)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F7.01 | Project and portfolio budgets | M10 | M04 | P1 |
| F7.02 | Cost Breakdown Structure (CBS) | M10 | M04 | P1 |
| F7.03 | Planned vs actual cost tracking | M10 | M09 | P1 |
| F7.04 | Labor and non-labor costs | M10 | M08, M09 | P1 |
| F7.05 | Expense management | M10 | M13 | P2 |
| F7.06 | Vendor and procurement tracking | M10 | M03 | P2 |
| F7.07 | Forecasted cost (EAC, ETC) | M10 | M15 | P2 |
| F7.08 | Cost variance and CPI | M10 | M15 | P2 |
| F7.09 | Earned Value Management (EVM) | M10 | M15 | P2 |

### 2.8 Risk Management (Section 8.1)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F8.01 | Risk register | M11 | M04 | P0 |
| F8.02 | Risk probability and impact matrix | M11 | M15 | P0 |
| F8.03 | Risk scoring and prioritization | M11 | - | P0 |
| F8.04 | Mitigation and contingency plans | M11 | M05 | P1 |
| F8.05 | Risk ownership and status tracking | M11 | M08 | P1 |

### 2.9 Issue Management (Section 8.2)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F8.06 | Issue logging and categorization | M11 | M04 | P0 |
| F8.07 | Priority and severity levels | M11 | - | P0 |
| F8.08 | Root cause analysis | M11 | M12 | P1 |
| F8.09 | Escalation workflows | M11 | M14 | P1 |

### 2.10 Change Management (Section 8.3)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F8.10 | Change request submission | M11 | M14 | P1 |
| F8.11 | Impact analysis (scope, time, cost) | M11 | M04, M06, M10 | P1 |
| F8.12 | Approval workflows | M11 | M14 | P1 |
| F8.13 | Change history and audit trail | M11 | M01 | P1 |

### 2.11 Quality Management (Section 9)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F9.01 | Quality management plans | M12 | M04 | P2 |
| F9.02 | Test case management | M12 | M05 | P2 |
| F9.03 | Test cycles and execution | M12 | M07 | P2 |
| F9.04 | Defect and bug tracking | M12 | M05 | P1 |
| F9.05 | Acceptance criteria | M12 | M05 | P1 |
| F9.06 | Quality metrics and reports | M12 | M15 | P2 |
| F9.07 | Release readiness assessment | M12 | M07 | P2 |

### 2.12 Document & Knowledge Management (Section 10)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F10.01 | Centralized document repository | M13 | M01 | P0 |
| F10.02 | Version control and history | M13 | M01 | P0 |
| F10.03 | Document access permissions | M13 | M02 | P0 |
| F10.04 | Document approval workflows | M13 | M14 | P1 |
| F10.05 | Templates and standard documents | M13 | - | P1 |
| F10.06 | Knowledge base and wiki | M13 | - | P1 |
| F10.07 | Full-text search | M13 | M01 | P0 |
| F10.08 | Document tagging and metadata | M13 | M01 | P1 |

### 2.13 Collaboration & Communication (Section 11)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F11.01 | Project discussion forums | M14 | M04 | P1 |
| F11.02 | Task-level comments | M14 | M05 | P0 |
| F11.03 | @mentions | M14 | M02 | P0 |
| F11.04 | Real-time notifications | M14 | M01 | P0 |
| F11.05 | Email integration | M14 | M01 | P0 |
| F11.06 | Chat integration (Teams, Slack) | M14 | - | P2 |
| F11.07 | Meeting scheduling | M14 | M06 | P2 |
| F11.08 | Meeting minutes and action tracking | M14 | M05 | P2 |
| F11.09 | Announcements and broadcasts | M14 | M03 | P1 |

### 2.14 Reporting, Analytics & Dashboards (Section 12)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F12.01 | Real-time dashboards | M15 | All | P0 |
| F12.02 | Custom report builder | M15 | - | P1 |
| F12.03 | KPIs and metrics | M15 | All | P0 |
| F12.04 | Portfolio-level reporting | M15 | M04 | P1 |
| F12.05 | Earned Value dashboards | M15 | M10 | P2 |
| F12.06 | Export to PDF, Excel, CSV | M15 | - | P0 |
| F12.07 | Scheduled and automated reports | M15 | M14 | P1 |
| F12.08 | Executive summary views | M15 | M04 | P1 |

### 2.15 Workflow Automation (Section 13)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F13.01 | Configurable workflows | M14 | M01 | P0 |
| F13.02 | Approval processes | M14 | M02 | P0 |
| F13.03 | Business rules engine | M14 | M01 | P1 |
| F13.04 | SLA management | M14 | M11 | P2 |
| F13.05 | Triggers and actions | M14 | M01 | P1 |
| F13.06 | Notifications and escalations | M14 | M01 | P0 |
| F13.07 | No-code workflow builder | M14 | - | P2 |

### 2.16 User, Role & Security Management (Section 14)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F14.01 | Role-based access control (RBAC) | M02 | M01 | P0 |
| F14.02 | Custom roles and permissions | M02 | - | P0 |
| F14.03 | Multi-tenant support | M03 | M02 | P0 |
| F14.04 | Single Sign-On (SSO) | M02 | - | P1 |
| F14.05 | Multi-factor authentication (MFA) | M02 | - | P1 |
| F14.06 | IP restrictions | M02 | M01 | P2 |
| F14.07 | Audit logs and activity tracking | M02 | M01 | P0 |
| F14.08 | Data encryption at rest/transit | M01 | - | P0 |

### 2.17 Integration & API Management (Section 15)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F15.01 | REST API | M01 | All | P0 |
| F15.02 | GraphQL API | M01 | All | P2 |
| F15.03 | Webhooks | M01 | All | P1 |
| F15.04 | ERP integration | M01 | M10 | P2 |
| F15.05 | HR systems integration | M01 | M08 | P2 |
| F15.06 | DevOps tools integration | M01 | M05 | P2 |
| F15.07 | Cloud storage integration | M01 | M13 | P1 |
| F15.08 | Data import/export tools | M01 | - | P1 |

### 2.18 Mobile, UX & Accessibility (Section 16)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F16.01 | Responsive web UI | M01 | All | P0 |
| F16.02 | Mobile applications (iOS & Android) | M01 | All | P2 |
| F16.03 | Offline mode | M01 | - | P2 |
| F16.04 | Push notifications | M01 | M14 | P1 |
| F16.05 | Multi-language support (AR & EN) | M01 | - | P0 |
| F16.06 | RTL layout support | M01 | - | P0 |
| F16.07 | WCAG accessibility compliance | M01 | - | P1 |

### 2.19 AI & Advanced Intelligence (Section 17)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F17.01 | AI-based task prioritization | M05 | M15 | P2 |
| F17.02 | AI effort estimation | M05 | M09, M15 | P2 |
| F17.03 | AI project risk prediction | M11 | M15 | P2 |
| F17.04 | Smart scheduling recommendations | M06 | M08 | P2 |
| F17.05 | Auto-generated reports | M15 | - | P2 |
| F17.06 | Conversational chatbot | M01 | All | P3 |
| F17.07 | Natural language task creation | M05 | M01 | P3 |
| F17.08 | Team sentiment analysis | M14 | M15 | P3 |

### 2.20 Compliance & Governance (Section 18)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F18.01 | Audit-ready logs | M01 | All | P0 |
| F18.02 | Compliance reporting | M15 | M11 | P1 |
| F18.03 | ISO, ITIL, PMBOK alignment | M04 | M11 | P2 |
| F18.04 | Data retention and archival | M01 | M13 | P1 |
| F18.05 | SLA and KPI compliance tracking | M14 | M15 | P2 |
| F18.06 | Approval hierarchies | M14 | M02 | P1 |

### 2.21 System Administration (Section 19)

| ID | Feature | Primary Module | Supporting Modules | Priority |
|----|---------|---------------|-------------------|----------|
| F19.01 | System configuration | M01 | - | P0 |
| F19.02 | Feature toggles | M03 | M01 | P1 |
| F19.03 | Backup and restore | M01 | - | P0 |
| F19.04 | Performance monitoring | M01 | - | P0 |
| F19.05 | Error logging | M01 | - | P0 |
| F19.06 | License and subscription management | M03 | - | P1 |
| F19.07 | Environment management | M01 | - | P1 |

---

## 3. Module Feature Count Summary

| Module | P0 Features | P1 Features | P2 Features | P3 Features | Total |
|--------|-------------|-------------|-------------|-------------|-------|
| M01: Core Platform | 12 | 8 | 5 | 1 | 26 |
| M02: Identity & Access | 5 | 4 | 1 | 0 | 10 |
| M03: Tenant Management | 2 | 3 | 1 | 0 | 6 |
| M04: Project & Portfolio | 5 | 6 | 1 | 0 | 12 |
| M05: Task & WBS | 9 | 3 | 2 | 1 | 15 |
| M06: Planning & Scheduling | 5 | 4 | 2 | 0 | 11 |
| M07: Agile & Methodology | 7 | 5 | 0 | 0 | 12 |
| M08: Resource Management | 2 | 7 | 0 | 0 | 9 |
| M09: Time Tracking | 5 | 1 | 1 | 0 | 7 |
| M10: Finance & Budget | 0 | 4 | 5 | 0 | 9 |
| M11: Risk & Compliance | 5 | 6 | 1 | 0 | 12 |
| M12: Quality Management | 0 | 2 | 5 | 0 | 7 |
| M13: Document & Knowledge | 4 | 4 | 0 | 0 | 8 |
| M14: Collaboration & Workflow | 5 | 6 | 4 | 1 | 16 |
| M15: Reporting & Analytics | 3 | 4 | 2 | 0 | 9 |
| **TOTAL** | **69** | **67** | **30** | **3** | **169** |

---

## 4. Priority Definitions

| Priority | Definition | Target Phase |
|----------|------------|--------------|
| **P0** | Must-have for MVP, core functionality | Phase 1 (MVP) |
| **P1** | Important, should be in initial release | Phase 2 |
| **P2** | Nice-to-have, can be deferred | Phase 3 |
| **P3** | Future consideration, innovation features | Phase 4+ |

---

## 5. Feature Dependencies

### 5.1 Critical Path Features

The following features must be implemented in order:

```
M01 (Core) → M02 (Auth) → M03 (Tenant) → M04 (Project) → M05 (Task)
                                              ↓
                                          M06 (Planning)
                                              ↓
                                          M07 (Agile)
```

### 5.2 Parallel Development Tracks

After core modules (M01-M05), the following can be developed in parallel:

**Track A: Planning & Methodology**
- M06: Planning & Scheduling
- M07: Agile & Methodology

**Track B: Resources & Time**
- M08: Resource Management
- M09: Time Tracking

**Track C: Governance**
- M11: Risk & Compliance
- M12: Quality Management

**Track D: Collaboration**
- M13: Document & Knowledge
- M14: Collaboration & Workflow

**Track E: Analytics**
- M10: Finance & Budget
- M15: Reporting & Analytics

---

## 6. API Endpoints by Module

### 6.1 M01: Core Platform
```
/api/v1/config/*
/api/v1/files/*
/api/v1/search/*
/api/v1/notifications/*
/api/v1/locales/*
```

### 6.2 M02: Identity & Access
```
/api/v1/auth/*
/api/v1/users/*
/api/v1/roles/*
/api/v1/permissions/*
/api/v1/sessions/*
```

### 6.3 M03: Tenant Management
```
/api/v1/organizations/*
/api/v1/teams/*
/api/v1/subscriptions/*
/api/v1/features/*
```

### 6.4 M04: Project & Portfolio
```
/api/v1/projects/*
/api/v1/portfolios/*
/api/v1/programs/*
/api/v1/templates/*
/api/v1/baselines/*
```

### 6.5 M05: Task & WBS
```
/api/v1/tasks/*
/api/v1/epics/*
/api/v1/features/*
/api/v1/subtasks/*
/api/v1/milestones/*
/api/v1/dependencies/*
/api/v1/checklists/*
```

### 6.6 M06: Planning & Scheduling
```
/api/v1/schedules/*
/api/v1/gantt/*
/api/v1/timelines/*
/api/v1/calendars/*
/api/v1/critical-path/*
```

### 6.7 M07: Agile & Methodology
```
/api/v1/sprints/*
/api/v1/backlogs/*
/api/v1/boards/*
/api/v1/velocity/*
/api/v1/retrospectives/*
```

### 6.8 M08: Resource Management
```
/api/v1/resources/*
/api/v1/skills/*
/api/v1/allocations/*
/api/v1/capacity/*
/api/v1/availability/*
```

### 6.9 M09: Time Tracking
```
/api/v1/time-entries/*
/api/v1/timesheets/*
/api/v1/timers/*
/api/v1/approvals/*
```

### 6.10 M10: Finance & Budget
```
/api/v1/budgets/*
/api/v1/costs/*
/api/v1/expenses/*
/api/v1/invoices/*
/api/v1/evm/*
```

### 6.11 M11: Risk & Compliance
```
/api/v1/risks/*
/api/v1/issues/*
/api/v1/changes/*
/api/v1/compliance/*
/api/v1/audits/*
```

### 6.12 M12: Quality Management
```
/api/v1/quality-plans/*
/api/v1/test-cases/*
/api/v1/test-cycles/*
/api/v1/defects/*
```

### 6.13 M13: Document & Knowledge
```
/api/v1/documents/*
/api/v1/folders/*
/api/v1/wiki/*
/api/v1/versions/*
```

### 6.14 M14: Collaboration & Workflow
```
/api/v1/comments/*
/api/v1/workflows/*
/api/v1/approvals/*
/api/v1/meetings/*
/api/v1/announcements/*
```

### 6.15 M15: Reporting & Analytics
```
/api/v1/reports/*
/api/v1/dashboards/*
/api/v1/widgets/*
/api/v1/analytics/*
/api/v1/exports/*
```

---

## 7. Database Tables by Module

See [03-DATABASE-SCHEMA.md](./03-DATABASE-SCHEMA.md) for complete schema.

| Module | Tables Count | Key Tables |
|--------|-------------|------------|
| M01 | 8 | settings, files, audit_logs, notifications |
| M02 | 6 | users, roles, permissions, sessions, api_keys |
| M03 | 5 | organizations, teams, subscriptions, features |
| M04 | 8 | projects, portfolios, programs, templates, baselines |
| M05 | 10 | tasks, epics, milestones, dependencies, checklists |
| M06 | 5 | schedules, calendars, timeline_items |
| M07 | 7 | sprints, backlogs, boards, board_columns, velocity |
| M08 | 6 | resources, skills, user_skills, allocations, capacity |
| M09 | 4 | time_entries, timesheets, timesheet_approvals |
| M10 | 7 | budgets, costs, expenses, invoices, evm_data |
| M11 | 6 | risks, issues, changes, compliance_items |
| M12 | 5 | quality_plans, test_cases, test_runs, defects |
| M13 | 5 | documents, folders, wiki_pages, versions |
| M14 | 6 | comments, workflows, workflow_steps, approvals |
| M15 | 5 | reports, dashboards, widgets, analytics_cache |
| **TOTAL** | **93** | - |
