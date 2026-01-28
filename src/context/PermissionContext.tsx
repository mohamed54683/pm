"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface PermissionContextType {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      setLoading(true);

      // Check if we're in the browser
      if (typeof window === 'undefined') {
        setPermissions([]);
        return;
      }

      // Get user role from localStorage
      const userRole = localStorage.getItem('userRole');

      if (!userRole) {
        console.warn('No user role found');
        setPermissions([]);
        return;
      }

      // Fetch role permissions from API
      const response = await fetch(`/api/settings/roles/permissions?role=${encodeURIComponent(userRole)}`);

      // Try to parse JSON; handle non-JSON responses gracefully
      let result: any = null;
      try {
        result = await response.json();
      } catch (e) {
        const text = await response.text().catch(() => '');
        console.error('Failed to fetch permissions: non-JSON response', response.status, response.statusText, text);
        setPermissions([]);
        return;
      }

      // Handle HTTP errors
      if (!response.ok) {
        const errMsg = result?.error || result?.message || response.statusText || 'Unknown error';
        console.error('Failed to fetch permissions:', response.status, errMsg);
        setPermissions([]);
        return;
      }

      if (result.success && result.data) {
        const rolePermissions = Array.isArray(result.data.permissions)
          ? result.data.permissions
          : (typeof result.data.permissions === 'string'
            ? JSON.parse(result.data.permissions || '[]')
            : []);

        setPermissions(rolePermissions);
      } else {
        console.error('Failed to fetch permissions:', result?.error || result?.message || 'Unknown');
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return false;
    }

    // Admin has all permissions
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return true;
    }

    const permission = permissions.find(p => p.module === module);
    if (!permission) return false;

    return permission[action] === true;
  };

  const canView = (module: string) => hasPermission(module, 'view');
  const canCreate = (module: string) => hasPermission(module, 'create');
  const canEdit = (module: string) => hasPermission(module, 'edit');
  const canDelete = (module: string) => hasPermission(module, 'delete');

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  return (
    <PermissionContext.Provider 
      value={{ 
        permissions, 
        loading, 
        hasPermission, 
        canView, 
        canCreate, 
        canEdit, 
        canDelete,
        refreshPermissions
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
