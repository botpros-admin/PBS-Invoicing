import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import DnaSpinner from './common/DnaSpinner'; // Use the correct spinner import

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * Simplified ProtectedRoute component relying solely on AuthContext state.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation(); // Keep location for redirect query param

  // Show loading indicator while AuthContext is initializing
  if (isLoading) {
    console.log('[ProtectedRoute] Auth context is loading...');
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <DnaSpinner text="Verifying authentication..." />
      </div>
    );
  }

  // If not loading and not authenticated, redirect to login
  if (!isAuthenticated) {
    console.warn('[ProtectedRoute] User not authenticated, redirecting to login.');
    // Pass the current path as a redirect query parameter
    const currentPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${redirectTo}?redirect=${currentPath}`} replace />;
  }

  // User is authenticated, check roles if specified
  // Assuming 'admin' role bypasses specific role checks (adjust if needed)
  const isAdmin = user?.role === 'admin';

  if (!isAdmin && allowedRoles.length > 0 && user) {
    const userRole = user.role; // Role should be correctly populated by AuthContext
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[ProtectedRoute] Access denied: User role '${userRole}' not in allowed roles:`, allowedRoles);
      return <Navigate to="/forbidden" replace />; // Redirect to a 'Forbidden' page
    }
  }

  // User is authenticated and has the required role (or no specific roles required)
  console.log('[ProtectedRoute] User authenticated and authorized. Rendering children.');
  return <>{children}</>;
};

export default ProtectedRoute;
