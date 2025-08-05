import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, Edit, Trash2, Mail } from 'lucide-react';
import DataTable from '../DataTable';
import Modal from '../Modal';
import { User, UserStatus } from '../../types';
import { getAllUsers, updateUserStatus, resendInvitation } from '../../api/services/auth.service';
import { getClients } from '../../api/services/client.service';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'lab_user', assignTo: '' });
  const [isLoading, setIsLoading] = useState(false);

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: getAllUsers,
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<PaginatedResponse<Client>, Error, Client[]>({
    queryKey: ['clients'],
    queryFn: getClients,
    select: (data) => data.data,
  });

  const handleInviteUser = async (inviteData: { email: string; role: string; lab_id?: string; clinic_id?: string }) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('invite-user', { body: JSON.stringify(inviteData) });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({ type: 'success', message: 'User invited successfully.' });
      setIsInviteModalOpen(false);
    } catch (error: any) {
      addNotification({ type: 'error', message: `Failed to invite user: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: UserStatus) => {
    try {
      await updateUserStatus(userId, status);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({ type: 'success', message: 'User status updated.' });
    } catch (error: any) {
      addNotification({ type: 'error', message: `Failed to update status: ${error.message}` });
    }
  };

  const handleResendInvitation = async (email: string) => {
    try {
      await resendInvitation(email);
      addNotification({ type: 'success', message: 'Invitation resent.' });
    } catch (error: any) {
      addNotification({ type: 'error', message: `Failed to resend invitation: ${error.message}` });
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, role, assignTo } = inviteForm;
    const [type, id] = assignTo.split('-');
    
    await handleInviteUser({
      email,
      role,
      lab_id: type === 'lab' ? id : undefined,
      clinic_id: type === 'clinic' ? id : undefined,
    });
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
    },
    {
      header: 'Role',
      accessor: 'role',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: (row: User) => {
        return {
          display: (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                row.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {row.status}
            </span>
          ),
          sortValue: row.status,
        };
      },
      sortable: true,
    },
    {
      header: 'Last Login',
      accessor: (row: User) => row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'N/A',
      sortable: true,
      sortValue: (row: User) => row.lastLoginAt ? new Date(row.lastLoginAt).getTime() : 0,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Users & Permissions</h2>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0078D7] hover:bg-[#005a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a9e]"
        >
          <Plus size={16} className="mr-2" />
          Invite User
        </button>
      </div>
      <DataTable
        columns={columns}
        data={users}
        keyField="id"
        loading={isLoadingUsers}
        actions={(user) => (
          <div className="relative">
            <MoreHorizontal size={20} className="cursor-pointer" />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <Edit size={14} className="mr-2" /> Edit
              </button>
              <button
                onClick={() =>
                  handleUpdateUserStatus(
                    user.id,
                    user.status === 'active' ? 'inactive' : 'active'
                  )
                }
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Trash2 size={14} className="mr-2" />{' '}
                {user.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              {user.status === 'invited' && (
                <button
                  onClick={() => handleResendInvitation(user.email)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Mail size={14} className="mr-2" /> Resend Invitation
                </button>
              )}
            </div>
          </div>
        )}
      />
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New User"
      >
        <form onSubmit={handleInviteSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              >
                <option value="lab_user">Lab User</option>
                <option value="lab_admin">Lab Admin</option>
                <option value="clinic_user">Clinic User</option>
                <option value="clinic_admin">Clinic Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="assignTo" className="block text-sm font-medium text-gray-700">
                Assign to Lab/Clinic
              </label>
              <select
                id="assignTo"
                value={inviteForm.assignTo}
                onChange={(e) => setInviteForm({ ...inviteForm, assignTo: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                required
              >
                <option value="">Select...</option>
                {clients.map((client) => (
                  <optgroup key={`lab-${client.id}`} label={client.name}>
                    <option value={`lab-${client.id}`}>{client.name} (Lab)</option>
                    {client.clinics.map((clinic) => (
                      <option key={`clinic-${clinic.id}`} value={`clinic-${clinic.id}`}>
                        - {clinic.name} (Clinic)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="mr-2 inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0078D7] hover:bg-[#005a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a9e]"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;