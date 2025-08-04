import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Trash2, Save, Send, ChevronRight, ChevronLeft, Info, Loader2, ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { Invoice, InvoiceItem, Client, Patient } from '../types';
import { format } from 'date-fns';
import { getClients } from '../api/services/client.service';
import { getPatientsByClient } from '../api/services/patient.service';
import { createInvoice, updateInvoice, getInvoiceById } from '../api/services/invoice.service';
import { useNotifications } from '../context/NotificationContext';

type ID = string | number;

const PatientLineItems: React.FC<{
  patient: Patient;
  items: InvoiceItem[];
  onAddItem: (patientId: ID) => void;
  onRemoveItem: (patientId: ID, itemId: ID) => void;
  onItemChange: (patientId: ID, itemId: ID, field: keyof InvoiceItem, value: any) => void;
  onRemovePatient: (patientId: ID) => void;
}> = ({ patient, items, onAddItem, onRemoveItem, onItemChange, onRemovePatient }) => {
  return (
    <div className="border p-4 rounded-md bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <p className="font-medium">{patient.first_name} {patient.last_name}</p>
        <button onClick={() => onRemovePatient(patient.id)} className="text-red-500 hover:text-red-700">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-3">
              <input type="text" value={item.cptCode} onChange={(e) => onItemChange(patient.id, item.id, 'cptCode', e.target.value)} className="form-input form-input-sm" placeholder="CPT Code" />
            </div>
            <div className="col-span-4">
              <input type="text" value={item.description} readOnly className="form-input form-input-sm bg-gray-100" placeholder="Description" />
            </div>
            <div className="col-span-2">
              <input type="date" value={item.dateOfService} onChange={(e) => onItemChange(patient.id, item.id, 'dateOfService', e.target.value)} className="form-input form-input-sm" />
            </div>
            <div className="col-span-2">
              <input type="number" value={item.unitPrice} onChange={(e) => onItemChange(patient.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="form-input form-input-sm text-right" placeholder="Price" />
            </div>
            <div className="col-span-1">
              <button onClick={() => onRemoveItem(patient.id, item.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onAddItem(patient.id)} className="btn btn-secondary btn-sm mt-4">
        <Plus size={16} className="mr-1" /> Add Line Item
      </button>
    </div>
  );
};

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  const [currentStep, setCurrentStep] = useState(1);
  const [invoiceData, setInvoiceData] = useState<Partial<Invoice>>({
    status: 'draft',
    items: [],
    dateCreated: new Date().toISOString().split('T')[0],
    dateDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoiceNumber: `INV-${new Date().getFullYear()}-${1000 + Math.floor(Math.random() * 9000)}`,
  });
  const [patientsOnInvoice, setPatientsOnInvoice] = useState<Map<ID, { patient: Patient; items: InvoiceItem[] }>>(new Map());

  const { data: clients, isLoading: isLoadingClients } = useQuery<PaginatedResponse<Client>, Error, Client[]>({
    queryKey: ['clients'],
    queryFn: getClients,
    select: (data) => data.data,
  });

  const { data: patients, isLoading: isLoadingPatients } = useQuery<Patient[], Error>({
    queryKey: ['patients', invoiceData.clientId],
    queryFn: () => getPatientsByClient(invoiceData.clientId!),
    enabled: !!invoiceData.clientId,
  });

  const handleInvoiceDataChange = (field: keyof Invoice, value: any) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPatientToInvoice = (patient: Patient) => {
    setPatientsOnInvoice(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(patient.id)) {
            newMap.set(patient.id, { patient, items: [] });
        }
        return newMap;
    });
  };

  const handleRemovePatientFromInvoice = (patientId: ID) => {
      setPatientsOnInvoice(prev => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
      });
  };

  const handleAddItemToPatient = (patientId: ID) => {
    setPatientsOnInvoice(prev => {
      const newMap = new Map(prev);
      const patientData = newMap.get(patientId);
      if (patientData) {
        const newItem: InvoiceItem = {
          id: `temp-${Date.now()}`,
          invoiceId: invoiceData.id || 'temp-invoice',
          patientId: patientId,
          cptCode: '',
          description: '',
          dateOfService: format(new Date(), 'yyyy-MM-dd'),
          quantity: 1,
          unitPrice: 0,
          total: 0,
        };
        patientData.items.push(newItem);
      }
      return newMap;
    });
  };

  const handleRemoveItemFromPatient = (patientId: ID, itemId: ID) => {
    setPatientsOnInvoice(prev => {
      const newMap = new Map(prev);
      const patientData = newMap.get(patientId);
      if (patientData) {
        patientData.items = patientData.items.filter(item => item.id !== itemId);
      }
      return newMap;
    });
  };

  const handleItemChange = async (patientId: ID, itemId: ID, field: keyof InvoiceItem, value: any) => {
    setPatientsOnInvoice(prev => {
      const newMap = new Map(prev);
      const patientData = newMap.get(patientId);
      if (patientData) {
        patientData.items = patientData.items.map(item => {
          if (item.id === itemId) {
            return { ...item, [field]: value };
          }
          return item;
        });
      }
      return newMap;
    });

    if (field === 'cptCode') {
      const mockPrice = Math.floor(Math.random() * 100);
      setPatientsOnInvoice(prev => {
        const newMap = new Map(prev);
        const patientData = newMap.get(patientId);
        if (patientData) {
          patientData.items = patientData.items.map(item => {
            if (item.id === itemId) {
              return { ...item, unitPrice: mockPrice, description: 'Fetched Description' };
            }
            return item;
          });
        }
        return newMap;
      });
    }
  };

  const handleSaveDraft = () => console.log("Saving draft...");
  const handleSendInvoice = () => console.log("Sending invoice...");

  return (
    <div className="space-y-6 p-4 md:p-6">
       <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/dashboard/invoices')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{editId ? 'Edit Invoice' : 'Create Invoice'}</h1>
      </div>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <div className={`border-transparent text-gray-500 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${currentStep >= 1 ? 'border-secondary text-secondary' : ''}`}>
                  1. Invoice Details
              </div>
              <div className={`border-transparent text-gray-500 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${currentStep >= 2 ? 'border-secondary text-secondary' : ''}`}>
                  2. Select Patients
              </div>
              <div className={`border-transparent text-gray-500 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${currentStep >= 3 ? 'border-secondary text-secondary' : ''}`}>
                  3. Add Items
              </div>
          </nav>
      </div>
        <div className="p-4 sm:p-6">
        {currentStep === 1 && (
            <div>
                <h3 className="text-lg font-medium mb-4 text-gray-800">Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700">Client</label>
                        <select
                            id="client"
                            name="client"
                            value={invoiceData.clientId || ''}
                            onChange={(e) => handleInvoiceDataChange('clientId', e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm rounded-md"
                        >
                            <option value="">Select a client</option>
                            {clients?.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">Invoice Number</label>
                        <input
                            type="text"
                            name="invoiceNumber"
                            id="invoiceNumber"
                            value={invoiceData.invoiceNumber}
                            onChange={(e) => handleInvoiceDataChange('invoiceNumber', e.target.value)}
                            className="mt-1 focus:ring-secondary focus:border-secondary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="dateCreated" className="block text-sm font-medium text-gray-700">Date Created</label>
                        <input
                            type="date"
                            name="dateCreated"
                            id="dateCreated"
                            value={invoiceData.dateCreated}
                            onChange={(e) => handleInvoiceDataChange('dateCreated', e.target.value)}
                            className="mt-1 focus:ring-secondary focus:border-secondary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="dateDue" className="block text-sm font-medium text-gray-700">Date Due</label>
                        <input
                            type="date"
                            name="dateDue"
                            id="dateDue"
                            value={invoiceData.dateDue}
                            onChange={(e) => handleInvoiceDataChange('dateDue', e.target.value)}
                            className="mt-1 focus:ring-secondary focus:border-secondary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>
                </div>
            </div>
        )}
        {currentStep === 2 && (
            <div>
                <h3 className="text-lg font-medium mb-4 text-gray-800">Select Patients</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium mb-2">Available Patients for {clients?.find(c => c.id === invoiceData.clientId)?.name}</h4>
                        <div className="border rounded-md h-64 overflow-y-auto">
                            {isLoadingPatients ? (
                                <div className="flex justify-center items-center h-full">
                                  <Loader2 className="animate-spin text-secondary" />
                                </div>
                            ) : (
                                <ul>
                                    {patients?.map(patient => (
                                        <li key={patient.id} className="flex justify-between items-center p-2 hover:bg-gray-100">
                                            <span>{patient.first_name} {patient.last_name}</span>
                                            <button onClick={() => handleAddPatientToInvoice(patient)} className="btn btn-sm btn-secondary">Add</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Patients on Invoice</h4>
                        <div className="border rounded-md h-64 overflow-y-auto bg-gray-50">
                            {Array.from(patientsOnInvoice.values()).length === 0 ? (
                              <div className="flex items-center justify-center h-full text-sm text-gray-500">No patients added yet.</div>
                            ) : (
                              <ul>
                                  {Array.from(patientsOnInvoice.values()).map(({ patient }) => (
                                      <li key={patient.id} className="flex justify-between items-center p-2">
                                          <span>{patient.first_name} {patient.last_name}</span>
                                          <button onClick={() => handleRemovePatientFromInvoice(patient.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 size={16} />
                                          </button>
                                      </li>
                                  ))}
                              </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-800">Manage Patients & Line Items</h3>
              <div className="space-y-4">
                {Array.from(patientsOnInvoice.values()).map(({ patient, items }) => (
                  <PatientLineItems
                    key={patient.id}
                    patient={patient}
                    items={items}
                    onAddItem={handleAddItemToPatient}
                    onRemoveItem={handleRemoveItemFromPatient}
                    onItemChange={handleItemChange}
                    onRemovePatient={handleRemovePatientFromInvoice}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-6 bg-gray-50 border-t">
            <div className="flex justify-between">
                {currentStep > 1 ? (
                    <button onClick={() => setCurrentStep(s => s - 1)} className="btn btn-secondary flex items-center">
                        <ChevronLeft size={16} className="mr-1" /> Previous
                    </button>
                ) : <div />}
                {currentStep < 3 ? (
                    <button 
                      onClick={() => setCurrentStep(s => s + 1)} 
                      className="btn btn-primary flex items-center"
                      disabled={currentStep === 1 && !invoiceData.clientId || currentStep === 2 && patientsOnInvoice.size === 0}
                    >
                        Next <ChevronRight size={16} className="ml-1" />
                    </button>
                ) : (
                    <div>
                        <button onClick={handleSaveDraft} className="btn btn-secondary mr-2">
                            <Save size={16} className="mr-1" /> Save Draft
                        </button>
                        <button onClick={handleSendInvoice} className="btn btn-primary">
                            <Send size={16} className="mr-1" /> Send Invoice
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;