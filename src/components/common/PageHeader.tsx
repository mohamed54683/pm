"use client";
import React from "react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  tabs?: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }[];
  filters?: React.ReactNode;
  stats?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
}

/**
 * Unified Page Header Component
 * Provides consistent header design across all dashboard pages
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb = [],
  actions,
  tabs,
  filters,
  stats,
}) => {
  return (
    <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="px-6 py-4">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <nav className="mb-2">
            <ol className="flex items-center gap-1.5 text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Home
                </Link>
              </li>
              {breadcrumb.map((item, index) => (
                <li key={index} className="flex items-center gap-1.5">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-gray-800 dark:text-white">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Title Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        {/* Quick Stats */}
        {stats && stats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-800"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}:</span>
                <span className={`text-sm font-semibold ${stat.color || 'text-gray-900 dark:text-white'}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="mt-4 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
            <nav className="-mb-px flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab.active
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Filters */}
        {filters && <div className="mt-4">{filters}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
