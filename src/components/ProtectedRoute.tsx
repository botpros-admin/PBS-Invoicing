import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, ClientUserRole } from '../types';
import DnaSpinner from './common/DnaSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: (UserRole | ClientUserRole)[];
  requiredPermission?: {
    resource: string;
    action: string;
  };
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requiredPermission,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, isPermissionsLoading, user, hasPermission } = useAuth();
  const location = useLocation();
  
  // Debug logging
    '[ProtectedRoute] Path:', location.pathname,
    'isLoading:', isLoading,
    'isPermissionsLoading:', isPermissionsLoading,
    'isAuthenticated:', isAuthenticated,
    'User:', user?.email,
    'RequiredPermission:', requiredPermission
  );

  // Show loading spinner while authentication or permissions are loading
  if (isLoading || isPermissionsLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <DnaSpinner text="Verifying permissions..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    const currentPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${redirectTo}?redirect=${currentPath}`} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role as any)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
      `[ProtectedRoute] Access denied: User lacks permission '${requiredPermission.action}' on resource '${requiredPermission.resource}'`
    );
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
