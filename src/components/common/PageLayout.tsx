"use client";
import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  /** Apply full min-height screen background */
  fullHeight?: boolean;
  /** Custom className for content area */
  contentClassName?: string;
  /** Padding size: 'none' | 'sm' | 'md' | 'lg' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Unified Page Layout Component
 * Provides consistent layout structure across all dashboard pages
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  fullHeight = true,
  contentClassName = '',
  padding = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`${fullHeight ? 'min-h-screen' : ''} bg-gray-50 dark:bg-gray-900`}
    >
      <div className={contentClassName || paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
