/**
 * Payment Credits Management Component
 * 
 * Displays and manages payment credits for a client
 * Allows applying credits to invoices
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  getClientCredits,
  getClientCreditSummary,
  applyCreditToInvoice,
  cancelCredit,
  type PaymentCredit,
  type CreditSummary
} from '../../api/services/paymentCredit.service';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PaymentCreditsProps {
  clientId: string;
  onCreditApplied?: () => void;
}

export const PaymentCredits: React.FC<PaymentCreditsProps> = ({
  clientId,
  onCreditApplied
}) => {
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [selectedCredit, setSelectedCredit] = useState<PaymentCredit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [targetInvoiceId, setTargetInvoiceId] = useState('');
  const [applyAmount, setApplyAmount] = useState('');

  useEffect(() => {
    loadCredits();
  }, [clientId]);

  const loadCredits = async () => {
    setIsLoading(true);
    setError('');
    try {
      const summary = await getClientCreditSummary(clientId);
      setCreditSummary(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load credits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCredit = async () => {
    if (!selectedCredit || !targetInvoiceId) return;

    setIsApplying(true);
    setError('');

    try {
      const amount = applyAmount ? parseFloat(applyAmount) : undefined;
      await applyCreditToInvoice({
        creditId: selectedCredit.id,
        invoiceId: targetInvoiceId,
        amount
      });

      // Refresh credits
      await loadCredits();
      
      // Reset form
      setShowApplyModal(false);
      setSelectedCredit(null);
      setTargetInvoiceId('');
      setApplyAmount('');

      if (onCreditApplied) {
        onCreditApplied();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply credit');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelCredit = async (credit: PaymentCredit) => {
    if (!confirm('Are you sure you want to cancel this credit?')) return;

    try {
      await cancelCredit(credit.id, 'Cancelled by user');
      await loadCredits();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel credit');
    }
  };

  const getStatusBadge = (status: PaymentCredit['status']) => {
    const statusConfig = {
      available: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      applied: { color: 'bg-blue-100 text-blue-800', icon: CreditCard },
      expired: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      refunded: { color: 'bg-red-100 text-red-800', icon: RefreshCw }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!creditSummary) {
    return (
      <div className="text-center p-8 text-gray-500">
        No credit information available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Payment Credits</h3>
          <button
            onClick={loadCredits}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <DollarSign className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Total Credits</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(creditSummary.totalCredits)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-600">Available</span>
            </div>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(creditSummary.availableCredits)}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CreditCard className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm text-gray-600">Applied</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(creditSummary.appliedCredits)}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Expired</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(creditSummary.expiredCredits)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Credits List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900">Credit History</h4>
        </div>

        <div className="divide-y divide-gray-200">
          {creditSummary.credits.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No credits found
            </div>
          ) : (
            creditSummary.credits.map((credit) => (
              <div key={credit.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(credit.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(credit.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {credit.notes && (
                      <p className="mt-1 text-sm text-gray-600">{credit.notes}</p>
                    )}

                    <div className="mt-2 flex items-center space-x-4">
                      {getStatusBadge(credit.status)}
                      
                      {credit.status === 'available' && credit.remainingAmount > 0 && (
                        <span className="text-sm text-gray-600">
                          Remaining: {formatCurrency(credit.remainingAmount)}
                        </span>
                      )}

                      {credit.expiresAt && (
                        <span className="text-sm text-gray-500">
                          Expires: {formatDate(credit.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    {credit.status === 'available' && credit.remainingAmount > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedCredit(credit);
                            setShowApplyModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Apply
                        </button>
                        <button
                          onClick={() => handleCancelCredit(credit)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <AlertCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Apply Credit Modal */}
      {showApplyModal && selectedCredit && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Apply Credit to Invoice
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Credit
                </label>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(selectedCredit.remainingAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice ID
                </label>
                <input
                  type="text"
                  value={targetInvoiceId}
                  onChange={(e) => setTargetInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter invoice ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Apply (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Max: ${selectedCredit.remainingAmount.toFixed(2)}`}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to apply maximum possible amount
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedCredit(null);
                  setTargetInvoiceId('');
                  setApplyAmount('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCredit}
                disabled={!targetInvoiceId || isApplying}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Apply Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};