import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole } from '../types';

interface Permission {
  resource: string;
  actions: string[];
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

interface AuthContextType {
  user: AppUser | null;
  role: Role | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isPermissionsLoading: boolean;
  hasMfa: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyPermission: (resource: string) => boolean;
  login: (email: string, password: string) => Promise<{ error?: Error; requiresMfa?: boolean }>;
  verifyMfa: (factorId: string, code: string) => Promise<{ error?: Error }>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error?: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('pbs_invoicing_token');
};

// Helper to set auth token
const setAuthToken = (token: string) => {
  localStorage.setItem('pbs_invoicing_token', token);
};

// Helper to clear auth token
const clearAuthToken = () => {
  localStorage.removeItem('pbs_invoicing_token');
  localStorage.removeItem('pbs_invoicing_user');
};

// Helper for authenticated fetch requests
const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `Request failed: ${response.status}`);
  }

  return response.json();
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(false);
  const [hasMfa, setHasMfa] = useState<boolean>(false);

  const hasPermission = (resource: string, action: string): boolean => {
    if (isLoading || isPermissionsLoading) return false;
    const permission = permissions.find(p => p.resource === resource);
    return permission?.actions.includes(action) || false;
  };

  const hasAnyPermission = (resource: string): boolean => {
    if (isLoading || isPermissionsLoading) return false;
    return permissions.some(p => p.resource === resource && p.actions.length > 0);
  };

  const clearUserState = () => {
    setUser(null);
    setRole(null);
    setPermissions([]);
    setIsAuthenticated(false);
    setHasMfa(false);
    clearAuthToken();
  };

  const fetchUserProfile = async () => {
    try {
      const data = await authenticatedFetch('/auth/me');

      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);

        // Store user in localStorage for persistence
        localStorage.setItem('pbs_invoicing_user', JSON.stringify(data.user));

        // Set permissions if available
        if (data.permissions) {
          setPermissions(data.permissions);
        }

        // Set role if available
        if (data.role) {
          setRole(data.role);
        }

        return data.user;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      clearUserState();
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      const storedUser = localStorage.getItem('pbs_invoicing_user');

      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching user profile
          const profile = await fetchUserProfile();
          if (!profile) {
            clearUserState();
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          clearUserState();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authenticatedFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.requiresMfa) {
        setHasMfa(true);
        return { requiresMfa: true };
      }

      if (data.token && data.user) {
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('pbs_invoicing_user', JSON.stringify(data.user));

        // Fetch full profile with permissions
        await fetchUserProfile();

        return {};
      }

      return { error: new Error('Invalid response from server') };
    } catch (error) {
      console.error('Login error:', error);
      return { error: error instanceof Error ? error : new Error('Login failed') };
    }
  };

  const verifyMfa = async (factorId: string, code: string) => {
    try {
      const data = await authenticatedFetch('/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({ factorId, code }),
      });

      if (data.token && data.user) {
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        setHasMfa(false);
        localStorage.setItem('pbs_invoicing_user', JSON.stringify(data.user));

        // Fetch full profile with permissions
        await fetchUserProfile();

        return {};
      }

      return { error: new Error('Invalid MFA code') };
    } catch (error) {
      console.error('MFA verification error:', error);
      return { error: error instanceof Error ? error : new Error('MFA verification failed') };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await authenticatedFetch('/auth/logout', { method: 'POST' }).catch(() => {
        // Ignore errors on logout - clear local state anyway
      });
    } finally {
      clearUserState();
    }
  };

  const refreshPermissions = async () => {
    if (isAuthenticated) {
      setIsPermissionsLoading(true);
      await fetchUserProfile();
      setIsPermissionsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await authenticatedFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return {};
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error instanceof Error ? error : new Error('Password reset failed') };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      permissions,
      isAuthenticated,
      isLoading,
      isPermissionsLoading,
      hasMfa,
      hasPermission,
      hasAnyPermission,
      login,
      verifyMfa,
      logout,
      refreshPermissions,
      requestPasswordReset,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
