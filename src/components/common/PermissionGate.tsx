"use client";
import { usePermissions } from '@/context/PermissionContext';
import React from 'react';

interface PermissionGateProps {
  module: string;
  action?: 'view' | 'create' | 'edit' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate Component
 * 
 * Conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGate module="Users Management" action="create">
 *   <button>Add User</button>
 * </PermissionGate>
 */
export function PermissionGate({ 
  module, 
  action = 'view', 
  children, 
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions();

  // Show loading state
  if (loading) {
    return <>{fallback}</>;
  }

  // Check permission
  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check permissions in component logic
 * 
 * @example
 * const { canCreate } = useModulePermissions('Users Management');
 * if (canCreate) {
 *   // Show create button
 * }
 */
export function useModulePermissions(module: string) {
  const { hasPermission, canView, canCreate, canEdit, canDelete } = usePermissions();

  return {
    canView: canView(module),
    canCreate: canCreate(module),
    canEdit: canEdit(module),
    canDelete: canDelete(module),
    hasPermission: (action: 'view' | 'create' | 'edit' | 'delete') => hasPermission(module, action)
  };
}
