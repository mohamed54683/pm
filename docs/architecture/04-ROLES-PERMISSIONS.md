# User Roles and Permission Matrix

## Document Information
- **Version**: 1.0
- **Last Updated**: 2026-01-28
- **Status**: Approved for Implementation

---

## 1. Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ROLE HIERARCHY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────┐
                         │   System Admin       │  Level 0 (Highest)
                         │   (Super Admin)      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   Organization       │  Level 1
                         │   Admin              │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
    ┌─────────▼─────────┐ ┌────────▼────────┐ ┌─────────▼─────────┐
    │   Portfolio       │ │    Program      │ │   Department      │  Level 2
    │   Manager         │ │    Manager      │ │   Manager         │
    └─────────┬─────────┘ └────────┬────────┘ └─────────┬─────────┘
              │                    │                     │
              └────────────────────┼─────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   Project         │  Level 3
                         │   Manager         │
                         └─────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼─────────┐
    │   Team Lead       │ │   Scrum       │ │   Tech Lead       │  Level 4
    │                   │ │   Master      │ │                   │
    └─────────┬─────────┘ └───────┬───────┘ └─────────┬─────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │   Team Member     │  Level 5
                        └─────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
    ┌─────────▼─────────┐ ┌───────▼───────┐ ┌────────▼────────┐
    │   External        │ │   Client      │ │   Guest         │  Level 6
    │   Stakeholder     │ │               │ │                 │
    └───────────────────┘ └───────────────┘ └─────────────────┘
```

---

## 2. Role Definitions

### 2.1 System Roles

| Role | Code | Level | Scope | Description |
|------|------|-------|-------|-------------|
| **System Admin** | `sys_admin` | 0 | Global | Full system access, multi-tenant management |
| **Organization Admin** | `org_admin` | 1 | Organization | Full organization control, user management |

### 2.2 Management Roles

| Role | Code | Level | Scope | Description |
|------|------|-------|-------|-------------|
| **Portfolio Manager** | `portfolio_mgr` | 2 | Portfolio | Manage multiple projects, strategic planning |
| **Program Manager** | `program_mgr` | 2 | Program | Manage related projects within a program |
| **Department Manager** | `dept_mgr` | 2 | Department | Manage department resources and projects |
| **Project Manager** | `project_mgr` | 3 | Project | Full project control, team management |

### 2.3 Operational Roles

| Role | Code | Level | Scope | Description |
|------|------|-------|-------|-------------|
| **Team Lead** | `team_lead` | 4 | Team/Project | Lead team within project, task management |
| **Scrum Master** | `scrum_master` | 4 | Project | Facilitate Agile ceremonies, remove blockers |
| **Tech Lead** | `tech_lead` | 4 | Project | Technical guidance, code review |
| **Team Member** | `team_member` | 5 | Project | Execute tasks, update progress |

### 2.4 External Roles

| Role | Code | Level | Scope | Description |
|------|------|-------|-------|-------------|
| **External Stakeholder** | `stakeholder` | 6 | Project | View project progress, provide feedback |
| **Client** | `client` | 6 | Project | View milestones, approve deliverables |
| **Guest** | `guest` | 6 | Task | Limited task-level access |

### 2.5 Special Roles

| Role | Code | Level | Scope | Description |
|------|------|-------|-------|-------------|
| **Resource Manager** | `resource_mgr` | 3 | Organization | Manage resource allocation across projects |
| **Finance Manager** | `finance_mgr` | 3 | Organization | Budget and cost management |
| **QA Manager** | `qa_mgr` | 3 | Project | Quality assurance and testing |
| **Risk Manager** | `risk_mgr` | 3 | Portfolio/Project | Risk identification and mitigation |

---

## 3. Permission Categories

### 3.1 Permission Structure

```
Module.Resource.Action

Examples:
- projects.project.create
- tasks.task.update
- reports.dashboard.view
```

### 3.2 Standard Actions

| Action | Code | Description |
|--------|------|-------------|
| **View** | `view` | Read access |
| **Create** | `create` | Create new records |
| **Update** | `update` | Modify existing records |
| **Delete** | `delete` | Remove records |
| **Manage** | `manage` | Full CRUD + special operations |
| **Assign** | `assign` | Assign to users/resources |
| **Approve** | `approve` | Approval authority |
| **Export** | `export` | Export data |
| **Configure** | `configure` | System configuration |

---

## 4. Permission Matrix by Module

### 4.1 Organization & Tenant Module (M03)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|:------:|
| `org.organization.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `org.team.create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `org.team.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `org.team.delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `org.team.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `org.subscription.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `org.settings.configure` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.2 User & Access Module (M02)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|:------:|
| `users.user.create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.user.update` | ✅ | ✅ | ❌ | ❌ | ❌ | ⚪* | ❌ |
| `users.user.delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.user.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪** | ❌ |
| `users.role.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.role.assign` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `users.permission.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.apikey.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.session.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*⚪ Own profile only
**⚪ Project members only

### 4.3 Portfolio & Program Module (M04 - Part 1)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProgMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:-------:|:--------:|:------:|:------:|
| `portfolio.portfolio.create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `portfolio.portfolio.update` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `portfolio.portfolio.delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `portfolio.portfolio.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `portfolio.program.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `portfolio.program.update` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `portfolio.program.delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `portfolio.program.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |

### 4.4 Project Module (M04 - Part 2)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|:------:|
| `projects.project.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `projects.project.update` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `projects.project.delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `projects.project.archive` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `projects.project.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `projects.template.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `projects.template.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `projects.member.manage` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `projects.member.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `projects.phase.manage` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `projects.baseline.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `projects.baseline.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `projects.settings.configure` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.5 Task Module (M05)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|:------:|
| `tasks.task.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `tasks.task.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪* | ❌ |
| `tasks.task.delete` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `tasks.task.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `tasks.task.assign` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `tasks.task.reassign` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `tasks.subtask.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `tasks.checklist.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `tasks.dependency.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `tasks.milestone.create` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `tasks.milestone.update` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `tasks.milestone.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tasks.label.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `tasks.bulk.operations` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

*⚪ Own assigned tasks only

### 4.6 Agile Module (M07)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | ScrumMstr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:---------:|:--------:|:------:|:------:|
| `agile.sprint.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `agile.sprint.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `agile.sprint.start` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `agile.sprint.complete` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `agile.sprint.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `agile.backlog.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `agile.backlog.prioritize` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `agile.board.configure` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `agile.board.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `agile.board.move_items` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `agile.retro.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `agile.velocity.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### 4.7 Resource Module (M08)

| Permission | SysAdmin | OrgAdmin | ResMgr | PortMgr | ProjMgr | TeamLead | Member |
|------------|:--------:|:--------:|:------:|:-------:|:-------:|:--------:|:------:|
| `resource.pool.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `resource.pool.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `resource.skill.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `resource.user_skill.manage` | ✅ | ✅ | ✅ | ❌ | ⚪ | ⚪ | ⚪* |
| `resource.allocation.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `resource.allocation.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `resource.allocation.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `resource.capacity.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚪* |
| `resource.capacity.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `resource.workload.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |

*⚪ Own data only

### 4.8 Time Tracking Module (M09)

| Permission | SysAdmin | OrgAdmin | FinMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:------:|:-------:|:--------:|:------:|:------:|
| `time.entry.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `time.entry.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪* | ❌ |
| `time.entry.delete` | ✅ | ✅ | ✅ | ✅ | ⚪ | ⚪* | ❌ |
| `time.entry.view_all` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `time.entry.view_own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `time.timesheet.submit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `time.timesheet.approve` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `time.timesheet.reject` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `time.timesheet.view_all` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `time.report.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| `time.report.export` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

*⚪ Draft entries only

### 4.9 Finance Module (M10)

| Permission | SysAdmin | OrgAdmin | FinMgr | PortMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:------:|:-------:|:-------:|:--------:|:------:|:------:|
| `finance.budget.create` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ | ❌ |
| `finance.budget.update` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ | ❌ |
| `finance.budget.approve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `finance.budget.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ⚪ |
| `finance.cost.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ❌ |
| `finance.cost.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ⚪ |
| `finance.expense.submit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `finance.expense.approve` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `finance.invoice.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `finance.invoice.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `finance.evm.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ⚪ |
| `finance.report.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ | ⚪ |

### 4.10 Risk & Issue Module (M11)

| Permission | SysAdmin | OrgAdmin | RiskMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|:------:|
| `risk.risk.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `risk.risk.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `risk.risk.delete` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `risk.risk.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `risk.risk.resolve` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `risk.issue.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `risk.issue.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `risk.issue.escalate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `risk.issue.resolve` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `risk.issue.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `risk.change.submit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `risk.change.approve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `risk.change.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |

### 4.11 Quality Module (M12)

| Permission | SysAdmin | OrgAdmin | QAMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-----:|:-------:|:--------:|:------:|:------:|
| `quality.testcase.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `quality.testcase.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `quality.testcase.delete` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `quality.testcase.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `quality.testrun.execute` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `quality.testrun.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `quality.defect.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `quality.defect.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `quality.defect.verify` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `quality.defect.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `quality.plan.manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `quality.metrics.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |

### 4.12 Document Module (M13)

| Permission | SysAdmin | OrgAdmin | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:--------:|:------:|:------:|
| `docs.document.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `docs.document.update` | ✅ | ✅ | ✅ | ✅ | ⚪* | ❌ |
| `docs.document.delete` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `docs.document.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `docs.document.approve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `docs.document.download` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `docs.folder.manage` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `docs.wiki.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `docs.wiki.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `docs.wiki.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `docs.version.manage` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `docs.template.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*⚪ Own documents only

### 4.13 Collaboration Module (M14)

| Permission | SysAdmin | OrgAdmin | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:--------:|:------:|:------:|
| `collab.comment.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `collab.comment.update` | ✅ | ✅ | ✅ | ✅ | ⚪* | ⚪* |
| `collab.comment.delete` | ✅ | ✅ | ✅ | ✅ | ⚪* | ❌ |
| `collab.comment.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `collab.mention.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `collab.workflow.create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `collab.workflow.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `collab.workflow.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `collab.approval.request` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `collab.approval.decide` | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `collab.notification.manage` | ✅ | ✅ | ✅ | ⚪ | ⚪ | ⚪ |
| `collab.announcement.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

*⚪ Own comments only

### 4.14 Reporting Module (M15)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | TeamLead | Member | Client |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|:------:|
| `report.dashboard.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ❌ |
| `report.dashboard.update` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪* | ❌ |
| `report.dashboard.share` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `report.dashboard.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |
| `report.report.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `report.report.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| `report.report.export` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| `report.report.schedule` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `report.analytics.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| `report.executive.view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*⚪ Own dashboards only

### 4.15 System Administration Module (M01)

| Permission | SysAdmin | OrgAdmin | PortMgr | ProjMgr | TeamLead | Member |
|------------|:--------:|:--------:|:-------:|:-------:|:--------:|:------:|
| `system.config.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system.feature.toggle` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system.backup.manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system.audit.view` | ✅ | ✅ | ⚪ | ⚪ | ❌ | ❌ |
| `system.logs.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system.health.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system.integration.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system.webhook.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `system.import.execute` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `system.export.execute` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚪ |

---

## 5. Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Full permission |
| ⚪ | Conditional permission (see notes) |
| ❌ | No permission |

---

## 6. Permission Scoping

### 6.1 Scope Levels

| Scope | Description | Example |
|-------|-------------|---------|
| **Global** | Entire system | System Admin |
| **Organization** | Single organization | Org Admin |
| **Portfolio** | Portfolio and its projects | Portfolio Manager |
| **Program** | Program and its projects | Program Manager |
| **Project** | Single project | Project Manager |
| **Team** | Team within project | Team Lead |
| **Task** | Single task | Guest |
| **Own** | User's own data | Team Member (own time entries) |

### 6.2 Permission Inheritance

```
Global > Organization > Portfolio > Program > Project > Team > Task > Own

Example: Portfolio Manager automatically has view access to all projects in the portfolio
```

---

## 7. Default Role Templates

### 7.1 Pre-configured Roles

```json
{
  "system_admin": {
    "level": 0,
    "inherits": [],
    "permissions": ["*.*.*"]
  },
  "org_admin": {
    "level": 1,
    "inherits": [],
    "permissions": ["org.*.*", "users.*.*", "projects.*.*", "..."]
  },
  "project_manager": {
    "level": 3,
    "inherits": ["team_lead"],
    "permissions": ["projects.project.manage", "tasks.*.*", "..."]
  },
  "team_member": {
    "level": 5,
    "inherits": [],
    "permissions": ["tasks.task.view", "tasks.task.update:own", "..."]
  }
}
```

---

## 8. Custom Roles

Organizations can create custom roles by:

1. Starting from a template role
2. Adding or removing specific permissions
3. Defining scope restrictions
4. Setting role hierarchy level

### 8.1 Custom Role Example

```json
{
  "name": "External Consultant",
  "code": "ext_consultant",
  "level": 5,
  "base_role": "team_member",
  "permissions": {
    "add": ["time.entry.create", "docs.document.view"],
    "remove": ["tasks.task.create", "agile.backlog.manage"]
  },
  "restrictions": {
    "projects": ["specific_project_ids"],
    "time_based": {
      "valid_from": "2026-01-01",
      "valid_until": "2026-12-31"
    }
  }
}
```

---

## 9. Implementation Notes

### 9.1 Permission Check Algorithm

```typescript
function hasPermission(user, permission, resource?): boolean {
  // 1. Check system admin
  if (user.roles.includes('system_admin')) return true;

  // 2. Get user's permissions (direct + inherited)
  const userPermissions = getUserPermissions(user);

  // 3. Check exact match
  if (userPermissions.includes(permission)) return true;

  // 4. Check wildcard matches
  if (matchesWildcard(userPermissions, permission)) return true;

  // 5. Check scoped permissions
  if (resource) {
    return checkScopedPermission(user, permission, resource);
  }

  return false;
}
```

### 9.2 Best Practices

1. **Least Privilege**: Grant minimum required permissions
2. **Role-Based**: Assign roles, not individual permissions
3. **Audit**: Log all permission checks and changes
4. **Review**: Periodically review and clean up permissions
5. **Separation**: Separate duties for sensitive operations
