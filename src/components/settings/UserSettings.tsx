import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Mail, Plus, User, X, Loader2 } from 'lucide-react';
// import { MOCK_USERS } from '../../data/mockData'; // Keep for now for display, but invite will use API
import Modal from '../Modal';
import { getAllUsers, resendInvitation } from '../../api/services/auth.service'; // Import the new function
import { User as AppUser, UserRole, UserStatus, ID } from '../../types'; // Import User type and alias it, also UserRole, UserStatus, ID

// Mock data for display purposes until fetching is implemented
const UserSettings: React.FC = () => {
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<AppUser[], Error>({
    queryKey: ['users'],
    queryFn: getAllUsers,
  });
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // TODO: Implement user fetching logic (e.g., in useEffect)

  const handleAddUser = () => {
    setShowAddUserForm(true);
    setInviteError(null); // Clear previous errors/success messages
    setInviteSuccess(null);
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('userEmail') as string;
    const role = formData.get('userRole') as string;
    const name = formData.get('userName') as string; // Get name for potential future use

    if (!email || !role || !name) {
      setInviteError('Please fill in all required fields.');
      setInviteLoading(false);
      return;
    }

    try {
      const result = await resendInvitation(email);

      if ('error' in result) {
        throw new Error(result.error);
      }

      setInviteSuccess(`Invitation successfully sent to ${email}.`);
      setShowAddUserForm(false);
      // TODO: Optionally refresh the user list here after successful invite
      // For now, we can manually add a placeholder if needed, or wait for full fetch implementation
      // Example placeholder add:
      // setUsers(prev => [...prev, { id: `invited-${Date.now()}`, name, email, role, status: 'invited' }]);
      e.currentTarget.reset(); // Reset form fields

    } catch (error: any) { // Keep 'any' for now as error structure from API might vary
      console.error("Invitation failed:", error);
      setInviteError(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEditUser = (user: AppUser) => { // Use AppUser type
    setEditingUser({...user});
    setShowEditModal(true);
  };

  const handleDeactivateUser = (userId: ID) => { // Use ID type
    // TODO: Implement actual user deactivate/activate API call
    const userToToggle = users.find((u: AppUser) => u.id === userId); // Add type
    if (!userToToggle) return;

    const action = userToToggle.status === 'active' ? 'deactivate' : 'activate';
    const confirmed = window.confirm(`Are you sure you want to ${action} this user?`);

    if (confirmed) {
      console.log(`${action.charAt(0).toUpperCase() + action.slice(1)} user (mock):`, userId);
      // This is a mock implementation and should be replaced with a mutation
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Users & Permissions</h2>
        <button
          onClick={handleAddUser}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Use theme color
        >
          <Plus size={16} className="mr-2" />
          Invite User
        </button>
      </div>

      {showAddUserForm ? (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>

          {/* Display feedback messages */}
          {inviteError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{inviteError}</div>}
          {inviteSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">{inviteSuccess}</div>}

          <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="userName"
                    id="userName"
                    required
                    className="shadow-sm focus:ring-secondary focus:border-secondary block w-full sm:text-sm border-gray-300 rounded-md" // Use theme color
                    disabled={inviteLoading}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="userEmail"
                    id="userEmail"
                    required
                    className="shadow-sm focus:ring-secondary focus:border-secondary block w-full sm:text-sm border-gray-300 rounded-md" // Use theme color
                    disabled={inviteLoading}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="userRole" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <div className="mt-1">
                  <select
                    id="userRole"
                    name="userRole"
                    required
                    className="shadow-sm focus:ring-secondary focus:border-secondary block w-full sm:text-sm border-gray-300 rounded-md" // Use theme color
                    defaultValue="staff" // Default to least privileged role
                    disabled={inviteLoading}
                  >
                    <option value="admin">Admin</option>
                    <option value="ar_manager">AR Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddUserForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Use theme color
                disabled={inviteLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50" // Use theme color
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Mail size={16} className="mr-2" />
                )}
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center"> {/* Use theme color */}
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full" />
                        ) : (
                          <User size={20} className="text-secondary" /> /* Use theme color */
                        )}
                      </div> {/* Closing div for avatar container */}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status === 'active' ? 'Active' :
                       user.status === 'invited' ? 'Invited' :
                       'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'} {/* Corrected property name */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3" // Ensure Edit is indigo
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      className={user.status === 'active' ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"} // Red for Deactivate, Green for Activate
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Permissions</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AR Manager
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  View Invoices
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Create/Edit Invoices
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Delete Invoices
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  View Reports
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Manage Users
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Manage Facilities
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  System Settings
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <CheckCircle size={20} className="mx-auto text-green-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  <X size={20} className="mx-auto text-red-500" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Edit User"
        size="md"
      >
        {editingUser && (
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="editName" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  id="editName"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="editEmail" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="editEmail"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="editRole" className="form-label">
                  Role
                </label>
                <select
                  id="editRole"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value as UserRole})} // Cast to UserRole
                  className="form-select"
                >
                  <option value="Admin">Admin</option>
                  <option value="AR Manager">AR Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              <div>
                <label htmlFor="editStatus" className="form-label">
                  Status
                </label>
                <select
                  id="editStatus"
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({...editingUser, status: e.target.value as UserStatus})} // Cast to UserStatus
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="invited">Invited</option>
                </select>
              </div>
            </div> {/* Closing div for space-y-4 */}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Use theme color
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Use theme color
              >
                Save Changes
              </button>
            </div> {/* Closing div for flex justify-end */}
          </form>
        )}
      </Modal>
    </div> // Closing div for space-y-6
  );
};

export default UserSettings;
