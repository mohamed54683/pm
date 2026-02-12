"use client";
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Card padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Card header */
  header?: React.ReactNode;
  /** Card footer */
  footer?: React.ReactNode;
  /** Whether to show hover effect */
  hoverable?: boolean;
  /** Border accent color (left border) */
  accentColor?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray';
}

/**
 * Unified Card Component
 * Provides consistent card styling across all dashboard pages
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  header,
  footer,
  hoverable = false,
  accentColor,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const accentClasses = accentColor
    ? {
        blue: 'border-l-4 border-l-blue-500',
        green: 'border-l-4 border-l-green-500',
        red: 'border-l-4 border-l-red-500',
        yellow: 'border-l-4 border-l-yellow-500',
        purple: 'border-l-4 border-l-purple-500',
        orange: 'border-l-4 border-l-orange-500',
        gray: 'border-l-4 border-l-gray-500',
      }[accentColor]
    : '';

  return (
    <div
      className={`
        rounded-xl bg-white shadow-sm dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700
        ${accentClasses}
        ${hoverable ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5' : ''}
        ${className}
      `.trim()}
    >
      {header && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
};

// KPI Card variant for dashboard metrics
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
    green: 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10',
    red: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    yellow: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
    purple: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10',
    orange: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
    gray: 'border-l-gray-500 bg-gray-50/50 dark:bg-gray-800/50',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div
      className={`
        rounded-xl border-l-4 p-4 shadow-sm
        ${colorClasses[color]}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                trendUp ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trendUp ? (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-gray-700 ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
