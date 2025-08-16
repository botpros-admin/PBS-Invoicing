/**
 * Enhanced Payment Form Component with Comprehensive Loading States
 * 
 * Features:
 * - Skeleton loaders for initial data loading
 * - Button states for form submission
 * - Field-level loading indicators
 * - Progress indicators for multi-step operations
 * - Error recovery with retry mechanisms
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  DollarSign, 
  Calendar, 
  CreditCard,
  User,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { logger } from '../../lib/logger';
import { errorHandler } from '../../lib/errorHandler';
import type { Client } from '../../types';

interface PaymentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  clientId?: string;
}

interface LoadingState {
  clients: boolean;
  validation: boolean;
  submission: boolean;
  invoices: boolean;
}

interface FormData {
  selectedClientId: string;
  paymentDate: string;
  amount: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
}

// Skeleton loader component
const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// Field skeleton component
const FieldSkeleton: React.FC = () => (
  <div className="space-y-2">
    <SkeletonLoader className="h-4 w-24" />
    <SkeletonLoader className="h-10 w-full" />
  </div>
);

// Loading button component
const LoadingButton: React.FC<{
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}> = ({ loading, disabled, onClick, children, variant = 'primary', icon }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${
        disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon}
      <span>{loading ? 'Processing...' : children}</span>
    </button>
  );
};

// Progress indicator component
const ProgressIndicator: React.FC<{ steps: string[]; currentStep: number }> = ({ steps, currentStep }) => (
  <div className="flex items-center justify-between mb-6">
    {steps.map((step, index) => (
      <div key={index} className="flex items-center">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${index < currentStep 
            ? 'bg-green-500 text-white' 
            : index === currentStep 
              ? 'bg-blue-500 text-white animate-pulse' 
              : 'bg-gray-300 text-gray-600'
          }
        `}>
          {index < currentStep ? <CheckCircle className="h-5 w-5" /> : index + 1}
        </div>
        {index < steps.length - 1 && (
          <div className={`w-full h-1 mx-2 ${
            index < currentStep ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        )}
        <span className="ml-2 text-sm text-gray-600">{step}</span>
      </div>
    ))}
  </div>
);

export const EnhancedPaymentForm: React.FC<PaymentFormProps> = ({ 
  onSuccess, 
  onCancel,
  clientId 
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  // Loading states
  const [loading, setLoading] = useState<LoadingState>({
    clients: false,
    validation: false,
    submission: false,
    invoices: false
  });
  
  // Progress tracking
  const [currentStep, setCurrentStep] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    selectedClientId: clientId || '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'check',
    referenceNumber: '',
    notes: ''
  });
  
  // Data state
  const [clients, setClients] = useState<Client[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Debounced validation
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);

  // Load clients on mount
  useEffect(() => {
    if (currentOrganization) {
      loadClients();
    }
  }, [currentOrganization]);

  // Real-time validation with debouncing
  useEffect(() => {
    if (validationTimer) clearTimeout(validationTimer);
    
    const timer = setTimeout(() => {
      validateFormAsync();
    }, 500);
    
    setValidationTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [formData]);

  const loadClients = async (retry = false) => {
    if (!currentOrganization) return;
    
    setLoading(prev => ({ ...prev, clients: true }));
    const startTime = logger.startTimer('Load clients');
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setClients(data || []);
      
      if (clientId && data?.some(c => c.id === clientId)) {
        setFormData(prev => ({ ...prev, selectedClientId: clientId }));
      }
      
      startTime();
      setRetryCount(0);
    } catch (error: any) {
      const appError = errorHandler.handleError(error, {
        context: { component: 'PaymentForm', action: 'loadClients' }
      });
      
      if (appError.retryable && retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadClients(true), 1000 * Math.pow(2, retryCount));
      } else {
        setErrors({ general: appError.userMessage });
      }
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  };

  const validateFormAsync = async () => {
    setLoading(prev => ({ ...prev, validation: true }));
    
    const newErrors: Record<string, string> = {};
    
    // Client validation
    if (!formData.selectedClientId) {
      newErrors.client = 'Client is required';
    }
    
    // Amount validation
    const amountNum = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Valid amount is required';
    } else if (!/^\d+(\.\d{1,2})?$/.test(formData.amount)) {
      newErrors.amount = 'Amount must have at most 2 decimal places';
    }
    
    // Payment method validation
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    // Reference number validation for certain methods
    if (['check', 'ach', 'wire'].includes(formData.paymentMethod) && !formData.referenceNumber) {
      newErrors.referenceNumber = `Reference number required for ${formData.paymentMethod}`;
    }
    
    // Date validation
    const paymentDateObj = new Date(formData.paymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (paymentDateObj > today) {
      newErrors.paymentDate = 'Payment date cannot be in the future';
    }
    
    setErrors(newErrors);
    setLoading(prev => ({ ...prev, validation: false }));
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submission
    const isValid = await validateFormAsync();
    if (!isValid) return;
    
    setLoading(prev => ({ ...prev, submission: true }));
    setShowProgress(true);
    setCurrentStep(0);
    
    const steps = ['Validate', 'Save Payment', 'Allocate', 'Complete'];
    
    try {
      // Step 1: Validate
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate validation
      
      // Step 2: Save payment
      setCurrentStep(1);
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          organization_id: currentOrganization?.id,
          client_id: formData.selectedClientId,
          payment_date: formData.paymentDate,
          amount: parseFloat(formData.amount),
          payment_method: formData.paymentMethod,
          reference_number: formData.referenceNumber,
          notes: formData.notes,
          status: 'unposted',
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) throw paymentError;
      
      logger.logPaymentAction('payment_created', parseFloat(formData.amount), payment.id, {
        component: 'PaymentForm'
      });
      
      // Step 3: Check for allocations
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate allocation check
      
      // Step 4: Complete
      setCurrentStep(3);
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setFormData({
          selectedClientId: '',
          paymentDate: new Date().toISOString().split('T')[0],
          amount: '',
          paymentMethod: 'check',
          referenceNumber: '',
          notes: ''
        });
        setSuccess(false);
        setShowProgress(false);
        setCurrentStep(0);
        
        if (onSuccess) onSuccess();
      }, 2000);
      
    } catch (error: any) {
      const appError = errorHandler.handlePaymentError(error, undefined, parseFloat(formData.amount));
      setErrors({ general: appError.userMessage });
      setShowProgress(false);
    } finally {
      setLoading(prev => ({ ...prev, submission: false }));
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Show skeleton loader while initial data loads
  if (loading.clients && clients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <SkeletonLoader className="h-8 w-48 mb-4" />
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <div className="flex gap-4">
            <SkeletonLoader className="h-10 w-24" />
            <SkeletonLoader className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">Payment saved successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{errors.general}</span>
          {retryCount > 0 && (
            <button
              onClick={() => loadClients(true)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Progress Indicator */}
      {showProgress && (
        <ProgressIndicator 
          steps={['Validate', 'Save', 'Allocate', 'Complete']}
          currentStep={currentStep}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Client *
          </label>
          <div className="relative">
            <select
              value={formData.selectedClientId}
              onChange={(e) => handleFieldChange('selectedClientId', e.target.value)}
              disabled={loading.submission}
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                dark:bg-gray-700 dark:border-gray-600 dark:text-white
                ${errors.client ? 'border-red-500' : 'border-gray-300'}
                ${loading.submission ? 'opacity-60 cursor-not-allowed' : ''}
                transition-all duration-200
              `}
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.code})
                </option>
              ))}
            </select>
            {loading.validation && formData.selectedClientId && (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          {errors.client && (
            <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.client}</p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Payment Date *
          </label>
          <input
            type="date"
            value={formData.paymentDate}
            onChange={(e) => handleFieldChange('paymentDate', e.target.value)}
            disabled={loading.submission}
            max={new Date().toISOString().split('T')[0]}
            className={`
              w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${errors.paymentDate ? 'border-red-500' : 'border-gray-300'}
              ${loading.submission ? 'opacity-60 cursor-not-allowed' : ''}
              transition-all duration-200
            `}
          />
          {errors.paymentDate && (
            <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.paymentDate}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <DollarSign className="inline h-4 w-4 mr-1" />
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleFieldChange('amount', e.target.value)}
              disabled={loading.submission}
              placeholder="0.00"
              className={`
                w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                dark:bg-gray-700 dark:border-gray-600 dark:text-white
                ${errors.amount ? 'border-red-500' : 'border-gray-300'}
                ${loading.submission ? 'opacity-60 cursor-not-allowed' : ''}
                transition-all duration-200
              `}
            />
            {loading.validation && formData.amount && (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.amount}</p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <CreditCard className="inline h-4 w-4 mr-1" />
            Payment Method *
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
            disabled={loading.submission}
            className={`
              w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${errors.paymentMethod ? 'border-red-500' : 'border-gray-300'}
              ${loading.submission ? 'opacity-60 cursor-not-allowed' : ''}
              transition-all duration-200
            `}
          >
            <option value="check">Check</option>
            <option value="ach">ACH</option>
            <option value="wire">Wire Transfer</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
            <option value="phone">Phone Payment</option>
            <option value="other">Other</option>
          </select>
          {errors.paymentMethod && (
            <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.paymentMethod}</p>
          )}
        </div>

        {/* Reference Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Reference Number {['check', 'ach', 'wire'].includes(formData.paymentMethod) && '*'}
          </label>
          <input
            type="text"
            value={formData.referenceNumber}
            onChange={(e) => handleFieldChange('referenceNumber', e.target.value)}
            disabled={loading.submission}
            placeholder={
              formData.paymentMethod === 'check' ? 'Check number' :
              formData.paymentMethod === 'ach' ? 'Transaction ID' :
              formData.paymentMethod === 'wire' ? 'Wire reference' :
              'Reference number (optional)'
            }
            className={`
              w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${errors.referenceNumber ? 'border-red-500' : 'border-gray-300'}
              ${loading.submission ? 'opacity-60 cursor-not-allowed' : ''}
              transition-all duration-200
            `}
          />
          {errors.referenceNumber && (
            <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.referenceNumber}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            disabled={loading.submission}
            rows={3}
            placeholder="Additional notes or comments..."
            className={`
              w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${loading.submission ? 'opacity-60 cursor-not-allowed' : ''}
              transition-all duration-200
            `}
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-4">
          <LoadingButton
            loading={loading.submission}
            disabled={Object.keys(errors).length > 0 || loading.validation}
            onClick={() => {}}
            variant="primary"
            icon={<Save className="h-4 w-4" />}
          >
            Save Payment
          </LoadingButton>
          
          <LoadingButton
            loading={false}
            disabled={loading.submission}
            onClick={() => onCancel?.()}
            variant="secondary"
            icon={<X className="h-4 w-4" />}
          >
            Cancel
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};

export default EnhancedPaymentForm;