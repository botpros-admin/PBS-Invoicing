import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGuardProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  allowedRoles?: string[];
  userType?: 'staff' | 'client';
  fallback?: React.ReactNode;
  requireAll?: boolean; // For multiple permissions
}

/**
 * Component that conditionally renders children based on permissions
 * 
 * Usage examples:
 * 
 * // Check specific permission
 * <PermissionGuard resource="invoices" action="create">
 *   <CreateInvoiceButton />
 * </PermissionGuard>
 * 
 * // Check role
 * <PermissionGuard allowedRoles={['superadmin', 'admin']}>
 *   <AdminPanel />
 * </PermissionGuard>
 * 
 * // Check user type
 * <PermissionGuard userType="staff">
 *   <StaffOnlyFeature />
 * </PermissionGuard>
 * 
 * // With custom fallback
 * <PermissionGuard resource="reports" action="generate" fallback={<LockedFeature />}>
 *   <GenerateReportButton />
 * </PermissionGuard>
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  resource,
  action,
  allowedRoles,
  userType,
  fallback = null,
  requireAll = false
}) => {
  const { user, hasPermission, isLoading, isPermissionsLoading } = useAuth();

  // Don't render anything while loading
  if (isLoading || isPermissionsLoading) {
    return null;
  }

  // No user means no access
  if (!user) {
    return <>{fallback}</>;
  }

  const checks: boolean[] = [];

  // Check user type
  if (userType && user.userType !== userType) {
    return <>{fallback}</>;
  }

  // Check permission
  if (resource && action) {
    const hasRequiredPermission = hasPermission(resource, action);
    if (requireAll) {
      checks.push(hasRequiredPermission);
    } else if (!hasRequiredPermission) {
      return <>{fallback}</>;
    }
  }

  // Check role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.includes(user.role);
    if (requireAll) {
      checks.push(hasRequiredRole);
    } else if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // If requireAll is true, all checks must pass
  if (requireAll && checks.length > 0) {
    const allChecksPassed = checks.every(check => check === true);
    if (!allChecksPassed) {
      return <>{fallback}</>;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default PermissionGuard;