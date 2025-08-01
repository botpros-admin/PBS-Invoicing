import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import {
  Trash2,
  Save,
  Send,
  ChevronRight,
  ChevronLeft,
  FileUp,
  Info,
  // AlertCircle, // Removed unused import
  Loader2,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceStatus, Client, Patient, /* CptCode, */ ReasonType } from '../types'; // Removed unused CptCode
import { format } from 'date-fns';
import { getClients } from '../api/services/client.service';
import { getPatientsByClient, createPatient } from '../api/services/patient.service';
import { getCptCodeByCode } from '../api/services/cpt.service';
import { createInvoice, updateInvoice, getInvoiceById } from '../api/services/invoice.service';
import { useNotifications } from '../context/NotificationContext'; // Added notifications

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications(); // Added notifications hook

  // UI State
  const [currentStep, setCurrentStep] = useState(1);
  const [reasonType, setReasonType] = useState<ReasonType | ''>('');
  const [showICNField, setShowICNField] = useState(false);
  const [icn, setICN] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClinicId, setSelectedClinicId] = useState<string>(''); // Keep track of selected clinic
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Form state with initial values
  const [invoiceData, setInvoiceData] = useState<Partial<Invoice>>({
    status: 'draft',
    items: [],
    dateCreated: new Date().toISOString().split('T')[0], // Use YYYY-MM-DD format
    dateDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Use YYYY-MM-DD format
    subtotal: 0,
    total: 0,
    amountPaid: 0,
    balance: 0,
    invoiceNumber: `INV-${new Date().getFullYear()}-${1000 + Math.floor(Math.random() * 9000)}`,
  });

  // Patient form state (for creating new patients)
  const [patientForm, setPatientForm] = useState<Partial<Patient>>({
    first_name: '',
    last_name: '',
    dob: undefined,
    sex: undefined,
    mrn: undefined,
    accessionNumber: undefined
  });

  // Fetch existing invoice if in edit mode
  const {
    data: existingInvoice,
    isLoading: isLoadingInvoice,
    isError: isErrorInvoice,
    error: invoiceError
  } = useQuery<Invoice, Error>({ // Added Error type
    queryKey: ['invoice', editId],
    queryFn: () => getInvoiceById(editId!),
    enabled: !!editId,
    // onSuccess removed, handle side effects in useEffect below
  });

  // Effect to update state when existing invoice data loads
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceData({
        ...existingInvoice,
        // Ensure dates are in YYYY-MM-DD format for input[type=date]
        dateCreated: existingInvoice.dateCreated ? format(new Date(existingInvoice.dateCreated), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
        dateDue: existingInvoice.dateDue ? format(new Date(existingInvoice.dateDue), 'yyyy-MM-dd') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setSelectedClientId(existingInvoice.clientId ? String(existingInvoice.clientId) : '');
      setSelectedClinicId(existingInvoice.clinicId ? String(existingInvoice.clinicId) : '');
      setSelectedPatientId(existingInvoice.patientId ? String(existingInvoice.patientId) : '');
      if (existingInvoice.reasonType) setReasonType(existingInvoice.reasonType);
      setNotes(existingInvoice.notes || '');
      setICN(existingInvoice.icn || '');
      setShowICNField(!!existingInvoice.icn);
    }
  }, [existingInvoice]);


  // Fetch clients
  const {
    data: clientsData,
    isLoading: isLoadingClients,
    isError: isErrorClients,
    error: clientsError
  } = useQuery<Client[], Error>({ // Added Error type
    queryKey: ['clients'],
    queryFn: async () => {
        const response = await getClients(); // Assuming getClients returns { data: Client[] }
        return response.data; // Extract the data array
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // select removed, transformation done in queryFn
  });

  // Fetch patients for the selected client
  const {
    data: patientsData,
    isLoading: isLoadingPatients,
    isError: isErrorPatients,
    error: patientsError
  } = useQuery<Patient[], Error>({ // Added Error type
    queryKey: ['patients', selectedClientId],
    queryFn: async () => {
        const response = await getPatientsByClient(selectedClientId); // Assuming returns { data: Patient[] }
        return response.data; // Extract the data array
    },
    enabled: !!selectedClientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // select removed, transformation done in queryFn
  });

  // Handle client selection
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);

    // Find the selected client to get clinics
    const client = clientsData?.find(c => String(c.id) === clientId); // Ensure comparison is correct type
    const firstClinicId = client?.clinics?.[0]?.id;

    setSelectedClinicId(firstClinicId ? String(firstClinicId) : ''); // Set first clinic or empty
    setSelectedPatientId(''); // Reset patient

    setInvoiceData(prev => ({
      ...prev,
      clientId: clientId || undefined, // Store ID or undefined
      clinicId: firstClinicId ? String(firstClinicId) : undefined, // Store ID or undefined
      patientId: undefined // Reset patient ID in invoice data
    }));
  };

  // Handle clinic selection (assuming clinics are fetched with the client)
  const handleClinicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clinicId = e.target.value;
    setSelectedClinicId(clinicId);
    setInvoiceData(prev => ({
      ...prev,
      clinicId: clinicId || undefined // Store ID or undefined
    }));
  };

  // Handle patient selection
  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    setSelectedPatientId(patientId);
    setInvoiceData(prev => ({
      ...prev,
      patientId: patientId || undefined // Store ID or undefined
    }));
  };

  // Handle patient form changes
  const handlePatientFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPatientForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new patient mutation
  const createPatientMutation = useMutation<Patient, Error, Partial<Patient>>({ // Added types
    mutationFn: (newPatient: Partial<Patient>) => createPatient(newPatient),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients', selectedClientId] });
      setSelectedPatientId(String(data.id));
      setInvoiceData(prev => ({
        ...prev,
        patientId: data.id
      }));
      setPatientForm({ // Reset form
        first_name: '', last_name: '', dob: undefined, sex: undefined, mrn: undefined, accessionNumber: undefined
      });
      addNotification({ type: 'system', message: 'Patient created successfully.' });
    },
    onError: (error) => {
        addNotification({ type: 'system', message: `Error creating patient: ${error.message}` });
    }
  });

  // Handle creating a new patient
  const handleCreatePatient = () => {
    if (!selectedClientId) {
      addNotification({ type: 'system', message: 'Please select a client first.' });
      return;
    }
    if (!patientForm.first_name || !patientForm.last_name) {
      addNotification({ type: 'system', message: 'First name and last name are required for new patient.' });
      return;
    }
    createPatientMutation.mutate({
      ...patientForm,
      clientId: selectedClientId // Ensure clientId is passed
    });
  };

  // Handle adding a new line item
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `temp-${Date.now()}`, // Temporary ID
      invoiceId: invoiceData.id || 'temp-invoice', // Use existing ID or temp
      cptCodeId: '',
      cptCode: '',
      description: '',
      dateOfService: format(new Date(), 'yyyy-MM-dd'), // Default to today
      quantity: 1,
      unitPrice: 0,
      total: 0,
      isDisputed: false,
      medicalNecessityProvided: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvoiceData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  // Handle removing a line item
  const handleRemoveItem = (itemId: string | number) => { // Allow number for existing items
    const currentItems = invoiceData.items || [];
    if (currentItems.length <= 1) {
      addNotification({ type: 'system', message: 'Cannot remove the last line item.' });
      return;
    }
    const updatedItems = currentItems.filter(item => String(item.id) !== String(itemId)); // Compare as strings
    setInvoiceData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  // Handle changing a line item
  const handleItemChange = async (itemId: string | number, field: keyof InvoiceItem, value: string | number | boolean) => { // Typed value
    let requiresRecalculation = false;
    let requiresCptFetch = false;

    const updatedItems = (invoiceData.items || []).map(item => {
      if (String(item.id) === String(itemId)) { // Compare as strings
        const updatedItem = { ...item, [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = Number(updatedItem.quantity) || 0;
          const unitPrice = Number(updatedItem.unitPrice) || 0;
          updatedItem.total = parseFloat((quantity * unitPrice).toFixed(2));
          requiresRecalculation = true;
        }

        if (field === 'cptCode') {
            requiresCptFetch = true;
            updatedItem.description = 'Loading...'; // Show loading state
        }

        return updatedItem;
      }
      return item;
    });

    // Update state immediately for responsiveness
    setInvoiceData(prev => ({ ...prev, items: updatedItems }));

    // Fetch CPT details if needed
    if (requiresCptFetch && typeof value === 'string' && value) { // Ensure value is a non-empty string
      try {
        const cptCodeDetails = await getCptCodeByCode(value); // Now value is guaranteed to be a string
        const finalItems = (invoiceData.items || []).map(item => { // Use latest state
            if (String(item.id) === String(itemId)) {
                const quantity = Number(item.quantity) || 0;
                return {
                    ...item,
                    description: cptCodeDetails.description,
                    unitPrice: cptCodeDetails.defaultPrice,
                    total: parseFloat((quantity * cptCodeDetails.defaultPrice).toFixed(2)),
                    cptCodeId: cptCodeDetails.id,
                };
            }
            return item;
        });
        setInvoiceData(prev => ({ ...prev, items: finalItems }));
        calculateTotals(finalItems); // Recalculate after fetch
      } catch (error) {
        console.error(`Failed to fetch CPT code details for ${value}:`, error);
        addNotification({ type: 'system', message: `CPT code ${value} not found.` });
        const finalItems = (invoiceData.items || []).map(item => { // Use latest state
            if (String(item.id) === String(itemId)) {
                return { ...item, description: 'Unknown code', unitPrice: 0, total: 0, cptCodeId: '' };
            }
            return item;
        });
        setInvoiceData(prev => ({ ...prev, items: finalItems }));
        calculateTotals(finalItems); // Recalculate even on error
      }
    } else if (requiresRecalculation) {
      calculateTotals(updatedItems); // Recalculate if only quantity/price changed
    }
  };


  // Calculate invoice totals
  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    // Ensure subtotal is a number before calculations
    const numericSubtotal = Number(subtotal) || 0;
    setInvoiceData(prev => {
        const numericAmountPaid = Number(prev.amountPaid) || 0;
        return {
            ...prev,
            subtotal: numericSubtotal,
            total: numericSubtotal, // Assuming total is same as subtotal for now
            balance: numericSubtotal - numericAmountPaid,
        };
    });
  };

  // --- Mutations ---
  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] }); // Invalidate list after mutation
      navigate('/invoices');
      addNotification({ type: 'system', message: `Invoice ${editId ? 'updated' : 'created'} successfully.` });
    },
    onError: (error: Error) => {
      console.error(`Failed to ${editId ? 'update' : 'create'} invoice:`, error);
      addNotification({ type: 'system', message: `Failed to ${editId ? 'update' : 'create'} invoice: ${error.message}` });
    }
  };

  const createInvoiceMutation = useMutation<Invoice, Error, Partial<Invoice>>( // Added types
    { mutationFn: (invoice: Partial<Invoice>) => createInvoice(invoice), ...mutationOptions }
  );

  const updateInvoiceMutation = useMutation<Invoice, Error, { id: string; invoice: Partial<Invoice> }>( // Added types
    { mutationFn: ({ id, invoice }: { id: string; invoice: Partial<Invoice> }) => updateInvoice(id, invoice), ...mutationOptions }
  );

  // --- Save Handlers ---
  const prepareInvoicePayload = (status: InvoiceStatus): Partial<Invoice> => ({
    ...invoiceData,
    clientId: selectedClientId || undefined,
    clinicId: selectedClinicId || undefined,
    patientId: selectedPatientId || undefined,
    status,
    reasonType: reasonType || undefined,
    notes: notes || undefined,
    icn: showICNField ? icn || undefined : undefined,
    // Map items, ensuring they conform to InvoiceItem, omitting temp IDs conceptually
    items: (invoiceData.items || []).map(item => {
        const { id, ...rest } = item;
        // Create a base object conforming to InvoiceItem structure
        const baseItem: Omit<InvoiceItem, 'id'> = {
            invoiceId: rest.invoiceId || invoiceData.id || 'temp-invoice', // Ensure invoiceId
            cptCodeId: rest.cptCodeId || '',
            cptCode: rest.cptCode || '',
            description: rest.description || '',
            dateOfService: rest.dateOfService || format(new Date(), 'yyyy-MM-dd'),
            quantity: rest.quantity || 0,
            unitPrice: rest.unitPrice || 0,
            total: rest.total || 0,
            isDisputed: rest.isDisputed || false,
            medicalNecessityProvided: rest.medicalNecessityProvided || false,
            createdAt: rest.createdAt || new Date().toISOString(),
            updatedAt: rest.updatedAt || new Date().toISOString(),
            // Include optional fields if they exist
            ...(rest.descriptionOverride && { descriptionOverride: rest.descriptionOverride }),
            ...(rest.disputeReason && { disputeReason: rest.disputeReason }),
            ...(rest.disputeResolvedAt && { disputeResolvedAt: rest.disputeResolvedAt }),
            ...(rest.disputeResolutionNotes && { disputeResolutionNotes: rest.disputeResolutionNotes }),
            ...(rest.medicalNecessityDocumentPath && { medicalNecessityDocumentPath: rest.medicalNecessityDocumentPath }),
        };

        // Only include the ID if it's not a temporary one
        if (typeof id === 'string' && id.startsWith('temp-')) {
            return baseItem; // Return without ID for new items
        }
        return { id, ...baseItem }; // Return with ID for existing items
    }) as InvoiceItem[] // Assert the final array type matches InvoiceItem[]
  });

  const handleSaveDraft = () => {
    const payload = prepareInvoicePayload('draft');
    if (editId) {
      updateInvoiceMutation.mutate({ id: editId, invoice: payload });
    } else {
      createInvoiceMutation.mutate(payload);
    }
  };

  const handleCreateAndSend = () => {
    // Add validation checks here if needed before sending
    if (!selectedClientId || !selectedPatientId || !invoiceData.items?.length) {
        addNotification({ type: 'system', message: 'Client, Patient, and at least one line item are required to send.' });
        return;
    }
    const payload = prepareInvoicePayload('sent');
    if (editId) {
      updateInvoiceMutation.mutate({ id: editId, invoice: payload });
    } else {
      createInvoiceMutation.mutate(payload);
    }
  };

  // --- Navigation ---
  const handleBack = () => navigate('/invoices');
  const handleNextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handlePrevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // --- Data for Display ---
  const selectedClient = clientsData?.find(c => String(c.id) === selectedClientId);
  const selectedClinic = selectedClient?.clinics?.find(c => String(c.id) === selectedClinicId);
  const selectedPatient = patientsData?.find(p => String(p.id) === selectedPatientId);

  // --- Loading/Error States ---
  if (editId && isLoadingInvoice) {
    return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /><span className="ml-2 text-lg text-gray-700">Loading invoice...</span></div>;
  }
  if (editId && isErrorInvoice) {
    return <div className="p-6 bg-red-100 text-red-700 rounded-md">Error loading invoice: {invoiceError?.message || 'Unknown error'}</div>;
  }
  if (isLoadingClients) {
     return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /><span className="ml-2 text-lg text-gray-700">Loading clients...</span></div>;
  }
   if (isErrorClients) {
    return <div className="p-6 bg-red-100 text-red-700 rounded-md">Error loading clients: {clientsError?.message || 'Unknown error'}</div>;
  }

  const isMutating = createInvoiceMutation.isPending || updateInvoiceMutation.isPending; // Use isPending

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-gray-900">{editId ? 'Edit Invoice' : 'Create New Invoice'}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleSaveDraft} className="btn btn-secondary" disabled={isMutating}>
            <Save size={16} className="mr-2" /> Save Draft
          </button>
          <button onClick={handleCreateAndSend} className="btn btn-primary" disabled={isMutating}>
            <Send size={16} className="mr-2" /> {editId ? 'Update & Send' : 'Create & Send'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Progress Steps */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          {/* Step Indicator - simplified for brevity, assuming previous implementation was okay */}
           <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                {[1, 2, 3, 4].map(step => (
                    <React.Fragment key={step}>
                        {step > 1 && <div className="h-0.5 w-8 sm:w-12 bg-gray-200"></div>}
                        <div className={`flex items-center ${currentStep >= step ? 'text-indigo-600' : 'text-gray-500'}`}>
                            <div className={`flex items-center justify-center h-6 w-6 rounded-full ${currentStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {step}
                            </div>
                            <span className="ml-2 text-xs sm:text-sm font-medium hidden md:inline">
                                {step === 1 ? 'Client' : step === 2 ? 'Patient' : step === 3 ? 'Items' : 'Review'}
                            </span>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>

        {/* Step Content */}
        <div className="p-4 sm:p-6">
          {/** STEP 1: Basic Info **/}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {/* Client/Clinic Selection */}
                <div>
                  <label htmlFor="client" className="form-label">Client</label>
                  <select id="client" value={selectedClientId} onChange={handleClientChange} className="form-select" disabled={isLoadingClients}>
                    <option value="">Select Client</option>
                    {clientsData?.map((client) => (
                      <option key={String(client.id)} value={String(client.id)}>{client.name}</option>
                    ))}
                  </select>
                </div>
                 {/* Clinic Selection (Conditional) */}
                 {selectedClient?.clinics && selectedClient.clinics.length > 0 && (
                    <div>
                        <label htmlFor="clinic" className="form-label">Clinic</label>
                        <select id="clinic" value={selectedClinicId} onChange={handleClinicChange} className="form-select">
                            <option value="">Select Clinic</option>
                            {selectedClient.clinics.map((clinic) => (
                                <option key={String(clinic.id)} value={String(clinic.id)}>{clinic.name}</option>
                            ))}
                        </select>
                    </div>
                 )}
                {/* Reason Type */}
                <div>
                  <label htmlFor="reasonType" className="form-label">Reason Type</label>
                  <select id="reasonType" value={reasonType} onChange={(e) => setReasonType(e.target.value as ReasonType | '')} className="form-select">
                    <option value="">Select Reason</option>
                    <option value="hospice">Hospice</option>
                    <option value="snf">SNF</option>
                    <option value="ltc">Long-term Care</option>
                  </select>
                </div>
                {/* Invoice Number */}
                <div>
                    <label htmlFor="invoiceNumber" className="form-label">Invoice Number</label>
                    <input type="text" id="invoiceNumber" value={invoiceData.invoiceNumber || ''} readOnly className="form-input bg-gray-50" />
                </div>
                {/* Invoice Date */}
                <div>
                  <label htmlFor="dateCreated" className="form-label">Invoice Date</label>
                    <input type="date" id="dateCreated" value={invoiceData.dateCreated || ''} onChange={(e) => setInvoiceData(prev => ({ ...prev, dateCreated: e.target.value }))} className="form-input" />
                </div>
                {/* Due Date */}
                <div>
                  <label htmlFor="dateDue" className="form-label">Due Date</label>
                    <input type="date" id="dateDue" value={invoiceData.dateDue || ''} onChange={(e) => setInvoiceData(prev => ({ ...prev, dateDue: e.target.value }))} className="form-input" />
                </div>
                 {/* ICN Checkbox & Input */}
                 <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-end">
                    <div className="flex items-center pt-5">
                        <input id="show-icn" name="show-icn" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" checked={showICNField} onChange={() => setShowICNField(!showICNField)} />
                        <label htmlFor="show-icn" className="ml-2 block text-sm text-gray-700">Add ICN (Internal Claim Number)</label>
                    </div>
                    {showICNField && (
                        <div>
                            <label htmlFor="icn" className="form-label">ICN</label>
                            <input type="text" id="icn" value={icn} onChange={(e) => setICN(e.target.value)} className="form-input" placeholder="Enter ICN" />
                        </div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {/** STEP 2: Patient Info **/}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Patient Selection */}
              <div>
                <label htmlFor="patient" className="form-label">Select Patient</label>
                <select id="patient" value={selectedPatientId} onChange={handlePatientChange} className="form-select" disabled={!selectedClientId || isLoadingPatients}>
                  <option value="">{isLoadingPatients ? 'Loading...' : 'Select Patient'}</option>
                  {patientsData?.map((patient) => (
                    <option key={String(patient.id)} value={String(patient.id)}>
                      {patient.first_name} {patient.last_name} {patient.mrn ? `(MRN: ${patient.mrn})` : ''}
                    </option>
                  ))}
                </select>
                {isErrorPatients && <p className="text-red-500 text-xs mt-1">Error loading patients: {patientsError?.message}</p>}
              </div>

              {/* Create New Patient Form */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-medium mb-4 text-gray-800">Or Create New Patient</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  {/* Form fields... */}
                   <div>
                      <label htmlFor="patientFirstName" className="form-label">First Name*</label>
                      <input type="text" id="patientFirstName" name="first_name" value={patientForm.first_name || ''} onChange={handlePatientFormChange} className="form-input" disabled={!selectedClientId} />
                    </div>
                    <div>
                      <label htmlFor="patientLastName" className="form-label">Last Name*</label>
                      <input type="text" id="patientLastName" name="last_name" value={patientForm.last_name || ''} onChange={handlePatientFormChange} className="form-input" disabled={!selectedClientId} />
                    </div>
                    <div>
                      <label htmlFor="patientDob" className="form-label">Date of Birth</label>
                      <input type="date" id="patientDob" name="dob" value={patientForm.dob || ''} onChange={handlePatientFormChange} className="form-input" disabled={!selectedClientId} />
                    </div>
                    <div>
                      <label htmlFor="patientSex" className="form-label">Sex</label>
                      <select id="patientSex" name="sex" value={patientForm.sex || ''} onChange={handlePatientFormChange} className="form-select" disabled={!selectedClientId}>
                        <option value="">Select</option> <option value="male">Male</option> <option value="female">Female</option> <option value="other">Other</option> <option value="unknown">Unknown</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="patientMrn" className="form-label">MRN</label>
                      <input type="text" id="patientMrn" name="mrn" value={patientForm.mrn || ''} onChange={handlePatientFormChange} className="form-input" disabled={!selectedClientId} />
                    </div>
                    <div>
                      <label htmlFor="patientAccessionNumber" className="form-label">Accession Number</label>
                      <input type="text" id="patientAccessionNumber" name="accessionNumber" value={patientForm.accessionNumber || ''} onChange={handlePatientFormChange} className="form-input" disabled={!selectedClientId} />
                    </div>
                </div>
                <div className="mt-4">
                  <button type="button" onClick={handleCreatePatient} className="btn btn-success" disabled={!selectedClientId || !patientForm.first_name || !patientForm.last_name || createPatientMutation.isPending}>
                    {createPatientMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Create Patient
                  </button>
                </div>
              </div>
            </div>
          )}

          {/** STEP 3: Line Items **/}
          {currentStep === 3 && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                    <button onClick={handleAddItem} className="btn btn-primary btn-sm">
                        <Plus size={16} className="mr-1" /> Add Item
                    </button>
                </div>
                <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">CPT Code</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">Description</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Date of Service</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Price</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Med. Nec.</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(invoiceData.items || []).length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No items added.</td></tr>
                            ) : (
                                (invoiceData.items || []).map((item) => (
                                    <tr key={String(item.id)}>
                                        <td className="px-3 py-2"><input type="text" value={item.cptCode} onChange={(e) => handleItemChange(String(item.id), 'cptCode', e.target.value)} className="form-input form-input-sm" placeholder="Code" /></td>
                                        <td className="px-3 py-2"><input type="text" value={item.description} readOnly className="form-input form-input-sm bg-gray-50" placeholder="Desc." /></td>
                                        <td className="px-3 py-2"><input type="date" value={item.dateOfService} onChange={(e) => handleItemChange(String(item.id), 'dateOfService', e.target.value)} className="form-input form-input-sm" /></td>
                                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(String(item.id), 'unitPrice', parseFloat(e.target.value) || 0)} className="form-input form-input-sm text-right" placeholder="0.00" /></td>
                                        <td className="px-3 py-2 text-center"><input type="checkbox" checked={item.medicalNecessityProvided || false} onChange={(e) => handleItemChange(String(item.id), 'medicalNecessityProvided', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" /></td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                {item.medicalNecessityProvided && <button type="button" className="text-indigo-600 hover:text-indigo-900" title="Upload Doc"><FileUp size={16} /></button>}
                                                <button onClick={() => handleRemoveItem(String(item.id))} className="text-red-600 hover:text-red-900" disabled={(invoiceData.items || []).length <= 1} title="Remove Item"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50">
                                <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">Subtotal</td>
                                <td colSpan={3} className="px-6 py-3 text-left text-sm font-medium text-gray-900">${invoiceData.subtotal?.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-gray-50">
                                <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-700">Total</td>
                                <td colSpan={3} className="px-6 py-3 text-left text-sm font-bold text-gray-900">${invoiceData.total?.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Notes Section */}
                <div>
                    <label htmlFor="notes" className="form-label">Notes</label>
                    <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" placeholder="Internal notes or special instructions..." />
                </div>
            </div>
          )}

          {/** STEP 4: Review **/}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Review Warning */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                <div className="flex"><div className="flex-shrink-0"><Info size={20} className="text-yellow-500" /></div><div className="ml-3"><p className="text-sm text-yellow-700">Please review all information before saving or sending.</p></div></div>
              </div>

              {/* Review Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border border-gray-200 p-4 rounded-md">
                {/* Client Info */}
                <div>
                  <h4 className="review-header">Client Information</h4>
                  <div className="review-content">
                    <p><strong>Client:</strong> {selectedClient?.name || 'N/A'}</p>
                    <p><strong>Clinic:</strong> {selectedClinic?.name || 'N/A'}</p>
                    {reasonType && <p><strong>Reason:</strong> {reasonType}</p>}
                    {showICNField && icn && <p><strong>ICN:</strong> {icn}</p>}
                  </div>
                </div>
                {/* Invoice Details */}
                <div>
                  <h4 className="review-header">Invoice Details</h4>
                  <div className="review-content">
                    <p><strong>Number:</strong> {invoiceData.invoiceNumber}</p>
                    <p><strong>Created:</strong> {invoiceData.dateCreated ? format(new Date(invoiceData.dateCreated), 'MMM d, yyyy') : 'N/A'}</p>
                    <p><strong>Due:</strong> {invoiceData.dateDue ? format(new Date(invoiceData.dateDue), 'MMM d, yyyy') : 'N/A'}</p>
                  </div>
                </div>
                 {/* Patient Info */}
                 <div>
                  <h4 className="review-header">Patient Information</h4>
                  <div className="review-content">
                    <p><strong>Name:</strong> {selectedPatient?.first_name || ''} {selectedPatient?.last_name || ''}</p>
                    <p><strong>DOB:</strong> {selectedPatient?.dob ? format(new Date(selectedPatient.dob), 'MMM d, yyyy') : 'N/A'}</p>
                    <p><strong>MRN:</strong> {selectedPatient?.mrn || 'N/A'}</p>
                    <p><strong>Accession:</strong> {selectedPatient?.accessionNumber || 'N/A'}</p>
                    <p><strong>Sex:</strong> {selectedPatient?.sex || 'N/A'}</p>
                  </div>
                </div>
                {/* Summary */}
                <div>
                  <h4 className="review-header">Summary</h4>
                  <div className="review-content">
                    <p><strong>Items:</strong> {invoiceData.items?.length || 0}</p>
                    <p><strong>Subtotal:</strong> ${invoiceData.subtotal?.toFixed(2)}</p>
                    <p><strong>Total:</strong> ${invoiceData.total?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Notes Review */}
              {notes && (
                <div>
                  <h4 className="review-header">Notes</h4>
                  <div className="review-content p-3 bg-gray-50 rounded-md border border-gray-200">{notes}</div>
                </div>
              )}

              {/* Items Review Table */}
              <div>
                <h4 className="review-header">Invoice Items</h4>
                <div className="mt-2 overflow-x-auto border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOS</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Med. Nec.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(invoiceData.items || []).map((item) => (
                        <tr key={String(item.id)}>
                          <td className="px-3 py-2 text-sm">{item.cptCode}</td>
                          <td className="px-3 py-2 text-sm">{item.description}</td>
                          <td className="px-3 py-2 text-sm">{format(new Date(item.dateOfService), 'MM/dd/yy')}</td>
                          <td className="px-3 py-2 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-sm text-center">{item.medicalNecessityProvided ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button onClick={handlePrevStep} className="btn btn-secondary" disabled={currentStep === 1}>
            <ChevronLeft size={16} className="mr-1" /> Previous
          </button>
          {currentStep < 4 ? (
            <button onClick={handleNextStep} className="btn btn-primary">
              Next <ChevronRight size={16} className="ml-1" />
            </button>
          ) : (
             // Show Save/Send buttons again in review step footer for convenience
             <div className="flex items-center space-x-3">
                <button onClick={handleSaveDraft} className="btn btn-secondary" disabled={isMutating}>
                    <Save size={16} className="mr-2" /> Save Draft
                </button>
                <button onClick={handleCreateAndSend} className="btn btn-primary" disabled={isMutating}>
                    <Send size={16} className="mr-2" /> {editId ? 'Update & Send' : 'Create & Send'}
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice; // Ensure default export
