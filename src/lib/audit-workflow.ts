/**
 * Audit Approval Workflow
 * Manages status transitions: draft → submitted → approved/rejected
 */

export type AuditStatus = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected';

export interface ApprovalRecord {
  status: AuditStatus;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  submitted_by?: string;
  submitted_at?: string;
  comments?: string;
  history: ApprovalHistoryEntry[];
}

export interface ApprovalHistoryEntry {
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'returned';
  by: string;
  at: string;
  comments?: string;
  from_status?: AuditStatus;
  to_status: AuditStatus;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<AuditStatus, AuditStatus[]> = {
  draft: ['submitted'],
  submitted: ['pending_approval', 'rejected'],
  pending_approval: ['approved', 'rejected'],
  approved: [], // Final state
  rejected: ['draft', 'submitted'], // Can be revised and resubmitted
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: AuditStatus, to: AuditStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get allowed next statuses for current status
 */
export function getAllowedTransitions(currentStatus: AuditStatus): AuditStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if user has permission to perform approval action
 */
export function canApprove(userRole: string): boolean {
  const approverRoles = ['Super Admin', 'Admin', 'Manager'];
  return approverRoles.includes(userRole);
}

/**
 * Check if user can submit for approval
 */
export function canSubmit(userRole: string): boolean {
  const submitterRoles = ['Super Admin', 'Admin', 'Manager', 'Auditor'];
  return submitterRoles.includes(userRole);
}

/**
 * Create initial approval record
 */
export function createApprovalRecord(createdBy: string): ApprovalRecord {
  const now = new Date().toISOString();
  return {
    status: 'draft',
    submitted_by: createdBy,
    submitted_at: now,
    history: [{
      action: 'created',
      by: createdBy,
      at: now,
      to_status: 'draft'
    }]
  };
}

/**
 * Submit audit for approval
 */
export function submitForApproval(
  current: ApprovalRecord,
  submittedBy: string,
  comments?: string
): ApprovalRecord {
  if (!isValidTransition(current.status, 'submitted')) {
    throw new Error(`Cannot submit from status: ${current.status}`);
  }

  const now = new Date().toISOString();
  return {
    ...current,
    status: 'submitted',
    submitted_by: submittedBy,
    submitted_at: now,
    comments,
    history: [
      ...current.history,
      {
        action: 'submitted',
        by: submittedBy,
        at: now,
        comments,
        from_status: current.status,
        to_status: 'submitted'
      }
    ]
  };
}

/**
 * Approve an audit
 */
export function approveAudit(
  current: ApprovalRecord,
  approvedBy: string,
  comments?: string
): ApprovalRecord {
  const fromStatus = current.status;
  if (!isValidTransition(fromStatus, 'approved') && fromStatus !== 'submitted') {
    throw new Error(`Cannot approve from status: ${fromStatus}`);
  }

  const now = new Date().toISOString();
  return {
    ...current,
    status: 'approved',
    approved_by: approvedBy,
    approved_at: now,
    comments,
    history: [
      ...current.history,
      {
        action: 'approved',
        by: approvedBy,
        at: now,
        comments,
        from_status: fromStatus,
        to_status: 'approved'
      }
    ]
  };
}

/**
 * Reject an audit
 */
export function rejectAudit(
  current: ApprovalRecord,
  rejectedBy: string,
  reason: string
): ApprovalRecord {
  const fromStatus = current.status;
  if (!isValidTransition(fromStatus, 'rejected') && fromStatus !== 'submitted' && fromStatus !== 'pending_approval') {
    throw new Error(`Cannot reject from status: ${fromStatus}`);
  }

  const now = new Date().toISOString();
  return {
    ...current,
    status: 'rejected',
    rejected_by: rejectedBy,
    rejected_at: now,
    rejection_reason: reason,
    history: [
      ...current.history,
      {
        action: 'rejected',
        by: rejectedBy,
        at: now,
        comments: reason,
        from_status: fromStatus,
        to_status: 'rejected'
      }
    ]
  };
}

/**
 * Return audit for revision (after rejection)
 */
export function returnForRevision(
  current: ApprovalRecord,
  returnedBy: string,
  comments?: string
): ApprovalRecord {
  if (current.status !== 'rejected') {
    throw new Error(`Can only return rejected audits for revision`);
  }

  const now = new Date().toISOString();
  return {
    ...current,
    status: 'draft',
    history: [
      ...current.history,
      {
        action: 'returned',
        by: returnedBy,
        at: now,
        comments,
        from_status: 'rejected',
        to_status: 'draft'
      }
    ]
  };
}

/**
 * Get status display info
 */
export function getStatusInfo(status: AuditStatus): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
} {
  const statusMap = {
    draft: {
      label: 'Draft',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Not yet submitted for review'
    },
    submitted: {
      label: 'Submitted',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Awaiting manager review'
    },
    pending_approval: {
      label: 'Pending Approval',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Under review by approver'
    },
    approved: {
      label: 'Approved',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Approved and finalized'
    },
    rejected: {
      label: 'Rejected',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Rejected - requires revision'
    }
  };

  return statusMap[status] || statusMap.draft;
}
