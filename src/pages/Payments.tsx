import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  Printer,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  CreditCard,
  Building,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '../api/supabase';
import Modal from '../components/Modal';
import { useNotifications } from '../context/NotificationContext';
import { format } from 'date-fns';

interface Payment {
  id: string;
  payment_number: string;
  client_id: string;
  client_name?: string;
  amount: number;
  applied_amount: number;
  unapplied_amount: number;
  method: 'check' | 'ach' | 'card' | 'cash' | 'credit';
  check_number?: string;
  reference_number?: string;
  date_received: string;
  status: 'unposted' | 'posted' | 'on_hold' | 'deleted';
  type: 'manual' | 'portal' | 'credit';
  notes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  organization_id: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  balance: number;
  status: string;
  date: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  total: number;
  status: 'pending' | 'paid' | 'disputed';
  dispute_reason?: string;
}

interface PaymentApplication {
  invoice_id: string;
  amount: number;
  items?: {
    item_id: string;
    amount: number;
    dispute?: boolean;
    dispute_reason?: string;
  }[];
}

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { addNotification } = useNotifications();
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state for new payment
  const [formData, setFormData] = useState<Partial<Payment>>({
    payment_number: '',
    client_id: '',
    amount: 0,
    method: 'check',
    check_number: '',
    date_received: new Date().toISOString().split('T')[0],
    status: 'unposted',
    type: 'manual',
    notes: ''
  });

  // Application state
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Map<string, PaymentApplication>>(new Map());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [totalApplied, setTotalApplied] = useState(0);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    fetchPayments();
    fetchClients();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, statusFilter, typeFilter, payments]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      
      // For now, we'll create mock payments data
      const mockPayments: Payment[] = [
        {
          id: '1',
          payment_number: 'PAY-2024-001',
          client_id: 'client-1',
          client_name: 'Echo Labs',
          amount: 25000,
          applied_amount: 25000,
          unapplied_amount: 0,
          method: 'ach',
          reference_number: 'ACH-4521',
          date_received: '2024-01-15',
          status: 'posted',
          type: 'manual',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          organization_id: 'org-1'
        },
        {
          id: '2',
          payment_number: 'PAY-2024-002',
          client_id: 'client-2',
          client_name: 'Maxwell Health',
          amount: 5000,
          applied_amount: 4500,
          unapplied_amount: 500,
          method: 'check',
          check_number: '1234',
          date_received: '2024-01-16',
          status: 'unposted',
          type: 'manual',
          notes: 'Partial payment - dispute on John Doe UTI',
          created_at: '2024-01-16T09:00:00Z',
          updated_at: '2024-01-16T09:00:00Z',
          organization_id: 'org-1'
        },
        {
          id: '3',
          payment_number: 'PAY-2024-003',
          client_id: 'client-3',
          client_name: 'First Care Management',
          amount: 15000,
          applied_amount: 15000,
          unapplied_amount: 0,
          method: 'card',
          date_received: '2024-01-16',
          status: 'posted',
          type: 'portal',
          created_at: '2024-01-16T14:00:00Z',
          updated_at: '2024-01-16T14:00:00Z',
          organization_id: 'org-1'
        }
      ];
      
      setPayments(mockPayments);
      setFilteredPayments(mockPayments);
      
    } catch (error) {
      console.error('Error fetching payments:', error);
      addNotification({
        type: 'error',
        message: 'Failed to fetch payments'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchInvoicesForClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['sent', 'overdue'])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Transform to our Invoice interface
      const invoices: Invoice[] = (data || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        client_id: inv.client_id,
        amount: inv.amount || 0,
        balance: inv.amount || 0, // In real app, calculate actual balance
        status: inv.status,
        date: inv.date,
        items: [] // Would fetch items separately
      }));
      
      setAvailableInvoices(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.check_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.type === typeFilter);
    }
    
    setFilteredPayments(filtered);
  };

  const handleCreatePayment = () => {
    setFormData({
      payment_number: `PAY-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`,
      client_id: '',
      amount: 0,
      method: 'check',
      check_number: '',
      date_received: new Date().toISOString().split('T')[0],
      status: 'unposted',
      type: 'manual',
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleSavePayment = async () => {
    try {
      if (!formData.client_id || !formData.amount) {
        addNotification({
          type: 'error',
          message: 'Please fill in all required fields'
        });
        return;
      }
      
      const newPayment: Payment = {
        ...formData as Payment,
        id: String(payments.length + 1),
        applied_amount: 0,
        unapplied_amount: formData.amount || 0,
        client_name: clients.find(c => c.id === formData.client_id)?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: 'org-1'
      };
      
      setPayments([...payments, newPayment]);
      setShowCreateModal(false);
      
      addNotification({
        type: 'success',
        message: 'Payment created successfully'
      });
      
      // Automatically open application modal for new payment
      setSelectedPayment(newPayment);
      if (formData.client_id) {
        await fetchInvoicesForClient(formData.client_id);
      }
      setShowApplicationModal(true);
      
    } catch (error) {
      console.error('Error creating payment:', error);
      addNotification({
        type: 'error',
        message: 'Failed to create payment'
      });
    }
  };

  const handleApplyPayment = async (payment: Payment) => {
    setSelectedPayment(payment);
    if (payment.client_id) {
      await fetchInvoicesForClient(payment.client_id);
    }
    setSelectedInvoices(new Map());
    setTotalApplied(0);
    setShowApplicationModal(true);
  };

  const toggleInvoiceSelection = (invoice: Invoice) => {
    const newSelections = new Map(selectedInvoices);
    
    if (newSelections.has(invoice.id)) {
      newSelections.delete(invoice.id);
    } else {
      newSelections.set(invoice.id, {
        invoice_id: invoice.id,
        amount: Math.min(invoice.balance, (selectedPayment?.unapplied_amount || 0) - totalApplied)
      });
    }
    
    setSelectedInvoices(newSelections);
    calculateTotalApplied(newSelections);
  };

  const updateInvoiceAmount = (invoiceId: string, amount: number) => {
    const newSelections = new Map(selectedInvoices);
    const application = newSelections.get(invoiceId);
    
    if (application) {
      application.amount = amount;
      newSelections.set(invoiceId, application);
      setSelectedInvoices(newSelections);
      calculateTotalApplied(newSelections);
    }
  };

  const calculateTotalApplied = (selections: Map<string, PaymentApplication>) => {
    let total = 0;
    selections.forEach(app => {
      total += app.amount;
    });
    setTotalApplied(total);
  };

  const handleSaveApplication = () => {
    if (!selectedPayment) return;
    
    const remaining = selectedPayment.amount - totalApplied;
    
    if (remaining !== 0) {
      addNotification({
        type: 'error',
        message: `Payment not balanced. Unapplied amount: $${remaining.toFixed(2)}`
      });
      return;
    }
    
    // Update payment status
    const updatedPayments = payments.map(p => {
      if (p.id === selectedPayment.id) {
        return {
          ...p,
          applied_amount: totalApplied,
          unapplied_amount: 0,
          status: 'posted' as const,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    setPayments(updatedPayments);
    setShowApplicationModal(false);
    
    addNotification({
      type: 'success',
      message: 'Payment applied successfully'
    });
  };

  const handleCreateCredit = () => {
    if (!selectedPayment) return;
    
    const remaining = selectedPayment.amount - totalApplied;
    
    if (remaining <= 0) {
      addNotification({
        type: 'error',
        message: 'No unapplied amount to create credit'
      });
      return;
    }
    
    // Create account credit
    const creditPayment: Payment = {
      id: String(payments.length + 1),
      payment_number: `CREDIT-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`,
      client_id: selectedPayment.client_id,
      client_name: selectedPayment.client_name,
      amount: remaining,
      applied_amount: 0,
      unapplied_amount: remaining,
      method: 'credit',
      date_received: new Date().toISOString().split('T')[0],
      status: 'unposted',
      type: 'credit',
      notes: `Credit from payment ${selectedPayment.payment_number}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: 'org-1'
    };
    
    // Update original payment
    const updatedPayments = payments.map(p => {
      if (p.id === selectedPayment.id) {
        return {
          ...p,
          applied_amount: totalApplied,
          unapplied_amount: 0,
          status: 'posted' as const,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    setPayments([...updatedPayments, creditPayment]);
    setShowApplicationModal(false);
    
    addNotification({
      type: 'success',
      message: `Account credit of $${remaining.toFixed(2)} created`
    });
  };

  const handlePrintReceipt = (payment: Payment) => {
    // In real app, generate PDF receipt
    window.print();
    addNotification({
      type: 'success',
      message: 'Receipt sent to printer'
    });
  };

  const handleDeletePayment = (payment: Payment) => {
    if (!confirm(`Are you sure you want to delete payment ${payment.payment_number}?`)) {
      return;
    }
    
    const updatedPayments = payments.map(p => {
      if (p.id === payment.id) {
        return { ...p, status: 'deleted' as const };
      }
      return p;
    });
    
    setPayments(updatedPayments);
    
    addNotification({
      type: 'success',
      message: 'Payment deleted'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      posted: 'bg-green-100 text-green-800',
      unposted: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-red-100 text-red-800',
      deleted: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status as keyof typeof statusStyles] || statusStyles.unposted}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'check': return <FileText className="h-4 w-4" />;
      case 'ach': return <Building className="h-4 w-4" />;
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'credit': return <DollarSign className="h-4 w-4 text-green-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Queue</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and reconcile payments
          </p>
        </div>
        <button
          onClick={handleCreatePayment}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unposted</p>
              <p className="text-2xl font-bold text-yellow-600">
                {payments.filter(p => p.status === 'unposted').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Posted Today</p>
              <p className="text-2xl font-bold text-green-600">
                {payments.filter(p => p.status === 'posted' && p.updated_at.startsWith(new Date().toISOString().split('T')[0])).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On Hold</p>
              <p className="text-2xl font-bold text-red-600">
                {payments.filter(p => p.status === 'on_hold').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Unposted</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(payments.filter(p => p.status === 'unposted').reduce((sum, p) => sum + p.unapplied_amount, 0))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="unposted">Unposted</option>
            <option value="posted">Posted</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="manual">Manual</option>
            <option value="portal">Portal</option>
            <option value="credit">Credit</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getMethodIcon(payment.method)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {payment.payment_number}
                    </span>
                  </div>
                  {payment.check_number && (
                    <div className="text-xs text-gray-500">Check #{payment.check_number}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{payment.client_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {format(new Date(payment.date_received), 'MMM dd, yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {payment.unapplied_amount > 0 ? (
                      <span className="text-yellow-600 font-medium">
                        {formatCurrency(payment.unapplied_amount)}
                      </span>
                    ) : (
                      <span className="text-green-600">$0.00</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs text-gray-600 uppercase">
                    {payment.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(payment.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {payment.status === 'unposted' && (
                      <button
                        onClick={() => handleApplyPayment(payment)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Apply Payment"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintReceipt(payment)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Print Receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {payment.status === 'unposted' && (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setFormData(payment);
                          setIsEditing(true);
                          setShowCreateModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePayment(payment)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Payment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setIsEditing(false);
        }}
        title={isEditing ? 'Edit Payment' : 'Create Payment'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Number</label>
            <input
              type="text"
              value={formData.payment_number}
              onChange={(e) => setFormData({ ...formData, payment_number: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              readOnly={!isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Client</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Method</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value as Payment['method'] })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="check">Check</option>
                <option value="ach">ACH</option>
                <option value="card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="credit">Account Credit</option>
              </select>
            </div>
          </div>
          
          {formData.method === 'check' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Check Number</label>
              <input
                type="text"
                value={formData.check_number}
                onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Received</label>
            <input
              type="date"
              value={formData.date_received}
              onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePayment}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {isEditing ? 'Update' : 'Save & Apply'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Application Modal */}
      <Modal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        title={`Apply Payment: ${selectedPayment?.payment_number}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Payment Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-medium">{selectedPayment?.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Amount</p>
                <p className="font-medium">{formatCurrency(selectedPayment?.amount || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Method</p>
                <p className="font-medium uppercase">{selectedPayment?.method}</p>
              </div>
            </div>
          </div>

          {/* Available Invoices */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Select Invoices to Apply</h3>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {availableInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No open invoices found</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Select
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoice #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Balance
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Apply Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableInvoices.map((invoice) => (
                      <React.Fragment key={invoice.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.has(invoice.id)}
                              onChange={() => toggleInvoiceSelection(invoice)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center">
                              <button
                                onClick={() => {
                                  const expanded = new Set(expandedInvoices);
                                  if (expanded.has(invoice.id)) {
                                    expanded.delete(invoice.id);
                                  } else {
                                    expanded.add(invoice.id);
                                  }
                                  setExpandedInvoices(expanded);
                                }}
                                className="mr-2"
                              >
                                {expandedInvoices.has(invoice.id) ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                              </button>
                              <span className="text-sm font-medium">{invoice.invoice_number}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {format(new Date(invoice.date), 'MM/dd/yyyy')}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {formatCurrency(invoice.balance)}
                          </td>
                          <td className="px-4 py-2">
                            {selectedInvoices.has(invoice.id) && (
                              <input
                                type="number"
                                step="0.01"
                                value={selectedInvoices.get(invoice.id)?.amount || 0}
                                onChange={(e) => updateInvoiceAmount(invoice.id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              />
                            )}
                          </td>
                        </tr>
                        {expandedInvoices.has(invoice.id) && (
                          <tr>
                            <td colSpan={5} className="px-8 py-2 bg-gray-50">
                              <div className="text-xs text-gray-600">
                                Line items would appear here with individual dispute options
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Balance Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Payment Amount</p>
                <p className="text-xl font-bold">{formatCurrency(selectedPayment?.amount || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Applied</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalApplied)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unapplied</p>
                <p className={`text-xl font-bold ${(selectedPayment?.amount || 0) - totalApplied === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {formatCurrency((selectedPayment?.amount || 0) - totalApplied)}
                </p>
              </div>
            </div>
            
            {(selectedPayment?.amount || 0) - totalApplied !== 0 && (
              <div className="mt-2 text-sm text-red-600">
                Payment must be fully applied. Unapplied: {formatCurrency((selectedPayment?.amount || 0) - totalApplied)}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <div>
              {(selectedPayment?.amount || 0) - totalApplied > 0 && totalApplied > 0 && (
                <button
                  onClick={handleCreateCredit}
                  className="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50"
                >
                  Create Credit for Balance
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowApplicationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApplication}
                disabled={(selectedPayment?.amount || 0) - totalApplied !== 0}
                className={`px-4 py-2 rounded-md ${
                  (selectedPayment?.amount || 0) - totalApplied !== 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;