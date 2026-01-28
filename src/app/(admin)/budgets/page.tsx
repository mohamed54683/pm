"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Project {
  id: number;
  name: string;
  code: string;
}

interface Budget {
  id: number;
  uuid: string;
  project_id: number;
  project_name: string;
  project_code: string;
  total_budget: number;
  actual_cost: number;
  remaining_budget: number;
  cpi: number;
  currency: string;
  fiscal_year: number;
  status: string;
  line_items: BudgetLineItem[];
}

interface BudgetLineItem {
  id: number;
  category: string;
  description: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percent: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  over_budget: 'bg-red-100 text-red-700',
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    project_id: '',
    total_budget: '',
    fiscal_year: new Date().getFullYear().toString(),
    currency: 'USD'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBudgets();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.project_id || !newBudget.total_budget) return;
    setCreating(true);
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: parseInt(newBudget.project_id),
          total_budget: parseFloat(newBudget.total_budget),
          fiscal_year: parseInt(newBudget.fiscal_year),
          currency: newBudget.currency
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        setNewBudget({
          project_id: '',
          total_budget: '',
          fiscal_year: new Date().getFullYear().toString(),
          currency: 'USD'
        });
        loadBudgets();
      } else {
        alert(result.error || 'Failed to create budget');
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      alert('Failed to create budget');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budgets?fiscalYear=${fiscalYear}&includeLineItems=true`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setBudgets(result.data);
        if (result.data.length > 0 && !selectedBudget) {
          setSelectedBudget(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCPIStatus = (cpi: number) => {
    if (cpi >= 1) return { color: 'text-emerald-600', label: 'Under Budget' };
    if (cpi >= 0.9) return { color: 'text-amber-600', label: 'At Risk' };
    return { color: 'text-red-600', label: 'Over Budget' };
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.actual_cost, 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining_budget, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track project budgets and financial performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>FY {year}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Budget
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalBudget)}</p>
            <p className="mt-1 text-sm text-gray-500">FY {fiscalYear}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Actual Cost</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalActual)}</p>
            <p className="mt-1 text-sm text-gray-500">{Math.round((totalActual / totalBudget) * 100)}% of budget</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
            <p className={`text-3xl font-bold ${totalRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totalRemaining)}
            </p>
            <p className="mt-1 text-sm text-gray-500">{totalRemaining >= 0 ? 'Under budget' : 'Over budget'}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Projects</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{budgets.length}</p>
            <p className="mt-1 text-sm text-gray-500">With active budgets</p>
          </div>
        </div>

        {budgets.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No budgets found for FY {fiscalYear}</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Budget List */}
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Project Budgets</h2>
              {budgets.map((budget) => {
                const cpiStatus = getCPIStatus(budget.cpi);
                return (
                  <div
                    key={budget.id}
                    onClick={() => setSelectedBudget(budget)}
                    className={`cursor-pointer rounded-xl p-4 shadow-sm transition-all ${
                      selectedBudget?.id === budget.id
                        ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-900/20'
                        : 'bg-white hover:shadow-md dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{budget.project_name}</p>
                        <p className="text-xs text-gray-500">{budget.project_code}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[budget.status]}`}>
                        {budget.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Budget: {formatCurrency(budget.total_budget, budget.currency)}</span>
                        <span className={cpiStatus.color}>CPI: {budget.cpi.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-2 rounded-full ${budget.actual_cost > budget.total_budget ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min((budget.actual_cost / budget.total_budget) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-gray-500">
                        <span>{formatCurrency(budget.actual_cost, budget.currency)} spent</span>
                        <span>{formatCurrency(budget.remaining_budget, budget.currency)} remaining</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Budget Details */}
            {selectedBudget && (
              <div className="lg:col-span-2 space-y-6">
                {/* Budget Overview */}
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedBudget.project_name}</h2>
                      <p className="text-gray-500">{selectedBudget.project_code}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedBudget.status]}`}>
                      {selectedBudget.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <p className="text-sm text-gray-500">Total Budget</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(selectedBudget.total_budget, selectedBudget.currency)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <p className="text-sm text-gray-500">Actual Cost</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(selectedBudget.actual_cost, selectedBudget.currency)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <p className="text-sm text-gray-500">Remaining</p>
                      <p className={`text-xl font-bold ${selectedBudget.remaining_budget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedBudget.remaining_budget, selectedBudget.currency)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <p className="text-sm text-gray-500">CPI</p>
                      <p className={`text-xl font-bold ${getCPIStatus(selectedBudget.cpi).color}`}>
                        {selectedBudget.cpi.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Budget Line Items</h3>
                  </div>
                  
                  {selectedBudget.line_items && selectedBudget.line_items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Budgeted</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actual</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Variance</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedBudget.line_items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white capitalize">
                                {item.category.replace('_', ' ')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {item.description}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                                {formatCurrency(item.budgeted_amount, selectedBudget.currency)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                                {formatCurrency(item.actual_amount, selectedBudget.currency)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right">
                                <span className={`text-sm font-medium ${item.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatCurrency(item.variance, selectedBudget.currency)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right">
                                <span className={`text-sm ${item.variance_percent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {item.variance_percent >= 0 ? '+' : ''}{item.variance_percent.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      No line items defined for this budget
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Budget Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Budget</h2>
          <form onSubmit={handleCreateBudget} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={newBudget.project_id}
                onChange={(e) => setNewBudget({ ...newBudget, project_id: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Budget *</label>
              <input
                type="number"
                value={newBudget.total_budget}
                onChange={(e) => setNewBudget({ ...newBudget, total_budget: e.target.value })}
                required
                min="0"
                step="1000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 100000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiscal Year</label>
                <select
                  value={newBudget.fiscal_year}
                  onChange={(e) => setNewBudget({ ...newBudget, fiscal_year: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                <select
                  value={newBudget.currency}
                  onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="MYR">MYR</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newBudget.project_id || !newBudget.total_budget}>
                {creating ? 'Creating...' : 'Create Budget'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
