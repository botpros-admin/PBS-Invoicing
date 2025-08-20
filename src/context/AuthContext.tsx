import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser } from '../types';
import { supabase } from '../api/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

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
      console.error('Error fetching user role:', error);
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
    // First try to fetch from users table (PBS staff)
    const { data: staffProfile, error: staffError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', supabaseUser.id)
      .single();

    if (staffProfile && !staffError) {
      // This is a PBS staff member
      console.log('[AuthContext] Found PBS staff profile:', staffProfile.email);
      
      // Fetch role if role_id exists
      if (staffProfile.role_id) {
        const roleData = await fetchUserRole(staffProfile.role_id);
        if (roleData) {
          setRole(roleData);
          // Parse permissions from JSONB
          const parsedPermissions: Permission[] = [];
          if (roleData.permissions && typeof roleData.permissions === 'object') {
            Object.entries(roleData.permissions as any).forEach(([resource, actions]) => {
              if (Array.isArray(actions)) {
                parsedPermissions.push({ resource, actions });
              }
            });
          }
          setPermissions(parsedPermissions);
        }
      } else {
        // Fallback to role field for backward compatibility
        console.warn(`Staff user ${staffProfile.email} has no role_id, using legacy role field:`, staffProfile.role);
        setRole(null);
        setPermissions([]);
      }

      return {
        userType: 'staff',
        id: staffProfile.id,
        name: `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim() || staffProfile.email,
        email: staffProfile.email,
        role: (staffProfile.role as any) || 'staff',
        status: staffProfile.status || 'active',
        mfaEnabled: staffProfile.mfa_enabled || false,
        createdAt: staffProfile.created_at,
        updatedAt: staffProfile.updated_at,
        organizationId: staffProfile.organization_id,
      };
    }

    // If not found in users table, try client_users table
    const { data: clientProfile, error: clientError } = await supabase
      .from('client_users')
      .select('*, clients!inner(*)')
      .eq('auth_id', supabaseUser.id)
      .single();

    if (clientProfile && !clientError) {
      // This is a client portal user
      console.log('[AuthContext] Found client portal user:', clientProfile.email);
      
      // Client users have limited permissions
      setRole({ id: 'client', name: 'client', permissions: [] });
      setPermissions([
        { resource: 'invoices', actions: ['read'] },
        { resource: 'payments', actions: ['read', 'create'] },
        { resource: 'reports', actions: ['read'] }
      ]);

      return {
        userType: 'client',
        id: clientProfile.id,
        name: `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.email,
        email: clientProfile.email,
        role: 'user' as any,
        status: clientProfile.status || 'active',
        mfaEnabled: false,
        createdAt: clientProfile.created_at,
        updatedAt: clientProfile.updated_at,
        organizationId: clientProfile.clients?.organization_id,
        clientId: clientProfile.client_id,
      };
    }

    // No profile found in either table
    console.error('[AuthContext] No profile found in users or client_users for:', supabaseUser.email);
    return null;
  };

  const setSessionData = async (currentSession: Session | null) => {
    console.log('[AuthContext] Setting session data for user:', currentSession?.user?.email);
    setSession(currentSession);
    if (currentSession?.user) {
      setIsPermissionsLoading(true);
      // Commented out set_user_context as it's not essential and causing 404 errors
      // This function would be used for advanced RLS scenarios but isn't required
      // try {
      //   await supabase.rpc('set_user_context', { user_uuid: currentSession.user.id });
      //   console.log('[AuthContext] User context set for database operations');
      // } catch (error) {
      //   console.warn('[AuthContext] Could not set user context:', error);
      // }
      
      const profile = await fetchUserProfile(currentSession.user);
      
      if (profile) {
        console.log('[AuthContext] User profile fetched:', profile?.email, 'with role:', profile.role);
        setUser(profile);
        setIsAuthenticated(true);
      } else {
        console.error(`[AuthContext] CRITICAL: No profile found for authenticated user ${currentSession.user.email}. Logging out.`);
        clearUserState();
        await supabase.auth.signOut();
      }
      setIsPermissionsLoading(false);
    } else {
      console.log('[AuthContext] No session, clearing user data');
      clearUserState();
      setIsPermissionsLoading(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSessionData(session));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionData(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data?.user) {
      await setSessionData(data.session);
    }
    
    return { error: error || undefined };
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
