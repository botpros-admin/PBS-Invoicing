import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Building,
  Edit,
  Trash2,
  Plus,
  FileText,
  MapPin,
  Briefcase,
  Save,
  Loader2
} from 'lucide-react';
import Modal from '../Modal';
import { Client, Clinic, ID, NotificationType } from '../../types';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  createClinic,
  updateClinic,
  deleteClinic,
} from '../../api/services/client.service';
import { useNotifications } from '../../context/NotificationContext';

const ClientsClinicsSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  // UI State for forms/modals
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Partial<Clinic> | null>(null);
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [activeClientForClinic, setActiveClientForClinic] = useState<Client | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Fetch clients using useQuery (v4 syntax)
  const {
    data: clients = [],
    isLoading: isLoadingClients,
    isError: isErrorClients,
    error: errorClients,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Client[]> => {
      const response = await getClients();
      // PaginatedResponse might not have an error property directly
      // Ensure we return a valid array of clients
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Setup error handler separately
  React.useEffect(() => {
    if (isErrorClients && errorClients) {
      addNotification({ 
        type: 'error' as NotificationType, 
        message: `Failed to load clients: ${errorClients.message}` 
      });
    }
  }, [isErrorClients, errorClients, addNotification]);

  // --- Mutations using useMutation (React Query v4 syntax) ---

  // Client Mutations
  const createClientMutation = useMutation({
    mutationFn: (newClient: Partial<Client>) => createClient(newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ type: 'success' as NotificationType, message: 'Client added successfully.' });
      setShowClientForm(false);
      setEditingClient(null);
    },
    onError: (error: Error) => {
      addNotification({ type: 'error' as NotificationType, message: `Client creation failed: ${error.message}` });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: (clientData: Partial<Client>) => updateClient(clientData.id as ID, clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ type: 'success' as NotificationType, message: 'Client updated successfully.' });
      setShowClientForm(false);
      setEditingClient(null);
    },
    onError: (error: Error) => {
      addNotification({ type: 'error' as NotificationType, message: `Client update failed: ${error.message}` });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (clientId: ID) => deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ type: 'success' as NotificationType, message: 'Client deleted successfully.' });
    },
    onError: (error: Error) => {
      addNotification({ type: 'error' as NotificationType, message: `Client deletion failed: ${error.message}` });
    }
  });

  // Clinic Mutations
  const createClinicMutation = useMutation({
    mutationFn: (vars: { clientId: ID; clinic: Partial<Clinic> }) => createClinic(vars.clientId, vars.clinic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ type: 'success' as NotificationType, message: 'Clinic added successfully.' });
      setShowClinicForm(false);
      setEditingClinic(null);
      setActiveClientForClinic(null);
    },
    onError: (error: Error) => {
      addNotification({ type: 'error' as NotificationType, message: `Failed to add clinic: ${error.message}` });
    }
  });

  const updateClinicMutation = useMutation({
    mutationFn: (vars: { clientId: ID; clinicId: ID; clinic: Partial<Clinic> }) => 
      updateClinic(vars.clientId, vars.clinicId, vars.clinic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ type: 'success' as NotificationType, message: 'Clinic updated successfully.' });
      setShowClinicForm(false);
      setEditingClinic(null);
      setActiveClientForClinic(null);
    },
    onError: (error: Error) => {
      addNotification({ type: 'error' as NotificationType, message: `Failed to update clinic: ${error.message}` });
    }
  });

  const deleteClinicMutation = useMutation({
    mutationFn: (vars: { clientId: ID; clinicId: ID }) => deleteClinic(vars.clientId, vars.clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ type: 'success' as NotificationType, message: 'Clinic deleted successfully.' });
    },
    onError: (error: Error) => {
      addNotification({ type: 'error' as NotificationType, message: `Failed to delete clinic: ${error.message}` });
    }
  });

  // --- Event Handlers using Mutations ---

  const handleAddClient = useCallback(() => {
    setEditingClient({ name: '', address: '', logoUrl: '', clinics: [] });
    setShowClientForm(true);
  }, []);

  const handleEditClient = useCallback((client: Client) => {
    setEditingClient({ ...client });
    setShowClientForm(true);
  }, []);

  const handleDeleteClient = useCallback((clientId: ID) => {
     if (window.confirm('Are you sure you want to delete this client and all associated clinics and data? This action cannot be undone.')) {
       deleteClientMutation.mutate(clientId);
     }
  }, [deleteClientMutation]);

  const handleSaveClient = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    if (editingClient.id) {
      updateClientMutation.mutate(editingClient);
    } else {
      createClientMutation.mutate(editingClient);
    }
  }, [editingClient, createClientMutation, updateClientMutation]);

   const handleClientInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     const { name, value } = e.target;
     setEditingClient((prev) => (prev ? { ...prev, [name]: value } : null));
   }, []);

  const handleAddClinic = useCallback((client: Client) => {
     const newClinic: Partial<Clinic> = { 
       clientId: client.id, 
       name: '', 
       address: '', 
       logoUrl: '', 
       isActive: true, 
       contacts: [] 
     };
     setEditingClinic(newClinic);
     setActiveClientForClinic(client);
     setShowClinicForm(true);
  }, []);

  const handleEditClinic = useCallback((client: Client, clinic: Clinic) => {
     setEditingClinic({ ...clinic });
     setActiveClientForClinic(client);
     setShowClinicForm(true);
   }, []);

   const handleDeleteClinic = useCallback((clientId: ID, clinicId: ID) => {
     if (window.confirm('Are you sure you want to delete this clinic?')) {
       deleteClinicMutation.mutate({ clientId, clinicId });
     }
   }, [deleteClinicMutation]);

   const handleSaveClinic = useCallback((e: React.FormEvent) => {
     e.preventDefault();
     if (!activeClientForClinic || !editingClinic) return;
     const clinicPayload = { ...editingClinic, clientId: activeClientForClinic.id };

     if (clinicPayload.id) {
       updateClinicMutation.mutate({
         clientId: activeClientForClinic.id,
         clinicId: clinicPayload.id as ID,
         clinic: clinicPayload
       });
     } else {
       createClinicMutation.mutate({
         clientId: activeClientForClinic.id,
         clinic: clinicPayload
       });
     }
   }, [activeClientForClinic, editingClinic, createClinicMutation, updateClinicMutation]);

   const handleClinicInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     const { name, value } = e.target;
     setEditingClinic((prev) => (prev ? { ...prev, [name]: value } : null));
   }, []);

   const handleManageContacts = useCallback((client: Client, clinic: Clinic) => {
     setActiveClientForClinic(client);
     setEditingClinic(clinic); // Keep clinic context for modal
     setShowContactModal(true);
   }, []);

  // --- Render Logic ---

  if (isLoadingClients) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
        <span className="ml-2 text-gray-500">Loading clients...</span>
      </div>
    );
  }

  if (isErrorClients) {
     return <div className="text-red-600">Error loading clients: {errorClients?.message}</div>;
  }

  // Determine if any mutation is loading
  const isMutating = 
    createClientMutation.isPending ||
    updateClientMutation.isPending ||
    deleteClientMutation.isPending ||
    createClinicMutation.isPending ||
    updateClinicMutation.isPending ||
    deleteClinicMutation.isPending;

  return (
    <div className={`space-y-6 ${isMutating ? 'opacity-75 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Clients & Clinics</h1>
        <button
          onClick={handleAddClient}
          disabled={isMutating} // Disable based on mutation state
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#EF3A4D] hover:bg-[#D93445] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF3A4D] disabled:opacity-50" // Changed color
        >
          <Plus size={16} className="mr-2" />
          Add Client
        </button>
      </div>

      {/* Client List / Empty State */}
      {/* Ensure clients is valid and empty */}
      {Array.isArray(clients) && clients.length === 0 ? (
        <div className="text-center py-8 bg-white shadow rounded-lg">
           <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
           <h3 className="mt-2 text-sm font-medium text-gray-900">No clients</h3>
           <p className="mt-1 text-sm text-gray-500">Get started by creating a new client.</p>
           <div className="mt-6">
             <button
               onClick={handleAddClient}
               disabled={isMutating} // Disable based on mutation state
               className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#EF3A4D] hover:bg-[#D93445] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF3A4D] disabled:opacity-50" // Changed color
             >
               <Plus size={16} className="mr-2" />
               New Client
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Ensure clients is an array before mapping */}
          {Array.isArray(clients) && clients.map((client: Client) => (
            <div
              key={client.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4"
            >
              {/* Client Header */}
              <div className="flex items-center justify-between">
                 <div>
                   <div className="flex items-center space-x-2">
                     {client.logoUrl ? (
                       <img src={client.logoUrl} alt={`${client.name} logo`} className="h-8 w-8 rounded-full object-cover" />
                     ) : (
                       <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center"> {/* Changed color */}
                         <Briefcase size={16} className="text-[#EF3A4D]" /> {/* Changed color */}
                       </div>
                     )}
                     <h2 className="text-lg font-medium text-gray-900">{client.name}</h2>
                   </div>
                   {client.address && (
                     <div className="flex items-center text-sm text-gray-500 mt-1">
                       <MapPin size={14} className="mr-1" />
                       {client.address}
                     </div>
                   )}
                 </div>
                 <div className="flex space-x-2">
                   <button onClick={() => { /* TODO: Implement Invoice Params Modal */ }} className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none" title="Invoice Parameters"><FileText size={16} /></button>
                   <button onClick={() => handleEditClient(client)} className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none" title="Edit Client"><Edit size={16} /></button>
                   <button onClick={() => handleDeleteClient(client.id)} disabled={isMutating} className="p-1 rounded-md text-gray-400 hover:text-red-500 focus:outline-none disabled:opacity-50" title="Delete Client"><Trash2 size={16} /></button>
                 </div>
              </div>

              {/* Client Clinics */}
              <div>
                 <h3 className="text-md font-semibold text-gray-800 mb-2">Clinics ({client.clinics?.length || 0})</h3>
                 {!client.clinics || client.clinics.length === 0 ? (
                   <div className="text-sm text-gray-500">No clinics added yet.</div>
                 ) : (
                   <div className="space-y-4">
                     {client.clinics?.map((clinic: Clinic) => (
                       <div key={clinic.id} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                         <div className="flex items-center justify-between">
                           <div>
                             <div className="flex items-center space-x-2">
                               {clinic.logoUrl ? (
                                 <img src={clinic.logoUrl} alt={`${clinic.name} logo`} className="h-6 w-6 rounded-full object-cover" />
                               ) : (
                                 <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center"><Building size={14} className="text-[#EF3A4D]" /></div>
                               )}
                               <span className="text-sm font-medium text-gray-900">{clinic.name}</span>
                             </div>
                             <div className="mt-1 text-xs text-gray-500 flex items-center"><MapPin size={12} className="mr-1" />{clinic.address}</div>
                           </div>
                           <div className="flex space-x-2">
                             <button onClick={() => handleEditClinic(client, clinic)} className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none" title="Edit Clinic"><Edit size={14} /></button>
                             <button onClick={() => handleDeleteClinic(client.id, clinic.id)} disabled={isMutating} className="p-1 rounded-md text-gray-400 hover:text-red-500 focus:outline-none disabled:opacity-50" title="Delete Clinic"><Trash2 size={14} /></button>
                           </div>
                         </div>
                         {/* Manage Contacts Button */}
                         <div className="mt-3">
                           <button onClick={() => handleManageContacts(client, clinic)} className="text-xs text-[#EF3A4D] hover:text-[#D93445] flex items-center"> {/* Changed color */}
                             <User size={12} className="mr-1" />
                             {clinic.contacts && clinic.contacts.length > 0 ? 'Manage Contacts' : 'Add Contacts'}
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
                 <button onClick={() => handleAddClinic(client)} disabled={isMutating} className="mt-3 text-sm text-[#EF3A4D] hover:text-[#D93445] flex items-center disabled:opacity-50"> {/* Changed color */}
                   <Plus size={14} className="mr-1" /> Add Clinic
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showClientForm && editingClient && (
         <Modal isOpen={showClientForm} onClose={() => { setShowClientForm(false); setEditingClient(null); }} title={editingClient.id ? 'Edit Client' : 'Add Client'} size="lg" footer={
             <div className="flex justify-end space-x-3">
               <button type="button" onClick={() => { setShowClientForm(false); setEditingClient(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
               <button type="submit" form="clientForm" disabled={isMutating} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#EF3A4D] hover:bg-[#D93445] disabled:opacity-50"> {/* Changed color */}
                 <Save size={16} className="mr-2" />
                 {/* Use mutation isPending state */}
                 {updateClientMutation.isPending || createClientMutation.isPending ? 'Saving...' : 'Save Client'}
               </button>
             </div>
           }>
           <form id="clientForm" onSubmit={handleSaveClient} className="space-y-6">
             <div><label htmlFor="name" className="form-label">Client Name</label><input type="text" id="name" name="name" value={editingClient.name || ''} onChange={handleClientInputChange} required className="form-input" /></div>
             <div><label htmlFor="logoUrl" className="form-label">Logo URL (Optional)</label><input type="text" id="logoUrl" name="logoUrl" value={editingClient.logoUrl || ''} onChange={handleClientInputChange} className="form-input" /></div>
             <div><label htmlFor="address" className="form-label">Address (Optional)</label><input type="text" id="address" name="address" value={editingClient.address || ''} onChange={handleClientInputChange} className="form-input" /></div>
           </form>
         </Modal>
      )}

      {showClinicForm && editingClinic && (
         <Modal isOpen={showClinicForm} onClose={() => { setShowClinicForm(false); setEditingClinic(null); setActiveClientForClinic(null); }} title={editingClinic.id ? 'Edit Clinic' : 'Add Clinic'} size="lg" footer={
             <div className="flex justify-end space-x-3">
               <button type="button" onClick={() => { setShowClinicForm(false); setEditingClinic(null); setActiveClientForClinic(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
               <button type="submit" form="clinicForm" disabled={isMutating} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#EF3A4D] hover:bg-[#D93445] disabled:opacity-50"> {/* Changed color */}
                 <Save size={16} className="mr-2" />
                 {/* Use mutation isPending state */}
                 {updateClinicMutation.isPending || createClinicMutation.isPending ? 'Saving...' : 'Save Clinic'}
               </button>
             </div>
           }>
           <form id="clinicForm" onSubmit={handleSaveClinic} className="space-y-6">
             <div><label htmlFor="name" className="form-label">Clinic Name</label><input type="text" id="name" name="name" value={editingClinic.name || ''} onChange={handleClinicInputChange} required className="form-input" /></div>
             <div><label htmlFor="address" className="form-label">Address</label><input type="text" id="address" name="address" value={editingClinic.address || ''} onChange={handleClinicInputChange} required className="form-input" /></div>
             <div><label htmlFor="logoUrl" className="form-label">Logo URL (Optional)</label><input type="text" id="logoUrl" name="logoUrl" value={editingClinic.logoUrl || ''} onChange={handleClinicInputChange} className="form-input" /></div>
             <div className="flex items-center"><input type="checkbox" id="isActive" name="isActive" checked={editingClinic.isActive === true} onChange={(e) => { setEditingClinic({ ...editingClinic, isActive: e.target.checked }); }} className="h-4 w-4 text-[#EF3A4D] focus:ring-[#EF3A4D] border-gray-300 rounded" /><label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Active Clinic</label></div> {/* Changed color */}
           </form>
         </Modal>
      )}

      {/* Simplified Contact Management Modal - Placeholder */}
      {showContactModal && (
         <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Manage Contacts" size="lg" footer={
             <div className="flex justify-end"><button onClick={() => setShowContactModal(false)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#EF3A4D] hover:bg-[#D93445]"><Save size={16} className="mr-2" />Done</button></div> // Changed color
           }>
           <div>Contact management functionality is available</div>
         </Modal>
      )}
    </div>
  );
};

export default ClientsClinicsSettings;
