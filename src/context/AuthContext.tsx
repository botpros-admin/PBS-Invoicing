import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole } from '../types';
import { supabase } from '../api/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface Permission {
  resource: string;
  actions: string[];
}

// Added for type safety on RPC calls
interface UserPermission {
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
  session: Session | null;
  role: Role | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isPermissionsLoading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyPermission: (resource: string) => boolean;
  login: (email: string, password: string) => Promise<{ error?: Error }>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Type guard to validate user roles from the database
const isValidUserRole = (role: any): role is UserRole => {
  return ['super_admin', 'admin', 'ar_manager', 'staff'].includes(role);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(true);

  const fetchUserRole = async (roleId: string): Promise<Role | null> => {
    if (!roleId) return null;
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();
    
    if (error) {
      return null;
    }
    return data;
  };

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
  };

  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
    // Call the get_user_profile RPC function to securely fetch the user's profile.
    // This single function replaces the multiple, direct table queries.
    const { data: profile, error } = await supabase.rpc('get_user_profile');

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!profile) {
      console.warn('No user profile found for the authenticated user.');
      return null;
    }

    // Fetch user-specific and role-based permissions after getting the profile
    const { data: userPermissions, error: permissionsError } = await supabase.rpc('get_user_permissions');
    if (permissionsError) {
      console.error('Error fetching user permissions:', permissionsError);
    }

    const dbPermissions: Permission[] = userPermissions?.map((p: UserPermission) => ({
      resource: p.resource,
      actions: p.actions
    })) || [];

    // If the user is a staff member, fetch their role details to merge permissions
    if (profile.userType === 'staff' && profile.role_id) {
      const roleData = await fetchUserRole(profile.role_id);
      if (roleData) {
        setRole(roleData);
        const rolePermissions: Permission[] = [];
        if (roleData.permissions && typeof roleData.permissions === 'object') {
          Object.entries(roleData.permissions as Record<string, string[]>).forEach(([resource, actions]) => {
            if (Array.isArray(actions)) {
              rolePermissions.push({ resource, actions });
            }
          });
        }
        
        // Merge role and user-specific permissions
        const permissionMap = new Map<string, Set<string>>();
        rolePermissions.forEach(p => permissionMap.set(p.resource, new Set(p.actions)));
        dbPermissions.forEach(p => {
          const existing = permissionMap.get(p.resource) || new Set<string>();
          p.actions.forEach(action => existing.add(action));
          permissionMap.set(p.resource, existing);
        });

        setPermissions(Array.from(permissionMap, ([resource, actions]) => ({ resource, actions: Array.from(actions) })));
      }
    } else {
      // For client users or staff without a specific role, use only their direct permissions
      setPermissions(dbPermissions);
      setRole(profile.userType === 'client' ? { id: 'client', name: 'client', permissions: [] } : null);
    }

    // The RPC function returns a JSON object that matches the AppUser structure
    return profile as AppUser;
  };

  const setSessionData = async (currentSession: Session | null) => {
    setSession(currentSession);
    if (currentSession?.user) {
      setIsPermissionsLoading(true);
      const profile = await fetchUserProfile(currentSession.user);

      // Set user context for RLS after fetching the profile
      // This is CRITICAL for multi-tenant isolation!
      if (profile) {
        try {
          // Call set_user_context with the correct parameter name
          // The function will look up organization_id from the database
          const { data, error } = await supabase.rpc('set_user_context', {
            user_id: currentSession.user.id  // Changed from p_auth_id to user_id
          });
          
          if (error) {
            console.error('CRITICAL: Failed to set user context for RLS:', error);
            // SECURITY: Force immediate logout on RLS context failure
            clearUserState();
            await supabase.auth.signOut();
            throw new Error('Security context initialization failed. User has been logged out for safety.');
          } else if (data) {
            console.log('User context set successfully:', data);
          }
        } catch (error) {
          console.error('CRITICAL: Error calling set_user_context:', error);
          // SECURITY: Force immediate logout on RLS context failure
          clearUserState();
          await supabase.auth.signOut();
          throw new Error('Security context initialization failed. User has been logged out for safety.');
        }
      }
      
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
      } else {
        clearUserState();
        await supabase.auth.signOut();
      }
      setIsPermissionsLoading(false);
    } else {
      clearUserState();
      setIsPermissionsLoading(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => setSessionData(session))
      .catch(error => {
        console.error("Error initializing session:", error);
        // setSessionData handles logout, but we ensure state is clean as a fallback.
        clearUserState();
        setIsLoading(false);
        setIsPermissionsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Wrap in a promise chain to catch potential errors from setSessionData
      Promise.resolve(setSessionData(session)).catch(error => {
        console.error("Error processing auth state change:", error);
        // setSessionData already forces a logout on critical failure, so we just log it.
      });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return { error };
      }

      if (data?.user) {
        await setSessionData(data.session);
      }
      
      return {}; // Success
    } catch (error) {
      // This will catch critical errors from setSessionData (e.g., RLS failure)
      // and return them to the login form to be displayed.
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearUserState();
  };

  const refreshPermissions = async () => {
    if (session?.user) {
      setIsPermissionsLoading(true);
      await fetchUserProfile(session.user);
      setIsPermissionsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role,
      permissions,
      isAuthenticated, 
      isLoading, 
      isPermissionsLoading,
      hasPermission,
      hasAnyPermission,
      login, 
      logout,
      refreshPermissions 
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
