import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Loader2,
  Lock,
  CheckCircle
} from 'lucide-react';
import { InvoiceService } from '../services/invoiceService';
import { supabase } from '../../../api/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import StatusBadge from '../../../components/StatusBadge';
import { getInvoiceById, updateInvoiceStatus, finalizeInvoice } from '../../../api/services/invoice.service';
import type { 
  Client, 
  CPTCode, 
  CreateInvoiceInput, 
  CreateInvoiceItemInput 
} from '../../../types/database';
import type { Invoice, InvoiceStatus } from '../../../types';

interface InvoiceFormProps {
  invoiceId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  invoiceId, 
  onSuccess, 
  onCancel 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('draft');
  
  // Form data
  const [clients, setClients] = useState<Client[]>([]);
  const [cptCodes, setCptCodes] = useState<CPTCode[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [terms, setTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateInvoiceItemInput[]>([
    {
      accession_number: '',
      cpt_code_id: '',
      description: '',
      service_date: new Date().toISOString().split('T')[0],
      quantity: 1,
      units: 1,
      unit_price: 0
    }
  ]);

  // Load clients and CPT codes, and existing invoice if editing
  useEffect(() => {
    if (currentOrganization) {
      loadData();
      if (invoiceId) {
        loadExistingInvoice();
      }
    }
  }, [currentOrganization, invoiceId]);

  const loadExistingInvoice = async () => {
    if (!invoiceId) return;
    
    try {
      const invoice = await getInvoiceById(invoiceId);
      setExistingInvoice(invoice);
      setInvoiceStatus(invoice.status);
      
      // Populate form fields with existing invoice data
      setSelectedClientId(invoice.clientId.toString());
      setInvoiceDate(invoice.dateCreated);
      setDueDate(invoice.dateDue);
      setNotes(invoice.notes || '');
      
      // Load invoice items
      if (invoice.items && invoice.items.length > 0) {
        setItems(invoice.items.map(item => ({
          accession_number: item.accessionNumber,
          cpt_code_id: item.cptCodeId.toString(),
          description: item.description,
          service_date: item.dateOfService,
          quantity: item.quantity,
          units: item.units || 1,
          unit_price: item.unitPrice
        })));
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      setErrors({ general: 'Failed to load invoice' });
    }
  };

  const loadData = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      // Load clients
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (clientError) throw clientError;
      setClients(clientData || []);

      // Load CPT codes
      const { data: cptData, error: cptError } = await supabase
        .from('cpt_codes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('code');

      if (cptError) throw cptError;
      setCptCodes(cptData || []);

      // Set default due date (30 days from today)
      const today = new Date();
      const due = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      setDueDate(due.toISOString().split('T')[0]);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setErrors({ general: 'Failed to load data' });
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        accession_number: '',
        cpt_code_id: '',
        description: '',
        service_date: new Date().toISOString().split('T')[0],
        quantity: 1,
        units: 1,
        unit_price: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CreateInvoiceItemInput, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If CPT code changed, update description
    if (field === 'cpt_code_id') {
      const cpt = cptCodes.find(c => c.id === value);
      if (cpt) {
        updatedItems[index].description = cpt.description;
      }
    }
    
    setItems(updatedItems);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedClientId) newErrors.client = 'Client is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      items.forEach((item, index) => {
        if (!item.accession_number) {
          newErrors[`item_${index}_accession`] = 'Accession number is required';
        }
        if (!item.cpt_code_id) {
          newErrors[`item_${index}_cpt`] = 'CPT code is required';
        }
        if (!item.service_date) {
          newErrors[`item_${index}_date`] = 'Service date is required';
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFinalize = async () => {
    if (!invoiceId || !existingInvoice) return;
    
    setIsFinalizing(true);
    setErrors({});
    
    try {
      await finalizeInvoice(invoiceId);
      setInvoiceStatus('sent');
      
      // Reload the invoice to get updated data
      await loadExistingInvoice();
      
      // Show success message
      setErrors({ success: 'Invoice has been finalized and is ready to send.' });
    } catch (error: any) {
      console.error('Error finalizing invoice:', error);
      setErrors({ general: error.message || 'Failed to finalize invoice' });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSave = async (sendAfterSave = false) => {
    if (!validateForm() || !currentOrganization || !user) return;
    
    // Check if trying to edit a non-draft invoice without admin rights
    if (invoiceStatus !== 'draft' && !sendAfterSave) {
      setErrors({ general: 'Only draft invoices can be edited. Please contact an administrator.' });
      return;
    }
    
    setIsSaving(true);
    setErrors({});
    
    try {
      const invoiceData: CreateInvoiceInput = {
        client_id: selectedClientId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        billing_period_start: billingPeriodStart || undefined,
        billing_period_end: billingPeriodEnd || undefined,
        terms: terms || undefined,
        notes: notes || undefined,
        items
      };

      const invoice = await InvoiceService.createInvoice(
        currentOrganization.id,
        invoiceData,
        user.id
      );

      if (sendAfterSave) {
        await InvoiceService.sendInvoice(invoice.id);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/billing/invoices/${invoice.id}`);
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      
      // Check for duplicate error
      if (error.message?.includes('duplicate')) {
        setErrors({ 
          general: 'Duplicate item detected. An invoice item with this accession number and CPT code already exists.' 
        });
      } else {
        setErrors({ general: error.message || 'Failed to save invoice' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const units = item.units || 1;
      return total + (item.quantity * units * item.unit_price);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            {invoiceId && existingInvoice && (
              <div className="flex items-center space-x-4">
                <StatusBadge status={invoiceStatus} />
                {invoiceStatus !== 'draft' && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Lock className="h-4 w-4 mr-1" />
                    <span>Read-only</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {errors.general && (
          <div className="mx-6 mt-4 p-4 bg-red-50 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}
        
        {errors.success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
            <p className="text-sm text-green-800">{errors.success}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Client and Date Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={invoiceStatus !== 'draft'}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.client ? 'border-red-500' : 'border-gray-300'
                } ${invoiceStatus !== 'draft' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.code && `(${client.code})`}
                  </option>
                ))}
              </select>
              {errors.client && (
                <p className="mt-1 text-sm text-red-600">{errors.client}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={invoiceStatus !== 'draft'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${invoiceStatus !== 'draft' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={invoiceStatus !== 'draft'}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dueDate ? 'border-red-500' : 'border-gray-300'
                } ${invoiceStatus !== 'draft' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period Start
              </label>
              <input
                type="date"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period End
              </label>
              <input
                type="date"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            {errors.items && (
              <p className="mb-2 text-sm text-red-600">{errors.items}</p>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Accession #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      CPT Code
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Service Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Units
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.accession_number}
                          onChange={(e) => updateItem(index, 'accession_number', e.target.value)}
                          className={`w-full px-2 py-1 border rounded ${
                            errors[`item_${index}_accession`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="ACC001"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.cpt_code_id}
                          onChange={(e) => updateItem(index, 'cpt_code_id', e.target.value)}
                          className={`w-full px-2 py-1 border rounded ${
                            errors[`item_${index}_cpt`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select</option>
                          {cptCodes.map(cpt => (
                            <option key={cpt.id} value={cpt.id}>
                              {cpt.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={item.service_date}
                          onChange={(e) => updateItem(index, 'service_date', e.target.value)}
                          className={`w-full px-2 py-1 border rounded ${
                            errors[`item_${index}_date`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                          min="1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.units || 1}
                          onChange={(e) => updateItem(index, 'units', parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                          min="1"
                          title="Units (e.g., miles for mileage, hours for time-based)"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${((item.quantity * (item.units || 1) * item.unit_price)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-900"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="px-3 py-2 text-right font-medium">
                      Total:
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ${calculateTotal().toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or instructions..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel || (() => navigate('/billing/invoices'))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSaving || isFinalizing}
          >
            Cancel
          </button>
          
          {/* Only show save draft button for draft invoices */}
          {invoiceStatus === 'draft' && (
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving || isFinalizing}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </button>
          )}
          
          {/* Show finalize button for draft invoices */}
          {invoiceStatus === 'draft' && invoiceId && (
            <button
              type="button"
              onClick={handleFinalize}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50"
              disabled={isSaving || isFinalizing}
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize Invoice
                </>
              )}
            </button>
          )}
          
          {/* Show send button for sent/finalized invoices */}
          {(invoiceStatus === 'sent' || invoiceStatus === 'draft') && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={isSaving || isFinalizing}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {invoiceStatus === 'draft' ? 'Save & Send' : 'Send Invoice'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;