import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { Shield, Edit, Trash2, Plus, Save, X } from 'lucide-react';

interface Permission {
  resource: string;
  actions: string[];
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

const RESOURCES = [
  'Invoices',
  'Clients',
  'Settings',
  'Reports',
  'Users',
  'Imports',
  'Exports'
];

const ACTIONS = ['Create', 'Read', 'Update', 'Delete'];

// Helper function to properly format resource names
const formatResourceName = (resource: string | undefined | null): string => {
  if (!resource || typeof resource !== 'string') return 'Unknown';
  
  // Handle snake_case, kebab-case, or camelCase
  return resource
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to properly format action names
const formatActionName = (action: string | undefined | null): string => {
  if (!action || typeof action !== 'string') return 'Unknown';
  
  return action
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Ensure permissions is always an array
      const processedRoles = (data || []).map(role => ({
        ...role,
        permissions: Array.isArray(role.permissions) ? role.permissions : []
      }));
      
      setRoles(processedRoles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (
    role: Role | Partial<Role>,
    resource: string,
    action: string
  ) => {
    const permissions = role.permissions || [];
    // Convert action and resource to lowercase for storage
    const actionLower = action.toLowerCase();
    const resourceLower = resource.toLowerCase();
    const existingPermission = permissions.find(p => p.resource === resourceLower);

    let updatedPermissions: Permission[];

    if (existingPermission) {
      if (existingPermission.actions.includes(actionLower)) {
        // Remove action
        const updatedActions = existingPermission.actions.filter(a => a !== actionLower);
        if (updatedActions.length === 0) {
          // Remove permission entirely if no actions left
          updatedPermissions = permissions.filter(p => p.resource !== resourceLower);
        } else {
          updatedPermissions = permissions.map(p =>
            p.resource === resourceLower
              ? { ...p, actions: updatedActions }
              : p
          );
        }
      } else {
        // Add action
        updatedPermissions = permissions.map(p =>
          p.resource === resourceLower
            ? { ...p, actions: [...p.actions, actionLower] }
            : p
        );
      }
    } else {
      // Add new permission
      updatedPermissions = [...permissions, { resource: resourceLower, actions: [actionLower] }];
    }

    if (editingRole?.id === role.id) {
      setEditingRole({ ...editingRole, permissions: updatedPermissions });
    } else if (newRole) {
      setNewRole({ ...newRole, permissions: updatedPermissions });
    }
  };

  const hasPermission = (
    permissions: Permission[] | undefined,
    resource: string,
    action: string
  ): boolean => {
    if (!permissions) return false;
    // Convert resource and action to lowercase for comparison
    const permission = permissions.find(p => p.resource === resource.toLowerCase());
    return permission?.actions.includes(action.toLowerCase()) || false;
  };

  const handleSaveRole = async (role: Role | Partial<Role>) => {
    try {
      setError(null);
      
      if ('id' in role && role.id) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({
            name: role.name,
            permissions: role.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', role.id);

        if (error) throw error;
        
        setEditingRole(null);
      } else {
        // Create new role
        const { error } = await supabase
          .from('roles')
          .insert({
            name: role.name,
            permissions: role.permissions || []
          });

        if (error) throw error;
        
        setNewRole(null);
      }

      await fetchRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      
      await fetchRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startCreatingRole = () => {
    setNewRole({
      name: '',
      permissions: []
    });
    setEditingRole(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Role Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage roles and their permissions across the system
          </p>
        </div>
        {!newRole && (
          <button
            onClick={startCreatingRole}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* New Role Form */}
      {newRole && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name
            </label>
            <input
              type="text"
              value={newRole.name || ''}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              className="shadow-sm focus:ring-secondary focus:border-secondary block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter role name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    {ACTIONS.map(action => (
                      <th key={action} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {RESOURCES.map(resource => (
                    <tr key={resource}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resource}
                      </td>
                      {ACTIONS.map(action => (
                        <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={hasPermission(newRole.permissions, resource, action)}
                            onChange={() => handlePermissionToggle(newRole, resource, action)}
                            className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setNewRole(null)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={() => handleSaveRole(newRole)}
              disabled={!newRole.name}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Create Role
            </button>
          </div>
        </div>
      )}

      {/* Existing Roles */}
      <div className="grid gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white shadow rounded-lg p-6">
            {editingRole?.id === role.id ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="shadow-sm focus:ring-secondary focus:border-secondary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Resource
                          </th>
                          {ACTIONS.map(action => (
                            <th key={action} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {RESOURCES.map(resource => (
                          <tr key={resource}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                              {resource}
                            </td>
                            {ACTIONS.map(action => (
                              <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={hasPermission(editingRole.permissions, resource, action)}
                                  onChange={() => handlePermissionToggle(editingRole, resource, action)}
                                  className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingRole(null)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveRole(editingRole)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">{formatResourceName(role.name)}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="text-secondary hover:text-secondary/80"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <p>Permissions:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.isArray(role.permissions) && role.permissions.length > 0 ? (
                      role.permissions.map((permission, index) => (
                        <span
                          key={`${permission.resource}-${index}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary"
                        >
                          {formatResourceName(permission.resource)}: {Array.isArray(permission.actions) && permission.actions.length > 0 ? permission.actions.filter(a => a).map(a => formatActionName(a)).join(', ') : 'No actions'}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">No permissions set</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {roles.length === 0 && !newRole && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No roles</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new role.</p>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;