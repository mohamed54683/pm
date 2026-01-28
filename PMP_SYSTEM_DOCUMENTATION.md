# Project Management Platform (PMP) - System Documentation

## Overview
A comprehensive Project Management Platform built with Next.js 15, React, and MySQL/MariaDB.

**Access URL:** http://localhost:3001  
**Database:** pmp (MySQL/MariaDB)

---

## Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@pmp.local | admin123 | Admin |
| pm@pmp.local | admin123 | Project Manager |
| team@pmp.local | admin123 | Team Member |

---

## System Pages & Functions

### 1. Dashboard (`/`)
**Purpose:** Main dashboard with system KPIs and overview

**Features:**
- Project statistics (total, active, completed, at-risk)
- Task statistics (total, pending, in-progress, completed, overdue)
- Sprint statistics (active, completed)
- Risk & Issue counts
- Budget overview (total, spent, remaining)
- Time tracking summary (hours logged, billable, pending approval)
- Recent projects list
- Active sprints with progress
- Upcoming deadlines
- Team workload distribution

**API:** `GET /api/dashboard`

---

### 2. Projects (`/projects`)
**Purpose:** Project management and overview

**Features:**
- List all projects with filters (status, health, priority)
- Create new project
- View project details
- Edit project settings
- Project health indicators (on-track, at-risk, off-track)
- Progress tracking
- Budget monitoring

**Sub-pages:**
| Page | URL | Function |
|------|-----|----------|
| Project List | `/projects` | View all projects |
| Project Detail | `/projects/[id]` | View/edit single project |
| Gantt Chart | `/projects/gantt` | Visual timeline view |
| Templates | `/projects/templates` | Project templates |

**APIs:**
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects` - Update project
- `DELETE /api/projects` - Delete project
- `GET /api/projects/dashboard` - Project dashboard stats
- `GET /api/projects/phases` - Project phases
- `GET /api/projects/tasks` - Tasks by project

---

### 3. Tasks (`/tasks`)
**Purpose:** Task management and tracking

**Features:**
- Task list with filters (status, priority, type, assignee)
- Create/edit tasks
- Kanban board view
- Task dependencies
- Time estimation and tracking
- Story points for agile
- Subtasks and checklists
- Comments and attachments

**Task Statuses:**
- `backlog` - In backlog
- `todo` - Ready to start
- `in_progress` - Being worked on
- `in_review` - Under review
- `testing` - In QA/testing
- `done` - Completed
- `cancelled` - Cancelled
- `blocked` - Blocked

**Task Types:**
- `story` - User story
- `task` - General task
- `bug` - Bug/defect
- `epic` - Epic (large feature)
- `subtask` - Subtask
- `feature` - Feature
- `improvement` - Improvement

**Priority Levels:**
- `critical` - Critical priority
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority

**APIs:**
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks` - Update task
- `PATCH /api/tasks` - Bulk update (Kanban)
- `DELETE /api/tasks` - Delete task

---

### 4. Sprints (`/sprints`)
**Purpose:** Agile sprint planning and tracking

**Features:**
- Sprint list by project
- Create/edit sprints
- Sprint backlog management
- Velocity tracking
- Burndown charts
- Sprint goals
- Capacity planning

**Sprint Statuses:**
- `planning` - Planning phase
- `active` - Currently active
- `completed` - Finished
- `cancelled` - Cancelled

**Sub-pages:**
| Page | URL | Function |
|------|-----|----------|
| Sprint List | `/sprints` | All sprints |
| Backlog | `/sprints/backlog` | Sprint backlog |
| Releases | `/sprints/releases` | Release management |

**APIs:**
- `GET /api/sprints` - List sprints
- `POST /api/sprints` - Create sprint
- `PUT /api/sprints` - Update sprint
- `GET /api/projects/sprints` - Sprints by project

---

### 5. Risks (`/risks`)
**Purpose:** Risk management and mitigation

**Features:**
- Risk register
- Risk assessment (probability × impact = score)
- Mitigation strategies
- Risk owners
- Status tracking

**Risk Statuses:**
- `identified` - Newly identified
- `analyzing` - Being analyzed
- `mitigating` - Mitigation in progress
- `monitoring` - Being monitored
- `resolved` - Resolved
- `closed` - Closed

**Risk Levels (by score):**
- Score 1-3: Low risk
- Score 4-6: Medium risk
- Score 7-9: High risk
- Score 10+: Critical risk

**APIs:**
- `GET /api/risks` - List risks
- `POST /api/risks` - Create risk
- `PUT /api/risks` - Update risk
- `DELETE /api/risks` - Delete risk

---

### 6. Issues (`/issues`)
**Purpose:** Issue tracking and resolution

**Features:**
- Issue list with filters
- Severity and priority levels
- Resolution tracking
- Issue assignment
- Related tasks linking

**Issue Statuses:**
- `open` - Open issue
- `in_progress` - Being worked on
- `resolved` - Resolved
- `closed` - Closed
- `reopened` - Reopened

**Severity Levels:**
- `critical` - System down / major impact
- `high` - Significant impact
- `medium` - Moderate impact
- `low` - Minor impact

**APIs:**
- `GET /api/issues` - List issues
- `POST /api/issues` - Create issue
- `PUT /api/issues` - Update issue
- `DELETE /api/issues` - Delete issue

---

### 7. Resources (`/resources`)
**Purpose:** Team resource management

**Features:**
- Team member list
- Workload analysis
- Capacity planning
- Skills tracking
- Availability calendar

**Sub-pages:**
| Page | URL | Function |
|------|-----|----------|
| Team | `/resources` | Team members |
| Workload | `/resources/workload` | Workload view |

**APIs:**
- `GET /api/resources` - List team members with workload

---

### 8. Time Tracking (`/time-tracking`)
**Purpose:** Time logging and approval

**Features:**
- Timesheet entry
- Billable/non-billable tracking
- Approval workflow
- Reports by project/user
- Weekly/monthly views

**Time Entry Statuses:**
- `pending` - Awaiting approval
- `approved` - Approved
- `rejected` - Rejected

**Sub-pages:**
| Page | URL | Function |
|------|-----|----------|
| Timesheet | `/time-tracking/timesheet` | Log time |
| Approvals | `/time-tracking/approvals` | Approve time |
| Reports | `/time-tracking/reports` | Time reports |

**APIs:**
- `GET /api/time-entries` - List time entries
- `POST /api/time-entries` - Create entry
- `PUT /api/time-entries` - Update entry

---

### 9. Documents (`/documents`)
**Purpose:** Document management

**Features:**
- Folder organization
- File upload/download
- Document versioning
- Project-linked documents
- Search functionality

**APIs:**
- `GET /api/documents` - List documents/folders
- `POST /api/documents` - Upload document
- `DELETE /api/documents` - Delete document

---

### 10. Portfolio (`/portfolio`)
**Purpose:** Portfolio and program management

**Features:**
- Portfolio overview
- Program management
- Strategic alignment
- Cross-project analytics
- Roadmap planning

**Sub-pages:**
| Page | URL | Function |
|------|-----|----------|
| Overview | `/portfolio` | Portfolio dashboard |
| Programs | `/portfolio/programs` | Program management |
| Roadmap | `/portfolio/roadmap` | Strategic roadmap |

**APIs:**
- `GET /api/portfolio` - Portfolio data
- `GET /api/portfolio/programs` - List programs
- `POST /api/portfolio/programs` - Create program

---

### 11. Budgets (`/budgets`)
**Purpose:** Budget management and tracking

**Features:**
- Project budgets
- Cost tracking
- Budget vs actual
- Forecasting
- Expense categories

---

### 12. Reports (`/reports`)
**Purpose:** Reporting and analytics

**Features:**
- Project status reports
- Resource utilization
- Time tracking reports
- Risk/issue summaries
- Custom report builder

---

### 13. Settings (`/settings`)
**Purpose:** System configuration

**Sub-pages:**
| Page | URL | Function |
|------|-----|----------|
| General | `/settings` | General settings |
| Users | `/settings/users` | User management |
| Roles | `/settings/roles` | Role permissions |
| Notifications | `/settings/notifications` | Notification settings |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| users | System users |
| roles | User roles (Admin, PM, Team Member, Viewer) |
| user_roles | User-role assignments |
| sessions | User sessions |
| projects | Project records |
| project_members | Team assignments |
| project_phases | Project phases |
| project_milestones | Milestones |
| project_templates | Project templates |
| project_activity_log | Activity tracking |
| tasks | Task records |
| task_assignees | Task assignments |
| task_dependencies | Task dependencies |
| task_checklists | Task checklists |
| task_comments | Task comments |
| sprints | Sprint records |
| sprint_tasks | Sprint-task links |
| time_entries | Time logs |
| risks | Risk register |
| issues | Issue tracker |
| documents | Document records |
| folders | Document folders |
| portfolios | Portfolio records |
| programs | Program records |
| project_budgets | Budget records |
| activity_log | System activity |
| notifications | User notifications |

---

## User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration
- All CRUD operations

### Project Manager
- Create/manage projects
- Assign team members
- Manage sprints, risks, issues
- Approve time entries
- View reports

### Team Member
- View assigned projects
- Update task status
- Log time entries
- Add comments
- View documents

### Viewer
- Read-only access
- View projects and tasks
- View reports

---

## API Authentication

All API endpoints require authentication via JWT tokens stored in HTTP-only cookies.

**Login:** `POST /api/auth/signin`
```json
{
  "email": "admin@pmp.local",
  "password": "admin123"
}
```

**Response includes:**
- User info
- CSRF token
- JWT tokens (in cookies)

---

## Technology Stack

- **Frontend:** Next.js 15, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Database:** MySQL/MariaDB
- **Authentication:** JWT with HTTP-only cookies
- **Server:** Node.js with Turbopack

---

## File Structure

```
src/
├── app/
│   ├── (admin)/           # Admin pages
│   │   ├── page.tsx       # Dashboard
│   │   ├── projects/      # Projects module
│   │   ├── tasks/         # Tasks module
│   │   ├── sprints/       # Sprints module
│   │   ├── risks/         # Risks module
│   │   ├── issues/        # Issues module
│   │   ├── resources/     # Resources module
│   │   ├── time-tracking/ # Time tracking
│   │   ├── documents/     # Documents
│   │   ├── portfolio/     # Portfolio
│   │   ├── budgets/       # Budgets
│   │   ├── reports/       # Reports
│   │   └── settings/      # Settings
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication
│   │   ├── dashboard/     # Dashboard API
│   │   ├── projects/      # Projects API
│   │   ├── tasks/         # Tasks API
│   │   ├── sprints/       # Sprints API
│   │   ├── risks/         # Risks API
│   │   ├── issues/        # Issues API
│   │   ├── resources/     # Resources API
│   │   ├── time-entries/  # Time tracking API
│   │   ├── documents/     # Documents API
│   │   └── portfolio/     # Portfolio API
│   └── (full-width-pages)/ # Auth pages
├── components/            # Reusable components
├── lib/                   # Utilities
│   ├── db.ts             # Database connection
│   ├── auth/             # Auth utilities
│   └── middleware/       # API middleware
└── types/                # TypeScript types
```

---

## Quick Start

1. **Start MySQL/MariaDB** (via XAMPP)
2. **Run development server:**
   ```bash
   cd C:\xampp\htdocs\pmp
   npm run dev
   ```
3. **Open browser:** http://localhost:3001
4. **Login:** admin@pmp.local / admin123

---

*Document generated: January 28, 2026*
