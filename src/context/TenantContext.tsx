import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../api/supabase';

// Types for multi-tenant hierarchy
export interface Organization {
  id: string;
  name: string;
  type: 'billing_company' | 'lab' | 'clinic';
  parent_id?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantHierarchy {
  billingCompany?: Organization;
  lab?: Organization;
  clinic?: Organization;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  scope: 'own' | 'organization' | 'all';
}

interface TenantContextType {
  currentTenant: 'billing' | 'lab' | 'clinic' | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  permissions: Permission[];
  hierarchy: TenantHierarchy;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  canAccessModule: (moduleName: string) => boolean;
  getAccessibleOrganizations: () => Organization[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user, session } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<'billing' | 'lab' | 'clinic' | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [hierarchy, setHierarchy] = useState<TenantHierarchy>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's organizations and permissions
  useEffect(() => {
    if (user && session) {
      fetchUserOrganizations();
      fetchUserPermissions();
    } else {
      // Reset state when user logs out
      setCurrentTenant(null);
      setCurrentOrganization(null);
      setOrganizations([]);
      setPermissions([]);
      setHierarchy({});
      setIsLoading(false);
    }
  }, [user, session]);

  const fetchUserOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch organizations the user has access to
      const { data: userProfiles, error: orgsError } = await supabase
        .from('user_profiles')
        .select(`
          organization_id,
          organizations(*)
        `)
        .eq('user_id', session?.user?.id);

      if (orgsError) throw orgsError;

      const orgs = userProfiles?.map(up => up.organizations).filter(Boolean) as Organization[] || [];
      setOrganizations(orgs);

      // Set default organization (first one or from user preferences)
      if (orgs.length > 0 && !currentOrganization) {
        await selectOrganization(orgs[0]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
      setIsLoading(false);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      // Fetch user's role and permissions
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select(`
          roles(
            id,
            name,
            permissions
          )
        `)
        .eq('user_id', session?.user?.id);

      if (roleError) throw roleError;

      // Parse permissions from role (handle multiple roles)
      const rolePermissions: Permission[] = roleData?.[0]?.roles?.permissions?.map((p: any) => ({
        id: p.id || crypto.randomUUID(),
        name: p.name,
        resource: p.resource,
        action: p.action,
        scope: p.scope || 'own'
      })) || [];

      setPermissions(rolePermissions);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      // Continue without permissions - UI will handle accordingly
    }
  };

  const selectOrganization = async (org: Organization) => {
    setCurrentOrganization(org);
    
    // Determine tenant type based on organization type
    if (org.type === 'billing_company') {
      setCurrentTenant('billing');
    } else if (org.type === 'lab') {
      setCurrentTenant('lab');
    } else if (org.type === 'clinic') {
      setCurrentTenant('clinic');
    }

    // Build hierarchy
    await buildHierarchy(org);
  };

  const buildHierarchy = async (org: Organization) => {
    const newHierarchy: TenantHierarchy = {};

    try {
      if (org.type === 'clinic' && org.parent_id) {
        // Clinic - fetch parent lab and billing company
        const { data: lab } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', org.parent_id)
          .single();

        if (lab) {
          newHierarchy.lab = lab;
          
          if (lab.parent_id) {
            const { data: billing } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', lab.parent_id)
              .single();
            
            if (billing) {
              newHierarchy.billingCompany = billing;
            }
          }
        }
        newHierarchy.clinic = org;
      } else if (org.type === 'lab' && org.parent_id) {
        // Lab - fetch parent billing company
        const { data: billing } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', org.parent_id)
          .single();

        if (billing) {
          newHierarchy.billingCompany = billing;
        }
        newHierarchy.lab = org;
      } else if (org.type === 'billing_company') {
        // Billing company - top level
        newHierarchy.billingCompany = org;
      }

      setHierarchy(newHierarchy);
    } catch (err) {
      console.error('Error building hierarchy:', err);
    }
  };

  const switchOrganization = async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      await selectOrganization(org);
    }
  };

  const refreshOrganizations = async () => {
    await fetchUserOrganizations();
  };

  const hasPermission = (resource: string, action: string): boolean => {
    // Super admin check
    if (permissions.some(p => p.name === 'super_admin')) {
      return true;
    }

    // Check specific permission
    return permissions.some(p => 
      p.resource === resource && 
      p.action === action
    );
  };

  const canAccessModule = (moduleName: string): boolean => {
    // Module access rules based on tenant type
    const moduleAccess: Record<string, ('billing' | 'lab' | 'clinic')[]> = {
      dashboard: ['billing', 'lab', 'clinic'],
      billing: ['billing', 'lab'],
      operations: ['billing'],
      analytics: ['billing', 'lab'],
      admin: ['billing'],
      account: ['billing', 'lab', 'clinic']
    };

    if (!currentTenant) return false;
    
    const allowedTenants = moduleAccess[moduleName] || [];
    return allowedTenants.includes(currentTenant);
  };

  const getAccessibleOrganizations = (): Organization[] => {
    // Filter organizations based on current user's access level
    if (currentTenant === 'billing') {
      return organizations; // Can see all
    } else if (currentTenant === 'lab') {
      // Can see own lab and child clinics
      return organizations.filter(org => 
        org.id === currentOrganization?.id || 
        org.parent_id === currentOrganization?.id
      );
    } else if (currentTenant === 'clinic') {
      // Can only see own clinic
      return organizations.filter(org => org.id === currentOrganization?.id);
    }
    return [];
  };

  const value: TenantContextType = {
    currentTenant,
    currentOrganization,
    organizations,
    permissions,
    hierarchy,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations,
    hasPermission,
    canAccessModule,
    getAccessibleOrganizations
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// Enhanced Auth Provider that includes Tenant Context
export const EnhancedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
};