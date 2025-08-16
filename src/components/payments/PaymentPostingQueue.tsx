import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight,
  FileText,
  AlertCircle,
  Printer,
  Edit,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  lines: InvoiceLine[];
}

interface InvoiceLine {
  id: string;
  accession_number: string;
  cpt_code: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_dob: string;
  amount: number;
  paid_amount: number;
  disputed: boolean;
  balance: number;
}

interface Payment {
  id?: string;
  clinic_id: string;
  clinic_name: string;
  payment_date: string;
  payment_method: 'Check' | 'ACH' | 'Card' | 'Cash' | 'Credit';
  check_number?: string;
  amount: number;
  applied_amount: number;
  unapplied_amount: number;
  status: 'unapplied' | 'applied' | 'on_hold';
}

const PaymentPostingQueue: React.FC = () => {
  const { addNotification } = useNotifications();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [disputes, setDisputes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // New payment form
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    payment_method: 'Check',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients!fk_invoices_client(name)')
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const formattedPayments = data?.map(p => ({
        ...p,
        clinic_name: p.clients?.name || 'Unknown'
      })) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      addNotification('error', 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesForClinic = async (clinicId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items!fk_invoice_items_invoice(*)
        `)
        .eq('client_id', clinicId)
        .eq('is_paid', false)
        .order('invoice_date', { ascending: true });

      if (error) throw error;

      const formattedInvoices = data?.map(inv => ({
        ...inv,
        lines: inv.invoice_items || [],
        balance: inv.total_amount - inv.paid_amount
      })) || [];

      setInvoices(formattedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      addNotification('error', 'Failed to load invoices');
    }
  };

  const handleSelectPayment = async (payment: Payment) => {
    setSelectedPayment(payment);
    setAllocations({});
    setDisputes({});
    await fetchInvoicesForClinic(payment.clinic_id);
  };

  const toggleInvoiceExpand = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const handleAllocationChange = (lineId: string, amount: number) => {
    setAllocations(prev => ({
      ...prev,
      [lineId]: amount
    }));
  };

  const handleDispute = (lineId: string, reason: string) => {
    setDisputes(prev => ({
      ...prev,
      [lineId]: reason
    }));
  };

  const calculateTotalAllocated = () => {
    return Object.values(allocations).reduce((sum, amount) => sum + (amount || 0), 0);
  };

  const canSavePayment = () => {
    if (!selectedPayment) return false;
    const totalAllocated = calculateTotalAllocated();
    return Math.abs(totalAllocated - selectedPayment.amount) < 0.01; // Allow for rounding
  };

  const handleSavePayment = async () => {
    if (!canSavePayment() || !selectedPayment) return;

    try {
      // Save payment allocations
      const allocationData = Object.entries(allocations).map(([lineId, amount]) => ({
        payment_id: selectedPayment.id,
        invoice_line_id: lineId,
        amount: amount
      }));

      const { error: allocError } = await supabase
        .from('payment_allocations')
        .insert(allocationData);

      if (allocError) throw allocError;

      // Save disputes if any
      const disputeData = Object.entries(disputes).map(([lineId, reason]) => ({
        invoice_line_id: lineId,
        clinic_id: selectedPayment.clinic_id,
        reason: reason,
        status: 'open',
        disputed_amount: allocations[lineId] || 0
      }));

      if (disputeData.length > 0) {
        const { error: disputeError } = await supabase
          .from('disputes')
          .insert(disputeData);

        if (disputeError) throw disputeError;
      }

      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'applied',
          applied_amount: calculateTotalAllocated(),
          unapplied_amount: 0
        })
        .eq('id', selectedPayment.id);

      if (updateError) throw updateError;

      addNotification('success', 'Payment posted successfully');
      setSelectedPayment(null);
      setAllocations({});
      setDisputes({});
      fetchPayments();
    } catch (error) {
      console.error('Error saving payment:', error);
      addNotification('error', 'Failed to save payment');
    }
  };

  const handleCreatePayment = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...newPayment,
          applied_amount: 0,
          unapplied_amount: newPayment.amount,
          status: 'unapplied'
        }])
        .select()
        .single();

      if (error) throw error;

      addNotification('success', 'Payment created successfully');
      setShowCreatePayment(false);
      setNewPayment({
        payment_method: 'Check',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0
      });
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      addNotification('error', 'Failed to create payment');
    }
  };

  const handlePrintReceipt = (paymentId: string) => {
    // Generate and print receipt
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Payment Posting Queue</h2>
          <button
            onClick={() => setShowCreatePayment(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <DollarSign className="h-5 w-5" />
            <span>Create Payment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Payment List */}
        <div className="col-span-4 bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payments</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {payments.map((payment) => (
              <div
                key={payment.id}
                onClick={() => handleSelectPayment(payment)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  selectedPayment?.id === payment.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.payment_method} #{payment.check_number || payment.id?.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500">{payment.clinic_name}</p>
                    <p className="text-xs text-gray-500">{payment.payment_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'applied' ? 'bg-green-100 text-green-800' :
                      payment.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Allocation */}
        <div className="col-span-8 bg-white rounded-lg shadow">
          {selectedPayment ? (
            <>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Apply Payment: ${selectedPayment.amount.toFixed(2)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedPayment.clinic_name} - {selectedPayment.payment_method} 
                      {selectedPayment.check_number && ` #${selectedPayment.check_number}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {editMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handlePrintReceipt(selectedPayment.id!)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="mb-4 border border-gray-200 rounded-lg">
                    <div
                      onClick={() => toggleInvoiceExpand(invoice.id)}
                      className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        {expandedInvoices.has(invoice.id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                        <div>
                          <p className="text-sm font-medium">Invoice #{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">
                            Balance: ${invoice.balance.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {expandedInvoices.has(invoice.id) && (
                      <div className="px-4 py-3 space-y-2">
                        {invoice.lines.map((line) => (
                          <div key={line.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                {line.patient_first_name} {line.patient_last_name} - {line.cpt_code}
                              </p>
                              <p className="text-xs text-gray-500">
                                Accession: {line.accession_number} | Balance: ${line.balance.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.01"
                                max={line.balance}
                                value={allocations[line.id] || ''}
                                onChange={(e) => handleAllocationChange(line.id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="0.00"
                              />
                              <button
                                onClick={() => {
                                  const reason = prompt('Dispute reason:');
                                  if (reason) handleDispute(line.id, reason);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Balance Summary */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-medium">${selectedPayment.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Applied Amount:</span>
                    <span className="font-medium">${calculateTotalAllocated().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-medium ${
                      Math.abs(selectedPayment.amount - calculateTotalAllocated()) < 0.01 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      ${(selectedPayment.amount - calculateTotalAllocated()).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedPayment(null);
                      setAllocations({});
                      setDisputes({});
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePayment}
                    disabled={!canSavePayment()}
                    className={`px-4 py-2 text-white rounded-lg ${
                      canSavePayment() 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Save Payment
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a payment to begin allocation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Payment Modal */}
      {showCreatePayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Create New Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic
                </label>
                <select
                  value={newPayment.clinic_id || ''}
                  onChange={(e) => setNewPayment({ ...newPayment, clinic_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Clinic</option>
                  {/* Fetch and map clinics here */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Check">Check</option>
                  <option value="ACH">ACH</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Account Credit</option>
                </select>
              </div>

              {newPayment.payment_method === 'Check' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={newPayment.check_number || ''}
                    onChange={(e) => setNewPayment({ ...newPayment, check_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPayment.amount || ''}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCreatePayment(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPostingQueue;