/**
 * Simple Payment Allocation Component
 * 
 * The SIMPLEST solution that completes Ashley's workflow:
 * - Select an invoice
 * - Allocate payment
 * - Mark invoice paid
 * - DONE
 * 
 * No complexity. Just working workflow.
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { OverpaymentHandler } from './OverpaymentHandler';
import { MultiInvoiceAllocation } from './MultiInvoiceAllocation';
import { createPaymentCredit } from '../../api/services/paymentCredit.service';

interface SimplePaymentAllocationProps {
  paymentId: string;
  paymentAmount: number;
  clientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

export const SimplePaymentAllocation: React.FC<SimplePaymentAllocationProps> = ({
  paymentId,
  paymentAmount,
  clientId,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [allocationAmount, setAllocationAmount] = useState(paymentAmount.toString());
  const [showOverpaymentHandler, setShowOverpaymentHandler] = useState(false);
  const [multiMode, setMultiMode] = useState(false);

  // Load unpaid invoices for this client
  useEffect(() => {
    loadInvoices();
  }, [clientId, currentOrganization]);

  // Update selected invoice details
  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find(inv => inv.id === selectedInvoiceId);
      setSelectedInvoice(invoice || null);
      
      // Auto-set allocation amount to lesser of payment amount or invoice balance
      if (invoice) {
        const maxAllocation = Math.min(paymentAmount, invoice.balance_due);
        setAllocationAmount(maxAllocation.toFixed(2));
      }
    }
  }, [selectedInvoiceId, invoices, paymentAmount]);

  const loadInvoices = async () => {
    if (!currentOrganization || !clientId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, balance_due, status')
        .eq('organization_id', currentOrganization.id)
        .eq('client_id', clientId)
        .gt('balance_due', 0) // Only unpaid invoices
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverpaymentConfirm = async (allocateAmount: number, creditAmount: number) => {
    setShowOverpaymentHandler(false);
    setAllocationAmount(allocateAmount.toFixed(2));
    
    // If there's a credit to create, we'll handle it after the allocation
    if (creditAmount > 0) {
      // Store credit amount for later processing
      await handleAllocateWithCredit(allocateAmount, creditAmount);
    } else {
      // Regular allocation
      await handleAllocate();
    }
  };
  
  const handleAllocateWithCredit = async (allocateAmount: number, creditAmount: number) => {
    if (!selectedInvoiceId || !currentOrganization || !user) {
      setError('Please select an invoice');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // First, allocate to invoice
      const { error: allocationError } = await supabase
        .from('payment_allocations')
        .insert({
          organization_id: currentOrganization.id,
          payment_id: paymentId,
          invoice_id: selectedInvoiceId,
          allocated_amount: allocateAmount,
          allocation_type: 'payment',
          notes: `Payment allocated to invoice ${selectedInvoice?.invoice_number} with credit created for overpayment`,
          created_by: user.id
        });

      if (allocationError) throw allocationError;

      // Create payment credit for the overpayment using the new service
      if (creditAmount > 0) {
        try {
          await createPaymentCredit({
            paymentId: paymentId,
            clientId: clientId,
            amount: creditAmount,
            notes: `Overpayment on invoice ${selectedInvoice?.invoice_number}`
          });
        } catch (creditError) {
          console.error('Error creating credit:', creditError);
          // Continue even if credit creation fails - allocation succeeded
        }
      }

      // Mark payment as posted since it's fully allocated
      const { error: postError } = await supabase
        .from('payments')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: user.id
        })
        .eq('id', paymentId);

      if (postError) console.error('Error posting payment:', postError);

      // Success!
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error allocating payment with credit:', err);
      setError(err.message || 'Failed to allocate payment');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAllocate = async () => {
    if (!selectedInvoiceId || !currentOrganization || !user) {
      setError('Please select an invoice');
      return;
    }

    const amount = parseFloat(allocationAmount);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid allocation amount');
      return;
    }

    if (amount > paymentAmount) {
      setError('Allocation cannot exceed payment amount');
      return;
    }

    // Check for overpayment - if payment > invoice balance and trying to allocate full payment
    if (selectedInvoice && amount === paymentAmount && paymentAmount > selectedInvoice.balance_due) {
      setShowOverpaymentHandler(true);
      return;
    }

    if (selectedInvoice && amount > selectedInvoice.balance_due) {
      setError('Allocation cannot exceed invoice balance. Use the Max Possible button or enter a smaller amount.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Determine allocation type for notes
      const isFullPayment = amount === paymentAmount;
      const isFullInvoicePayment = selectedInvoice && amount === selectedInvoice.balance_due;
      
      let allocationNote = '';
      if (isFullPayment && isFullInvoicePayment) {
        allocationNote = `Full payment allocated to invoice ${selectedInvoice?.invoice_number}`;
      } else if (isFullInvoicePayment) {
        allocationNote = `Partial payment - paid invoice ${selectedInvoice?.invoice_number} in full ($${amount.toFixed(2)} of $${paymentAmount.toFixed(2)} payment)`;
      } else {
        allocationNote = `Partial payment - allocated $${amount.toFixed(2)} to invoice ${selectedInvoice?.invoice_number} (balance remaining: $${(selectedInvoice.balance_due - amount).toFixed(2)})`;
      }
      
      // Create payment allocation
      const { error: allocationError } = await supabase
        .from('payment_allocations')
        .insert({
          organization_id: currentOrganization.id,
          payment_id: paymentId,
          invoice_id: selectedInvoiceId,
          allocated_amount: amount,
          allocation_type: 'payment',
          notes: allocationNote,
          created_by: user.id
        });

      if (allocationError) throw allocationError;

      // The database triggers will automatically:
      // 1. Update payment.allocated_amount
      // 2. Update invoice.amount_paid and balance_due
      // 3. Update invoice.payment_status

      // Check if payment is fully allocated
      const { data: paymentData, error: paymentCheckError } = await supabase
        .from('payments')
        .select('allocated_amount, amount')
        .eq('id', paymentId)
        .single();
      
      if (!paymentCheckError && paymentData) {
        const totalAllocated = (paymentData.allocated_amount || 0) + amount;
        const isFullyAllocated = Math.abs(totalAllocated - paymentData.amount) < 0.01; // Penny-perfect check
        
        // If this allocation completes the payment, mark it as posted
        if (isFullyAllocated) {
          const { error: postError } = await supabase
            .from('payments')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              posted_by: user.id
            })
            .eq('id', paymentId);

          if (postError) console.error('Error posting payment:', postError);
        }
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
    <div className="max-w-2xl mx-auto">
      {/* Show overpayment handler if needed */}
      {showOverpaymentHandler && selectedInvoice && (
        <OverpaymentHandler
          paymentAmount={paymentAmount}
          invoiceBalance={selectedInvoice.balance_due}
          clientId={clientId}
          onConfirm={handleOverpaymentConfirm}
          onCancel={() => setShowOverpaymentHandler(false)}
        />
      )}
      
      {/* Show multi-invoice allocation if in multi mode */}
      {!showOverpaymentHandler && multiMode && (
        <MultiInvoiceAllocation
          paymentId={paymentId}
          paymentAmount={paymentAmount}
          clientId={clientId}
          onSuccess={onSuccess}
          onCancel={() => setMultiMode(false)}
        />
      )}
      
      {/* Regular single invoice allocation UI */}
      {!showOverpaymentHandler && !multiMode && (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Allocate Payment
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Select which invoice this payment applies to
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMultiMode(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
            >
              <FileText className="h-4 w-4 mr-1" />
              Multiple Invoices
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payment Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${paymentAmount.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline h-4 w-4 mr-1" />
              Select Invoice to Pay
            </label>
            
            {invoices.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  No unpaid invoices for this client
                </p>
              </div>
            ) : (
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={isSaving}
              >
                <option value="">Select an invoice...</option>
                {invoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - Balance: ${invoice.balance_due.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Invoice Details */}
          {selectedInvoice && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Invoice Number:</span>
                <span className="font-medium">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="font-medium">${selectedInvoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Balance Due:</span>
                <span className="font-medium text-red-600">
                  ${selectedInvoice.balance_due.toFixed(2)}
                </span>
              </div>
              
              {/* Allocation Amount */}
              <div className="pt-3 border-t border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Allocate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                  />
                </div>
                
                {/* Quick Actions */}
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAllocationAmount(selectedInvoice.balance_due.toFixed(2))}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Full Balance (${selectedInvoice.balance_due.toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationAmount(Math.min(paymentAmount, selectedInvoice.balance_due).toFixed(2))}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Max Possible
                  </button>
                  {paymentAmount < selectedInvoice.balance_due && (
                    <button
                      type="button"
                      onClick={() => setAllocationAmount(paymentAmount.toFixed(2))}
                      className="text-xs text-orange-600 hover:text-orange-800"
                    >
                      Partial (${paymentAmount.toFixed(2)})
                    </button>
                  )}
                </div>
              </div>

              {/* Result Preview */}
              <div className="pt-3 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">After Allocation:</span>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Invoice Balance: ${Math.max(0, selectedInvoice.balance_due - parseFloat(allocationAmount || '0')).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Payment Remaining: ${Math.max(0, paymentAmount - parseFloat(allocationAmount || '0')).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Overpayment Warning */}
              {paymentAmount > selectedInvoice.balance_due && (
                <div className="pt-3 border-t border-blue-200">
                  <div className="flex items-start">
                    <CreditCard className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        Overpayment Detected
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Payment exceeds invoice balance by ${(paymentAmount - selectedInvoice.balance_due).toFixed(2)}.
                        You can create a credit for the excess amount.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleAllocate}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSaving || !selectedInvoiceId}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Allocating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {parseFloat(allocationAmount || '0') === paymentAmount ? 'Allocate & Post' : 'Allocate Partial'}
              </>
            )}
          </button>
        </div>
      </div>
      )}
    </div>
  );
};