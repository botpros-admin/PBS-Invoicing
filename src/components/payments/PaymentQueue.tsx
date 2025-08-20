/**
 * Payment Queue Component
 * 
 * Displays Ashley's payment queue showing:
 * - Unposted payments needing allocation
 * - Posted payments for reference
 * - On-hold payments for review
 * - Quick actions for payment management
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  XCircle,
  PauseCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../api/supabase';
import { useTenant } from '../../context/TenantContext';

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  status: 'unposted' | 'posted' | 'on_hold' | 'reversed' | 'cancelled';
  allocated_amount: number;
  unallocated_amount: number;
  client_name?: string;
  client_code?: string;
  notes?: string;
  created_at: string;
  queue_status: 'needs_allocation' | 'ready_to_post' | 'completed' | string;
}

interface PaymentQueueProps {
  onSelectPayment?: (payment: Payment) => void;
  onAllocatePayment?: (payment: Payment) => void;
  filterStatus?: string;
}

export const PaymentQueue: React.FC<PaymentQueueProps> = ({ 
  onSelectPayment,
  onAllocatePayment,
  filterStatus 
}) => {
  const { currentOrganization } = useTenant();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterStatus || 'all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Load payments on mount and when organization changes
  useEffect(() => {
    if (currentOrganization) {
      loadPayments();
    }
  }, [currentOrganization]);

  // Apply filters when search or status filter changes
  useEffect(() => {
    applyFilters();
  }, [payments, searchTerm, statusFilter]);

  const loadPayments = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_queue')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.payment_number.toLowerCase().includes(search) ||
        p.client_name?.toLowerCase().includes(search) ||
        p.reference_number?.toLowerCase().includes(search) ||
        p.notes?.toLowerCase().includes(search)
      );
    }

    setFilteredPayments(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unposted':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'posted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'on_hold':
        return <PauseCircle className="h-4 w-4 text-orange-600" />;
      case 'reversed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      'unposted': 'bg-yellow-100 text-yellow-800',
      'posted': 'bg-green-100 text-green-800',
      'on_hold': 'bg-orange-100 text-orange-800',
      'reversed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  const getQueueStatusBadge = (queueStatus: string) => {
    switch (queueStatus) {
      case 'needs_allocation':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
            Needs Allocation
          </span>
        );
      case 'ready_to_post':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Ready to Post
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'check':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'credit_card':
        return <CreditCard className="h-4 w-4 text-gray-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleSelectPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    if (onSelectPayment) {
      onSelectPayment(payment);
    }
  };

  // Calculate queue statistics
  const stats = {
    total: payments.length,
    unposted: payments.filter(p => p.status === 'unposted').length,
    needsAllocation: payments.filter(p => p.queue_status === 'needs_allocation').length,
    readyToPost: payments.filter(p => p.queue_status === 'ready_to_post').length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    unallocatedAmount: payments.filter(p => p.status === 'unposted').reduce((sum, p) => sum + p.unallocated_amount, 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Unposted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unposted}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Needs Allocation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.needsAllocation}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Ready to Post</p>
              <p className="text-2xl font-bold text-gray-900">{stats.readyToPost}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Unallocated</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.unallocatedAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="unposted">Unposted</option>
              <option value="posted">Posted</option>
              <option value="on_hold">On Hold</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Queue Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr 
                  key={payment.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectPayment(payment)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.payment_number}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="ml-1">
                          {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1).replace('_', ' ')}
                          {payment.reference_number && ` #${payment.reference_number}`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.client_name || 'Unknown'}
                    </div>
                    {payment.client_code && (
                      <div className="text-xs text-gray-500">
                        {payment.client_code}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">
                        Allocated: ${payment.allocated_amount.toFixed(2)}
                      </div>
                      {payment.unallocated_amount > 0 && (
                        <div className="text-sm text-orange-600 font-medium">
                          Unallocated: ${payment.unallocated_amount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getQueueStatusBadge(payment.queue_status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {payment.status === 'unposted' && payment.unallocated_amount > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAllocatePayment) {
                            onAllocatePayment(payment);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Allocate
                      </button>
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Record a payment to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};