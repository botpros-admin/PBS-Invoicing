import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, ClientUserRole } from '../types';
import DnaSpinner from './common/DnaSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: (UserRole | ClientUserRole)[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  
  // Debug logging
  console.log('[ProtectedRoute] Current path:', location.pathname);
  console.log('[ProtectedRoute] Loading:', isLoading, 'Authenticated:', isAuthenticated, 'User:', user?.email);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <DnaSpinner text="Verifying authentication..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const currentPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${redirectTo}?redirect=${currentPath}`} replace />;
  }

  // The new AppUser type has a `role` property for both staff and clients.
  // We can check it directly.
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role as any)) {
    console.warn(`[ProtectedRoute] Access denied: User role '${user.role}' not in allowed roles:`, allowedRoles);
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
