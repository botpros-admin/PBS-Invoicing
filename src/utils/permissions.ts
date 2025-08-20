import { AppUser } from '../types';

// This type can be imported from AuthContext if you export it from there
interface Permission {
  resource: string;
  actions: string[];
}

/**
 * Checks if a user has a specific permission based on their roles.
 * This is a pure utility function that operates on the permissions array.
 * The AuthContext is the source of truth for the permissions array.
 *
 * @param permissions - The array of permissions a user has.
 * @param resource - The resource to check (e.g., 'invoices', 'clients').
 * @param action - The action to check (e.g., 'create', 'read', 'update', 'delete').
 * @returns boolean indicating whether the user has the permission.
 */
export function checkPermission(
  permissions: Permission[],
  resource: string,
  action: string
): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }

  const permission = permissions.find(p => p?.resource?.toLowerCase() === resource.toLowerCase());
  if (!permission || !permission.actions || !Array.isArray(permission.actions)) {
    return false;
  }

  return permission.actions.some(a => a?.toLowerCase() === action.toLowerCase() || a === '*');
}

/**
 * Checks if a user has any permission for a given resource.
 *
 * @param permissions - The array of permissions a user has.
 * @param resource - The resource to check.
 * @returns boolean indicating whether the user has any permission for the resource.
 */
export function checkAnyPermission(
  permissions: Permission[],
  resource: string
): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }

  return permissions.some(p => 
    p?.resource?.toLowerCase() === resource.toLowerCase() && 
    p?.actions && 
    Array.isArray(p.actions) && 
    p.actions.length > 0
  );
}
