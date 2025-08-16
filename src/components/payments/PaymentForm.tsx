/**
 * Payment Form Component
 * 
 * Implements Ashley's manual payment posting requirements:
 * - Records checks, ACH, phone payments, etc.
 * - Captures all required payment details
 * - Saves as "unposted" for later allocation
 * - Provides immediate value by preventing payment loss
 */

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  DollarSign, 
  Calendar, 
  CreditCard,
  User,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import type { Client } from '../../types';

interface PaymentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  clientId?: string; // Pre-select client if provided
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ 
  onSuccess, 
  onCancel,
  clientId 
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('check');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Load clients on mount
  useEffect(() => {
    if (currentOrganization) {
      loadClients();
    }
  }, [currentOrganization]);

  const loadClients = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
      
      // Pre-select client if provided
      if (clientId && data?.some(c => c.id === clientId)) {
        setSelectedClientId(clientId);
      }
    } catch (error: any) {
      console.error('Error loading clients:', error);
      setErrors({ general: 'Failed to load clients' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedClientId) {
      newErrors.client = 'Client is required';
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    
    // Validate amount has at most 2 decimal places (penny-perfect!)
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    if (amount && !amountRegex.test(amount)) {
      newErrors.amount = 'Amount must be a valid dollar amount (e.g., 123.45)';
    }
    
    if (!paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    
    if (!paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    // Reference number required for checks and ACH
    if ((paymentMethod === 'check' || paymentMethod === 'ach') && !referenceNumber) {
      newErrors.referenceNumber = `${paymentMethod === 'check' ? 'Check' : 'ACH confirmation'} number is required`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePaymentNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `PAY-${year}${month}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !currentOrganization || !user) return;
    
    setIsSaving(true);
    setErrors({});
    setSuccess(false);
    
    try {
      // Create payment record
      const { data, error } = await supabase
        .from('payments')
        .insert({
          organization_id: currentOrganization.id,
          payment_number: generatePaymentNumber(),
          payment_date: paymentDate,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          client_id: selectedClientId,
          status: 'unposted', // Always start as unposted for allocation
          notes: notes || null,
          source: 'manual',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setSuccess(true);
      
      // Show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          // Reset form for next payment
          handleReset();
        }
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving payment:', error);
      setErrors({ 
        general: error.message || 'Failed to save payment' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setAmount('');
    setReferenceNumber('');
    setNotes('');
    setPaymentMethod('check');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setSuccess(false);
    setErrors({});
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
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Record Payment
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Record a payment received from a client. It will be saved as unposted for allocation.
          </p>
        </div>

        {errors.general && (
          <div className="mx-6 mt-4 p-4 bg-red-50 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
            <p className="text-sm text-green-800">
              Payment recorded successfully! It's now in the queue for allocation.
            </p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline h-4 w-4 mr-1" />
              Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.client ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSaving}
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

          {/* Payment Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSaving}
              />
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSaving}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be exact to the penny for reconciliation
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="inline h-4 w-4 mr-1" />
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSaving}
              >
                <option value="check">Check</option>
                <option value="ach">ACH Transfer</option>
                <option value="wire">Wire Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="phone">Phone Payment</option>
                <option value="other">Other</option>
              </select>
              {errors.paymentMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
              )}
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="inline h-4 w-4 mr-1" />
                {paymentMethod === 'check' ? 'Check Number' : 
                 paymentMethod === 'ach' ? 'ACH Confirmation' :
                 'Reference Number'}
                {(paymentMethod === 'check' || paymentMethod === 'ach') && ' *'}
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={
                  paymentMethod === 'check' ? 'Check #' :
                  paymentMethod === 'ach' ? 'ACH confirmation #' :
                  'Optional reference'
                }
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.referenceNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSaving}
              />
              {errors.referenceNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.referenceNumber}</p>
              )}
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
              placeholder="Optional notes about this payment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel || handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSaving}
          >
            {onCancel ? 'Cancel' : 'Reset'}
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSaving || !selectedClientId || !amount}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};