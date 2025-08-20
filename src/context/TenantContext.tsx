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

interface TenantContextType {
  currentTenant: 'billing' | 'lab' | 'clinic' | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  hierarchy: TenantHierarchy;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
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
  const [hierarchy, setHierarchy] = useState<TenantHierarchy>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && session) {
      fetchUserOrganizations();
    } else {
      // Reset state when user logs out
      setCurrentTenant(null);
      setCurrentOrganization(null);
      setOrganizations([]);
      setHierarchy({});
      setIsLoading(false);
    }
  }, [user, session]);

  const fetchUserOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

  const selectOrganization = async (org: Organization) => {
    setCurrentOrganization(org);
    
    if (org.type === 'billing_company') {
      setCurrentTenant('billing');
    } else if (org.type === 'lab') {
      setCurrentTenant('lab');
    } else if (org.type === 'clinic') {
      setCurrentTenant('clinic');
    }

    await buildHierarchy(org);
  };

  const buildHierarchy = async (org: Organization) => {
    const newHierarchy: TenantHierarchy = {};

    try {
      if (org.type === 'clinic' && org.parent_id) {
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

  const canAccessModule = (moduleName: string): boolean => {
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
    if (currentTenant === 'billing') {
      return organizations;
    } else if (currentTenant === 'lab') {
      return organizations.filter(org => 
        org.id === currentOrganization?.id || 
        org.parent_id === currentOrganization?.id
      );
    } else if (currentTenant === 'clinic') {
      return organizations.filter(org => org.id === currentOrganization?.id);
    }
    return [];
  };

  const value: TenantContextType = {
    currentTenant,
    currentOrganization,
    organizations,
    hierarchy,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations,
    canAccessModule,
    getAccessibleOrganizations
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
