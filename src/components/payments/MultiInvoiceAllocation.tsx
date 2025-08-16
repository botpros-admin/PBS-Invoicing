/**
 * Multi-Invoice Allocation Component
 * 
 * Allows allocating a single payment across multiple invoices
 * Maintains penny-perfect accuracy
 * Simple table interface with amount inputs
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  status: string;
  invoice_date: string;
}

interface MultiInvoiceAllocationProps {
  paymentId: string;
  paymentAmount: number;
  clientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MultiInvoiceAllocation: React.FC<MultiInvoiceAllocationProps> = ({
  paymentId,
  paymentAmount,
  clientId,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Calculate totals
  const totalAllocated = Object.values(allocations).reduce((sum, amt) => {
    const value = parseFloat(amt || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
  const remaining = paymentAmount - totalAllocated;
  
  // Load unpaid invoices
  useEffect(() => {
    loadInvoices();
  }, [clientId, currentOrganization]);
  
  const loadInvoices = async () => {
    if (!currentOrganization || !clientId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, balance_due, status, invoice_date')
        .eq('organization_id', currentOrganization.id)
        .eq('client_id', clientId)
        .gt('balance_due', 0)
        .order('invoice_date', { ascending: true });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateAllocation = (invoiceId: string, value: string) => {
    // Allow empty string for clearing
    if (value === '') {
      setAllocations(prev => {
        const updated = { ...prev };
        delete updated[invoiceId];
        return updated;
      });
      return;
    }
    
    // Validate the input
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    // Find the invoice to check max allocation
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    // Check if this would exceed invoice balance
    if (numValue > invoice.balance_due) {
      setError(`Cannot allocate more than invoice balance of $${invoice.balance_due.toFixed(2)}`);
      return;
    }
    
    // Check if total would exceed payment amount
    const otherAllocations = Object.entries(allocations)
      .filter(([id]) => id !== invoiceId)
      .reduce((sum, [, amt]) => sum + parseFloat(amt || '0'), 0);
    
    if (otherAllocations + numValue > paymentAmount) {
      setError(`Total allocations cannot exceed payment amount of $${paymentAmount.toFixed(2)}`);
      return;
    }
    
    setError('');
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: value
    }));
  };
  
  const handleQuickFill = (invoiceId: string, invoice: Invoice) => {
    const maxPossible = Math.min(
      invoice.balance_due,
      remaining + parseFloat(allocations[invoiceId] || '0')
    );
    updateAllocation(invoiceId, maxPossible.toFixed(2));
  };
  
  const handleAllocateAll = async () => {
    if (Object.keys(allocations).length === 0) {
      setError('Please allocate amounts to at least one invoice');
      return;
    }
    
    if (Math.abs(remaining) > 0.01 && remaining < 0) {
      setError('Total allocations exceed payment amount');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      // Create all allocations in sequence
      for (const [invoiceId, amountStr] of Object.entries(allocations)) {
        const amount = parseFloat(amountStr);
        if (amount <= 0) continue;
        
        const invoice = invoices.find(inv => inv.id === invoiceId);
        
        const { error: allocationError } = await supabase
          .from('payment_allocations')
          .insert({
            organization_id: currentOrganization!.id,
            payment_id: paymentId,
            invoice_id: invoiceId,
            allocated_amount: amount,
            allocation_type: 'payment',
            notes: `Multi-invoice allocation - $${amount.toFixed(2)} to invoice ${invoice?.invoice_number}`,
            created_by: user!.id
          });
        
        if (allocationError) throw allocationError;
      }
      
      // Check if payment is fully allocated
      if (Math.abs(remaining) < 0.01) {
        // Mark payment as posted
        const { error: postError } = await supabase
          .from('payments')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            posted_by: user!.id
          })
          .eq('id', paymentId);
        
        if (postError) console.error('Error posting payment:', postError);
      }
      
      // Success!
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error allocating payment:', err);
      setError(err.message || 'Failed to allocate payment');
    } finally {
      setIsSaving(false);
    }
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
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Allocate to Multiple Invoices
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Distribute the payment across multiple unpaid invoices
        </p>
      </div>
      
      {/* Payment Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Payment Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              ${paymentAmount.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              ${remaining.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* Invoice Table */}
      {invoices.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            No unpaid invoices for this client
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Due
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocate
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quick
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map(invoice => {
                const allocation = parseFloat(allocations[invoice.id] || '0');
                const isFullyAllocated = allocation === invoice.balance_due;
                
                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${invoice.total_amount.toFixed(2)} total
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      ${invoice.balance_due.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="text"
                          value={allocations[invoice.id] || ''}
                          onChange={(e) => updateAllocation(invoice.id, e.target.value)}
                          className={`w-32 pl-8 pr-3 py-2 border rounded-md text-right ${
                            isFullyAllocated 
                              ? 'border-green-300 bg-green-50' 
                              : allocation > 0 
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-300'
                          } focus:ring-blue-500 focus:border-blue-500`}
                          placeholder="0.00"
                          disabled={isSaving}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleQuickFill(invoice.id, invoice)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                        disabled={isSaving || remaining <= 0}
                      >
                        Max
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                  Total Allocated:
                </td>
                <td className="px-6 py-3 text-right">
                  <span className={`text-sm font-bold ${
                    Math.abs(remaining) < 0.01 
                      ? 'text-green-600' 
                      : remaining < 0 
                      ? 'text-red-600' 
                      : 'text-yellow-600'
                  }`}>
                    ${totalAllocated.toFixed(2)}
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleAllocateAll}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isSaving || Object.keys(allocations).length === 0 || remaining < -0.01}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Allocating...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Allocate to {Object.keys(allocations).length} Invoice{Object.keys(allocations).length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
};