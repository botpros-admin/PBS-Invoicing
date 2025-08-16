/**
 * Enhanced Payments Page
 * 
 * Main payments management interface implementing Ashley's requirements:
 * - Manual payment posting
 * - Payment queue management
 * - Allocation workflow (next phase)
 * - Penny-perfect reconciliation
 */

import React, { useState } from 'react';
import { 
  Plus, 
  DollarSign, 
  List,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { PaymentForm } from '../components/payments/PaymentForm';
import { PaymentQueue } from '../components/payments/PaymentQueue';
import { SimplePaymentAllocation } from '../components/payments/SimplePaymentAllocation';

type ViewMode = 'queue' | 'form' | 'allocation';

export const PaymentsEnhanced: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('queue');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const handlePaymentSuccess = () => {
    // Return to queue view after successful payment creation
    setViewMode('queue');
    // TODO: Refresh payment queue
    window.location.reload(); // Temporary solution
  };

  const handleSelectPayment = (payment: any) => {
    setSelectedPayment(payment);
  };

  const handleAllocatePayment = (payment: any) => {
    setSelectedPayment(payment);
    setViewMode('allocation');
  };

  const handleAllocationSuccess = () => {
    setViewMode('queue');
    setSelectedPayment(null);
    // Refresh the page to show updated data
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Record payments and manage allocations with penny-perfect accuracy
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('queue')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'queue' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <List className="inline h-4 w-4 mr-2" />
                Payment Queue
              </button>
              <button
                onClick={() => setViewMode('form')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'form' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <Plus className="inline h-4 w-4 mr-2" />
                Record Payment
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {viewMode === 'queue' && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Payments</p>
                  <p className="text-2xl font-bold text-gray-900">$12,450.00</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unallocated</p>
                  <p className="text-2xl font-bold text-gray-900">$3,250.00</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready to Post</p>
                  <p className="text-2xl font-bold text-gray-900">5</p>
                </div>
                <ArrowRight className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div>
          {viewMode === 'queue' && (
            <PaymentQueue 
              onSelectPayment={handleSelectPayment}
              onAllocatePayment={handleAllocatePayment}
            />
          )}
          
          {viewMode === 'form' && (
            <PaymentForm 
              onSuccess={handlePaymentSuccess}
              onCancel={() => setViewMode('queue')}
            />
          )}
          
          {viewMode === 'allocation' && selectedPayment && (
            <SimplePaymentAllocation
              paymentId={selectedPayment.id}
              paymentAmount={selectedPayment.amount}
              clientId={selectedPayment.client_id || ''}
              onSuccess={handleAllocationSuccess}
              onCancel={() => {
                setViewMode('queue');
                setSelectedPayment(null);
              }}
            />
          )}
          
          {viewMode === 'allocation' && !selectedPayment && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <CreditCard className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Payment Selected
              </h2>
              <p className="text-gray-600 mb-6">
                Please select a payment from the queue to allocate.
              </p>
              <button
                onClick={() => setViewMode('queue')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Queue
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Payment Workflow</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Record payment when received (check, ACH, phone payment, etc.)</li>
            <li>2. Payment appears in queue as "unposted"</li>
            <li>3. Allocate payment to specific invoices (coming soon)</li>
            <li>4. Post payment when allocation balances to the penny</li>
            <li>5. System automatically updates invoice balances</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PaymentsEnhanced;