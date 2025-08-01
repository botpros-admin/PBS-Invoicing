import { User, UserRole } from '../types';

/**
 * Permission definitions for different roles
 * Using a hierarchical approach where higher roles inherit all permissions from lower roles
 */
export const PERMISSIONS = {
  // Base permissions for all authenticated users
  base: [
    'view:dashboard',
    'view:profile',
  ],
  
  // Staff can view and interact with most data but with limited edit capabilities
  staff: [
    'view:clients',
    'view:invoices',
    'view:payments',
    'view:reports:basic',
    'create:invoice',
    'edit:invoice',
  ],
  
  // AR Managers have expanded capabilities for financial management
  ar_manager: [
    'view:reports:advanced',
    'create:client',
    'edit:client',
    'create:payment',
    'process:payment',
    'manage:disputes',
    'process:refunds',
  ],
  
  // Admins have full system access
  admin: [
    'manage:users',
    'manage:settings',
    'delete:invoice',
    'delete:client',
    'view:system:logs',
    'configure:system',
  ],
  
  // Super Admin has elevated capabilities above regular admin
  super_admin: [
    'manage:admins',
    'create:organization',
    'manage:organizations',
    'assign:self:admin',
    'view:billing',
    'manage:billing',
    'configure:system:advanced',
  ],
};

// Role hierarchy (each role inherits permissions from previous roles)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'staff': 1,
  'ar_manager': 2,
  'admin': 3,
  'super_admin': 4, // Super Admin is at the top of the hierarchy
};

/**
 * Check if a user has permission to perform a specific action
 * @param user The current user
 * @param permission The permission to check for
 * @returns boolean indicating whether the user has the permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  
  // Get the user's role level in the hierarchy
  const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
  
  // Build a list of all permissions the user should have based on role hierarchy
  let userPermissions: string[] = [...PERMISSIONS.base];
  
  // Add permissions based on role hierarchy
  if (userRoleLevel >= ROLE_HIERARCHY.staff) {
    userPermissions = [...userPermissions, ...PERMISSIONS.staff];
  }
  
  if (userRoleLevel >= ROLE_HIERARCHY.ar_manager) {
    userPermissions = [...userPermissions, ...PERMISSIONS.ar_manager];
  }
  
  if (userRoleLevel >= ROLE_HIERARCHY.admin) {
    userPermissions = [...userPermissions, ...PERMISSIONS.admin];
  }
  
  if (userRoleLevel >= ROLE_HIERARCHY.super_admin) {
    userPermissions = [...userPermissions, ...PERMISSIONS.super_admin];
  }
  
  // Check if the specific permission exists in the user's permission set
  return userPermissions.includes(permission);
}

/**
 * Custom hook for checking permissions - to be used with useAuth
 */
export function createPermissionChecker(user: User | null) {
  return {
    can: (permission: string) => hasPermission(user, permission),
    
    // Helper functions for common permissions
    canViewClients: () => hasPermission(user, 'view:clients'),
    canManageUsers: () => hasPermission(user, 'manage:users'),
    canEditInvoice: () => hasPermission(user, 'edit:invoice'),
    canDeleteInvoice: () => hasPermission(user, 'delete:invoice'),
    canManageSettings: () => hasPermission(user, 'manage:settings'),
    canManageDisputes: () => hasPermission(user, 'manage:disputes'),
    
    // Function to check if user has any of the provided permissions
    canAny: (permissions: string[]) => 
      permissions.some(permission => hasPermission(user, permission)),
    
    // Function to check if user has all of the provided permissions
    canAll: (permissions: string[]) => 
      permissions.every(permission => hasPermission(user, permission)),
  };
}

/**
 * Determine if a user can access a particular entity
 * For example: Can this user view this specific client's data?
 * 
 * This would be expanded to include more entity-specific logic
 * for example, checking if a staff member is assigned to a client
 */
export function canAccessEntity(user: User | null, entityType: string, entityId: string): boolean {
  if (!user) return false;
  
  // Super Admin and Admin can access everything
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  
  // Add specific entity access control logic here
  // For example:
  // - Check if staff/ar_manager is assigned to this client
  // - Check if user belongs to the same organization as the entity
  // - etc.
  
  // Default logic based on role
  switch (entityType) {
    case 'client':
      return hasPermission(user, 'view:clients');
    case 'invoice':
      return hasPermission(user, 'view:invoices');
    case 'payment':
      return hasPermission(user, 'view:payments');
    case 'report':
      return hasPermission(user, 'view:reports:basic');
    case 'organization':
      return hasPermission(user, 'manage:organizations');
    default:
      return false;
  }
}

/**
 * Check if UI elements should be disabled based on permissions
 * Returns an object with disabled status and reason
 */
export function getDisabledStatus(user: User | null, permission: string): { 
  disabled: boolean; 
  reason?: string;
} {
  const permitted = hasPermission(user, permission);
  
  return {
    disabled: !permitted,
    reason: permitted ? undefined : 'You do not have permission to perform this action',
  };
}
