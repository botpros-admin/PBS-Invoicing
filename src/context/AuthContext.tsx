import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, User, ClientUser } from '../types';
import { supabase } from '../api/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: Error }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
      const { data: staffProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', supabaseUser.id)
        .single();

      if (staffProfile) {
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
      setSession(currentSession);
      if (currentSession?.user) {
        const profile = await fetchUserProfile(currentSession.user);
        setUser(profile);
        setIsAuthenticated(!!profile);
      } else {
        setUser(null);
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error || undefined };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated, isLoading, login, logout }}>
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
