import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PermissionGuardProps {
  resource: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode | string;
  requireAll?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  children,
  fallback = null,
  requireAll = false
}) => {
  const { hasPermission, hasAnyPermission, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const hasAccess = action 
    ? hasPermission(resource, action)
    : hasAnyPermission(resource);

  if (!hasAccess) {
    if (typeof fallback === 'string') {
      return <Navigate to={fallback} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for programmatic permission checking
export const usePermission = (resource: string, action?: string) => {
  const { hasPermission, hasAnyPermission } = useAuth();
  
  if (action) {
    return hasPermission(resource, action);
  }
  return hasAnyPermission(resource);
};

// HOC for wrapping components with permission checks
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  resource: string,
  action?: string,
  fallback?: React.ReactNode
) {
  return (props: P) => (
    <PermissionGuard resource={resource} action={action} fallback={fallback}>
      <Component {...props} />
    </PermissionGuard>
  );
}