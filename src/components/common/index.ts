// Common Components - Unified Design System
export { default as PageHeader } from './PageHeader';
export { default as PageLayout } from './PageLayout';
export { default as Card, KPICard } from './Card';
export { default as PageBreadcrumb } from './PageBreadCrumb';
export { default as ComponentCard } from './ComponentCard';
export { default as PermissionGate } from './PermissionGate';

// Design Tokens - Consistent styling across the application
export const designTokens = {
  // Status Colors
  status: {
    backlog: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300' },
    todo: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300' },
    to_do: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300' },
    in_progress: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300' },
    in_review: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300' },
    blocked: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
    done: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300' },
    completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300' },
    archived: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-500', border: 'border-gray-300' },
  },

  // Priority Colors
  priority: {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
    low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    none: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  },

  // Risk Levels
  risk: {
    critical: { bg: 'bg-red-500', text: 'text-white', light: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    high: { bg: 'bg-orange-500', text: 'text-white', light: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    medium: { bg: 'bg-yellow-500', text: 'text-white', light: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    low: { bg: 'bg-green-500', text: 'text-white', light: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  },

  // Form Input Styles
  input: {
    base: 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
    disabled: 'cursor-not-allowed opacity-50',
  },

  // Button Styles
  button: {
    primary: 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50',
    secondary: 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
    danger: 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50',
    ghost: 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
  },

  // Table Styles
  table: {
    wrapper: 'overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
    header: 'bg-gray-50 dark:bg-gray-900',
    headerCell: 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400',
    row: 'border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50',
    cell: 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100',
  },

  // Badge/Tag Styles
  badge: {
    base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  },

  // Card Styles
  card: {
    base: 'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
    header: 'border-b border-gray-200 px-4 py-3 dark:border-gray-700',
    body: 'p-4',
    footer: 'border-t border-gray-200 px-4 py-3 dark:border-gray-700',
  },

  // Modal Styles
  modal: {
    overlay: 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
    content: 'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-xl dark:bg-gray-800',
    header: 'flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700',
    body: 'max-h-[70vh] overflow-y-auto px-6 py-4',
    footer: 'flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700',
  },

  // Page Layout Styles
  page: {
    container: 'min-h-screen bg-gray-50 dark:bg-gray-900',
    header: 'border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950',
    content: 'p-6',
  },
} as const;

// Helper function to get status styles
export const getStatusStyles = (status: string) => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return designTokens.status[normalizedStatus as keyof typeof designTokens.status] || designTokens.status.backlog;
};

// Helper function to get priority styles
export const getPriorityStyles = (priority: string) => {
  const normalizedPriority = priority.toLowerCase();
  return designTokens.priority[normalizedPriority as keyof typeof designTokens.priority] || designTokens.priority.none;
};

// Helper function to get risk level styles
export const getRiskStyles = (level: string) => {
  const normalizedLevel = level.toLowerCase();
  return designTokens.risk[normalizedLevel as keyof typeof designTokens.risk] || designTokens.risk.low;
};
