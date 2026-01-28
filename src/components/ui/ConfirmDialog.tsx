"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmDelete: (itemName: string, onConfirm?: () => void | Promise<void>) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

const variantStyles: Record<ConfirmVariant, {
  icon: string;
  iconBg: string;
  button: string;
}> = {
  danger: {
    icon: 'text-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
  },
  warning: {
    icon: 'text-yellow-600',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
  },
  info: {
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  }
};

const icons: Record<ConfirmVariant, React.ReactNode> = {
  danger: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

function ConfirmDialogComponent({
  options,
  onResolve
}: {
  options: ConfirmOptions;
  onResolve: (result: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const variant = options.variant || 'danger';
  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (options.onConfirm) {
        await options.onConfirm();
      }
      onResolve(true);
    } catch (error) {
      console.error('Confirm action failed:', error);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    onResolve(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl transition-all sm:w-full sm:max-w-lg">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                <span className={styles.icon}>
                  {icons[variant]}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {options.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {options.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${styles.button}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  options.confirmText || 'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<{
    options: ConfirmOptions;
    resolve: (result: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ options, resolve });
    });
  }, []);

  const confirmDelete = useCallback((itemName: string, onConfirm?: () => void | Promise<void>): Promise<boolean> => {
    return confirm({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm
    });
  }, [confirm]);

  const handleResolve = useCallback((result: boolean) => {
    if (dialog) {
      dialog.resolve(result);
      setDialog(null);
    }
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      {dialog && (
        <ConfirmDialogComponent
          options={dialog.options}
          onResolve={handleResolve}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
