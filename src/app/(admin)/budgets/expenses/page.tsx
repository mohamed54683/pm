"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Expense {
  id: number;
  uuid: string;
  description: string;
  amount: number;
  expense_type: string;
  project_id: number | null;
  project_name: string | null;
  user_first_name: string;
  user_last_name: string;
  expense_date: string;
  status: string;
  receipt_url?: string;
  vendor?: string;
  is_billable: boolean;
  is_reimbursable: boolean;
  rejection_reason?: string;
}

interface ExpenseSummary {
  total_expenses: number;
  approved_expenses: number;
  pending_expenses: number;
  rejected_expenses: number;
  billable_expenses: number;
  total_count: number;
}

interface NewExpense {
  description: string;
  amount: string;
  expense_type: string;
  project_id: string;
  expense_date: string;
  vendor: string;
  is_billable: boolean;
  is_reimbursable: boolean;
}

interface Project {
  id: number;
  name: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  reimbursed: 'bg-blue-100 text-blue-800',
};

const categoryIcons: Record<string, string> = {
  travel: '✈️',
  meals: '🍽️',
  supplies: '📦',
  software: '💻',
  equipment: '🛠️',
  training: '📚',
  accommodation: '🏨',
  transport: '🚗',
  communication: '📱',
  other: '📋',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpense>({
    description: '',
    amount: '',
    expense_type: 'other',
    project_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    is_billable: false,
    is_reimbursable: true,
  });

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const response = await fetch(`/api/expenses?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setExpenses(result.data || []);
        setSummary(result.summary || null);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryFilter]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const result = await response.json();
      if (result.success) {
        setProjects(result.data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    loadExpenses();
    loadProjects();
  }, [loadExpenses]);

  const handleCreateExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.expense_date) {
      alert('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          expense_type: newExpense.expense_type,
          project_id: newExpense.project_id ? parseInt(newExpense.project_id) : null,
          expense_date: newExpense.expense_date,
          vendor: newExpense.vendor || null,
          is_billable: newExpense.is_billable,
          is_reimbursable: newExpense.is_reimbursable,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        setNewExpense({
          description: '',
          amount: '',
          expense_type: 'other',
          project_id: '',
          expense_date: new Date().toISOString().split('T')[0],
          vendor: '',
          is_billable: false,
          is_reimbursable: true,
        });
        loadExpenses();
      } else {
        alert(result.error || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitExpense = async (expense: Expense) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, status: 'submitted' }),
      });
      const result = await response.json();
      if (result.success) {
        loadExpenses();
        setShowViewModal(false);
      } else {
        alert(result.error || 'Failed to submit expense');
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
    }
  };

  const handleApproveExpense = async (expense: Expense) => {
    setApproving(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, status: 'approved' }),
      });
      const result = await response.json();
      if (result.success) {
        loadExpenses();
        setShowViewModal(false);
      } else {
        alert(result.error || 'Failed to approve expense');
      }
    } catch (error) {
      console.error('Error approving expense:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectExpense = async (expense: Expense) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    setApproving(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, status: 'rejected', rejection_reason: reason }),
      });
      const result = await response.json();
      if (result.success) {
        loadExpenses();
        setShowViewModal(false);
      } else {
        alert(result.error || 'Failed to reject expense');
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const response = await fetch(`/api/expenses?id=${expense.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        loadExpenses();
        setShowViewModal(false);
      } else {
        alert(result.error || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const formatCurrency = (amount: number) => `ر.س ${amount.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <PageBreadcrumb pageTitle="Expenses" />
      
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="page-subtitle">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{formatCurrency(summary?.pending_expenses || 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="page-subtitle">Approved</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(summary?.approved_expenses || 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="page-subtitle">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(summary?.total_expenses || 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="page-subtitle">Billable</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(summary?.billable_expenses || 0)}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {['all', 'draft', 'submitted', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="all">All Categories</option>
          {Object.keys(categoryIcons).map(cat => (
            <option key={cat} value={cat}>{categoryIcons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
        </select>
        
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            + New Expense
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <span className="text-4xl">📋</span>
            <p className="mt-2">No expenses found</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create First Expense
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Submitted By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{expense.description}</div>
                    {expense.vendor && <div className="text-xs text-gray-500">{expense.vendor}</div>}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(expense.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      {categoryIcons[expense.expense_type] || '📋'}
                      <span className="capitalize">{expense.expense_type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{expense.project_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {expense.user_first_name} {expense.user_last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[expense.status]}`}>
                      {expense.status}
                    </span>
                    {expense.is_billable && (
                      <span className="ml-1 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        Billable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewExpense(expense)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Expense Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="p-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">New Expense</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="Enter expense description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (SAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                <input
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, expense_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={newExpense.expense_type}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, expense_type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                >
                  {Object.keys(categoryIcons).map(cat => (
                    <option key={cat} value={cat}>{categoryIcons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Project</label>
                <select
                  value={newExpense.project_id}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor</label>
              <input
                type="text"
                value={newExpense.vendor}
                onChange={(e) => setNewExpense(prev => ({ ...prev, vendor: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="Vendor name (optional)"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newExpense.is_billable}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, is_billable: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Billable to client</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newExpense.is_reimbursable}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, is_reimbursable: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Reimbursable</span>
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense} disabled={creating}>
              {creating ? 'Creating...' : 'Create Expense'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Expense Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)}>
        {selectedExpense && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="card-title text-xl">Expense Details</h2>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedExpense.status]}`}>
                {selectedExpense.status}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{selectedExpense.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {categoryIcons[selectedExpense.expense_type]} {selectedExpense.expense_type}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Project</p>
                  <p className="text-gray-900 dark:text-white">{selectedExpense.project_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedExpense.expense_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Submitted By</p>
                  <p className="text-gray-900 dark:text-white">{selectedExpense.user_first_name} {selectedExpense.user_last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="text-gray-900 dark:text-white">{selectedExpense.vendor || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                {selectedExpense.is_billable && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">Billable</span>
                )}
                {selectedExpense.is_reimbursable && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">Reimbursable</span>
                )}
              </div>
              
              {selectedExpense.rejection_reason && (
                <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">Rejection Reason:</p>
                  <p className="text-red-700 dark:text-red-300">{selectedExpense.rejection_reason}</p>
                </div>
              )}
              
              {selectedExpense.receipt_url && (
                <div>
                  <p className="text-sm text-gray-500">Receipt</p>
                  <a href={selectedExpense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View Receipt
                  </a>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              {selectedExpense.status === 'draft' && (
                <>
                  <Button variant="outline" onClick={() => handleDeleteExpense(selectedExpense)}>Delete</Button>
                  <Button onClick={() => handleSubmitExpense(selectedExpense)}>Submit for Approval</Button>
                </>
              )}
              {selectedExpense.status === 'submitted' && (
                <>
                  <Button variant="outline" onClick={() => handleRejectExpense(selectedExpense)} disabled={approving}>
                    Reject
                  </Button>
                  <Button onClick={() => handleApproveExpense(selectedExpense)} disabled={approving}>
                    {approving ? 'Processing...' : 'Approve'}
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
