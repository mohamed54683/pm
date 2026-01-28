"use client";
import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  project_name: string;
  submitted_by: string;
  date: string;
  status: string;
  receipt_url?: string;
}

interface NewExpense {
  description: string;
  amount: string;
  category: string;
  project_name: string;
  date: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
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
  other: '📋',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpense>({
    description: '',
    amount: '',
    category: 'other',
    project_name: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      // Mock data for now
      const mockExpenses: Expense[] = [
        { id: 1, description: 'Client meeting lunch', amount: 85.50, category: 'meals', project_name: 'Website Redesign', submitted_by: 'John Doe', date: '2026-01-25', status: 'approved' },
        { id: 2, description: 'Software license - Figma', amount: 150.00, category: 'software', project_name: 'Mobile App', submitted_by: 'Jane Smith', date: '2026-01-24', status: 'pending' },
        { id: 3, description: 'Conference attendance', amount: 450.00, category: 'training', project_name: 'General', submitted_by: 'Mike Johnson', date: '2026-01-20', status: 'reimbursed' },
        { id: 4, description: 'Office supplies', amount: 65.00, category: 'supplies', project_name: 'Internal', submitted_by: 'Sarah Wilson', date: '2026-01-18', status: 'approved' },
        { id: 5, description: 'Travel to client site', amount: 320.00, category: 'travel', project_name: 'API Integration', submitted_by: 'John Doe', date: '2026-01-15', status: 'pending' },
      ];
      
      const filtered = filter === 'all' 
        ? mockExpenses 
        : mockExpenses.filter(e => e.status === filter);
      
      setExpenses(filtered);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.project_name) {
      alert('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      // Create new expense locally
      const expense: Expense = {
        id: Date.now(),
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        project_name: newExpense.project_name,
        submitted_by: 'Current User',
        date: newExpense.date,
        status: 'pending',
      };
      setExpenses(prev => [expense, ...prev]);
      setShowCreateModal(false);
      setNewExpense({
        description: '',
        amount: '',
        category: 'other',
        project_name: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error creating expense:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const totalPending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const totalReimbursed = expenses.filter(e => e.status === 'reimbursed').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <PageBreadcrumb pageTitle="Expenses" />
      
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
          <p className="mt-1 text-2xl font-bold text-green-600">${totalApproved.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Reimbursed</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">${totalReimbursed.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total This Month</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            ${(totalPending + totalApproved + totalReimbursed).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Expense Reports
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track and manage project expenses
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="reimbursed">Reimbursed</option>
            </select>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Expense
            </button>
          </div>
        </div>

        {/* Expense List */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg className="mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No expenses found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                      <p className="text-xs text-gray-500">by {expense.submitted_by}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <span>{categoryIcons[expense.category] || '📋'}</span>
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{expense.category}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {expense.project_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[expense.status]}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => handleViewExpense(expense)}
                        className="text-sm text-brand-500 hover:text-brand-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Expense Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Add New Expense</h2>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount *</label>
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
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="travel">✈️ Travel</option>
                <option value="meals">🍽️ Meals</option>
                <option value="supplies">📦 Supplies</option>
                <option value="software">💻 Software</option>
                <option value="equipment">🛠️ Equipment</option>
                <option value="training">📚 Training</option>
                <option value="other">📋 Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
              <input
                type="text"
                value={newExpense.project_name}
                onChange={(e) => setNewExpense(prev => ({ ...prev, project_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense} disabled={creating}>
              {creating ? 'Submitting...' : 'Submit Expense'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Expense Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} className="max-w-lg">
        {selectedExpense && (
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Expense Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Description:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedExpense.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">${selectedExpense.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="capitalize">{categoryIcons[selectedExpense.category]} {selectedExpense.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Project:</span>
                <span>{selectedExpense.project_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted By:</span>
                <span>{selectedExpense.submitted_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>{new Date(selectedExpense.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[selectedExpense.status]}`}>
                  {selectedExpense.status}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
