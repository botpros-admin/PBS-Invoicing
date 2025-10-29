import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import DnaSpinner from './common/DnaSpinner'; // No longer needed

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string; // Where to redirect if user IS authenticated
}

/**
 * A route wrapper that redirects authenticated users away from public-only pages (like Login).
 */
const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/billing/dashboard', // Default redirect for authenticated users
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Priority 1: If user is definitively authenticated, redirect immediately.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Priority 2: If still loading the initial state AND not authenticated yet, render nothing to prevent flashes.
  if (isLoading) {
    return null;
  }

  // Priority 3: If not loading AND not authenticated, render the children (Login page).
  return <>{children}</>;
};

export default PublicRoute;
