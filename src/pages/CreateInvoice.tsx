import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Save, Send, ChevronRight, ChevronLeft, FileUp, Info, Loader2, ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceStatus, Client, Patient, ReasonType } from '../types';
import { format } from 'date-fns';
import { getClients } from '../api/services/client.service';
import { getPatientsByClient, createPatient } from '../api/services/patient.service';
import { getCptCodeByCode } from '../api/services/cpt.service';
import { createInvoice, updateInvoice, getInvoiceById } from '../api/services/invoice.service';
import { useNotifications } from '../context/NotificationContext';
// Assuming a pricing service exists
// import { getPriceForCptCode } from '../api/services/pricing.service';

// Sub-component for managing a single patient's line items
const PatientLineItems = ({ patient, items, onAddItem, onRemoveItem, onItemChange, onRemovePatient }) => {
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

  // ... (rest of the state and hooks)

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
      // In a real app, you would call the pricing service here
      // const price = await getPriceForCptCode(value, invoiceData.clinicId);
      // For now, we'll just use a mock price
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

  // ... (other handlers)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ... (header) */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* ... (progress steps) */}
        <div className="p-4 sm:p-6">
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
                    onRemovePatient={() => {}} // Placeholder
                  />
                ))}
              </div>
              <div className="mt-6">
                <h4 className="font-medium mb-2">Add Patient to Invoice</h4>
                {/* Patient selection dropdown */}
              </div>
            </div>
          )}
          {/* ... (other steps) */}
        </div>
        {/* ... (footer) */}
      </div>
    </div>
  );
};

export default CreateInvoice;