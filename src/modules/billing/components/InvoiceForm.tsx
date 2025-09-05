import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList } from 'react-window';
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
import debounce from 'lodash/debounce';
import { InvoiceService } from '../services/invoiceService';
import { supabase } from '../../../api/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import StatusBadge from '../../../components/StatusBadge';
import { getInvoiceById, updateInvoiceStatus, finalizeInvoice } from '../../../api/services/invoice.service';
import { checkForDuplicateRealtime } from '../../../api/services/duplicate.service';
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
      patient_first_name: '',
      patient_last_name: '',
      patient_dob: '',
      patient_mrn: '',
      patient_insurance_id: '',
      cpt_code_id: '',
      cpt_code: '', // Added for real-time check
      description: '',
      service_date: new Date().toISOString().split('T')[0],
      units: 1,
      unit_price: 0,
      invoice_type: 'Regular' as const
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
      
      setSelectedClientId(invoice.clientId.toString());
      setInvoiceDate(invoice.dateCreated);
      setDueDate(invoice.dateDue);
      setNotes(invoice.notes || '');
      
      if (invoice.items && invoice.items.length > 0) {
        setItems(invoice.items.map(item => ({
          accession_number: item.accessionNumber,
          patient_first_name: item.patientFirstName || '',
          patient_last_name: item.patientLastName || '',
          patient_dob: item.patientDob || '',
          patient_mrn: item.patientMrn || '',
          patient_insurance_id: item.patientInsuranceId || '',
          cpt_code_id: item.cptCodeId.toString(),
          cpt_code: item.cptCode || '',
          description: item.description,
          service_date: item.dateOfService,
          units: item.units || 1,
          unit_price: item.unitPrice,
          invoice_type: item.invoiceType || 'Regular'
        })));
      }
    } catch (error: any) {
      setErrors({ general: 'Failed to load invoice' });
    }
  };

  const loadData = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients').select('*').eq('organization_id', currentOrganization.id).eq('is_active', true).order('name');
      if (clientError) throw clientError;
      setClients(clientData || []);

      const { data: cptData, error: cptError } = await supabase
        .from('cpt_codes').select('*').eq('organization_id', currentOrganization.id).eq('is_active', true).order('code');
      if (cptError) throw cptError;
      setCptCodes(cptData || []);

      const today = new Date();
      const due = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      setDueDate(due.toISOString().split('T')[0]);

    } catch (error: any) {
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
        patient_first_name: '',
        patient_last_name: '',
        patient_dob: '',
        patient_mrn: '',
        patient_insurance_id: '',
        cpt_code_id: '',
        cpt_code: '',
        description: '',
        service_date: new Date().toISOString().split('T')[0],
        units: 1,
        unit_price: 0,
        invoice_type: 'Regular' as const
      }
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CreateInvoiceItemInput, value: any) => {
    const updatedItems = [...items];
    const currentItem = { ...updatedItems[index], [field]: value };

    if (field === 'cpt_code_id') {
      const cpt = cptCodes.find(c => c.id === value);
      if (cpt) {
        currentItem.description = cpt.description;
        currentItem.cpt_code = cpt.code; // Store cpt_code for duplicate check
      }
    }
    updatedItems[index] = currentItem;
    setItems(updatedItems);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedClientId) newErrors.client = 'Client is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (items.length === 0) newErrors.items = 'At least one item is required';
    
    items.forEach((item, index) => {
      if (!item.accession_number) newErrors[`item_${index}_accession`] = 'Accession # is required';
      if (!item.cpt_code_id) newErrors[`item_${index}_cpt`] = 'CPT code is required';
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFinalize = async () => {
    if (!invoiceId || !existingInvoice) return;
    setIsFinalizing(true);
    try {
      await finalizeInvoice(invoiceId);
      setInvoiceStatus('sent');
      await loadExistingInvoice();
      setErrors({ success: 'Invoice has been finalized.' });
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to finalize invoice' });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSave = async (sendAfterSave = false) => {
    if (!validateForm() || !currentOrganization || !user) return;
    if (invoiceStatus !== 'draft' && !sendAfterSave) {
      setErrors({ general: 'Only draft invoices can be edited.' });
      return;
    }
    
    setIsSaving(true);
    try {
      const invoiceData: CreateInvoiceInput = {
        client_id: selectedClientId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        items
      };
      const invoice = await InvoiceService.createInvoice(currentOrganization.id, invoiceData, user.id);
      if (sendAfterSave) await InvoiceService.sendInvoice(invoice.id);
      if (onSuccess) onSuccess();
      else navigate(`/billing/invoices/${invoice.id}`);
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save invoice' });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = () => items.reduce((total, item) => total + ((item.units || 1) * item.unit_price), 0);

  const Row = memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
    const { items, cptCodes, errors, updateItem, removeItem, currentOrganization } = data;
    const item = items[index];
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

    const debouncedDuplicateCheck = useCallback(
      debounce(async (accession, cptCode) => {
        if (accession && cptCode && currentOrganization) {
          const result = await checkForDuplicateRealtime({
            accessionNumber: accession,
            cptCode: cptCode,
            organizationId: currentOrganization.id,
          });
          setDuplicateWarning(result.isDuplicate ? result.message || 'This is a duplicate.' : null);
        } else {
          setDuplicateWarning(null);
        }
      }, 500),
      [currentOrganization]
    );

    useEffect(() => {
      debouncedDuplicateCheck(item.accession_number, item.cpt_code);
    }, [item.accession_number, item.cpt_code, debouncedDuplicateCheck]);

    return (
      <tr style={style} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
        <td className="px-3 py-2 align-top">
          <input
            type="text"
            value={item.accession_number}
            onChange={(e) => updateItem(index, 'accession_number', e.target.value)}
            className={`w-full px-2 py-1 border rounded ${errors[`item_${index}_accession`] ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="ACC001"
          />
          {duplicateWarning && <p className="mt-1 text-xs text-red-600">{duplicateWarning}</p>}
        </td>
        <td className="px-3 py-2 align-top">
          <select
            value={item.cpt_code_id}
            onChange={(e) => updateItem(index, 'cpt_code_id', e.target.value)}
            className={`w-full px-2 py-1 border rounded ${errors[`item_${index}_cpt`] ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select</option>
            {cptCodes.map((cpt: any) => <option key={cpt.id} value={cpt.id}>{cpt.code}</option>)}
          </select>
        </td>
        {/* Other tds for patient info, service date, etc. remain the same */}
        <td className="px-3 py-2 align-top">
          <input type="text" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded" />
        </td>
        <td className="px-3 py-2 align-top">
          <input type="date" value={item.service_date} onChange={(e) => updateItem(index, 'service_date', e.target.value)} className={`w-full px-2 py-1 border rounded ${errors[`item_${index}_date`] ? 'border-red-500' : 'border-gray-300'}`} />
        </td>
        <td className="px-3 py-2 align-top">
          <input type="number" value={item.units || 1} onChange={(e) => updateItem(index, 'units', parseInt(e.target.value) || 1)} className="w-20 px-2 py-1 border border-gray-300 rounded" min="1" />
        </td>
        <td className="px-3 py-2 align-top">
          <input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 border border-gray-300 rounded" step="0.01" min="0" />
        </td>
        <td className="px-3 py-2 text-right align-top">${(((item.units || 1) * item.unit_price)).toFixed(2)}</td>
        <td className="px-3 py-2 align-top">
          <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-900" disabled={items.length === 1}><Trash2 className="h-4 w-4" /></button>
        </td>
      </tr>
    );
  });

  Row.displayName = 'InvoiceItemRow';

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Form header and client/date info remains the same */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{invoiceId ? 'Edit Invoice' : 'Create New Invoice'}</h2>
        </div>
        <div className="p-6">
          {/* Client and Date fields */}
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Accession #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPT Code</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th></th>
                </tr>
              </thead>
            </table>
            <FixedSizeList
              height={400}
              itemCount={items.length}
              itemSize={95} // Increased size for warning message
              width="100%"
              itemData={{ items, cptCodes, errors, updateItem, removeItem, currentOrganization }}
              outerElementType={(props) => <table className="min-w-full" {...props} />}
              innerElementType="tbody"
            >
              {Row}
            </FixedSizeList>
            <table className="min-w-full">
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right font-medium text-gray-700">Total:</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-800">${calculateTotal().toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" onClick={addItem} className="mt-4 inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </button>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button type="button" onClick={onCancel || (() => navigate('/billing/invoices'))} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => handleSave(false)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;