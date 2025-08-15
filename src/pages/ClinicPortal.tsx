import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  FileText,
  Download,
  AlertCircle,
  Check,
  X,
  DollarSign,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Building
} from 'lucide-react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { auditLogger } from '../utils/security/auditLogger';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (you'll need to add your publishable key)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

interface ClinicInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  balance: number;
  status: string;
  due_date: string;
  created_at: string;
  invoice_type: string;
  line_items?: InvoiceLineItem[];
}

interface InvoiceLineItem {
  id: string;
  patient_name: string;
  accession_number: string;
  cpt_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_disputed: boolean;
  dispute_reason?: string;
  payment_status: 'pending' | 'partial' | 'paid' | 'disputed';
}

interface PaymentSelection {
  invoice_id: string;
  line_items: {
    id: string;
    amount: number;
    dispute: boolean;
    dispute_reason?: string;
  }[];
}

const ClinicPortal: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [invoices, setInvoices] = useState<ClinicInvoice[]>([]);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [paymentSelections, setPaymentSelections] = useState<Map<string, PaymentSelection>>(new Map());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total_outstanding: 0,
    invoices_count: 0,
    disputed_amount: 0,
    paid_this_month: 0
  });

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [user]);

  const fetchInvoices = async () => {
    if (!user?.clinic_id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_line_items(
            id,
            patient_first_name,
            patient_last_name,
            accession_number,
            cpt_code,
            description,
            quantity,
            unit_price,
            total_price,
            is_disputed,
            dispute_reason,
            payment_status
          )
        `)
        .eq('clinic_id', user.clinic_id)
        .in('status', ['sent', 'partial_payment', 'on_hold', 'disputed'])
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedInvoices = data?.map(invoice => ({
        ...invoice,
        line_items: invoice.invoice_line_items?.map((item: any) => ({
          ...item,
          patient_name: `${item.patient_first_name} ${item.patient_last_name}`
        })) || []
      })) || [];

      setInvoices(formattedInvoices);
      
      // Calculate total balance
      const total = formattedInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
      setTotalBalance(total);

      // Log access
      await auditLogger.log({
        action: 'view',
        resource_type: 'invoice',
        description: 'Clinic viewed invoices in portal'
      });

    } catch (error) {
      console.error('Error fetching invoices:', error);
      addNotification('error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?.clinic_id) return;

    try {
      const { data, error } = await supabase.rpc('get_clinic_stats', {
        p_clinic_id: user.clinic_id
      });

      if (error) throw error;
      if (data) setStats(data);

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleInvoice = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
      
      // Initialize payment selection for this invoice if not exists
      if (!paymentSelections.has(invoiceId)) {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice) {
          setPaymentSelections(prev => {
            const newMap = new Map(prev);
            newMap.set(invoiceId, {
              invoice_id: invoiceId,
              line_items: invoice.line_items?.map(item => ({
                id: item.id,
                amount: item.total_price,
                dispute: false
              })) || []
            });
            return newMap;
          });
        }
      }
    }
    setExpandedInvoices(newExpanded);
  };

  const handleLineItemPayment = (invoiceId: string, lineItemId: string, amount: number) => {
    setPaymentSelections(prev => {
      const newMap = new Map(prev);
      const selection = newMap.get(invoiceId);
      if (selection) {
        const lineItem = selection.line_items.find(li => li.id === lineItemId);
        if (lineItem) {
          lineItem.amount = amount;
          lineItem.dispute = false;
        }
      }
      return newMap;
    });
  };

  const handleLineItemDispute = (invoiceId: string, lineItemId: string, reason: string) => {
    setPaymentSelections(prev => {
      const newMap = new Map(prev);
      const selection = newMap.get(invoiceId);
      if (selection) {
        const lineItem = selection.line_items.find(li => li.id === lineItemId);
        if (lineItem) {
          lineItem.dispute = true;
          lineItem.dispute_reason = reason;
          lineItem.amount = 0; // Remove from payment when disputed
        }
      }
      return newMap;
    });

    addNotification('info', 'Line item marked for dispute');
  };

  const calculatePaymentTotal = (): number => {
    let total = 0;
    paymentSelections.forEach(selection => {
      selection.line_items.forEach(item => {
        if (!item.dispute) {
          total += item.amount;
        }
      });
    });
    return total;
  };

  const handlePayAllBalances = async () => {
    // Select all non-disputed line items from all invoices
    const newSelections = new Map<string, PaymentSelection>();
    
    invoices.forEach(invoice => {
      newSelections.set(invoice.id, {
        invoice_id: invoice.id,
        line_items: invoice.line_items?.map(item => ({
          id: item.id,
          amount: item.is_disputed ? 0 : item.total_price,
          dispute: item.is_disputed || false,
          dispute_reason: item.dispute_reason
        })) || []
      });
    });

    setPaymentSelections(newSelections);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!user?.clinic_id) return;

    try {
      setProcessingPayment(true);

      const paymentAmount = calculatePaymentTotal();
      if (paymentAmount <= 0) {
        addNotification('error', 'No payment amount selected');
        return;
      }

      // Create payment intent
      const { data: paymentIntent, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: paymentAmount,
          clinic_id: user.clinic_id,
          payment_method: paymentMethod
        }
      });

      if (intentError) throw intentError;

      // Process with Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not initialized');

      // Here you would integrate with Stripe Elements or redirect to Stripe Checkout
      // For now, we'll simulate a successful payment
      
      // Record payment and disputes
      const paymentData = {
        clinic_id: user.clinic_id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        status: 'completed',
        allocations: Array.from(paymentSelections.values())
      };

      const { error: paymentError } = await supabase.functions.invoke('process-clinic-payment', {
        body: paymentData
      });

      if (paymentError) throw paymentError;

      // Log payment
      await auditLogger.log({
        action: 'payment_post',
        resource_type: 'payment',
        description: `Clinic posted payment of $${paymentAmount}`,
        metadata: paymentData
      });

      addNotification('success', `Payment of $${paymentAmount.toFixed(2)} processed successfully`);
      setShowPaymentModal(false);
      setPaymentSelections(new Map());
      fetchInvoices();
      fetchStats();

    } catch (error) {
      console.error('Error processing payment:', error);
      addNotification('error', 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const downloadInvoicePDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      // Generate PDF
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoiceId }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Log download
      await auditLogger.log({
        action: 'download',
        resource_type: 'invoice',
        resource_id: invoiceId,
        description: `Downloaded invoice PDF: ${invoiceNumber}`
      });

    } catch (error) {
      console.error('Error downloading PDF:', error);
      addNotification('error', 'Failed to download invoice PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-800',
      partial_payment: 'bg-yellow-100 text-yellow-800',
      disputed: 'bg-red-100 text-red-800',
      on_hold: 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading clinic portal...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clinic Portal</h1>
            <p className="text-gray-600 mt-2">Manage invoices and payments</p>
          </div>
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-gray-400" />
            <span className="text-gray-700">{user?.clinic_name}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_outstanding)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.invoices_count}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disputed Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.disputed_amount)}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid This Month</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paid_this_month)}</p>
            </div>
            <Check className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Pay All Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handlePayAllBalances}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <CreditCard className="h-5 w-5" />
          <span>Pay All Balances ({formatCurrency(totalBalance)})</span>
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Outstanding Invoices</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {invoices.map(invoice => (
            <div key={invoice.id}>
              {/* Invoice Header */}
              <div
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleInvoice(invoice.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button className="p-1">
                      {expandedInvoices.has(invoice.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-3">
                        <p className="font-medium text-gray-900">#{invoice.invoice_number}</p>
                        {getStatusBadge(invoice.status)}
                        <span className="text-sm text-gray-500">{invoice.invoice_type}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                        <span>{invoice.line_items?.length || 0} items</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(invoice.balance)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadInvoicePDF(invoice.id, invoice.invoice_number);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Download PDF"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {expandedInvoices.has(invoice.id) && invoice.line_items && (
                <div className="bg-gray-50 px-6 py-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs font-medium text-gray-500 uppercase">
                        <th className="text-left pb-2">Patient</th>
                        <th className="text-left pb-2">Accession</th>
                        <th className="text-left pb-2">CPT/Description</th>
                        <th className="text-center pb-2">Qty</th>
                        <th className="text-right pb-2">Amount</th>
                        <th className="text-center pb-2">Pay</th>
                        <th className="text-center pb-2">Dispute</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.line_items.map(item => {
                        const selection = paymentSelections.get(invoice.id)?.line_items.find(li => li.id === item.id);
                        
                        return (
                          <tr key={item.id} className={item.is_disputed ? 'bg-red-50' : ''}>
                            <td className="py-2 text-sm">{item.patient_name}</td>
                            <td className="py-2 text-sm text-gray-600">{item.accession_number}</td>
                            <td className="py-2 text-sm">
                              <div>
                                <p className="font-medium">{item.cpt_code}</p>
                                <p className="text-xs text-gray-500">{item.description}</p>
                              </div>
                            </td>
                            <td className="py-2 text-sm text-center">{item.quantity}</td>
                            <td className="py-2 text-sm text-right font-medium">
                              {formatCurrency(item.total_price)}
                            </td>
                            <td className="py-2 text-center">
                              {!item.is_disputed && (
                                <input
                                  type="checkbox"
                                  checked={selection?.amount === item.total_price && !selection?.dispute}
                                  onChange={(e) => {
                                    handleLineItemPayment(
                                      invoice.id,
                                      item.id,
                                      e.target.checked ? item.total_price : 0
                                    );
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                              )}
                            </td>
                            <td className="py-2 text-center">
                              {item.is_disputed ? (
                                <span className="text-xs text-red-600">Disputed</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    const reason = prompt('Please provide a reason for disputing this item:');
                                    if (reason) {
                                      handleLineItemDispute(invoice.id, item.id, reason);
                                    }
                                  }}
                                  className="text-sm text-red-600 hover:text-red-700"
                                >
                                  Dispute
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Payment Summary for this Invoice */}
                  {paymentSelections.has(invoice.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Selected for Payment:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            paymentSelections.get(invoice.id)?.line_items
                              .filter(li => !li.dispute)
                              .reduce((sum, li) => sum + li.amount, 0) || 0
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {invoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No outstanding invoices</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Process Payment</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Payment Amount: <strong>{formatCurrency(calculatePaymentTotal())}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This payment will be applied to selected line items
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-sm font-medium">Credit Card</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('ach')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'ach'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Building className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-sm font-medium">ACH Transfer</p>
                  </button>
                </div>
              </div>

              {/* Stripe Elements or payment form would go here */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Stripe payment form will be integrated here
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment || calculatePaymentTotal() <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processingPayment ? 'Processing...' : `Pay ${formatCurrency(calculatePaymentTotal())}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicPortal;