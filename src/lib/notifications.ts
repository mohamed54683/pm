/**
 * Notification System
 * Handles email alerts and in-app notifications
 */

import { query } from './db';

export type NotificationType =
  | 'critical_finding'
  | 'audit_submitted'
  | 'audit_approved'
  | 'audit_rejected'
  | 'action_plan_due'
  | 'action_plan_overdue'
  | 'system_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  recipient_email: string;
  recipient_role?: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  is_email_sent: boolean;
  created_at?: string;
  read_at?: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  priority: NotificationPriority;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  critical_finding: {
    subject: 'CRITICAL: Quality Issue Found at {restaurant}',
    body: `A critical quality issue has been identified:

Restaurant: {restaurant}
Audit Type: {audit_type}
Score: {score}
Auditor: {auditor}
Date: {date}

Finding: {finding}

Immediate action is required. Please review the audit and implement corrective measures.`,
    priority: 'critical'
  },
  audit_submitted: {
    subject: 'Audit Submitted for Approval - {restaurant}',
    body: `An audit has been submitted for your review:

Restaurant: {restaurant}
Audit Type: {audit_type}
Submitted By: {submitted_by}
Date: {date}

Please review and approve/reject this audit.`,
    priority: 'medium'
  },
  audit_approved: {
    subject: 'Audit Approved - {restaurant}',
    body: `Your audit has been approved:

Restaurant: {restaurant}
Audit Type: {audit_type}
Approved By: {approved_by}
Date: {date}

The audit is now finalized and included in reports.`,
    priority: 'low'
  },
  audit_rejected: {
    subject: 'Audit Rejected - Action Required - {restaurant}',
    body: `Your audit has been rejected and requires revision:

Restaurant: {restaurant}
Audit Type: {audit_type}
Rejected By: {rejected_by}
Reason: {reason}

Please revise the audit and resubmit for approval.`,
    priority: 'high'
  },
  action_plan_due: {
    subject: 'Reminder: Action Plan Due Tomorrow - {title}',
    body: `This is a reminder that an action plan is due tomorrow:

Title: {title}
Store: {store}
Due Date: {due_date}
Assigned To: {assigned_to}

Please ensure the action plan is completed on time.`,
    priority: 'medium'
  },
  action_plan_overdue: {
    subject: 'OVERDUE: Action Plan Requires Immediate Attention - {title}',
    body: `An action plan is overdue and requires immediate attention:

Title: {title}
Store: {store}
Due Date: {due_date}
Days Overdue: {days_overdue}
Assigned To: {assigned_to}

Please complete this action plan immediately or update its status.`,
    priority: 'high'
  },
  system_alert: {
    subject: 'System Alert: {title}',
    body: '{message}',
    priority: 'medium'
  }
};

/**
 * Create a notification record in the database
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<string> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await query(
      `INSERT INTO notifications
       (id, type, priority, title, message, recipient_email, recipient_role, related_id, related_type, is_read, is_email_sent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        notification.type,
        notification.priority,
        notification.title,
        notification.message,
        notification.recipient_email,
        notification.recipient_role || null,
        notification.related_id || null,
        notification.related_type || null,
        notification.is_read ? 1 : 0,
        notification.is_email_sent ? 1 : 0
      ]
    );
    return id;
  } catch (error) {
    console.error('Error creating notification:', error);
    // If notifications table doesn't exist, just log and continue
    return id;
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(email: string, role?: string): Promise<Notification[]> {
  try {
    const results = await query(
      `SELECT * FROM notifications
       WHERE (recipient_email = ? OR recipient_role = ?)
       AND is_read = 0
       ORDER BY created_at DESC
       LIMIT 50`,
      [email, role || '']
    );
    return results as Notification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?`,
      [notificationId]
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(email: string): Promise<void> {
  try {
    await query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE recipient_email = ? AND is_read = 0`,
      [email]
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

/**
 * Replace template placeholders with actual values
 */
function fillTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Send notification for critical finding
 */
export async function notifyCriticalFinding(data: {
  restaurant: string;
  audit_type: string;
  score: string;
  auditor: string;
  date: string;
  finding: string;
  audit_id: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.critical_finding;

  // Get all managers and admins
  try {
    const managers = await query(
      `SELECT email FROM users WHERE role IN ('Super Admin', 'Admin', 'Manager') AND status = 'Active'`,
      []
    );

    if (Array.isArray(managers)) {
      for (const manager of managers as { email: string }[]) {
        await createNotification({
          type: 'critical_finding',
          priority: template.priority,
          title: fillTemplate(template.subject, data),
          message: fillTemplate(template.body, data),
          recipient_email: manager.email,
          related_id: data.audit_id,
          related_type: data.audit_type,
          is_read: false,
          is_email_sent: false
        });
      }
    }
  } catch (error) {
    console.error('Error sending critical finding notification:', error);
  }
}

/**
 * Send notification for audit submitted
 */
export async function notifyAuditSubmitted(data: {
  restaurant: string;
  audit_type: string;
  submitted_by: string;
  date: string;
  audit_id: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.audit_submitted;

  try {
    // Notify managers and admins
    const approvers = await query(
      `SELECT email FROM users WHERE role IN ('Super Admin', 'Admin', 'Manager') AND status = 'Active'`,
      []
    );

    if (Array.isArray(approvers)) {
      for (const approver of approvers as { email: string }[]) {
        await createNotification({
          type: 'audit_submitted',
          priority: template.priority,
          title: fillTemplate(template.subject, data),
          message: fillTemplate(template.body, data),
          recipient_email: approver.email,
          related_id: data.audit_id,
          related_type: data.audit_type,
          is_read: false,
          is_email_sent: false
        });
      }
    }
  } catch (error) {
    console.error('Error sending audit submitted notification:', error);
  }
}

/**
 * Send notification for audit approved
 */
export async function notifyAuditApproved(data: {
  restaurant: string;
  audit_type: string;
  approved_by: string;
  date: string;
  audit_id: string;
  submitter_email: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.audit_approved;

  await createNotification({
    type: 'audit_approved',
    priority: template.priority,
    title: fillTemplate(template.subject, data),
    message: fillTemplate(template.body, data),
    recipient_email: data.submitter_email,
    related_id: data.audit_id,
    related_type: data.audit_type,
    is_read: false,
    is_email_sent: false
  });
}

/**
 * Send notification for audit rejected
 */
export async function notifyAuditRejected(data: {
  restaurant: string;
  audit_type: string;
  rejected_by: string;
  reason: string;
  audit_id: string;
  submitter_email: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.audit_rejected;

  await createNotification({
    type: 'audit_rejected',
    priority: template.priority,
    title: fillTemplate(template.subject, data),
    message: fillTemplate(template.body, data),
    recipient_email: data.submitter_email,
    related_id: data.audit_id,
    related_type: data.audit_type,
    is_read: false,
    is_email_sent: false
  });
}

/**
 * Check for overdue action plans and send notifications
 */
export async function checkOverdueActionPlans(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find overdue action plans
    const overduePlans = await query(
      `SELECT ap.*, u.email as assigned_email
       FROM action_plan_items ap
       LEFT JOIN users u ON ap.assigned_to = u.name OR ap.assigned_to = u.email
       WHERE ap.due_date < ? AND ap.status NOT IN ('completed', 'cancelled')`,
      [today]
    );

    if (Array.isArray(overduePlans)) {
      const template = NOTIFICATION_TEMPLATES.action_plan_overdue;

      for (const plan of overduePlans as any[]) {
        const dueDate = new Date(plan.due_date);
        const todayDate = new Date(today);
        const daysOverdue = Math.ceil((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        const data = {
          title: plan.title,
          store: plan.store_name,
          due_date: plan.due_date,
          days_overdue: daysOverdue.toString(),
          assigned_to: plan.assigned_to
        };

        if (plan.assigned_email) {
          await createNotification({
            type: 'action_plan_overdue',
            priority: template.priority,
            title: fillTemplate(template.subject, data),
            message: fillTemplate(template.body, data),
            recipient_email: plan.assigned_email,
            related_id: plan.id,
            related_type: 'action_plan',
            is_read: false,
            is_email_sent: false
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking overdue action plans:', error);
  }
}

/**
 * Check if score indicates a critical finding
 */
export function isCriticalScore(score: string | number, auditType: string): boolean {
  // For SVR: Score C is critical
  if (typeof score === 'string' && score.toUpperCase() === 'C') {
    return true;
  }

  // For percentage scores: below 60% is critical
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  if (!isNaN(numScore) && numScore < 60) {
    return true;
  }

  return false;
}
