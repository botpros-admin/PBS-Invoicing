import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Client, Clinic, ID } from '../../types';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch clients using useQuery
  const {
    data: clients = [],
    isLoading: isLoadingClients,
    isError: isErrorClients,
    error: errorClients,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Client[]> => {
      const response = await getClients();
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Handle client creation
  const handleCreateClient = async (clientData: Partial<Client>) => {
    setIsLoading(true);
    try {
      await createClient(clientData);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ 
        type: 'success', 
        message: 'Client created successfully' 
      });
      setShowClientForm(false);
      setEditingClient(null);
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: `Failed to create client: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle client update
  const handleUpdateClient = async (id: ID, clientData: Partial<Client>) => {
    setIsLoading(true);
    try {
      await updateClient(id, clientData);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ 
        type: 'success', 
        message: 'Client updated successfully' 
      });
      setShowClientForm(false);
      setEditingClient(null);
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: `Failed to update client: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle client deletion
  const handleDeleteClient = async (clientId: ID) => {
    setIsDeleting(clientId.toString());
    try {
      await deleteClient(clientId);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ 
        type: 'success', 
        message: 'Client deleted successfully' 
      });
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: `Failed to delete client: ${error.message}` 
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle clinic creation
  const handleCreateClinic = async (clientId: ID, clinicData: Partial<Clinic>) => {
    setIsLoading(true);
    try {
      await createClinic(clientId, clinicData);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ 
        type: 'success', 
        message: 'Clinic created successfully' 
      });
      setShowClinicForm(false);
      setEditingClinic(null);
      setActiveClientForClinic(null);
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: `Failed to create clinic: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clinic update
  const handleUpdateClinic = async (clientId: ID, clinicId: ID, clinicData: Partial<Clinic>) => {
    setIsLoading(true);
    try {
      await updateClinic(clientId, clinicId, clinicData);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ 
        type: 'success', 
        message: 'Clinic updated successfully' 
      });
      setShowClinicForm(false);
      setEditingClinic(null);
      setActiveClientForClinic(null);
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: `Failed to update clinic: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clinic deletion
  const handleDeleteClinic = async (clientId: ID, clinicId: ID) => {
    setIsDeleting(clinicId.toString());
    try {
      await deleteClinic(clientId, clinicId);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      addNotification({ 
        type: 'success', 
        message: 'Clinic deleted successfully' 
      });
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: `Failed to delete clinic: ${error.message}` 
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle form submission
  const handleClientFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (editingClient.id) {
      await handleUpdateClient(editingClient.id, editingClient);
    } else {
      await handleCreateClient(editingClient);
    }
  };

  const handleClinicFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic || !activeClientForClinic) return;

    if (editingClinic.id) {
      await handleUpdateClinic(activeClientForClinic.id, editingClinic.id, editingClinic);
    } else {
      await handleCreateClinic(activeClientForClinic.id, editingClinic);
    }
  };

  if (isErrorClients) {
    return (
      <div className="text-red-600">
        Error loading clients: {errorClients?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Clients & Clinics</h2>
        <button
          onClick={() => {
            setEditingClient({});
            setShowClientForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0078D7] hover:bg-[#005a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a9e]"
        >
          <Plus size={16} className="mr-2" />
          Add Client
        </button>
      </div>

      {isLoadingClients ? (
        <div className="flex justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.address}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingClient(client);
                      setShowClientForm(true);
                    }}
                    className="p-2 text-gray-600 hover:text-gray-900"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    disabled={isDeleting === client.id}
                    className="p-2 text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    {isDeleting === client.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-700">Clinics</h4>
                  <button
                    onClick={() => {
                      setEditingClinic({});
                      setActiveClientForClinic(client);
                      setShowClinicForm(true);
                    }}
                    className="text-sm text-[#0078D7] hover:text-[#005a9e]"
                  >
                    <Plus size={14} className="inline mr-1" />
                    Add Clinic
                  </button>
                </div>

                {client.clinics && client.clinics.length > 0 ? (
                  <div className="space-y-2">
                    {client.clinics.map((clinic) => (
                      <div
                        key={clinic.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{clinic.name}</p>
                          <p className="text-sm text-gray-600">{clinic.address}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingClinic(clinic);
                              setActiveClientForClinic(client);
                              setShowClinicForm(true);
                            }}
                            className="p-1 text-gray-600 hover:text-gray-900"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClinic(client.id, clinic.id)}
                            disabled={isDeleting === clinic.id}
                            className="p-1 text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {isDeleting === clinic.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No clinics added yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Form Modal */}
      <Modal
        isOpen={showClientForm}
        onClose={() => {
          setShowClientForm(false);
          setEditingClient(null);
        }}
        title={editingClient?.id ? 'Edit Client' : 'Add New Client'}
      >
        <form onSubmit={handleClientFormSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                Client Name
              </label>
              <input
                type="text"
                id="clientName"
                value={editingClient?.name || ''}
                onChange={(e) =>
                  setEditingClient({ ...editingClient, name: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                id="clientAddress"
                value={editingClient?.address || ''}
                onChange={(e) =>
                  setEditingClient({ ...editingClient, address: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowClientForm(false);
                setEditingClient(null);
              }}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0078D7] hover:bg-[#005a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a9e] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <><Save size={16} className="mr-2" />
                Save</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Clinic Form Modal */}
      <Modal
        isOpen={showClinicForm}
        onClose={() => {
          setShowClinicForm(false);
          setEditingClinic(null);
          setActiveClientForClinic(null);
        }}
        title={editingClinic?.id ? 'Edit Clinic' : 'Add New Clinic'}
      >
        <form onSubmit={handleClinicFormSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">
                Clinic Name
              </label>
              <input
                type="text"
                id="clinicName"
                value={editingClinic?.name || ''}
                onChange={(e) =>
                  setEditingClinic({ ...editingClinic, name: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="clinicAddress" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                id="clinicAddress"
                value={editingClinic?.address || ''}
                onChange={(e) =>
                  setEditingClinic({ ...editingClinic, address: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="salesRep" className="block text-sm font-medium text-gray-700">
                Sales Representative
              </label>
              <input
                type="text"
                id="salesRep"
                value={editingClinic?.salesRep || ''}
                onChange={(e) =>
                  setEditingClinic({ ...editingClinic, salesRep: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="billToAddress" className="block text-sm font-medium text-gray-700">
                Bill To Address
              </label>
              <input
                type="text"
                id="billToAddress"
                value={editingClinic?.billToAddress || ''}
                onChange={(e) =>
                  setEditingClinic({ ...editingClinic, billToAddress: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={editingClinic?.isActive !== false}
                onChange={(e) =>
                  setEditingClinic({ ...editingClinic, isActive: e.target.checked })
                }
                className="h-4 w-4 text-[#0078D7] focus:ring-[#005a9e] border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowClinicForm(false);
                setEditingClinic(null);
                setActiveClientForClinic(null);
              }}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0078D7] hover:bg-[#005a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a9e] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <><Save size={16} className="mr-2" />
                Save</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientsClinicsSettings;