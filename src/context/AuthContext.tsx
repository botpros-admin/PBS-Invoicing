import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, User, ClientUser } from '../types';
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

  const fetchUserRole = async (roleId: string): Promise<Role | null> => {
    if (!roleId) return null;
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();
    
    if (error || !data) return null;
    return data;
  };

  const hasPermission = (resource: string, action: string): boolean => {
    const permission = permissions.find(p => p.resource === resource);
    return permission?.actions.includes(action) || false;
  };

  const hasAnyPermission = (resource: string): boolean => {
    return permissions.some(p => p.resource === resource && p.actions.length > 0);
  };

  const refreshPermissions = async () => {
    if (!user) return;
    
    let roleId: string | null = null;
    
    if (user.userType === 'staff') {
      const { data } = await supabase
        .from('users')
        .select('role_id')
        .eq('id', user.id)
        .single();
      roleId = data?.role_id;
    } else {
      const { data } = await supabase
        .from('client_users')
        .select('role_id')
        .eq('id', user.id)
        .single();
      roleId = data?.role_id;
    }
    
    if (roleId) {
      const userRole = await fetchUserRole(roleId);
      setRole(userRole);
      setPermissions(userRole?.permissions || []);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
      const { data: staffProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', supabaseUser.id)
        .single();

      if (staffProfile) {
        // Fetch role and permissions - check if role_id exists
        const roleId = (staffProfile as any).role_id;
        if (roleId) {
          const userRole = await fetchUserRole(roleId);
          setRole(userRole);
          setPermissions(userRole?.permissions || []);
        }
        
        return {
          userType: 'staff',
          id: staffProfile.id,
          name: staffProfile.name || supabaseUser.email!,
          email: supabaseUser.email!,
          role: staffProfile.role,
          status: staffProfile.status,
          mfaEnabled: false,
          createdAt: staffProfile.created_at,
          updatedAt: new Date().toISOString(),
          organizationId: staffProfile.organization_id,
        };
      }

      const { data: clientProfile } = await supabase
        .from('client_users')
        .select('*')
        .eq('auth_id', supabaseUser.id)
        .single();

      if (clientProfile) {
        // Fetch role and permissions - check if role_id exists
        const roleId = (clientProfile as any).role_id;
        if (roleId) {
          const userRole = await fetchUserRole(roleId);
          setRole(userRole);
          setPermissions(userRole?.permissions || []);
        }
        
        return {
          userType: 'client',
          id: clientProfile.id,
          name: clientProfile.name || supabaseUser.email!,
          email: supabaseUser.email!,
          role: clientProfile.role,
          status: clientProfile.status,
          mfaEnabled: false,
          createdAt: clientProfile.created_at,
          updatedAt: new Date().toISOString(),
          organizationId: clientProfile.organization_id,
          clientId: clientProfile.client_id,
        };
      }
      return null;
    };

    const setSessionData = async (currentSession: Session | null) => {
      console.log('[AuthContext] Setting session data:', currentSession?.user?.email);
      setSession(currentSession);
      if (currentSession?.user) {
        // Set user context for database operations (audit triggers and RLS)
        try {
          await supabase.rpc('set_user_context', { user_id: currentSession.user.id });
          console.log('[AuthContext] User context set for database operations');
        } catch (error) {
          console.warn('[AuthContext] Could not set user context:', error);
          // Continue anyway - the database has fallbacks
        }
        
        const profile = await fetchUserProfile(currentSession.user);
        console.log('[AuthContext] User profile fetched:', profile?.email);
        setUser(profile);
        setIsAuthenticated(!!profile);
      } else {
        console.log('[AuthContext] No session, clearing user data');
        setUser(null);
        setRole(null);
        setPermissions([]);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

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
    
    // Set user context immediately after successful login
    if (!error && data?.user) {
      try {
        await supabase.rpc('set_user_context', { user_id: data.user.id });
        console.log('[AuthContext] User context set after login');
      } catch (contextError) {
        console.warn('[AuthContext] Could not set user context after login:', contextError);
      }
    }
    
    return { error: error || undefined };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role,
      permissions,
      isAuthenticated, 
      isLoading, 
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
