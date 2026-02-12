"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';

interface CRDetailProps {
  crId: string | number;
  onBack: () => void;
  onRefresh?: () => void;
}

const statusColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-300' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-400' },
  pending_approval: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400' },
  implemented: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-400' },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-500', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-500' },
};

const approvalStatusIcons: Record<string, { icon: string; color: string }> = {
  pending: { icon: '⏳', color: 'text-yellow-500' },
  approved: { icon: '✅', color: 'text-green-500' },
  rejected: { icon: '❌', color: 'text-red-500' },
  delegated: { icon: '↪️', color: 'text-blue-500' },
  skipped: { icon: '⏭️', color: 'text-gray-500' },
};

const activityIcons: Record<string, string> = {
  created: '🆕',
  updated: '✏️',
  status_changed: '🔄',
  submitted: '📤',
  approved: '✅',
  rejected: '❌',
  comment_added: '💬',
  attachment_uploaded: '📎',
  attachment_deleted: '🗑️',
  signature_added: '✍️',
  delegated: '↪️',
  implemented: '🚀',
  closed: '🔒',
  reopened: '🔓',
};

export default function CRDetail({ crId, onBack, onRefresh }: CRDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'approvals' | 'attachments' | 'comments' | 'activity'>('details');
  
  // Action states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const fetchCRDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/change-requests/${crId}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [crId]);

  useEffect(() => {
    fetchCRDetails();
  }, [fetchCRDetails]);

  const handleAction = async (action: string, comments?: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/change-requests/${crId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, comments })
      });
      const result = await response.json();
      if (result.success) {
        fetchCRDetails();
        onRefresh?.();
        setShowApprovalModal(false);
        setApprovalComment('');
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const response = await fetch(`/api/change-requests/${crId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment_text: newComment })
      });
      const result = await response.json();
      if (result.success) {
        setNewComment('');
        fetchCRDetails();
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <button onClick={onBack} className="mb-4 text-brand-500 hover:text-brand-600">
          ← Back to list
        </button>
        <p className="text-red-600 dark:text-red-400">{error || 'Failed to load change request'}</p>
      </div>
    );
  }

  const statusStyle = statusColors[data.status] || statusColors.draft;
  const { permissions } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="mb-2 text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Change Requests
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">{data.change_key}</h1>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.darkBg} ${statusStyle.darkText}`}>
              {data.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h2 className="text-lg text-gray-700 dark:text-gray-300 mt-1">{data.title}</h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {permissions.can_submit && (
            <Button onClick={() => handleAction('submit')}>
              📤 Submit for Review
            </Button>
          )}
          {permissions.can_approve && (
            <>
              <Button 
                className="bg-green-500 hover:bg-green-600"
                onClick={() => { setApprovalAction('approve'); setShowApprovalModal(true); }}
              >
                ✅ Approve
              </Button>
              <Button 
                className="bg-red-500 hover:bg-red-600"
                onClick={() => { setApprovalAction('reject'); setShowApprovalModal(true); }}
              >
                ❌ Reject
              </Button>
            </>
          )}
          {permissions.can_implement && (
            <Button 
              className="bg-purple-500 hover:bg-purple-600"
              onClick={() => handleAction('implement')}
            >
              🚀 Mark Implemented
            </Button>
          )}
          {permissions.can_close && (
            <Button variant="outline" onClick={() => handleAction('close')}>
              🔒 Close
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <InfoCard label="Project" value={data.project_name} icon="📁" />
        <InfoCard label="Category" value={data.category} icon="📂" />
        <InfoCard label="Priority" value={data.priority} icon="🎯" />
        <InfoCard label="Impact" value={data.impact_level || 'N/A'} icon="📊" />
        <InfoCard label="Requester" value={data.requester_name} icon="👤" />
        <InfoCard label="Submitted" value={data.submitted_date ? new Date(data.submitted_date).toLocaleDateString() : 'Not submitted'} icon="📅" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'details', label: 'Details', icon: '📋' },
            { id: 'approvals', label: `Approvals (${data.approvals?.length || 0})`, icon: '✅' },
            { id: 'attachments', label: `Attachments (${data.attachments?.length || 0})`, icon: '📎' },
            { id: 'comments', label: `Comments (${data.comments?.length || 0})`, icon: '💬' },
            { id: 'activity', label: 'Activity Log', icon: '📜' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <DetailSection title="Description" content={data.description} />
            <DetailSection title="Justification" content={data.justification} />
            <DetailSection title="Current State" content={data.current_state} />
            <DetailSection title="Proposed Change" content={data.proposed_change} />
            <DetailSection title="Benefits" content={data.benefits} />
            
            {/* Impact Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Impact Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ImpactCard label="Scope Impact" value={data.scope_impact} />
                <ImpactCard 
                  label="Schedule Impact" 
                  value={data.schedule_impact_days ? `${data.schedule_impact_days} days` : null} 
                />
                <ImpactCard 
                  label="Cost Impact" 
                  value={data.cost_impact ? `$${Number(data.cost_impact).toLocaleString()}` : null} 
                />
                <ImpactCard label="Risk Impact" value={data.risk_impact} />
                <ImpactCard label="Quality Impact" value={data.quality_impact} />
                <ImpactCard label="Resource Impact" value={data.resource_impact} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {data.approvals?.length > 0 ? (
              <div className="space-y-3">
                {data.approvals.map((approval: any, index: number) => {
                  const statusIcon = approvalStatusIcons[approval.status] || approvalStatusIcons.pending;
                  return (
                    <div 
                      key={approval.id} 
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xl ${statusIcon.color}`}>{statusIcon.icon}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{approval.approver_name}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">({approval.approver_email})</span>
                        </div>
                        {approval.step_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{approval.step_name}</p>
                        )}
                        {approval.comments && (
                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded">
                            "{approval.comments}"
                          </p>
                        )}
                        {approval.decision_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Decided: {new Date(approval.decision_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No approval workflow configured</p>
              </div>
            )}

            {/* Signatures */}
            {data.signatures?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Digital Signatures</h3>
                <div className="space-y-3">
                  {data.signatures.map((sig: any) => (
                    <div key={sig.id} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <span className="text-2xl">✍️</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{sig.user_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sig.user_role} • {new Date(sig.signed_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="ml-auto text-green-500">✓ Verified</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-4">
            {data.attachments?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.attachments.map((att: any) => (
                  <div 
                    key={att.id} 
                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-brand-300 dark:hover:border-brand-600"
                  >
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                      {getFileIcon(att.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{att.original_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(att.file_size)} • v{att.version} • {att.uploaded_by_name}
                      </p>
                    </div>
                    <button className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No attachments yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
              <Button type="submit" disabled={commentSubmitting || !newComment.trim()}>
                {commentSubmitting ? '...' : 'Post'}
              </Button>
            </form>

            {/* Comments List */}
            {data.comments?.length > 0 ? (
              <div className="space-y-4">
                {data.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-medium flex-shrink-0">
                      {comment.author_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{comment.author_name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">{comment.comment_text}</p>
                      
                      {/* Replies */}
                      {comment.replies?.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                          {comment.replies.map((reply: any) => (
                            <div key={reply.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">{reply.author_name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(reply.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{reply.comment_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            {data.activity?.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                <div className="space-y-4">
                  {data.activity.map((item: any) => (
                    <div key={item.id} className="relative pl-10">
                      <div className="absolute left-2 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs">
                        {activityIcons[item.action_type] || '📝'}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.performed_by_name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.performed_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {formatActivityMessage(item)}
                        </p>
                        {item.comments && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                            "{item.comments}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No activity recorded</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {approvalAction === 'approve' ? '✅ Approve' : '❌ Reject'} Change Request
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comments {approvalAction === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={approvalAction === 'reject' ? 'Please provide a reason for rejection...' : 'Optional comments...'}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                required={approvalAction === 'reject'}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancel
              </Button>
              <Button
                className={approvalAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                onClick={() => handleAction(approvalAction, approvalComment)}
                disabled={actionLoading || (approvalAction === 'reject' && !approvalComment.trim())}
              >
                {actionLoading ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Helper Components
function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
      <div className="text-lg mb-1">{icon}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium text-gray-900 dark:text-white capitalize truncate">{value}</p>
    </div>
  );
}

function DetailSection({ title, content }: { title: string; content?: string }) {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">{title}</h3>
      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function ImpactCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-gray-900 dark:text-white">{value || 'Not specified'}</p>
    </div>
  );
}

function getFileIcon(fileType: string): string {
  if (!fileType) return '📄';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('doc')) return '📘';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  return '📄';
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatActivityMessage(item: any): string {
  const messages: Record<string, string> = {
    created: 'Created this change request',
    updated: 'Updated the change request',
    status_changed: `Changed status from "${item.previous_value}" to "${item.new_value}"`,
    submitted: 'Submitted for review',
    approved: 'Approved this change request',
    rejected: 'Rejected this change request',
    comment_added: 'Added a comment',
    attachment_uploaded: 'Uploaded an attachment',
    attachment_deleted: 'Deleted an attachment',
    signature_added: 'Added digital signature',
    delegated: 'Delegated approval',
    implemented: 'Marked as implemented',
    closed: 'Closed this change request',
    reopened: 'Reopened this change request',
  };
  return messages[item.action_type] || item.action_type;
}
