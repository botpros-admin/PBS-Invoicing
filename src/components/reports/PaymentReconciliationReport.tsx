/**
 * Payment Reconciliation Report
 * 
 * CRITICAL REPORT #1 for Ashley
 * Shows which payments have been allocated to which invoices
 * Highlights unallocated amounts needing attention
 * Exportable to Excel for working document
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useTenant } from '../../context/TenantContext';
import { format } from 'date-fns';

interface PaymentReconciliation {
  payment_id: string;
  payment_number: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  client_name: string;
  allocated_amount: number;
  unallocated_amount: number;
  status: string;
  allocations: Array<{
    invoice_number: string;
    invoice_date: string;
    allocated_amount: number;
    allocation_date: string;
  }>;
}

export const PaymentReconciliationReport: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [reconciliations, setReconciliations] = useState<PaymentReconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'unallocated' | 'partial' | 'complete'>('all');
  
  useEffect(() => {
    if (currentOrganization) {
      loadReconciliationData();
    }
  }, [currentOrganization, dateRange, filterStatus]);
  
  const loadReconciliationData = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      // Get payments with their allocations
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          client:clients!fk_invoices_client(name),
          allocations:payment_allocations(
            allocated_amount,
            created_at,
            invoice:invoices(
              invoice_number,
              invoice_date
            )
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .gte('payment_date', dateRange.start)
        .lte('payment_date', dateRange.end)
        .order('payment_date', { ascending: false });
      
      if (paymentError) throw paymentError;
      
      // Transform data for the report
      const reconciled = (payments || []).map(payment => ({
        payment_id: payment.id,
        payment_number: payment.payment_number,
        payment_date: payment.payment_date,
        payment_amount: payment.amount,
        payment_method: payment.payment_method,
        client_name: payment.client?.name || 'Unknown',
        allocated_amount: payment.allocated_amount || 0,
        unallocated_amount: payment.amount - (payment.allocated_amount || 0),
        status: payment.status,
        allocations: (payment.allocations || []).map((alloc: any) => ({
          invoice_number: alloc.invoice?.invoice_number || 'Unknown',
          invoice_date: alloc.invoice?.invoice_date || '',
          allocated_amount: alloc.allocated_amount,
          allocation_date: alloc.created_at
        }))
      }));
      
      // Apply status filter
      let filtered = reconciled;
      if (filterStatus === 'unallocated') {
        filtered = reconciled.filter(r => r.unallocated_amount === r.payment_amount);
      } else if (filterStatus === 'partial') {
        filtered = reconciled.filter(r => r.unallocated_amount > 0 && r.unallocated_amount < r.payment_amount);
      } else if (filterStatus === 'complete') {
        filtered = reconciled.filter(r => r.unallocated_amount === 0);
      }
      
      setReconciliations(filtered);
    } catch (error) {
      console.error('Error loading reconciliation data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToCSV = () => {
    const headers = [
      'Payment Number',
      'Payment Date',
      'Client',
      'Payment Method',
      'Payment Amount',
      'Allocated Amount',
      'Unallocated Amount',
      'Status',
      'Invoice Number',
      'Invoice Date',
      'Allocation Amount',
      'Allocation Date'
    ];
    
    const rows: string[][] = [];
    
    reconciliations.forEach(payment => {
      if (payment.allocations.length === 0) {
        // Payment with no allocations
        rows.push([
          payment.payment_number,
          format(new Date(payment.payment_date), 'MM/dd/yyyy'),
          payment.client_name,
          payment.payment_method,
          payment.payment_amount.toFixed(2),
          payment.allocated_amount.toFixed(2),
          payment.unallocated_amount.toFixed(2),
          payment.status,
          'UNALLOCATED',
          '',
          '',
          ''
        ]);
      } else {
        // Payment with allocations
        payment.allocations.forEach((allocation, index) => {
          rows.push([
            index === 0 ? payment.payment_number : '',
            index === 0 ? format(new Date(payment.payment_date), 'MM/dd/yyyy') : '',
            index === 0 ? payment.client_name : '',
            index === 0 ? payment.payment_method : '',
            index === 0 ? payment.payment_amount.toFixed(2) : '',
            index === 0 ? payment.allocated_amount.toFixed(2) : '',
            index === 0 ? payment.unallocated_amount.toFixed(2) : '',
            index === 0 ? payment.status : '',
            allocation.invoice_number,
            allocation.invoice_date ? format(new Date(allocation.invoice_date), 'MM/dd/yyyy') : '',
            allocation.allocated_amount.toFixed(2),
            format(new Date(allocation.allocation_date), 'MM/dd/yyyy')
          ]);
        });
      }
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-reconciliation-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Calculate totals
  const totals = reconciliations.reduce((acc, payment) => ({
    paymentAmount: acc.paymentAmount + payment.payment_amount,
    allocatedAmount: acc.allocatedAmount + payment.allocated_amount,
    unallocatedAmount: acc.unallocatedAmount + payment.unallocated_amount,
    count: acc.count + 1
  }), { paymentAmount: 0, allocatedAmount: 0, unallocatedAmount: 0, count: 0 });
  
  if (isLoading) {
    return <div className="text-center py-8">Loading reconciliation data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Reconciliation Report</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track payment allocations and identify unallocated amounts
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Payments</option>
              <option value="unallocated">Completely Unallocated</option>
              <option value="partial">Partially Allocated</option>
              <option value="complete">Fully Allocated</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold">${totals.paymentAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{totals.count} payments</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Allocated</p>
              <p className="text-2xl font-bold">${totals.allocatedAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {totals.paymentAmount > 0 ? ((totals.allocatedAmount / totals.paymentAmount) * 100).toFixed(1) : 0}% allocated
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Unallocated</p>
              <p className="text-2xl font-bold text-yellow-600">${totals.unallocatedAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Needs attention</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Avg Payment</p>
              <p className="text-2xl font-bold">
                ${totals.count > 0 ? (totals.paymentAmount / totals.count).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-gray-500">Per transaction</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed Report Table */}
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocations
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unallocated
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reconciliations.map(payment => (
                <tr key={payment.payment_id} className={payment.unallocated_amount > 0 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.payment_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {payment.payment_method}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payment.client_name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    ${payment.payment_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {payment.allocations.length === 0 ? (
                      <span className="text-sm text-gray-500 italic">No allocations</span>
                    ) : (
                      <div className="space-y-1">
                        {payment.allocations.map((alloc, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{alloc.invoice_number}</span>
                            <span className="text-gray-500"> - ${alloc.allocated_amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    {payment.unallocated_amount > 0 ? (
                      <span className="text-yellow-600">
                        ${payment.unallocated_amount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-green-600">$0.00</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {payment.unallocated_amount === payment.payment_amount ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unallocated
                      </span>
                    ) : payment.unallocated_amount > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {reconciliations.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No payments found for selected criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};